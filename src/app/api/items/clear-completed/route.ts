import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { ItemsService } from '@/services/database/items';

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ItemsService.clearCompleted(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to clear completed items',
      },
      { status: 500 },
    );
  }
}
