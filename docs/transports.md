# Transport Protocols

This guide covers all transport protocols supported by Universal MCP Server, their configuration options, and best practices for each.

## Overview

Universal MCP Server supports multiple transport protocols out of the box:

- **WebSocket** - Real-time bidirectional communication
- **HTTP** - Request-response pattern with REST API
- **Stdio** - Command-line interface and process communication

Each transport has its own strengths and is suitable for different use cases.

## WebSocket Transport

WebSocket provides real-time, full-duplex communication between client and server.

### Use Cases

- Real-time applications (chat, live updates)
- Browser-based clients
- Long-running connections
- Low-latency requirements

### Configuration

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transports: {
    websocket: {
      port: 3000,
      host: 'localhost',
      path: '/mcp',
      maxConnections: 1000,
      pingInterval: 30000,
      pingTimeout: 5000,
      compression: true,
      options: {
        // Additional ws options
        perMessageDeflate: {
          zlibDeflateOptions: {
            level: 3,
          },
        },
      },
    },
  },
});
```

### Configuration Options

| Option           | Type      | Default       | Description                    |
| ---------------- | --------- | ------------- | ------------------------------ |
| `port`           | `number`  | `3000`        | Port number to listen on       |
| `host`           | `string`  | `'localhost'` | Host address to bind to        |
| `path`           | `string`  | `'/'`         | WebSocket path                 |
| `maxConnections` | `number`  | `1000`        | Maximum concurrent connections |
| `pingInterval`   | `number`  | `30000`       | Ping interval in milliseconds  |
| `pingTimeout`    | `number`  | `5000`        | Ping timeout in milliseconds   |
| `compression`    | `boolean` | `true`        | Enable WebSocket compression   |
| `options`        | `object`  | `{}`          | Additional ws options          |

### Client Connection

```typescript
import { MCPClient } from 'universal-mcp-server';

const client = new MCPClient({
  transport: {
    type: 'websocket',
    url: 'ws://localhost:3000/mcp',
    options: {
      headers: {
        Authorization: 'Bearer token123',
      },
      protocols: ['mcp-v1'],
    },
  },
});

await client.connect();
```

### Browser Example

```html
<!DOCTYPE html>
<html>
  <head>
    <title>MCP WebSocket Client</title>
  </head>
  <body>
    <script>
      const ws = new WebSocket('ws://localhost:3000/mcp');

      ws.onopen = () => {
        console.log('Connected to MCP server');

        // List tools
        ws.send(
          JSON.stringify({
            id: '1',
            method: 'tools/list',
          })
        );
      };

      ws.onmessage = event => {
        const response = JSON.parse(event.data);
        console.log('Response:', response);
      };

      // Call a tool
      function callTool(name, args) {
        ws.send(
          JSON.stringify({
            id: Date.now().toString(),
            method: 'tools/call',
            params: { name, arguments: args },
          })
        );
      }
    </script>
  </body>
</html>
```

### Performance Considerations

- Enable compression for large payloads
- Use connection pooling for multiple clients
- Implement proper heartbeat mechanism
- Monitor memory usage with many connections

### Security

```typescript
const server = new MCPServer({
  // ... other config
  transports: {
    websocket: {
      port: 3000,
      verifyClient: async info => {
        // Custom client verification
        const token = info.req.headers['authorization'];
        return await verifyToken(token);
      },
    },
  },
  security: {
    enableRateLimit: true,
    maxConnectionsPerIP: 10,
    blacklist: ['192.168.1.100'],
  },
});
```

## HTTP Transport

HTTP transport provides a RESTful API interface for MCP communication.

### Use Cases

- Web applications
- API integration
- Mobile applications
- Firewalled environments
- Load balancer compatibility

### Configuration

```typescript
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transports: {
    http: {
      port: 3001,
      host: '0.0.0.0',
      path: '/api/mcp',
      cors: {
        origin: ['http://localhost:3000', 'https://myapp.com'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests
        message: 'Too many requests from this IP',
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
          },
        },
      },
    },
  },
});
```

### Configuration Options

| Option      | Type     | Default       | Description                    |
| ----------- | -------- | ------------- | ------------------------------ |
| `port`      | `number` | `3001`        | Port number                    |
| `host`      | `string` | `'localhost'` | Host address                   |
| `path`      | `string` | `'/'`         | API base path                  |
| `cors`      | `object` | `{}`          | CORS configuration             |
| `rateLimit` | `object` | `undefined`   | Rate limiting settings         |
| `helmet`    | `object` | `{}`          | Security headers configuration |

### API Endpoints

#### List Tools

```http
GET /api/mcp/tools
```

#### Call Tool

```http
POST /api/mcp/tools/{toolName}
Content-Type: application/json

{
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

#### List Resources

```http
GET /api/mcp/resources
```

#### Read Resource

```http
GET /api/mcp/resources?uri={resourceUri}
```

#### Server Info

```http
GET /api/mcp/server/info
```

### Client Example

```typescript
// Using fetch API
async function callTool(toolName: string, args: any) {
  const response = await fetch(`http://localhost:3001/api/mcp/tools/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
    },
    body: JSON.stringify({ arguments: args }),
  });

  return await response.json();
}

// List tools
async function listTools() {
  const response = await fetch('http://localhost:3001/api/mcp/tools');
  return await response.json();
}
```

### Integration with Web Frameworks

#### Express.js Integration

```typescript
import express from 'express';
import { MCPServer } from 'universal-mcp-server';

const app = express();
const mcpServer = new MCPServer({
  // ... MCP config
  transports: {
    http: {
      port: 3001,
      attachTo: app, // Attach to existing Express app
    },
  },
});

// Custom middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Your existing routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

await mcpServer.start();
```

#### Next.js API Route

```typescript
// pages/api/mcp/[...slug].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { MCPServer } from 'universal-mcp-server';

const mcpServer = new MCPServer({
  // ... config
  transports: {
    http: {
      port: 0, // Don't start server
      attachTo: null, // Manual handling
    },
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const mcpRequest = req.body;
    const response = await mcpServer.processRequest(mcpRequest);
    return res.json(response);
  }

  // Handle other methods...
}
```

## Stdio Transport

Stdio transport enables command-line communication and process integration.

### Use Cases

- CLI tools and scripts
- Process automation
- System integration
- Testing and debugging
- Legacy system integration

### Configuration

```typescript
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transports: {
    stdio: {
      encoding: 'utf8',
      delimiter: '\n',
      timeout: 30000,
      bufferSize: 1024 * 1024, // 1MB
      echo: true, // Echo input back to sender
    },
  },
});
```

### Configuration Options

| Option       | Type      | Default   | Description           |
| ------------ | --------- | --------- | --------------------- |
| `encoding`   | `string`  | `'utf8'`  | Character encoding    |
| `delimiter`  | `string`  | `'\n'`    | Message delimiter     |
| `timeout`    | `number`  | `30000`   | Request timeout in ms |
| `bufferSize` | `number`  | `1048576` | Buffer size in bytes  |
| `echo`       | `boolean` | `false`   | Echo input back       |

### CLI Usage

```bash
# Start server in stdio mode
node dist/server.js --transport stdio

# Interactive mode
echo '{"method":"tools/list"}' | node dist/server.js --transport stdio

# File processing
cat requests.json | node dist/server.js --transport stdio > responses.json
```

### Client Example

```typescript
import { spawn } from 'child_process';

class StdioMCPClient {
  private process: any;

  constructor(command: string, args: string[]) {
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stderr.on('data', (data: string) => {
      console.error('Server error:', data);
    });
  }

  async sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString();
      request.id = id;

      let response = '';
      const onData = (data: string) => {
        response += data;
        try {
          const lines = response.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line);
            if (parsed.id === id) {
              this.process.stdout.removeListener('data', onData);
              resolve(parsed);
            }
          }
        } catch (e) {
          // Incomplete JSON, continue reading
        }
      };

      this.process.stdout.on('data', onData);
      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Timeout
      setTimeout(() => {
        this.process.stdout.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }
}

// Usage
const client = new StdioMCPClient('node', ['dist/server.js', '--transport', 'stdio']);
const tools = await client.sendRequest({ method: 'tools/list' });
console.log('Available tools:', tools.result.tools);
```

### Integration with Shell Scripts

```bash
#!/bin/bash
# mcp-tools.sh - List and call MCP tools via stdio

SERVER_CMD="node dist/server.js --transport stdio"

# List tools
list_tools() {
    echo '{"method":"tools/list"}' | $SERVER_CMD | jq '.result.tools[] | {name: .name, description: .description}'
}

# Call a tool
call_tool() {
    local tool_name=$1
    shift
    local args=$(echo "$@" | jq -c .)

    echo "{\"method\":\"tools/call\",\"params\":{\"name\":\"$tool_name\",\"arguments\":$args}}" | $SERVER_CMD
}

# Usage examples
case $1 in
    "list")
        list_tools
        ;;
    "call")
        call_tool "$2" "${@:3}"
        ;;
    *)
        echo "Usage: $0 {list|call <tool> <args>}"
        exit 1
        ;;
esac
```

## Custom Transports

You can create custom transport protocols by implementing the Transport interface.

### Basic Custom Transport

```typescript
import { Transport, TransportManager } from 'universal-mcp-server';

class CustomTransport implements Transport {
  name = 'custom';
  private server: any;

  constructor(private options: any) {}

  async start(): Promise<void> {
    // Start your custom transport
    this.server = /* your transport implementation */;
    console.log('Custom transport started');
  }

  async stop(): Promise<void> {
    // Stop your transport
    if (this.server) {
      await this.server.close();
    }
    console.log('Custom transport stopped');
  }

  async send(connectionId: string, data: any): Promise<void> {
    // Send data to specific connection
    // Implementation depends on your transport
    await this.server.send(connectionId, data);
  }

  isConnected(): boolean {
    return this.server && this.server.isRunning();
  }

  // Handle incoming messages
  private onMessage(connectionId: string, message: string) {
    const data = JSON.parse(message);

    // Emit to MCP server
    this.emit('message', {
      connectionId,
      data
    });
  }
}

// Register custom transport
const transportManager = new TransportManager();
const customTransport = new CustomTransport({
  port: 4000,
  protocol: 'tcp'
});

transportManager.addTransport(customTransport);
```

### Multi-Transport Example

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer({
  name: 'multi-transport-server',
  version: '1.0.0',
  transports: {
    websocket: {
      port: 3000,
      // WebSocket config
    },
    http: {
      port: 3001,
      // HTTP config
    },
    stdio: {
      // Stdio config
    },
  },
});

// Clients can connect using any transport
// WebSocket: ws://localhost:3000
// HTTP: http://localhost:3001/api/mcp
// Stdio: node server.js --transport stdio
```

## Performance Optimization

### Connection Pooling

```typescript
// For HTTP transport
const server = new MCPServer({
  transports: {
    http: {
      port: 3001,
      keepAlive: true,
      keepAliveTimeout: 5000,
      maxSockets: 100,
      maxFreeSockets: 10,
    },
  },
});
```

### Buffer Management

```typescript
// WebSocket transport with optimized buffers
const server = new MCPServer({
  transports: {
    websocket: {
      port: 3000,
      maxPayload: 1024 * 1024, // 1MB
      bufferMaxEntries: 100,
      compressionLevel: 6,
    },
  },
});
```

### Load Balancing

For production deployments, use a reverse proxy:

```nginx
# nginx.conf
upstream mcp_servers {
    server localhost:3000;  # WebSocket
    server localhost:3001;  # HTTP
    server localhost:3002;  # HTTP (another instance)
}

server {
    listen 80;
    location /mcp/ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /mcp/api {
        proxy_pass http://mcp_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Best Practices

### Authentication

```typescript
const server = new MCPServer({
  transports: {
    websocket: {
      port: 3000,
      authenticate: async info => {
        const token = info.req.headers['authorization'];
        return await validateToken(token);
      },
    },
    http: {
      port: 3001,
      auth: {
        bearer: {
          validate: async token => validateToken(token),
        },
        apiKey: {
          header: 'x-api-key',
          validate: async key => validateApiKey(key),
        },
      },
    },
  },
});
```

### Rate Limiting

```typescript
const server = new MCPServer({
  transports: {
    http: {
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      },
    },
  },
  security: {
    globalRateLimit: {
      windowMs: 60000,
      max: 1000,
    },
  },
});
```

## Troubleshooting

### Common Issues

**WebSocket Connection Fails**

- Check firewall settings
- Verify port availability
- Ensure WebSocket headers are correct
- Check proxy configuration

**HTTP Transport Slow**

- Enable compression
- Implement caching
- Use connection pooling
- Monitor request patterns

**Stdio Transport Issues**

- Check process permissions
- Verify message delimiter
- Ensure proper encoding
- Monitor buffer sizes

### Debug Mode

```typescript
const server = new MCPServer({
  logging: {
    level: 'debug',
    transports: {
      console: true,
      file: {
        path: 'mcp-debug.log',
        level: 'debug',
      },
    },
  },
});
```

---

Need more examples? Check out the [examples directory](../examples/) for complete transport implementations.
