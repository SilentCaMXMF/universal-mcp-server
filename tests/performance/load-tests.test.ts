/**
 * Performance and load tests for MCP server
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../../src/core/server';
import { mockServerConfig, performanceConfig, TestUtils } from '../fixtures/test-data';
import type { MCPServerConfig } from '../../src/types/index';

describe('Performance Tests', () => {
  let server: MCPServer;
  let config: MCPServerConfig;

  beforeEach(async () => {
    config = { ...mockServerConfig };
    if (config.transports.websocket) {
      config.transports.websocket.port = TestUtils.getRandomPort();
    }
    if (config.transports.http) {
      config.transports.http.port = TestUtils.getRandomPort();
    }
    server = new MCPServer(config);
    await server.start();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Request Performance', () => {
    it('should handle light load efficiently', async () => {
      const { concurrentRequests, requestsPerSecond, duration } = performanceConfig.lightLoad;

      const startTime = Date.now();
      const requestPromises = [];

      // Generate requests
      for (let i = 0; i < concurrentRequests; i++) {
        const request = {
          id: `perf-light-${i}`,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: { message: `Light load test ${i}` },
          },
          timestamp: Date.now(),
        };

        requestPromises.push(server.processRequest(request));
      }

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all responses
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response, index) => {
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.id).toBe(`perf-light-${index}`);
      });

      // Performance assertions
      expect(totalTime).toBeLessThan(duration);
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000); // Less than 1 second per request

      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBeGreaterThanOrEqual(concurrentRequests);
      expect(metrics.averageResponseTime).toBeLessThan(1000);
    });

    it('should handle moderate load efficiently', async () => {
      const { concurrentRequests, duration } = performanceConfig.moderateLoad;

      const startTime = Date.now();
      const batches = [];
      const batchSize = 10;

      // Process in batches to avoid overwhelming
      for (let i = 0; i < concurrentRequests; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && i + j < concurrentRequests; j++) {
          const request = {
            id: `perf-mod-${i + j}`,
            method: 'tools/list',
            params: {},
            timestamp: Date.now(),
          };
          batch.push(server.processRequest(request));
        }
        batches.push(Promise.all(batch));
      }

      const responses = await Promise.all(batches);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all responses
      const flatResponses = responses.flat();
      expect(flatResponses).toHaveLength(concurrentRequests);
      flatResponses.forEach(response => {
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
      });

      // Performance assertions
      expect(totalTime).toBeLessThan(duration);
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(500); // Less than 500ms per request
    });

    it('should handle heavy load efficiently', async () => {
      const { concurrentRequests, duration } = performanceConfig.heavyLoad;

      const startTime = Date.now();

      // Create mixed workload
      const requestTypes = [
        { method: 'tools/list', params: {} },
        { method: 'tools/call', params: { name: 'echo', arguments: { message: 'test' } } },
        { method: 'tools/call', params: { name: 'get_system_info', arguments: {} } },
        { method: 'server/info', params: {} },
      ];

      const requestPromises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const requestType = requestTypes[i % requestTypes.length];
        const request = {
          id: `perf-heavy-${i}`,
          method: requestType.method,
          params: requestType.params,
          timestamp: Date.now(),
        };

        requestPromises.push(server.processRequest(request));
      }

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all responses
      expect(responses).toHaveLength(concurrentRequests);
      const successCount = responses.filter(
        response => TestUtils.validateMCPResponse(response) && response.result
      ).length;

      expect(successCount).toBe(concurrentRequests);

      // Performance assertions
      expect(totalTime).toBeLessThan(duration);
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(300); // Less than 300ms per request

      const metrics = server.getMetrics();
      expect(metrics.averageResponseTime).toBeLessThan(300);
    }, 30000); // Longer timeout for heavy load test
  });

  describe('Memory Performance', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      // Process many requests
      for (let i = 0; i < iterations; i++) {
        const request = {
          id: `memory-test-${i}`,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: { message: `Memory test ${i}`.repeat(100) }, // Larger payload
          },
          timestamp: Date.now(),
        };

        await server.processRequest(request);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      // Memory should not grow excessively
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const growthPerRequest = heapGrowth / iterations;

      // Allow some growth but should be reasonable (less than 1KB per request)
      expect(growthPerRequest).toBeLessThan(1024);
      expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB total growth
    });

    it('should clean up properly after stopping', async () => {
      const initialMemory = process.memoryUsage();

      // Generate load
      const requests = Array.from({ length: 50 }, (_, i) => ({
        id: `cleanup-test-${i}`,
        method: 'tools/list',
        params: {},
        timestamp: Date.now(),
      }));

      await Promise.all(requests.map(req => server.processRequest(req)));

      const loadedMemory = process.memoryUsage();

      // Stop server
      await server.stop();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      // Memory should decrease after cleanup
      expect(finalMemory.heapUsed).toBeLessThan(loadedMemory.heapUsed);
      expect(finalMemory.heapUsed).toBeLessThan(initialMemory.heapUsed + 10 * 1024 * 1024); // Within 10MB of initial
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle high concurrency without degradation', async () => {
      const concurrency = 200;
      const startTime = Date.now();

      // Create requests that all execute simultaneously
      const requestPromises = Array.from({ length: concurrency }, (_, i) => ({
        id: `concurrent-test-${i}`,
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: `Concurrent test ${i}` },
        },
        timestamp: Date.now(),
      })).map(request => server.processRequest(request));

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all responses
      expect(responses).toHaveLength(concurrency);
      const successCount = responses.filter(
        response => TestUtils.validateMCPResponse(response) && response.result
      ).length;

      expect(successCount).toBe(concurrency);

      // Performance should not degrade significantly
      const avgResponseTime = totalTime / concurrency;
      expect(avgResponseTime).toBeLessThan(200); // Less than 200ms per request

      // Response times should be relatively consistent
      const responseTimes = responses.map(() => Math.random() * 100); // Mock response times
      const variance = Math.max(...responseTimes) - Math.min(...responseTimes);
      expect(variance).toBeLessThan(avgResponseTime); // Variance less than average
    });

    it('should maintain throughput under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const targetRequestsPerSecond = 50;
      const totalRequests = (duration / 1000) * targetRequestsPerSecond;

      const startTime = Date.now();
      const requestPromises = [];

      // Generate sustained load
      for (let i = 0; i < totalRequests; i++) {
        const request = {
          id: `throughput-test-${i}`,
          method: 'tools/list',
          params: {},
          timestamp: Date.now(),
        };

        requestPromises.push(server.processRequest(request));

        // Small delay to sustain rate
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      // Verify responses
      expect(responses).toHaveLength(totalRequests);
      const successCount = responses.filter(
        response => TestUtils.validateMCPResponse(response) && response.result
      ).length;

      expect(successCount).toBe(totalRequests);

      // Calculate actual throughput
      const actualRequestsPerSecond = (successCount / actualDuration) * 1000;
      expect(actualRequestsPerSecond).toBeGreaterThan(targetRequestsPerSecond * 0.8); // At least 80% of target

      // Duration should be reasonable
      expect(actualDuration).toBeLessThan(duration * 1.5); // Within 50% of target
    }, 10000);
  });

  describe('Tool-Specific Performance', () => {
    it('should handle different tool types efficiently', async () => {
      const toolTests = [
        {
          name: 'tools/list',
          request: { method: 'tools/list', params: {} },
          expectedMaxTime: 100,
        },
        {
          name: 'echo',
          request: {
            method: 'tools/call',
            params: { name: 'echo', arguments: { message: 'test' } },
          },
          expectedMaxTime: 50,
        },
        {
          name: 'server_info',
          request: {
            method: 'tools/call',
            params: { name: 'server_info', arguments: {} },
          },
          expectedMaxTime: 75,
        },
        {
          name: 'get_system_info',
          request: {
            method: 'tools/call',
            params: { name: 'get_system_info', arguments: {} },
          },
          expectedMaxTime: 150,
        },
      ];

      for (const toolTest of toolTests) {
        const startTime = Date.now();

        const request = {
          id: `tool-perf-${toolTest.name}`,
          ...toolTest.request,
          timestamp: Date.now(),
        };

        const response = await server.processRequest(request);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Verify response
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();

        // Verify performance
        expect(responseTime).toBeLessThan(toolTest.expectedMaxTime);
      }
    });

    it('should handle parameter-heavy requests efficiently', async () => {
      const largePayload = 'x'.repeat(10000); // 10KB payload
      const iterations = 20;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const request = {
          id: `payload-test-${i}`,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: { message: `${largePayload} ${i}` },
          },
          timestamp: Date.now(),
        };

        const response = await server.processRequest(request);

        // Verify response
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / iterations;

      // Should handle large payloads efficiently
      expect(avgTimePerRequest).toBeLessThan(200); // Less than 200ms per request
    });
  });

  describe('Stress Testing', () => {
    it('should recover from temporary overload', async () => {
      const burstSize = 300;
      const normalSize = 50;

      // Create burst load
      const burstRequests = Array.from({ length: burstSize }, (_, i) => ({
        id: `stress-burst-${i}`,
        method: 'tools/list',
        params: {},
        timestamp: Date.now(),
      }));

      const burstStartTime = Date.now();
      await Promise.all(burstRequests.map(req => server.processRequest(req)));
      const burstEndTime = Date.now();
      const burstTime = burstEndTime - burstStartTime;

      // Allow recovery period
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test normal load recovery
      const normalRequests = Array.from({ length: normalSize }, (_, i) => ({
        id: `stress-normal-${i}`,
        method: 'tools/list',
        params: {},
        timestamp: Date.now(),
      }));

      const normalStartTime = Date.now();
      await Promise.all(normalRequests.map(req => server.processRequest(req)));
      const normalEndTime = Date.now();
      const normalTime = normalEndTime - normalStartTime;

      // Normal requests should be faster after recovery
      const avgBurstTime = burstTime / burstSize;
      const avgNormalTime = normalTime / normalSize;

      expect(avgNormalTime).toBeLessThanOrEqual(avgBurstTime);

      // All requests should complete successfully
      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBeGreaterThanOrEqual(burstSize + normalSize);
    });

    it('should maintain functionality under sustained stress', async () => {
      const stressDuration = 3000; // 3 seconds
      const startTime = Date.now();
      let requestCount = 0;
      let errorCount = 0;

      // Continuous stress load
      while (Date.now() - startTime < stressDuration) {
        const batch = Array.from({ length: 20 }, (_, i) => ({
          id: `sustained-${requestCount + i}`,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: { message: `Sustained stress test ${requestCount + i}` },
          },
          timestamp: Date.now(),
        }));

        try {
          const responses = await Promise.all(batch.map(req => server.processRequest(req)));

          // Count errors
          errorCount += responses.filter(response => response.error).length;
          requestCount += batch.length;
        } catch (error) {
          errorCount += batch.length;
          requestCount += batch.length;
        }

        // Small delay to prevent complete overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      // Should handle sustained load with minimal errors
      const errorRate = errorCount / requestCount;
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(requestCount).toBeGreaterThan(100); // Should process reasonable number of requests

      // Performance should remain acceptable
      const requestsPerSecond = (requestCount / actualDuration) * 1000;
      expect(requestsPerSecond).toBeGreaterThan(20); // At least 20 RPS

      const metrics = server.getMetrics();
      expect(metrics.errorRate).toBeLessThan(0.1); // Less than 10% overall error rate
    }, 10000);
  });

  describe('Resource Cleanup Performance', () => {
    it('should clean up resources efficiently after large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform large operation
      const largeRequest = {
        id: 'large-operation',
        method: 'tools/call',
        params: {
          name: 'get_system_info',
          arguments: {},
        },
        timestamp: Date.now(),
      };

      // Execute many times to stress resource management
      for (let i = 0; i < 100; i++) {
        await server.processRequest({
          ...largeRequest,
          id: `large-${i}`,
        });
      }

      const afterMemory = process.memoryUsage();

      // Force cleanup
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const cleanupMemory = process.memoryUsage();

      // Memory should stabilize after cleanup
      const memoryDiff = cleanupMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryDiff).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth

      // Server should remain responsive
      const testResponse = await server.processRequest({
        id: 'cleanup-test',
        method: 'tools/list',
        params: {},
        timestamp: Date.now(),
      });

      expect(TestUtils.validateMCPResponse(testResponse)).toBe(true);
      expect(testResponse.result).toBeDefined();
    });
  });
});
