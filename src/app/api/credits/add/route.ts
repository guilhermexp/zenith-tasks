import { NextResponse } from 'next/server'
import { z } from 'zod'

import { CreditSystem } from '@/services/credits/credit-system';
import { logger } from '@/utils/logger';

export async function POST(req: Request) {
  const logContext = { route: 'credits-add' } as const;
  try {
    const body = await req.json()
    const AddSchema = z.object({
      userId: z.string().min(1),
      amount: z.number().positive(),
      type: z.enum(['purchase', 'bonus', 'refund']).optional(),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
    const parsed = AddSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { userId, amount, type = 'purchase', description, metadata } = parsed.data

    // already validated by Zod

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
    logger.error('Credits API: error adding credits', error, logContext);
    return NextResponse.json(
      { error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}
