import { streamObject, generateObject, streamText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AIErrorManager } from '@/server/ai/error-handler'
import { buildEnhancedAssistantPrompt } from '@/server/ai/prompts/assistant-prompt'
import { SecurityManager } from '@/server/ai/security'
import { getAllTools } from '@/server/ai/tools'
import { AIProvider, getAISDKModel } from '@/server/aiProvider'
import { extractClientKey, rateLimit } from '@/server/rateLimit'

// Schema para plano do assistente
const planSchema = z.object({
  commands: z.array(z.object({ 
    action: z.string(), 
    args: z.record(z.string(), z.unknown()).optional(),
    reasoning: z.string().optional()
  })).default([]),
  reply: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  needsMoreInfo: z.boolean().optional()
})

export async function POST(req: Request) {
  const errorManager = new AIErrorManager()
  const securityManager = SecurityManager.getInstance()
  
  try {
    // 1. Rate limiting básico (desabilitado em desenvolvimento)
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev) {
      const key = extractClientKey(req)
      if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    // 2. Extrair parâmetros
    const url = new URL(req.url)
    const stream = url.searchParams.get('stream') === '1'
    const useTools = url.searchParams.get('tools') !== '0'
    
    const { message, userId, conversationId, maxSteps = 5 } = await req.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // 3. Validação de segurança
    const sanitizedMessage = SecurityManager.sanitizeInput(message)
    const injectionCheck = SecurityManager.detectPromptInjection(sanitizedMessage)
    
    if (injectionCheck.detected && injectionCheck.risk === 'high') {
      return NextResponse.json({ 
        error: 'Potentially harmful input detected',
        patterns: injectionCheck.patterns 
      }, { status: 400 })
    }

    // 4. Rate limiting por usuário
    if (userId) {
      const rateLimitCheck = securityManager.checkRateLimit(userId)
      if (!rateLimitCheck.allowed) {
        return NextResponse.json({ 
          error: 'User rate limit exceeded',
          resetTime: rateLimitCheck.resetTime
        }, { status: 429 })
      }
    }

    // 5. Obter modelo com tratamento de erro
    let model: any
    let modelConfig: any = { temperature: 0.7, maxTokens: 2000 }

    // Try direct providers (bypass complex AIProvider for now)
    try {
      console.log('[Assistant] Getting model directly...')
      
      // Try Google first (most likely to work)
      if (process.env.GEMINI_API_KEY) {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
        const google = createGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY
        })
        model = google('gemini-2.0-flash-exp')
        console.log('[Assistant] Using Google Gemini')
      }
      // Try OpenRouter
      else if (process.env.OPENROUTER_API_KEY) {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openai = createOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1'
        })
        model = openai('openrouter/auto')
        console.log('[Assistant] Using OpenRouter')
      }
      // Try OpenAI
      else if (process.env.OPENAI_API_KEY) {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
        model = openai('gpt-4o-mini')
        console.log('[Assistant] Using OpenAI')
      }
      // Try Anthropic
      else if (process.env.ANTHROPIC_API_KEY) {
        const { createAnthropic } = await import('@ai-sdk/anthropic')
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        })
        model = anthropic('claude-3-5-haiku-20241022')
        console.log('[Assistant] Using Anthropic')
      }
      else {
        throw new Error('No AI provider configured')
      }
    } catch (error: any) {
      console.error('[Assistant] All providers failed:', error.message)
      
      // Final graceful fallback
      const reply = sanitizedMessage.length <= 3
        ? 'Olá! Como posso ajudar você hoje? (Modo offline - funcionalidade limitada)'
        : 'Desculpe, o sistema de IA está temporariamente indisponível. Posso registrar sua solicitação como uma nota para processar depois.'
      return NextResponse.json({ 
        commands: [], 
        reply,
        offline: true 
      })
    }

    // 6. Preparar ferramentas se habilitadas
    let tools = {}
    if (useTools) {
      tools = getAllTools()
      
      // Filtrar ferramentas baseado em permissões do usuário
      if (userId) {
        const filteredTools: Record<string, any> = {}
        for (const [toolName, tool] of Object.entries(tools)) {
          if (securityManager.validateToolAccess(userId, toolName)) {
            filteredTools[toolName] = tool
          }
        }
        tools = filteredTools
      }
    }

    // 7. Preparar contexto para tratamento de erros
    const errorContext = {
      userId,
      conversationId,
      attempt: 1,
      maxTokens: 2000,
      temperature: 0.3,
      prompt: sanitizedMessage
    }

    // 8. Executar com retry automático
    const result = await AIErrorManager.withRetry(
      async () => {
        // Usar prompt melhorado com contexto completo do app
        const systemPrompt = buildEnhancedAssistantPrompt(sanitizedMessage, {
          currentDate: new Date().toISOString(),
          userId,
        })
        
        if (stream) {
          if (useTools && Object.keys(tools).length > 0) {
            // Streaming com ferramentas (modo preferido)
            console.log(`[Assistant] Iniciando com ${Object.keys(tools).length} ferramentas disponíveis`)
            return await streamText({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: sanitizedMessage }
              ],
              tools,
              temperature: modelConfig.temperature || 0.7,
              onStepFinish: async ({ usage, toolCalls, toolResults }) => {
                if (toolCalls && toolCalls.length > 0) {
                  console.log(`[Assistant] Ferramentas executadas:`, toolCalls.map((tc: any) => tc.toolName))
                }
                if (usage?.totalTokens) {
                  console.log(`[Assistant] Step concluído, tokens: ${usage.totalTokens}`)
                }
              }
            })
          } else {
            // Fallback: resposta estruturada sem ferramentas
            return await streamObject({
              model,
              schema: planSchema,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: sanitizedMessage }
              ],
              temperature: modelConfig.temperature || 0.7
            })
          }
        } else {
          // Geração única estruturada
          if (useTools && Object.keys(tools).length > 0) {
            // Com ferramentas: usar streamText e aguardar finalização
            const textResult = await streamText({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: sanitizedMessage }
              ],
              tools,
              temperature: modelConfig.temperature || 0.7
            })
            
            // Coletar resultado completo
            const fullText = await (textResult as any).text
            return { text: fullText, toolCalls: [] }
          } else {
            // Sem ferramentas: usar generateObject
            return await generateObject({
              model,
              schema: planSchema,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: sanitizedMessage }
              ],
              temperature: modelConfig.temperature || 0.3
            })
          }
        }
      },
      errorContext,
      {
        maxAttempts: 3,
        delay: 1000,
        onError: (error, attempt) => {
          console.error(`[Assistant] Tentativa ${attempt} falhou:`, error.message)
        },
        onRetry: (attempt, delay) => {
          console.log(`[Assistant] Tentando novamente em ${delay}ms (tentativa ${attempt})`)
        }
      }
    )

    // 9. Processar resultado
    if (stream) {
      if (useTools && Object.keys(tools).length > 0) {
        // Retornar stream de texto com ferramentas (AI SDK v5)
        return (result as any).toDataStreamResponse({
          getErrorMessage: (error: Error) => {
            console.error('[Assistant] Stream error:', error)
            return 'Desculpe, ocorreu um erro ao processar sua solicitação.'
          }
        })
      } else {
        // Retornar stream de objeto estruturado
        return (result as any).toTextStreamResponse({
          getErrorMessage: (error: Error) => {
            console.error('[Assistant] Stream error:', error)
            return 'Desculpe, ocorreu um erro ao processar sua solicitação.'
          }
        })
      }
    } else {
      // Validar segurança do output
      const outputData = (result as any).object || (result as any).text || result
      const safetyCheck = SecurityManager.validateOutputSafety(outputData)

      if (!safetyCheck.safe) {
        console.warn('[Assistant] Output contém dados sensíveis:', safetyCheck.issues)
        return NextResponse.json(safetyCheck.sanitized)
      }

      return NextResponse.json(outputData)
    }

  } catch (error: any) {
    // Tratamento final de erro
    const errorResult = await errorManager.handleError(error, {
      userId: req.headers.get('user-id') || undefined,
      attempt: 1
    })

    console.error('[Assistant] Erro final:', error.message)

    return NextResponse.json({ 
      error: errorResult.userMessage,
      category: errorResult.category,
      fallback: errorResult.fallback
    }, { status: 500 })
  }
}
