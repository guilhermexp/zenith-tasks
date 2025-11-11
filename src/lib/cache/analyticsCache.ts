/**
 * Analytics Cache Module
 * Provides caching functionality for analytics data with metrics and automatic invalidation
 */

import { logger } from '@/utils/logger';
import type { ProductivityInsights } from '@/types/ai-prioritization';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

/**
 * Cache metrics for monitoring
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  evictions: number;
  totalEntries: number;
  hitRate: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  enableMetrics: boolean;
}

/**
 * Analytics Cache Class
 * In-memory cache with TTL, metrics, and size limits
 */
export class AnalyticsCache {
  private cache: Map<string, CacheEntry<ProductivityInsights>>;
  private config: CacheConfig;
  private metrics: CacheMetrics;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      ttl: config.ttl || 60 * 60 * 1000, // Default: 1 hour
      maxSize: config.maxSize || 1000, // Default: 1000 entries
      enableMetrics: config.enableMetrics !== false,
    };
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      evictions: 0,
      totalEntries: 0,
      hitRate: 0,
    };

    logger.info('Analytics cache initialized', {
      provider: 'AnalyticsCache',
      config: this.config,
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(userId: string, period: string): string {
    return `analytics:${userId}:${period}`;
  }

  /**
   * Get cached analytics if available and not expired
   */
  get(userId: string, period: string): ProductivityInsights | null {
    const cacheKey = this.getCacheKey(userId, period);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.recordMiss(userId, period);
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > this.config.ttl) {
      logger.info('Cache entry expired', {
        provider: 'AnalyticsCache',
        userId,
        period,
        age: Math.floor(age / 1000),
        ttl: Math.floor(this.config.ttl / 1000),
      });

      this.cache.delete(cacheKey);
      this.metrics.evictions++;
      this.recordMiss(userId, period);
      return null;
    }

    // Cache hit
    entry.hits++;
    this.recordHit(userId, period, age);

    return entry.data;
  }

  /**
   * Set analytics in cache
   */
  set(userId: string, period: string, data: ProductivityInsights): void {
    const cacheKey = this.getCacheKey(userId, period);

    // Check if cache is full
    if (this.cache.size >= this.config.maxSize && !this.cache.has(cacheKey)) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });

    this.metrics.sets++;
    this.metrics.totalEntries = this.cache.size;

    logger.info('Analytics cached', {
      provider: 'AnalyticsCache',
      userId,
      period,
      cacheSize: this.cache.size,
    });
  }

  /**
   * Invalidate cache for a specific user and period
   */
  invalidate(userId: string, period?: string): number {
    let keysCleared = 0;

    if (period) {
      // Invalidate specific period
      const cacheKey = this.getCacheKey(userId, period);
      if (this.cache.delete(cacheKey)) {
        keysCleared = 1;
      }
    } else {
      // Invalidate all periods for user
      const prefix = `analytics:${userId}:`;
      const keys = Array.from(this.cache.keys()).filter((key) =>
        key.startsWith(prefix)
      );
      keys.forEach((key) => {
        this.cache.delete(key);
        keysCleared++;
      });
    }

    this.metrics.invalidations += keysCleared;
    this.metrics.totalEntries = this.cache.size;

    logger.info('Analytics cache invalidated', {
      provider: 'AnalyticsCache',
      userId,
      period: period || 'all',
      keysCleared,
      remainingEntries: this.cache.size,
    });

    return keysCleared;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.metrics.totalEntries = 0;

    logger.info('Analytics cache cleared', {
      provider: 'AnalyticsCache',
      entriesCleared: size,
    });
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    // Calculate hit rate
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate =
      total > 0 ? (this.metrics.hits / total) * 100 : 0;
    this.metrics.totalEntries = this.cache.size;

    return { ...this.metrics };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      evictions: 0,
      totalEntries: this.cache.size,
      hitRate: 0,
    };

    logger.info('Analytics cache metrics reset', {
      provider: 'AnalyticsCache',
    });
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilizationPercentage: number;
    oldestEntryAge: number | null;
    averageHitsPerEntry: number;
  } {
    let oldestTimestamp: number | null = null;
    let totalHits = 0;

    this.cache.forEach((entry) => {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      totalHits += entry.hits;
    });

    const now = Date.now();
    const oldestAge =
      oldestTimestamp !== null
        ? Math.floor((now - oldestTimestamp) / 1000)
        : null;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      utilizationPercentage: (this.cache.size / this.config.maxSize) * 100,
      oldestEntryAge: oldestAge,
      averageHitsPerEntry:
        this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;

      logger.info('Cache entry evicted (cache full)', {
        provider: 'AnalyticsCache',
        evictedKey: oldestKey,
        age: Math.floor((Date.now() - oldestTimestamp) / 1000),
      });
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(userId: string, period: string, age: number): void {
    this.metrics.hits++;
    this.metrics.hitRate =
      this.metrics.hits / (this.metrics.hits + this.metrics.misses);

    if (this.config.enableMetrics) {
      logger.info('Cache hit', {
        provider: 'AnalyticsCache',
        userId,
        period,
        age: Math.floor(age / 1000),
        hitRate: this.metrics.hitRate.toFixed(2),
      });
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(userId: string, period: string): void {
    this.metrics.misses++;

    if (this.config.enableMetrics) {
      logger.info('Cache miss', {
        provider: 'AnalyticsCache',
        userId,
        period,
        totalMisses: this.metrics.misses,
      });
    }
  }
}

/**
 * Global analytics cache instance
 * Configured with 1 hour TTL and max 1000 entries
 */
export const analyticsCache = new AnalyticsCache({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 1000,
  enableMetrics: true,
});

/**
 * Utility function to invalidate analytics cache on task completion
 * Should be called whenever a task is completed, updated, or deleted
 */
export function invalidateAnalyticsCacheOnTaskChange(userId: string): void {
  analyticsCache.invalidate(userId);
  logger.info('Analytics cache invalidated due to task change', {
    provider: 'AnalyticsCache',
    userId,
  });
}

/**
 * Export cache metrics for monitoring endpoints
 */
export function getAnalyticsCacheMetrics(): CacheMetrics {
  return analyticsCache.getMetrics();
}

/**
 * Export cache statistics for monitoring endpoints
 */
export function getAnalyticsCacheStats() {
  return {
    metrics: analyticsCache.getMetrics(),
    stats: analyticsCache.getStats(),
  };
}
