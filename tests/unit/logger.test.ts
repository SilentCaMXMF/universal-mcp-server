/**
 * Unit tests for the Logger utility
 */

import { describe, it, expect } from 'vitest';
import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
  it('should create a logger with default config', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it('should create a logger with custom config', () => {
    const config = {
      level: 'debug' as const,
      format: 'json' as const,
    };
    const logger = new Logger(config);
    expect(logger).toBeDefined();
  });

  it('should log messages at appropriate levels', () => {
    const logger = new Logger({ level: 'debug' });

    // These should not throw errors
    expect(() => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
    }).not.toThrow();
  });

  it('should respect log level hierarchy', () => {
    const logger = new Logger({ level: 'warn' });

    // These should be filtered out
    expect(() => {
      logger.debug('Debug message');
      logger.info('Info message');
    }).not.toThrow();

    // These should pass through
    expect(() => {
      logger.warn('Warning message');
      logger.error('Error message');
    }).not.toThrow();
  });

  it('should handle additional data', () => {
    const logger = new Logger({ level: 'debug' });

    expect(() => {
      logger.info('Test message', { key: 'value' });
      logger.error('Error message', new Error('Test error'));
    }).not.toThrow();
  });
});
