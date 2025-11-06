import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { ItemsService } from '@/services/database/items';

const FALLBACK_USER_ID = process.env.NODE_ENV === 'production' ? null : 'test-user';

async function resolveUserId() {
  if (FALLBACK_USER_ID) {
    return FALLBACK_USER_ID;
  }

  const { userId } = await auth();
  return userId ?? null;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const userId = await resolveUserId();

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
  const userId = await resolveUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await context.params;

  try {
    await ItemsService.deleteItem(itemId, userId);
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
