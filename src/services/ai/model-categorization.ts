/**
 * Model categorization and recommendation system
 */

export interface ModelCategory {
  id: string
  name: string
  description: string
  criteria: {
    maxPrice?: number
    minContextWindow?: number
    requiredCapabilities?: string[]
    preferredProviders?: string[]
  }
}

export interface ModelRecommendation {
  modelId: string
  score: number
  reasons: string[]
  category: string
}

export interface RecommendationContext {
  budget: 'low' | 'medium' | 'high'
  priority: 'speed' | 'quality' | 'balanced' | 'cost'
  taskType: 'chat' | 'code' | 'analysis' | 'creative' | 'reasoning'
  contextLength?: 'short' | 'medium' | 'long'
  capabilities?: string[]
}

// Model categories definition
export const MODEL_CATEGORIES: Record<string, ModelCategory> = {
  fast: {
    id: 'fast',
    name: 'Rápidos',
    description: 'Modelos otimizados para velocidade e baixa latência',
    criteria: {
      maxPrice: 2,
      preferredProviders: ['google', 'cohere'],
      requiredCapabilities: []
    }
  },
  
  balanced: {
    id: 'balanced',
    name: 'Equilibrados',
    description: 'Boa relação custo-benefício entre qualidade e preço',
    criteria: {
      maxPrice: 5,
      minContextWindow: 32000
    }
  },
  
  powerful: {
    id: 'powerful',
    name: 'Poderosos',
    description: 'Modelos de alta performance para tarefas complexas',
    criteria: {
      minContextWindow: 100000,
      requiredCapabilities: ['reasoning']
    }
  },
  
  economical: {
    id: 'economical',
    name: 'Econômicos',
    description: 'Modelos de baixo custo para uso intensivo',
    criteria: {
      maxPrice: 1
    }
  },
  
  specialized: {
    id: 'specialized',
    name: 'Especializados',
    description: 'Modelos com capacidades específicas',
    criteria: {
      requiredCapabilities: ['web-search', 'multimodal', 'real-time']
    }
  }
}

// Context-based model recommendations
export const CONTEXT_RECOMMENDATIONS: Record<string, {
  preferred: string[]
  avoid: string[]
  criteria: Partial<RecommendationContext>
}> = {
  chat: {
    preferred: ['openai/gpt-4o-mini', 'anthropic/claude-3-5-haiku-20241022', 'google/gemini-1.5-flash'],
    avoid: ['perplexity/llama-3.1-sonar-huge-128k-online'],
    criteria: { priority: 'balanced', budget: 'medium' }
  },
  
  code: {
    preferred: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-1.5-pro'],
    avoid: ['cohere/command-light', 'mistral/mistral-small'],
    criteria: { priority: 'quality', contextLength: 'long' }
  },
  
  analysis: {
    preferred: ['anthropic/claude-3-opus-20240229', 'openai/gpt-4o', 'mistral/mistral-large-2407'],
    avoid: ['openai/gpt-3.5-turbo', 'cohere/command-light'],
    criteria: { priority: 'quality', budget: 'high' }
  },
  
  creative: {
    preferred: ['anthropic/claude-3-5-sonnet-20241022', 'openai/gpt-4o', 'mistral/mistral-large-2407'],
    avoid: ['perplexity/llama-3.1-sonar-small-128k-online'],
    criteria: { priority: 'quality', budget: 'medium' }
  },
  
  reasoning: {
    preferred: ['anthropic/claude-3-opus-20240229', 'openai/gpt-4o', 'cohere/command-r-plus'],
    avoid: ['google/gemini-1.5-flash', 'mistral/mistral-small'],
    criteria: { priority: 'quality', budget: 'high' }
  },
  
  research: {
    preferred: ['perplexity/llama-3.1-sonar-large-128k-online', 'perplexity/llama-3.1-sonar-huge-128k-online'],
    avoid: ['openai/gpt-3.5-turbo', 'cohere/command-light'],
    criteria: { priority: 'quality', capabilities: ['web-search'] }
  }
}

export class ModelCategorizationService {
  private static instance: ModelCategorizationService

  private constructor() {}

  static getInstance(): ModelCategorizationService {
    if (!ModelCategorizationService.instance) {
      ModelCategorizationService.instance = new ModelCategorizationService()
    }
    return ModelCategorizationService.instance
  }

  /**
   * Categorize models based on their properties
   */
  categorizeModel(model: any): string[] {
    const categories: string[] = []

    // Check each category criteria
    for (const [categoryId, category] of Object.entries(MODEL_CATEGORIES)) {
      if (this.modelMatchesCriteria(model, category.criteria)) {
        categories.push(categoryId)
      }
    }

    return categories
  }

  /**
   * Get models by category
   */
  getModelsByCategory(models: any[], categoryId: string): any[] {
    const category = MODEL_CATEGORIES[categoryId]
    if (!category) return []

    return models.filter(model => 
      this.modelMatchesCriteria(model, category.criteria)
    )
  }

  /**
   * Get model recommendations based on context
   */
  getRecommendations(
    models: any[], 
    context: RecommendationContext
  ): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = []

    for (const model of models) {
      const score = this.calculateModelScore(model, context)
      const reasons = this.getRecommendationReasons(model, context)
      const categories = this.categorizeModel(model)

      if (score > 0) {
        recommendations.push({
          modelId: model.id,
          score,
          reasons,
          category: categories[0] || 'general'
        })
      }
    }

    // Sort by score (descending)
    return recommendations.sort((a, b) => b.score - a.score)
  }

  /**
   * Get context-specific recommendations
   */
  getContextRecommendations(
    models: any[],
    taskType: string,
    limit = 5
  ): any[] {
    const contextConfig = CONTEXT_RECOMMENDATIONS[taskType]
    if (!contextConfig) return models.slice(0, limit)

    // Filter and score models
    const scored = models
      .filter(model => !contextConfig.avoid.includes(model.id))
      .map(model => ({
        ...model,
        score: this.calculateContextScore(model, taskType, contextConfig)
      }))
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, limit)
  }

  /**
   * Check if model matches category criteria
   */
  private modelMatchesCriteria(model: any, criteria: any): boolean {
    // Price check
    if (criteria.maxPrice && model.pricing?.input > criteria.maxPrice) {
      return false
    }

    // Context window check
    if (criteria.minContextWindow && model.contextWindow < criteria.minContextWindow) {
      return false
    }

    // Required capabilities check
    if (criteria.requiredCapabilities?.length > 0) {
      const hasAllCapabilities = criteria.requiredCapabilities.every((cap: string) =>
        model.capabilities?.includes(cap)
      )
      if (!hasAllCapabilities) return false
    }

    // Preferred providers check
    if (criteria.preferredProviders?.length > 0) {
      if (!criteria.preferredProviders.includes(model.provider)) {
        return false
      }
    }

    return true
  }

  /**
   * Calculate model score based on context
   */
  private calculateModelScore(model: any, context: RecommendationContext): number {
    let score = 50 // Base score

    // Budget considerations
    const inputPrice = model.pricing?.input || 0
    switch (context.budget) {
      case 'low':
        score += inputPrice < 1 ? 30 : inputPrice < 3 ? 10 : -20
        break
      case 'medium':
        score += inputPrice < 5 ? 20 : inputPrice < 10 ? 0 : -10
        break
      case 'high':
        score += inputPrice > 10 ? -5 : 10
        break
    }

    // Priority considerations
    switch (context.priority) {
      case 'speed':
        if (model.provider === 'google' || model.id.includes('flash')) score += 20
        if (model.id.includes('mini') || model.id.includes('light')) score += 15
        break
      case 'quality':
        if (model.id.includes('opus') || model.id.includes('gpt-4o')) score += 25
        if (model.id.includes('large') || model.id.includes('pro')) score += 15
        break
      case 'cost':
        score += inputPrice < 1 ? 30 : inputPrice < 2 ? 15 : -10
        break
      case 'balanced':
        score += inputPrice < 5 && inputPrice > 0.5 ? 15 : 0
        break
    }

    // Context length considerations
    if (context.contextLength) {
      const contextWindow = model.contextWindow || 0
      switch (context.contextLength) {
        case 'short':
          score += contextWindow > 4000 ? 5 : 0
          break
        case 'medium':
          score += contextWindow > 32000 ? 15 : contextWindow > 16000 ? 10 : 0
          break
        case 'long':
          score += contextWindow > 100000 ? 25 : contextWindow > 50000 ? 15 : 0
          break
      }
    }

    // Required capabilities
    if (context.capabilities && context.capabilities.length > 0) {
      const hasCapabilities = context.capabilities.every(cap =>
        model.capabilities?.includes(cap)
      )
      score += hasCapabilities ? 20 : -30
    }

    return Math.max(0, score)
  }

  /**
   * Calculate context-specific score
   */
  private calculateContextScore(model: any, taskType: string, contextConfig: any): number {
    let score = 50

    // Preferred models get bonus
    if (contextConfig.preferred.includes(model.id)) {
      score += 30
    }

    // Provider preferences
    const providerBonus: Record<string, Record<string, number>> = {
      chat: { openai: 10, anthropic: 15, google: 10 },
      code: { openai: 15, anthropic: 20, google: 10 },
      analysis: { anthropic: 25, openai: 15, mistral: 10 },
      creative: { anthropic: 20, openai: 15, mistral: 10 },
      reasoning: { anthropic: 25, openai: 20, cohere: 15 },
      research: { perplexity: 30 }
    }

    const bonus = providerBonus[taskType]?.[model.provider] || 0
    score += bonus

    // Price considerations for task type
    const inputPrice = model.pricing?.input || 0
    if (taskType === 'chat' && inputPrice < 2) score += 10
    if (taskType === 'analysis' && inputPrice > 5) score -= 5

    return score
  }

  /**
   * Get recommendation reasons
   */
  private getRecommendationReasons(model: any, context: RecommendationContext): string[] {
    const reasons: string[] = []

    // Budget reasons
    const inputPrice = model.pricing?.input || 0
    if (context.budget === 'low' && inputPrice < 1) {
      reasons.push('Muito econômico')
    } else if (context.budget === 'high' && inputPrice > 5) {
      reasons.push('Alto desempenho')
    }

    // Priority reasons
    if (context.priority === 'speed' && (model.id.includes('flash') || model.id.includes('mini'))) {
      reasons.push('Otimizado para velocidade')
    }
    if (context.priority === 'quality' && (model.id.includes('opus') || model.id.includes('gpt-4o'))) {
      reasons.push('Qualidade superior')
    }

    // Context window
    if (model.contextWindow > 100000) {
      reasons.push('Grande janela de contexto')
    }

    // Special capabilities
    if (model.capabilities?.includes('web-search')) {
      reasons.push('Acesso à internet')
    }
    if (model.capabilities?.includes('vision')) {
      reasons.push('Processamento de imagens')
    }
    if (model.capabilities?.includes('multimodal')) {
      reasons.push('Capacidades multimodais')
    }

    return reasons
  }

  /**
   * Get category statistics
   */
  getCategoryStats(models: any[]): Record<string, {
    count: number
    avgPrice: number
    providers: string[]
  }> {
    const stats: Record<string, any> = {}

    for (const [categoryId, category] of Object.entries(MODEL_CATEGORIES)) {
      const categoryModels = this.getModelsByCategory(models, categoryId)
      
      stats[categoryId] = {
        count: categoryModels.length,
        avgPrice: categoryModels.reduce((sum, m) => sum + (m.pricing?.input || 0), 0) / categoryModels.length || 0,
        providers: [...new Set(categoryModels.map(m => m.provider))]
      }
    }

    return stats
  }
}

// Export singleton instance
export const modelCategorizationService = ModelCategorizationService.getInstance()
