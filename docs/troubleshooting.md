# Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with Universal MCP Server.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Startup Problems](#startup-problems)
- [Connection Issues](#connection-issues)
- [Performance Problems](#performance-problems)
- [Memory Leaks](#memory-leaks)
- [Tool Execution Errors](#tool-execution-errors)
- [Transport-Specific Issues](#transport-specific-issues)
- [Plugin Problems](#plugin-problems)
- [Security Issues](#security-issues)
- [Debugging Tools](#debugging-tools)

## Installation Issues

### Module Not Found Error

**Problem:**

```bash
Error: Cannot find module 'universal-mcp-server'
```

**Causes & Solutions:**

1. **Package not installed**

   ```bash
   npm install universal-mcp-server
   # or
   yarn add universal-mcp-server
   # or
   pnpm add universal-mcp-server
   ```

2. **Incorrect import path**

   ```typescript
   // ❌ Wrong
   import { MCPServer } from 'universal-mcp-server/dist';

   // ✅ Correct
   import { MCPServer } from 'universal-mcp-server';
   ```

3. **Node.js version too old**

   ```bash
   # Check version
   node --version

   # Upgrade to Node.js 18+
   nvm install 18
   nvm use 18
   ```

### TypeScript Compilation Errors

**Problem:**

```bash
error TS2307: Cannot find module 'universal-mcp-server' or its corresponding type declarations.
```

**Solutions:**

1. **Install type definitions**

   ```bash
   npm install --save-dev @types/node
   ```

2. **Check tsconfig.json**

   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true
     }
   }
   ```

3. **Use type imports**
   ```typescript
   import type { MCPServerConfig } from 'universal-mcp-server';
   import { MCPServer } from 'universal-mcp-server';
   ```

### Permission Errors

**Problem:**

```bash
Error: EACCES: permission denied, open '...'
```

**Solutions:**

1. **Fix npm permissions**

   ```bash
   sudo chown -R $(whoami) ~/.npm
   sudo chown -R $(whoami) /usr/local/lib/node_modules
   ```

2. **Use node version manager**
   ```bash
   # Use nvm to avoid permission issues
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   ```

## Startup Problems

### Port Already in Use

**Problem:**

```bash
Error: listen EADDRINUSE :::3000
```

**Solutions:**

1. **Kill the process using the port**

   ```bash
   # Find process
   lsof -ti:3000

   # Kill process
   kill -9 $(lsof -ti:3000)

   # Or use fuser
   fuser -k 3000/tcp
   ```

2. **Change the port in configuration**

   ```typescript
   const server = new MCPServer({
     transports: {
       websocket: { port: 3001 }, // Change port
       http: { port: 3002 },
     },
   });
   ```

3. **Check for multiple server instances**
   ```bash
   ps aux | grep node
   pkill -f "mcp-server"
   ```

### Configuration Errors

**Problem:**

```bash
Error: Invalid configuration: ...
```

**Common Issues & Solutions:**

1. **Missing required fields**

   ```typescript
   // ❌ Missing name or version
   const server = new MCPServer({ version: '1.0.0' });

   // ✅ Include required fields
   const server = new MCPServer({
     name: 'my-server',
     version: '1.0.0',
   });
   ```

2. **Invalid transport configuration**

   ```typescript
   // ❌ Invalid port
   transports: {
     websocket: {
       port: -1;
     }
   }

   // ✅ Valid configuration
   transports: {
     websocket: {
       port: 3000;
     }
   }
   ```

3. **Security configuration conflicts**

   ```typescript
   // ❌ Empty allowed origins with CORS enabled
   security: {
     allowedOrigins: [];
   }

   // ✅ Proper configuration
   security: {
     allowedOrigins: ['https://example.com'];
   }
   ```

### Plugin Loading Errors

**Problem:**

```bash
Error: Failed to load plugin: ...
```

**Solutions:**

1. **Check plugin file exists**

   ```bash
   ls -la plugins/
   ```

2. **Verify plugin exports**

   ```typescript
   // plugins/my-plugin.ts
   export class MyPlugin implements Plugin {
     name = 'my-plugin';
     version = '1.0.0';
     // ...
   }

   export default MyPlugin;
   ```

3. **Check plugin configuration**
   ```typescript
   plugins: [
     {
       name: 'my-plugin',
       enabled: true, // Must be enabled
       options: {
         requiredOption: 'value',
       },
     },
   ];
   ```

## Connection Issues

### WebSocket Connection Failures

**Problem:** WebSocket clients can't connect to server

**Debugging Steps:**

1. **Check if server is listening**

   ```bash
   netstat -tulpn | grep :3000
   # or
   ss -tulpn | grep :3000
   ```

2. **Test with WebSocket client**

   ```javascript
   const ws = new WebSocket('ws://localhost:3000');
   ws.onopen = () => console.log('Connected');
   ws.onerror = error => console.error('Connection error:', error);
   ```

3. **Check firewall settings**
   ```bash
   # Check if port is blocked
   sudo ufw status
   sudo iptables -L
   ```

**Common Solutions:**

```typescript
// Fix 1: Ensure proper host binding
transports: {
  websocket: {
    host: '0.0.0.0', // Bind to all interfaces
    port: 3000
  }
}

// Fix 2: Check path configuration
transports: {
  websocket: {
    path: '/mcp', // Must match client path
    port: 3000
  }
}

// Fix 3: Enable CORS if needed
transports: {
  websocket: {
    port: 3000,
    cors: {
      origin: ['http://localhost:3000']
    }
  }
}
```

### HTTP Connection Timeouts

**Problem:** HTTP requests timeout or fail

**Debugging:**

```bash
# Test connectivity
curl -v http://localhost:3001/health

# Check response time
time curl http://localhost:3001/api/mcp/tools/list
```

**Solutions:**

```typescript
// Increase timeout
transports: {
  http: {
    port: 3001,
    timeout: 60000 // 60 seconds
  }
}

// Add keep-alive
transports: {
  http: {
    port: 3001,
    keepAlive: true,
    keepAliveTimeout: 65000
  }
}

// Check rate limiting
transports: {
  http: {
    rateLimit: {
      windowMs: 60000,      // Increase window
      max: 1000,           // Increase limit
      skipSuccessfulRequests: true,
      skipFailedRequests: true
    }
  }
}
```

### SSL/TLS Certificate Issues

**Problem:** HTTPS connections fail with certificate errors

**Solutions:**

```typescript
// Configure SSL certificate
transports: {
  http: {
    port: 3443,
    ssl: {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.crt'),
      ca: fs.readFileSync('ca.crt'),
      rejectUnauthorized: true
    }
  }
}

// Or disable for development (not recommended for production)
transports: {
  http: {
    port: 3443,
    ssl: {
      rejectUnauthorized: false // Only for development
    }
  }
}
```

## Performance Problems

### High Memory Usage

**Problem:** Server memory usage continuously increases

**Debugging:**

```typescript
// Add memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
  });
}, 30000);
```

**Common Causes & Solutions:**

1. **Memory leaks in tools**

   ```typescript
   // ❌ Potential leak
   handler: async params => {
     global.cache = global.cache || [];
     global.cache.push(largeObject); // Never cleared
   };

   // ✅ Proper cleanup
   handler: async params => {
     const cache = new Map();
     cache.set('temp', largeObject);

     // Process...

     cache.clear(); // Clean up
   };
   ```

2. **Large objects in memory**

   ```typescript
   // Use streaming for large data
   handler: async params => {
     // ❌ Loading all data at once
     const data = await fs.readFile('huge-file.json');

     // ✅ Stream processing
     const stream = fs.createReadStream('huge-file.json');
     // Process stream chunks
   };
   ```

3. **Connection accumulation**
   ```typescript
   // Set connection limits
   transports: {
     websocket: {
       maxConnections: 1000,
       pingTimeout: 30000,      // Drop unresponsive connections
       pingInterval: 10000       // Regular health checks
     }
   }
   ```

### Slow Response Times

**Problem:** Tool calls take too long to respond

**Debugging:**

```typescript
// Add performance logging
server.registerTool({
  name: 'slow_tool',
  handler: async params => {
    const startTime = process.hrtime.bigint();

    try {
      // Your logic here
      const result = await expensiveOperation(params);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      console.log(`Tool execution time: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      console.error(`Tool failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },
});
```

**Optimization Strategies:**

1. **Implement caching**

   ```typescript
   const cache = new Map();

   handler: async params => {
     const cacheKey = JSON.stringify(params);

     if (cache.has(cacheKey)) {
       return cache.get(cacheKey);
     }

     const result = await expensiveOperation(params);
     cache.set(cacheKey, result);

     // Auto-expire
     setTimeout(() => cache.delete(cacheKey), 300000); // 5 minutes
     return result;
   };
   ```

2. **Use connection pooling**

   ```typescript
   // Database connection pool
   const pool = new Pool({
     max: 20,
     min: 5,
     idleTimeoutMillis: 30000,
   });
   ```

3. **Optimize I/O operations**

   ```typescript
   // ❌ Sequential operations
   const data1 = await fs.readFile('file1.txt');
   const data2 = await fs.readFile('file2.txt');
   const data3 = await fs.readFile('file3.txt');

   // ✅ Parallel operations
   const [data1, data2, data3] = await Promise.all([
     fs.readFile('file1.txt'),
     fs.readFile('file2.txt'),
     fs.readFile('file3.txt'),
   ]);
   ```

## Memory Leaks

### Detecting Memory Leaks

**Tool: Memory Leak Detector**

```typescript
class MemoryLeakDetector {
  private snapshots: Array<{ time: number; heap: number }> = [];
  private threshold = 10 * 1024 * 1024; // 10MB growth

  start() {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.snapshots.push({
        time: Date.now(),
        heap: usage.heapUsed,
      });

      // Keep only last 10 snapshots
      if (this.snapshots.length > 10) {
        this.snapshots.shift();
      }

      // Check for memory growth
      if (this.snapshots.length >= 10) {
        const oldest = this.snapshots[0];
        const newest = this.snapshots[this.snapshots.length - 1];
        const growth = newest.heap - oldest.heap;

        if (growth > this.threshold) {
          console.warn(`Memory leak detected: ${(growth / 1024 / 1024).toFixed(2)}MB growth`);

          // Trigger garbage collection for debugging
          if (global.gc) {
            global.gc();
            const afterGC = process.memoryUsage();
            const freed = newest.heap - afterGC.heapUsed;
            console.log(`Freed ${(freed / 1024 / 1024).toFixed(2)}MB after GC`);
          }
        }
      }
    }, 60000); // Check every minute
  }
}

// Start monitoring
const leakDetector = new MemoryLeakDetector();
leakDetector.start();
```

### Common Leak Causes

1. **Event listeners not removed**

   ```typescript
   // ❌ Listener never removed
   server.addEventListener('connection', event => {
     // Creates new listener each call
   });

   // ✅ Proper cleanup
   const handler = event => {
     /* ... */
   };
   server.addEventListener('connection', handler);
   // Later: server.removeEventListener('connection', handler);
   ```

2. **Timers not cleared**

   ```typescript
   // ❌ Timer never cleared
   handler: async params => {
     setInterval(() => {
       doSomething();
     }, 1000);
   };

   // ✅ Clear timer
   handler: async params => {
     const interval = setInterval(() => {
       doSomething();
     }, 1000);

     // Clear when done
     setTimeout(() => clearInterval(interval), 60000);
   };
   ```

3. **Caches growing indefinitely**

   ```typescript
   // ❌ Cache never cleaned
   const cache = new Map();

   // ✅ LRU cache with size limit
   class LRUCache {
     private cache = new Map();
     private maxSize = 100;

     get(key) {
       const value = this.cache.get(key);
       if (value !== undefined) {
         this.cache.delete(key);
         this.cache.set(key, value);
       }
       return value;
     }

     set(key, value) {
       if (this.cache.has(key)) {
         this.cache.delete(key);
       } else if (this.cache.size >= this.maxSize) {
         const firstKey = this.cache.keys().next().value;
         this.cache.delete(firstKey);
       }
       this.cache.set(key, value);
     }
   }
   ```

## Tool Execution Errors

### Invalid Tool Arguments

**Problem:** Tools reject valid-looking arguments

**Debugging:**

```typescript
// Add validation logging
server.registerTool({
  name: 'my_tool',
  inputSchema: {
    type: 'object',
    properties: {
      number: { type: 'number' },
      string: { type: 'string' },
    },
    required: ['number'],
  },
  handler: async params => {
    console.log('Received params:', JSON.stringify(params, null, 2));

    // Check types
    console.log('Types:', {
      number: typeof params.number,
      string: typeof params.string,
    });

    // Your logic here
  },
});
```

**Common Issues:**

1. **Type mismatch**

   ```typescript
   // Client sends string instead of number
   callTool('my_tool', { number: '123' }); // ❌

   // Should be:
   callTool('my_tool', { number: 123 }); // ✅
   ```

2. **Missing required fields**

   ```typescript
   // Missing required 'number' field
   callTool('my_tool', { string: 'hello' }); // ❌
   ```

3. **Additional properties not allowed**

   ```typescript
   inputSchema: {
     type: 'object',
     properties: {
       name: { type: 'string' }
     },
     additionalProperties: false // Disallows extra properties
   }

   // This will fail:
   callTool('my_tool', { name: "test", extra: "value" }) // ❌
   ```

### Async Handler Issues

**Problem:** Tool handlers not working correctly with async operations

**Common Issues:**

1. **Not returning promises**

   ```typescript
   // ❌ Not async
   handler: params => {
     fs.readFile('file.txt', 'utf8', (err, data) => {
       // This runs after handler returns
       return { content: data };
     });
   };

   // ✅ Proper async handling
   handler: async params => {
     const data = await fs.promises.readFile('file.txt', 'utf8');
     return { content: data };
   };
   ```

2. **Unhandled promise rejections**

   ```typescript
   // ❌ Unhandled rejection
   handler: async params => {
     throw new Error('Something went wrong'); // Not caught
   };

   // ✅ Proper error handling
   handler: async params => {
     try {
       const result = await riskyOperation(params);
       return result;
     } catch (error) {
       console.error('Tool error:', error);
       throw new Error(`Tool failed: ${error.message}`);
     }
   };
   ```

## Transport-Specific Issues

### WebSocket Transport

**Connection Drops**

```typescript
// Increase robustness
transports: {
  websocket: {
    port: 3000,
    pingInterval: 30000,     // Keep connection alive
    pingTimeout: 5000,        // Quick disconnect detection
    compression: true,         // Reduce bandwidth
    maxPayload: 10 * 1024 * 1024 // Increase payload limit
  }
}

// Client-side reconnection
const client = new MCPClient({
  transport: {
    type: 'websocket',
    url: 'ws://localhost:3000',
    reconnect: {
      enabled: true,
      attempts: 5,
      delay: 1000,
      backoff: 'exponential'
    }
  }
});
```

### HTTP Transport

**Rate Limiting Issues**

```typescript
// Adjust rate limiting
transports: {
  http: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 1000,                  // Increased limit
      skipSuccessfulRequests: true,   // Don't count successful requests
      skipFailedRequests: false,     // Count failed requests
      standardHeaders: true,        // Send rate limit headers
      legacyHeaders: false
    }
  }
}
```

### Stdio Transport

**Buffer Overflows**

```typescript
// Increase buffer size
transports: {
  stdio: {
    bufferSize: 10 * 1024 * 1024, // 10MB buffer
    timeout: 60000,                 // 60 second timeout
    delimiter: '\n',
    encoding: 'utf8'
  }
}
```

## Plugin Problems

### Plugin Not Loading

**Debug Checklist:**

1. ✅ Plugin file exists and is readable
2. ✅ Plugin exports default class
3. ✅ Plugin implements required interface
4. ✅ Plugin configuration is correct
5. ✅ No syntax errors in plugin code

**Example Working Plugin:**

```typescript
// plugins/working-plugin.ts
import type { Plugin, PluginConfig } from 'universal-mcp-server';

export class WorkingPlugin implements Plugin {
  name = 'working-plugin';
  version = '1.0.0';
  description = 'A working plugin example';

  async initialize(config: PluginConfig): Promise<void> {
    console.log(`Initializing ${this.name} with config:`, config.options);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name}`);
  }
}

export default WorkingPlugin;
```

### Plugin Dependencies

**Problem:** Plugin depends on other plugins that aren't loaded

**Solution:**

```typescript
// Specify plugin dependencies
export class DependentPlugin implements Plugin {
  name = 'dependent-plugin';
  dependencies = ['base-plugin', 'auth-plugin'];

  async initialize(config: PluginConfig): Promise<void> {
    // Check dependencies
    const basePlugin = this.getPlugin('base-plugin');
    if (!basePlugin) {
      throw new Error('base-plugin is required but not loaded');
    }
  }
}
```

## Security Issues

### CORS Errors

**Problem:** Browser clients blocked by CORS policy

**Solution:**

```typescript
transports: {
  http: {
    cors: {
      origin: ['https://yourdomain.com', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count'],
      maxAge: 86400 // 24 hours
    }
  }
}
```

### Authentication Failures

**Debugging:**

```typescript
// Add auth logging
security: {
  jwt: {
    enabled: true,
    secret: process.env.JWT_SECRET,
    onVerify: (token, error) => {
      if (error) {
        console.error('JWT verification failed:', error);
      } else {
        console.log('JWT verified successfully');
      }
    }
  }
}
```

## Debugging Tools

### Debug Mode

```typescript
// Enable debug logging
const server = new MCPServer({
  logging: {
    level: 'debug',
    transports: {
      console: { enabled: true, colorize: true },
      file: {
        enabled: true,
        path: 'debug.log',
        maxSize: '100MB',
        maxFiles: 5,
      },
    },
  },
});
```

### Request/Response Logging

```typescript
// Add request logging middleware
server.addEventListener('request', event => {
  const request = event.detail;
  console.log('Incoming request:', {
    id: request.id,
    method: request.method,
    params: request.params,
    timestamp: new Date().toISOString(),
  });
});

server.addEventListener('response', event => {
  const response = event.detail;
  console.log('Outgoing response:', {
    id: response.id,
    success: response.result ? true : false,
    timestamp: new Date().toISOString(),
  });
});
```

### Health Check Tool

```typescript
server.registerTool({
  name: 'diagnostic_check',
  description: 'Comprehensive system diagnostic',
  inputSchema: {
    type: 'object',
    properties: {
      includeMemory: { type: 'boolean', default: true },
      includeConnections: { type: 'boolean', default: true },
      includeTools: { type: 'boolean', default: true },
    },
  },
  handler: async params => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
    };

    if (params.includeMemory) {
      const usage = process.memoryUsage();
      diagnostics.memory = {
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      };
    }

    if (params.includeConnections) {
      const metrics = server.getMetrics();
      diagnostics.connections = {
        active: metrics.activeConnections,
        total: metrics.totalConnections,
      };
    }

    if (params.includeTools) {
      diagnostics.tools = {
        registered: server.getTools().length,
        plugins: server.listPlugins().length,
      };
    }

    return diagnostics;
  },
});
```

### Error Recovery Tool

```typescript
server.registerTool({
  name: 'recovery_actions',
  description: 'Perform system recovery actions',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['clear_cache', 'restart_transport', 'force_gc', 'reset_metrics'],
      },
      transport: { type: 'string' }, // For restart action
    },
    required: ['action'],
  },
  handler: async params => {
    const results = { action: params.action, success: false };

    switch (params.action) {
      case 'clear_cache':
        // Clear all caches
        if (global.cache) {
          global.cache.clear();
        }
        results.success = true;
        results.message = 'Caches cleared';
        break;

      case 'restart_transport':
        // Restart specific transport
        const transport = server.getTransportManager().getTransport(params.transport);
        if (transport) {
          await transport.stop();
          await transport.start();
          results.success = true;
          results.message = `Transport ${params.transport} restarted`;
        } else {
          results.message = `Transport ${params.transport} not found`;
        }
        break;

      case 'force_gc':
        // Force garbage collection
        if (global.gc) {
          global.gc();
          results.success = true;
          results.message = 'Garbage collection forced';
        } else {
          results.message = 'GC not available';
        }
        break;

      case 'reset_metrics':
        // Reset all metrics
        server.getMetrics().reset();
        results.success = true;
        results.message = 'Metrics reset';
        break;
    }

    return results;
  },
});
```

---

If you need additional help with specific issues, check out our [GitHub Issues](https://github.com/yourusername/universal-mcp-server/issues) or [Discussions](https://github.com/yourusername/universal-mcp-server/discussions).
