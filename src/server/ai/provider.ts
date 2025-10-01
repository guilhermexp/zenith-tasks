import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

export type ModelContext = 'task-planning' | 'creative-writing' | 'code-generation' | 'chat' | 'analysis';

export interface ModelConfig {
  provider: 'google' | 'openrouter' | 'anthropic' | 'openai';
  model?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  structuredOutputs?: boolean;
}

export interface ContextSettings {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Configurações otimizadas por contexto
const contextDefaults: Record<ModelContext, ContextSettings> = {
  'task-planning': {
    temperature: 0.3,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.1
  },
  'creative-writing': {
    temperature: 0.9,
    maxTokens: 4000,
    topP: 0.95,
    frequencyPenalty: 0.3,
    presencePenalty: 0.3
  },
  'code-generation': {
    temperature: 0.2,
    maxTokens: 4000,
    topP: 0.9,
    frequencyPenalty: 0
  },
  'chat': {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.2
  },
  'analysis': {
    temperature: 0.3,
    maxTokens: 3000,
    topP: 0.9,
    frequencyPenalty: 0.1
  }
};

export class AIProvider {
  private static instance: AIProvider;
  private modelCache: Map<string, LanguageModel> = new Map();
  private lastCleanup: number = Date.now();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutos

  private constructor() {}

  static getInstance(): AIProvider {
    if (!this.instance) {
      this.instance = new AIProvider();
    }
    return this.instance;
  }

  /**
   * Obtém um modelo otimizado para um contexto específico
   */
  async getModelForContext(
    context: ModelContext,
    overrides?: Partial<ModelConfig>
  ): Promise<{ model: LanguageModel; settings: ContextSettings }> {
    const settings = { ...contextDefaults[context], ...overrides };
    const config: ModelConfig = {
      provider: (overrides?.provider || process.env.AI_SDK_PROVIDER || 'google') as any,
      model: overrides?.model,
      apiKey: overrides?.apiKey,
      baseURL: overrides?.baseURL,
      ...settings
    };

    const model = await this.getModel(config);
    return { model, settings };
  }

  /**
   * Obtém um modelo com configuração específica
   */
  async getModel(config?: Partial<ModelConfig>): Promise<LanguageModel> {
    // Limpar cache periodicamente
    this.cleanupCacheIfNeeded();

    const provider = config?.provider || process.env.AI_SDK_PROVIDER || 'google';
    const modelName = config?.model || this.getDefaultModel(provider);

    // Criar chave de cache única baseada na configuração
    const cacheKey = this.generateCacheKey(provider, modelName, config);

    // Verificar cache
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    // Criar novo modelo
    const model = await this.createModel(provider, config);

    // Adicionar ao cache
    this.modelCache.set(cacheKey, model);

    return model;
  }

  /**
   * Cria um modelo baseado no provider
   */
  private async createModel(
    provider: string,
    config?: Partial<ModelConfig>
  ): Promise<LanguageModel> {
    switch (provider.toLowerCase()) {
      case 'google': {
        const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY não configurada');
        }

        const google = createGoogleGenerativeAI({
          apiKey
        });

        const modelName = config?.model || this.getDefaultModel('google');
        return google(modelName);
      }

      case 'openrouter': {
        const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error('OPENROUTER_API_KEY não configurada');
        }

        const openai = createOpenAI({
          apiKey,
          baseURL: config?.baseURL || 'https://openrouter.ai/api/v1',
          headers: {
            'X-Title': 'Zenith Tasks AI Assistant',
            'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'http://localhost:3457'
          }
        });

        const modelName = config?.model || this.getDefaultModel('openrouter');
        return openai(modelName);
      }

      case 'anthropic': {
        const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY não configurada');
        }

        const anthropic = createAnthropic({ apiKey });
        const modelName = config?.model || this.getDefaultModel('anthropic');
        return anthropic(modelName);
      }

      case 'openai': {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY não configurada');
        }

        const openai = createOpenAI({ apiKey });
        const modelName = config?.model || this.getDefaultModel('openai');
        return openai(modelName);
      }

      default:
        throw new Error(`Provider ${provider} não suportado`);
    }
  }

  /**
   * Obtém o modelo padrão para cada provider
   */
  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      google: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      openrouter: process.env.OPENROUTER_MODEL || 'openrouter/auto',
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4o'
    };

    return defaults[provider.toLowerCase()] || 'auto';
  }

  /**
   * Gera chave única para cache
   */
  private generateCacheKey(
    provider: string,
    model: string,
    config?: Partial<ModelConfig>
  ): string {
    const configString = config
      ? `${config.temperature || 0.7}-${config.maxTokens || 2000}`
      : 'default';
    return `${provider}-${model}-${configString}`;
  }

  /**
   * Limpa cache periodicamente
   */
  private cleanupCacheIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.modelCache.clear();
      this.lastCleanup = now;
      console.log('[AIProvider] Cache limpo');
    }
  }

  /**
   * Força limpeza do cache
   */
  clearCache(): void {
    this.modelCache.clear();
    console.log('[AIProvider] Cache forçadamente limpo');
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    lastCleanup: Date;
  } {
    return {
      size: this.modelCache.size,
      keys: Array.from(this.modelCache.keys()),
      lastCleanup: new Date(this.lastCleanup)
    };
  }
}

// Função helper para compatibilidade com código existente
export async function getAISDKModel(config?: Partial<ModelConfig>): Promise<LanguageModel> {
  return AIProvider.getInstance().getModel(config);
}