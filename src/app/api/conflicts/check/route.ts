import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { conflictDetector } from '@/services/ai/conflictDetector';
import { ItemsService } from '@/services/database/items';
import { logger } from '@/utils/logger';
import type { MindFlowItem } from '@/types';
import type { DetectedConflict } from '@/types/ai-prioritization';

/**
 * Request body schema for conflict check
 */
const ConflictCheckRequestSchema = z.object({
  newItem: z
    .object({
      title: z.string(),
      type: z.string(),
      dueDateISO: z.string().optional(),
      dueDate: z.string().optional(),
      meetingDetails: z
        .object({
          date: z.string().optional(),
          time: z.string().optional(),
        })
        .optional(),
      subtasks: z.array(z.any()).optional(),
    })
    .optional(),
  timeframe: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

/**
 * POST /api/conflicts/check
 * Check for scheduling and workload conflicts
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get user ID
    const userId = 'test-user'; // TODO: Get from auth session

    // Parse and validate request body
    const body = await request.json();

    logger.info('Conflict check request received', {
      provider: 'ConflictsAPI',
      userId,
      hasNewItem: !!body.newItem,
    });

    // Validate request
    let validatedRequest;
    try {
      validatedRequest = ConflictCheckRequestSchema.parse(body);
    } catch (validationError: any) {
      logger.warn('Invalid request body', {
        provider: 'ConflictsAPI',
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

    // Fetch existing tasks
    logger.info('Fetching existing tasks', {
      provider: 'ConflictsAPI',
      userId,
    });

    const existingTasks = await ItemsService.loadItems(userId);

    // Convert new item to MindFlowItem format if provided
    let newItem: MindFlowItem | undefined;
    if (validatedRequest.newItem) {
      newItem = {
        id: `temp-${Date.now()}`, // Temporary ID for new item
        title: validatedRequest.newItem.title,
        type: validatedRequest.newItem.type as any,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDateISO: validatedRequest.newItem.dueDateISO,
        dueDate: validatedRequest.newItem.dueDate,
        meetingDetails: validatedRequest.newItem.meetingDetails,
        subtasks: validatedRequest.newItem.subtasks,
      };
    }

    // Parse timeframe if provided
    let timeframe;
    if (validatedRequest.timeframe) {
      timeframe = {
        start: new Date(validatedRequest.timeframe.start),
        end: new Date(validatedRequest.timeframe.end),
      };
    }

    // Detect conflicts
    logger.info('Detecting conflicts', {
      provider: 'ConflictsAPI',
      userId,
      existingTaskCount: existingTasks.length,
      hasNewItem: !!newItem,
    });

    const conflicts = await conflictDetector.detectConflicts(
      {
        userId,
        newItem,
        timeframe,
      },
      existingTasks
    );

    const duration = Date.now() - startTime;

    logger.info('Conflict detection completed', {
      provider: 'ConflictsAPI',
      userId,
      conflictsFound: conflicts.length,
      duration,
    });

    // Check if response time is within acceptable range (< 1 second)
    if (duration > 1000) {
      logger.warn('Conflict detection took longer than expected', {
        provider: 'ConflictsAPI',
        userId,
        duration,
      });
    }

    // Categorize conflicts by severity
    const critical = conflicts.filter((c) => c.severity === 'critical');
    const warnings = conflicts.filter((c) => c.severity === 'warning');
    const info = conflicts.filter((c) => c.severity === 'info');

    return NextResponse.json(
      {
        success: true,
        data: {
          conflicts,
          summary: {
            total: conflicts.length,
            critical: critical.length,
            warnings: warnings.length,
            info: info.length,
          },
        },
        metadata: {
          processingTime: duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Conflict detection failed', error, {
      provider: 'ConflictsAPI',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Conflict detection failed',
        message: 'An unexpected error occurred during conflict detection',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conflicts/check
 * Get recent unresolved conflicts for the current user
 */
export async function GET() {
  try {
    const userId = 'test-user'; // TODO: Get from auth session

    logger.info('Fetching unresolved conflicts', {
      provider: 'ConflictsAPI',
      userId,
    });

    // Import conflict repository
    const { conflictRepository } = await import(
      '@/services/database/conflictRepository'
    );

    // Get unresolved conflicts
    const unresolvedConflicts =
      await conflictRepository.findUnresolvedByUserId(userId);

    // Get critical conflicts
    const criticalConflicts =
      await conflictRepository.findCriticalUnresolvedByUserId(userId);

    // Get stats
    const stats = await conflictRepository.getStatsByUserId(userId);

    logger.info('Unresolved conflicts fetched', {
      provider: 'ConflictsAPI',
      userId,
      total: unresolvedConflicts.length,
      critical: criticalConflicts.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          unresolvedConflicts,
          criticalConflicts,
          stats,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to fetch conflicts', error, {
      provider: 'ConflictsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch conflicts',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
