import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { ItemsService } from '@/services/database/items';

export async function GET() {
  // Temporarily skip auth for testing
  const userId = 'test-user';

  try {
    const items = await ItemsService.loadItems(userId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load items',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // Temporarily skip auth for testing
  const userId = 'test-user';

  try {
    const payload = await request.json();
    const item = await ItemsService.createItem(userId, payload);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create item',
      },
      { status: 500 },
    );
  }
}
