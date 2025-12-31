/**
 * End-to-end tests for complete MCP workflows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../../src/core/server';
import { mockServerConfig, mockPlugin, sampleRequests, TestUtils } from '../fixtures/test-data';
import type { MCPServerConfig } from '../../src/types/index';

describe('E2E MCP Workflows', () => {
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
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Complete Tool Discovery and Execution Workflow', () => {
    it('should discover and execute all built-in tools', async () => {
      await server.start();

      // Step 1: Get list of all available tools
      const listRequest = sampleRequests.listTools;
      const listResponse = await server.processRequest(listRequest);

      expect(TestUtils.validateMCPResponse(listResponse)).toBe(true);
      expect(listResponse.result).toBeDefined();

      const tools = (listResponse.result as any).tools;
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(10);

      // Step 2: Execute a subset of tools with valid parameters
      const toolExecutions = [
        {
          name: 'echo',
          params: { message: 'E2E test echo' },
        },
        {
          name: 'get_system_info',
          params: {},
        },
        {
          name: 'server_info',
          params: {},
        },
        {
          name: 'server_metrics',
          params: {},
        },
      ];

      for (const tool of toolExecutions) {
        const executeRequest = {
          id: `e2e-${tool.name}`,
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: tool.params,
          },
          timestamp: Date.now(),
        };

        const response = await server.processRequest(executeRequest);

        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();
      }
    });

    it('should handle mixed plugin and built-in tool execution', async () => {
      await server.start();

      const mixedWorkflow = [
        // Built-in tool
        {
          name: 'echo',
          params: { message: 'Built-in tool test' },
        },
        // Plugin tool
        {
          name: 'test_tool',
          params: { input: 'Plugin tool test' },
        },
        // Server info tool
        {
          name: 'server_info',
          params: {},
        },
        // Another built-in tool
        {
          name: 'get_system_info',
          params: { include: ['platform', 'arch'] },
        },
      ];

      for (const [index, tool] of mixedWorkflow.entries()) {
        const request = {
          id: `mixed-workflow-${index}`,
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: tool.params,
          },
          timestamp: Date.now(),
        };

        const response = await server.processRequest(request);

        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();
      }
    });
  });

  describe('Resource Management Workflow', () => {
    it('should complete full resource lifecycle', async () => {
      await server.start();

      // Step 1: List all available resources
      const listRequest = sampleRequests.listResources;
      const listResponse = await server.processRequest(listRequest);

      expect(TestUtils.validateMCPResponse(listResponse)).toBe(true);
      expect(listResponse.result).toBeDefined();

      const resources = (listResponse.result as any).resources;
      expect(Array.isArray(resources)).toBe(true);

      if (resources.length > 0) {
        // Step 2: Read each available resource
        for (const resource of resources) {
          const readRequest = {
            id: `read-${resource.name}`,
            method: 'resources/read',
            params: {
              uri: resource.uri,
            },
            timestamp: Date.now(),
          };

          const readResponse = await server.processRequest(readRequest);

          expect(TestUtils.validateMCPResponse(readResponse)).toBe(true);
          expect(readResponse.result).toBeDefined();
          expect(readResponse.error).toBeUndefined();
        }
      }
    });

    it('should handle resource not found gracefully', async () => {
      await server.start();

      const readRequest = {
        id: 'read-non-existent',
        method: 'resources/read',
        params: {
          uri: 'nonexistent://resource',
        },
        timestamp: Date.now(),
      };

      const response = await server.processRequest(readRequest);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeUndefined();
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Resource not found');
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from individual tool failures', async () => {
      await server.start();

      const workflow = [
        // Successful request
        {
          id: 'success-1',
          request: sampleRequests.listTools,
        },
        // Failed request - unknown method
        {
          id: 'error-1',
          request: sampleRequests.invalidMethod,
        },
        // Failed request - unknown tool
        {
          id: 'error-2',
          request: sampleRequests.unknownTool,
        },
        // Successful request
        {
          id: 'success-2',
          request: {
            ...sampleRequests.callTool,
            id: 'success-2',
          },
        },
        // Failed request - missing parameters
        {
          id: 'error-3',
          request: sampleRequests.missingToolName,
        },
        // Successful request
        {
          id: 'success-3',
          request: sampleRequests.serverInfo,
        },
      ];

      const results: Array<{ id: string; response: any }> = [];
      for (const step of workflow) {
        const response = await server.processRequest(step.request);
        results.push({ id: step.id, response });
      }

      // Verify successful requests
      const successResults = results.filter(r => r.id.startsWith('success'));
      successResults.forEach(result => {
        expect(TestUtils.validateMCPResponse(result.response)).toBe(true);
        expect(result.response.result).toBeDefined();
        expect(result.response.error).toBeUndefined();
      });

      // Verify error responses
      const errorResults = results.filter(r => r.id.startsWith('error'));
      errorResults.forEach(result => {
        expect(TestUtils.validateMCPResponse(result.response)).toBe(true);
        expect(result.response.result).toBeUndefined();
        expect(result.response.error).toBeDefined();
      });

      // Server should still be functional
      expect(successResults).toHaveLength(3);
      expect(errorResults).toHaveLength(3);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      await server.start();

      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: `Concurrent message ${i}` },
        },
        timestamp: Date.now(),
      }));

      // Execute all requests concurrently
      const promises = concurrentRequests.map(request => server.processRequest(request));

      const responses = await Promise.all(promises);

      // All responses should be successful
      responses.forEach((response, index) => {
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();
        expect(response.id).toBe(`concurrent-${index}`);
      });

      // Verify metrics updated correctly
      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBeGreaterThanOrEqual(10);
    });

    it('should handle mixed concurrent requests with different tools', async () => {
      await server.start();

      const mixedRequests = [
        {
          id: 'mixed-echo',
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: { message: 'Echo test' },
          },
          timestamp: Date.now(),
        },
        {
          id: 'mixed-server-info',
          method: 'tools/call',
          params: {
            name: 'server_info',
            arguments: {},
          },
          timestamp: Date.now(),
        },
        {
          id: 'mixed-list-tools',
          method: 'tools/list',
          params: {},
          timestamp: Date.now(),
        },
        {
          id: 'mixed-system-info',
          method: 'tools/call',
          params: {
            name: 'get_system_info',
            arguments: {},
          },
          timestamp: Date.now(),
        },
        {
          id: 'mixed-server-metrics',
          method: 'tools/call',
          params: {
            name: 'server_metrics',
            arguments: {},
          },
          timestamp: Date.now(),
        },
      ];

      const promises = mixedRequests.map(request => server.processRequest(request));

      const responses = await Promise.all(promises);

      // All responses should be valid
      responses.forEach(response => {
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();
      });
    });
  });

  describe('Server Lifecycle Workflow', () => {
    it('should complete full server lifecycle with multiple restarts', async () => {
      // Start server
      await server.start();
      expect(server).toBeDefined();

      // Make requests while running
      const response1 = await server.processRequest(sampleRequests.listTools);
      expect(TestUtils.validateMCPResponse(response1)).toBe(true);

      // Stop server
      await server.stop();

      // Start again
      await server.start();

      // Make requests after restart
      const response2 = await server.processRequest(sampleRequests.serverInfo);
      expect(TestUtils.validateMCPResponse(response2)).toBe(true);

      // Final stop
      await server.stop();
    });

    it('should maintain plugin state across restarts when configured', async () => {
      await server.start();

      // Verify plugin tools are available
      const listResponse = await server.processRequest(sampleRequests.listTools);
      const tools = (listResponse.result as any).tools;
      expect(tools.some((t: any) => t.name === 'test_tool')).toBe(true);

      await server.stop();
      await server.start();

      // Verify plugin tools are still available after restart
      const listResponse2 = await server.processRequest(sampleRequests.listTools);
      const tools2 = (listResponse2.result as any).tools;
      expect(tools2.some((t: any) => t.name === 'test_tool')).toBe(true);
    });
  });

  describe('Complex Multi-Step Workflow', () => {
    it('should execute complex workflow with tool discovery, execution, and resource access', async () => {
      await server.start();

      // Step 1: Discover all capabilities
      const [toolsResponse, resourcesResponse, serverInfoResponse] = await Promise.all([
        server.processRequest(sampleRequests.listTools),
        server.processRequest(sampleRequests.listResources),
        server.processRequest(sampleRequests.serverInfo),
      ]);

      expect(TestUtils.validateMCPResponse(toolsResponse)).toBe(true);
      expect(TestUtils.validateMCPResponse(resourcesResponse)).toBe(true);
      expect(TestUtils.validateMCPResponse(serverInfoResponse)).toBe(true);

      // Step 2: Execute a variety of tools
      const toolNames = (toolsResponse.result as any).tools.map((t: any) => t.name);
      const sampleToolsToExecute = toolNames.filter((name: string) =>
        ['echo', 'get_system_info', 'server_metrics'].includes(name)
      );

      const executionResults = await Promise.all(
        sampleToolsToExecute.map((toolName: string) =>
          server.processRequest({
            id: `complex-${toolName}`,
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: toolName === 'echo' ? { message: 'Complex workflow test' } : {},
            },
            timestamp: Date.now(),
          })
        )
      );

      executionResults.forEach(response => {
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();
      });

      // Step 3: Access available resources
      const resources = (resourcesResponse.result as any).resources;
      if (resources.length > 0) {
        const resourceReads = await Promise.all(
          resources.slice(0, 3).map((resource: any) =>
            server.processRequest({
              id: `resource-read-${resource.name}`,
              method: 'resources/read',
              params: { uri: resource.uri },
              timestamp: Date.now(),
            })
          )
        );

        resourceReads.forEach(response => {
          expect(TestUtils.validateMCPResponse(response)).toBe(true);
          expect(response.result).toBeDefined();
          expect(response.error).toBeUndefined();
        });
      }

      // Step 4: Check final metrics
      const finalMetrics = await server.processRequest({
        id: 'final-metrics',
        method: 'tools/call',
        params: {
          name: 'server_metrics',
          arguments: {},
        },
        timestamp: Date.now(),
      });

      expect(TestUtils.validateMCPResponse(finalMetrics)).toBe(true);
      expect((finalMetrics.result as any).requestsTotal).toBeGreaterThan(5);
    });
  });

  describe('Performance Monitoring Workflow', () => {
    it('should track performance metrics across workflow', async () => {
      await server.start();

      const initialMetrics = server.getMetrics();
      expect(initialMetrics.requestsTotal).toBe(0);

      // Execute a series of requests
      const requests = Array.from({ length: 20 }, (_, i) => ({
        id: `perf-${i}`,
        method: i % 2 === 0 ? 'tools/list' : 'tools/call',
        params:
          i % 2 === 0
            ? {}
            : {
                name: 'echo',
                arguments: { message: `Performance test ${i}` },
              },
        timestamp: Date.now(),
      }));

      const startTime = Date.now();
      await Promise.all(requests.map(req => server.processRequest(req)));
      const endTime = Date.now();

      const finalMetrics = server.getMetrics();

      // Verify metrics tracking
      expect(finalMetrics.requestsTotal).toBeGreaterThanOrEqual(20);
      expect(finalMetrics.averageResponseTime).toBeGreaterThan(0);
      expect(finalMetrics.requestsPerSecond).toBeGreaterThan(0);

      // Verify reasonable response times
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / 20;
      expect(avgTimePerRequest).toBeLessThan(1000); // Less than 1 second per request
    });
  });

  describe('Security and Validation Workflow', () => {
    it('should validate all inputs properly', async () => {
      await server.start();

      const invalidRequests = [
        // Missing method
        { id: 'no-method', timestamp: Date.now() },
        // Invalid method type
        { id: 'invalid-method', method: 123, timestamp: Date.now() },
        // Missing params for tool call
        { id: 'missing-params', method: 'tools/call', timestamp: Date.now() },
        // Invalid JSON-RPC structure
        { jsonrpc: '2.0', method: 'tools/list', timestamp: Date.now() },
        // Extra invalid properties
        {
          id: 'extra-props',
          method: 'tools/list',
          params: {},
          invalid: 'property',
          timestamp: Date.now(),
        },
      ];

      for (const request of invalidRequests) {
        const response = await server.processRequest(request as any);

        // Should handle gracefully without crashing
        expect(response).toBeDefined();
        if (response.error) {
          expect(TestUtils.validateMCPError(response.error)).toBe(true);
        }
      }
    });
  });
});
