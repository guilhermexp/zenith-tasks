import { logger } from '@/utils/logger';

import { CreditInfo, getGatewayProvider } from './provider';

export interface CreditAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold?: number;
  currentBalance?: number;
  timestamp: Date;
}

export interface UsageProjection {
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  daysUntilEmpty: number;
  recommendedTopUp?: number;
}

export interface CreditStats {
  current: CreditInfo;
  alerts: CreditAlert[];
  projection: UsageProjection;
  recommendations: string[];
}

const logContext = { component: 'CreditMonitor' } as const;

export class CreditMonitor {
  private provider = getGatewayProvider();
  private usageHistory: Array<{ timestamp: Date; amount: number }> = [];
  private lastKnownBalance: number = 0;
  private alertThresholds = {
    warning: 20,    // Warning at $20
    critical: 5,     // Critical at $5
  };
  private alertCallbacks: Array<(alert: CreditAlert) => void> = [];

  /**
   * Get current credit status with alerts and projections
   */
  async getCreditStatus(): Promise<CreditStats> {
    const credits = await this.provider.getCredits();
    const alerts = this.checkAlerts(credits);
    const projection = this.calculateProjection(credits);
    const recommendations = this.generateRecommendations(credits, projection);

    // Track usage
    if (this.lastKnownBalance > 0 && this.lastKnownBalance > credits.balance) {
      const used = this.lastKnownBalance - credits.balance;
      this.usageHistory.push({
        timestamp: new Date(),
        amount: used
      });

      // Keep only last 30 days of history
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      this.usageHistory = this.usageHistory.filter(h => h.timestamp > thirtyDaysAgo);
    }
    this.lastKnownBalance = credits.balance;

    // Trigger alert callbacks
    for (const alert of alerts) {
      this.notifyAlertListeners(alert);
    }

    return {
      current: credits,
      alerts,
      projection,
      recommendations
    };
  }

  /**
   * Check for credit alerts
   */
  private checkAlerts(credits: CreditInfo): CreditAlert[] {
    const alerts: CreditAlert[] = [];

    // Critical alert
    if (credits.balance <= this.alertThresholds.critical) {
      alerts.push({
        type: 'critical',
        message: `Créditos críticos! Saldo atual: $${credits.balance.toFixed(2)}`,
        threshold: this.alertThresholds.critical,
        currentBalance: credits.balance,
        timestamp: new Date()
      });
    }
    // Warning alert
    else if (credits.balance <= this.alertThresholds.warning) {
      alerts.push({
        type: 'warning',
        message: `Créditos baixos. Saldo atual: $${credits.balance.toFixed(2)}`,
        threshold: this.alertThresholds.warning,
        currentBalance: credits.balance,
        timestamp: new Date()
      });
    }

    // Check rapid usage
    const recentUsage = this.getRecentUsage(1); // Last hour
    if (recentUsage > credits.balance * 0.1) {
      alerts.push({
        type: 'warning',
        message: `Uso elevado detectado: $${recentUsage.toFixed(2)} na última hora`,
        currentBalance: credits.balance,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Calculate usage projections
   */
  private calculateProjection(credits: CreditInfo): UsageProjection {
    // Calculate average daily usage
    const dailyUsage = this.calculateAverageDailyUsage();

    // Calculate projections
    const weeklyRate = dailyUsage * 7;
    const monthlyRate = dailyUsage * 30;

    // Calculate days until empty
    const daysUntilEmpty = dailyUsage > 0
      ? Math.floor(credits.balance / dailyUsage)
      : Infinity;

    // Calculate recommended top-up
    let recommendedTopUp = 0;
    if (daysUntilEmpty < 30) {
      // Recommend enough for 60 days
      recommendedTopUp = Math.ceil((dailyUsage * 60) - credits.balance);
    }

    return {
      dailyRate: dailyUsage,
      weeklyRate,
      monthlyRate,
      daysUntilEmpty,
      recommendedTopUp
    };
  }

  /**
   * Generate recommendations based on usage
   */
  private generateRecommendations(credits: CreditInfo, projection: UsageProjection): string[] {
    const recommendations: string[] = [];

    // Low balance recommendations
    if (credits.balance <= this.alertThresholds.critical) {
      recommendations.push('⚠️ Recarregue urgentemente seus créditos');
      recommendations.push('💡 Considere usar modelos mais econômicos temporariamente');
    } else if (credits.balance <= this.alertThresholds.warning) {
      recommendations.push('💰 Recarregue seus créditos em breve');
      recommendations.push('📊 Monitore seu uso nos próximos dias');
    }

    // High usage recommendations
    if (projection.dailyRate > 5) {
      recommendations.push('🔥 Uso diário elevado detectado');
      recommendations.push('💡 Considere otimizar prompts para reduzir tokens');
      recommendations.push('🎯 Use modelos específicos para cada contexto');
    }

    // Days until empty
    if (projection.daysUntilEmpty < 7) {
      recommendations.push(`⏰ Créditos durarão apenas ${projection.daysUntilEmpty} dias`);
      recommendations.push(`💵 Recarregue $${projection.recommendedTopUp} para 60 dias de uso`);
    } else if (projection.daysUntilEmpty < 30) {
      recommendations.push(`📅 Créditos suficientes para ${projection.daysUntilEmpty} dias`);
    }

    // Cost optimization
    if (projection.monthlyRate > 50) {
      recommendations.push('💸 Gasto mensal projetado acima de $50');
      recommendations.push('🔧 Revise configurações de modelo para economizar');
      recommendations.push('📈 Considere planos com desconto por volume');
    }

    return recommendations;
  }

  /**
   * Calculate average daily usage
   */
  private calculateAverageDailyUsage(): number {
    if (this.usageHistory.length === 0) {
      return 0;
    }

    // Group by day
    const dailyUsage = new Map<string, number>();

    for (const entry of this.usageHistory) {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      const current = dailyUsage.get(dateKey) || 0;
      dailyUsage.set(dateKey, current + entry.amount);
    }

    // Calculate average
    const totalDays = dailyUsage.size || 1;
    const totalUsage = Array.from(dailyUsage.values()).reduce((sum, val) => sum + val, 0);

    return totalUsage / totalDays;
  }

  /**
   * Get usage in recent time period (hours)
   */
  private getRecentUsage(hours: number): number {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    return this.usageHistory
      .filter(h => h.timestamp > cutoff)
      .reduce((sum, h) => sum + h.amount, 0);
  }

  /**
   * Set alert thresholds
   */
  setAlertThresholds(warning: number, critical: number): void {
    this.alertThresholds = { warning, critical };
    logger.info('CreditMonitor: alert thresholds updated', {
      warning,
      critical,
      ...logContext
    });
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: CreditAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Notify alert listeners
   */
  private notifyAlertListeners(alert: CreditAlert): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        logger.error('CreditMonitor: error in alert callback', error, logContext);
      }
    }
  }

  /**
   * Track manual usage (for accurate projections)
   */
  trackUsage(amount: number): void {
    this.usageHistory.push({
      timestamp: new Date(),
      amount
    });
  }

  /**
   * Get usage history
   */
  getUsageHistory(days: number = 7): Array<{ timestamp: Date; amount: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.usageHistory
      .filter(h => h.timestamp > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get spending by model
   */
  async getSpendingByModel(): Promise<Map<string, number>> {
    // This would require tracking model usage separately
    // For now, return empty map
    return new Map();
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(): {
    history: Array<{ timestamp: string; amount: number }>;
    dailyAverage: number;
    totalSpent: number;
    periodDays: number;
  } {
    const dailyAverage = this.calculateAverageDailyUsage();
    const totalSpent = this.usageHistory.reduce((sum, h) => sum + h.amount, 0);

    // Calculate period
    const oldestEntry = this.usageHistory[0];
    const newestEntry = this.usageHistory[this.usageHistory.length - 1];
    const periodDays = oldestEntry && newestEntry
      ? Math.ceil((newestEntry.timestamp.getTime() - oldestEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      history: this.usageHistory.map(h => ({
        timestamp: h.timestamp.toISOString(),
        amount: h.amount
      })),
      dailyAverage,
      totalSpent,
      periodDays
    };
  }

  /**
   * Clear usage history
   */
  clearHistory(): void {
    this.usageHistory = [];
    logger.info('CreditMonitor: usage history cleared', logContext);
  }
}

// Singleton instance
let monitorInstance: CreditMonitor | null = null;

export function getCreditMonitor(): CreditMonitor {
  if (!monitorInstance) {
    monitorInstance = new CreditMonitor();
  }
  return monitorInstance;
}
