/**
 * Automated alerting system for system failures and performance issues
 */

import { logger } from '@/utils/logger'

export interface Alert {
  id: string
  type: 'error' | 'warning' | 'info' | 'critical'
  title: string
  message: string
  component: string
  timestamp: Date
  acknowledged: boolean
  resolved: boolean
  metadata?: Record<string, any>
  escalationLevel: number
}

export interface AlertRule {
  id: string
  name: string
  description: string
  condition: AlertCondition
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldownMinutes: number
  escalationRules: EscalationRule[]
  channels: NotificationChannel[]
}

export interface AlertCondition {
  metric: string
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains'
  threshold: number | string
  timeWindow?: number // minutes
  consecutiveFailures?: number
}

export interface EscalationRule {
  level: number
  delayMinutes: number
  channels: NotificationChannel[]
  action?: 'email' | 'webhook' | 'sms'
}

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'console' | 'dashboard'
  config: Record<string, any>
  enabled: boolean
}

export interface AlertMetrics {
  totalAlerts: number
  activeAlerts: number
  resolvedAlerts: number
  criticalAlerts: number
  alertsByComponent: Record<string, number>
  averageResolutionTime: number
}

interface MetricHistoryEntry {
  value: number | string
  timestamp: number
}

interface MetricData {
  current: number | string
  history: MetricHistoryEntry[]
  lastUpdated: number
}

export class AlertSystem {
  private static instance: AlertSystem
  private alerts: Map<string, Alert> = new Map()
  private rules: Map<string, AlertRule> = new Map()
  private metrics: Map<string, MetricData> = new Map()
  private lastAlertTime: Map<string, Date> = new Map()
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map()

  private constructor() {
    this.initializeDefaultRules()
    this.startMetricsCollection()
  }

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem()
    }
    return AlertSystem.instance
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5% over 5 minutes',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 0.05,
          timeWindow: 5,
          consecutiveFailures: 3
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
        escalationRules: [
          {
            level: 1,
            delayMinutes: 0,
            channels: [{ type: 'console', config: {}, enabled: true }]
          },
          {
            level: 2,
            delayMinutes: 10,
            channels: [{ type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL }, enabled: !!process.env.ALERT_WEBHOOK_URL }]
          }
        ],
        channels: [{ type: 'console', config: {}, enabled: true }]
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Alert when average response time exceeds 2 seconds',
        condition: {
          metric: 'avg_response_time',
          operator: 'gt',
          threshold: 2000,
          timeWindow: 10
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 30,
        escalationRules: [
          {
            level: 1,
            delayMinutes: 0,
            channels: [{ type: 'console', config: {}, enabled: true }]
          }
        ],
        channels: [{ type: 'console', config: {}, enabled: true }]
      },
      {
        id: 'database_connection_failure',
        name: 'Database Connection Failure',
        description: 'Alert when database connection fails',
        condition: {
          metric: 'db_connection_status',
          operator: 'eq',
          threshold: 'failed'
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        escalationRules: [
          {
            level: 1,
            delayMinutes: 0,
            channels: [{ type: 'console', config: {}, enabled: true }]
          },
          {
            level: 2,
            delayMinutes: 5,
            channels: [{ type: 'webhook', config: { url: process.env.CRITICAL_ALERT_WEBHOOK_URL }, enabled: !!process.env.CRITICAL_ALERT_WEBHOOK_URL }]
          }
        ],
        channels: [{ type: 'console', config: {}, enabled: true }]
      },
      {
        id: 'ai_provider_failure',
        name: 'AI Provider Failure',
        description: 'Alert when AI provider requests fail consistently',
        condition: {
          metric: 'ai_provider_error_rate',
          operator: 'gt',
          threshold: 0.8,
          consecutiveFailures: 5
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 20,
        escalationRules: [
          {
            level: 1,
            delayMinutes: 0,
            channels: [{ type: 'console', config: {}, enabled: true }]
          }
        ],
        channels: [{ type: 'console', config: {}, enabled: true }]
      },
      {
        id: 'memory_usage_high',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 85%',
        condition: {
          metric: 'memory_usage_percent',
          operator: 'gt',
          threshold: 85,
          timeWindow: 5
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 60,
        escalationRules: [
          {
            level: 1,
            delayMinutes: 0,
            channels: [{ type: 'console', config: {}, enabled: true }]
          }
        ],
        channels: [{ type: 'console', config: {}, enabled: true }]
      }
    ]

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule)
    }

    logger.info('[AlertSystem] Initialized default rules', {
      ruleCount: defaultRules.length
    })
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection() {
    // Collect system metrics every minute
    setInterval(() => {
      this.collectSystemMetrics()
    }, 60000)

    // Check alert conditions every 30 seconds
    setInterval(() => {
      this.checkAlertConditions()
    }, 30000)
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage()
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
      this.updateMetric('memory_usage_percent', memoryUsagePercent)

      // Process uptime
      this.updateMetric('uptime_seconds', process.uptime())

      // Current timestamp for time-based metrics
      this.updateMetric('last_metrics_collection', Date.now())

      logger.debug('[AlertSystem] Metrics collected', {
        memoryUsage: memoryUsagePercent.toFixed(2) + '%',
        uptime: Math.floor(process.uptime() / 60) + 'm'
      })
    } catch (error: any) {
      logger.error('[AlertSystem] Error collecting metrics', error)
    }
  }

  /**
   * Update a metric value
   */
  updateMetric(metric: string, value: number | string) {
    const now = Date.now()
    
    let metricData = this.metrics.get(metric)
    if (!metricData) {
      metricData = {
        current: value,
        history: [],
        lastUpdated: now
      }
      this.metrics.set(metric, metricData)
    }

    metricData.history.push({ value, timestamp: now })
    metricData.current = value
    metricData.lastUpdated = now

    // Keep only last 100 data points
    if (metricData.history.length > 100) {
      metricData.history = metricData.history.slice(-100)
    }
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions() {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue

      try {
        const shouldAlert = this.evaluateCondition(rule.condition)
        
        if (shouldAlert) {
          this.triggerAlert(rule)
        }
      } catch (error: any) {
        logger.error('[AlertSystem] Error checking condition', error, {
          ruleId: rule.id
        })
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(condition: AlertCondition): boolean {
    const metricData = this.metrics.get(condition.metric)
    if (!metricData) return false

    const threshold = condition.threshold

    const evaluateOperator = (value: number | string): boolean => {
      if (condition.operator === 'contains') {
        return String(value).includes(String(threshold))
      }

      const numericValue = typeof value === 'number' ? value : Number(value)
      const numericThreshold = typeof threshold === 'number' ? threshold : Number(threshold)

      switch (condition.operator) {
        case 'gt':
          return numericValue > numericThreshold
        case 'lt':
          return numericValue < numericThreshold
        case 'eq':
          return numericValue === numericThreshold
        case 'gte':
          return numericValue >= numericThreshold
        case 'lte':
          return numericValue <= numericThreshold
        default:
          return false
      }
    }

    let conditionMet = evaluateOperator(metricData.current)

    // Time window check
    if (condition.timeWindow && conditionMet) {
      const windowStart = Date.now() - (condition.timeWindow * 60 * 1000)
      const recentValues = metricData.history.filter((entry) => entry.timestamp >= windowStart)
      
      if (recentValues.length === 0) return false

      // Check if condition is met for the entire time window
      const allMet = recentValues.every(entry => evaluateOperator(entry.value))

      conditionMet = allMet
    }

    // Consecutive failures check
    if (condition.consecutiveFailures && conditionMet) {
      const recentValues = metricData.history.slice(-condition.consecutiveFailures)
      if (recentValues.length < condition.consecutiveFailures) return false

      const consecutiveMet = recentValues.every(entry => evaluateOperator(entry.value))

      conditionMet = consecutiveMet
    }

    return conditionMet
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule) {
    const now = new Date()
    
    // Check cooldown
    const lastAlert = this.lastAlertTime.get(rule.id)
    if (lastAlert) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000
      if (now.getTime() - lastAlert.getTime() < cooldownMs) {
        return // Still in cooldown
      }
    }

    const alertId = `${rule.id}_${Date.now()}`
    const alert: Alert = {
      id: alertId,
      type: rule.severity === 'critical' ? 'critical' : rule.severity === 'high' ? 'error' : 'warning',
      title: rule.name,
      message: rule.description,
      component: rule.condition.metric,
      timestamp: now,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      metadata: {
        ruleId: rule.id,
        condition: rule.condition,
        currentValue: this.metrics.get(rule.condition.metric)?.current
      }
    }

    this.alerts.set(alertId, alert)
    this.lastAlertTime.set(rule.id, now)

    // Send notifications
    this.sendNotifications(alert, rule.channels)

    // Set up escalation
    this.setupEscalation(alert, rule)

    logger.warn('[AlertSystem] Alert triggered', {
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.description
    })
  }

  /**
   * Send notifications
   */
  private async sendNotifications(alert: Alert, channels: NotificationChannel[]) {
    for (const channel of channels) {
      if (!channel.enabled) continue

      try {
        await this.sendNotification(alert, channel)
      } catch (error: any) {
        logger.error('[AlertSystem] Failed to send notification', error, {
          alertId: alert.id,
          channelType: channel.type
        })
      }
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(alert: Alert, channel: NotificationChannel) {
    switch (channel.type) {
      case 'console':
        console.warn(`🚨 ALERT: ${alert.title} - ${alert.message}`)
        break

      case 'webhook':
        if (channel.config.url) {
          const response = await fetch(channel.config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alert: {
                id: alert.id,
                title: alert.title,
                message: alert.message,
                type: alert.type,
                component: alert.component,
                timestamp: alert.timestamp.toISOString(),
                metadata: alert.metadata
              }
            })
          })

          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`)
          }
        }
        break

      case 'email':
        // Email implementation would go here
        logger.info('[AlertSystem] Email notification (not implemented)', {
          alertId: alert.id,
          recipient: channel.config.recipient
        })
        break

      case 'dashboard':
        // Dashboard notification would update UI state
        logger.info('[AlertSystem] Dashboard notification', {
          alertId: alert.id
        })
        break
    }
  }

  /**
   * Setup escalation for alert
   */
  private setupEscalation(alert: Alert, rule: AlertRule) {
    for (const escalationRule of rule.escalationRules) {
      if (escalationRule.level <= 1) continue // Level 1 already handled

      const delay = escalationRule.delayMinutes * 60 * 1000
      const timerId = setTimeout(() => {
        this.escalateAlert(alert, escalationRule)
      }, delay)

      this.escalationTimers.set(`${alert.id}_${escalationRule.level}`, timerId)
    }
  }

  /**
   * Escalate alert
   */
  private escalateAlert(alert: Alert, escalationRule: EscalationRule) {
    if (alert.resolved || alert.acknowledged) {
      return // Don't escalate if already resolved or acknowledged
    }

    alert.escalationLevel = escalationRule.level

    logger.warn('[AlertSystem] Alert escalated', {
      alertId: alert.id,
      level: escalationRule.level
    })

    // Send escalation notifications
    this.sendNotifications(alert, escalationRule.channels)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.acknowledged = true

    // Cancel escalation timers
    for (const [timerId, timer] of this.escalationTimers.entries()) {
      if (timerId.startsWith(alertId)) {
        clearTimeout(timer)
        this.escalationTimers.delete(timerId)
      }
    }

    logger.info('[AlertSystem] Alert acknowledged', { alertId })
    return true
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.resolved = true

    // Cancel escalation timers
    for (const [timerId, timer] of this.escalationTimers.entries()) {
      if (timerId.startsWith(alertId)) {
        clearTimeout(timer)
        this.escalationTimers.delete(timerId)
      }
    }

    logger.info('[AlertSystem] Alert resolved', { alertId })
    return true
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get alert metrics
   */
  getAlertMetrics(): AlertMetrics {
    const alerts = Array.from(this.alerts.values())
    const activeAlerts = alerts.filter(a => !a.resolved)
    const resolvedAlerts = alerts.filter(a => a.resolved)
    const criticalAlerts = alerts.filter(a => a.type === 'critical')

    const alertsByComponent: Record<string, number> = {}
    for (const alert of alerts) {
      alertsByComponent[alert.component] = (alertsByComponent[alert.component] || 0) + 1
    }

    // Calculate average resolution time
    const resolvedWithTime = resolvedAlerts.filter(a => a.acknowledged)
    const averageResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, alert) => {
          // This would need actual resolution timestamps
          return sum + 0 // Placeholder
        }, 0) / resolvedWithTime.length
      : 0

    return {
      totalAlerts: alerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      criticalAlerts: criticalAlerts.length,
      alertsByComponent,
      averageResolutionTime
    }
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule)
    logger.info('[AlertSystem] Alert rule added', { ruleId: rule.id })
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId)
    if (removed) {
      logger.info('[AlertSystem] Alert rule removed', { ruleId })
    }
    return removed
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanHours = 24): number {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000)
    let cleared = 0

    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp.getTime() < cutoff) {
        this.alerts.delete(alertId)
        cleared++
      }
    }

    logger.info('[AlertSystem] Cleared old alerts', { cleared })
    return cleared
  }
}

// Export singleton instance
export const alertSystem = AlertSystem.getInstance()
