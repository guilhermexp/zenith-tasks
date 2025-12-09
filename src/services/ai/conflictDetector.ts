import { logger } from '@/utils/logger';
import type { MindFlowItem } from '@/types';
import {
  DetectedConflict,
  ConflictResolutionSuggestion,
} from '@/types/ai-prioritization';
import { conflictRepository } from '../database/conflictRepository';

/**
 * Conflict Detection Request
 */
export interface ConflictDetectionRequest {
  userId: string;
  newItem?: MindFlowItem;
  timeframe?: {
    start: Date;
    end: Date;
  };
}

/**
 * Calendar Item (Task or Meeting)
 */
interface CalendarItem {
  id: string;
  title: string;
  type: string;
  startTime?: Date;
  endTime?: Date;
  dueDate?: Date;
  complexity?: 'low' | 'medium' | 'high';
}

/**
 * Conflict Detector Service
 * Detects scheduling conflicts and workload issues in real-time
 */
export class ConflictDetector {
  /**
   * Main conflict detection method
   */
  async detectConflicts(
    request: ConflictDetectionRequest,
    existingTasks: MindFlowItem[]
  ): Promise<DetectedConflict[]> {
    try {
      logger.info('Starting conflict detection', {
        provider: 'ConflictDetector',
        userId: request.userId,
        hasNewItem: !!request.newItem,
      });

      const conflicts: DetectedConflict[] = [];

      // Convert tasks to calendar items
      const calendarItems = this.convertToCalendarItems(existingTasks);

      // Add new item if provided
      if (request.newItem) {
        calendarItems.push(this.convertToCalendarItem(request.newItem));
      }

      // Run conflict detections in parallel
      const [schedulingConflicts, overloadConflicts, deadlineConflicts] =
        await Promise.all([
          this.checkSchedulingConflicts(calendarItems),
          this.checkOverloadConflicts(calendarItems),
          this.checkDeadlineConflicts(calendarItems),
        ]);

      conflicts.push(
        ...schedulingConflicts,
        ...overloadConflicts,
        ...deadlineConflicts
      );

      logger.info('Conflict detection complete', {
        provider: 'ConflictDetector',
        userId: request.userId,
        totalConflicts: conflicts.length,
      });

      // Store conflicts in database
      await this.storeConflicts(request.userId, conflicts);

      return conflicts;
    } catch (error) {
      logger.error('Conflict detection failed', error, {
        provider: 'ConflictDetector',
        userId: request.userId,
      });
      throw new Error('Failed to detect conflicts');
    }
  }

  /**
   * Convert MindFlowItem to CalendarItem
   */
  private convertToCalendarItem(item: MindFlowItem): CalendarItem {
    const calendarItem: CalendarItem = {
      id: item.id || '',
      title: item.title,
      type: item.type,
    };

    // Add due date
    if (item.dueDateISO || item.dueDate) {
      calendarItem.dueDate = new Date(item.dueDateISO || item.dueDate!);
    }

    // Estimate complexity
    const subtaskCount = item.subtasks?.length || 0;
    if (subtaskCount > 5) {
      calendarItem.complexity = 'high';
    } else if (subtaskCount > 2) {
      calendarItem.complexity = 'medium';
    } else {
      calendarItem.complexity = 'low';
    }

    return calendarItem;
  }

  /**
   * Convert multiple tasks to calendar items
   */
  private convertToCalendarItems(tasks: MindFlowItem[]): CalendarItem[] {
    return tasks.map((task) => this.convertToCalendarItem(task));
  }

  /**
   * Check for scheduling conflicts (overlapping meetings/events)
   */
  async checkSchedulingConflicts(
    items: CalendarItem[]
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Filter items with time slots
    const timedItems = items.filter((item) => item.startTime && item.endTime);

    // Sort by start time
    timedItems.sort(
      (a, b) => a.startTime!.getTime() - b.startTime!.getTime()
    );

    // Check for overlaps
    for (let i = 0; i < timedItems.length - 1; i++) {
      for (let j = i + 1; j < timedItems.length; j++) {
        const item1 = timedItems[i];
        const item2 = timedItems[j];

        // Check if times overlap
        if (
          item1.endTime! > item2.startTime! &&
          item1.startTime! < item2.endTime!
        ) {
          const conflict: DetectedConflict = {
            id: crypto.randomUUID(),
            userId: 'test-user', // Will be replaced with actual userId
            conflictType: 'scheduling',
            severity: 'critical',
            description: `Conflito de horário detectado entre "${item1.title}" e "${item2.title}"`,
            conflictingItems: [item1, item2],
            suggestions: this.generateSchedulingSuggestions(item1, item2),
            isResolved: false,
            detectedAt: new Date(),
          };

          conflicts.push(conflict);
        }
      }
    }

    logger.info('Scheduling conflicts checked', {
      provider: 'ConflictDetector',
      count: conflicts.length,
    });

    return conflicts;
  }

  /**
   * Check for overload conflicts (too many complex tasks)
   */
  async checkOverloadConflicts(
    items: CalendarItem[]
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Group items by day
    const itemsByDay = new Map<string, CalendarItem[]>();

    items.forEach((item) => {
      const date = item.dueDate || item.startTime;
      if (!date) return;

      const dayKey = date.toISOString().split('T')[0];
      const existing = itemsByDay.get(dayKey) || [];
      itemsByDay.set(dayKey, [...existing, item]);
    });

    // Check each day for overload
    for (const [dayKey, dayItems] of itemsByDay) {
      const complexTasks = dayItems.filter(
        (item) => item.complexity === 'high'
      );
      const totalTasks = dayItems.length;

      // Overload criteria
      const isOverloaded =
        complexTasks.length > 3 || totalTasks > 8;

      if (isOverloaded) {
        const conflict: DetectedConflict = {
          id: crypto.randomUUID(),
          userId: 'test-user',
          conflictType: 'overload',
          severity: complexTasks.length > 4 ? 'critical' : 'warning',
          description: `Sobrecarga detectada em ${dayKey}: ${totalTasks} tarefas (${complexTasks.length} complexas)`,
          conflictingItems: dayItems,
          suggestions: this.generateOverloadSuggestions(dayItems),
          isResolved: false,
          detectedAt: new Date(),
        };

        conflicts.push(conflict);
      }
    }

    logger.info('Overload conflicts checked', {
      provider: 'ConflictDetector',
      count: conflicts.length,
    });

    return conflicts;
  }

  /**
   * Check for deadline conflicts (deadline vs schedule conflicts)
   */
  async checkDeadlineConflicts(
    items: CalendarItem[]
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Find tasks with approaching deadlines
    const now = new Date();
    const tasksWithDeadlines = items.filter((item) => item.dueDate);

    for (const task of tasksWithDeadlines) {
      const daysUntilDue =
        (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Check if deadline is soon but day is full of meetings
      if (daysUntilDue <= 2 && daysUntilDue > 0) {
        const dueDateKey = task.dueDate!.toISOString().split('T')[0];

        // Count meetings on that day
        const meetingsOnDueDate = items.filter((item) => {
          if (item.type !== 'Reunião') return false;
          if (!item.startTime) return false;
          const itemDate = item.startTime.toISOString().split('T')[0];
          return itemDate === dueDateKey;
        });

        if (meetingsOnDueDate.length >= 3) {
          const conflict: DetectedConflict = {
            id: crypto.randomUUID(),
            userId: 'test-user',
            conflictType: 'deadline',
            severity: 'warning',
            description: `Prazo de "${task.title}" coincide com dia cheio de reuniões (${meetingsOnDueDate.length} reuniões)`,
            conflictingItems: [task, ...meetingsOnDueDate],
            suggestions: this.generateDeadlineSuggestions(
              task,
              meetingsOnDueDate
            ),
            isResolved: false,
            detectedAt: new Date(),
          };

          conflicts.push(conflict);
        }
      }
    }

    logger.info('Deadline conflicts checked', {
      provider: 'ConflictDetector',
      count: conflicts.length,
    });

    return conflicts;
  }

  /**
   * Generate suggestions for scheduling conflicts
   */
  private generateSchedulingSuggestions(
    item1: CalendarItem,
    item2: CalendarItem
  ): ConflictResolutionSuggestion[] {
    const suggestions: ConflictResolutionSuggestion[] = [];

    // Suggest rescheduling the second item
    suggestions.push({
      action: 'reschedule',
      details: {
        itemId: item2.id,
        itemTitle: item2.title,
        suggestedTime: new Date(
          item1.endTime!.getTime() + 30 * 60 * 1000
        ).toISOString(),
      },
      impact: 'high',
    });

    // Suggest rescheduling the first item
    suggestions.push({
      action: 'reschedule',
      details: {
        itemId: item1.id,
        itemTitle: item1.title,
        suggestedTime: new Date(
          item2.endTime!.getTime() + 30 * 60 * 1000
        ).toISOString(),
      },
      impact: 'medium',
    });

    return suggestions;
  }

  /**
   * Generate suggestions for overload conflicts
   */
  private generateOverloadSuggestions(
    items: CalendarItem[]
  ): ConflictResolutionSuggestion[] {
    const suggestions: ConflictResolutionSuggestion[] = [];

    // Suggest delegating low priority tasks
    const delegatableTasks = items.filter(
      (item) => item.type === 'Tarefa' && item.complexity === 'low'
    );

    if (delegatableTasks.length > 0) {
      suggestions.push({
        action: 'delegate',
        details: {
          tasks: delegatableTasks.map((t) => ({
            id: t.id,
            title: t.title,
          })),
        },
        impact: 'high',
      });
    }

    // Suggest rescheduling non-urgent tasks
    const reschedulableTasks = items.filter((item) => {
      if (!item.dueDate) return false;
      const daysUntilDue =
        (item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilDue > 2;
    });

    if (reschedulableTasks.length > 0) {
      suggestions.push({
        action: 'reschedule',
        details: {
          tasks: reschedulableTasks.slice(0, 3).map((t) => ({
            id: t.id,
            title: t.title,
            suggestedDate: new Date(
              Date.now() + 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })),
        },
        impact: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions for deadline conflicts
   */
  private generateDeadlineSuggestions(
    task: CalendarItem,
    meetings: CalendarItem[]
  ): ConflictResolutionSuggestion[] {
    const suggestions: ConflictResolutionSuggestion[] = [];

    // Suggest extending deadline
    suggestions.push({
      action: 'extend',
      details: {
        taskId: task.id,
        taskTitle: task.title,
        suggestedNewDeadline: new Date(
          task.dueDate!.getTime() + 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        reason: 'Agenda cheia de reuniões no dia do prazo',
      },
      impact: 'medium',
    });

    // Suggest working on task before the deadline day
    suggestions.push({
      action: 'reschedule',
      details: {
        taskId: task.id,
        taskTitle: task.title,
        suggestedWorkDate: new Date(
          task.dueDate!.getTime() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
        reason: 'Completar antes do dia cheio de reuniões',
      },
      impact: 'high',
    });

    return suggestions;
  }

  /**
   * Store conflicts in database
   */
  private async storeConflicts(
    userId: string,
    conflicts: DetectedConflict[]
  ): Promise<void> {
    try {
      for (const conflict of conflicts) {
        await conflictRepository.create({
          userId,
          conflictType: conflict.conflictType,
          severity: conflict.severity,
          description: conflict.description,
          conflictingItems: conflict.conflictingItems,
          suggestions: conflict.suggestions,
        });
      }

      logger.info('Conflicts stored in database', {
        provider: 'ConflictDetector',
        count: conflicts.length,
      });
    } catch (error) {
      logger.error('Failed to store conflicts', error, {
        provider: 'ConflictDetector',
      });
      // Don't throw - storage failure shouldn't break detection
    }
  }
}

// Export singleton instance
export const conflictDetector = new ConflictDetector();
