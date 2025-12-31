/**
 * Logger utility for the MCP server
 */

import type { LoggingConfig } from '../types/index';

export class Logger {
  private config: LoggingConfig;
  private logLevel: number;

  constructor(config?: Partial<LoggingConfig>) {
    this.config = {
      level: 'info',
      format: 'text',
      ...config,
    };

    this.logLevel = this.getLogLevelNumber(this.config.level);
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    this.log('error', message, error);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const levelNum = this.getLogLevelNumber(level);

    if (levelNum < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data !== undefined && { data }),
    };

    if (this.config.format === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`);
    }
  }

  private getLogLevelNumber(level: string): number {
    switch (level) {
      case 'debug':
        return 0;
      case 'info':
        return 1;
      case 'warn':
        return 2;
      case 'error':
        return 3;
      default:
        return 1;
    }
  }
}
