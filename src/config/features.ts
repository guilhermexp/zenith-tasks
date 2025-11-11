/**
 * Feature Flag Configuration
 * Centralized feature flag management for AI-powered features
 *
 * Usage:
 * - Control feature rollout via environment variables
 * - Enable/disable features per user or globally
 * - A/B testing capabilities
 * - Admin controls for runtime feature toggling
 */

import { logger } from '@/utils/logger';

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique identifier for the feature */
  key: string;

  /** Human-readable name */
  name: string;

  /** Feature description */
  description: string;

  /** Whether feature is enabled globally */
  enabled: boolean;

  /** Environment-based override */
  environments?: {
    development?: boolean;
    staging?: boolean;
    production?: boolean;
  };

  /** Percentage rollout (0-100) */
  rolloutPercentage?: number;

  /** User IDs with explicit access */
  allowedUsers?: string[];

  /** User IDs explicitly blocked */
  blockedUsers?: string[];

  /** Feature dependencies (must be enabled for this to work) */
  dependencies?: string[];

  /** Date when feature becomes available */
  availableFrom?: Date;

  /** Date when feature is removed */
  availableUntil?: Date;
}

/**
 * Feature flag registry
 */
const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // ========================================
  // AI Prioritization Features
  // ========================================

  'ai-task-prioritization': {
    key: 'ai-task-prioritization',
    name: 'AI Task Prioritization',
    description: 'AI-powered task prioritization with contextual reasoning',
    enabled: getEnvFlag('FEATURE_AI_PRIORITIZATION', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'ai-pattern-analysis': {
    key: 'ai-pattern-analysis',
    name: 'Pattern Analysis',
    description: 'Automatic detection of recurring patterns and optimization opportunities',
    enabled: getEnvFlag('FEATURE_PATTERN_ANALYSIS', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
    dependencies: ['ai-task-prioritization'],
  },

  'ai-conflict-detection': {
    key: 'ai-conflict-detection',
    name: 'Conflict Detection',
    description: 'Real-time detection and resolution of scheduling conflicts',
    enabled: getEnvFlag('FEATURE_CONFLICT_DETECTION', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'ai-productivity-insights': {
    key: 'ai-productivity-insights',
    name: 'Productivity Insights',
    description: 'Analytics dashboard with AI-powered productivity insights',
    enabled: getEnvFlag('FEATURE_PRODUCTIVITY_INSIGHTS', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
    dependencies: ['ai-task-prioritization'],
  },

  // ========================================
  // AI Provider Features
  // ========================================

  'ai-multi-provider': {
    key: 'ai-multi-provider',
    name: 'Multi-Provider AI',
    description: 'Support for multiple AI providers (Google, OpenAI, Anthropic, XAI)',
    enabled: getEnvFlag('FEATURE_MULTI_PROVIDER', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'ai-provider-switching': {
    key: 'ai-provider-switching',
    name: 'Provider Switching',
    description: 'Allow users to switch between AI providers',
    enabled: getEnvFlag('FEATURE_PROVIDER_SWITCHING', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
    dependencies: ['ai-multi-provider'],
  },

  'ai-gateway-integration': {
    key: 'ai-gateway-integration',
    name: 'AI Gateway Integration',
    description: 'Portkey AI Gateway for unified AI access',
    enabled: getEnvFlag('FEATURE_AI_GATEWAY', false),
    environments: {
      development: true,
      staging: false,
      production: false,
    },
    rolloutPercentage: 0,
    dependencies: ['ai-multi-provider'],
  },

  // ========================================
  // Performance & Monitoring Features
  // ========================================

  'analytics-caching': {
    key: 'analytics-caching',
    name: 'Analytics Caching',
    description: 'In-memory caching for analytics results',
    enabled: getEnvFlag('FEATURE_ANALYTICS_CACHING', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'performance-monitoring': {
    key: 'performance-monitoring',
    name: 'Performance Monitoring',
    description: 'Real-time performance tracking and alerts',
    enabled: getEnvFlag('FEATURE_PERFORMANCE_MONITORING', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'ai-cost-monitoring': {
    key: 'ai-cost-monitoring',
    name: 'AI Cost Monitoring',
    description: 'Track and monitor AI usage costs',
    enabled: getEnvFlag('FEATURE_AI_COST_MONITORING', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  // ========================================
  // Experimental Features
  // ========================================

  'ai-voice-input': {
    key: 'ai-voice-input',
    name: 'Voice Input',
    description: 'Speech-to-text task creation',
    enabled: getEnvFlag('FEATURE_VOICE_INPUT', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'ai-subtask-generation': {
    key: 'ai-subtask-generation',
    name: 'Subtask Generation',
    description: 'AI-powered automatic subtask breakdown',
    enabled: getEnvFlag('FEATURE_SUBTASK_GENERATION', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  'ai-smart-inbox': {
    key: 'ai-smart-inbox',
    name: 'Smart Inbox',
    description: 'AI-powered text analysis and categorization',
    enabled: getEnvFlag('FEATURE_SMART_INBOX', true),
    environments: {
      development: true,
      staging: true,
      production: true,
    },
    rolloutPercentage: 100,
  },

  // ========================================
  // Beta/Testing Features
  // ========================================

  'ai-automatic-tagging': {
    key: 'ai-automatic-tagging',
    name: 'Automatic Tagging',
    description: 'AI-powered automatic task categorization',
    enabled: getEnvFlag('FEATURE_AUTO_TAGGING', false),
    environments: {
      development: true,
      staging: false,
      production: false,
    },
    rolloutPercentage: 0,
  },

  'ai-context-awareness': {
    key: 'ai-context-awareness',
    name: 'Context Awareness',
    description: 'AI maintains context across sessions',
    enabled: getEnvFlag('FEATURE_CONTEXT_AWARENESS', false),
    environments: {
      development: true,
      staging: false,
      production: false,
    },
    rolloutPercentage: 0,
  },
};

/**
 * Get environment variable as boolean
 */
function getEnvFlag(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Get current environment
 */
function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  // Check custom VERCEL_ENV first (Vercel-specific)
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'staging';

  // Fall back to NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';

  // Default to development for test and development
  return 'development';
}

/**
 * Calculate hash for percentage-based rollout
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if user is in rollout percentage
 */
function isUserInRollout(userId: string, percentage: number): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  const hash = hashUserId(userId);
  return (hash % 100) < percentage;
}

/**
 * Feature Flag Manager
 */
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: Map<string, FeatureFlag>;
  private overrides: Map<string, boolean>;

  private constructor() {
    this.flags = new Map(Object.entries(FEATURE_FLAGS));
    this.overrides = new Map();

    logger.info('FeatureFlagManager initialized', {
      provider: 'FeatureFlagManager',
      flagCount: this.flags.size,
      environment: getCurrentEnvironment(),
    });
  }

  static getInstance(): FeatureFlagManager {
    if (!this.instance) {
      this.instance = new FeatureFlagManager();
    }
    return this.instance;
  }

  /**
   * Check if a feature is enabled for a user
   */
  isEnabled(featureKey: string, userId?: string): boolean {
    // Check for admin override first
    if (this.overrides.has(featureKey)) {
      return this.overrides.get(featureKey)!;
    }

    const flag = this.flags.get(featureKey);
    if (!flag) {
      logger.warn('Unknown feature flag', {
        provider: 'FeatureFlagManager',
        featureKey,
      });
      return false;
    }

    // Check if feature is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check environment-specific override
    const currentEnv = getCurrentEnvironment();
    if (flag.environments && flag.environments[currentEnv] !== undefined) {
      if (!flag.environments[currentEnv]) {
        return false;
      }
    }

    // Check date range
    const now = new Date();
    if (flag.availableFrom && now < flag.availableFrom) {
      return false;
    }
    if (flag.availableUntil && now > flag.availableUntil) {
      return false;
    }

    // Check dependencies
    if (flag.dependencies) {
      for (const dependency of flag.dependencies) {
        if (!this.isEnabled(dependency, userId)) {
          logger.warn('Feature disabled due to dependency', {
            provider: 'FeatureFlagManager',
            featureKey,
            dependency,
          });
          return false;
        }
      }
    }

    // User-specific checks
    if (userId) {
      // Check if user is explicitly blocked
      if (flag.blockedUsers?.includes(userId)) {
        return false;
      }

      // Check if user is explicitly allowed
      if (flag.allowedUsers?.includes(userId)) {
        return true;
      }

      // Check percentage rollout
      if (flag.rolloutPercentage !== undefined) {
        return isUserInRollout(userId, flag.rolloutPercentage);
      }
    }

    // Default to globally enabled state
    return flag.enabled;
  }

  /**
   * Get all enabled features for a user
   */
  getEnabledFeatures(userId?: string): string[] {
    const enabled: string[] = [];

    for (const [key] of this.flags) {
      if (this.isEnabled(key, userId)) {
        enabled.push(key);
      }
    }

    return enabled;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  getFlag(featureKey: string): FeatureFlag | undefined {
    return this.flags.get(featureKey);
  }

  /**
   * Admin: Override a feature flag
   */
  setOverride(featureKey: string, enabled: boolean): void {
    this.overrides.set(featureKey, enabled);

    logger.info('Feature flag override set', {
      provider: 'FeatureFlagManager',
      featureKey,
      enabled,
    });
  }

  /**
   * Admin: Clear a feature flag override
   */
  clearOverride(featureKey: string): void {
    this.overrides.delete(featureKey);

    logger.info('Feature flag override cleared', {
      provider: 'FeatureFlagManager',
      featureKey,
    });
  }

  /**
   * Admin: Clear all overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();

    logger.info('All feature flag overrides cleared', {
      provider: 'FeatureFlagManager',
    });
  }

  /**
   * Admin: Update a feature flag configuration
   */
  updateFlag(featureKey: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(featureKey);
    if (!flag) {
      logger.error('Cannot update unknown feature flag', null, {
        provider: 'FeatureFlagManager',
        featureKey,
      });
      return;
    }

    const updatedFlag = { ...flag, ...updates };
    this.flags.set(featureKey, updatedFlag);

    logger.info('Feature flag updated', {
      provider: 'FeatureFlagManager',
      featureKey,
      updates,
    });
  }

  /**
   * Get feature flag statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    disabled: number;
    withDependencies: number;
    withRollout: number;
    overridden: number;
  } {
    const flags = Array.from(this.flags.values());

    return {
      total: flags.length,
      enabled: flags.filter(f => f.enabled).length,
      disabled: flags.filter(f => !f.enabled).length,
      withDependencies: flags.filter(f => f.dependencies && f.dependencies.length > 0).length,
      withRollout: flags.filter(f => f.rolloutPercentage !== undefined && f.rolloutPercentage < 100).length,
      overridden: this.overrides.size,
    };
  }
}

// Export singleton instance
export const featureFlagManager = FeatureFlagManager.getInstance();

// Convenience functions
export function isFeatureEnabled(featureKey: string, userId?: string): boolean {
  return featureFlagManager.isEnabled(featureKey, userId);
}

export function getEnabledFeatures(userId?: string): string[] {
  return featureFlagManager.getEnabledFeatures(userId);
}

export function getAllFeatureFlags(): FeatureFlag[] {
  return featureFlagManager.getAllFlags();
}

/**
 * React hook for feature flags (for future use with React components)
 *
 * Note: Not exported to avoid JSX in server-side code.
 * Implement in client components when needed:
 *
 * @example
 * function useFeatureFlag(featureKey: string, userId?: string): boolean {
 *   return isFeatureEnabled(featureKey, userId);
 * }
 */

/**
 * HOC for feature-gated components (for future use)
 *
 * Note: Not exported to avoid JSX in server-side code.
 * Implement in client components when needed:
 *
 * @example
 * export function withFeatureFlag(
 *   featureKey: string,
 *   FallbackComponent?: React.ComponentType
 * ) {
 *   return function <P extends object>(Component: React.ComponentType<P>) {
 *     return function FeatureGatedComponent(props: P & { userId?: string }) {
 *       const isEnabled = isFeatureEnabled(featureKey, props.userId);
 *       if (!isEnabled) return FallbackComponent ? <FallbackComponent /> : null;
 *       return <Component {...props} />;
 *     };
 *   };
 * }
 */

/**
 * Middleware helper for API routes
 */
export function requireFeature(featureKey: string) {
  return function (userId?: string): { allowed: boolean; message?: string } {
    const isEnabled = isFeatureEnabled(featureKey, userId);

    if (!isEnabled) {
      const flag = featureFlagManager.getFlag(featureKey);
      return {
        allowed: false,
        message: `Feature "${flag?.name || featureKey}" is not available`,
      };
    }

    return { allowed: true };
  };
}
