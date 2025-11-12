// Analytics tracking utilities
// Privacy-focused analytics without external dependencies

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface PageView {
  path: string;
  title: string;
  referrer: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

class Analytics {
  private static instance: Analytics;
  private sessionId: string;
  private userId?: string;
  private enabled: boolean = true;
  private queue: (AnalyticsEvent | PageView)[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupAutoFlush();
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.queue = [];
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Track page views
  trackPageView(path: string, title: string): void {
    if (!this.enabled) return;

    const pageView: PageView = {
      path,
      title,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.queue.push(pageView);
    this.log('Page View', pageView);
  }

  // Track custom events
  trackEvent(name: string, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.queue.push(event);
    this.log('Event', event);
  }

  // Predefined event trackers
  trackItemCreated(itemType: string): void {
    this.trackEvent('item_created', { itemType });
  }

  trackItemCompleted(itemType: string): void {
    this.trackEvent('item_completed', { itemType });
  }

  trackItemDeleted(itemType: string): void {
    this.trackEvent('item_deleted', { itemType });
  }

  trackAIInteraction(action: string, model?: string): void {
    this.trackEvent('ai_interaction', { action, model });
  }

  trackSearch(query: string, resultsCount: number): void {
    this.trackEvent('search', { query: query.substring(0, 50), resultsCount });
  }

  trackError(error: string, context?: string): void {
    this.trackEvent('error', { error, context });
  }

  trackFeatureUsed(feature: string): void {
    this.trackEvent('feature_used', { feature });
  }

  // Set up automatic flushing
  private setupAutoFlush(): void {
    if (typeof window === 'undefined') return;

    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  // Send analytics data to server
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const data = [...this.queue];
    this.queue = [];

    try {
      // Send to analytics endpoint
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: data,
        }),
      });

      if (!response.ok) {
        console.error('[Analytics] Failed to send data:', response.statusText);
        // Re-queue on failure
        this.queue.unshift(...data);
      }
    } catch (error) {
      console.error('[Analytics] Error sending data:', error);
      // Re-queue on error
      this.queue.unshift(...data);
    }
  }

  // Manual flush
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  // Log to console in development
  private log(type: string, data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Analytics] ${type}:`, data);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Export singleton instance
export const analytics = Analytics.getInstance();

// React hook for analytics
export const useAnalytics = () => {
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
    trackItemCreated: analytics.trackItemCreated.bind(analytics),
    trackItemCompleted: analytics.trackItemCompleted.bind(analytics),
    trackItemDeleted: analytics.trackItemDeleted.bind(analytics),
    trackAIInteraction: analytics.trackAIInteraction.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackFeatureUsed: analytics.trackFeatureUsed.bind(analytics),
  };
};

export default analytics;
