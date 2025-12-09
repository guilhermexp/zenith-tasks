import { NextResponse } from 'next/server'
import { z } from 'zod'

import { CreditSystem } from '@/services/credits/credit-system';
import { logger } from '@/utils/logger';

export async function POST(req: Request) {
  const logContext = { route: 'credits-consume' } as const;
  try {
    const body = await req.json()
    const ConsumeSchema = z.object({
      userId: z.string().min(1),
      modelId: z.string().min(1),
      inputTokens: z.number().int().nonnegative().optional(),
      outputTokens: z.number().int().nonnegative().optional(),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    const parsed = ConsumeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { userId, modelId, inputTokens, outputTokens, description, metadata } = parsed.data

    // already validated by Zod

    const creditSystem = CreditSystem.getInstance();

    // Calcular custo
    const cost = creditSystem.calculateUsageCost(
      modelId,
      inputTokens || 0,
      outputTokens || 0
    )

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
    )

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
    logger.error('Credits API: error consuming credits', error, logContext);
    return NextResponse.json(
      { error: 'Failed to consume credits' },
      { status: 500 }
    );
  }
}
