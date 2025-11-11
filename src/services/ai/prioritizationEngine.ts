import { z } from 'zod';
import { generateStructuredOutput } from './aiProvider';
import { taskAnalysisRepository } from '../database/taskAnalysisRepository';
import { logger } from '@/utils/logger';
import type { MindFlowItem } from '@/types';
import {
  PrioritizationRequest,
  PrioritizationResponse,
  PrioritizedTask,
  PriorityFactor,
  PrioritizedTaskSchema,
  PrioritizationResponseSchema,
} from '@/types/ai-prioritization';

/**
 * Analysis Context for prioritization
 */
interface AnalysisContext {
  availableTime?: number;
  currentDate: Date;
  userPreferences?: Record<string, any>;
}

/**
 * Rule-based scoring weights
 */
const SCORING_WEIGHTS = {
  DUE_DATE_URGENCY: 0.35, // 35% weight for due date urgency
  COMPLEXITY: 0.25, // 25% weight for task complexity
  AVAILABLE_TIME_FIT: 0.20, // 20% weight for time availability
  TASK_TYPE: 0.10, // 10% weight for task type priority
  USER_PERFORMANCE: 0.10, // 10% weight for user performance patterns
};

/**
 * Task type priority mapping
 */
const TASK_TYPE_PRIORITY: Record<string, number> = {
  Reunião: 1.0, // Highest priority (scheduled events)
  Tarefa: 0.9, // High priority (actionable items)
  Lembrete: 0.8, // Medium-high priority
  Financeiro: 0.7, // Medium priority
  Ideia: 0.4, // Lower priority (exploratory)
  Nota: 0.3, // Lowest priority (reference)
};

/**
 * Complexity estimation based on content
 */
function estimateComplexity(task: MindFlowItem): 'low' | 'medium' | 'high' {
  const subtaskCount = task.subtasks?.length || 0;
  const titleLength = task.title.length;
  const hasSummary = !!task.summary;

  if (subtaskCount > 5 || (titleLength > 100 && hasSummary)) {
    return 'high';
  } else if (subtaskCount > 2 || titleLength > 50) {
    return 'medium';
  }
  return 'low';
}

/**
 * Prioritization Engine Service
 * Analyzes tasks and generates prioritized recommendations
 */
export class PrioritizationEngine {
  /**
   * Main prioritization method
   * Orchestrates the entire prioritization process
   */
  async prioritize(
    request: PrioritizationRequest
  ): Promise<PrioritizationResponse> {
    try {
      logger.info('Starting task prioritization', {
        provider: 'PrioritizationEngine',
        taskCount: request.tasks.length,
        availableTime: request.availableTime,
      });

      const context: AnalysisContext = {
        availableTime: request.availableTime,
        currentDate: new Date(),
        userPreferences: request.preferences,
      };

      // Try AI-enhanced prioritization first
      try {
        const aiResponse = await this.prioritizeWithAI(request, context);
        logger.info('AI prioritization successful', {
          provider: 'PrioritizationEngine',
        });
        return aiResponse;
      } catch (error) {
        logger.warn('AI prioritization failed, falling back to rule-based', {
          provider: 'PrioritizationEngine',
          error: String(error),
        });
        // Fallback to rule-based prioritization
        return this.prioritizeWithRules(request, context);
      }
    } catch (error) {
      logger.error('Prioritization failed', error, {
        provider: 'PrioritizationEngine',
      });
      throw new Error('Failed to prioritize tasks');
    }
  }

  /**
   * AI-enhanced prioritization
   */
  private async prioritizeWithAI(
    request: PrioritizationRequest,
    context: AnalysisContext
  ): Promise<PrioritizationResponse> {
    // Prepare tasks data for AI
    const tasksData = request.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.type,
      dueDate: task.dueDateISO || task.dueDate,
      completed: task.completed,
      complexity: estimateComplexity(task),
      subtaskCount: task.subtasks?.length || 0,
    }));

    // Build AI prompt
    const prompt = this.buildPrioritizationPrompt(
      tasksData,
      context,
      request.preferences
    );

    // Define response schema
    const responseSchema = PrioritizationResponseSchema;

    // Generate structured response from AI
    const result = await generateStructuredOutput(responseSchema, prompt, {
      context: 'task-planning',
      temperature: 0.3,
      maxTokens: 2500,
      maxRetries: 2,
    });

    // Store analysis results
    await this.storeAnalysisResults(request.tasks, result.data, context);

    return result.data;
  }

  /**
   * Rule-based prioritization fallback
   */
  private prioritizeWithRules(
    request: PrioritizationRequest,
    context: AnalysisContext
  ): PrioritizationResponse {
    const prioritizedTasks: PrioritizedTask[] = request.tasks.map((task) => {
      const score = this.calculatePriorityScore(task, context);
      const reasoning = this.generateJustification(task, score);

      return {
        taskId: task.id || '',
        priorityScore: score,
        rank: 0, // Will be assigned after sorting
        reasoning,
        confidence: 0.7, // Rule-based has lower confidence than AI
      };
    });

    // Sort by priority score (descending)
    prioritizedTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    // Assign ranks
    prioritizedTasks.forEach((task, index) => {
      task.rank = index + 1;
    });

    return {
      prioritizedTasks,
      justification: this.generateOverallJustification(prioritizedTasks),
      confidenceScore: 0.7,
    };
  }

  /**
   * Calculate priority score using rule-based algorithm
   */
  private calculatePriorityScore(
    task: MindFlowItem,
    context: AnalysisContext
  ): number {
    let score = 0;

    // 1. Due date urgency (35%)
    score += this.calculateDueDateUrgency(task, context) * SCORING_WEIGHTS.DUE_DATE_URGENCY;

    // 2. Complexity (25%)
    score += this.calculateComplexityScore(task) * SCORING_WEIGHTS.COMPLEXITY;

    // 3. Available time fit (20%)
    if (context.availableTime) {
      score += this.calculateTimeFitScore(task, context.availableTime) * SCORING_WEIGHTS.AVAILABLE_TIME_FIT;
    } else {
      score += 0.5 * SCORING_WEIGHTS.AVAILABLE_TIME_FIT; // Neutral score if no time info
    }

    // 4. Task type priority (10%)
    const typePriority = TASK_TYPE_PRIORITY[task.type] || 0.5;
    score += typePriority * SCORING_WEIGHTS.TASK_TYPE;

    // 5. User performance patterns (10%) - placeholder for now
    score += 0.5 * SCORING_WEIGHTS.USER_PERFORMANCE;

    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Calculate due date urgency score
   */
  private calculateDueDateUrgency(
    task: MindFlowItem,
    context: AnalysisContext
  ): number {
    if (!task.dueDateISO && !task.dueDate) {
      return 0.3; // No due date = low urgency
    }

    const dueDate = task.dueDateISO ? new Date(task.dueDateISO) : new Date(task.dueDate!);
    const now = context.currentDate;
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue < 0) {
      return 1.0; // Overdue = maximum urgency
    } else if (daysUntilDue < 1) {
      return 0.95; // Due today
    } else if (daysUntilDue < 3) {
      return 0.85; // Due within 3 days
    } else if (daysUntilDue < 7) {
      return 0.7; // Due this week
    } else if (daysUntilDue < 14) {
      return 0.5; // Due in 2 weeks
    } else {
      return 0.3; // Due later
    }
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexityScore(task: MindFlowItem): number {
    const complexity = estimateComplexity(task);

    // Higher complexity = higher priority (needs early attention)
    const complexityScores = {
      high: 0.9,
      medium: 0.6,
      low: 0.3,
    };

    return complexityScores[complexity];
  }

  /**
   * Calculate time fit score
   */
  private calculateTimeFitScore(
    task: MindFlowItem,
    availableTime: number
  ): number {
    // Estimate task duration based on complexity
    const complexity = estimateComplexity(task);
    const estimatedMinutes = {
      high: 120,
      medium: 60,
      low: 30,
    };

    const taskDuration = estimatedMinutes[complexity];

    if (taskDuration <= availableTime) {
      return 1.0; // Task fits well in available time
    } else if (taskDuration <= availableTime * 1.5) {
      return 0.6; // Task might fit with some effort
    } else {
      return 0.2; // Task doesn't fit well
    }
  }

  /**
   * Generate justification for individual task
   */
  private generateJustification(
    task: MindFlowItem,
    score: number
  ): string[] {
    const reasons: string[] = [];

    // Due date reasoning
    if (task.dueDateISO || task.dueDate) {
      const dueDate = task.dueDateISO ? new Date(task.dueDateISO) : new Date(task.dueDate!);
      const now = new Date();
      const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilDue < 0) {
        reasons.push('Esta tarefa está atrasada e requer atenção imediata');
      } else if (daysUntilDue < 1) {
        reasons.push('Prazo vence hoje - alta urgência');
      } else if (daysUntilDue < 3) {
        reasons.push(`Prazo em ${Math.ceil(daysUntilDue)} dias - planejamento necessário`);
      }
    }

    // Complexity reasoning
    const complexity = estimateComplexity(task);
    if (complexity === 'high') {
      reasons.push('Tarefa complexa que pode necessitar de planejamento adicional');
    } else if (complexity === 'medium') {
      reasons.push('Tarefa de complexidade moderada');
    }

    // Task type reasoning
    if (task.type === 'Reunião') {
      reasons.push('Reunião agendada - horário fixo');
    } else if (task.type === 'Financeiro') {
      reasons.push('Item financeiro - pode ter implicações de prazo');
    }

    // Default reason if none
    if (reasons.length === 0) {
      reasons.push('Prioridade baseada em análise geral do contexto');
    }

    return reasons;
  }

  /**
   * Generate overall justification for prioritization
   */
  private generateOverallJustification(
    prioritizedTasks: PrioritizedTask[]
  ): string {
    const highPriorityCount = prioritizedTasks.filter((t) => t.priorityScore > 0.7).length;
    const mediumPriorityCount = prioritizedTasks.filter(
      (t) => t.priorityScore >= 0.4 && t.priorityScore <= 0.7
    ).length;

    return `Priorizadas ${prioritizedTasks.length} tarefas: ${highPriorityCount} de alta prioridade, ${mediumPriorityCount} de prioridade média. Recomendação: focar nas tarefas de maior prioridade primeiro, considerando prazos e complexidade.`;
  }

  /**
   * Build AI prioritization prompt
   */
  private buildPrioritizationPrompt(
    tasks: any[],
    context: AnalysisContext,
    preferences?: Record<string, any>
  ): string {
    const currentDate = context.currentDate.toISOString().split('T')[0];
    const availableTime = context.availableTime
      ? `${context.availableTime} minutos`
      : 'não especificado';

    return `Você é um assistente especialista em priorização de tarefas. Analise as seguintes tarefas e forneça uma lista priorizada com justificativa detalhada.

Data atual: ${currentDate}
Tempo disponível: ${availableTime}

Tarefas para priorizar:
${JSON.stringify(tasks, null, 2)}

Considere estes fatores (em ordem de importância):
1. Urgência do prazo (tarefas vencendo primeiro têm maior prioridade)
2. Complexidade vs. tempo disponível (tarefas complexas precisam de blocos de tempo adequados)
3. Tipo de tarefa e categoria de importância
4. Padrões históricos de desempenho do usuário (se disponível)
5. Duração estimada e tempo necessário

Para cada tarefa, forneça:
- Um score de prioridade de 0 a 1 (1 = máxima prioridade)
- Um rank (posição na lista priorizada)
- Motivos detalhados para a priorização
- Confidence score (0 a 1) indicando sua confiança na análise

Retorne uma justificativa geral da estratégia de priorização e um confidence score geral.`;
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(
    tasks: any[],
    response: PrioritizationResponse,
    context: AnalysisContext
  ): Promise<void> {
    try {
      // Get user ID from first task (assuming all tasks belong to same user)
      const userId = 'test-user'; // TODO: Get from context or request

      // Store analysis for each prioritized task
      for (const prioritizedTask of response.prioritizedTasks) {
        const task = tasks.find((t: any) => t.id === prioritizedTask.taskId);
        if (!task) continue;

        // Build priority factors
        const factors: PriorityFactor[] = prioritizedTask.reasoning.map(
          (reason, index) => ({
            name: `Factor ${index + 1}`,
            weight: 1.0 / prioritizedTask.reasoning.length,
            impact: 'positive' as const,
            description: reason,
          })
        );

        await taskAnalysisRepository.create({
          taskId: prioritizedTask.taskId,
          userId,
          priorityScore: String(prioritizedTask.priorityScore),
          recommendedOrder: prioritizedTask.rank,
          confidence: String(prioritizedTask.confidence),
          factors,
        });
      }

      logger.info('Analysis results stored', {
        provider: 'PrioritizationEngine',
        count: response.prioritizedTasks.length,
      });
    } catch (error) {
      logger.error('Failed to store analysis results', error, {
        provider: 'PrioritizationEngine',
      });
      // Don't throw - storage failure shouldn't break prioritization
    }
  }
}

// Export singleton instance
export const prioritizationEngine = new PrioritizationEngine();
