import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { ItemsService } from '@/services/database/items';

export async function PATCH(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await context.params;

  try {
    const updates = await request.json();
    await ItemsService.updateItem(itemId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update item',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await context.params;

  try {
    await ItemsService.deleteItem(itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete item',
      },
      { status: 500 },
    );
  }
}
