import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { ItemsService } from '@/services/database/items';

export async function POST(_request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemId } = await context.params;
    await ItemsService.toggleItem(itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to toggle item',
      },
      { status: 500 },
    );
  }
}
