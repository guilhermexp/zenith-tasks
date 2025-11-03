import { streamObject, generateObject, streamText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AIErrorManager } from '@/server/ai/error-handler'
import { buildEnhancedAssistantPrompt } from '@/server/ai/prompts/assistant-prompt'
import { SecurityManager } from '@/server/ai/security'
import { getAllTools } from '@/server/ai/tools'
import { AIProvider, getAISDKModel } from '@/server/aiProvider'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { logger } from '@/utils/logger'

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
  const logContext = { route: 'assistant' } as const
  
  try {
    // 1. Rate limiting básico (desabilitado em desenvolvimento)
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev) {
      const key = extractClientKey(req)
      if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    }

    // 2. Extrair parâmetros e validar com Zod
    const url = new URL(req.url)
    const stream = url.searchParams.get('stream') === '1'
    const useTools = url.searchParams.get('tools') !== '0'

    const bodySchema = z.object({
      message: z.string().min(1).max(10000),
      userId: z.string().optional(),
      conversationId: z.string().optional(),
      maxSteps: z.number().int().min(1).max(10).default(5),
      model: z.string().optional(),
      history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })).optional()
    })

    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(await req.json())
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: error.issues
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { message, userId, conversationId, maxSteps } = body

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

    // 5. Obter modelo usando AIProvider centralizado
    let model: any
    let modelConfig: any

    try {
      logger.info('Assistant: retrieving model from AIProvider', logContext)
      const aiProvider = AIProvider.getInstance()
      const result = await aiProvider.getModelForContext('chat')
      model = result.model
      modelConfig = result.settings
      logger.info('Assistant: using AIProvider with context chat', {
        modelId: result.metadata?.modelId ?? 'unknown',
        provider: result.metadata?.provider ?? 'unknown',
        ...logContext
      })
    } catch (error: any) {
      logger.error('Assistant: AIProvider selection failed', error, logContext)
      
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
            logger.info('Assistant: starting stream with tools', {
              toolCount: Object.keys(tools).length,
              ...logContext
            })
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
                  logger.info('Assistant: tools executed', {
                    tools: toolCalls.map((tc: any) => tc.toolName),
                    ...logContext
                  })
                }
                if (usage?.totalTokens) {
                  logger.info('Assistant: step tokens used', {
                    tokens: usage.totalTokens,
                    ...logContext
                  })
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
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error('Assistant: attempt failed', new Error(errorMessage), {
            attempt,
            ...logContext
          })
        },
        onRetry: (attempt, delay) => {
          logger.info('Assistant: scheduling retry', {
            delayMs: delay,
            attempt,
            ...logContext
          })
        }
      }
    )

    // 9. Processar resultado
    if (stream) {
      if (useTools && Object.keys(tools).length > 0) {
        // Retornar stream de texto com ferramentas (AI SDK v5)
        return (result as any).toDataStreamResponse({
          getErrorMessage: (error: Error) => {
            logger.error('Assistant: stream iteration error', error, logContext)
            return 'Desculpe, ocorreu um erro ao processar sua solicitação.'
          }
        })
      } else {
        // Retornar stream de objeto estruturado
        return (result as any).toTextStreamResponse({
          getErrorMessage: (error: Error) => {
            logger.error('Assistant: stream handler error', error, logContext)
            return 'Desculpe, ocorreu um erro ao processar sua solicitação.'
          }
        })
      }
    } else {
      // Validar segurança do output
      const outputData = (result as any).object || (result as any).text || result
      const safetyCheck = SecurityManager.validateOutputSafety(outputData)

      if (!safetyCheck.safe) {
        logger.warn('Assistant: output contains sensitive data', {
          issues: safetyCheck.issues,
          ...logContext
        })
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

    logger.error('Assistant: unhandled route error', error, logContext)

    return NextResponse.json({ 
      error: errorResult.userMessage,
      category: errorResult.category,
      fallback: errorResult.fallback
    }, { status: 500 })
  }
}
