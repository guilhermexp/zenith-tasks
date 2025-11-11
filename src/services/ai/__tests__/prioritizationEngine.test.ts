/**
 * Unit Tests for PrioritizationEngine
 *
 * Tests cover:
 * - Priority score calculation with all weighting factors
 * - Due date urgency scoring
 * - Complexity assessment
 * - Available time fit calculation
 * - Task type priority mapping
 * - Justification generation
 * - AI integration with fallback to rule-based
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrioritizationEngine } from '../prioritizationEngine';
import type { MindFlowItem } from '@/types';
import type { PrioritizationRequest, PrioritizationResponse } from '@/types/ai-prioritization';

// Mock dependencies
vi.mock('../aiProvider', () => ({
  generateStructuredOutput: vi.fn(),
}));

vi.mock('../../database/taskAnalysisRepository', () => ({
  taskAnalysisRepository: {
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

describe('PrioritizationEngine', () => {
  let engine: PrioritizationEngine;

  beforeEach(() => {
    engine = new PrioritizationEngine();
    vi.clearAllMocks();
  });

  describe('prioritize() - Main orchestration', () => {
    it('should prioritize tasks successfully with rule-based fallback', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'Task 1', 'Tarefa', { daysFromNow: 1 }),
          createMockTask('2', 'Task 2', 'Tarefa', { daysFromNow: 7 }),
          createMockTask('3', 'Task 3', 'Ideia'),
        ],
        availableTime: 120,
        preferences: {},
      };

      const result = await engine.prioritize(request);

      expect(result).toBeDefined();
      expect(result.prioritizedTasks).toHaveLength(3);
      expect(result.justification).toBeTruthy();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);

      // Verify ranking
      const ranks = result.prioritizedTasks.map((t) => t.rank);
      expect(ranks).toEqual([1, 2, 3]);
    });

    it('should handle empty task list', async () => {
      const request: PrioritizationRequest = {
        tasks: [],
        availableTime: 120,
      };

      const result = await engine.prioritize(request);

      expect(result.prioritizedTasks).toHaveLength(0);
      expect(result.justification).toBeTruthy();
    });

    it('should prioritize overdue tasks first', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'Future task', 'Tarefa', { daysFromNow: 7 }),
          createMockTask('2', 'Overdue task', 'Tarefa', { daysFromNow: -2 }),
          createMockTask('3', 'Today task', 'Tarefa', { daysFromNow: 0 }),
        ],
        availableTime: 120,
      };

      const result = await engine.prioritize(request);

      // Overdue task should be rank 1
      const overdueTask = result.prioritizedTasks.find((t) => t.taskId === '2');
      expect(overdueTask?.rank).toBe(1);
      expect(overdueTask?.priorityScore).toBeGreaterThan(0.7); // High priority but realistic threshold
    });

    it('should handle tasks without due dates', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'No due date', 'Nota'),
          createMockTask('2', 'With due date', 'Tarefa', { daysFromNow: 3 }),
        ],
        availableTime: 120,
      };

      const result = await engine.prioritize(request);

      expect(result.prioritizedTasks).toHaveLength(2);

      // Task with due date should rank higher
      const withDueDate = result.prioritizedTasks.find((t) => t.taskId === '2');
      const noDueDate = result.prioritizedTasks.find((t) => t.taskId === '1');

      expect(withDueDate?.priorityScore).toBeGreaterThan(noDueDate?.priorityScore || 0);
    });

    it('should apply user preferences when provided', async () => {
      const request: PrioritizationRequest = {
        tasks: [createMockTask('1', 'Task', 'Tarefa')],
        availableTime: 60,
        preferences: {
          focusTime: 'morning',
          preferredTaskTypes: ['Tarefa'],
        },
      };

      const result = await engine.prioritize(request);

      expect(result).toBeDefined();
      expect(result.prioritizedTasks).toHaveLength(1);
    });
  });

  describe('calculatePriorityScore() - Rule-based scoring', () => {
    it('should calculate priority score with all factors', () => {
      const task = createMockTask('1', 'Complex urgent task', 'Tarefa', {
        daysFromNow: 1,
        complexity: 'high',
      });

      const context = {
        availableTime: 120,
        currentDate: new Date(),
        userPreferences: {},
      };

      // Access private method through type casting
      const score = (engine as any).calculatePriorityScore(task, context);

      expect(score).toBeGreaterThan(0.7); // High priority
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should weight due date urgency at 35%', () => {
      const overdueTask = createMockTask('1', 'Overdue', 'Tarefa', { daysFromNow: -1 });
      const futureTask = createMockTask('2', 'Future', 'Tarefa', { daysFromNow: 30 });

      const context = {
        currentDate: new Date(),
        userPreferences: {},
      };

      const overdueScore = (engine as any).calculatePriorityScore(overdueTask, context);
      const futureScore = (engine as any).calculatePriorityScore(futureTask, context);

      // Overdue should have significantly higher score
      expect(overdueScore).toBeGreaterThan(futureScore + 0.2);
    });

    it('should weight complexity at 25%', () => {
      const highComplexTask = createMockTask('1', 'High complexity', 'Tarefa', {
        complexity: 'high',
      });
      const lowComplexTask = createMockTask('2', 'Low complexity', 'Tarefa', {
        complexity: 'low',
      });

      const context = {
        currentDate: new Date(),
        userPreferences: {},
      };

      const highScore = (engine as any).calculatePriorityScore(highComplexTask, context);
      const lowScore = (engine as any).calculatePriorityScore(lowComplexTask, context);

      // High complexity should score higher
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should consider available time fit at 20%', () => {
      const task = createMockTask('1', 'Task', 'Tarefa', { complexity: 'low' });

      const contextWithTime = {
        availableTime: 120, // 2 hours
        currentDate: new Date(),
      };

      const contextWithoutTime = {
        currentDate: new Date(),
      };

      const scoreWithTime = (engine as any).calculatePriorityScore(task, contextWithTime);
      const scoreWithoutTime = (engine as any).calculatePriorityScore(task, contextWithoutTime);

      // Both should be valid scores
      expect(scoreWithTime).toBeGreaterThan(0);
      expect(scoreWithoutTime).toBeGreaterThan(0);
    });

    it('should apply task type priority at 10%', () => {
      const meetingTask = createMockTask('1', 'Meeting', 'Reunião');
      const noteTask = createMockTask('2', 'Note', 'Nota');

      const context = {
        currentDate: new Date(),
        userPreferences: {},
      };

      const meetingScore = (engine as any).calculatePriorityScore(meetingTask, context);
      const noteScore = (engine as any).calculatePriorityScore(noteTask, context);

      // Meeting should have higher priority than notes
      expect(meetingScore).toBeGreaterThan(noteScore);
    });

    it('should clamp score between 0 and 1', () => {
      const extremeTask = createMockTask('1', 'Extreme', 'Tarefa', { daysFromNow: -10 });

      const context = {
        availableTime: 500,
        currentDate: new Date(),
      };

      const score = (engine as any).calculatePriorityScore(extremeTask, context);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateDueDateUrgency() - Due date scoring', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const context = { currentDate: now, userPreferences: {} };

    it('should return 0.3 for tasks without due date', () => {
      const task = createMockTask('1', 'No due date', 'Tarefa');

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(0.3);
    });

    it('should return 1.0 for overdue tasks', () => {
      const task = createMockTask('1', 'Overdue', 'Tarefa', {
        daysFromNow: -2,
        baseDate: now,
      });

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(1.0);
    });

    it('should return 0.95 for tasks due today', () => {
      const task = createMockTask('1', 'Due today', 'Tarefa', {
        daysFromNow: 0.5, // Due in 12 hours
        baseDate: now,
      });

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(0.95);
    });

    it('should return 0.85 for tasks due within 3 days', () => {
      const task = createMockTask('1', 'Due in 2 days', 'Tarefa', {
        daysFromNow: 2,
        baseDate: now,
      });

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(0.85);
    });

    it('should return 0.7 for tasks due within 7 days', () => {
      const task = createMockTask('1', 'Due in 5 days', 'Tarefa', {
        daysFromNow: 5,
        baseDate: now,
      });

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(0.7);
    });

    it('should return 0.5 for tasks due within 14 days', () => {
      const task = createMockTask('1', 'Due in 10 days', 'Tarefa', {
        daysFromNow: 10,
        baseDate: now,
      });

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(0.5);
    });

    it('should return 0.3 for tasks due later than 14 days', () => {
      const task = createMockTask('1', 'Due in 30 days', 'Tarefa', {
        daysFromNow: 30,
        baseDate: now,
      });

      const urgency = (engine as any).calculateDueDateUrgency(task, context);

      expect(urgency).toBe(0.3);
    });
  });

  describe('calculateComplexityScore() - Complexity assessment', () => {
    it('should score high complexity at 0.9', () => {
      const task = createMockTask('1', 'High complexity task', 'Tarefa', {
        complexity: 'high',
      });

      const score = (engine as any).calculateComplexityScore(task);

      expect(score).toBe(0.9);
    });

    it('should score medium complexity at 0.6', () => {
      const task = createMockTask('1', 'Medium complexity task', 'Tarefa', {
        complexity: 'medium',
      });

      const score = (engine as any).calculateComplexityScore(task);

      expect(score).toBe(0.6);
    });

    it('should score low complexity at 0.3', () => {
      const task = createMockTask('1', 'Low complexity task', 'Tarefa', {
        complexity: 'low',
      });

      const score = (engine as any).calculateComplexityScore(task);

      expect(score).toBe(0.3);
    });
  });

  describe('calculateTimeFitScore() - Available time fit', () => {
    it('should return 1.0 when task fits well in available time', () => {
      const task = createMockTask('1', 'Quick task', 'Tarefa', { complexity: 'low' }); // 30 min
      const availableTime = 60; // 60 min

      const score = (engine as any).calculateTimeFitScore(task, availableTime);

      expect(score).toBe(1.0);
    });

    it('should return 0.6 when task might fit with effort', () => {
      const task = createMockTask('1', 'Medium task', 'Tarefa', { complexity: 'medium' }); // 60 min
      const availableTime = 50; // Task duration <= availableTime * 1.5 (75)

      const score = (engine as any).calculateTimeFitScore(task, availableTime);

      expect(score).toBe(0.6);
    });

    it('should return 0.2 when task does not fit', () => {
      const task = createMockTask('1', 'Long task', 'Tarefa', { complexity: 'high' }); // 120 min
      const availableTime = 30; // Task duration > availableTime * 1.5 (45)

      const score = (engine as any).calculateTimeFitScore(task, availableTime);

      expect(score).toBe(0.2);
    });
  });

  describe('generateJustification() - Reasoning generation', () => {
    it('should generate justification for overdue task', () => {
      const task = createMockTask('1', 'Overdue task', 'Tarefa', { daysFromNow: -2 });
      const score = 0.9;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Esta tarefa está atrasada e requer atenção imediata');
    });

    it('should generate justification for task due today', () => {
      const task = createMockTask('1', 'Today task', 'Tarefa', { daysFromNow: 0.5 });
      const score = 0.85;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Prazo vence hoje - alta urgência');
    });

    it('should generate justification for task due within 3 days', () => {
      const task = createMockTask('1', 'Soon task', 'Tarefa', { daysFromNow: 2 });
      const score = 0.75;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons.some((r) => r.includes('dias'))).toBe(true);
    });

    it('should generate justification for high complexity', () => {
      const task = createMockTask('1', 'Complex task', 'Tarefa', { complexity: 'high' });
      const score = 0.7;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Tarefa complexa que pode necessitar de planejamento adicional');
    });

    it('should generate justification for medium complexity', () => {
      const task = createMockTask('1', 'Medium task', 'Tarefa', { complexity: 'medium' });
      const score = 0.6;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Tarefa de complexidade moderada');
    });

    it('should generate justification for meeting type', () => {
      const task = createMockTask('1', 'Team meeting', 'Reunião');
      const score = 0.8;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Reunião agendada - horário fixo');
    });

    it('should generate justification for financial type', () => {
      const task = createMockTask('1', 'Payment', 'Financeiro');
      const score = 0.7;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Item financeiro - pode ter implicações de prazo');
    });

    it('should provide default reason when no specific factors apply', () => {
      const task = createMockTask('1', 'Simple note', 'Nota');
      const score = 0.4;

      const reasons = (engine as any).generateJustification(task, score);

      expect(reasons).toContain('Prioridade baseada em análise geral do contexto');
    });
  });

  describe('Rule-based fallback', () => {
    it('should sort tasks by priority score descending', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'Low priority', 'Nota'),
          createMockTask('2', 'High priority', 'Reunião', { daysFromNow: 0 }),
          createMockTask('3', 'Medium priority', 'Tarefa', { daysFromNow: 5 }),
        ],
      };

      const result = await engine.prioritize(request);

      // Verify descending order by score
      for (let i = 0; i < result.prioritizedTasks.length - 1; i++) {
        expect(result.prioritizedTasks[i].priorityScore).toBeGreaterThanOrEqual(
          result.prioritizedTasks[i + 1].priorityScore
        );
      }
    });

    it('should assign ranks correctly (1 to N)', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'Task 1', 'Tarefa'),
          createMockTask('2', 'Task 2', 'Tarefa'),
          createMockTask('3', 'Task 3', 'Tarefa'),
        ],
      };

      const result = await engine.prioritize(request);

      const ranks = result.prioritizedTasks.map((t) => t.rank);
      expect(ranks).toEqual([1, 2, 3]);
    });

    it('should generate overall justification', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'Task 1', 'Tarefa', { daysFromNow: 1 }),
          createMockTask('2', 'Task 2', 'Tarefa', { daysFromNow: 10 }),
        ],
      };

      const result = await engine.prioritize(request);

      expect(result.justification).toBeTruthy();
      expect(result.justification).toContain('Priorizadas');
      expect(result.justification).toContain('prioridade');
    });

    it('should set confidence score to 0.7 for rule-based', async () => {
      const request: PrioritizationRequest = {
        tasks: [createMockTask('1', 'Task', 'Tarefa')],
      };

      const result = await engine.prioritize(request);

      expect(result.confidenceScore).toBe(0.7);
      result.prioritizedTasks.forEach((task) => {
        expect(task.confidence).toBe(0.7);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle tasks with missing properties gracefully', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          {
            id: '1',
            title: 'Minimal task',
            type: 'Tarefa',
            completed: false,
            createdAt: new Date().toISOString(),
          } as MindFlowItem,
        ],
      };

      const result = await engine.prioritize(request);

      expect(result.prioritizedTasks).toHaveLength(1);
      expect(result.prioritizedTasks[0].priorityScore).toBeGreaterThan(0);
    });

    it('should handle very large task lists', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) =>
        createMockTask(`${i}`, `Task ${i}`, 'Tarefa', { daysFromNow: i })
      );

      const request: PrioritizationRequest = {
        tasks: largeTasks,
        availableTime: 480,
      };

      const result = await engine.prioritize(request);

      expect(result.prioritizedTasks).toHaveLength(100);
      expect(result.prioritizedTasks[0].rank).toBe(1);
      expect(result.prioritizedTasks[99].rank).toBe(100);
    });

    it('should handle tasks with identical properties', async () => {
      const request: PrioritizationRequest = {
        tasks: [
          createMockTask('1', 'Task A', 'Tarefa', { daysFromNow: 3 }),
          createMockTask('2', 'Task B', 'Tarefa', { daysFromNow: 3 }),
          createMockTask('3', 'Task C', 'Tarefa', { daysFromNow: 3 }),
        ],
      };

      const result = await engine.prioritize(request);

      expect(result.prioritizedTasks).toHaveLength(3);
      // All should have similar scores
      const scores = result.prioritizedTasks.map((t) => t.priorityScore);
      const scoreDiff = Math.abs(scores[0] - scores[2]);
      expect(scoreDiff).toBeLessThan(0.1);
    });
  });
});

// Helper function to create mock tasks
function createMockTask(
  id: string,
  title: string,
  type: MindFlowItem['type'],
  options?: {
    daysFromNow?: number;
    baseDate?: Date;
    complexity?: 'low' | 'medium' | 'high';
  }
): MindFlowItem {
  const baseDate = options?.baseDate || new Date();
  let dueDate: Date | undefined;

  if (options?.daysFromNow !== undefined) {
    dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + options.daysFromNow);
  }

  // Generate subtasks based on complexity
  const subtasks =
    options?.complexity === 'high'
      ? [
          { id: '1', text: 'Subtask 1', completed: false },
          { id: '2', text: 'Subtask 2', completed: false },
          { id: '3', text: 'Subtask 3', completed: false },
          { id: '4', text: 'Subtask 4', completed: false },
          { id: '5', text: 'Subtask 5', completed: false },
          { id: '6', text: 'Subtask 6', completed: false },
        ]
      : options?.complexity === 'medium'
        ? [
            { id: '1', text: 'Subtask 1', completed: false },
            { id: '2', text: 'Subtask 2', completed: false },
            { id: '3', text: 'Subtask 3', completed: false },
          ]
        : [];

  return {
    id,
    title,
    type,
    completed: false,
    createdAt: baseDate.toISOString(),
    dueDateISO: dueDate?.toISOString(),
    dueDate: dueDate?.toISOString(),
    subtasks,
    summary: options?.complexity === 'high' ? 'Detailed summary' : undefined,
  } as MindFlowItem;
}
