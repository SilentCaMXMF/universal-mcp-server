# Migration Guide

This guide helps you migrate from other MCP servers, HTTP APIs, and WebSocket servers to Universal MCP Server.

## Table of Contents

- [From Other MCP Servers](#from-other-mcp-servers)
- [From HTTP APIs](#from-http-apis)
- [From WebSocket Servers](#from-websocket-servers)
- [From Express.js Applications](#from-expressjs-applications)
- [From Fastify Applications](#from-fastify-applications)
- [From CLI Tools](#from-cli-tools)
- [Common Migration Patterns](#common-migration-patterns)

## From Other MCP Servers

### Generic MCP Server Migration

If you're migrating from a basic MCP server implementation:

#### Before (Basic MCP Server)

```typescript
// Basic MCP server implementation
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3000 });

wss.on('connection', ws => {
  ws.on('message', async data => {
    const request = JSON.parse(data.toString());

    if (request.method === 'tools/list') {
      const response = {
        id: request.id,
        result: {
          tools: [{ name: 'echo', description: 'Echo back input' }],
        },
      };
      ws.send(JSON.stringify(response));
    }

    if (request.method === 'tools/call') {
      if (request.params.name === 'echo') {
        const response = {
          id: request.id,
          result: {
            content: request.params.arguments.message,
          },
        };
        ws.send(JSON.stringify(response));
      }
    }
  });
});
```

#### After (Universal MCP Server)

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'my-migrated-server',
  version: '1.0.0',
  transports: {
    websocket: { port: 3000 },
  },
});

// Register the echo tool
server.registerTool({
  name: 'echo',
  description: 'Echo back input',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to echo' },
    },
    required: ['message'],
  },
  handler: async params => ({
    content: params.message,
  }),
});

await server.start();
console.log('🚀 Migrated MCP server running');
```

### From @modelcontextprotocol/server-sdk

If you're migrating from the official MCP SDK:

#### Before (Official SDK)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'my-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'my_tool',
        description: 'My custom tool',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
        },
      },
    ],
  };
});

server.setRequestHandler('tools/call', async request => {
  if (request.params.name === 'my_tool') {
    return {
      content: [
        {
          type: 'text',
          text: `Hello ${request.params.arguments.param}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### After (Universal MCP Server)

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transports: {
    stdio: {}, // or websocket/http
  },
});

// The tools/list and tools/call handlers are handled automatically
server.registerTool({
  name: 'my_tool',
  description: 'My custom tool',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string' },
    },
    required: ['param'],
  },
  handler: async params => ({
    content: [
      {
        type: 'text',
        text: `Hello ${params.param}`,
      },
    ],
  }),
});

await server.start();
```

## From HTTP APIs

### REST API Migration

Convert your REST API endpoints to MCP tools:

#### Before (REST API)

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// GET /api/files
app.get('/api/files', async (req, res) => {
  const files = await listFiles();
  res.json({ files });
});

// POST /api/calculate
app.post('/api/calculate', async (req, res) => {
  const { expression } = req.body;
  const result = await calculate(expression);
  res.json({ result });
});

// POST /api/webhook
app.post('/api/webhook', async (req, res) => {
  const { event, data } = req.body;
  await processWebhook(event, data);
  res.json({ success: true });
});

app.listen(3000);
```

#### After (Universal MCP Server)

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'api-migrated-server',
  version: '1.0.0',
  transports: {
    http: { port: 3000 },
  },
});

// Convert GET /api/files -> filesystem_list_files
server.registerTool({
  name: 'filesystem_list_files',
  description: 'List files in a directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path' },
    },
    required: ['path'],
  },
  handler: async params => {
    const files = await listFiles(params.path);
    return { files };
  },
});

// Convert POST /api/calculate -> calculate
server.registerTool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Mathematical expression' },
    },
    required: ['expression'],
  },
  handler: async params => {
    const result = await calculate(params.expression);
    return { result };
  },
});

// Convert POST /api/webhook -> process_webhook
server.registerTool({
  name: 'process_webhook',
  description: 'Process incoming webhook events',
  inputSchema: {
    type: 'object',
    properties: {
      event: { type: 'string', description: 'Webhook event type' },
      data: { type: 'object', description: 'Webhook payload' },
    },
    required: ['event', 'data'],
  },
  handler: async params => {
    await processWebhook(params.event, params.data);
    return { success: true };
  },
});

await server.start();
```

### GraphQL API Migration

#### Before (GraphQL)

```typescript
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      user: {
        type: GraphQLString,
        args: { id: { type: GraphQLString } },
        resolve: (_, { id }) => getUser(id),
      },
    },
  }),
});

app.post('/graphql', async (req, res) => {
  const result = await graphql({
    schema,
    source: req.body.query,
    variableValues: req.body.variables,
  });
  res.json(result);
});
```

#### After (Universal MCP Server)

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'graphql-migrated',
  version: '1.0.0',
  transports: {
    http: { port: 3000 },
  },
});

server.registerTool({
  name: 'get_user',
  description: 'Get user by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'User ID' },
    },
    required: ['id'],
  },
  handler: async params => {
    const user = await getUser(params.id);
    return { user };
  },
});

// If you need to support GraphQL queries, you can create a tool for that
server.registerTool({
  name: 'graphql_query',
  description: 'Execute GraphQL query',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'GraphQL query' },
      variables: { type: 'object', description: 'Query variables' },
    },
    required: ['query'],
  },
  handler: async params => {
    const result = await graphql({
      schema,
      source: params.query,
      variableValues: params.variables,
    });
    return result;
  },
});
```

## From WebSocket Servers

### Raw WebSocket Migration

#### Before (Raw WebSocket)

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', ws => {
  console.log('New connection');

  ws.on('message', async data => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'chat':
        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(
              JSON.stringify({
                type: 'chat_message',
                data: message.data,
              })
            );
          }
        });
        break;

      case 'get_data':
        const data = await fetchData(message.id);
        ws.send(
          JSON.stringify({
            type: 'data_response',
            data,
          })
        );
        break;
    }
  });

  ws.on('close', () => {
    console.log('Connection closed');
  });
});
```

#### After (Universal MCP Server)

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'websocket-migrated',
  version: '1.0.0',
  transports: {
    websocket: { port: 8080 },
  },
});

// Convert ping/pong -> server_info
server.registerTool({
  name: 'server_info',
  description: 'Get server information and ping status',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async params => ({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }),
});

// Convert chat -> broadcast_message
server.registerTool({
  name: 'broadcast_message',
  description: 'Send message to all connected clients',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to broadcast' },
      sender: { type: 'string', description: 'Sender name' },
    },
    required: ['message'],
  },
  handler: async params => {
    // Broadcast to all clients (handled by the transport layer)
    const transport = server.getTransportManager().getTransport('websocket');

    const broadcastData = {
      type: 'chat_message',
      data: {
        message: params.message,
        sender: params.sender,
        timestamp: new Date().toISOString(),
      },
    };

    await transport.broadcast(broadcastData);
    return { success: true, sent: true };
  },
});

// Convert get_data -> fetch_data
server.registerTool({
  name: 'fetch_data',
  description: 'Fetch data by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Data ID' },
    },
    required: ['id'],
  },
  handler: async params => {
    const data = await fetchData(params.id);
    return { data };
  },
});

await server.start();

// Listen to server events for additional functionality
server.addEventListener('connection', event => {
  console.log('New connection:', event.detail.id);
});

server.addEventListener('disconnection', event => {
  console.log('Connection closed:', event.detail);
});
```

### Socket.io Migration

#### Before (Socket.io)

```typescript
import { Server } from 'socket.io';

const io = new Server(3000);

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join_room', room => {
    socket.join(room);
    socket.emit('joined', { room });
  });

  socket.on('send_message', ({ room, message }) => {
    io.to(room).emit('receive_message', {
      message,
      sender: socket.id,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

#### After (Universal MCP Server)

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'socketio-migrated',
  version: '1.0.0',
  transports: {
    websocket: { port: 3000 },
  },
});

// Store room memberships (in production, use Redis or similar)
const rooms = new Map<string, Set<string>>();

server.registerTool({
  name: 'join_room',
  description: 'Join a chat room',
  inputSchema: {
    type: 'object',
    properties: {
      room: { type: 'string', description: 'Room name' },
      connectionId: { type: 'string', description: 'Connection ID' },
    },
    required: ['room', 'connectionId'],
  },
  handler: async params => {
    if (!rooms.has(params.room)) {
      rooms.set(params.room, new Set());
    }
    rooms.get(params.room)!.add(params.connectionId);

    // Join the connection to the room in the transport
    const transport = server.getTransportManager().getTransport('websocket');
    await transport.joinRoom(params.connectionId, params.room);

    return { room: params.room, joined: true };
  },
});

server.registerTool({
  name: 'send_room_message',
  description: 'Send message to a room',
  inputSchema: {
    type: 'object',
    properties: {
      room: { type: 'string', description: 'Room name' },
      message: { type: 'string', description: 'Message content' },
      sender: { type: 'string', description: 'Sender name' },
    },
    required: ['room', 'message'],
  },
  handler: async params => {
    const transport = server.getTransportManager().getTransport('websocket');

    const messageData = {
      type: 'room_message',
      room: params.room,
      message: params.message,
      sender: params.sender || 'anonymous',
      timestamp: new Date().toISOString(),
    };

    // Send to room members
    const roomMembers = rooms.get(params.room) || [];
    for (const connectionId of roomMembers) {
      await transport.send(connectionId, messageData);
    }

    return { success: true, room: params.room, sent: true };
  },
});

await server.start();
```

## From Express.js Applications

### Express Middleware Integration

If you have an existing Express application and want to add MCP capabilities:

#### Before (Express Only)

```typescript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Existing routes
app.get('/api/users', async (req, res) => {
  const users = await getUsers();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

#### After (Express + MCP)

```typescript
import express from 'express';
import cors from 'cors';
import { MCPServer } from 'universal-mcp-server';

const app = express();
app.use(cors());
app.use(express.json());

// Existing Express routes remain unchanged
app.get('/api/users', async (req, res) => {
  const users = await getUsers();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});

// Add MCP server on a different path
const mcpServer = new MCPServer({
  name: 'express-integrated',
  version: '1.0.0',
  transports: {
    http: {
      port: 3001,
      attachTo: app, // Attach to existing Express app
    },
  },
});

// Register tools that wrap existing functionality
mcpServer.registerTool({
  name: 'get_users',
  description: 'Get all users',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Limit results' },
      offset: { type: 'number', description: 'Offset results' },
    },
  },
  handler: async params => {
    const users = await getUsers(params.limit, params.offset);
    return { users };
  },
});

mcpServer.registerTool({
  name: 'create_user',
  description: 'Create a new user',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'User name' },
      email: { type: 'string', description: 'User email' },
      role: { type: 'string', description: 'User role' },
    },
    required: ['name', 'email'],
  },
  handler: async params => {
    const user = await createUser(params);
    return { user };
  },
});

// Start both servers
await mcpServer.start();

app.listen(3000, () => {
  console.log('Express server on port 3000');
  console.log('MCP server on port 3001');
});
```

## From Fastify Applications

### Fastify Integration

#### Before (Fastify Only)

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/api/products', async (request, reply) => {
  const products = await getProducts();
  return { products };
});

app.post('/api/products', async (request, reply) => {
  const product = await createProduct(request.body);
  return { product };
});

app.listen({ port: 3000 }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
```

#### After (Fastify + MCP)

```typescript
import Fastify from 'fastify';
import { MCPServer } from 'universal-mcp-server';

const app = Fastify({ logger: true });

// Existing Fastify routes
app.get('/api/products', async (request, reply) => {
  const products = await getProducts();
  return { products };
});

app.post('/api/products', async (request, reply) => {
  const product = await createProduct(request.body);
  return { product };
});

// Add MCP server
const mcpServer = new MCPServer({
  name: 'fastify-integrated',
  version: '1.0.0',
  transports: {
    http: {
      port: 3001,
      // Use custom Express app to integrate with Fastify
      attachTo: null, // We'll handle this manually
    },
  },
});

// Create Express bridge for MCP
import express from 'express';
const expressApp = express();
expressApp.use(express.json());

await mcpServer.start();

// Proxy MCP requests through Fastify
app.all('/mcp/*', async (request, reply) => {
  const mcpRequest = {
    id: Date.now().toString(),
    method: request.body.method,
    params: request.body.params,
  };

  const response = await mcpServer.processRequest(mcpRequest);
  reply.send(response);
});

// Register MCP tools
mcpServer.registerTool({
  name: 'get_products',
  description: 'Get all products',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by category' },
      limit: { type: 'number', description: 'Limit results' },
    },
  },
  handler: async params => {
    const products = await getProducts(params.category, params.limit);
    return { products };
  },
});

// Start both servers
app.listen({ port: 3000 }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log('Fastify server on port 3000');
  console.log('MCP API available at /mcp/*');
});
```

## From CLI Tools

### Command Line Tool Migration

#### Before (CLI Tool)

```bash
#!/usr/bin/env node
// cli-tool.js

const args = process.argv.slice(2);
const command = args[0];
const options = parseArgs(args);

switch (command) {
  case 'build':
    await buildProject(options);
    break;
  case 'test':
    await runTests(options);
    break;
  case 'deploy':
    await deployProject(options);
    break;
  case 'analyze':
    await analyzeProject(options);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
```

#### After (MCP Server + CLI)

```typescript
// mcp-cli-server.js
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'cli-tools-server',
  version: '1.0.0',
  transports: {
    stdio: {},
  },
});

server.registerTool({
  name: 'build_project',
  description: 'Build the project',
  inputSchema: {
    type: 'object',
    properties: {
      environment: {
        type: 'string',
        enum: ['development', 'staging', 'production'],
        default: 'development',
        description: 'Build environment',
      },
      clean: { type: 'boolean', default: false, description: 'Clean before build' },
      watch: { type: 'boolean', default: false, description: 'Watch for changes' },
    },
  },
  handler: async params => {
    return await buildProject(params);
  },
});

server.registerTool({
  name: 'run_tests',
  description: 'Run test suite',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Test pattern' },
      coverage: { type: 'boolean', default: false, description: 'Generate coverage' },
      watch: { type: 'boolean', default: false, description: 'Watch mode' },
      verbose: { type: 'boolean', default: false, description: 'Verbose output' },
    },
  },
  handler: async params => {
    return await runTests(params);
  },
});

server.registerTool({
  name: 'deploy_project',
  description: 'Deploy the project',
  inputSchema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        enum: ['staging', 'production'],
        description: 'Deployment target',
      },
      branch: { type: 'string', description: 'Git branch to deploy' },
      force: { type: 'boolean', default: false, description: 'Force deployment' },
    },
    required: ['target'],
  },
  handler: async params => {
    return await deployProject(params);
  },
});

server.registerTool({
  name: 'analyze_project',
  description: 'Analyze project dependencies and structure',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['dependencies', 'security', 'performance', 'size'],
        description: 'Analysis type',
      },
      output: {
        type: 'string',
        enum: ['json', 'table', 'csv'],
        default: 'json',
        description: 'Output format',
      },
    },
    required: ['type'],
  },
  handler: async params => {
    return await analyzeProject(params);
  },
});

await server.start();

// The CLI can now be used via stdio:
// echo '{"method":"tools/call","params":{"name":"build_project","arguments":{"environment":"production"}}}' | node mcp-cli-server.js
```

## Common Migration Patterns

### 1. API Endpoint to Tool Mapping

| HTTP Method         | MCP Tool Pattern            | Example              |
| ------------------- | --------------------------- | -------------------- |
| GET `/items`        | `get_items` or `list_items` | Fetch multiple items |
| GET `/items/:id`    | `get_item`                  | Fetch single item    |
| POST `/items`       | `create_item`               | Create new item      |
| PUT `/items/:id`    | `update_item`               | Update existing item |
| DELETE `/items/:id` | `delete_item`               | Delete item          |

### 2. Authentication Migration

#### Before (Custom Auth)

```typescript
app.use('/api', (req, res, next) => {
  const token = req.headers.authorization;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

#### After (MCP Auth)

```typescript
const server = new MCPServer({
  transports: {
    http: {
      port: 3000,
      auth: {
        bearer: {
          validate: async token => verifyToken(token),
        },
      },
    },
  },
});
```

### 3. Error Handling Migration

#### Before (Express Error Handler)

```typescript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});
```

#### After (MCP Error Handling)

```typescript
server.registerTool({
  name: 'my_tool',
  handler: async params => {
    try {
      // Your logic here
      return result;
    } catch (error) {
      // Error is automatically handled by MCP server
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  },
});
```

### 4. Validation Migration

#### Before (Manual Validation)

```typescript
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // Process request...
});
```

#### After (Schema Validation)

```typescript
server.registerTool({
  name: 'create_user',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'User name',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User email',
      },
    },
    required: ['name', 'email'],
  },
  handler: async params => {
    // params is already validated
    return await createUser(params);
  },
});
```

## Testing Your Migration

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { MCPServer } from 'universal-mcp-server';

describe('Migration Tests', () => {
  it('should handle migrated tools correctly', async () => {
    const server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      transports: { stdio: {} },
    });

    server.registerTool({
      name: 'migrated_tool',
      inputSchema: {
        type: 'object',
        properties: { param: { type: 'string' } },
        required: ['param'],
      },
      handler: async params => ({ result: `Processed ${params.param}` }),
    });

    const response = await server.processRequest({
      id: '1',
      method: 'tools/call',
      params: {
        name: 'migrated_tool',
        arguments: { param: 'test' },
      },
    });

    expect(response.result).toEqual({ result: 'Processed test' });
  });
});
```

### Integration Tests

```typescript
import { MCPClient } from 'universal-mcp-server';

describe('Client Integration', () => {
  it('should connect to migrated server', async () => {
    const client = new MCPClient({
      transport: {
        type: 'http',
        url: 'http://localhost:3001/api/mcp',
      },
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.some(t => t.name === 'migrated_tool')).toBe(true);
  });
});
```

## Best Practices

1. **Gradual Migration**: Migrate one endpoint/tool at a time
2. **Keep Existing APIs**: Maintain backward compatibility during transition
3. **Comprehensive Testing**: Test both old and new implementations
4. **Monitor Performance**: Compare performance before and after migration
5. **Document Changes**: Keep clear documentation of migration changes
6. **Rollback Plan**: Have a plan to rollback if issues arise

---

Need help with your specific migration? Check out the [examples directory](../examples/) or open an issue on GitHub.
