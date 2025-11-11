import { NextResponse } from 'next/server';
import { getAnalyticsCacheStats } from '@/lib/cache/analyticsCache';
import { logger } from '@/utils/logger';

/**
 * GET /api/analytics/cache-metrics
 * Get analytics cache metrics and statistics
 */
export async function GET() {
  try {
    const stats = getAnalyticsCacheStats();

    logger.info('Cache metrics retrieved', {
      provider: 'CacheMetricsAPI',
      hitRate: stats.metrics.hitRate.toFixed(2),
      size: stats.stats.size,
    });

    return NextResponse.json(
      {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to retrieve cache metrics', error, {
      provider: 'CacheMetricsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve cache metrics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
