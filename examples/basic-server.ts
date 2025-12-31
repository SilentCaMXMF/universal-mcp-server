/**
 * Basic MCP Server example
 */

import { MCPServer } from '../src/index';

async function runBasicServer() {
  const server = new MCPServer({
    name: 'example-mcp-server',
    version: '1.0.0',
    description: 'A basic example MCP server',
    transports: {
      websocket: {
        port: 3000,
        host: 'localhost',
      },
      http: {
        port: 3001,
        host: 'localhost',
        cors: true,
      },
    },
    logging: {
      level: 'info',
      format: 'text',
    },
    security: {
      enableRateLimit: true,
      enableInputValidation: true,
      maxRequestSize: 1024 * 1024, // 1MB
    },
  });

  // Register a custom tool
  server.registerTool({
    name: 'echo',
    description: 'Echo the input text',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to echo back',
        },
      },
      required: ['text'],
    },
    handler: async params => {
      return { echo: params.text };
    },
  });

  // Handle server events
  server.addEventListener('started', () => {
    console.log('🚀 MCP Server started successfully!');
  });

  server.addEventListener('stopped', () => {
    console.log('🛑 MCP Server stopped');
  });

  server.addEventListener('connection', (event: any) => {
    const connection = event.detail;
    console.log(`🔗 New connection: ${connection.id} via ${connection.transport}`);
  });

  server.addEventListener('disconnection', (event: any) => {
    console.log(`❌ Connection closed: ${event.detail}`);
  });

  server.addEventListener('error', (event: any) => {
    console.error('💥 Server error:', event.detail);
  });

  try {
    await server.start();

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🔄 Shutting down server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runBasicServer();
}

export { runBasicServer };
