import { NoObjectGeneratedError, APICallError } from "ai";

type AdjusterFunction = (current: number) => number;
type MessageAdjuster = (current: ChatMessage[]) => ChatMessage[];

export interface ErrorCategory {
  type: string;
  userMessage: string;
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  adjustments?: Record<string, AdjusterFunction | MessageAdjuster | number | string>;
}

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: number;
  onError?: (error: Error | unknown, attempt: number) => void;
  onRetry?: (attempt: number, delay: number) => void;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ErrorContext {
  userId?: string;
  conversationId?: string;
  attempt: number;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  prompt?: string;
  messages?: ChatMessage[];
}

// Categorias de erro predefinidas
export const errorCategories: Record<string, ErrorCategory> = {
  rate_limit: {
    type: "rate_limit",
    userMessage:
      "Sistema sobrecarregado. Tentando novamente em alguns segundos...",
    shouldRetry: true,
    retryDelay: 2000,
    maxRetries: 3,
    adjustments: {
      maxTokens: (current: number) => Math.floor(current * 0.8),
      temperature: (current: number) => current,
    },
  },
  timeout: {
    type: "timeout",
    userMessage: "A operação demorou muito. Tentando novamente...",
    shouldRetry: true,
    retryDelay: 1000,
    maxRetries: 2,
    adjustments: {
      timeout: (current: number) => (current || 30000) * 2,
      maxTokens: (current: number) => Math.floor(current * 0.7),
    },
  },
  auth: {
    type: "auth",
    userMessage: "Erro de configuração. Verifique as credenciais da API.",
    shouldRetry: false,
    maxRetries: 0,
  },
  token_limit: {
    type: "token_limit",
    userMessage: "Contexto muito longo. Reduzindo e tentando novamente...",
    shouldRetry: true,
    retryDelay: 500,
    maxRetries: 2,
    adjustments: {
      maxTokens: (current: number) => Math.floor(current * 0.5),
      messages: (current: any[]) => current.slice(-5), // Manter apenas últimas 5 mensagens
    },
  },
  schema_validation: {
    type: "schema_validation",
    userMessage: "Resposta não estruturada corretamente. Tentando novamente...",
    shouldRetry: true,
    retryDelay: 1000,
    maxRetries: 2,
    adjustments: {
      temperature: (current: number) => Math.max(0.1, current - 0.2), // Mais determinístico
      maxTokens: (current: number) => Math.floor(current * 1.5),
    },
  },
  network: {
    type: "network",
    userMessage: "Problema de conexão. Tentando novamente...",
    shouldRetry: true,
    retryDelay: 3000,
    maxRetries: 3,
  },
  unknown: {
    type: "unknown",
    userMessage: "Ocorreu um erro inesperado.",
    shouldRetry: false,
    maxRetries: 1,
  },
};

interface ErrorLogEntry {
  timestamp: string;
  error: Error | unknown;
  context: ErrorContext;
  category: string;
}

interface HandleErrorResult {
  retry: boolean;
  adjustments?: Record<string, number | string | ChatMessage[]>;
  fallback?: FallbackResponse;
  userMessage: string;
  category: string;
}

interface FallbackResponse {
  error: string;
  suggestion: string;
  rawText?: string;
  fallbackResponse?: string;
}

export class AIErrorManager {
  private errorLog: ErrorLogEntry[] = [];
  private maxLogSize = 1000;

  /**
   * Trata um erro e retorna instruções para retry ou fallback
   */
  async handleError(
    error: Error | unknown,
    context: ErrorContext
  ): Promise<HandleErrorResult> {
    const category = this.categorizeError(error);
    this.logError(error, context, category.type);

    // Verificar se deve tentar novamente
    if (
      !category.shouldRetry ||
      context.attempt >= (category.maxRetries || 0)
    ) {
      return {
        retry: false,
        userMessage: category.userMessage,
        category: category.type,
        fallback: this.generateFallback(error, context),
      };
    }

    // Calcular ajustes para retry
    const adjustments = this.calculateAdjustments(category, context);

    // Aguardar delay se especificado
    if (category.retryDelay) {
      const delay = this.calculateBackoff(context.attempt, category.retryDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return {
      retry: true,
      adjustments,
      userMessage: category.userMessage,
      category: category.type,
    };
  }

  /**
   * Categoriza um erro baseado em sua mensagem e tipo
   */
  categorizeError(error: Error | unknown): ErrorCategory {
    // Erro de geração de objeto estruturado
    if (NoObjectGeneratedError.isInstance(error)) {
      return errorCategories["schema_validation"];
    }

    // Erro de API
    if (error instanceof APICallError && error.statusCode) {
      if (error.statusCode === 429) {
        return errorCategories["rate_limit"];
      }
      if (error.statusCode === 401 || error.statusCode === 403) {
        return errorCategories["auth"];
      }
      if (error.statusCode >= 500) {
        return errorCategories["network"];
      }
    }

    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

    // Rate limit
    if (
      message.includes("429") ||
      message.includes("rate") ||
      message.includes("quota")
    ) {
      return errorCategories["rate_limit"];
    }

    // Timeout
    if (message.includes("timeout") || message.includes("timed out")) {
      return errorCategories["timeout"];
    }

    // Autenticação
    if (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return errorCategories["auth"];
    }

    // Token limit
    if (
      message.includes("token") ||
      message.includes("context") ||
      message.includes("too long")
    ) {
      return errorCategories["token_limit"];
    }

    // Rede
    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("fetch")
    ) {
      return errorCategories["network"];
    }

    // Validação de schema
    if (
      message.includes("schema") ||
      message.includes("validation") ||
      message.includes("parse")
    ) {
      return errorCategories["schema_validation"];
    }

    return errorCategories["unknown"];
  }

  /**
   * Calcula ajustes para retry baseado na categoria do erro
   */
  private calculateAdjustments(
    category: ErrorCategory,
    context: ErrorContext
  ): Record<string, number | string | ChatMessage[]> {
    if (!category.adjustments) return {};

    const adjustments: Record<string, number | string | ChatMessage[]> = {};

    for (const [key, adjuster] of Object.entries(category.adjustments)) {
      if (typeof adjuster === "function") {
        const currentValue = context[key as keyof ErrorContext];
        if (currentValue !== undefined) {
          // Type narrowing based on the key
          if (key === 'messages' && Array.isArray(currentValue)) {
            adjustments[key] = (adjuster as MessageAdjuster)(currentValue as ChatMessage[]);
          } else if (typeof currentValue === 'number') {
            adjustments[key] = (adjuster as AdjusterFunction)(currentValue);
          }
        }
      } else {
        adjustments[key] = adjuster as number | string;
      }
    }

    return adjustments;
  }

  /**
   * Calcula delay com backoff exponencial
   */
  private calculateBackoff(attempt: number, baseDelay: number): number {
    const jitter = Math.random() * 0.1; // 10% de jitter
    const backoff = Math.pow(2, attempt - 1);
    return Math.min(baseDelay * backoff * (1 + jitter), 30000); // Max 30s
  }

  /**
   * Gera fallback baseado no tipo de erro
   */
  private generateFallback(error: Error | unknown, context: ErrorContext): FallbackResponse {
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        error: "Failed to generate structured response",
        rawText: (error as NoObjectGeneratedError).text,
        suggestion: "Try with a simpler request or check the schema",
      };
    }

    if (context.prompt) {
      return {
        error: "AI service temporarily unavailable",
        suggestion: "Please try again in a few moments",
        fallbackResponse:
          "I understand your request but cannot process it right now. Please try again.",
      };
    }

    return {
      error: "Service temporarily unavailable",
      suggestion: "Please try again later",
    };
  }

  /**
   * Registra erro para debugging e analytics
   */
  private logError(error: Error | unknown, context: ErrorContext, category: string) {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      error,
      context,
      category,
    };

    this.errorLog.push(logEntry);

    // Manter tamanho do log sob controle
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize / 2);
    }

    // Log no console para desenvolvimento
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[AIError:${category}]`, errorMessage, {
      attempt: context.attempt,
      userId: context.userId,
    });

    // Enviar para sistema de monitoramento em produção
    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      // Sentry.captureException(error, { extra: context, tags: { category } });
    }
  }

  /**
   * Função utilitária para retry com configuração automática
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    context: ErrorContext,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      onError,
      onRetry,
    } = options;

    const errorManager = new AIErrorManager();
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        onError?.(error, attempt);

        if (attempt < maxAttempts) {
          const errorContext = { ...context, attempt };
          const result = await errorManager.handleError(error, errorContext);

          if (result.retry) {
            const waitTime = delay * Math.pow(backoff, attempt - 1);
            onRetry?.(attempt, waitTime);
            await new Promise((resolve) => setTimeout(resolve, waitTime));

            // Aplicar ajustes se fornecidos
            if (result.adjustments) {
              Object.assign(context, result.adjustments);
            }
            continue;
          } else {
            // Não deve fazer retry, retornar fallback se disponível
            if (result.fallback) {
              throw new Error(
                `${result.userMessage}: ${JSON.stringify(result.fallback)}`
              );
            }
            break;
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Obtém estatísticas de erro
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const byCategory: Record<string, number> = {};
    let recentErrors = 0;

    for (const entry of this.errorLog) {
      // Contar por categoria
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;

      // Contar erros recentes
      if (new Date(entry.timestamp).getTime() > oneHourAgo) {
        recentErrors++;
      }
    }

    return {
      total: this.errorLog.length,
      byCategory,
      recentErrors,
    };
  }

  /**
   * Limpa logs antigos
   */
  clearOldLogs(olderThanHours: number = 24) {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    this.errorLog = this.errorLog.filter(
      (entry) => new Date(entry.timestamp).getTime() > cutoff
    );
  }
}

// Instância singleton para uso global
export const aiErrorManager = new AIErrorManager();
