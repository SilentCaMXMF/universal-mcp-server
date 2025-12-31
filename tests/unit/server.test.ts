/**
 * Unit tests for MCPServer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../../src/core/server';
import type { MCPServerConfig, MCPRequest } from '../../src/types/index';
import { mockServerConfig, sampleRequests, TestUtils } from '../fixtures/test-data';

// Mock dependencies
vi.mock('../../src/utils/logger');
vi.mock('../../src/utils/metrics');
vi.mock('../../src/core/plugin-manager');
vi.mock('../../src/core/transport-manager');

describe('MCPServer', () => {
  let server: MCPServer;
  let config: MCPServerConfig;

  beforeEach(() => {
    config = { ...mockServerConfig };
    // Use random ports to avoid conflicts
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
      try {
        await server.stop();
      } catch (error) {
        // Ignore stop errors during cleanup
      }
    }
  });

  describe('Construction', () => {
    it('should create server with valid configuration', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(MCPServer);
    });

    it('should initialize with correct configuration', () => {
      const metrics = server.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.activeConnections).toBe(0);
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      await expect(server.start()).resolves.not.toThrow();

      // Verify server is running
      const metrics = server.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should throw error when starting already running server', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow('Server is already running');
    });

    it('should stop server successfully', async () => {
      await server.start();
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should handle stop when server is not running', async () => {
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('Request Processing', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should process tools/list request correctly', async () => {
      const request = sampleRequests.listTools;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.id).toBe(request.id);
      expect(response.result).toBeDefined();
      expect(response.result as any).toHaveProperty('tools');
      expect(Array.isArray((response.result as any).tools)).toBe(true);
    });

    it('should process tools/call request for built-in tools', async () => {
      const request = sampleRequests.callTool;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.id).toBe(request.id);
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should process resources/list request correctly', async () => {
      const request = sampleRequests.listResources;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.id).toBe(request.id);
      expect(response.result).toBeDefined();
      expect(response.result as any).toHaveProperty('resources');
      expect(Array.isArray((response.result as any).resources)).toBe(true);
    });

    it('should process server/info request correctly', async () => {
      const request = sampleRequests.serverInfo;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.id).toBe(request.id);
      expect(response.result).toBeDefined();
      expect(response.result).toHaveProperty('name');
      expect(response.result).toHaveProperty('version');
      expect(response.result).toHaveProperty('capabilities');
    });

    it('should handle invalid method request', async () => {
      const request = sampleRequests.invalidMethod;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.id).toBe(request.id);
      expect(response.result).toBeUndefined();
      expect(response.error).toBeDefined();
      expect(TestUtils.validateMCPError(response.error)).toBe(true);
      expect(response.error?.message).toContain('Unknown method');
    });

    it('should handle tool call without name', async () => {
      const request = sampleRequests.missingToolName;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.error).toBeDefined();
      expect(TestUtils.validateMCPError(response.error)).toBe(true);
      expect(response.error?.message).toContain('Tool name is required');
    });

    it('should handle call to unknown tool', async () => {
      const request = sampleRequests.unknownTool;
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.error).toBeDefined();
      expect(TestUtils.validateMCPError(response.error)).toBe(true);
      expect(response.error?.message).toContain('Unknown tool');
    });

    it('should handle resource read without URI', async () => {
      const request: MCPRequest = {
        id: 'test-read-no-uri',
        method: 'resources/read',
        params: {},
        timestamp: Date.now(),
      };
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.error).toBeDefined();
      expect(TestUtils.validateMCPError(response.error)).toBe(true);
      expect(response.error?.message).toContain('Resource URI is required');
    });

    it('should handle read of unknown resource', async () => {
      const request: MCPRequest = {
        id: 'test-read-unknown',
        method: 'resources/read',
        params: { uri: 'unknown://resource' },
        timestamp: Date.now(),
      };
      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.error).toBeDefined();
      expect(TestUtils.validateMCPError(response.error)).toBe(true);
      expect(response.error?.message).toContain('Resource not found');
    });
  });

  describe('Tool Management', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should register custom tool successfully', () => {
      const customTool = {
        name: 'custom_test_tool',
        description: 'A custom test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        handler: async (params: Record<string, unknown>) => {
          return { custom: params.input };
        },
      };

      server.registerTool(customTool);

      const tools = server.getTools();
      const customToolExists = tools.some(tool => tool.name === 'custom_test_tool');
      expect(customToolExists).toBe(true);
    });

    it('should unregister tool successfully', () => {
      // First register a tool
      const customTool = {
        name: 'tool_to_unregister',
        description: 'Tool to be unregistered',
        inputSchema: { type: 'object' },
        handler: async () => ({ result: 'test' }),
      };

      server.registerTool(customTool);
      expect(server.getTools().some(t => t.name === 'tool_to_unregister')).toBe(true);

      // Then unregister it
      server.unregisterTool('tool_to_unregister');
      expect(server.getTools().some(t => t.name === 'tool_to_unregister')).toBe(false);
    });

    it('should execute custom tool correctly', async () => {
      const customTool = {
        name: 'execute_test_tool',
        description: 'Tool for execution testing',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
          required: ['value'],
        },
        handler: async (params: Record<string, unknown>) => {
          return { executed: params.value };
        },
      };

      server.registerTool(customTool);

      const request: MCPRequest = {
        id: 'test-custom-tool',
        method: 'tools/call',
        params: {
          name: 'execute_test_tool',
          arguments: { value: 'test-value' },
        },
        timestamp: Date.now(),
      };

      const response = await server.processRequest(request);

      expect(TestUtils.validateMCPResponse(response)).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequest = {
        // Missing required fields
        method: 'tools/list',
      } as MCPRequest;

      // Should not throw, but return error response
      const response = await server.processRequest(malformedRequest);
      expect(TestUtils.validateMCPResponse(response)).toBe(true);
    });

    it('should handle tool handler errors', async () => {
      const errorTool = {
        name: 'error_tool',
        description: 'Tool that throws errors',
        inputSchema: { type: 'object' },
        handler: async () => {
          throw new Error('Test tool error');
        },
      };

      server.registerTool(errorTool);

      const request: MCPRequest = {
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
      expect(TestUtils.validateMCPError(response.error)).toBe(true);
      expect(response.error?.message).toContain('Test tool error');
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should return valid metrics', () => {
      const metrics = server.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.requestsTotal).toBe('number');
      expect(typeof metrics.requestsPerSecond).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.activeConnections).toBe('number');
      expect(metrics.memoryUsage).toBeDefined();
    });

    it('should track active connections', () => {
      const initialMetrics = server.getMetrics();
      expect(initialMetrics.activeConnections).toBe(0);
    });
  });

  describe('Events', () => {
    it('should emit started event', async () => {
      const startedSpy = vi.fn();
      server.addEventListener('started', startedSpy);

      await server.start();

      expect(startedSpy).toHaveBeenCalled();
    });

    it('should emit stopped event', async () => {
      const stoppedSpy = vi.fn();
      server.addEventListener('stopped', stoppedSpy);

      await server.start();
      await server.stop();

      expect(stoppedSpy).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should track connection activity when processing requests', async () => {
      const connectionId = 'test-connection-1';
      const request = sampleRequests.listTools;

      // Process request with connection ID
      await server.processRequest(request, connectionId);

      // Should not throw and metrics should be updated
      const metrics = server.getMetrics();
      expect(metrics.requestsTotal).toBeGreaterThan(0);
    });
  });
});
