/**
 * Sistema de fallback entre provedores de AI
 * Gerencia múltiplos provedores e failover automático
 */

import { AIProvider } from '@/server/aiProvider'
import { logger } from '@/utils/logger'

import { AIErrorManager } from './error-handler'

export interface ProviderConfig {
  name: string
  priority: number
  enabled: boolean
  healthScore: number
  lastError?: Date
  errorCount: number
  successCount: number
}

export interface FallbackResult {
  provider: string
  result: any
  attempts: Array<{
    provider: string
    error?: string
    duration: number
  }>
}

export class ProviderFallbackManager {
  private static instance: ProviderFallbackManager
  private providers: Map<string, ProviderConfig>
  private providerOrder: string[]
  private errorManager: AIErrorManager

  private constructor() {
    this.providers = new Map()
    this.providerOrder = []
    this.errorManager = new AIErrorManager()
    this.initializeProviders()
  }

  static getInstance(): ProviderFallbackManager {
    if (!ProviderFallbackManager.instance) {
      ProviderFallbackManager.instance = new ProviderFallbackManager()
    }
    return ProviderFallbackManager.instance
  }

  /**
   * Inicializa configuração dos provedores
   */
  private initializeProviders() {
    // Configuração base dos provedores
    const disabledProviders = new Set(
      (process.env.AI_DISABLED_PROVIDERS || '')
        .split(',')
        .map(name => name.trim().toLowerCase())
        .filter(Boolean)
    );

    const allowOpenRouter = process.env.AI_ALLOW_OPENROUTER === 'true';

    const providerConfigs: ProviderConfig[] = [
      {
        name: 'xai',
        priority: 1,
        enabled: !!process.env.XAI_API_KEY,
        healthScore: 100,
        errorCount: 0,
        successCount: 0,
      },
      {
        name: 'google',
        priority: 2,
        enabled: !!process.env.GEMINI_API_KEY,
        healthScore: 100,
        errorCount: 0,
        successCount: 0,
      },
      {
        name: 'openrouter',
        priority: 3,
        enabled: !!process.env.OPENROUTER_API_KEY && allowOpenRouter,
        healthScore: 100,
        errorCount: 0,
        successCount: 0,
      },
      {
        name: 'openai',
        priority: 4,
        enabled: !!process.env.OPENAI_API_KEY,
        healthScore: 100,
        errorCount: 0,
        successCount: 0,
      },
    ]

    // Registrar provedores habilitados
    for (const config of providerConfigs) {
      const normalizedName = config.name.toLowerCase()

      if (disabledProviders.has(normalizedName)) {
        config.enabled = false
      }

      if (config.enabled) {
        this.providers.set(config.name, config)
      } else {
        logger.info('[ProviderFallback] Ignorando provedor desabilitado', {
          provider: config.name
        })
      }
    }

    // Ordenar por prioridade
    this.updateProviderOrder()
  }

  /**
   * Atualiza ordem dos provedores baseado em saúde e prioridade
   */
  private updateProviderOrder() {
    this.providerOrder = Array.from(this.providers.values())
      .filter(p => p.enabled && p.healthScore > 0)
      .sort((a, b) => {
        // Primeiro por health score, depois por prioridade
        const scoreDiff = b.healthScore - a.healthScore
        if (Math.abs(scoreDiff) > 10) {
          return scoreDiff
        }
        return a.priority - b.priority
      })
      .map(p => p.name)

    logger.info('[ProviderFallback] Ordem de provedores atualizada', {
      order: this.providerOrder,
    })
  }

  /**
   * Executa operação com fallback automático
   */
  async executeWithFallback<T>(
    operation: (provider: string) => Promise<T>,
    context?: {
      operation?: string
      userId?: string
      preferredProvider?: string
    }
  ): Promise<FallbackResult> {
    const attempts: Array<{ provider: string; error?: string; duration: number }> = []
    let lastError: any

    // Se há provedor preferido, colocá-lo primeiro
    let orderedProviders = [...this.providerOrder]
    if (context?.preferredProvider && this.providers.has(context.preferredProvider)) {
      orderedProviders = [
        context.preferredProvider,
        ...orderedProviders.filter(p => p !== context.preferredProvider),
      ]
    }

    // Tentar cada provedor na ordem
    for (const providerName of orderedProviders) {
      const provider = this.providers.get(providerName)
      if (!provider || !provider.enabled) continue

      const startTime = Date.now()

      try {
        logger.info('[ProviderFallback] Tentando provedor', {
          provider: providerName,
          operation: context?.operation,
        })

        // Configurar provedor atual
        process.env.AI_SDK_PROVIDER = providerName

        // Executar operação
        const result = await operation(providerName)

        // Operação bem-sucedida
        const duration = Date.now() - startTime
        attempts.push({ provider: providerName, duration })

        // Atualizar estatísticas
        this.updateProviderStats(providerName, true)

        logger.info('[ProviderFallback] Operação bem-sucedida', {
          provider: providerName,
          duration,
          operation: context?.operation,
        })

        return {
          provider: providerName,
          result,
          attempts,
        }
      } catch (error: any) {
        const duration = Date.now() - startTime
        lastError = error

        logger.error('[ProviderFallback] Erro no provedor', {
          provider: providerName,
          error: error.message,
          operation: context?.operation,
        })

        attempts.push({
          provider: providerName,
          error: error.message,
          duration,
        })

        // Atualizar estatísticas
        this.updateProviderStats(providerName, false, error)

        // Verificar se deve continuar tentando
        const errorCategory = this.errorManager.categorizeError(error)
        if (errorCategory.type === 'auth') {
          // Desabilitar provedor com erro de autenticação
          this.disableProvider(providerName, 'Erro de autenticação')
        }
      }
    }

    // Todos os provedores falharam
    throw new Error(
      `Todos os provedores falharam. Último erro: ${lastError?.message || 'Desconhecido'}`
    )
  }

  /**
   * Atualiza estatísticas do provedor
   */
  private updateProviderStats(
    providerName: string,
    success: boolean,
    error?: any
  ) {
    const provider = this.providers.get(providerName)
    if (!provider) return

    if (success) {
      provider.successCount++
      provider.healthScore = Math.min(100, provider.healthScore + 5)

      // Reduzir contagem de erros em sucesso
      if (provider.errorCount > 0) {
        provider.errorCount = Math.max(0, provider.errorCount - 1)
      }
    } else {
      provider.errorCount++
      provider.lastError = new Date()

      // Calcular penalidade baseada no tipo de erro
      const errorCategory = this.errorManager.categorizeError(error)
      let penalty = 10

      switch (errorCategory.type) {
        case 'rate_limit':
          penalty = 20
          break
        case 'timeout':
          penalty = 15
          break
        case 'auth':
          penalty = 100 // Desabilitar
          break
        case 'network':
          penalty = 25
          break
        default:
          penalty = 10
      }

      provider.healthScore = Math.max(0, provider.healthScore - penalty)
    }

    // Recalcular ordem dos provedores
    this.updateProviderOrder()

    // Auto-recuperação: aumentar health score gradualmente
    if (provider.healthScore < 100 && provider.errorCount === 0) {
      setTimeout(() => {
        this.recoverProviderHealth(providerName)
      }, 60000) // 1 minuto
    }
  }

  /**
   * Recupera saúde do provedor gradualmente
   */
  private recoverProviderHealth(providerName: string) {
    const provider = this.providers.get(providerName)
    if (!provider || !provider.enabled) return

    // Se não houve erros recentes, recuperar saúde
    const timeSinceLastError = provider.lastError
      ? Date.now() - provider.lastError.getTime()
      : Infinity

    if (timeSinceLastError > 300000) {
      // 5 minutos sem erros
      provider.healthScore = Math.min(100, provider.healthScore + 10)
      this.updateProviderOrder()

      logger.info('[ProviderFallback] Recuperando saúde do provedor', {
        provider: providerName,
        healthScore: provider.healthScore,
      })
    }

    // Continuar monitorando se ainda não está 100%
    if (provider.healthScore < 100) {
      setTimeout(() => {
        this.recoverProviderHealth(providerName)
      }, 60000)
    }
  }

  /**
   * Desabilita um provedor
   */
  disableProvider(providerName: string, reason: string) {
    const provider = this.providers.get(providerName)
    if (!provider) return

    provider.enabled = false
    provider.healthScore = 0

    logger.warn('[ProviderFallback] Provedor desabilitado', {
      provider: providerName,
      reason,
    })

    this.updateProviderOrder()
  }

  /**
   * Reabilita um provedor
   */
  enableProvider(providerName: string) {
    const provider = this.providers.get(providerName)
    if (!provider) return

    provider.enabled = true
    provider.healthScore = 50 // Começar com saúde média
    provider.errorCount = 0

    logger.info('[ProviderFallback] Provedor reabilitado', {
      provider: providerName,
    })

    this.updateProviderOrder()
  }

  /**
   * Obtém status dos provedores
   */
  getProviderStatus(): Array<{
    name: string
    enabled: boolean
    healthScore: number
    errorRate: number
    lastError?: Date
  }> {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      enabled: provider.enabled,
      healthScore: provider.healthScore,
      errorRate:
        provider.successCount + provider.errorCount > 0
          ? provider.errorCount / (provider.successCount + provider.errorCount)
          : 0,
      lastError: provider.lastError,
    }))
  }

  /**
   * Reseta estatísticas dos provedores
   */
  resetStats() {
    for (const provider of this.providers.values()) {
      provider.errorCount = 0
      provider.successCount = 0
      provider.healthScore = provider.enabled ? 100 : 0
      provider.lastError = undefined
    }

    this.updateProviderOrder()

    logger.info('[ProviderFallback] Estatísticas resetadas')
  }

  /**
   * Testa conectividade de um provedor
   */
  async testProvider(providerName: string): Promise<{
    success: boolean
    latency?: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      // Configurar provedor
      const originalProvider = process.env.AI_SDK_PROVIDER
      process.env.AI_SDK_PROVIDER = providerName

      // Teste simples de conectividade
      const aiProvider = AIProvider.getInstance()
      await aiProvider.getModelForContext('general-chat')

      // Restaurar provedor original
      process.env.AI_SDK_PROVIDER = originalProvider

      return {
        success: true,
        latency: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Testa todos os provedores configurados
   */
  async testAllProviders(): Promise<Map<string, {
    success: boolean
    latency?: number
    error?: string
  }>> {
    const results = new Map()

    for (const providerName of this.providers.keys()) {
      const result = await this.testProvider(providerName)
      results.set(providerName, result)

      // Atualizar status baseado no teste
      if (result.success) {
        const provider = this.providers.get(providerName)!
        provider.enabled = true
        provider.healthScore = 100
      } else {
        this.disableProvider(providerName, result.error || 'Teste falhou')
      }
    }

    this.updateProviderOrder()
    return results
  }
}
