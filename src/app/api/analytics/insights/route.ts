import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod';
import { analyticsEngine } from '@/services/analytics/analyticsEngine';
import { ItemsService } from '@/services/database/items';
import { logger } from '@/utils/logger';
import { analyticsCache } from '@/lib/cache/analyticsCache';
import { performanceMonitor } from '@/services/monitoring/performance';
import type { AnalyticsRequest, ProductivityInsights } from '@/types/ai-prioritization';

/**
 * GET /api/analytics/insights
 * Get productivity insights and analytics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const performanceTimer = performanceMonitor.startTimer();

  try {
    const FALLBACK_USER_ID = process.env.NODE_ENV === 'production' ? null : 'test-user'
    let userId: string | null = null
    try {
      const { userId: authUserId } = await auth()
      userId = authUserId ?? FALLBACK_USER_ID
    } catch {
      userId = FALLBACK_USER_ID
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const metricsParam = searchParams.get('metrics');

    // Validate period
    const periodSchema = z.enum(['week', 'month', 'quarter']);
    let validatedPeriod: 'week' | 'month' | 'quarter';

    try {
      validatedPeriod = periodSchema.parse(period);
    } catch (error) {
      logger.warn('Invalid period parameter', {
        provider: 'AnalyticsAPI',
        userId,
        period,
      });

      return NextResponse.json(
        {
          error: 'Invalid period',
          message: 'Period must be one of: week, month, quarter',
        },
        { status: 400 }
      );
    }

    // Parse metrics if provided
    const metrics = metricsParam ? metricsParam.split(',') : undefined;

    logger.info('Analytics request received', {
      provider: 'AnalyticsAPI',
      userId,
      period: validatedPeriod,
      metrics,
    });

    // Check cache first
    const cachedResult = analyticsCache.get(userId, validatedPeriod);
    if (cachedResult) {
      const duration = Date.now() - startTime;
      const cacheMetrics = analyticsCache.getMetrics();

      // Track performance (cache hit)
      performanceMonitor.trackEndpoint(
        '/api/analytics/insights',
        'GET',
        performanceTimer(),
        true,
        { cached: true, period: validatedPeriod }
      );

      return NextResponse.json(
        {
          success: true,
          data: cachedResult,
          metadata: {
            cached: true,
            processingTime: duration,
            timestamp: new Date().toISOString(),
            cacheHitRate: cacheMetrics.hitRate.toFixed(2),
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=3600',
            'X-Cache': 'HIT',
            'X-Cache-Hit-Rate': cacheMetrics.hitRate.toFixed(2),
          },
        }
      );
    }

    // Fetch user tasks
    logger.info('Fetching tasks for analytics', {
      provider: 'AnalyticsAPI',
      userId,
    });

    const tasks = await ItemsService.loadItems(userId);

    if (tasks.length === 0) {
      logger.warn('No tasks found for analytics', {
        provider: 'AnalyticsAPI',
        userId,
      });

      // Return empty insights
      const emptyInsights: ProductivityInsights = {
        mostProductiveHours: [],
        taskCompletionByType: {},
        procrastinationPatterns: [],
        improvementSuggestions: [
          'Comece adicionando algumas tarefas para gerar insights',
        ],
        productivityScore: 0,
        trend: 'stable',
      };

      return NextResponse.json(
        {
          success: true,
          data: emptyInsights,
          metadata: {
            cached: false,
            processingTime: Date.now() - startTime,
            taskCount: 0,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    // Prepare analytics request
    const analyticsRequest: AnalyticsRequest = {
      userId,
      period: validatedPeriod,
      metrics,
    };

    // Generate insights
    logger.info('Generating analytics insights', {
      provider: 'AnalyticsAPI',
      userId,
      period: validatedPeriod,
      taskCount: tasks.length,
    });

    const insights = await analyticsEngine.generateInsights(
      analyticsRequest,
      tasks
    );

    // Cache the results
    analyticsCache.set(userId, validatedPeriod, insights);

    const duration = Date.now() - startTime;
    const cacheMetrics = analyticsCache.getMetrics();

    logger.info('Analytics generated successfully', {
      provider: 'AnalyticsAPI',
      userId,
      duration,
      productivityScore: insights.productivityScore,
      trend: insights.trend,
    });

    // Check if response time is within acceptable range
    if (duration > 2000) {
      logger.warn('Analytics generation took longer than expected', {
        provider: 'AnalyticsAPI',
        userId,
        duration,
      });
    }

    // Track performance (cache miss)
    performanceMonitor.trackEndpoint(
      '/api/analytics/insights',
      'GET',
      performanceTimer(),
      true,
      { cached: false, period: validatedPeriod, taskCount: tasks.length }
    );

    return NextResponse.json(
      {
        success: true,
        data: insights,
        metadata: {
          cached: false,
          processingTime: duration,
          taskCount: tasks.length,
          timestamp: new Date().toISOString(),
          cacheHitRate: cacheMetrics.hitRate.toFixed(2),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=3600',
          'X-Cache': 'MISS',
          'X-Cache-Hit-Rate': cacheMetrics.hitRate.toFixed(2),
        },
      }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Track performance (error)
    performanceMonitor.trackEndpoint(
      '/api/analytics/insights',
      'GET',
      performanceTimer(),
      false,
      { error: error.message }
    );

    logger.error('Analytics generation failed', error, {
      provider: 'AnalyticsAPI',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Analytics generation failed',
        message: 'An unexpected error occurred while generating analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/insights
 * Invalidate analytics cache for current user
 */
export async function DELETE() {
  try {
    const FALLBACK_USER_ID = process.env.NODE_ENV === 'production' ? null : 'test-user'
    let userId: string | null = null
    try {
      const { userId: authUserId } = await auth()
      userId = authUserId ?? FALLBACK_USER_ID
    } catch {
      userId = FALLBACK_USER_ID
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keysCleared = analyticsCache.invalidate(userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Analytics cache cleared',
        keysCleared,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to clear analytics cache', error, {
      provider: 'AnalyticsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
