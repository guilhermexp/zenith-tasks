import { logger } from '@/utils/logger';

import { getGatewayProvider, ModelInfo } from './provider';

export interface ModelRequirements {
  context: string;
  minContextWindow?: number;
  maxCost?: number;
  requiredCapabilities?: string[];
  preferredProviders?: string[];
  avoidProviders?: string[];
  speedPriority?: 'fast' | 'balanced' | 'quality';
  maxResponseTokens?: number;
}

export interface ModelScore {
  model: ModelInfo;
  score: number;
  reasons: string[];
  costEstimate?: {
    perRequest: number;
    per1kTokens: number;
  };
}

export class ModelSelector {
  private provider = getGatewayProvider();
  private contextWeights = {
    chat: { cost: 0.3, speed: 0.3, quality: 0.4 },
    code: { cost: 0.2, speed: 0.2, quality: 0.6 },
    analysis: { cost: 0.2, speed: 0.2, quality: 0.6 },
    creative: { cost: 0.2, speed: 0.3, quality: 0.5 },
    fast: { cost: 0.3, speed: 0.6, quality: 0.1 },
    economical: { cost: 0.7, speed: 0.2, quality: 0.1 }
  };

  private logContext = { component: 'ModelSelector' } as const;

  /**
   * Select best model based on requirements
   */
  async selectModel(requirements: ModelRequirements): Promise<ModelInfo | null> {
    const scoredModels = await this.scoreModels(requirements);

    if (scoredModels.length === 0) {
      logger.warn('ModelSelector: no suitable models found', this.logContext);
      return null;
    }

    // Return highest scoring model
    const best = scoredModels[0];
    logger.info('ModelSelector: selected model', {
      ...this.logContext,
      modelId: best.model.id,
      score: Number(best.score.toFixed(2)),
      reasons: best.reasons,
    });

    return best.model;
  }

  /**
   * Score and rank all available models
   */
  async scoreModels(requirements: ModelRequirements): Promise<ModelScore[]> {
    const allModels = await this.provider.getAvailableModels();
    const scores: ModelScore[] = [];

    for (const model of allModels) {
      // Filter out incompatible models
      if (!this.isCompatible(model, requirements)) {
        continue;
      }

      // Calculate score
      const score = this.calculateScore(model, requirements);
      scores.push(score);
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Return top 10 models
    return scores.slice(0, 10);
  }

  /**
   * Check if model meets basic requirements
   */
  private isCompatible(model: ModelInfo, req: ModelRequirements): boolean {
    // Check context window
    if (req.minContextWindow && model.contextWindow < req.minContextWindow) {
      return false;
    }

    // Check max response tokens
    if (req.maxResponseTokens && model.maxOutputTokens < req.maxResponseTokens) {
      return false;
    }

    // Check required capabilities
    if (req.requiredCapabilities) {
      for (const cap of req.requiredCapabilities) {
        if (!model.capabilities.includes(cap)) {
          return false;
        }
      }
    }

    // Check avoided providers
    if (req.avoidProviders && req.avoidProviders.includes(model.provider)) {
      return false;
    }

    // Check cost limit
    if (req.maxCost && model.pricing) {
      const avgCost = (model.pricing.input + model.pricing.output) / 2;
      if (avgCost > req.maxCost) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate model score based on requirements
   */
  private calculateScore(model: ModelInfo, req: ModelRequirements): ModelScore {
    const reasons: string[] = [];
    let score = 0;

    // Get context weights
    const weights = this.contextWeights[req.context as keyof typeof this.contextWeights]
                   || this.contextWeights.chat;

    // 1. Cost Score (0-100)
    let costScore = 100;
    if (model.pricing) {
      const inputCost = model.pricing.input || 0;
      const outputCost = model.pricing.output || 0;
      const avgCost = (inputCost + outputCost) / 2;

      // Normalize cost (lower is better)
      // Assuming typical costs range from 0 to 60 per million tokens
      costScore = Math.max(0, 100 - Math.min(avgCost * 1.67, 100)); // Scale to 0-100

      if (costScore > 70) {
        reasons.push('economical');
      } else if (costScore < 30) {
        reasons.push('premium pricing');
      }
    }

    // 2. Speed Score (0-100)
    let speedScore = 50; // Default
    const modelId = model.id.toLowerCase();

    if (modelId.includes('flash') || modelId.includes('mini') || modelId.includes('haiku')) {
      speedScore = 90;
      reasons.push('fast model');
    } else if (modelId.includes('gpt-4o') || modelId.includes('claude-3-5')) {
      speedScore = 70;
      reasons.push('balanced speed');
    } else if (modelId.includes('opus') || modelId.includes('pro')) {
      speedScore = 40;
      reasons.push('quality-focused');
    }

    // Adjust for speed priority
    if (req.speedPriority === 'fast') {
      speedScore *= 1.2;
    } else if (req.speedPriority === 'quality') {
      speedScore *= 0.8;
    }

    // 3. Quality Score (0-100)
    let qualityScore = 50; // Default

    // Estimate quality based on model tier
    if (modelId.includes('gpt-4o') && !modelId.includes('mini')) {
      qualityScore = 95;
      reasons.push('top-tier quality');
    } else if (modelId.includes('claude-3-5-sonnet')) {
      qualityScore = 95;
      reasons.push('excellent quality');
    } else if (modelId.includes('gemini-2.0-flash-exp')) {
      qualityScore = 85;
      reasons.push('good quality');
    } else if (modelId.includes('gemini-1.5-pro')) {
      qualityScore = 90;
      reasons.push('high quality');
    } else if (modelId.includes('mini') || modelId.includes('haiku')) {
      qualityScore = 60;
      reasons.push('basic quality');
    }

    // 4. Provider Preference Score (0-100)
    let providerScore = 70; // Default neutral

    if (req.preferredProviders && req.preferredProviders.includes(model.provider)) {
      providerScore = 100;
      reasons.push('preferred provider');
    }

    // 5. Capability Bonus (0-50 bonus points)
    let capabilityBonus = 0;

    if (model.capabilities.includes('function-calling') &&
        ['code', 'analysis'].includes(req.context)) {
      capabilityBonus += 20;
      reasons.push('supports functions');
    }

    if (model.capabilities.includes('structured-output') &&
        ['analysis', 'code'].includes(req.context)) {
      capabilityBonus += 15;
      reasons.push('structured output');
    }

    if (model.capabilities.includes('multimodal') &&
        req.requiredCapabilities?.includes('multimodal')) {
      capabilityBonus += 15;
      reasons.push('multimodal support');
    }

    // 6. Context Window Bonus (0-30 bonus points)
    let contextBonus = 0;
    if (model.contextWindow >= 128000) {
      contextBonus = 30;
      reasons.push('large context');
    } else if (model.contextWindow >= 32000) {
      contextBonus = 20;
      reasons.push('good context');
    } else if (model.contextWindow >= 16000) {
      contextBonus = 10;
    }

    // Calculate weighted score (ensure no NaN)
    const baseScore = (
      (costScore || 50) * weights.cost +
      (speedScore || 50) * weights.speed +
      (qualityScore || 50) * weights.quality
    );

    // Add bonuses (capped at 130 total)
    score = Math.min(130, baseScore + capabilityBonus * 0.5 + contextBonus * 0.3 + providerScore * 0.2);

    // Ensure score is never NaN
    if (isNaN(score)) {
      score = 50; // Default mid-range score
    }

    // Cost estimate
    let costEstimate;
    if (model.pricing) {
      const avgTokens = 1000; // Assume average request
      costEstimate = {
        perRequest: (model.pricing.input + model.pricing.output) * avgTokens / 1000000,
        per1kTokens: (model.pricing.input + model.pricing.output) / 1000
      };
    }

    return {
      model,
      score,
      reasons,
      costEstimate
    };
  }

  /**
   * Get cost-optimized models
   */
  async getCostOptimizedModels(limit: number = 5): Promise<ModelInfo[]> {
    const models = await this.provider.getAvailableModels();

    // Filter models with pricing info
    const withPricing = models.filter(m => m.pricing);

    // Sort by average cost
    withPricing.sort((a, b) => {
      const aCost = ((a.pricing!.input || 0) + (a.pricing!.output || 0)) / 2;
      const bCost = ((b.pricing!.input || 0) + (b.pricing!.output || 0)) / 2;
      return aCost - bCost;
    });

    return withPricing.slice(0, limit);
  }

  /**
   * Get performance-optimized models
   */
  async getPerformanceOptimizedModels(limit: number = 5): Promise<ModelInfo[]> {
    const models = await this.provider.getAvailableModels();

    // Filter for fast models based on naming patterns
    const fastModels = models.filter(m => {
      const id = m.id.toLowerCase();
      return id.includes('flash') ||
             id.includes('mini') ||
             id.includes('haiku') ||
             id.includes('turbo');
    });

    // Sort by context window (larger is better for performance)
    fastModels.sort((a, b) => b.contextWindow - a.contextWindow);

    return fastModels.slice(0, limit);
  }

  /**
   * Get quality-optimized models
   */
  async getQualityOptimizedModels(limit: number = 5): Promise<ModelInfo[]> {
    const models = await this.provider.getAvailableModels();

    // Filter for high-quality models
    const qualityModels = models.filter(m => {
      const id = m.id.toLowerCase();
      return (id.includes('gpt-4o') && !id.includes('mini')) ||
             id.includes('claude-3-5-sonnet') ||
             id.includes('opus') ||
             (id.includes('gemini') && id.includes('pro'));
    });

    // Sort by max output tokens (assuming larger = better quality)
    qualityModels.sort((a, b) => b.maxOutputTokens - a.maxOutputTokens);

    return qualityModels.slice(0, limit);
  }

  /**
   * Estimate cost for a specific model and token count
   */
  estimateCost(model: ModelInfo, inputTokens: number, outputTokens: number): number {
    if (!model.pricing) {
      return 0;
    }

    const inputCost = (model.pricing.input * inputTokens) / 1000000;
    const outputCost = (model.pricing.output * outputTokens) / 1000000;

    return inputCost + outputCost;
  }

  /**
   * Get model recommendations for a specific use case
   */
  async getRecommendations(
    context: string,
    options: {
      budget?: 'low' | 'medium' | 'high';
      priority?: 'speed' | 'quality' | 'balanced';
    } = {}
  ): Promise<ModelScore[]> {
    const requirements: ModelRequirements = {
      context,
      speedPriority: options.priority === 'speed' ? 'fast' :
                    options.priority === 'quality' ? 'quality' : 'balanced'
    };

    // Set max cost based on budget
    if (options.budget === 'low') {
      requirements.maxCost = 10; // $10 per million tokens
    } else if (options.budget === 'medium') {
      requirements.maxCost = 30;
    }
    // 'high' budget = no cost limit

    const scores = await this.scoreModels(requirements);
    return scores.slice(0, 5); // Return top 5 recommendations
  }
}

// Singleton instance
let selectorInstance: ModelSelector | null = null;

export function getModelSelector(): ModelSelector {
  if (!selectorInstance) {
    selectorInstance = new ModelSelector();
  }
  return selectorInstance;
}
