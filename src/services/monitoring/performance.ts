/**
 * Performance Monitoring Service
 * Tracks API response times, AI provider latency, and database query performance
 */

import { logger } from '@/utils/logger';
import { alertSystem } from './alert-system';

/**
 * Performance metrics structure
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Endpoint performance data
 */
export interface EndpointPerformance {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  slowRequests: number;
  errorRequests: number;
  successRate: number;
  p50: number; // Median
  p95: number;
  p99: number;
}

/**
 * AI Provider performance data
 */
export interface AIProviderPerformance {
  provider: string;
  model: string;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  totalCalls: number;
  failedCalls: number;
  successRate: number;
  avgTokens: number;
}

/**
 * Database query performance data
 */
export interface DatabasePerformance {
  operation: string;
  avgQueryTime: number;
  minQueryTime: number;
  maxQueryTime: number;
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  successRate: number;
}

/**
 * Performance summary
 */
export interface PerformanceSummary {
  endpoints: Record<string, EndpointPerformance>;
  aiProviders: Record<string, AIProviderPerformance>;
  database: Record<string, DatabasePerformance>;
  overallStats: {
    avgResponseTime: number;
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    timestamp: Date;
  };
}

/**
 * Performance monitoring configuration
 */
interface PerformanceConfig {
  slowEndpointThreshold: number; // ms
  slowQueryThreshold: number; // ms
  slowAICallThreshold: number; // ms
  enableAutoAlerts: boolean;
  retentionHours: number;
}

/**
 * Metric storage entry
 */
interface MetricEntry extends PerformanceMetric {
  type: 'endpoint' | 'ai_provider' | 'database';
  success: boolean;
  error?: string;
}

/**
 * Performance Monitoring Class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: MetricEntry[] = [];
  private config: PerformanceConfig;
  private startTime: Date;

  private constructor() {
    this.config = {
      slowEndpointThreshold: 3000, // 3 seconds
      slowQueryThreshold: 1000, // 1 second
      slowAICallThreshold: 5000, // 5 seconds
      enableAutoAlerts: true,
      retentionHours: 24,
    };
    this.startTime = new Date();

    // Clean up old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000);

    logger.info('Performance monitoring initialized', {
      provider: 'PerformanceMonitor',
      config: this.config,
    });
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Track API endpoint performance
   */
  trackEndpoint(
    endpoint: string,
    method: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: MetricEntry = {
      type: 'endpoint',
      operation: `${method} ${endpoint}`,
      duration,
      timestamp: new Date(),
      success,
      metadata: {
        ...metadata,
        endpoint,
        method,
      },
    };

    this.metrics.push(metric);

    // Log performance
    if (duration > this.config.slowEndpointThreshold) {
      logger.warn('Slow endpoint detected', {
        provider: 'PerformanceMonitor',
        endpoint,
        method,
        duration,
        threshold: this.config.slowEndpointThreshold,
      });

      // Trigger alert
      if (this.config.enableAutoAlerts) {
        alertSystem.updateMetric('avg_response_time', duration);
      }
    } else {
      logger.info('Endpoint performance tracked', {
        provider: 'PerformanceMonitor',
        endpoint,
        method,
        duration,
      });
    }

    // Update real-time metrics
    this.updateEndpointMetrics(endpoint, duration);
  }

  /**
   * Track AI provider performance
   */
  trackAIProvider(
    provider: string,
    model: string,
    duration: number,
    success: boolean,
    tokens?: number,
    metadata?: Record<string, any>
  ): void {
    const metric: MetricEntry = {
      type: 'ai_provider',
      operation: `${provider}:${model}`,
      duration,
      timestamp: new Date(),
      success,
      metadata: {
        ...metadata,
        provider,
        model,
        tokens,
      },
    };

    this.metrics.push(metric);

    // Log performance
    if (duration > this.config.slowAICallThreshold) {
      logger.warn('Slow AI call detected', {
        provider: 'PerformanceMonitor',
        aiProvider: provider,
        model,
        duration,
        threshold: this.config.slowAICallThreshold,
      });
    } else {
      logger.info('AI provider performance tracked', {
        provider: 'PerformanceMonitor',
        aiProvider: provider,
        model,
        duration,
        tokens,
      });
    }

    // Update error rate for alert system
    if (this.config.enableAutoAlerts) {
      const errorRate = this.calculateAIErrorRate(provider);
      alertSystem.updateMetric('ai_provider_error_rate', errorRate);
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: MetricEntry = {
      type: 'database',
      operation,
      duration,
      timestamp: new Date(),
      success,
      metadata,
    };

    this.metrics.push(metric);

    // Log performance
    if (duration > this.config.slowQueryThreshold) {
      logger.warn('Slow database query detected', {
        provider: 'PerformanceMonitor',
        operation,
        duration,
        threshold: this.config.slowQueryThreshold,
      });
    } else {
      logger.info('Database query performance tracked', {
        provider: 'PerformanceMonitor',
        operation,
        duration,
      });
    }

    // Update database connection status
    if (this.config.enableAutoAlerts && !success) {
      alertSystem.updateMetric('db_connection_status', 'failed');
    } else if (success) {
      alertSystem.updateMetric('db_connection_status', 'healthy');
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Get endpoint performance summary
   */
  getEndpointPerformance(endpoint?: string): Record<string, EndpointPerformance> {
    const endpointMetrics = this.metrics.filter((m) => m.type === 'endpoint');

    if (endpoint) {
      return {
        [endpoint]: this.calculateEndpointStats(
          endpointMetrics.filter((m) => m.metadata?.endpoint === endpoint)
        ),
      };
    }

    // Group by endpoint
    const grouped: Record<string, MetricEntry[]> = {};
    for (const metric of endpointMetrics) {
      const ep = metric.metadata?.endpoint || 'unknown';
      if (!grouped[ep]) grouped[ep] = [];
      grouped[ep].push(metric);
    }

    const result: Record<string, EndpointPerformance> = {};
    for (const [ep, metrics] of Object.entries(grouped)) {
      result[ep] = this.calculateEndpointStats(metrics);
    }

    return result;
  }

  /**
   * Get AI provider performance summary
   */
  getAIProviderPerformance(): Record<string, AIProviderPerformance> {
    const aiMetrics = this.metrics.filter((m) => m.type === 'ai_provider');

    // Group by provider
    const grouped: Record<string, MetricEntry[]> = {};
    for (const metric of aiMetrics) {
      const provider = metric.metadata?.provider || 'unknown';
      if (!grouped[provider]) grouped[provider] = [];
      grouped[provider].push(metric);
    }

    const result: Record<string, AIProviderPerformance> = {};
    for (const [provider, metrics] of Object.entries(grouped)) {
      result[provider] = this.calculateAIStats(metrics);
    }

    return result;
  }

  /**
   * Get database performance summary
   */
  getDatabasePerformance(): Record<string, DatabasePerformance> {
    const dbMetrics = this.metrics.filter((m) => m.type === 'database');

    // Group by operation
    const grouped: Record<string, MetricEntry[]> = {};
    for (const metric of dbMetrics) {
      const op = metric.operation;
      if (!grouped[op]) grouped[op] = [];
      grouped[op].push(metric);
    }

    const result: Record<string, DatabasePerformance> = {};
    for (const [op, metrics] of Object.entries(grouped)) {
      result[op] = this.calculateDatabaseStats(metrics);
    }

    return result;
  }

  /**
   * Get overall performance summary
   */
  getPerformanceSummary(): PerformanceSummary {
    const totalRequests = this.metrics.length;
    const totalErrors = this.metrics.filter((m) => !m.success).length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    const avgResponseTime =
      totalRequests > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
        : 0;

    return {
      endpoints: this.getEndpointPerformance(),
      aiProviders: this.getAIProviderPerformance(),
      database: this.getDatabasePerformance(),
      overallStats: {
        avgResponseTime,
        totalRequests,
        totalErrors,
        errorRate,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Calculate endpoint statistics
   */
  private calculateEndpointStats(metrics: MetricEntry[]): EndpointPerformance {
    if (metrics.length === 0) {
      return {
        endpoint: 'unknown',
        method: 'unknown',
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalRequests: 0,
        slowRequests: 0,
        errorRequests: 0,
        successRate: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const endpoint = metrics[0].metadata?.endpoint || 'unknown';
    const method = metrics[0].metadata?.method || 'unknown';

    return {
      endpoint,
      method,
      avgResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minResponseTime: durations[0],
      maxResponseTime: durations[durations.length - 1],
      totalRequests: metrics.length,
      slowRequests: metrics.filter((m) => m.duration > this.config.slowEndpointThreshold).length,
      errorRequests: metrics.filter((m) => !m.success).length,
      successRate: metrics.filter((m) => m.success).length / metrics.length,
      p50: this.calculatePercentile(durations, 0.5),
      p95: this.calculatePercentile(durations, 0.95),
      p99: this.calculatePercentile(durations, 0.99),
    };
  }

  /**
   * Calculate AI provider statistics
   */
  private calculateAIStats(metrics: MetricEntry[]): AIProviderPerformance {
    if (metrics.length === 0) {
      return {
        provider: 'unknown',
        model: 'unknown',
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        totalCalls: 0,
        failedCalls: 0,
        successRate: 0,
        avgTokens: 0,
      };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const provider = metrics[0].metadata?.provider || 'unknown';
    const model = metrics[0].metadata?.model || 'unknown';
    const tokens = metrics.filter((m) => m.metadata?.tokens).map((m) => m.metadata!.tokens);
    const avgTokens = tokens.length > 0 ? tokens.reduce((sum, t) => sum + t, 0) / tokens.length : 0;

    return {
      provider,
      model,
      avgLatency: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minLatency: durations[0],
      maxLatency: durations[durations.length - 1],
      totalCalls: metrics.length,
      failedCalls: metrics.filter((m) => !m.success).length,
      successRate: metrics.filter((m) => m.success).length / metrics.length,
      avgTokens,
    };
  }

  /**
   * Calculate database statistics
   */
  private calculateDatabaseStats(metrics: MetricEntry[]): DatabasePerformance {
    if (metrics.length === 0) {
      return {
        operation: 'unknown',
        avgQueryTime: 0,
        minQueryTime: 0,
        maxQueryTime: 0,
        totalQueries: 0,
        slowQueries: 0,
        failedQueries: 0,
        successRate: 0,
      };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const operation = metrics[0].operation;

    return {
      operation,
      avgQueryTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minQueryTime: durations[0],
      maxQueryTime: durations[durations.length - 1],
      totalQueries: metrics.length,
      slowQueries: metrics.filter((m) => m.duration > this.config.slowQueryThreshold).length,
      failedQueries: metrics.filter((m) => !m.success).length,
      successRate: metrics.filter((m) => m.success).length / metrics.length,
    };
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  /**
   * Update endpoint metrics for alert system
   */
  private updateEndpointMetrics(endpoint: string, duration: number): void {
    if (!this.config.enableAutoAlerts) return;

    // Calculate recent average response time
    const recentMetrics = this.metrics
      .filter((m) => m.type === 'endpoint' && m.metadata?.endpoint === endpoint)
      .slice(-10); // Last 10 requests

    if (recentMetrics.length > 0) {
      const avgResponseTime =
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      alertSystem.updateMetric('avg_response_time', avgResponseTime);
    }

    // Calculate error rate
    const recentErrors = recentMetrics.filter((m) => !m.success).length;
    const errorRate = recentMetrics.length > 0 ? recentErrors / recentMetrics.length : 0;
    alertSystem.updateMetric('error_rate', errorRate);
  }

  /**
   * Calculate AI provider error rate
   */
  private calculateAIErrorRate(provider: string): number {
    const recentMetrics = this.metrics
      .filter((m) => m.type === 'ai_provider' && m.metadata?.provider === provider)
      .slice(-20); // Last 20 calls

    if (recentMetrics.length === 0) return 0;

    const errors = recentMetrics.filter((m) => !m.success).length;
    return errors / recentMetrics.length;
  }

  /**
   * Cleanup old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionHours * 60 * 60 * 1000;
    const before = this.metrics.length;

    this.metrics = this.metrics.filter((m) => m.timestamp.getTime() > cutoff);

    const removed = before - this.metrics.length;
    if (removed > 0) {
      logger.info('Cleaned up old performance metrics', {
        provider: 'PerformanceMonitor',
        removed,
        remaining: this.metrics.length,
      });
    }
  }

  /**
   * Get configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Performance monitoring configuration updated', {
      provider: 'PerformanceMonitor',
      config: this.config,
    });
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    const before = this.metrics.length;
    this.metrics = [];
    this.startTime = new Date();

    logger.info('Performance metrics reset', {
      provider: 'PerformanceMonitor',
      metricsCleared: before,
    });
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Middleware-style wrapper for tracking endpoint performance
 */
export function withPerformanceTracking<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = performanceMonitor.startTimer();

  return fn()
    .then((result) => {
      const duration = timer();
      performanceMonitor.trackEndpoint(endpoint, method, duration, true);
      return result;
    })
    .catch((error) => {
      const duration = timer();
      performanceMonitor.trackEndpoint(endpoint, method, duration, false, {
        error: error.message,
      });
      throw error;
    });
}

/**
 * Wrapper for tracking AI provider calls
 */
export async function withAITracking<T>(
  provider: string,
  model: string,
  fn: () => Promise<T & { usage?: { totalTokens?: number } }>
): Promise<T> {
  const timer = performanceMonitor.startTimer();

  try {
    const result = await fn();
    const duration = timer();
    const tokens = result.usage?.totalTokens;

    performanceMonitor.trackAIProvider(provider, model, duration, true, tokens);
    return result;
  } catch (error: any) {
    const duration = timer();
    performanceMonitor.trackAIProvider(provider, model, duration, false, undefined, {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Wrapper for tracking database queries
 */
export async function withDatabaseTracking<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = performanceMonitor.startTimer();

  try {
    const result = await fn();
    const duration = timer();
    performanceMonitor.trackDatabaseQuery(operation, duration, true);
    return result;
  } catch (error: any) {
    const duration = timer();
    performanceMonitor.trackDatabaseQuery(operation, duration, false, {
      error: error.message,
    });
    throw error;
  }
}
