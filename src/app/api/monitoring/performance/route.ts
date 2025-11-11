import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/services/monitoring/performance';
import { logger } from '@/utils/logger';

/**
 * GET /api/monitoring/performance
 * Get performance metrics and statistics
 */
export async function GET() {
  try {
    const summary = performanceMonitor.getPerformanceSummary();

    logger.info('Performance metrics retrieved', {
      provider: 'PerformanceAPI',
      totalRequests: summary.overallStats.totalRequests,
      avgResponseTime: summary.overallStats.avgResponseTime.toFixed(2),
      errorRate: (summary.overallStats.errorRate * 100).toFixed(2) + '%',
    });

    return NextResponse.json(
      {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to retrieve performance metrics', error, {
      provider: 'PerformanceAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve performance metrics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/performance
 * Reset performance metrics
 */
export async function DELETE() {
  try {
    performanceMonitor.resetMetrics();

    logger.info('Performance metrics reset', {
      provider: 'PerformanceAPI',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Performance metrics reset successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to reset performance metrics', error, {
      provider: 'PerformanceAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to reset performance metrics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
