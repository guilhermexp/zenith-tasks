import { NextResponse } from 'next/server';

import { getCreditMonitor } from '@/server/ai/gateway/credit-monitor';
import { extractClientKey, rateLimit } from '@/server/rateLimit';
import { logger } from '@/utils/logger';

export async function GET(req: Request) {
  const logContext = { route: 'credits-get' } as const;
  try {
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const url = new URL(req.url);
    const historyRequested = url.searchParams.get('history') === 'true';
    const days = Math.max(1, parseInt(url.searchParams.get('days') || '7'));

    const monitor = getCreditMonitor();
    const status = await monitor.getCreditStatus();

    const projection = status.projection;
    const credits = {
      balance: status.current.balance,
      totalUsed: status.current.total_used,
      lastUpdated: status.current.last_updated,
      dailyUsageEstimate: projection.dailyRate,
      monthlyUsageEstimate: projection.monthlyRate,
      projectedDaysRemaining: Number.isFinite(projection.daysUntilEmpty)
        ? projection.daysUntilEmpty
        : null
    };

    const response: any = {
      success: true,
      credits,
      alerts: status.alerts,
      recommendations: status.recommendations
    };

    if (historyRequested) {
      response.history = monitor.getUsageHistory(days).map(entry => ({
        timestamp: entry.timestamp.toISOString(),
        amount: entry.amount
      }));
      response.exportData = monitor.exportUsageData();
    }

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Credits API: status fetch error', error, logContext);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch credits'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const logContext = { route: 'credits-post' } as const;
  try {
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 10, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { warningThreshold, criticalThreshold, trackUsage } = body ?? {};

    const monitor = getCreditMonitor();

    if (typeof warningThreshold === 'number' && typeof criticalThreshold === 'number') {
      monitor.setAlertThresholds(warningThreshold, criticalThreshold);
    }

    if (typeof trackUsage === 'number' && Number.isFinite(trackUsage) && trackUsage > 0) {
      monitor.trackUsage(trackUsage);
    }

    const status = await monitor.getCreditStatus();

    return NextResponse.json({
      success: true,
      currentStatus: {
        balance: status.current.balance,
        alerts: status.alerts,
        projection: status.projection
      }
    });
  } catch (error: any) {
    logger.error('Credits API: update settings error', error, logContext);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to update credit settings'
    }, { status: 500 });
  }
}
