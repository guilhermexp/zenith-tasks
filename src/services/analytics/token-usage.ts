/**
 * Serviço de Analytics para Token Usage
 * Rastreia uso de tokens, custos estimados e métricas de performance
 */

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider?: string;
  model?: string;
  operation?: string;
  userId?: string;
  timestamp: string;
  finishReason?: string;
  responseTime?: number;
}

export interface CostEstimate {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: string;
}

// Tabela de preços aproximados por 1M tokens (USD)
const PRICING_TABLE: Record<string, { prompt: number; completion: number }> = {
  'gemini-2.0-flash-exp': { prompt: 0, completion: 0 }, // Free tier
  'gemini-2.5-pro': { prompt: 1.25, completion: 5.0 },
  'gpt-4o': { prompt: 2.5, completion: 10.0 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
  'claude-3-5-sonnet-20241022': { prompt: 3.0, completion: 15.0 },
  'claude-3-5-haiku-20241022': { prompt: 1.0, completion: 5.0 },
  'openrouter/auto': { prompt: 0.5, completion: 1.5 }, // Média estimada
};

export class TokenAnalyticsService {
  private static instance: TokenAnalyticsService;
  private metrics: TokenUsageMetrics[] = [];
  private maxMetricsSize = 1000;

  private constructor() {}

  static getInstance(): TokenAnalyticsService {
    if (!this.instance) {
      this.instance = new TokenAnalyticsService();
    }
    return this.instance;
  }

  /**
   * Registra uso de tokens
   */
  track(metrics: TokenUsageMetrics): void {
    this.metrics.push({
      ...metrics,
      timestamp: metrics.timestamp || new Date().toISOString(),
    });

    // Manter tamanho do array sob controle
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize / 2);
    }

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('[TokenAnalytics]', {
        model: metrics.model,
        totalTokens: metrics.totalTokens,
        operation: metrics.operation,
      });
    }

    // Enviar para sistema de monitoramento em produção
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(metrics).catch((error) => {
        console.error('[TokenAnalytics] Failed to send metrics:', error);
      });
    }
  }

  /**
   * Calcula custo estimado baseado no modelo
   */
  estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: string
  ): CostEstimate {
    const pricing = PRICING_TABLE[model] || PRICING_TABLE['openrouter/auto'];
    
    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;
    const totalCost = promptCost + completionCost;

    return {
      promptCost,
      completionCost,
      totalCost,
      currency: 'USD',
    };
  }

  /**
   * Obtém estatísticas agregadas
   */
  getStats(filters?: {
    userId?: string;
    model?: string;
    operation?: string;
    since?: Date;
  }): {
    totalRequests: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    estimatedCost: number;
    averageTokensPerRequest: number;
    requestsByModel: Record<string, number>;
    requestsByOperation: Record<string, number>;
  } {
    let filtered = this.metrics;

    // Aplicar filtros
    if (filters?.userId) {
      filtered = filtered.filter((m) => m.userId === filters.userId);
    }
    if (filters?.model) {
      filtered = filtered.filter((m) => m.model === filters.model);
    }
    if (filters?.operation) {
      filtered = filtered.filter((m) => m.operation === filters.operation);
    }
    if (filters?.since) {
      filtered = filtered.filter(
        (m) => new Date(m.timestamp) >= filters.since!
      );
    }

    // Calcular estatísticas
    const totalRequests = filtered.length;
    const totalPromptTokens = filtered.reduce((sum, m) => sum + m.promptTokens, 0);
    const totalCompletionTokens = filtered.reduce((sum, m) => sum + m.completionTokens, 0);
    const totalTokens = totalPromptTokens + totalCompletionTokens;

    // Calcular custo total estimado
    let estimatedCost = 0;
    for (const metric of filtered) {
      if (metric.model) {
        const cost = this.estimateCost(
          metric.promptTokens,
          metric.completionTokens,
          metric.model
        );
        estimatedCost += cost.totalCost;
      }
    }

    // Agregar por modelo
    const requestsByModel: Record<string, number> = {};
    for (const metric of filtered) {
      const model = metric.model || 'unknown';
      requestsByModel[model] = (requestsByModel[model] || 0) + 1;
    }

    // Agregar por operação
    const requestsByOperation: Record<string, number> = {};
    for (const metric of filtered) {
      const operation = metric.operation || 'unknown';
      requestsByOperation[operation] = (requestsByOperation[operation] || 0) + 1;
    }

    return {
      totalRequests,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      estimatedCost,
      averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      requestsByModel,
      requestsByOperation,
    };
  }

  /**
   * Obtém métricas recentes
   */
  getRecentMetrics(limit: number = 10): TokenUsageMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Limpa métricas antigas
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(
      (m) => new Date(m.timestamp).getTime() > cutoff
    );
  }

  /**
   * Limpa todas as métricas
   */
  clearAll(): void {
    this.metrics = [];
  }

  /**
   * Exporta métricas para JSON
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Envia métricas para sistema de monitoramento
   */
  private async sendToMonitoring(metrics: TokenUsageMetrics): Promise<void> {
    // Implementar integração com sistema de monitoramento
    // Exemplos: DataDog, New Relic, PostHog, etc.
    
    // Por enquanto, apenas salvar no localStorage em produção
    if (typeof window !== 'undefined') {
      try {
        const key = 'zenith-token-analytics';
        const stored = localStorage.getItem(key);
        const data = stored && stored.trim() ? JSON.parse(stored) : [];
        data.push(metrics);
        
        // Manter apenas últimas 100 métricas no localStorage
        const recent = data.slice(-100);
        localStorage.setItem(key, JSON.stringify(recent));
      } catch (error) {
        // Silenciar erros de localStorage e limpar se corrompido
        console.warn('[TokenAnalytics] Failed to save metrics:', error);
        try {
          localStorage.removeItem('zenith-token-analytics');
        } catch {}
      }
    }
  }
}

// Instância singleton para uso global
export const tokenAnalytics = TokenAnalyticsService.getInstance();

// Helper function para rastreamento fácil
export function trackTokenUsage(metrics: Omit<TokenUsageMetrics, 'timestamp'>): void {
  tokenAnalytics.track({
    ...metrics,
    timestamp: new Date().toISOString(),
  });
}
