import { gateway, createGateway } from 'ai';
import type { LanguageModel } from 'ai';

export interface GatewayConfig {
  apiKey?: string;
  baseURL?: string;
  useOIDC?: boolean;
  metadataCacheRefreshMillis?: number;
  fallbackProviders?: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  pricing?: {
    input: number;
    output: number;
    cachedInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
  capabilities: string[];
  contextWindow: number;
  maxOutputTokens: number;
}

export interface CreditInfo {
  balance: number;
  total_used: number;
  last_updated: string;
}

export class GatewayProvider {
  private gateway: any;
  private modelsCache: Map<string, ModelInfo[]> = new Map();
  private creditsCache: CreditInfo | null = null;
  private lastModelRefresh: number = 0;
  private lastCreditsRefresh: number = 0;
  private config: GatewayConfig;

  constructor(config: GatewayConfig = {}) {
    this.config = {
      metadataCacheRefreshMillis: 5 * 60 * 1000, // 5 minutes
      useOIDC: true,
      ...config
    };

    // Create gateway instance with API key
    const apiKey = config.apiKey || process.env.AI_GATEWAY_API_KEY;

    if (apiKey) {
      this.gateway = createGateway({
        apiKey,
        baseURL: config.baseURL || 'https://api.portkey.ai/v1',
        metadataCacheRefreshMillis: this.config.metadataCacheRefreshMillis
      });
      console.log('[Gateway] Initialized with API key');
    } else {
      // Use default gateway instance
      this.gateway = gateway;
      console.warn('[Gateway] No API key found, using default gateway');
    }
  }

  /**
   * Get available models with caching
   */
  async getAvailableModels(forceRefresh: boolean = false): Promise<ModelInfo[]> {
    const now = Date.now();
    const cacheKey = 'all_models';
    
    // Check cache
    if (!forceRefresh && 
        this.modelsCache.has(cacheKey) && 
        (now - this.lastModelRefresh) < this.config.metadataCacheRefreshMillis!) {
      return this.modelsCache.get(cacheKey)!;
    }

    try {
      console.log('[Gateway] Fetching available models...');

      // Try to use real API if available
      let response;

      if (this.gateway?.metadata) {
        const metadata = await this.gateway.metadata();
        response = { models: metadata.models || [] };
        console.log('[Gateway] Loaded real models from API');
      } else {
        console.warn('[Gateway] Nenhum provedor de modelos configurado. Retornando lista vazia.');
        response = { models: [] };
      }
      
      const models: ModelInfo[] = response.models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: model.id.split('/')[0],
        description: model.description,
        pricing: model.pricing ? {
          input: model.pricing.input || 0,
          output: model.pricing.output || 0,
          cachedInputTokens: model.pricing.cachedInputTokens,
          cacheCreationInputTokens: model.pricing.cacheCreationInputTokens
        } : undefined,
        capabilities: this.inferCapabilities(model),
        contextWindow: model.contextWindow || 4096,
        maxOutputTokens: model.maxOutputTokens || 2048
      }));

      // Update cache
      this.modelsCache.set(cacheKey, models);
      this.lastModelRefresh = now;

      console.log(`[Gateway] Loaded ${models.length} models from ${new Set(models.map(m => m.provider)).size} providers`);
      return models;
    } catch (error) {
      console.error('[Gateway] Failed to fetch models:', error);
      
      // Return cached data if available
      if (this.modelsCache.has(cacheKey)) {
        console.log('[Gateway] Using cached models due to fetch error');
        return this.modelsCache.get(cacheKey)!;
      }
      
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get models by provider
   */
  async getModelsByProvider(provider: string): Promise<ModelInfo[]> {
    const allModels = await this.getAvailableModels();
    return allModels.filter(model => model.provider === provider);
  }

  /**
   * Get specific model info
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const allModels = await this.getAvailableModels();
    return allModels.find(model => model.id === modelId) || null;
  }

  /**
   * Get language model instance
   */
  async getModel(modelId: string): Promise<LanguageModel> {
    try {
      // Validate model exists
      const modelInfo = await this.getModelInfo(modelId);
      if (!modelInfo) {
        throw new Error(`Model ${modelId} not found in available models`);
      }

      // Return gateway model
      return this.gateway(modelId);
    } catch (error) {
      console.error(`[Gateway] Failed to get model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get credit information
   */
  async getCredits(forceRefresh: boolean = false): Promise<CreditInfo> {
    const now = Date.now();
    const cacheTimeout = 60 * 1000; // 1 minute for credits
    
    // Check cache
    if (!forceRefresh && 
        this.creditsCache && 
        (now - this.lastCreditsRefresh) < cacheTimeout) {
      return this.creditsCache;
    }

    try {
      console.log('[Gateway] Fetching credit information...');

      const credits: CreditInfo = {
        balance: 0,
        total_used: 0,
        last_updated: new Date().toISOString()
      };

      // Update cache
      this.creditsCache = credits;
      this.lastCreditsRefresh = now;

      return credits;
    } catch (error) {
      console.error('[Gateway] Failed to fetch credits:', error);
      
      // Return cached data if available
      if (this.creditsCache) {
        console.log('[Gateway] Using cached credits due to fetch error');
        return this.creditsCache;
      }
      
      // Return default values as fallback
      return {
        balance: 0,
        total_used: 0,
        last_updated: new Date().toISOString()
      };
    }
  }

  /**
   * Get available providers
   */
  async getProviders(): Promise<string[]> {
    const models = await this.getAvailableModels();
    return [...new Set(models.map(model => model.provider))].sort();
  }

  /**
   * Check if model is available
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    const modelInfo = await this.getModelInfo(modelId);
    return modelInfo !== null;
  }

  /**
   * Get recommended models for context
   */
  async getRecommendedModels(context: string, limit: number = 5): Promise<ModelInfo[]> {
    const allModels = await this.getAvailableModels();
    
    // Simple recommendation logic based on context
    const contextPreferences: Record<string, string[]> = {
      'chat': ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-2.0-flash-exp'],
      'code': ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-2.0-flash-exp'],
      'analysis': ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-2.0-flash-exp'],
      'creative': ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-2.0-flash-exp'],
      'fast': ['google/gemini-2.0-flash-exp', 'openai/gpt-4o-mini', 'anthropic/claude-3-haiku-20240307'],
      'economical': ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-exp', 'anthropic/claude-3-haiku-20240307']
    };

    const preferredIds = contextPreferences[context] || contextPreferences['chat'];
    const recommended: ModelInfo[] = [];

    // Add preferred models that are available
    for (const modelId of preferredIds) {
      const model = allModels.find(m => m.id === modelId);
      if (model && recommended.length < limit) {
        recommended.push(model);
      }
    }

    // Fill remaining slots with other available models
    if (recommended.length < limit) {
      const remaining = allModels
        .filter(model => !recommended.some(r => r.id === model.id))
        .sort((a, b) => {
          // Sort by pricing (lower cost first) if available
          const aCost = a.pricing?.input || 0;
          const bCost = b.pricing?.input || 0;
          return aCost - bCost;
        })
        .slice(0, limit - recommended.length);
      
      recommended.push(...remaining);
    }

    return recommended;
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.modelsCache.clear();
    this.creditsCache = null;
    this.lastModelRefresh = 0;
    this.lastCreditsRefresh = 0;
    console.log('[Gateway] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    modelsCount: number;
    lastModelRefresh: Date | null;
    lastCreditsRefresh: Date | null;
    hasCreditsCache: boolean;
  } {
    return {
      modelsCount: this.modelsCache.get('all_models')?.length || 0,
      lastModelRefresh: this.lastModelRefresh ? new Date(this.lastModelRefresh) : null,
      lastCreditsRefresh: this.lastCreditsRefresh ? new Date(this.lastCreditsRefresh) : null,
      hasCreditsCache: this.creditsCache !== null
    };
  }

  /**
   * Infer model capabilities from model info
   */
  private inferCapabilities(model: any): string[] {
    const capabilities: string[] = ['text-generation'];
    
    const modelId = model.id.toLowerCase();
    const name = (model.name || '').toLowerCase();
    const description = (model.description || '').toLowerCase();
    
    // Infer capabilities based on model name/description
    if (modelId.includes('gpt') || modelId.includes('claude') || modelId.includes('gemini')) {
      capabilities.push('reasoning', 'function-calling');
    }
    
    if (modelId.includes('code') || name.includes('code') || description.includes('code')) {
      capabilities.push('code-generation');
    }
    
    if (modelId.includes('vision') || name.includes('vision') || description.includes('multimodal')) {
      capabilities.push('multimodal');
    }
    
    // Most modern models support structured output
    if (!modelId.includes('mini') && !modelId.includes('haiku')) {
      capabilities.push('structured-output');
    }
    
    return capabilities;
  }
}

// Singleton instance
let gatewayInstance: GatewayProvider | null = null;

export function getGatewayProvider(config?: GatewayConfig): GatewayProvider {
  if (!gatewayInstance) {
    gatewayInstance = new GatewayProvider(config);
  }
  return gatewayInstance;
}

// Helper function to check if Gateway is available
export async function isGatewayAvailable(): Promise<boolean> {
  try {
    const provider = getGatewayProvider();
    const models = await provider.getAvailableModels();
    return models.length > 0;
  } catch (error) {
    console.error('[Gateway] Availability check failed:', error);
    return false;
  }
}