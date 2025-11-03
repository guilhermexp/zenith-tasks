/**
 * Testes do Logger
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { logger } from '@/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message', { context: 'test' });

      const logs = logger.getLogs('debug');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test debug message');
      expect(logs[0].level).toBe('debug');
    });

    it('should log info messages', () => {
      logger.info('Test info message', { userId: '123' });

      const logs = logger.getLogs('info');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test info message');
      expect(logs[0].context?.userId).toBe('123');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning', { source: 'test' });

      const logs = logger.getLogs('warn');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warn');
    });

    it('should log error messages with stack trace', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { operation: 'test' });

      const logs = logger.getLogs('error');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].stack).toBeDefined();
    });
  });

  describe('log filtering', () => {
    it('should filter logs by level', () => {
      logger.info('Info 1');
      logger.warn('Warning 1');
      logger.info('Info 2');
      logger.error('Error 1');

      const infoLogs = logger.getLogs('info');
      const warnLogs = logger.getLogs('warn');

      expect(infoLogs).toHaveLength(2);
      expect(warnLogs).toHaveLength(1);
    });

    it('should limit number of logs returned', () => {
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }

      const limited = logger.getLogs(undefined, 5);
      expect(limited).toHaveLength(5);
    });
  });

  describe('API logging utilities', () => {
    it('should log API requests', () => {
      logger.logApiRequest('/api/test', 'POST', { param: 'value' });

      const logs = logger.getLogs('info');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('API Request');
      expect(logs[0].message).toContain('POST');
      expect(logs[0].message).toContain('/api/test');
    });

    it('should log successful API responses', () => {
      logger.logApiResponse('/api/test', 200, 150);

      const logs = logger.getLogs('info');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('200');
      expect(logs[0].message).toContain('150ms');
    });

    it('should log failed API responses as errors', () => {
      logger.logApiResponse('/api/test', 500, 250);

      const logs = logger.getLogs('error');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('500');
    });

    it('should log API errors', () => {
      const error = new Error('API failure');
      logger.logApiError('/api/test', error, { method: 'GET' });

      const logs = logger.getLogs('error');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('API Error');
    });
  });

  describe('log management', () => {
    it('should clear all logs', () => {
      logger.info('Message 1');
      logger.warn('Message 2');
      logger.error('Message 3');

      expect(logger.getLogs()).toHaveLength(3);

      logger.clearLogs();

      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should maintain log size limit', () => {
      // Logger mantém max 1000 logs
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`);
      }

      const allLogs = logger.getLogs();
      expect(allLogs.length).toBeLessThanOrEqual(1000);
    });
  });
});
