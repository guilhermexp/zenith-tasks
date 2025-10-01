import { NextResponse } from 'next/server';

import { CreditSystem } from '@/services/credits/credit-system';

export async function POST(req: Request) {
  try {
    const { userId, amount, type = 'purchase', description, metadata } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'userId and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    const creditSystem = CreditSystem.getInstance();

    const result = await creditSystem.addCredits(
      userId,
      amount,
      type as 'purchase' | 'bonus' | 'refund',
      description || `Adição de ${amount} créditos`,
      metadata
    );

    return NextResponse.json({
      success: result.success,
      balance: result.newBalance,
      amount
    });
  } catch (error: any) {
    console.error('[Credits] Error adding credits:', error);
    return NextResponse.json(
      { error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}