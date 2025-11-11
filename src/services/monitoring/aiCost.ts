/**
 * AI Cost Monitoring Service
 * Tracks token usage and costs for AI provider calls
 */

import { logger } from '@/utils/logger';
import { alertSystem } from './alert-system';

/**
 * AI provider pricing (cost per 1K tokens)
 * Based on current pricing as of 2025
 */
const AI_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI GPT-4
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },

  // Anthropic Claude
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },

  // Google Gemini
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },

  // xAI Grok
  'grok-beta': { input: 0.005, output: 0.015 },
};

/**
 * AI Call Cost Breakdown
 */
export interface AICallCost {
  id: string;
  userId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: Date;
  endpoint?: string;
  metadata?: Record<string, any>;
}

/**
 * User Cost Summary
 */
export interface UserCostSummary {
  userId: string;
  period: 'day' | 'week' | 'month';
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  averageCostPerCall: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Cost Budget Configuration
 */
export interface CostBudget {
  daily: number;
  weekly: number;
  monthly: number;
  perUser?: number;
  alerts: {
    warningThreshold: number; // percentage (e.g., 80)
    criticalThreshold: number; // percentage (e.g., 95)
  };
}

/**
 * Cost Alert
 */
export interface CostAlert {
  type: 'warning' | 'critical';
  message: string;
  currentCost: number;
  budgetLimit: number;
  percentage: number;
  timestamp: Date;
}

/**
 * AI Cost Monitoring Class
 */
export class AICostMonitor {
  private static instance: AICostMonitor;
  private calls: AICallCost[] = [];
  private budget: CostBudget;
  private alerts: CostAlert[] = [];
  private lastAlertTime: Map<string, Date> = new Map();

  private constructor() {
    this.budget = {
      daily: 10.0, // $10 per day
      weekly: 50.0, // $50 per week
      monthly: 200.0, // $200 per month
      perUser: 5.0, // $5 per user per day
      alerts: {
        warningThreshold: 80, // 80%
        criticalThreshold: 95, // 95%
      },
    };

    // Clean up old data daily
    setInterval(() => this.cleanupOldData(), 24 * 60 * 60 * 1000);

    // Check budgets every hour
    setInterval(() => this.checkBudgets(), 60 * 60 * 1000);

    logger.info('AI cost monitoring initialized', {
      provider: 'AICostMonitor',
      budget: this.budget,
    });
  }

  static getInstance(): AICostMonitor {
    if (!AICostMonitor.instance) {
      AICostMonitor.instance = new AICostMonitor();
    }
    return AICostMonitor.instance;
  }

  /**
   * Track AI call cost
   */
  trackAICall(
    userId: string,
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    endpoint?: string,
    metadata?: Record<string, any>
  ): AICallCost {
    const totalTokens = promptTokens + completionTokens;
    const pricing = this.getModelPricing(model);

    // Calculate costs (per 1K tokens)
    const inputCost = (promptTokens / 1000) * pricing.input;
    const outputCost = (completionTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    const cost: AICallCost = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      inputCost,
      outputCost,
      totalCost,
      timestamp: new Date(),
      endpoint,
      metadata,
    };

    this.calls.push(cost);

    logger.info('AI call cost tracked', {
      provider: 'AICostMonitor',
      userId,
      model,
      totalTokens,
      totalCost: totalCost.toFixed(4),
    });

    // Check if user is approaching budget
    this.checkUserBudget(userId);

    // Check overall budget
    this.checkBudgets();

    return cost;
  }

  /**
   * Get cost summary for a user
   */
  getUserCostSummary(
    userId: string,
    period: 'day' | 'week' | 'month'
  ): UserCostSummary {
    const now = new Date();
    const startDate = this.getPeriodStartDate(period);

    const userCalls = this.calls.filter(
      (call) =>
        call.userId === userId &&
        call.timestamp >= startDate &&
        call.timestamp <= now
    );

    const totalCalls = userCalls.length;
    const totalTokens = userCalls.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalCost = userCalls.reduce((sum, call) => sum + call.totalCost, 0);

    // Cost by provider
    const costByProvider: Record<string, number> = {};
    for (const call of userCalls) {
      costByProvider[call.provider] = (costByProvider[call.provider] || 0) + call.totalCost;
    }

    // Cost by model
    const costByModel: Record<string, number> = {};
    for (const call of userCalls) {
      costByModel[call.model] = (costByModel[call.model] || 0) + call.totalCost;
    }

    const averageCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

    return {
      userId,
      period,
      totalCalls,
      totalTokens,
      totalCost,
      costByProvider,
      costByModel,
      averageCostPerCall,
      startDate,
      endDate: now,
    };
  }

  /**
   * Get overall cost summary
   */
  getOverallCostSummary(period: 'day' | 'week' | 'month'): {
    period: string;
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    costByUser: Record<string, number>;
    costByProvider: Record<string, number>;
    costByModel: Record<string, number>;
    topUsers: Array<{ userId: string; cost: number }>;
    topModels: Array<{ model: string; cost: number }>;
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const startDate = this.getPeriodStartDate(period);

    const periodCalls = this.calls.filter(
      (call) => call.timestamp >= startDate && call.timestamp <= now
    );

    const totalCalls = periodCalls.length;
    const totalTokens = periodCalls.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalCost = periodCalls.reduce((sum, call) => sum + call.totalCost, 0);

    // Cost by user
    const costByUser: Record<string, number> = {};
    for (const call of periodCalls) {
      costByUser[call.userId] = (costByUser[call.userId] || 0) + call.totalCost;
    }

    // Cost by provider
    const costByProvider: Record<string, number> = {};
    for (const call of periodCalls) {
      costByProvider[call.provider] = (costByProvider[call.provider] || 0) + call.totalCost;
    }

    // Cost by model
    const costByModel: Record<string, number> = {};
    for (const call of periodCalls) {
      costByModel[call.model] = (costByModel[call.model] || 0) + call.totalCost;
    }

    // Top users
    const topUsers = Object.entries(costByUser)
      .map(([userId, cost]) => ({ userId, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Top models
    const topModels = Object.entries(costByModel)
      .map(([model, cost]) => ({ model, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      period,
      totalCalls,
      totalTokens,
      totalCost,
      costByUser,
      costByProvider,
      costByModel,
      topUsers,
      topModels,
      startDate,
      endDate: now,
    };
  }

  /**
   * Get daily cost summary
   */
  getDailyCostSummary(): ReturnType<typeof this.getOverallCostSummary> {
    return this.getOverallCostSummary('day');
  }

  /**
   * Get weekly cost summary
   */
  getWeeklyCostSummary(): ReturnType<typeof this.getOverallCostSummary> {
    return this.getOverallCostSummary('week');
  }

  /**
   * Get monthly cost summary
   */
  getMonthlyCostSummary(): ReturnType<typeof this.getOverallCostSummary> {
    return this.getOverallCostSummary('month');
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10): CostAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get budget configuration
   */
  getBudget(): CostBudget {
    return { ...this.budget };
  }

  /**
   * Update budget configuration
   */
  updateBudget(updates: Partial<CostBudget>): void {
    this.budget = { ...this.budget, ...updates };
    logger.info('AI cost budget updated', {
      provider: 'AICostMonitor',
      budget: this.budget,
    });
  }

  /**
   * Check if user is approaching budget
   */
  private checkUserBudget(userId: string): void {
    if (!this.budget.perUser) return;

    const userSummary = this.getUserCostSummary(userId, 'day');
    const percentage = (userSummary.totalCost / this.budget.perUser) * 100;

    if (percentage >= this.budget.alerts.criticalThreshold) {
      this.triggerAlert(
        'critical',
        `User ${userId} has exceeded ${percentage.toFixed(1)}% of daily budget`,
        userSummary.totalCost,
        this.budget.perUser,
        percentage,
        `user-${userId}-daily`
      );
    } else if (percentage >= this.budget.alerts.warningThreshold) {
      this.triggerAlert(
        'warning',
        `User ${userId} has reached ${percentage.toFixed(1)}% of daily budget`,
        userSummary.totalCost,
        this.budget.perUser,
        percentage,
        `user-${userId}-daily`
      );
    }
  }

  /**
   * Check overall budgets
   */
  private checkBudgets(): void {
    // Check daily budget
    const dailySummary = this.getDailyCostSummary();
    const dailyPercentage = (dailySummary.totalCost / this.budget.daily) * 100;

    if (dailyPercentage >= this.budget.alerts.criticalThreshold) {
      this.triggerAlert(
        'critical',
        `Daily AI cost has exceeded ${dailyPercentage.toFixed(1)}% of budget`,
        dailySummary.totalCost,
        this.budget.daily,
        dailyPercentage,
        'daily'
      );
    } else if (dailyPercentage >= this.budget.alerts.warningThreshold) {
      this.triggerAlert(
        'warning',
        `Daily AI cost has reached ${dailyPercentage.toFixed(1)}% of budget`,
        dailySummary.totalCost,
        this.budget.daily,
        dailyPercentage,
        'daily'
      );
    }

    // Check weekly budget
    const weeklySummary = this.getWeeklyCostSummary();
    const weeklyPercentage = (weeklySummary.totalCost / this.budget.weekly) * 100;

    if (weeklyPercentage >= this.budget.alerts.criticalThreshold) {
      this.triggerAlert(
        'critical',
        `Weekly AI cost has exceeded ${weeklyPercentage.toFixed(1)}% of budget`,
        weeklySummary.totalCost,
        this.budget.weekly,
        weeklyPercentage,
        'weekly'
      );
    } else if (weeklyPercentage >= this.budget.alerts.warningThreshold) {
      this.triggerAlert(
        'warning',
        `Weekly AI cost has reached ${weeklyPercentage.toFixed(1)}% of budget`,
        weeklySummary.totalCost,
        this.budget.weekly,
        weeklyPercentage,
        'weekly'
      );
    }

    // Check monthly budget
    const monthlySummary = this.getMonthlyCostSummary();
    const monthlyPercentage = (monthlySummary.totalCost / this.budget.monthly) * 100;

    if (monthlyPercentage >= this.budget.alerts.criticalThreshold) {
      this.triggerAlert(
        'critical',
        `Monthly AI cost has exceeded ${monthlyPercentage.toFixed(1)}% of budget`,
        monthlySummary.totalCost,
        this.budget.monthly,
        monthlyPercentage,
        'monthly'
      );
    } else if (monthlyPercentage >= this.budget.alerts.warningThreshold) {
      this.triggerAlert(
        'warning',
        `Monthly AI cost has reached ${monthlyPercentage.toFixed(1)}% of budget`,
        monthlySummary.totalCost,
        this.budget.monthly,
        monthlyPercentage,
        'monthly'
      );
    }
  }

  /**
   * Trigger cost alert
   */
  private triggerAlert(
    type: 'warning' | 'critical',
    message: string,
    currentCost: number,
    budgetLimit: number,
    percentage: number,
    alertKey: string
  ): void {
    // Check cooldown (1 hour)
    const lastAlert = this.lastAlertTime.get(alertKey);
    if (lastAlert && Date.now() - lastAlert.getTime() < 60 * 60 * 1000) {
      return;
    }

    const alert: CostAlert = {
      type,
      message,
      currentCost,
      budgetLimit,
      percentage,
      timestamp: new Date(),
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(alertKey, new Date());

    // Log alert
    logger.warn('AI cost alert triggered', {
      provider: 'AICostMonitor',
      type,
      message,
      currentCost: currentCost.toFixed(4),
      budgetLimit: budgetLimit.toFixed(2),
      percentage: percentage.toFixed(1) + '%',
    });

    // Update alert system metric
    alertSystem.updateMetric('ai_cost_budget_percentage', percentage);
  }

  /**
   * Get model pricing
   */
  private getModelPricing(model: string): { input: number; output: number } {
    // Try exact match
    if (AI_PRICING[model]) {
      return AI_PRICING[model];
    }

    // Try partial match
    for (const [key, pricing] of Object.entries(AI_PRICING)) {
      if (model.toLowerCase().includes(key.toLowerCase())) {
        return pricing;
      }
    }

    // Default fallback (GPT-4o-mini pricing)
    logger.warn('Unknown AI model, using default pricing', {
      provider: 'AICostMonitor',
      model,
    });
    return { input: 0.00015, output: 0.0006 };
  }

  /**
   * Get period start date
   */
  private getPeriodStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return startDate;
  }

  /**
   * Cleanup old data (keep last 90 days)
   */
  private cleanupOldData(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const before = this.calls.length;
    this.calls = this.calls.filter((call) => call.timestamp > cutoff);

    const removed = before - this.calls.length;
    if (removed > 0) {
      logger.info('Cleaned up old AI cost data', {
        provider: 'AICostMonitor',
        removed,
        remaining: this.calls.length,
      });
    }

    // Clean up old alerts (keep last 30 days)
    const alertCutoff = new Date();
    alertCutoff.setDate(alertCutoff.getDate() - 30);
    this.alerts = this.alerts.filter((alert) => alert.timestamp > alertCutoff);
  }

  /**
   * Reset cost data (for testing)
   */
  reset(): void {
    this.calls = [];
    this.alerts = [];
    this.lastAlertTime.clear();

    logger.info('AI cost data reset', {
      provider: 'AICostMonitor',
    });
  }
}

/**
 * Global AI cost monitor instance
 */
export const aiCostMonitor = AICostMonitor.getInstance();
