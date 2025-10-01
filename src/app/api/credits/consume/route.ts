import { NextResponse } from 'next/server';

import { CreditSystem } from '@/services/credits/credit-system';

export async function POST(req: Request) {
  try {
    const { userId, modelId, inputTokens, outputTokens, description, metadata } = await req.json();

    if (!userId || !modelId) {
      return NextResponse.json(
        { error: 'userId and modelId are required' },
        { status: 400 }
      );
    }

    const creditSystem = CreditSystem.getInstance();

    // Calcular custo
    const cost = creditSystem.calculateUsageCost(
      modelId,
      inputTokens || 0,
      outputTokens || 0
    );

    // Consumir créditos
    const result = await creditSystem.consumeCredits(
      userId,
      cost,
      description || `Uso do modelo ${modelId}`,
      {
        modelId,
        inputTokens,
        outputTokens,
        ...metadata
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          balance: result.newBalance,
          required: cost
        },
        { status: 402 } // Payment Required
      );
    }

    return NextResponse.json({
      success: true,
      cost,
      balance: result.newBalance
    });
  } catch (error: any) {
    console.error('[Credits] Error consuming credits:', error);
    return NextResponse.json(
      { error: 'Failed to consume credits' },
      { status: 500 }
    );
  }
}