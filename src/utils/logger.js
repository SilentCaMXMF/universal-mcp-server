"use strict";
/**
 * Logger utility for the MCP server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(config) {
        this.config = {
            level: 'info',
            format: 'text',
            ...config,
        };
        this.logLevel = this.getLogLevelNumber(this.config.level);
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, error) {
        this.log('error', message, error);
    }
    log(level, message, data) {
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
        }
        else {
            const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`);
        }
    }
    getLogLevelNumber(level) {
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
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map