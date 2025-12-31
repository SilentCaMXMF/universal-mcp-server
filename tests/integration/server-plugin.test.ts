/**
 * Integration tests for server and plugin interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../../src/core/server';
import { PluginManager } from '../../src/core/plugin-manager';
import { Logger } from '../../src/utils/logger';
import { mockServerConfig, mockPlugin, sampleRequests, TestUtils } from '../fixtures/test-data';
import type { MCPServerConfig } from '../../src/types/index';

describe('Server-Plugin Integration', () => {
  let server: MCPServer;
  let config: MCPServerConfig;

  beforeEach(() => {
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

  describe('Plugin Loading Integration', () => {
    it('should load plugins and register their tools', async () => {
      await server.start();

      // Check that mock plugin tools are available
      const tools = server.getTools();
      const hasPluginTool = tools.some(tool => tool.name === 'test_tool');
      expect(hasPluginTool).toBe(true);
    });

    it('should make plugin tools callable via MCP requests', async () => {
      await server.start();

      const request = {
        id: 'test-plugin-tool',
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { input: 'integration test' },
        },
        timestamp: Date.now(),
      };

      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should register plugin resources', async () => {
      await server.start();

      const listResourcesRequest = sampleRequests.listResources;
      const response = await server.processRequest(listResourcesRequest);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeDefined();

      const resources = (response.result as any).resources;
      const hasPluginResource = resources.some(
        (resource: any) => resource.uri === 'test://resource'
      );
      expect(hasPluginResource).toBe(true);
    });

    it('should allow reading plugin resources', async () => {
      await server.start();

      const readResourceRequest = {
        id: 'test-read-resource',
        method: 'resources/read',
        params: {
          uri: 'test://resource',
        },
        timestamp: Date.now(),
      };

      const response = await server.processRequest(readResourceRequest);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });
  });

  describe('Plugin Error Handling Integration', () => {
    beforeEach(async () => {
      // Add error plugin to config
      config.plugins = [
        ...config.plugins!,
        {
          name: 'error-plugin',
          enabled: true,
        },
      ];
      server = new MCPServer(config);
      await server.start();
    });

    it('should handle plugin tool errors gracefully', async () => {
      const request = {
        id: 'test-error-tool',
        method: 'tools/call',
        params: {
          name: 'error_tool',
          arguments: {},
        },
        timestamp: Date.now(),
      };

      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeUndefined();
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Test error from plugin tool');
    });

    it('should continue serving other tools when one plugin fails', async () => {
      // First call error tool
      const errorRequest = {
        id: 'test-error-tool',
        method: 'tools/call',
        params: {
          name: 'error_tool',
          arguments: {},
        },
        timestamp: Date.now(),
      };

      const errorResponse = await server.processRequest(errorRequest);
      expect(errorResponse.error).toBeDefined();

      // Then call working tool
      const workingRequest = {
        id: 'test-working-tool',
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'test' },
        },
        timestamp: Date.now(),
      };

      const workingResponse = await server.processRequest(workingRequest);
      expect(workingResponse.result).toBeDefined();
      expect(workingResponse.error).toBeUndefined();
    });
  });

  describe('Tool Registration Integration', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should dynamically register and unregister tools', async () => {
      const customTool = {
        name: 'dynamic_tool',
        description: 'Tool registered at runtime',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
        handler: async (params: Record<string, unknown>) => {
          return { dynamic: params.value };
        },
      };

      // Register tool
      server.registerTool(customTool);
      expect(server.getTools().some(t => t.name === 'dynamic_tool')).toBe(true);

      // Call the tool
      const request = {
        id: 'test-dynamic-tool',
        method: 'tools/call',
        params: {
          name: 'dynamic_tool',
          arguments: { value: 'dynamic test' },
        },
        timestamp: Date.now(),
      };

      const response = await server.processRequest(request);
      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeDefined();

      // Unregister tool
      server.unregisterTool('dynamic_tool');
      expect(server.getTools().some(t => t.name === 'dynamic_tool')).toBe(false);
    });

    it('should list dynamically registered tools in tools/list', async () => {
      const dynamicTool = {
        name: 'list_test_tool',
        description: 'Tool for list testing',
        inputSchema: { type: 'object' },
        handler: async () => ({ listed: true }),
      };

      server.registerTool(dynamicTool);

      const request = sampleRequests.listTools;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      const tools = (response.result as any).tools;
      const hasDynamicTool = tools.some((tool: any) => tool.name === 'list_test_tool');
      expect(hasDynamicTool).toBe(true);
    });
  });

  describe('Metrics Integration', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should track request metrics across plugin interactions', async () => {
      // Make several requests
      const requests = [
        sampleRequests.listTools,
        {
          ...sampleRequests.callTool,
          id: 'metrics-test-1',
        },
        {
          ...sampleRequests.callTool,
          id: 'metrics-test-2',
          params: {
            name: 'test_tool',
            arguments: { input: 'metrics test' },
          },
        },
      ];

      for (const request of requests) {
        await server.processRequest(request);
      }

      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBeGreaterThanOrEqual(requests.length);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track error rates', async () => {
      // Make some successful requests
      await server.processRequest(sampleRequests.listTools);
      await server.processRequest(sampleRequests.callTool);

      // Make some error requests
      await server.processRequest(sampleRequests.invalidMethod);
      await server.processRequest(sampleRequests.unknownTool);

      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBe(4);
      expect(metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Connection Management Integration', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should track connection activity', async () => {
      const connectionId = 'test-connection-metrics';

      // Process multiple requests with same connection
      await server.processRequest(sampleRequests.listTools, connectionId);
      await server.processRequest(sampleRequests.callTool, connectionId);
      await server.processRequest(sampleRequests.serverInfo, connectionId);

      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBe(3);
      expect(metrics.activeConnections).toBe(0); // No actual transport connections in test
    });
  });

  describe('Plugin Lifecycle Integration', () => {
    it('should initialize plugins on server start', async () => {
      const mockLogger = new Logger({ level: 'info' });
      const pluginManager = new PluginManager(mockLogger);

      // Spy on plugin initialization
      const initializeSpy = vi.spyOn(pluginManager, 'initialize');

      config.plugins = [
        { name: 'lifecycle-test-1', enabled: true },
        { name: 'lifecycle-test-2', enabled: false },
      ];

      server = new MCPServer(config);
      await server.start();

      expect(initializeSpy).toHaveBeenCalledWith(config.plugins);
    });

    it('should cleanup plugins on server stop', async () => {
      const mockLogger = new Logger({ level: 'info' });
      const pluginManager = new PluginManager(mockLogger);

      // Spy on plugin cleanup
      const cleanupSpy = vi.spyOn(pluginManager, 'cleanup');

      server = new MCPServer(config);
      await server.start();
      await server.stop();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Built-in Tools Integration', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should have all built-in tools available', async () => {
      const request = sampleRequests.listTools;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);

      const tools = (response.result as any).tools;
      const builtinToolNames = [
        'echo',
        'list_files',
        'read_file',
        'write_file',
        'execute_command',
        'get_system_info',
        'http_request',
        'search_files',
        'create_directory',
        'delete_file',
        'server_info',
        'server_metrics',
      ];

      builtinToolNames.forEach(toolName => {
        const hasTool = tools.some((tool: any) => tool.name === toolName);
        expect(hasTool).toBe(true);
      });
    });

    it('should execute built-in tools successfully', async () => {
      const testRequests = [
        {
          ...sampleRequests.callTool,
          params: { name: 'echo', arguments: { message: 'integration test' } },
        },
        {
          id: 'test-server-info',
          method: 'tools/call',
          params: { name: 'server_info', arguments: {} },
        },
        {
          id: 'test-server-metrics',
          method: 'tools/call',
          params: { name: 'server_metrics', arguments: {} },
        },
      ];

      for (const request of testRequests) {
        const response = await server.processRequest(request);
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();
      }
    });
  });

  describe('Error Propagation Integration', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should propagate validation errors properly', async () => {
      const invalidRequests = [
        {
          id: 'invalid-1',
          method: 'tools/call',
          params: {}, // Missing name
          timestamp: Date.now(),
        },
        {
          id: 'invalid-2',
          method: 'tools/call',
          params: { name: 'echo' }, // Missing arguments
          timestamp: Date.now(),
        },
        {
          id: 'invalid-3',
          method: 'resources/read',
          params: {}, // Missing uri
          timestamp: Date.now(),
        },
      ];

      for (const request of invalidRequests) {
        const response = await server.processRequest(request);
        expect(TestUtils.validateMCPResponse(response)).toBe(true);
        expect(response.result).toBeUndefined();
        expect(response.error).toBeDefined();
      }
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        null,
        undefined,
        {},
        { method: 'invalid' },
        { id: 123, method: '' },
      ];

      for (const request of malformedRequests) {
        // Should not throw exceptions
        const response = await server.processRequest(request as any);
        expect(response).toBeDefined();
      }
    });
  });
});
