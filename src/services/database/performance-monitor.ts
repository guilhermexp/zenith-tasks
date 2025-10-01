/**
 * Database performance monitoring service
 */

import { createClient } from '@supabase/supabase-js'

import { logger } from '@/utils/logger'

export interface QueryPerformanceMetric {
  query: string
  duration: number
  timestamp: Date
  success: boolean
  error?: string
  rowCount?: number
  userId?: string
}

export interface DatabaseHealthMetrics {
  connectionPool: {
    active: number
    idle: number
    waiting: number
  }
  queryPerformance: {
    averageResponseTime: number
    slowQueries: QueryPerformanceMetric[]
    errorRate: number
    totalQueries: number
  }
  indexUsage: {
    unusedIndexes: string[]
    missingIndexes: string[]
    recommendations: string[]
  }
  tableStats: {
    tableName: string
    rowCount: number
    size: string
    lastVacuum?: Date
    lastAnalyze?: Date
  }[]
}

export class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor
  private supabase: any
  private metrics: QueryPerformanceMetric[] = []
  private maxMetrics = 10000
  private slowQueryThreshold = 1000 // 1 second

  private constructor() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
  }

  static getInstance(): DatabasePerformanceMonitor {
    if (!DatabasePerformanceMonitor.instance) {
      DatabasePerformanceMonitor.instance = new DatabasePerformanceMonitor()
    }
    return DatabasePerformanceMonitor.instance
  }

  /**
   * Track query performance
   */
  trackQuery(
    query: string,
    duration: number,
    success: boolean,
    error?: string,
    rowCount?: number,
    userId?: string
  ) {
    const metric: QueryPerformanceMetric = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      success,
      error,
      rowCount,
      userId
    }

    this.metrics.push(metric)

    // Keep metrics within limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2)
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('[DB Performance] Slow query detected', {
        query: metric.query,
        duration,
        userId
      })
    }

    // Log errors
    if (!success && error) {
      logger.error('[DB Performance] Query error', new Error(error), {
        query: metric.query,
        userId
      })
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<DatabaseHealthMetrics> {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    // Filter recent metrics
    const recentMetrics = this.metrics.filter(
      m => m.timestamp.getTime() > oneHourAgo
    )

    // Calculate query performance
    const totalQueries = recentMetrics.length
    const successfulQueries = recentMetrics.filter(m => m.success)
    const errorRate = totalQueries > 0 ? (totalQueries - successfulQueries.length) / totalQueries : 0
    
    const averageResponseTime = successfulQueries.length > 0
      ? successfulQueries.reduce((sum, m) => sum + m.duration, 0) / successfulQueries.length
      : 0

    const slowQueries = recentMetrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)

    // Get table statistics
    const tableStats = await this.getTableStatistics()

    // Get index recommendations
    const indexUsage = await this.analyzeIndexUsage()

    return {
      connectionPool: {
        active: 0, // Would need to implement connection pool monitoring
        idle: 0,
        waiting: 0
      },
      queryPerformance: {
        averageResponseTime,
        slowQueries,
        errorRate,
        totalQueries
      },
      indexUsage,
      tableStats
    }
  }

  /**
   * Get table statistics
   */
  private async getTableStatistics(): Promise<DatabaseHealthMetrics['tableStats']> {
    if (!this.supabase) return []

    try {
      // Get table sizes and row counts
      const { data: tables, error } = await this.supabase
        .rpc('get_table_stats')

      if (error) {
        logger.error('[DB Performance] Error getting table stats', error)
        return []
      }

      return tables || []
    } catch (error: any) {
      logger.error('[DB Performance] Error in getTableStatistics', error)
      return []
    }
  }

  /**
   * Analyze index usage and provide recommendations
   */
  private async analyzeIndexUsage(): Promise<DatabaseHealthMetrics['indexUsage']> {
    if (!this.supabase) {
      return {
        unusedIndexes: [],
        missingIndexes: [],
        recommendations: ['Database connection not available for index analysis']
      }
    }

    try {
      // This would require custom SQL functions to analyze index usage
      // For now, provide basic recommendations based on common patterns
      const recommendations = await this.generateIndexRecommendations()

      return {
        unusedIndexes: [], // Would need pg_stat_user_indexes
        missingIndexes: [], // Would need query analysis
        recommendations
      }
    } catch (error: any) {
      logger.error('[DB Performance] Error analyzing indexes', error)
      return {
        unusedIndexes: [],
        missingIndexes: [],
        recommendations: ['Error analyzing indexes']
      }
    }
  }

  /**
   * Generate index recommendations based on query patterns
   */
  private async generateIndexRecommendations(): Promise<string[]> {
    const recommendations: string[] = []

    // Analyze query patterns from metrics
    const queryPatterns = this.analyzeQueryPatterns()

    // Common recommendations based on the schema
    if (queryPatterns.hasUserFiltering) {
      recommendations.push('Consider composite index on (user_id, created_at) for better user-specific queries')
    }

    if (queryPatterns.hasDateRangeQueries) {
      recommendations.push('Consider index on due_date_iso for date range queries')
    }

    if (queryPatterns.hasTextSearch) {
      recommendations.push('Consider GIN index on title and summary for full-text search')
    }

    if (queryPatterns.hasTypeFiltering) {
      recommendations.push('Consider index on item_type for type-based filtering')
    }

    return recommendations
  }

  /**
   * Analyze query patterns from metrics
   */
  private analyzeQueryPatterns(): {
    hasUserFiltering: boolean
    hasDateRangeQueries: boolean
    hasTextSearch: boolean
    hasTypeFiltering: boolean
  } {
    const patterns = {
      hasUserFiltering: false,
      hasDateRangeQueries: false,
      hasTextSearch: false,
      hasTypeFiltering: false
    }

    for (const metric of this.metrics.slice(-1000)) { // Last 1000 queries
      const query = metric.query.toLowerCase()

      if (query.includes('user_id')) {
        patterns.hasUserFiltering = true
      }

      if (query.includes('due_date') || query.includes('created_at')) {
        patterns.hasDateRangeQueries = true
      }

      if (query.includes('ilike') || query.includes('like') || query.includes('title')) {
        patterns.hasTextSearch = true
      }

      if (query.includes('item_type') || query.includes('type')) {
        patterns.hasTypeFiltering = true
      }
    }

    return patterns
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data
    return query
      .replace(/('[^']*')/g, "'***'") // Replace string literals
      .replace(/(\$\d+)/g, '$***') // Replace parameters
      .substring(0, 500) // Limit length
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(limit = 20): QueryPerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Get error queries report
   */
  getErrorQueriesReport(limit = 20): QueryPerformanceMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get query frequency analysis
   */
  getQueryFrequencyAnalysis(): Record<string, {
    count: number
    avgDuration: number
    errorRate: number
  }> {
    const analysis: Record<string, any> = {}

    for (const metric of this.metrics) {
      const queryType = this.extractQueryType(metric.query)
      
      if (!analysis[queryType]) {
        analysis[queryType] = {
          count: 0,
          totalDuration: 0,
          errors: 0
        }
      }

      analysis[queryType].count++
      analysis[queryType].totalDuration += metric.duration
      if (!metric.success) {
        analysis[queryType].errors++
      }
    }

    // Calculate averages and rates
    for (const [queryType, stats] of Object.entries(analysis)) {
      stats.avgDuration = stats.totalDuration / stats.count
      stats.errorRate = stats.errors / stats.count
      delete stats.totalDuration
      delete stats.errors
    }

    return analysis
  }

  /**
   * Extract query type from SQL
   */
  private extractQueryType(query: string): string {
    const normalized = query.toLowerCase().trim()
    
    if (normalized.startsWith('select')) return 'SELECT'
    if (normalized.startsWith('insert')) return 'INSERT'
    if (normalized.startsWith('update')) return 'UPDATE'
    if (normalized.startsWith('delete')) return 'DELETE'
    if (normalized.startsWith('with')) return 'CTE'
    
    return 'OTHER'
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours = 24) {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000
    this.metrics = this.metrics.filter(
      m => m.timestamp.getTime() > cutoff
    )

    logger.info('[DB Performance] Cleared old metrics', {
      remaining: this.metrics.length
    })
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): QueryPerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalQueries: number
    averageResponseTime: number
    slowQueryCount: number
    errorRate: number
    topSlowQueries: string[]
  } {
    const totalQueries = this.metrics.length
    const successfulQueries = this.metrics.filter(m => m.success)
    
    const averageResponseTime = successfulQueries.length > 0
      ? successfulQueries.reduce((sum, m) => sum + m.duration, 0) / successfulQueries.length
      : 0

    const slowQueryCount = this.metrics.filter(m => m.duration > this.slowQueryThreshold).length
    const errorRate = totalQueries > 0 ? (totalQueries - successfulQueries.length) / totalQueries : 0

    const topSlowQueries = this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(m => m.query)

    return {
      totalQueries,
      averageResponseTime,
      slowQueryCount,
      errorRate,
      topSlowQueries
    }
  }
}

// Export singleton instance
export const dbPerformanceMonitor = DatabasePerformanceMonitor.getInstance()

// Helper function to wrap database operations with monitoring
export function withPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  queryDescription: string,
  userId?: string
): Promise<T> {
  const startTime = Date.now()

  return operation()
    .then(result => {
      const duration = Date.now() - startTime
      dbPerformanceMonitor.trackQuery(queryDescription, duration, true, undefined, undefined, userId)
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      dbPerformanceMonitor.trackQuery(queryDescription, duration, false, error.message, undefined, userId)
      throw error
    })
}