import { z } from 'zod';
import { generateStructuredOutput } from './aiProvider';
import { logger } from '@/utils/logger';
import type { MindFlowItem } from '@/types';
import {
  DetectedPattern,
  DetectedPatternSchema,
  PatternSuggestion,
} from '@/types/ai-prioritization';
import {
  userPerformancePatternRepository,
  patternSuggestionRepository,
} from '../database/patternRepository';

/**
 * Pattern Analysis Configuration
 */
export interface PatternAnalysisConfig {
  analysisInterval: number; // hours
  minPatternThreshold: number; // minimum occurrences to consider a pattern
  confidenceThreshold: number; // minimum confidence to accept a pattern
}

const DEFAULT_CONFIG: PatternAnalysisConfig = {
  analysisInterval: 4,
  minPatternThreshold: 3,
  confidenceThreshold: 0.6,
};

/**
 * Recurring Pattern Data
 */
interface RecurringPattern {
  taskTitle: string;
  frequency: number; // occurrences
  averageDaysBetween: number;
  lastOccurrence: Date;
  suggestedRecurrence: 'daily' | 'weekly' | 'monthly';
}

/**
 * Batch Opportunity Data
 */
interface BatchOpportunity {
  category: string;
  taskCount: number;
  estimatedTime: number; // minutes
  suggestedTimeBlock: string;
}

/**
 * Postponement Pattern Data
 */
interface PostponementPattern {
  taskId: string;
  taskTitle: string;
  postponementCount: number;
  averagePostponementDays: number;
  suggestedAction: 'break_down' | 'delegate' | 'schedule_block';
}

/**
 * Performance Pattern Data
 */
interface PerformancePattern {
  taskType: string;
  bestTimeSlot: string; // e.g., "morning", "afternoon"
  completionRate: number; // 0-1
  averageCompletionTime: number; // minutes
}

/**
 * Pattern Analyzer Service
 * Detects behavioral patterns and generates proactive suggestions
 */
export class PatternAnalyzer {
  private config: PatternAnalysisConfig;

  constructor(config: Partial<PatternAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main pattern analysis method
   * Analyzes all patterns for a user
   */
  async analyzePatterns(
    userId: string,
    tasks: MindFlowItem[]
  ): Promise<DetectedPattern[]> {
    try {
      logger.info('Starting pattern analysis', {
        provider: 'PatternAnalyzer',
        userId,
        taskCount: tasks.length,
      });

      const patterns: DetectedPattern[] = [];

      // Run all pattern detections in parallel
      const [recurring, batch, postponement, performance] = await Promise.all([
        this.detectRecurringPatterns(tasks),
        this.detectBatchOpportunities(tasks),
        this.detectPostponementPatterns(tasks),
        this.detectPerformancePatterns(tasks),
      ]);

      patterns.push(...recurring, ...batch, ...postponement, ...performance);

      // Filter by confidence threshold
      const significantPatterns = patterns.filter(
        (p) => p.confidence >= this.config.confidenceThreshold
      );

      logger.info('Pattern analysis complete', {
        provider: 'PatternAnalyzer',
        userId,
        totalPatterns: patterns.length,
        significantPatterns: significantPatterns.length,
      });

      // Store patterns in database
      await this.storePatterns(userId, significantPatterns);

      return significantPatterns;
    } catch (error) {
      logger.error('Pattern analysis failed', error, {
        provider: 'PatternAnalyzer',
        userId,
      });
      throw new Error('Failed to analyze patterns');
    }
  }

  /**
   * Detect recurring task patterns
   */
  async detectRecurringPatterns(
    tasks: MindFlowItem[]
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Group tasks by similar titles
    const titleGroups = new Map<string, MindFlowItem[]>();

    tasks.forEach((task) => {
      const normalizedTitle = task.title.toLowerCase().trim();
      const existing = titleGroups.get(normalizedTitle) || [];
      titleGroups.set(normalizedTitle, [...existing, task]);
    });

    // Find patterns
    for (const [title, groupTasks] of titleGroups) {
      if (groupTasks.length >= this.config.minPatternThreshold) {
        // Calculate frequency
        const dates = groupTasks
          .map((t) => new Date(t.createdAt))
          .sort((a, b) => a.getTime() - b.getTime());

        if (dates.length < 2) continue;

        // Calculate average days between occurrences
        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
          const diff =
            (dates[i].getTime() - dates[i - 1].getTime()) /
            (1000 * 60 * 60 * 24);
          totalDays += diff;
        }
        const avgDays = totalDays / (dates.length - 1);

        // Determine suggested recurrence
        let suggestedRecurrence: 'daily' | 'weekly' | 'monthly';
        if (avgDays <= 2) {
          suggestedRecurrence = 'daily';
        } else if (avgDays <= 10) {
          suggestedRecurrence = 'weekly';
        } else {
          suggestedRecurrence = 'monthly';
        }

        const confidence = Math.min(groupTasks.length / 10, 0.95);

        patterns.push({
          type: 'recurring',
          patternData: {
            taskTitle: title,
            frequency: groupTasks.length,
            averageDaysBetween: avgDays,
            lastOccurrence: dates[dates.length - 1],
            suggestedRecurrence,
          },
          confidence,
          suggestion: {
            id: `recurring-${Date.now()}-${Math.random()}`,
            title: `Criar tarefa recorrente: "${title}"`,
            description: `Esta tarefa aparece ${groupTasks.length} vezes com média de ${Math.round(avgDays)} dias entre ocorrências. Considere criar uma tarefa recorrente ${suggestedRecurrence === 'daily' ? 'diária' : suggestedRecurrence === 'weekly' ? 'semanal' : 'mensal'}.`,
            impact: groupTasks.length > 5 ? 'high' : 'medium',
          },
        });
      }
    }

    logger.info('Recurring patterns detected', {
      provider: 'PatternAnalyzer',
      count: patterns.length,
    });

    return patterns;
  }

  /**
   * Detect batch processing opportunities
   */
  async detectBatchOpportunities(
    tasks: MindFlowItem[]
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Group tasks by type and due date proximity
    const typeGroups = new Map<string, MindFlowItem[]>();

    tasks
      .filter((t) => !t.completed)
      .forEach((task) => {
        const existing = typeGroups.get(task.type) || [];
        typeGroups.set(task.type, [...existing, task]);
      });

    // Find batch opportunities
    for (const [taskType, groupTasks] of typeGroups) {
      if (groupTasks.length >= this.config.minPatternThreshold) {
        // Check if tasks have similar due dates
        const tasksWithDueDate = groupTasks.filter(
          (t) => t.dueDateISO || t.dueDate
        );

        if (tasksWithDueDate.length >= 2) {
          const estimatedTime = groupTasks.length * 30; // Assume 30 min per task

          const confidence = Math.min(groupTasks.length / 5, 0.85);

          patterns.push({
            type: 'batch',
            patternData: {
              category: taskType,
              taskCount: groupTasks.length,
              estimatedTime,
              suggestedTimeBlock: estimatedTime > 90 ? 'afternoon' : 'morning',
            },
            confidence,
            suggestion: {
              id: `batch-${Date.now()}-${Math.random()}`,
              title: `Processar ${groupTasks.length} tarefas de ${taskType} em lote`,
              description: `Você tem ${groupTasks.length} tarefas do tipo "${taskType}" pendentes. Considere dedicar um bloco de ${Math.round(estimatedTime / 60)} horas para processá-las em lote e aumentar sua eficiência.`,
              impact: estimatedTime > 120 ? 'high' : 'medium',
            },
          });
        }
      }
    }

    logger.info('Batch opportunities detected', {
      provider: 'PatternAnalyzer',
      count: patterns.length,
    });

    return patterns;
  }

  /**
   * Detect postponement patterns (procrastination)
   */
  async detectPostponementPatterns(
    tasks: MindFlowItem[]
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Identify tasks that were updated multiple times but not completed
    const postponedTasks = tasks.filter((task) => {
      if (task.completed) return false;

      const created = new Date(task.createdAt);
      const updated = new Date(task.updatedAt || task.createdAt);
      const daysDiff =
        (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      // Task has been around for more than 7 days without completion
      return daysDiff > 7;
    });

    for (const task of postponedTasks) {
      const created = new Date(task.createdAt);
      const updated = new Date(task.updatedAt || task.createdAt);
      const daysDiff =
        (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      const confidence = Math.min(daysDiff / 30, 0.9);

      patterns.push({
        type: 'postponement',
        patternData: {
          taskId: task.id,
          taskTitle: task.title,
          postponementCount: Math.floor(daysDiff / 7),
          averagePostponementDays: daysDiff,
          suggestedAction:
            task.subtasks && task.subtasks.length > 0
              ? 'schedule_block'
              : 'break_down',
        },
        confidence,
        suggestion: {
          id: `postponement-${task.id}`,
          title: `Revisar tarefa adiada: "${task.title}"`,
          description: `Esta tarefa está pendente há ${Math.round(daysDiff)} dias. ${task.subtasks && task.subtasks.length > 0 ? 'Considere agendar um bloco de tempo dedicado.' : 'Considere quebrar em subtarefas menores para facilitar a execução.'}`,
          impact: daysDiff > 30 ? 'high' : 'medium',
        },
      });
    }

    logger.info('Postponement patterns detected', {
      provider: 'PatternAnalyzer',
      count: patterns.length,
    });

    return patterns;
  }

  /**
   * Detect performance patterns
   */
  async detectPerformancePatterns(
    tasks: MindFlowItem[]
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Group completed tasks by type
    const completedByType = new Map<string, MindFlowItem[]>();

    tasks
      .filter((t) => t.completed)
      .forEach((task) => {
        const existing = completedByType.get(task.type) || [];
        completedByType.set(task.type, [...existing, task]);
      });

    // Analyze completion patterns
    for (const [taskType, completedTasks] of completedByType) {
      if (completedTasks.length >= this.config.minPatternThreshold) {
        // Calculate completion rate
        const totalOfType =
          tasks.filter((t) => t.type === taskType).length || 1;
        const completionRate = completedTasks.length / totalOfType;

        // Determine best time slot (simplified - would need more data)
        const bestTimeSlot = 'morning'; // Placeholder

        const confidence = Math.min(completedTasks.length / 10, 0.8);

        patterns.push({
          type: 'performance',
          patternData: {
            taskType,
            bestTimeSlot,
            completionRate,
            averageCompletionTime: 45, // Placeholder
          },
          confidence,
          suggestion: {
            id: `performance-${taskType}-${Date.now()}`,
            title: `Otimizar execução de tarefas "${taskType}"`,
            description: `Você completa ${Math.round(completionRate * 100)}% das tarefas do tipo "${taskType}". Continue focando nessas tarefas no período da ${bestTimeSlot === 'morning' ? 'manhã' : 'tarde'} para manter a produtividade.`,
            impact: completionRate > 0.7 ? 'medium' : 'low',
          },
        });
      }
    }

    logger.info('Performance patterns detected', {
      provider: 'PatternAnalyzer',
      count: patterns.length,
    });

    return patterns;
  }

  /**
   * Store patterns in database
   */
  private async storePatterns(
    userId: string,
    patterns: DetectedPattern[]
  ): Promise<void> {
    try {
      for (const pattern of patterns) {
        // Store user performance pattern
        await userPerformancePatternRepository.upsertByUserAndType(
          userId,
          pattern.type,
          {
            userId,
            patternType: pattern.type,
            patternData: pattern.patternData,
            confidence: String(pattern.confidence),
          }
        );

        // Store pattern suggestion
        await patternSuggestionRepository.create({
          userId,
          suggestionType: pattern.type,
          title: pattern.suggestion.title,
          description: pattern.suggestion.description,
          actionData: pattern.patternData,
          impact: pattern.suggestion.impact,
        });
      }

      logger.info('Patterns stored in database', {
        provider: 'PatternAnalyzer',
        count: patterns.length,
      });
    } catch (error) {
      logger.error('Failed to store patterns', error, {
        provider: 'PatternAnalyzer',
      });
      // Don't throw - storage failure shouldn't break analysis
    }
  }
}

// Export singleton instance
export const patternAnalyzer = new PatternAnalyzer();
