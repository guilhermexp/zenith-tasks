type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);

    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private logToConsole(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.log(formattedMessage);
        }
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.log(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.addLog(entry);
    this.logToConsole('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.addLog(entry);
    this.logToConsole('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.addLog(entry);
    this.logToConsole('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: error instanceof Error ? error.stack : undefined
    };

    this.addLog(entry);
    this.logToConsole('error', message, context, error instanceof Error ? error : undefined);
  }

  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (limit) {
      return filtered.slice(-limit);
    }

    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Utility method for API routes
  logApiRequest(route: string, method: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${route}`, context);
  }

  logApiResponse(route: string, status: number, duration?: number, context?: LogContext): void {
    const message = `API Response: ${route} - ${status}${duration ? ` (${duration}ms)` : ''}`;

    if (status >= 500) {
      this.error(message, undefined, context);
    } else if (status >= 400) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  logApiError(route: string, error: Error | unknown, context?: LogContext): void {
    const message = `API Error: ${route}`;
    this.error(message, error, context);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export types
export type { LogLevel, LogContext, LogEntry };

// Helper functions for common logging patterns
export function logApiHandler<T extends unknown[]>(handler: (req: Request, ...args: T) => Promise<Response>) {
  return async function(req: Request, ...args: T): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(req.url);
    const method = req.method;
    const route = url.pathname;

    logger.logApiRequest(route, method, {
      headers: Object.fromEntries(req.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries())
    });

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;

      logger.logApiResponse(route, response.status, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.logApiError(route, error, {
        duration,
        method
      });

      throw error;
    }
  };
}

// Export for Next.js API routes
export function withLogger<T extends (...args: unknown[]) => Promise<unknown>>(handler: T): T {
  return (async (...args: unknown[]) => {
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      logger.error('Unhandled error in API route', error);
      throw error;
    }
  }) as T;
}
