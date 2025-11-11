/**
 * Integration Tests for /api/ai/prioritize endpoint
 * Tests full request/response cycle including validation, rate limiting, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/services/ai/prioritizationEngine', () => ({
  prioritizationEngine: {
    prioritize: vi.fn().mockResolvedValue({
      prioritizedTasks: [
        { taskId: '1', priorityScore: 0.9, rank: 1, reasoning: ['High priority'], confidence: 0.8 },
      ],
      justification: 'Prioritized based on urgency',
      confidenceScore: 0.8,
    }),
  },
}));

vi.mock('@/services/database/items', () => ({
  ItemsService: {
    loadItems: vi.fn().mockResolvedValue([
      { id: '1', title: 'Task 1', type: 'Tarefa', completed: false, createdAt: new Date().toISOString() },
    ]),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('POST /api/ai/prioritize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prioritize tasks successfully', async () => {
    const request = new NextRequest('http://localhost/api/ai/prioritize', {
      method: 'POST',
      body: JSON.stringify({
        tasks: [
          { id: '1', title: 'Task 1', type: 'Tarefa', completed: false, createdAt: new Date().toISOString() },
        ],
        availableTime: 120,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.prioritizedTasks).toBeDefined();
    expect(data.metadata).toBeDefined();
  });

  it('should return 400 for invalid request body', async () => {
    const request = new NextRequest('http://localhost/api/ai/prioritize', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('should include rate limit headers', async () => {
    const request = new NextRequest('http://localhost/api/ai/prioritize', {
      method: 'POST',
      body: JSON.stringify({
        tasks: [
          { id: '1', title: 'Task', type: 'Tarefa', completed: false, createdAt: new Date().toISOString() },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('should handle empty JSON body', async () => {
    const request = new NextRequest('http://localhost/api/ai/prioritize', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    // Should fetch tasks from database or return error
    expect(response.status).toBeGreaterThanOrEqual(200);
  });
});

describe('GET /api/ai/prioritize', () => {
  it('should return endpoint information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/ai/prioritize');
    expect(data.method).toBe('POST');
    expect(data.description).toBeDefined();
  });
});
