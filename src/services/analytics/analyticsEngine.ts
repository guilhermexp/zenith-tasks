import { logger } from '@/utils/logger';
import type { MindFlowItem } from '@/types';
import {
  ProductivityInsights,
  AnalyticsRequest,
  TimeSlot,
  ProcrastinationPattern,
} from '@/types/ai-prioritization';

/**
 * Analytics Engine Service
 * Generates productivity insights and performance metrics
 */
export class AnalyticsEngine {
  /**
   * Generate comprehensive productivity insights
   */
  async generateInsights(
    request: AnalyticsRequest,
    tasks: MindFlowItem[]
  ): Promise<ProductivityInsights> {
    try {
      logger.info('Generating productivity insights', {
        provider: 'AnalyticsEngine',
        userId: request.userId,
        period: request.period,
        taskCount: tasks.length,
      });

      const periodTasks = this.filterTasksByPeriod(tasks, request.period);

      const insights: ProductivityInsights = {
        mostProductiveHours: this.calculateMostProductiveHours(periodTasks),
        taskCompletionByType: this.analyzeCompletionByType(periodTasks),
        procrastinationPatterns:
          this.identifyProcrastinationPatterns(periodTasks),
        improvementSuggestions: this.generateImprovementSuggestions(
          periodTasks
        ),
        productivityScore: this.calculateProductivityScore(periodTasks),
        trend: this.calculateTrend(tasks, request.period),
      };

      logger.info('Productivity insights generated', {
        provider: 'AnalyticsEngine',
        userId: request.userId,
        productivityScore: insights.productivityScore,
        trend: insights.trend,
      });

      return insights;
    } catch (error) {
      logger.error('Failed to generate insights', error, {
        provider: 'AnalyticsEngine',
        userId: request.userId,
      });
      throw new Error('Failed to generate productivity insights');
    }
  }

  /**
   * Filter tasks by time period
   */
  private filterTasksByPeriod(
    tasks: MindFlowItem[],
    period: 'week' | 'month' | 'quarter'
  ): MindFlowItem[] {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startDate;
    });
  }

  /**
   * Calculate most productive hours
   */
  private calculateMostProductiveHours(tasks: MindFlowItem[]): TimeSlot[] {
    const hourlyCompletion = new Map<number, number>();

    // Count completions by hour
    tasks
      .filter((t) => t.completed)
      .forEach((task) => {
        const completedDate = new Date(task.updatedAt || task.createdAt);
        const hour = completedDate.getHours();
        hourlyCompletion.set(hour, (hourlyCompletion.get(hour) || 0) + 1);
      });

    // Convert to TimeSlots and calculate productivity scores
    const timeSlots: TimeSlot[] = [];
    const maxCompletions = Math.max(...Array.from(hourlyCompletion.values()), 1);

    for (let hour = 0; hour < 24; hour++) {
      const completions = hourlyCompletion.get(hour) || 0;
      const productivityScore = (completions / maxCompletions) * 100;

      timeSlots.push({
        hour,
        productivityScore,
      });
    }

    // Return top 5 most productive hours
    return timeSlots
      .filter((slot) => slot.productivityScore > 0)
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, 5);
  }

  /**
   * Analyze task completion by type
   */
  analyzeCompletionByType(tasks: MindFlowItem[]): Record<string, number> {
    const completionByType: Record<string, number> = {};

    // Group by type
    const typeGroups = new Map<string, { total: number; completed: number }>();

    tasks.forEach((task) => {
      const stats = typeGroups.get(task.type) || { total: 0, completed: 0 };
      stats.total += 1;
      if (task.completed) {
        stats.completed += 1;
      }
      typeGroups.set(task.type, stats);
    });

    // Calculate completion rates
    for (const [type, stats] of typeGroups) {
      completionByType[type] =
        stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    }

    return completionByType;
  }

  /**
   * Identify procrastination patterns
   */
  identifyProcrastinationPatterns(
    tasks: MindFlowItem[]
  ): ProcrastinationPattern[] {
    const patterns: ProcrastinationPattern[] = [];
    const typePostponements = new Map<
      string,
      { tasks: MindFlowItem[]; totalPostponements: number }
    >();

    // Analyze postponed tasks by type
    tasks.forEach((task) => {
      const created = new Date(task.createdAt);
      const updated = new Date(task.updatedAt || task.createdAt);
      const daysDiff =
        (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 3 && !task.completed) {
        // Task postponed
        const stats = typePostponements.get(task.type) || {
          tasks: [],
          totalPostponements: 0,
        };
        stats.tasks.push(task);
        stats.totalPostponements += Math.floor(daysDiff / 3);
        typePostponements.set(task.type, stats);
      }
    });

    // Generate patterns
    for (const [taskType, stats] of typePostponements) {
      if (stats.tasks.length >= 2) {
        const averagePostponements = stats.totalPostponements / stats.tasks.length;

        patterns.push({
          taskType,
          averagePostponements,
          commonReasons: this.identifyCommonReasons(stats.tasks),
          suggestion: this.generateProcrastinationSuggestion(
            taskType,
            averagePostponements
          ),
        });
      }
    }

    return patterns;
  }

  /**
   * Identify common reasons for postponement
   */
  private identifyCommonReasons(tasks: MindFlowItem[]): string[] {
    const reasons: string[] = [];

    const hasComplexTasks = tasks.some(
      (t) => t.subtasks && t.subtasks.length > 5
    );
    if (hasComplexTasks) {
      reasons.push('Tarefas complexas com muitas subtarefas');
    }

    const hasVagueTitles = tasks.some((t) => t.title.length < 20);
    if (hasVagueTitles) {
      reasons.push('Descrições vagas ou pouco específicas');
    }

    const hasNoDueDate = tasks.some((t) => !t.dueDateISO && !t.dueDate);
    if (hasNoDueDate) {
      reasons.push('Ausência de prazos definidos');
    }

    return reasons.length > 0
      ? reasons
      : ['Padrão de adiamento não específico'];
  }

  /**
   * Generate procrastination suggestion
   */
  private generateProcrastinationSuggestion(
    taskType: string,
    averagePostponements: number
  ): string {
    if (averagePostponements > 5) {
      return `Tarefas de "${taskType}" são frequentemente adiadas. Considere quebrá-las em partes menores ou delegar quando possível.`;
    } else if (averagePostponements > 3) {
      return `Agende blocos de tempo específicos para tarefas de "${taskType}" para evitar adiamentos.`;
    } else {
      return `Defina prazos mais claros para tarefas de "${taskType}" para manter o foco.`;
    }
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    tasks: MindFlowItem[]
  ): string[] {
    const suggestions: string[] = [];

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

    if (completionRate < 0.5) {
      suggestions.push(
        'Sua taxa de conclusão está abaixo de 50%. Considere reduzir a quantidade de tarefas ou quebrá-las em itens menores.'
      );
    }

    const tasksWithoutDueDate = tasks.filter(
      (t) => !t.dueDateISO && !t.dueDate && !t.completed
    ).length;
    if (tasksWithoutDueDate > 5) {
      suggestions.push(
        'Várias tarefas sem prazo definido. Adicione prazos para melhorar o planejamento.'
      );
    }

    const oldPendingTasks = tasks.filter((t) => {
      if (t.completed) return false;
      const daysSince =
        (Date.now() - new Date(t.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysSince > 14;
    }).length;

    if (oldPendingTasks > 3) {
      suggestions.push(
        `Você tem ${oldPendingTasks} tarefas pendentes há mais de 2 semanas. Revise e priorize ou arquive.`
      );
    }

    const tasksWithSubtasks = tasks.filter(
      (t) => t.subtasks && t.subtasks.length > 0
    ).length;
    const complexTaskRate =
      totalCount > 0 ? tasksWithSubtasks / totalCount : 0;

    if (complexTaskRate < 0.2 && totalCount > 10) {
      suggestions.push(
        'Poucas tarefas têm subtarefas. Quebrar tarefas complexas em subtarefas pode facilitar a execução.'
      );
    }

    return suggestions.length > 0
      ? suggestions
      : ['Continue mantendo um bom ritmo de trabalho!'];
  }

  /**
   * Calculate overall productivity score
   */
  calculateProductivityScore(tasks: MindFlowItem[]): number {
    if (tasks.length === 0) return 50; // Neutral score for no data

    let score = 0;

    // 1. Completion rate (40%)
    const completedCount = tasks.filter((t) => t.completed).length;
    const completionRate = completedCount / tasks.length;
    score += completionRate * 40;

    // 2. On-time completion (30%)
    const tasksWithDueDate = tasks.filter((t) => t.dueDateISO || t.dueDate);
    const onTimeCompletions = tasksWithDueDate.filter((t) => {
      if (!t.completed) return false;
      const dueDate = new Date(t.dueDateISO || t.dueDate!);
      const completedDate = new Date(t.updatedAt || t.createdAt);
      return completedDate <= dueDate;
    }).length;

    const onTimeRate =
      tasksWithDueDate.length > 0
        ? onTimeCompletions / tasksWithDueDate.length
        : 0.5;
    score += onTimeRate * 30;

    // 3. Task organization (20%)
    const tasksWithSubtasks = tasks.filter(
      (t) => t.subtasks && t.subtasks.length > 0
    ).length;
    const organizationRate = tasksWithSubtasks / tasks.length;
    score += organizationRate * 20;

    // 4. Responsiveness (10%)
    const quickCompletions = tasks.filter((t) => {
      if (!t.completed) return false;
      const daysDiff =
        (new Date(t.updatedAt || t.createdAt).getTime() - new Date(t.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysDiff <= 2;
    }).length;

    const quickRate = tasks.length > 0 ? quickCompletions / tasks.length : 0;
    score += quickRate * 10;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate productivity trend
   */
  private calculateTrend(
    allTasks: MindFlowItem[],
    period: 'week' | 'month' | 'quarter'
  ): 'improving' | 'declining' | 'stable' {
    const now = new Date();
    let periodDays: number;

    switch (period) {
      case 'week':
        periodDays = 7;
        break;
      case 'month':
        periodDays = 30;
        break;
      case 'quarter':
        periodDays = 90;
        break;
    }

    // Split period into two halves
    const halfPeriod = periodDays / 2;
    const midPoint = new Date(now.getTime() - halfPeriod * 24 * 60 * 60 * 1000);
    const startPoint = new Date(
      now.getTime() - periodDays * 24 * 60 * 60 * 1000
    );

    const firstHalfTasks = allTasks.filter((t) => {
      const date = new Date(t.createdAt);
      return date >= startPoint && date < midPoint;
    });

    const secondHalfTasks = allTasks.filter((t) => {
      const date = new Date(t.createdAt);
      return date >= midPoint;
    });

    const firstHalfScore = this.calculateProductivityScore(firstHalfTasks);
    const secondHalfScore = this.calculateProductivityScore(secondHalfTasks);

    const diff = secondHalfScore - firstHalfScore;

    if (diff > 10) return 'improving';
    if (diff < -10) return 'declining';
    return 'stable';
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();
