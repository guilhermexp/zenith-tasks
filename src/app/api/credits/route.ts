import { NextResponse } from 'next/server';

import { getCreditMonitor } from '@/server/ai/gateway/credit-monitor';

export async function GET(req: Request) {
  try {
    const monitor = getCreditMonitor();
    const status = await monitor.getCreditStatus();

    return NextResponse.json({
      balance: status.current.balance,
      totalUsed: status.current.total_used,
      lastUpdated: status.current.last_updated,
      alerts: status.alerts,
      projection: status.projection,
      recommendations: status.recommendations
    });
  } catch (error: any) {
    console.error('[API/credits] Error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to fetch credits'
    }, { status: 500 });
  }
}