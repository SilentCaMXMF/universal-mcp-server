"use strict";
/**
 * Metrics collector for the MCP server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
class MetricsCollector {
    constructor() {
        this.requestCount = 0;
        this.errorCount = 0;
        this.requestTimes = [];
        this.startTimestamp = Date.now();
    }
    recordRequest(duration, success) {
        this.requestCount++;
        if (!success) {
            this.errorCount++;
        }
        this.requestTimes.push(duration);
        // Keep only last 1000 requests for performance
        if (this.requestTimes.length > 1000) {
            this.requestTimes.shift();
        }
    }
    getMetrics() {
        const uptime = Date.now() - this.startTimestamp;
        const requestsPerSecond = uptime > 0 ? this.requestCount / (uptime / 1000) : 0;
        const averageResponseTime = this.requestTimes.length > 0
            ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
            : 0;
        const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
        return {
            requestsTotal: this.requestCount,
            requestsPerSecond,
            averageResponseTime,
            errorRate,
            activeConnections: 0, // This will be set by the server
            memoryUsage: process.memoryUsage(),
        };
    }
    reset() {
        this.requestCount = 0;
        this.errorCount = 0;
        this.requestTimes = [];
        this.startTimestamp = Date.now();
    }
}
exports.MetricsCollector = MetricsCollector;
//# sourceMappingURL=metrics.js.map