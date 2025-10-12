/**
 * Serviço centralizado de chat com AI
 * Consolida a lógica comum dos endpoints de chat
 */

import { streamText, generateText } from 'ai'

import { AIErrorManager } from '@/server/ai/error-handler'
import { PromptOptimizer } from '@/server/ai/prompt-optimizer'
import { ProviderFallbackManager } from '@/server/ai/provider-fallback'
import { SecurityManager } from '@/server/ai/security'
import { AIProvider } from '@/server/aiProvider'
import { trackTokenUsage } from '@/services/analytics/token-usage'
import type { ChatMessage } from '@/types'
import { logger } from '@/utils/logger'

export interface ChatOptions {
  system?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  history?: ChatMessage[]
  context?: Record<string, any>
  userId?: string
  conversationId?: string
}

export interface ChatResult {
  text?: string
  stream?: ReadableStream
  response?: Response  // Para retornar Response completa do AI SDK
  error?: string
  metadata?: Record<string, any>
}

/**
 * Contextos predefinidos para diferentes tipos de chat
 */
export const CHAT_CONTEXTS = {
  general: {
    system: 'Você é um assistente útil e proativo em português do Brasil. Responda de forma clara e breve.',
    temperature: 0.7,
  },
  taskItem: {
    system: `Você é um assistente especializado em gerenciamento de tarefas e produtividade.
            Ajude o usuário a organizar e gerenciar seus itens de forma eficiente.`,
    temperature: 0.6,
  },
  planning: {
    system: `Você é um assistente avançado de produtividade.
            Use as ferramentas disponíveis quando apropriado.
            Seja conciso e prático em suas respostas.`,
    temperature: 0.3,
  },
}

export class ChatService {
  private static instance: ChatService
  private errorManager: AIErrorManager
  private securityManager: SecurityManager
  private fallbackManager: ProviderFallbackManager
  private promptOptimizer: PromptOptimizer

  private constructor() {
    this.errorManager = new AIErrorManager()
    this.securityManager = SecurityManager.getInstance()
    this.fallbackManager = ProviderFallbackManager.getInstance()
    this.promptOptimizer = PromptOptimizer.getInstance()
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  /**
   * Processa mensagem de chat com tratamento unificado
   */
  async chat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
    try {
      // 1. Validação e sanitização
      const sanitized = this.validateAndSanitize(message, options.userId)
      if (sanitized.error) {
        return { error: sanitized.error }
      }

      // 2. Obter modelo apropriado
      const modelResult = await this.getModelForChat(options)
      if (modelResult.error) {
        return { error: modelResult.error, text: modelResult.fallback }
      }

      // 3. Otimizar prompt baseado no contexto
      const promptContext = {
        userIntent: sanitized.message,
        history: options.history as any,
        metadata: options.context,
      }

      const template = this.promptOptimizer.selectTemplate(promptContext)
      const optimizedSystem = options.system ||
        this.promptOptimizer.optimizePrompt(template, promptContext, sanitized.message!)

      // 4. Preparar mensagens
      const messages = this.prepareMessages(
        sanitized.message!,
        options.history,
        options.context
      )

      // 5. Configuração final
      const config = {
        model: modelResult.model,
        system: optimizedSystem,
        messages,
        temperature: options.temperature ?? template.temperature ?? modelResult.settings?.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? template.maxTokens ?? modelResult.settings?.maxTokens,
      }

      // 5. Executar com retry e fallback entre provedores
      const fallbackResult = await this.fallbackManager.executeWithFallback(
        async (provider) => {
          // Reconfigurar modelo para o provedor atual
          const modelResult = await this.getModelForChat(options)
          config.model = modelResult.model

          return this.executeWithRetry(
            () => this.performChat(config, options.stream ?? false),
            {
              userId: options.userId,
              conversationId: options.conversationId,
              prompt: message,
            }
          )
        },
        {
          operation: 'chat',
          userId: options.userId,
        }
      )

      // 6. Log e retorno
      const result = fallbackResult.result as ChatResult
      logger.info('[ChatService] Chat processado', {
        userId: options.userId,
        messageLength: message.length,
        stream: options.stream,
        provider: fallbackResult.provider,
        attempts: fallbackResult.attempts.length,
        success: !!result.text || !!result.stream,
      })

      return result
    } catch (error: any) {
      logger.error('[ChatService] Erro no chat', error)
      return {
        error: error.message || 'Erro ao processar chat',
        text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
      }
    }
  }

  /**
   * Chat específico para itens (tarefas, notas, etc)
   */
  async chatForItem(
    item: {
      title: string
      type: string
      summary?: string
      [key: string]: any
    },
    message: string,
    options: ChatOptions = {}
  ): Promise<ChatResult> {
    // Preparar contexto do item
    const context = {
      item_title: item.title,
      item_type: item.type,
      item_summary: item.summary,
      ...item,
    }

    // Otimizar prompt baseado no item
    const promptContext = {
      item: item as any,
      userIntent: message,
      history: options.history as any,
      metadata: context,
    }

    const template = this.promptOptimizer.selectTemplate(promptContext)
    const optimizedSystem = this.promptOptimizer.optimizePrompt(template, promptContext, message)

    return this.chat(message, {
      ...options,
      system: optimizedSystem,
      context,
      temperature: template.temperature ?? CHAT_CONTEXTS.taskItem.temperature,
    })
  }

  /**
   * Validação e sanitização de entrada
   */
  private validateAndSanitize(
    message: string,
    userId?: string
  ): { message?: string; error?: string } {
    if (!message || typeof message !== 'string') {
      return { error: 'Mensagem é obrigatória' }
    }

    const sanitized = SecurityManager.sanitizeInput(message)
    const injection = SecurityManager.detectPromptInjection(sanitized)

    if (injection.detected && injection.risk === 'high') {
      logger.warn('[ChatService] Possível injeção detectada', {
        userId,
        patterns: injection.patterns,
      })
      return { error: 'Entrada potencialmente perigosa detectada' }
    }

    // Rate limiting por usuário
    if (userId) {
      const rateCheck = this.securityManager.checkRateLimit(userId)
      if (!rateCheck.allowed) {
        return {
          error: `Limite de requisições excedido. Tente novamente em ${Math.ceil(
            (rateCheck.resetTime - Date.now()) / 1000
          )} segundos.`,
        }
      }
    }

    return { message: sanitized }
  }

  /**
   * Obtém modelo apropriado para o chat
   */
  private async getModelForChat(options: ChatOptions): Promise<{
    model?: any
    settings?: any
    error?: string
    fallback?: string
  }> {
    try {
      const provider = AIProvider.getInstance()
      const contextType = options.context?.planning ? 'task-planning' : 'chat'
      const result = await provider.getModelForContext(contextType)

      return { model: result.model, settings: result.settings }
    } catch (error: any) {
      logger.error('[ChatService] Erro ao obter modelo', error)

      // Fallback gracioso
      const fallback =
        options.context?.item_title
          ? `Entendi sobre "${options.context.item_title}". Como posso ajudar?`
          : 'Assistente temporariamente indisponível. Posso registrar isto como uma nota se preferir.'

      return { error: error.message, fallback }
    }
  }

  /**
   * Prepara mensagens com histórico e contexto
   */
  private prepareMessages(
    message: string,
    history?: ChatMessage[],
    context?: Record<string, any>
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    // Adicionar histórico
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        // Limitar últimas 10 mensagens
        const role = msg.role === 'model' ? 'assistant' : 'user'
        const content = msg.parts?.[0]?.text || ''
        if (content) {
          messages.push({ role, content })
        }
      }
    }

    // Adicionar contexto se houver
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .filter(([key, val]) => val !== undefined && val !== null)
        .map(([key, val]) => `${key}: ${val}`)
        .join('\n')

      if (contextStr) {
        messages.push({
          role: 'system',
          content: `Contexto adicional:\n${contextStr}`,
        })
      }
    }

    // Adicionar mensagem atual
    messages.push({ role: 'user', content: message })

    return messages
  }

  /**
   * Executa chat com retry automático
   */
  private async executeWithRetry(
    fn: () => Promise<ChatResult>,
    context: any,
    maxAttempts = 3
  ): Promise<ChatResult> {
    return AIErrorManager.withRetry(fn, context, {
      maxAttempts,
      delay: 1000,
      onError: (error, attempt) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.warn(`[ChatService] Tentativa ${attempt} falhou`, { error: errorMessage })
      },
      onRetry: (attempt, delay) => {
        logger.info(`[ChatService] Tentando novamente em ${delay}ms (tentativa ${attempt})`)
      },
    })
  }

  /**
   * Executa o chat real (stream ou não)
   */
  private async performChat(config: any, stream: boolean): Promise<ChatResult> {
    // Check if we're using OpenRouter direct model
    if (config.model && typeof config.model === 'object' && config.model.generate) {
      logger.info('[ChatService] Using direct OpenRouter implementation')
      return await this.performDirectOpenRouterChat(config, stream)
    }

    // Default AI SDK implementation
    if (stream) {
      const result = streamText(config)
      logger.info('[ChatService] streamText iniciado')

      // toTextStreamResponse() retorna uma Response completa do AI SDK v5
      // Retornar a Response inteira para o endpoint usar
      const response = result.toTextStreamResponse()
      return { response }
    } else {
      const result = await generateText(config)

      // Log de métricas
      if (result.usage) {
        const usage = result.usage as any
        logger.info('[ChatService] Geração concluída', {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          finishReason: result.finishReason,
        })
        
        // Rastrear tokens para analytics
        if (usage.promptTokens && usage.completionTokens && usage.totalTokens) {
          trackTokenUsage({
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            finishReason: result.finishReason,
            operation: 'chat-generate',
          })
        }
      }

      // Validar segurança do output
      const safetyCheck = SecurityManager.validateOutputSafety(result.text)
      if (!safetyCheck.safe) {
        logger.warn('[ChatService] Output contém dados sensíveis', { issues: safetyCheck.issues })
        return { text: safetyCheck.sanitized as string }
      }

      return { text: result.text }
    }
  }

  /**
   * Handles direct OpenRouter chat using OpenAI SDK
   */
  private async performDirectOpenRouterChat(config: any, stream: boolean): Promise<ChatResult> {
    const directModel = config.model
    const messages = config.messages
    
    logger.info('[ChatService] Executing direct OpenRouter chat', {
      stream,
      messageCount: messages.length,
      temperature: config.temperature
    })

    if (stream) {
      // For streaming, we need to create a ReadableStream
      const encoder = new TextEncoder()
      let streamFinished = false
      
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Note: OpenAI SDK doesn't support streaming in the same way as AI SDK
            // For now, we'll do a non-streaming call and simulate streaming
            const result = await directModel.generate(messages, {
              temperature: config.temperature,
              maxTokens: config.maxTokens
            })
            
            // Simulate streaming by chunking the response
            const words = result.text.split(' ')
            for (let i = 0; i < words.length; i++) {
              const chunk = i === 0 ? words[i] : ' ' + words[i]
              controller.enqueue(encoder.encode(chunk))
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50))
            }
            
            controller.close()
            streamFinished = true
            
            // Log metrics
            if (result.usage) {
              logger.info('[ChatService] Direct OpenRouter stream completed', {
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens
              })
              
              trackTokenUsage({
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens,
                finishReason: result.finishReason,
                operation: 'chat-stream-openrouter'
              })
            }
            
          } catch (error: any) {
            logger.error('[ChatService] Direct OpenRouter stream error:', error)
            if (!streamFinished) {
              controller.error(error)
            }
          }
        },
        cancel() {
          logger.info('[ChatService] Direct OpenRouter stream cancelled')
        }
      })
      
      const response = new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
      
      return { response }
    } else {
      // Non-streaming
      const result = await directModel.generate(messages, {
        temperature: config.temperature,
        maxTokens: config.maxTokens
      })
      
      // Log metrics
      if (result.usage) {
        logger.info('[ChatService] Direct OpenRouter generation completed', {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          finishReason: result.finishReason
        })
        
        trackTokenUsage({
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          finishReason: result.finishReason,
          operation: 'chat-generate-openrouter'
        })
      }
      
      // Validate security
      const safetyCheck = SecurityManager.validateOutputSafety(result.text)
      if (!safetyCheck.safe) {
        logger.warn('[ChatService] Direct OpenRouter output contains sensitive data', { issues: safetyCheck.issues })
        return { text: safetyCheck.sanitized as string }
      }
      
      return { text: result.text }
    }
  }
}