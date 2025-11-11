import { NextRequest, NextResponse } from 'next/server';
import { aiCostMonitor } from '@/services/monitoring/aiCost';
import { logger } from '@/utils/logger';

/**
 * GET /api/monitoring/ai-cost
 * Get AI cost summaries and alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'day';
    const userId = searchParams.get('userId');

    let summary;

    if (userId) {
      // Get user-specific summary
      summary = aiCostMonitor.getUserCostSummary(userId, period);
    } else {
      // Get overall summary
      switch (period) {
        case 'week':
          summary = aiCostMonitor.getWeeklyCostSummary();
          break;
        case 'month':
          summary = aiCostMonitor.getMonthlyCostSummary();
          break;
        default:
          summary = aiCostMonitor.getDailyCostSummary();
      }
    }

    const alerts = aiCostMonitor.getRecentAlerts();
    const budget = aiCostMonitor.getBudget();

    logger.info('AI cost metrics retrieved', {
      provider: 'AICostAPI',
      period,
      userId,
      totalCost: typeof summary.totalCost === 'number' ? summary.totalCost.toFixed(4) : '0.0000',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          summary,
          alerts,
          budget,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to retrieve AI cost metrics', error, {
      provider: 'AICostAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve AI cost metrics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/monitoring/ai-cost
 * Update AI cost budget configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate budget updates
    if (body.daily !== undefined && body.daily < 0) {
      return NextResponse.json(
        { error: 'Daily budget must be positive' },
        { status: 400 }
      );
    }

    if (body.weekly !== undefined && body.weekly < 0) {
      return NextResponse.json(
        { error: 'Weekly budget must be positive' },
        { status: 400 }
      );
    }

    if (body.monthly !== undefined && body.monthly < 0) {
      return NextResponse.json(
        { error: 'Monthly budget must be positive' },
        { status: 400 }
      );
    }

    aiCostMonitor.updateBudget(body);

    logger.info('AI cost budget updated', {
      provider: 'AICostAPI',
      updates: body,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Budget updated successfully',
        budget: aiCostMonitor.getBudget(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to update AI cost budget', error, {
      provider: 'AICostAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to update budget',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
