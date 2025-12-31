/**
 * Multi-Transport Example
 *
 * This example demonstrates using multiple transport protocols
 * simultaneously with different configurations for each.
 */

import { MCPServer } from 'universal-mcp-server';
import * as fs from 'fs';

// Create server with multiple transports
const server = new MCPServer({
  name: 'multi-transport-server',
  version: '1.0.0',
  description: 'MCP Server with WebSocket, HTTP, and Stdio transports',

  // Multiple transport configurations
  transports: {
    // WebSocket for real-time clients
    websocket: {
      port: 3000,
      host: '0.0.0.0',
      path: '/mcp',
      maxConnections: 1000,
      pingInterval: 30000,
      pingTimeout: 5000,
      compression: true,
    },

    // HTTP for web clients and REST API
    http: {
      port: 3001,
      host: '0.0.0.0',
      path: '/api/v1/mcp',
      cors: {
        origin: ['http://localhost:3000', 'https://app.example.com'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000,
        message: 'Too many requests',
      },
    },

    // Stdio for CLI integration
    stdio: {
      encoding: 'utf8',
      delimiter: '\n',
      timeout: 60000,
      bufferSize: 10 * 1024 * 1024, // 10MB
    },
  },

  // Security configuration
  security: {
    enableRateLimit: true,
    enableInputValidation: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    allowedOrigins: ['http://localhost:3000', 'https://app.example.com'],
    maxConnectionsPerIP: 100,
  },

  // Logging configuration
  logging: {
    level: 'info',
    format: 'json',
    transports: {
      console: {
        enabled: true,
        colorize: true,
      },
      file: {
        enabled: true,
        path: '/var/log/mcp-server/multi-transport.log',
        maxSize: '100MB',
        maxFiles: 10,
      },
    },
  },
});

// Register tools that work across all transports

// Chat tool - works great with WebSocket real-time
server.registerTool({
  name: 'send_message',
  description: 'Send a message to all connected clients',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to send' },
      sender: { type: 'string', description: 'Sender name' },
      channel: { type: 'string', description: 'Chat channel' },
    },
    required: ['message', 'sender'],
  },
  handler: async (params, context) => {
    const messageData = {
      type: 'chat_message',
      data: {
        message: params.message,
        sender: params.sender,
        channel: params.channel || 'general',
        timestamp: new Date().toISOString(),
        transport: context?.transport,
      },
    };

    // Broadcast to WebSocket clients
    const wsTransport = server.getTransportManager().getTransport('websocket');
    if (wsTransport && wsTransport.broadcast) {
      await wsTransport.broadcast(messageData);
    }

    // Log message
    console.log('Message sent:', messageData);

    return {
      success: true,
      messageId: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      transport: context?.transport,
    };
  },
});

// File management tool - works well with HTTP requests
server.registerTool({
  name: 'list_files',
  description: 'List files in a directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list',
        default: '.',
      },
      recursive: {
        type: 'boolean',
        description: 'List files recursively',
        default: false,
      },
      showHidden: {
        type: 'boolean',
        description: 'Include hidden files',
        default: false,
      },
    },
  },
  handler: async params => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const targetPath = path.resolve(params.path);

    try {
      const items = await fs.readdir(targetPath, { withFileTypes: true });
      const files = [];

      for (const item of items) {
        // Skip hidden files unless requested
        if (!params.showHidden && item.name.startsWith('.')) {
          continue;
        }

        const stats = await fs.stat(path.join(targetPath, item.name));

        files.push({
          name: item.name,
          type: item.isFile() ? 'file' : 'directory',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          permissions: stats.mode.toString(8),
        });
      }

      return {
        path: params.path,
        files,
        count: files.length,
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  },
});

// System info tool - good for all transports
server.registerTool({
  name: 'system_info',
  description: 'Get system and server information',
  inputSchema: {
    type: 'object',
    properties: {
      includeMetrics: {
        type: 'boolean',
        description: 'Include performance metrics',
        default: false,
      },
      includeConnections: {
        type: 'boolean',
        description: 'Include connection information',
        default: false,
      },
    },
  },
  handler: async params => {
    const os = await import('os');

    const systemInfo = {
      server: {
        name: server.name,
        version: server.version,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      system: {
        hostname: os.hostname(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg(),
        networkInterfaces: os.networkInterfaces(),
      },
      transports: {
        websocket: {
          running: server.getTransportManager().getTransport('websocket')?.isConnected() || false,
          connections: server.getMetrics().activeConnections || 0,
        },
        http: {
          running: server.getTransportManager().getTransport('http')?.isConnected() || false,
        },
        stdio: {
          running: server.getTransportManager().getTransport('stdio')?.isConnected() || false,
        },
      },
    };

    if (params.includeMetrics) {
      systemInfo.metrics = server.getMetrics();
    }

    if (params.includeConnections) {
      systemInfo.connections = {
        active: server.getMetrics().activeConnections,
        total: server.getMetrics().totalConnections,
        byTransport: {
          websocket:
            server.getTransportManager().getTransport('websocket')?.getConnectionCount() || 0,
          http: server.getTransportManager().getTransport('http')?.getConnectionCount() || 0,
          stdio: server.getTransportManager().getTransport('stdio')?.getConnectionCount() || 0,
        },
      };
    }

    return systemInfo;
  },
});

// Transport-specific tool
server.registerTool({
  name: 'transport_test',
  description: 'Test connectivity to specific transport',
  inputSchema: {
    type: 'object',
    properties: {
      transport: {
        type: 'string',
        enum: ['websocket', 'http', 'stdio'],
        description: 'Transport to test',
      },
      testType: {
        type: 'string',
        enum: ['connectivity', 'latency', 'throughput'],
        description: 'Type of test to perform',
        default: 'connectivity',
      },
      iterations: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 10,
        description: 'Number of test iterations',
      },
    },
    required: ['transport'],
  },
  handler: async params => {
    const transport = server.getTransportManager().getTransport(params.transport);

    if (!transport) {
      throw new Error(`Transport '${params.transport}' not found`);
    }

    const results = {
      transport: params.transport,
      testType: params.testType,
      iterations: params.iterations,
      timestamp: new Date().toISOString(),
      results: [],
    };

    for (let i = 0; i < params.iterations; i++) {
      const startTime = process.hrtime.bigint();

      try {
        switch (params.testType) {
          case 'connectivity':
            const isConnected = transport.isConnected();
            results.results.push({
              iteration: i + 1,
              success: true,
              value: isConnected,
              timestamp: new Date().toISOString(),
            });
            break;

          case 'latency':
            // Simulate latency test
            const testStart = process.hrtime.bigint();
            await new Promise(resolve => setTimeout(resolve, 10));
            const testEnd = process.hrtime.bigint();
            const latency = Number(testEnd - testStart) / 1000000;

            results.results.push({
              iteration: i + 1,
              success: true,
              value: latency,
              timestamp: new Date().toISOString(),
            });
            break;

          case 'throughput':
            // Simulate throughput test
            const dataSize = 1024; // 1KB
            const testMessage = {
              id: `test_${i}_${Date.now()}`,
              method: 'tools/list',
              size: dataSize,
            };

            const throughputStart = process.hrtime.bigint();
            // This would normally send actual data through transport
            await new Promise(resolve => setTimeout(resolve, 50));
            const throughputEnd = process.hrtime.bigint();

            results.results.push({
              iteration: i + 1,
              success: true,
              value: dataSize,
              timestamp: new Date().toISOString(),
            });
            break;
        }

        const endTime = process.hrtime.bigint();
        const iterationTime = Number(endTime - startTime) / 1000000;

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.results.push({
          iteration: i + 1,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Calculate statistics
    const successfulTests = results.results.filter(r => r.success);
    const values = successfulTests.map(r => r.value);

    results.statistics = {
      successRate: (successfulTests.length / results.results.length) * 100,
      averageValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      minValue: values.length > 0 ? Math.min(...values) : 0,
      maxValue: values.length > 0 ? Math.max(...values) : 0,
      totalTests: results.results.length,
    };

    return results;
  },
});

// Event handlers for different transports
server.addEventListener('connection', (event: any) => {
  const connection = event.detail;
  console.log(`New connection on ${connection.transport}:`, {
    id: connection.id,
    remoteAddress: connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  // Track connections per transport
  server.getMetrics().incrementCounter('connections.total', {
    transport: connection.transport,
  });
});

server.addEventListener('disconnection', (event: any) => {
  const connection = event.detail;
  console.log(`Disconnection on ${connection.transport}:`, {
    id: connection.id,
    duration: connection.duration,
    reason: connection.reason,
    timestamp: new Date().toISOString(),
  });
});

server.addEventListener('request', (event: any) => {
  const request = event.detail;
  console.log(`Request via ${request.transport}:`, {
    id: request.id,
    method: request.method,
    timestamp: new Date().toISOString(),
  });
});

// Start the server with all transports
async function startServer() {
  try {
    await server.start();

    console.log('🚀 Multi-Transport MCP Server started!');
    console.log('\n📡 Transport Endpoints:');
    console.log('  WebSocket: ws://localhost:3000/mcp');
    console.log('  HTTP API:  http://localhost:3001/api/v1/mcp');
    console.log('  Stdio:    Available for CLI integration');
    console.log('\n🔧 Usage Examples:');
    console.log('  WebSocket: new WebSocket("ws://localhost:3000/mcp")');
    console.log('  HTTP:     fetch("http://localhost:3001/api/v1/mcp/tools/list")');
    console.log(
      '  Stdio:    echo \'{"method":"tools/list"}\' | node dist/server.js --transport stdio'
    );
    console.log('\n🛠️  Available Tools:');
    console.log('  - send_message: Send messages to clients');
    console.log('  - list_files: List directory contents');
    console.log('  - system_info: Get system information');
    console.log('  - transport_test: Test transport connectivity');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await server.stop();
  console.log('✅ Server stopped');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await server.stop();
  console.log('✅ Server stopped');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export { server };
