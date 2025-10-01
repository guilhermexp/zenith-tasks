import { NextResponse } from 'next/server';

import { getCreditMonitor } from '@/server/ai/gateway/credit-monitor';
import { extractClientKey, rateLimit } from '@/server/rateLimit';

export async function GET(req: Request) {
  try {
    // Rate limiting
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const url = new URL(req.url);
    const history = url.searchParams.get('history') === 'true';
    const days = parseInt(url.searchParams.get('days') || '7');

    const monitor = getCreditMonitor();
    const status = await monitor.getCreditStatus();

    const response: any = {
      balance: status.current.balance,
      totalUsed: status.current.total_used,
      lastUpdated: status.current.last_updated,
      alerts: status.alerts,
      projection: status.projection,
      recommendations: status.recommendations
    };

    // Include usage history if requested
    if (history) {
      response.history = monitor.getUsageHistory(days).map(h => ({
        timestamp: h.timestamp.toISOString(),
        amount: h.amount
      }));
      response.exportData = monitor.exportUsageData();
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[API/credits] Error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to fetch credits'
    }, { status: 500 });
  }
}

// Update alert thresholds
export async function POST(req: Request) {
  try {
    // Rate limiting
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 10, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { warningThreshold, criticalThreshold, trackUsage } = body;

    const monitor = getCreditMonitor();

    // Update thresholds if provided
    if (warningThreshold && criticalThreshold) {
      monitor.setAlertThresholds(warningThreshold, criticalThreshold);
    }

    // Track manual usage if provided
    if (trackUsage && typeof trackUsage === 'number') {
      monitor.trackUsage(trackUsage);
    }

    // Return updated status
    const status = await monitor.getCreditStatus();

    return NextResponse.json({
      message: 'Settings updated',
      currentStatus: {
        balance: status.current.balance,
        alerts: status.alerts,
        projection: status.projection
      }
    });

  } catch (error: any) {
    console.error('[API/credits] Error updating settings:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to update credit settings'
    }, { status: 500 });
  }
}