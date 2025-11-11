import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prioritizationEngine } from '@/services/ai/prioritizationEngine';
import { ItemsService } from '@/services/database/items';
import { logger } from '@/utils/logger';
import {
  PrioritizationRequestSchema,
  PrioritizationRequest,
} from '@/types/ai-prioritization';

/**
 * Rate limiting store (in-memory for simplicity)
 * In production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit
 */
function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const limit = 10; // 10 requests
  const windowMs = 60 * 60 * 1000; // per hour

  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // New window
    const resetAt = now + windowMs;
    rateLimitStore.set(userId, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (userLimit.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetAt: userLimit.resetAt };
  }

  // Increment count
  userLimit.count += 1;
  rateLimitStore.set(userId, userLimit);

  return {
    allowed: true,
    remaining: limit - userLimit.count,
    resetAt: userLimit.resetAt,
  };
}

/**
 * POST /api/ai/prioritize
 * Prioritize tasks using AI-powered analysis
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get user ID (currently using test-user, will be replaced with actual auth)
    const userId = 'test-user'; // TODO: Get from auth session

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(
        (rateLimit.resetAt - Date.now()) / 1000
      );

      logger.warn('Rate limit exceeded', {
        provider: 'PrioritizeAPI',
        userId,
        retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();

    logger.info('Prioritization request received', {
      provider: 'PrioritizeAPI',
      userId,
      hasPreferences: !!body.preferences,
    });

    // Validate request using Zod schema
    let validatedRequest: PrioritizationRequest;
    try {
      validatedRequest = PrioritizationRequestSchema.parse(body);
    } catch (validationError: any) {
      logger.warn('Invalid request body', {
        provider: 'PrioritizeAPI',
        userId,
        error: validationError.message,
      });

      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid request body',
          details: validationError.errors || validationError.message,
        },
        { status: 400 }
      );
    }

    // If tasks not provided in body, fetch from database
    let tasks = validatedRequest.tasks;
    if (!tasks || tasks.length === 0) {
      logger.info('Fetching tasks from database', {
        provider: 'PrioritizeAPI',
        userId,
      });

      const userTasks = await ItemsService.loadItems(userId);

      // Filter only incomplete tasks
      tasks = userTasks.filter((task) => !task.completed);

      if (tasks.length === 0) {
        return NextResponse.json(
          {
            error: 'No tasks to prioritize',
            message: 'No incomplete tasks found for this user',
          },
          { status: 400 }
        );
      }
    }

    // Prepare prioritization request
    const prioritizationRequest: PrioritizationRequest = {
      tasks,
      availableTime: validatedRequest.availableTime,
      preferences: validatedRequest.preferences,
    };

    // Call PrioritizationEngine
    logger.info('Calling PrioritizationEngine', {
      provider: 'PrioritizeAPI',
      userId,
      taskCount: tasks.length,
    });

    const result = await prioritizationEngine.prioritize(prioritizationRequest);

    const duration = Date.now() - startTime;

    logger.info('Prioritization completed', {
      provider: 'PrioritizeAPI',
      userId,
      taskCount: result.prioritizedTasks.length,
      duration,
      confidenceScore: result.confidenceScore,
    });

    // Check if response time is within acceptable range
    if (duration > 3000) {
      logger.warn('Prioritization took longer than expected', {
        provider: 'PrioritizeAPI',
        userId,
        duration,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
        metadata: {
          processingTime: duration,
          taskCount: result.prioritizedTasks.length,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
        },
      }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Prioritization failed', error, {
      provider: 'PrioritizeAPI',
      duration,
    });

    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred during prioritization';

    if (error.message?.includes('AI generation failed')) {
      statusCode = 503;
      errorMessage = 'AI service temporarily unavailable';
    } else if (error.message?.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timeout';
    }

    return NextResponse.json(
      {
        error: 'Prioritization failed',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/ai/prioritize
 * Get information about the prioritization endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ai/prioritize',
    method: 'POST',
    description: 'AI-powered task prioritization',
    rateLimit: '10 requests per hour',
    requestBody: {
      tasks: 'array (optional - will fetch from database if not provided)',
      availableTime: 'number (optional - in minutes)',
      preferences: 'object (optional - user preferences)',
    },
    response: {
      success: 'boolean',
      data: {
        prioritizedTasks: 'array of prioritized tasks with scores and reasoning',
        justification: 'overall prioritization strategy',
        confidenceScore: 'confidence in the prioritization (0-1)',
      },
      metadata: {
        processingTime: 'time taken in milliseconds',
        taskCount: 'number of tasks prioritized',
        timestamp: 'ISO timestamp',
      },
    },
  });
}
