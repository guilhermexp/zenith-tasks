import { streamText } from 'ai'
import { NextResponse } from 'next/server'

import { AIErrorManager } from '@/server/ai/error-handler'
import { SecurityManager } from '@/server/ai/security'
import { getAllTools } from '@/server/ai/tools'
import { AIProvider } from '@/server/aiProvider'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  const errorManager = new AIErrorManager()
  const securityManager = SecurityManager.getInstance()
  const logContext = { route: 'assistant-act' } as const
  
  try {
    // Rate limiting
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const payload = await req.json()
    const { message, userId, conversationId, history = [] } = payload
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // Validação de segurança
    const sanitizedMessage = SecurityManager.sanitizeInput(message)
    const injectionCheck = SecurityManager.detectPromptInjection(sanitizedMessage)
    
    if (injectionCheck.detected && injectionCheck.risk === 'high') {
      return NextResponse.json({ 
        error: 'Potentially harmful input detected',
        patterns: injectionCheck.patterns 
      }, { status: 400 })
    }

    // Rate limiting por usuário
    if (userId) {
      const rateLimitCheck = securityManager.checkRateLimit(userId)
      if (!rateLimitCheck.allowed) {
        return NextResponse.json({ 
          error: 'User rate limit exceeded',
          resetTime: rateLimitCheck.resetTime
        }, { status: 429 })
      }
    }

    // Obter modelo
    let model: any
    try {
      const aiProvider = AIProvider.getInstance()
      const result = await aiProvider.getModelForContext('chat')
      model = result.model
    } catch (error) {
      logger.error('Assistant Act: failed to acquire model', error, logContext)
      return NextResponse.json({ 
        error: 'AI model not available',
        text: 'Desculpe, o assistente não está disponível no momento.'
      }, { status: 503 })
    }

    // Preparar ferramentas
    let tools = getAllTools()
    
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

    const maxHistoryEntries = 20
    const normalizedHistory = Array.isArray(history) ? history : []
    type ChatMessage = { role: 'user' | 'assistant'; content: string }

    const formattedHistory: ChatMessage[] = normalizedHistory
      .filter((entry: any) => entry && typeof entry.content === 'string')
      .slice(-maxHistoryEntries)
      .map((entry: any): ChatMessage => {
        const role: ChatMessage['role'] = entry.role === 'assistant' ? 'assistant' : 'user'
        const content = role === 'user'
          ? SecurityManager.sanitizeInput(String(entry.content))
          : String(entry.content)
        return { role, content }
      })

    if (!formattedHistory.length || formattedHistory[formattedHistory.length - 1].role !== 'user') {
      formattedHistory.push({ role: 'user', content: sanitizedMessage })
    } else {
      formattedHistory[formattedHistory.length - 1] = { role: 'user', content: sanitizedMessage }
    }

    // Sistema de prompt otimizado para ações
    const systemPrompt = `Você é um assistente de produtividade inteligente.

CAPACIDADES:
- Criar, atualizar e gerenciar tarefas
- Analisar produtividade e gerar relatórios
- Buscar e organizar informações
- Executar múltiplas ações quando necessário

DIRETRIZES:
- Use as ferramentas disponíveis sempre que apropriado
- Seja proativo em sugerir ações úteis
- Forneça feedback claro sobre ações executadas
- Mantenha respostas concisas mas informativas

FERRAMENTAS DISPONÍVEIS:
${Object.keys(tools).map(name => `- ${name}`).join('\n')}

Responda em português brasileiro de forma natural e útil.`

    // Contexto para tratamento de erros
    const errorContext = {
      userId,
      conversationId,
      attempt: 1,
      maxTokens: 2000,
      temperature: 0.7,
      prompt: sanitizedMessage
    }

    // Executar com ferramentas e streaming
    const result = await AIErrorManager.withRetry(
      async () => {
        return await streamText({
          model,
          system: systemPrompt,
          messages: formattedHistory,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          temperature: 0.7,
          onStepFinish: async ({ usage, toolCalls, toolResults }) => {
            if (toolCalls && toolCalls.length > 0) {
              logger.info('Assistant Act: tools executed', {
                tools: toolCalls.map((tc: any) => tc.toolName),
                ...logContext
              })
            }
            if (usage?.totalTokens) {
              logger.info('Assistant Act: step tokens used', {
                tokens: usage.totalTokens,
                ...logContext
              })
            }
          },
          onFinish: async ({ text, usage, toolCalls, toolResults }) => {
            logger.info('Assistant Act: stream finished', {
              textLength: text?.length ?? 0,
              toolCount: toolCalls?.length ?? 0,
              ...logContext
            })
          }
        })
      },
      errorContext,
      {
        maxAttempts: 2,
        delay: 1000,
        onError: (error, attempt) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error('Assistant Act: attempt failed', new Error(errorMessage), {
            attempt,
            ...logContext
          })
        }
      }
    )

    // Retornar stream
    return result.toTextStreamResponse()

  } catch (error: any) {
    logger.error('Assistant Act: unhandled error', error, logContext)
    
    const errorResult = await errorManager.handleError(error, {
      userId: req.headers.get('user-id') || undefined,
      attempt: 1
    })

    return NextResponse.json({ 
      error: errorResult.userMessage,
      category: errorResult.category,
      text: errorResult.fallback?.fallbackResponse || 'Desculpe, ocorreu um erro. Tente novamente.'
    }, { status: 500 })
  }
}
