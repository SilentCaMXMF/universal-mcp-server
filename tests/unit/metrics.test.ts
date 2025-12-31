/**
 * Unit tests for MetricsCollector utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../src/utils/metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should initialize with zero metrics', () => {
    const result = metrics.getMetrics();
    expect(result.requestsTotal).toBe(0);
    expect(result.requestsPerSecond).toBe(0);
    expect(result.averageResponseTime).toBe(0);
    expect(result.errorRate).toBe(0);
  });

  it('should record successful requests', () => {
    metrics.recordRequest(100, true);
    metrics.recordRequest(200, true);

    const result = metrics.getMetrics();
    expect(result.requestsTotal).toBe(2);
    expect(result.errorRate).toBe(0);
    expect(result.averageResponseTime).toBe(150);
  });

  it('should record failed requests', () => {
    metrics.recordRequest(100, true);
    metrics.recordRequest(200, false);
    metrics.recordRequest(150, false);

    const result = metrics.getMetrics();
    expect(result.requestsTotal).toBe(3);
    expect(result.errorRate).toBe(2 / 3);
    expect(result.averageResponseTime).toBe(150);
  });

  it('should calculate requests per second', async () => {
    metrics.recordRequest(100, true);

    // Wait a bit to get non-zero time
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = metrics.getMetrics();
    expect(result.requestsPerSecond).toBeGreaterThan(0);
  });

  it('should reset metrics', () => {
    metrics.recordRequest(100, true);
    metrics.recordRequest(200, false);

    metrics.reset();

    const result = metrics.getMetrics();
    expect(result.requestsTotal).toBe(0);
    expect(result.requestsPerSecond).toBe(0);
    expect(result.averageResponseTime).toBe(0);
    expect(result.errorRate).toBe(0);
  });

  it('should include memory usage in metrics', () => {
    const result = metrics.getMetrics();
    expect(result.memoryUsage).toBeDefined();
    expect(typeof result.memoryUsage.heapUsed).toBe('number');
  });
});
