/**
 * Integration Tests for /api/conflicts/check endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/services/ai/conflictDetector', () => ({
  conflictDetector: {
    detectConflicts: vi.fn().mockResolvedValue([
      {
        id: '1',
        userId: 'test-user',
        conflictType: 'scheduling',
        severity: 'critical',
        description: 'Conflict detected',
        conflictingItems: [],
        suggestions: [],
        isResolved: false,
        detectedAt: new Date(),
      },
    ]),
  },
}));

vi.mock('@/services/database/items', () => ({
  ItemsService: {
    loadItems: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('POST /api/conflicts/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check conflicts successfully', async () => {
    const request = new NextRequest('http://localhost/api/conflicts/check', {
      method: 'POST',
      body: JSON.stringify({
        newItem: {
          title: 'New Task',
          type: 'Tarefa',
          dueDateISO: new Date().toISOString(),
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('should handle empty request', async () => {
    const request = new NextRequest('http://localhost/api/conflicts/check', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBeGreaterThanOrEqual(200);
  });
});
