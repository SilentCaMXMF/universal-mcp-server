# Getting Started with Universal MCP Server

This guide will help you get up and running with the Universal MCP Server quickly.

## Installation

```bash
npm install universal-mcp-server
```

## Basic Usage

### 1. Create a Simple Server

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
  transports: {
    websocket: { port: 3000 },
  },
});

await server.start();
console.log('Server is running!');
```

### 2. Add Custom Tools

```typescript
server.registerTool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate',
      },
    },
    required: ['expression'],
  },
  handler: async params => {
    // Safe evaluation would go here
    return { result: eval(params.expression) }; // Note: Use safe eval in production
  },
});
```

### 3. Handle Server Events

```typescript
server.addEventListener('connection', event => {
  console.log('New connection:', event.detail.id);
});

server.addEventListener('disconnection', event => {
  console.log('Connection closed:', event.detail);
});
```

## Configuration

### Server Configuration

```typescript
const config = {
  name: 'my-server',
  version: '1.0.0',
  description: 'My awesome MCP server',

  transports: {
    websocket: {
      port: 3000,
      host: 'localhost',
      path: '/mcp',
    },
    http: {
      port: 3001,
      cors: true,
      rateLimit: {
        windowMs: 60000,
        max: 100,
      },
    },
  },

  logging: {
    level: 'info',
    format: 'json',
    file: 'server.log',
  },

  security: {
    enableRateLimit: true,
    enableInputValidation: true,
    maxRequestSize: 1024 * 1024,
  },
};
```

### Transport Options

#### WebSocket

- `port`: Port number (required)
- `host`: Host address (default: 'localhost')
- `path`: WebSocket path (default: '/')
- `maxConnections`: Maximum concurrent connections

#### HTTP

- `port`: Port number (required)
- `host`: Host address (default: 'localhost')
- `path`: HTTP endpoint path (default: '/')
- `cors`: Enable CORS (default: true)
- `rateLimit`: Rate limiting configuration

#### Stdio

- `encoding`: Character encoding (default: 'utf8')
- `delimiter`: Message delimiter (default: '\n')

## Built-in Tools

The server includes several built-in tools:

### `server_info`

Get server information and status.

```json
{
  "name": "string",
  "version": "string",
  "uptime": "number",
  "memory": "object"
}
```

### `server_metrics`

Get performance metrics.

```json
{
  "requestsTotal": "number",
  "requestsPerSecond": "number",
  "averageResponseTime": "number",
  "errorRate": "number"
}
```

## MCP Protocol Support

The server supports the following MCP methods:

- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources
- `resources/read` - Read a resource
- `server/info` - Get server information

## Next Steps

- [Create custom plugins](./plugin-development.md)
- [View API reference](./api-reference.md)
- [Check examples](../examples/)
- [Learn about transports](./transports.md)

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
Error: listen EADDRINUSE :::3000
```

- Change the port in your configuration
- Kill the process using the port: `lsof -ti:3000 | xargs kill -9`

**Module not found:**

```bash
Error: Cannot find module 'universal-mcp-server'
```

- Ensure you've installed the package: `npm install universal-mcp-server`
- Check your Node.js version (requires 18+)

**Connection refused:**

- Verify the server is running
- Check the host and port configuration
- Ensure firewall isn't blocking the connection

### Getting Help

- [GitHub Issues](https://github.com/yourusername/universal-mcp-server/issues)
- [GitHub Discussions](https://github.com/yourusername/universal-mcp-server/discussions)
- [Documentation](./)

---

Need more help? Check out the [examples directory](../examples/) for complete working examples.
