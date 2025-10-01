import { NextResponse } from 'next/server';

import { CreditSystem } from '@/services/credits/credit-system';

export async function GET(req: Request) {
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
    console.error('[Credits] Error getting balance:', error);
    return NextResponse.json(
      { error: 'Failed to get credit balance' },
      { status: 500 }
    );
  }
}