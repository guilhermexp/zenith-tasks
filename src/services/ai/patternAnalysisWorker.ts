import { patternAnalyzer, PatternAnalysisConfig } from './patternAnalyzer';
import { ItemsService } from '../database/items';
import { patternSuggestionRepository } from '../database/patternRepository';
import { logger } from '@/utils/logger';
import type { DetectedPattern } from '@/types/ai-prioritization';

/**
 * Pattern Analysis Worker Configuration
 */
export interface WorkerConfig extends Partial<PatternAnalysisConfig> {
  processAllUsers?: boolean; // Process all users or only active ones
  activeUserDays?: number; // Consider users active if they created tasks in last N days
  notifyHighImpact?: boolean; // Send notifications for high impact suggestions
  maxUsersPerRun?: number; // Maximum users to process in one run
}

const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  processAllUsers: false,
  activeUserDays: 7,
  notifyHighImpact: true,
  maxUsersPerRun: 100,
  analysisInterval: 4, // hours
  minPatternThreshold: 3,
  confidenceThreshold: 0.6,
};

/**
 * Pattern Analysis Worker
 * Runs periodic analysis of user patterns and generates suggestions
 */
export class PatternAnalysisWorker {
  private config: WorkerConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
  }

  /**
   * Execute pattern analysis for all eligible users
   */
  async execute(): Promise<{
    usersProcessed: number;
    patternsDetected: number;
    suggestionsCreated: number;
    errors: number;
  }> {
    if (this.isRunning) {
      logger.warn('Pattern analysis worker already running', {
        provider: 'PatternAnalysisWorker',
      });
      throw new Error('Worker already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    logger.info('Pattern analysis worker started', {
      provider: 'PatternAnalysisWorker',
      config: this.config,
    });

    try {
      // Get list of users to process
      const userIds = await this.getEligibleUsers();

      logger.info('Users to process identified', {
        provider: 'PatternAnalysisWorker',
        count: userIds.length,
      });

      let usersProcessed = 0;
      let patternsDetected = 0;
      let suggestionsCreated = 0;
      let errors = 0;

      // Process each user
      for (const userId of userIds) {
        try {
          const result = await this.processUser(userId);
          usersProcessed++;
          patternsDetected += result.patternsDetected;
          suggestionsCreated += result.suggestionsCreated;

          logger.info('User processed successfully', {
            provider: 'PatternAnalysisWorker',
            userId,
            patternsDetected: result.patternsDetected,
            suggestionsCreated: result.suggestionsCreated,
          });
        } catch (error) {
          errors++;
          logger.error('Failed to process user', error, {
            provider: 'PatternAnalysisWorker',
            userId,
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Pattern analysis worker completed', {
        provider: 'PatternAnalysisWorker',
        usersProcessed,
        patternsDetected,
        suggestionsCreated,
        errors,
        duration,
      });

      return {
        usersProcessed,
        patternsDetected,
        suggestionsCreated,
        errors,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get list of eligible users for processing
   */
  private async getEligibleUsers(): Promise<string[]> {
    // For now, return a single test user
    // In production, this would query the database for all users
    // or only active users based on config

    // TODO: Implement proper user fetching logic
    // Example query: SELECT DISTINCT user_id FROM mind_flow_items
    // WHERE created_at >= NOW() - INTERVAL '7 days'
    // LIMIT maxUsersPerRun

    const users = ['test-user'];

    return users.slice(0, this.config.maxUsersPerRun || 100);
  }

  /**
   * Process a single user
   */
  private async processUser(
    userId: string
  ): Promise<{ patternsDetected: number; suggestionsCreated: number }> {
    logger.info('Processing user for pattern analysis', {
      provider: 'PatternAnalysisWorker',
      userId,
    });

    // Fetch user's tasks
    const tasks = await ItemsService.loadItems(userId);

    if (tasks.length < this.config.minPatternThreshold!) {
      logger.info('Not enough tasks for pattern analysis', {
        provider: 'PatternAnalysisWorker',
        userId,
        taskCount: tasks.length,
      });
      return { patternsDetected: 0, suggestionsCreated: 0 };
    }

    // Run pattern analysis
    const patterns = await patternAnalyzer.analyzePatterns(userId, tasks);

    // Patterns are already stored in the database by the analyzer
    // But we need to count high-impact suggestions for notifications

    const highImpactSuggestions = patterns.filter(
      (p) => p.suggestion.impact === 'high'
    );

    // Send notifications for high impact suggestions
    if (
      this.config.notifyHighImpact &&
      highImpactSuggestions.length > 0
    ) {
      await this.sendNotifications(userId, highImpactSuggestions);
    }

    return {
      patternsDetected: patterns.length,
      suggestionsCreated: patterns.length,
    };
  }

  /**
   * Send notifications for high impact suggestions
   */
  private async sendNotifications(
    userId: string,
    patterns: DetectedPattern[]
  ): Promise<void> {
    // TODO: Implement actual notification system
    // This could use email, push notifications, in-app notifications, etc.

    logger.info('Sending notifications for high impact suggestions', {
      provider: 'PatternAnalysisWorker',
      userId,
      count: patterns.length,
    });

    // For now, just log the suggestions
    patterns.forEach((pattern) => {
      logger.info('High impact suggestion', {
        provider: 'PatternAnalysisWorker',
        userId,
        type: pattern.type,
        title: pattern.suggestion.title,
        description: pattern.suggestion.description,
      });
    });

    // In production, you might:
    // - Send email via SendGrid/AWS SES
    // - Send push notification via Firebase/OneSignal
    // - Create in-app notification record
    // - Send webhook to external service
  }

  /**
   * Get recent suggestions for a user
   */
  async getRecentSuggestions(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    const suggestions =
      await patternSuggestionRepository.findActiveByUserId(userId);
    return suggestions.slice(0, limit);
  }

  /**
   * Accept a suggestion
   */
  async acceptSuggestion(suggestionId: string): Promise<void> {
    await patternSuggestionRepository.markAsAccepted(suggestionId);

    logger.info('Suggestion accepted', {
      provider: 'PatternAnalysisWorker',
      suggestionId,
    });
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    await patternSuggestionRepository.markAsDismissed(suggestionId);

    logger.info('Suggestion dismissed', {
      provider: 'PatternAnalysisWorker',
      suggestionId,
    });
  }
}

// Export singleton instance
export const patternAnalysisWorker = new PatternAnalysisWorker();
