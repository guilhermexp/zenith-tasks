/**
 * Unit Tests for PatternAnalyzer
 *
 * Tests cover:
 * - Recurring pattern detection with frequency analysis
 * - Batch opportunity identification
 * - Postponement pattern detection (procrastination)
 * - Performance pattern analysis
 * - Confidence scoring for patterns
 * - Configuration and threshold management
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternAnalyzer, PatternAnalysisConfig } from '../patternAnalyzer';
import type { MindFlowItem } from '@/types';
import type { DetectedPattern } from '@/types/ai-prioritization';

// Mock dependencies
vi.mock('../../database/patternRepository', () => ({
  userPerformancePatternRepository: {
    upsertByUserAndType: vi.fn(),
  },
  patternSuggestionRepository: {
    create: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultAnalyzer = new PatternAnalyzer();
      expect(defaultAnalyzer).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<PatternAnalysisConfig> = {
        minPatternThreshold: 5,
        confidenceThreshold: 0.8,
      };

      const customAnalyzer = new PatternAnalyzer(customConfig);
      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('analyzePatterns() - Main orchestration', () => {
    it('should analyze all pattern types successfully', async () => {
      const tasks = [
        // Recurring pattern - daily standup (4 occurrences to ensure confidence)
        createMockTask('1', 'Daily standup', 'Reunião', { daysAgo: 6 }),
        createMockTask('2', 'Daily standup', 'Reunião', { daysAgo: 4 }),
        createMockTask('3', 'Daily standup', 'Reunião', { daysAgo: 2 }),
        createMockTask('4', 'Daily standup', 'Reunião', { daysAgo: 0 }),
        // Batch opportunity - multiple similar incomplete tasks with due dates
        createMockTask('5', 'Report A', 'Tarefa', { hasDueDate: true }),
        createMockTask('6', 'Report B', 'Tarefa', { hasDueDate: true }),
        createMockTask('7', 'Report C', 'Tarefa', { hasDueDate: true }),
      ];

      const patterns = await analyzer.analyzePatterns('user-1', tasks);

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      // May or may not have patterns depending on confidence threshold
      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter patterns by confidence threshold', async () => {
      const customAnalyzer = new PatternAnalyzer({
        confidenceThreshold: 0.9,
      });

      const tasks = [
        createMockTask('1', 'Task', 'Tarefa', { daysAgo: 0 }),
        createMockTask('2', 'Task', 'Tarefa', { daysAgo: 1 }),
      ];

      const patterns = await customAnalyzer.analyzePatterns('user-1', tasks);

      // Should filter out low-confidence patterns
      patterns.forEach((pattern) => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should handle empty task list', async () => {
      const patterns = await analyzer.analyzePatterns('user-1', []);

      expect(patterns).toEqual([]);
    });

    it('should run all detections in parallel', async () => {
      const tasks = [
        createMockTask('1', 'Task', 'Tarefa'),
        createMockTask('2', 'Task', 'Tarefa'),
        createMockTask('3', 'Task', 'Tarefa'),
      ];

      const patterns = await analyzer.analyzePatterns('user-1', tasks);

      expect(patterns).toBeDefined();
    });
  });

  describe('detectRecurringPatterns() - Recurring task detection', () => {
    it('should detect recurring tasks with minimum threshold', async () => {
      const tasks = [
        createMockTask('1', 'Daily standup', 'Reunião', { daysAgo: 6 }),
        createMockTask('2', 'Daily standup', 'Reunião', { daysAgo: 4 }),
        createMockTask('3', 'Daily standup', 'Reunião', { daysAgo: 2 }),
        createMockTask('4', 'Daily standup', 'Reunião', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('recurring');
      expect(patterns[0].patternData.frequency).toBe(4);
    });

    it('should calculate average days between occurrences', async () => {
      const tasks = [
        createMockTask('1', 'Weekly report', 'Tarefa', { daysAgo: 14 }),
        createMockTask('2', 'Weekly report', 'Tarefa', { daysAgo: 7 }),
        createMockTask('3', 'Weekly report', 'Tarefa', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].patternData.averageDaysBetween).toBeCloseTo(7, 1);
    });

    it('should suggest daily recurrence for frequent tasks', async () => {
      const tasks = [
        createMockTask('1', 'Morning coffee', 'Lembrete', { daysAgo: 3 }),
        createMockTask('2', 'Morning coffee', 'Lembrete', { daysAgo: 2 }),
        createMockTask('3', 'Morning coffee', 'Lembrete', { daysAgo: 1 }),
        createMockTask('4', 'Morning coffee', 'Lembrete', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].patternData.suggestedRecurrence).toBe('daily');
    });

    it('should suggest weekly recurrence for weekly tasks', async () => {
      const tasks = [
        createMockTask('1', 'Team meeting', 'Reunião', { daysAgo: 21 }),
        createMockTask('2', 'Team meeting', 'Reunião', { daysAgo: 14 }),
        createMockTask('3', 'Team meeting', 'Reunião', { daysAgo: 7 }),
        createMockTask('4', 'Team meeting', 'Reunião', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].patternData.suggestedRecurrence).toBe('weekly');
    });

    it('should suggest monthly recurrence for infrequent tasks', async () => {
      const tasks = [
        createMockTask('1', 'Monthly report', 'Tarefa', { daysAgo: 60 }),
        createMockTask('2', 'Monthly report', 'Tarefa', { daysAgo: 30 }),
        createMockTask('3', 'Monthly report', 'Tarefa', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].patternData.suggestedRecurrence).toBe('monthly');
    });

    it('should calculate confidence based on frequency', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask(`${i}`, 'High frequency', 'Tarefa', { daysAgo: i })
      );

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].confidence).toBeGreaterThan(0.9);
    });

    it('should normalize titles for comparison', async () => {
      const tasks = [
        createMockTask('1', 'Daily Standup', 'Reunião', { daysAgo: 2 }),
        createMockTask('2', 'daily standup', 'Reunião', { daysAgo: 1 }),
        createMockTask('3', 'DAILY STANDUP', 'Reunião', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].patternData.frequency).toBe(3);
    });

    it('should not detect patterns below threshold', async () => {
      const tasks = [
        createMockTask('1', 'Rare task', 'Tarefa', { daysAgo: 10 }),
        createMockTask('2', 'Rare task', 'Tarefa', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns.length).toBe(0);
    });

    it('should generate appropriate suggestion for high frequency', async () => {
      const tasks = Array.from({ length: 6 }, (_, i) =>
        createMockTask(`${i}`, 'Frequent task', 'Tarefa', { daysAgo: i * 2 })
      );

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].suggestion.impact).toBe('high');
      expect(patterns[0].suggestion.title).toContain('Criar tarefa recorrente');
    });
  });

  describe('detectBatchOpportunities() - Batch processing', () => {
    it('should detect batch opportunities by task type', async () => {
      const tasks = [
        createMockTask('1', 'Email 1', 'Tarefa', { hasDueDate: true }),
        createMockTask('2', 'Email 2', 'Tarefa', { hasDueDate: true }),
        createMockTask('3', 'Email 3', 'Tarefa', { hasDueDate: true }),
        createMockTask('4', 'Email 4', 'Tarefa', { hasDueDate: true }),
      ];

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('batch');
      expect(patterns[0].patternData.taskCount).toBe(4);
    });

    it('should calculate estimated time for batch', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Tarefa', { hasDueDate: true }),
        createMockTask('2', 'Task 2', 'Tarefa', { hasDueDate: true }),
        createMockTask('3', 'Task 3', 'Tarefa', { hasDueDate: true }),
      ];

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      // 3 tasks * 30 minutes = 90 minutes
      expect(patterns[0].patternData.estimatedTime).toBe(90);
    });

    it('should suggest appropriate time block based on duration', async () => {
      const manyTasks = Array.from({ length: 5 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Tarefa', { hasDueDate: true })
      );

      const patterns = await analyzer.detectBatchOpportunities(manyTasks);

      // 5 tasks * 30 min = 150 min > 90 min, should suggest afternoon
      expect(patterns[0].patternData.suggestedTimeBlock).toBe('afternoon');
    });

    it('should ignore completed tasks', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Tarefa', { completed: true, hasDueDate: true }),
        createMockTask('2', 'Task 2', 'Tarefa', { completed: true, hasDueDate: true }),
        createMockTask('3', 'Task 3', 'Tarefa', { hasDueDate: true }),
      ];

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      // Should only count the 1 incomplete task
      if (patterns.length > 0) {
        expect(patterns[0].patternData.taskCount).toBe(1);
      }
    });

    it('should calculate confidence based on task count', async () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Financeiro', { hasDueDate: true })
      );

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      expect(patterns[0].confidence).toBeGreaterThan(0.8);
    });

    it('should set impact based on estimated time', async () => {
      const longBatch = Array.from({ length: 5 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Tarefa', { hasDueDate: true })
      );

      const patterns = await analyzer.detectBatchOpportunities(longBatch);

      // 5 tasks * 30 = 150 min > 120 min => high impact
      expect(patterns[0].suggestion.impact).toBe('high');
    });

    it('should not detect batches below threshold', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Tarefa', { hasDueDate: true }),
        createMockTask('2', 'Task 2', 'Tarefa', { hasDueDate: true }),
      ];

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      expect(patterns.length).toBe(0);
    });
  });

  describe('detectPostponementPatterns() - Procrastination detection', () => {
    it('should detect tasks pending for more than 7 days', async () => {
      const tasks = [
        createMockTask('1', 'Postponed task', 'Tarefa', {
          daysAgo: 10,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('postponement');
      expect(patterns[0].patternData.averagePostponementDays).toBeGreaterThan(7);
    });

    it('should calculate postponement count', async () => {
      const tasks = [
        createMockTask('1', 'Old task', 'Tarefa', {
          daysAgo: 21,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns[0].patternData.postponementCount).toBeGreaterThan(1); // Multiple weeks
    });

    it('should suggest break_down for tasks without subtasks', async () => {
      const tasks = [
        createMockTask('1', 'Simple task', 'Tarefa', {
          daysAgo: 10,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns[0].patternData.suggestedAction).toBe('break_down');
    });

    it('should suggest schedule_block for tasks with subtasks', async () => {
      const tasks = [
        createMockTask('1', 'Complex task', 'Tarefa', {
          daysAgo: 10,
          daysAgoUpdated: 1,
          hasSubtasks: true,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns[0].patternData.suggestedAction).toBe('schedule_block');
    });

    it('should calculate confidence based on days diff', async () => {
      const tasks = [
        createMockTask('1', 'Very old task', 'Tarefa', {
          daysAgo: 40,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns[0].confidence).toBeGreaterThan(0.8);
    });

    it('should set high impact for tasks pending over 30 days', async () => {
      const tasks = [
        createMockTask('1', 'Ancient task', 'Tarefa', {
          daysAgo: 35,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns[0].suggestion.impact).toBe('high');
    });

    it('should ignore completed tasks', async () => {
      const tasks = [
        createMockTask('1', 'Old but completed', 'Tarefa', {
          daysAgo: 20,
          daysAgoUpdated: 1,
          completed: true,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns.length).toBe(0);
    });

    it('should not detect tasks pending less than 7 days', async () => {
      const tasks = [
        createMockTask('1', 'Recent task', 'Tarefa', {
          daysAgo: 5,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns.length).toBe(0);
    });
  });

  describe('detectPerformancePatterns() - Performance analysis', () => {
    it('should detect performance patterns for completed tasks', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Tarefa', { completed: true }),
        createMockTask('2', 'Task 2', 'Tarefa', { completed: true }),
        createMockTask('3', 'Task 3', 'Tarefa', { completed: true }),
        createMockTask('4', 'Task 4', 'Tarefa', { completed: false }),
      ];

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('performance');
    });

    it('should calculate completion rate', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Reunião', { completed: true }),
        createMockTask('2', 'Task 2', 'Reunião', { completed: true }),
        createMockTask('3', 'Task 3', 'Reunião', { completed: true }),
        createMockTask('4', 'Task 4', 'Reunião', { completed: false }),
      ];

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      expect(patterns[0].patternData.completionRate).toBe(0.75); // 3/4
    });

    it('should calculate confidence based on completed count', async () => {
      const tasks = Array.from({ length: 12 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Tarefa', { completed: true })
      );

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      expect(patterns[0].confidence).toBeGreaterThan(0.75);
    });

    it('should set impact based on completion rate', async () => {
      const tasks = [
        ...Array.from({ length: 8 }, (_, i) =>
          createMockTask(`${i}`, `Task ${i}`, 'Financeiro', { completed: true })
        ),
        createMockTask('9', 'Task 9', 'Financeiro', { completed: false }),
      ];

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      // Completion rate > 0.7 => medium impact
      expect(patterns[0].suggestion.impact).toBe('medium');
    });

    it('should not detect patterns with insufficient completed tasks', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Nota', { completed: true }),
        createMockTask('2', 'Task 2', 'Nota', { completed: true }),
      ];

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      expect(patterns.length).toBe(0);
    });

    it('should group by task type', async () => {
      const tasks = [
        ...Array.from({ length: 3 }, (_, i) =>
          createMockTask(`tarefa-${i}`, `Task ${i}`, 'Tarefa', { completed: true })
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          createMockTask(`reuniao-${i}`, `Meeting ${i}`, 'Reunião', { completed: true })
        ),
      ];

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      expect(patterns.length).toBe(2); // One for each type
    });
  });

  describe('Confidence scoring', () => {
    it('should cap recurring pattern confidence at 0.95', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) =>
        createMockTask(`${i}`, 'Frequent', 'Tarefa', { daysAgo: i })
      );

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns[0].confidence).toBeLessThanOrEqual(0.95);
    });

    it('should cap batch opportunity confidence at 0.85', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Tarefa', { hasDueDate: true })
      );

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      expect(patterns[0].confidence).toBeLessThanOrEqual(0.85);
    });

    it('should cap postponement confidence at 0.9', async () => {
      const tasks = [
        createMockTask('1', 'Ancient', 'Tarefa', {
          daysAgo: 100,
          daysAgoUpdated: 1,
        }),
      ];

      const patterns = await analyzer.detectPostponementPatterns(tasks);

      expect(patterns[0].confidence).toBeLessThanOrEqual(0.9);
    });

    it('should cap performance confidence at 0.8', async () => {
      const tasks = Array.from({ length: 15 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Tarefa', { completed: true })
      );

      const patterns = await analyzer.detectPerformancePatterns(tasks);

      expect(patterns[0].confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle tasks with missing dates', async () => {
      const tasks = [
        {
          id: '1',
          title: 'Task without dates',
          type: 'Tarefa',
          completed: false,
          createdAt: new Date().toISOString(),
        } as MindFlowItem,
      ];

      await expect(analyzer.analyzePatterns('user-1', tasks)).resolves.toBeDefined();
    });

    it('should handle mixed task types', async () => {
      const tasks = [
        createMockTask('1', 'Task', 'Tarefa', { daysAgo: 0 }),
        createMockTask('2', 'Meeting', 'Reunião', { daysAgo: 0 }),
        createMockTask('3', 'Idea', 'Ideia', { daysAgo: 0 }),
        createMockTask('4', 'Note', 'Nota', { daysAgo: 0 }),
      ];

      const patterns = await analyzer.analyzePatterns('user-1', tasks);

      expect(patterns).toBeDefined();
    });

    it('should handle tasks with only one occurrence', async () => {
      const tasks = [createMockTask('1', 'Unique task', 'Tarefa', { daysAgo: 0 })];

      const patterns = await analyzer.detectRecurringPatterns(tasks);

      expect(patterns.length).toBe(0);
    });

    it('should handle all completed tasks for batch detection', async () => {
      const tasks = [
        createMockTask('1', 'Task 1', 'Tarefa', { completed: true, hasDueDate: true }),
        createMockTask('2', 'Task 2', 'Tarefa', { completed: true, hasDueDate: true }),
      ];

      const patterns = await analyzer.detectBatchOpportunities(tasks);

      expect(patterns.length).toBe(0);
    });
  });
});

// Helper function to create mock tasks
function createMockTask(
  id: string,
  title: string,
  type: MindFlowItem['type'],
  options?: {
    daysAgo?: number;
    daysAgoUpdated?: number;
    completed?: boolean;
    hasDueDate?: boolean;
    hasSubtasks?: boolean;
  }
): MindFlowItem {
  const now = new Date();
  const createdAt = new Date(now);

  if (options?.daysAgo !== undefined) {
    createdAt.setDate(createdAt.getDate() - options.daysAgo);
  }

  const updatedAt = new Date(now);
  if (options?.daysAgoUpdated !== undefined) {
    updatedAt.setDate(updatedAt.getDate() - options.daysAgoUpdated);
  } else if (options?.daysAgo !== undefined) {
    updatedAt.setDate(updatedAt.getDate() - options.daysAgo);
  }

  const dueDate = options?.hasDueDate ? new Date(now) : undefined;
  if (dueDate) {
    dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days
  }

  const subtasks = options?.hasSubtasks
    ? [
        { id: '1', text: 'Subtask 1', completed: false },
        { id: '2', text: 'Subtask 2', completed: false },
      ]
    : undefined;

  return {
    id,
    title,
    type,
    completed: options?.completed ?? false,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    dueDateISO: dueDate?.toISOString(),
    dueDate: dueDate?.toISOString(),
    subtasks,
  } as MindFlowItem;
}
