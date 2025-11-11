import { NextRequest, NextResponse } from 'next/server';
import { patternAnalysisWorker } from '@/services/ai/patternAnalysisWorker';
import { logger } from '@/utils/logger';

/**
 * Verify cron secret to ensure only authorized requests
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'development-secret';

  // In development, allow requests without secret
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check Bearer token
  if (authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }

  return true;
}

/**
 * GET /api/cron/analyze-patterns
 * Cron endpoint for periodic pattern analysis
 * This endpoint should be called by Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      logger.warn('Unauthorized cron request', {
        provider: 'PatternAnalysisCron',
        ip: request.headers.get('x-forwarded-for'),
      });

      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing cron secret',
        },
        { status: 401 }
      );
    }

    logger.info('Pattern analysis cron job started', {
      provider: 'PatternAnalysisCron',
    });

    // Execute the worker
    const result = await patternAnalysisWorker.execute();

    const duration = Date.now() - startTime;

    logger.info('Pattern analysis cron job completed', {
      provider: 'PatternAnalysisCron',
      ...result,
      duration,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Pattern analysis completed',
        data: result,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Pattern analysis cron job failed', error, {
      provider: 'PatternAnalysisCron',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Pattern analysis failed',
        message: error.message,
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/analyze-patterns
 * Manual trigger for pattern analysis (with optional configuration)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization (same as GET)
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing cron secret',
        },
        { status: 401 }
      );
    }

    // Parse optional configuration
    let config = {};
    try {
      const body = await request.json();
      config = body.config || {};
    } catch {
      // No body or invalid JSON, use defaults
    }

    logger.info('Manual pattern analysis triggered', {
      provider: 'PatternAnalysisCron',
      config,
    });

    // Create a new worker instance with custom config
    const { PatternAnalysisWorker } = await import(
      '@/services/ai/patternAnalysisWorker'
    );
    const worker = new PatternAnalysisWorker(config);

    // Execute the worker
    const result = await worker.execute();

    const duration = Date.now() - startTime;

    logger.info('Manual pattern analysis completed', {
      provider: 'PatternAnalysisCron',
      ...result,
      duration,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Pattern analysis completed',
        data: result,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Manual pattern analysis failed', error, {
      provider: 'PatternAnalysisCron',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Pattern analysis failed',
        message: error.message,
        duration,
      },
      { status: 500 }
    );
  }
}
