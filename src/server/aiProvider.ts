
import { LanguageModel } from 'ai';

import { getGatewayProvider, isGatewayAvailable } from './ai/gateway/provider';
import { logger } from '@/utils/logger';

export interface AIProviderConfig {
  provider: 'gateway' | 'google' | 'openrouter' | 'anthropic' | 'openai';
  model?: string;
  apiKey?: string;
  baseURL?: string;
  structuredOutputs?: boolean;
  temperature?: number;
  maxTokens?: number;
  useGateway?: boolean;
}

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
}

// Configurações predefinidas para diferentes contextos
export const modelSettings: Record<string, ModelSettings> = {
  'task-planning': {
    temperature: 0.3,        // Mais determinístico para planejamento
    maxTokens: 2000,
    topP: 0.9,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
  },
  'creative-writing': {
    temperature: 0.9,        // Mais criativo
    maxTokens: 4000,
    topP: 0.95,
  },
  'code-generation': {
    temperature: 0.2,        // Muito determinístico
    maxTokens: 3000,
    topP: 0.85,
    stopSequences: ['```', '\n\n\n'],
  },
  'chat': {
    temperature: 0.7,        // Balanceado
    maxTokens: 1500,
    topP: 0.9,
  },
  'analysis': {
    temperature: 0.3,        // Determinístico para análise
    maxTokens: 2500,
    topP: 0.85,
  }
};

export class AIProvider {
  private static instance: AIProvider;
  private models: Map<string, LanguageModel> = new Map();
  private configs: Map<string, AIProviderConfig> = new Map();
  private gatewayFailedAuth: boolean = false; // Track gateway auth failures in memory

  private constructor() {
    // Singleton pattern - construtor privado
  }

  static getInstance(): AIProvider {
    if (!this.instance) {
      this.instance = new AIProvider();
    }
    return this.instance;
  }

  async getModel(config?: Partial<AIProviderConfig>): Promise<LanguageModel> {
    // Check if we have Gateway API key
    const hasGatewayKey = !!process.env.AI_GATEWAY_API_KEY;

    // Check if we should use Gateway
    const useGateway = config?.useGateway ||
                      config?.provider === 'gateway' ||
                      process.env.USE_AI_GATEWAY === 'true';

    // Try Gateway first if enabled, we have a valid key, and auth hasn't failed before
    if (useGateway && hasGatewayKey && !this.gatewayFailedAuth) {
      try {
        logger.info('Attempting to use AI Gateway', { provider: 'AIProvider' });
        const gatewayAvailable = await isGatewayAvailable();
        if (gatewayAvailable) {
          return await this.getGatewayModel(config);
        } else {
          logger.info('Gateway not available, falling back to direct providers', { provider: 'AIProvider' });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Gateway error, falling back', error, { provider: 'AIProvider' });
        // If it's an auth error, mark as failed in instance state
        if (errorMessage.includes('Invalid API Key') || (error as { statusCode?: number }).statusCode === 401) {
          logger.warn('Gateway API key invalid, disabling gateway for this instance', { provider: 'AIProvider' });
          this.gatewayFailedAuth = true;
        }
      }
    } else if (useGateway && !hasGatewayKey) {
      logger.warn('Gateway requested but AI_GATEWAY_API_KEY not found', { provider: 'AIProvider' });
    } else if (useGateway && this.gatewayFailedAuth) {
      logger.info('Gateway authentication failed previously, skipping', { provider: 'AIProvider' });
    }

    // Fallback to direct providers
    return await this.getDirectModel(config);
  }

  private async getGatewayModel(config?: Partial<AIProviderConfig>): Promise<LanguageModel> {
    const gateway = getGatewayProvider();
    
    // Determine model ID
    let modelId: string;
    
    if (config?.model) {
      // Use provided model (should be in format 'provider/model')
      modelId = config.model.includes('/') ? config.model : `openai/${config.model}`;
    } else {
      // Get recommended model based on context
      const context = this.inferContextFromConfig(config);
      const recommended = await gateway.getRecommendedModels(context, 1);
      
      if (recommended.length > 0) {
        modelId = recommended[0].id;
      } else {
        // Fallback to default
        modelId = 'openai/gpt-4o';
      }
    }

    logger.info('Using Gateway model', { provider: 'AIProvider', modelId });
    return await gateway.getModel(modelId);
  }

  private async getDirectModel(config?: Partial<AIProviderConfig>): Promise<LanguageModel> {
    const provider = config?.provider || process.env.AI_SDK_PROVIDER || 'google';
    const model = config?.model || this.getDefaultModel(provider);
    const cacheKey = `${provider}-${model}-${JSON.stringify(config || {})}`;

    // Verificar cache
    if (this.models.has(cacheKey)) {
      return this.models.get(cacheKey)!;
    }

    // Criar novo modelo com a configuração correta
    const enhancedConfig = { ...config, model };
    const languageModel = await this.createModel(provider, enhancedConfig);
    
    // Armazenar no cache
    this.models.set(cacheKey, languageModel);
    this.configs.set(cacheKey, { provider, model, ...config } as AIProviderConfig);

    return languageModel;
  }

  async getModelForContext(context: string, config?: Partial<AIProviderConfig>): Promise<{ model: LanguageModel; settings: ModelSettings }> {
    const settings = modelSettings[context] || modelSettings['chat'];
    
    // Enhanced config with context information
    const enhancedConfig = {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      context, // Pass context for Gateway model selection
      ...config
    };

    const model = await this.getModel(enhancedConfig);
    return { model, settings };
  }

  private async createModel(
    provider: string,
    config?: Partial<AIProviderConfig>
  ): Promise<LanguageModel> {
    switch (provider.toLowerCase()) {
      case 'zai': {
        const apiKey = config?.apiKey || process.env.ZAI_API_KEY;
        if (!apiKey) {
          logger.warn('ZAI_API_KEY not found, falling back to other providers', { provider: 'AIProvider' });
          throw new Error('ZAI_API_KEY not configured');
        }

        const { createOpenAI } = await import('@ai-sdk/openai');
        const zai = createOpenAI({
          apiKey,
          baseURL: 'https://api.z.ai/api/coding/paas/v4'
        });

        const modelName = config?.model || process.env.ZAI_MODEL || 'glm-4.6';
        return zai(modelName) as LanguageModel;
      }

      case 'google': {
        const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY missing');

        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const google = createGoogleGenerativeAI({ apiKey });

        const modelName = config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-pro';
        return google(modelName) as LanguageModel;
      }

      case 'openrouter':
        // OpenRouter has compatibility issues with AI SDK v5
        // Use AI Gateway (USE_AI_GATEWAY=true) or another provider instead
        throw new Error('OpenRouter is disabled due to AI SDK v5 compatibility issues. Use AI Gateway or another provider.');

      case 'anthropic': {
        const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const anthropic = createAnthropic({ apiKey });
        const modelName = config?.model || 'claude-3-5-sonnet-20241022';
        return anthropic(modelName) as LanguageModel;
      }

      case 'openai': {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');

        const { createOpenAI } = await import('@ai-sdk/openai');
        const openai = createOpenAI({ apiKey });
        const modelName = config?.model || 'gpt-4o';
        return openai(modelName) as LanguageModel;
      }

      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      'zai': 'glm-4.6',
      'google': 'gemini-2.5-pro',
      'openrouter': 'google/gemma-2-9b-it:free', // Modelo gratuito como padrão
      'anthropic': 'claude-3-5-sonnet-20241022',
      'openai': 'gpt-4o'
    };
    return defaults[provider] || defaults['google'];
  }

  // Limpar cache (útil para testes ou reinicialização)
  clearCache(): void {
    this.models.clear();
    this.configs.clear();
  }

  // Obter estatísticas do cache
  getCacheStats(): { size: number; providers: string[] } {
    const providers = Array.from(this.configs.values()).map(c => c.provider);
    return {
      size: this.models.size,
      providers: [...new Set(providers)]
    };
  }

  // Remover modelos específicos do cache
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.clearCache();
      return;
    }

    for (const key of this.models.keys()) {
      if (key.includes(pattern)) {
        this.models.delete(key);
        this.configs.delete(key);
      }
    }
  }

  // Inferir contexto baseado na configuração
  private inferContextFromConfig(config?: Partial<AIProviderConfig>): string {
    // Check if context is explicitly provided
    if ((config as any)?.context) {
      return (config as any).context;
    }

    // Infer from temperature and other settings
    const temp = config?.temperature || 0.7;
    const maxTokens = config?.maxTokens || 2000;

    if (temp <= 0.3 && maxTokens <= 2000) {
      return 'analysis'; // Deterministic, focused
    } else if (temp >= 0.8) {
      return 'creative'; // High creativity
    } else if (maxTokens >= 3000) {
      return 'code'; // Longer outputs
    } else {
      return 'chat'; // Default
    }
  }

  // Get available Gateway models
  async getAvailableGatewayModels(): Promise<unknown[]> {
    try {
      const gateway = getGatewayProvider();
      return await gateway.getAvailableModels();
    } catch (error) {
      logger.error('Failed to get Gateway models', error, { provider: 'AIProvider' });
      return [];
    }
  }

  // Get Gateway credits
  async getGatewayCredits(): Promise<unknown> {
    try {
      const gateway = getGatewayProvider();
      return await gateway.getCredits();
    } catch (error) {
      logger.error('Failed to get Gateway credits', error, { provider: 'AIProvider' });
      return null;
    }
  }

}

// Helper function para compatibilidade com código existente
export async function getAISDKModel(config?: Partial<AIProviderConfig>): Promise<LanguageModel> {
  return AIProvider.getInstance().getModel(config);
}

// Helper function para obter modelo com configurações de contexto
export async function getModelForContext(context: string, config?: Partial<AIProviderConfig>) {
  return AIProvider.getInstance().getModelForContext(context, config);
}
