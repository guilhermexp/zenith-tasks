import { generateObject, LanguageModel } from 'ai';
import { z } from 'zod';
import { getModelForContext, AIProvider as BaseAIProvider } from '@/server/aiProvider';
import { logger } from '@/utils/logger';
import { aiCostMonitor } from '@/services/monitoring/aiCost';

/**
 * AI Provider for Task Prioritization
 * Specialized wrapper around AI SDK for structured task analysis
 */

export interface AIGenerationOptions {
  model?: LanguageModel;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  context?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface AIGenerationResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
  finishReason: string;
  warnings?: string[];
}

/**
 * Token cost estimates (USD per 1M tokens)
 * These are approximate values and should be updated based on provider pricing
 */
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.5-pro': { input: 1.25, output: 5.0 },
  'gemini-2.5-flash': { input: 0.075, output: 0.3 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'grok-4-fast-reasoning': { input: 2.0, output: 10.0 },
};

/**
 * Calculate cost based on token usage
 */
function calculateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = TOKEN_COSTS[modelId];
  if (!costs) {
    // Unknown model, return 0
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  // Add jitter
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const retryableMessages = [
    'rate limit',
    'timeout',
    'network',
    'connection',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    '429',
    '500',
    '502',
    '503',
    '504',
  ];

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  return retryableMessages.some(
    (msg) => errorMessage.includes(msg) || errorCode.includes(msg)
  );
}

/**
 * AI Task Prioritization Provider
 * Handles structured AI generation with retry logic and token tracking
 */
export class AIPrioritizationProvider {
  private static instance: AIPrioritizationProvider;
  private baseProvider: BaseAIProvider;
  private totalTokensUsed: number = 0;
  private totalCost: number = 0;

  private constructor() {
    this.baseProvider = BaseAIProvider.getInstance();
  }

  static getInstance(): AIPrioritizationProvider {
    if (!this.instance) {
      this.instance = new AIPrioritizationProvider();
    }
    return this.instance;
  }

  /**
   * Generate structured output with retry logic
   */
  async generateStructured<T>(
    schema: z.ZodSchema<T>,
    prompt: string,
    options: AIGenerationOptions = {},
    userId: string = 'test-user'
  ): Promise<AIGenerationResult<T>> {
    const maxRetries = options.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Get model
        let model: LanguageModel;
        let modelMetadata: { provider: string; modelId: string } | null = null;

        if (options.model) {
          model = options.model;
        } else {
          const context = options.context || 'analysis';
          const result = await getModelForContext(context, {
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          });
          model = result.model;
          modelMetadata = result.metadata;
        }

        logger.info('Generating structured output', {
          provider: 'AIPrioritizationProvider',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          context: options.context,
          model: modelMetadata?.modelId || 'unknown',
        });

        // Generate structured output
        const result = await generateObject({
          model,
          schema,
          prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        });

        // Extract token usage (AI SDK v5 uses different field names)
        const resultUsage = result.usage as any;
        const usage: TokenUsage = {
          promptTokens: resultUsage?.promptTokens || 0,
          completionTokens: resultUsage?.completionTokens || 0,
          totalTokens: resultUsage?.totalTokens || 0,
        };

        // Calculate cost
        if (modelMetadata?.modelId) {
          usage.cost = calculateCost(
            modelMetadata.modelId,
            usage.promptTokens,
            usage.completionTokens
          );
        }

        // Track usage
        this.totalTokensUsed += usage.totalTokens;
        this.totalCost += usage.cost || 0;

        // Track cost in aiCostMonitor
        if (modelMetadata?.provider && modelMetadata?.modelId) {
          aiCostMonitor.trackAICall(
            userId,
            modelMetadata.provider,
            modelMetadata.modelId,
            usage.promptTokens,
            usage.completionTokens,
            options.context
          );
        }

        logger.info('Structured output generated successfully', {
          provider: 'AIPrioritizationProvider',
          usage,
          totalTokensUsed: this.totalTokensUsed,
          totalCost: this.totalCost.toFixed(4),
        });

        return {
          data: result.object,
          usage,
          model: modelMetadata?.modelId || 'unknown',
          finishReason: result.finishReason,
          warnings: result.warnings?.map((w: any) => w.message || String(w)) || [],
        };
      } catch (error: any) {
        lastError = error;

        logger.error('Error generating structured output', error, {
          provider: 'AIPrioritizationProvider',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
        });

        // Check if we should retry
        if (attempt < maxRetries && isRetryableError(error)) {
          const delay = calculateBackoffDelay(attempt);
          logger.info('Retrying after delay', {
            provider: 'AIPrioritizationProvider',
            delay,
            attempt: attempt + 1,
          });
          await sleep(delay);
          continue;
        }

        // No more retries or non-retryable error
        break;
      }
    }

    // All retries failed
    logger.error('All retry attempts failed', lastError, {
      provider: 'AIPrioritizationProvider',
      maxRetries,
    });

    throw new Error(
      `AI generation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Get token usage statistics
   */
  getUsageStats(): { totalTokens: number; totalCost: number } {
    return {
      totalTokens: this.totalTokensUsed,
      totalCost: this.totalCost,
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.totalTokensUsed = 0;
    this.totalCost = 0;
  }

  /**
   * Check if AI provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { model } = await getModelForContext('analysis');
      return !!model;
    } catch (error) {
      logger.error('AI provider not available', error, {
        provider: 'AIPrioritizationProvider',
      });
      return false;
    }
  }

  /**
   * Get available models from base provider
   */
  async getAvailableModels(): Promise<unknown[]> {
    try {
      return await this.baseProvider.getAvailableGatewayModels();
    } catch (error) {
      logger.error('Failed to get available models', error, {
        provider: 'AIPrioritizationProvider',
      });
      return [];
    }
  }
}

// Export singleton instance
export const aiPrioritizationProvider = AIPrioritizationProvider.getInstance();

// Helper functions for convenience
export async function generateStructuredOutput<T>(
  schema: z.ZodSchema<T>,
  prompt: string,
  options?: AIGenerationOptions
): Promise<AIGenerationResult<T>> {
  return aiPrioritizationProvider.generateStructured(schema, prompt, options);
}

export function getAIUsageStats() {
  return aiPrioritizationProvider.getUsageStats();
}

export function resetAIUsageStats() {
  return aiPrioritizationProvider.resetUsageStats();
}
