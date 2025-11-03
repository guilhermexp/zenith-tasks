import { NextResponse } from 'next/server';

import { CreditSystem } from '@/services/credits/credit-system';
import { logger } from '@/utils/logger';

export async function GET(req: Request) {
  const logContext = { route: 'credits-balance' } as const;
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'anonymous';

    const creditSystem = CreditSystem.getInstance();
    const balance = creditSystem.getBalance(userId);
    const stats = creditSystem.getUsageStats(userId);

    return NextResponse.json({
      balance,
      stats,
      success: true
    });
  } catch (error: any) {
    logger.error('Credits API: error getting balance', error, logContext);
    return NextResponse.json(
      { error: 'Failed to get credit balance' },
      { status: 500 }
    );
  }
}
