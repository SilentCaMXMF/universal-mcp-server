# Examples Gallery

This directory contains comprehensive examples demonstrating Universal MCP Server capabilities and use cases.

## Available Examples

### 🚀 Basic Examples

#### [basic-server.ts](./basic-server.ts)

Simple MCP server with WebSocket and HTTP transports.

- **Use Case**: Getting started with MCP
- **Features**: Basic tool registration, event handling
- **Complexity**: Beginner
- **Run**: `npm run example:basic`

#### [client-usage.ts](./client-usage.ts)

Complete client implementation with reconnection logic.

- **Use Case**: Client-side integration
- **Features**: Auto-reconnection, error handling, multiple transports
- **Complexity**: Beginner
- **Run**: `npm run example:client`

#### [plugin-system.ts](./plugin-system.ts)

Demonstrates custom plugin development and loading.

- **Use Case**: Extending server functionality
- **Features**: Plugin lifecycle, dynamic loading
- **Complexity**: Intermediate
- **Run**: `npm run example:plugins`

### 🏗️ Advanced Examples

#### [enterprise-setup.ts](./enterprise-setup.ts)

Production-ready server with security, monitoring, and logging.

- **Use Case**: Enterprise deployment
- **Features**: Security, metrics, health checks, audit logging
- **Complexity**: Advanced
- **Run**: `npm run example:enterprise`

#### [multi-transport.ts](./multi-transport.ts)

Server using multiple transport protocols simultaneously.

- **Use Case**: Multi-protocol support
- **Features**: WebSocket, HTTP, Stdio together
- **Complexity**: Intermediate
- **Run**: `tsx examples/multi-transport.ts`

#### [file-server.ts](./file-server.ts)

Full-featured file management system with security.

- **Use Case**: File operations via MCP
- **Features**: File browsing, upload, search, permissions
- **Complexity**: Advanced
- **Run**: `tsx examples/file-server.ts`

### 🛠️ Real-World Examples

#### Integration Examples

- **Express.js Integration**: MCP server with existing Express app
- **Next.js Integration**: MCP endpoints in Next.js API routes
- **Database Integration**: MCP tools with PostgreSQL/MongoDB
- **Cloud Services**: Integration with AWS S3, Google Cloud

#### Industry Examples

- **E-commerce**: Product catalog and order management
- **IoT Device Management**: Device monitoring and control
- **Content Management**: CMS operations and media handling
- **Analytics Dashboard**: Data analysis and reporting

#### Development Tools

- **Code Generation**: MCP-powered code generation tools
- **API Testing**: Automated API testing framework
- **Documentation**: Dynamic documentation generation
- **Build System**: MCP-based build automation

## Running Examples

### Prerequisites

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Running Individual Examples

```bash
# Basic server
npm run example:basic

# Client usage
npm run example:client

# Plugin system
npm run example:plugins

# Enterprise setup
npm run example:enterprise

# File server
tsx examples/file-server.ts

# Multi-transport
tsx examples/multi-transport.ts
```

### Custom Configuration

Most examples can be configured via environment variables:

```bash
# Create a .env file
echo "JWT_SECRET=your-secret-key" > .env
echo "DATABASE_URL=postgresql://localhost:5432/mcp" >> .env
echo "LOG_LEVEL=debug" >> .env

# Run with custom config
source .env && tsx examples/basic-server.ts
```

## Example Structure

Each example follows this structure:

```
example-name.ts
├── Configuration          # Server setup
├── Tool Registration      # Custom tools
├── Event Handlers        # Server events
├── Error Handling        # Graceful error handling
├── Usage Examples       # How to use the tools
└── Cleanup              # Graceful shutdown
```

### Key Components

#### 1. Server Configuration

```typescript
const server = new MCPServer({
  name: 'example-server',
  version: '1.0.0',
  transports: {
    /* transport config */
  },
  security: {
    /* security config */
  },
  logging: {
    /* logging config */
  },
});
```

#### 2. Tool Registration

```typescript
server.registerTool({
  name: 'example_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    /* JSON Schema */
  },
  handler: async params => {
    // Tool implementation
    return result;
  },
});
```

#### 3. Event Handling

```typescript
server.addEventListener('connection', event => {
  console.log('New connection:', event.detail);
});

server.addEventListener('error', event => {
  console.error('Server error:', event.detail);
});
```

#### 4. Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
```

## Best Practices Demonstrated

### ✅ Security

- Input validation with JSON Schema
- Authentication and authorization
- Rate limiting
- Security headers
- Data encryption

### ✅ Performance

- Connection pooling
- Caching strategies
- Memory management
- Efficient I/O operations
- Metrics collection

### ✅ Reliability

- Error handling and recovery
- Graceful shutdown
- Health checks
- Connection management
- Retry mechanisms

### ✅ Scalability

- Load balancing
- Horizontal scaling
- Resource management
- Process clustering

### ✅ Observability

- Structured logging
- Performance metrics
- Audit trails
- Health monitoring

## Testing Examples

### Unit Tests

```bash
# Run tests for examples
npm run test:examples

# Run specific example tests
npm run test examples/basic-server.test.ts
```

### Integration Tests

```bash
# Test example with client
npm run test:integration

# Test multiple examples together
npm run test:e2e
```

### Performance Tests

```bash
# Load test examples
npm run test:performance

# Memory leak detection
npm run test:memory
```

## Contributing Examples

### Submitting New Examples

1. **Choose a clear use case**
2. **Follow the established structure**
3. **Include comprehensive documentation**
4. **Add error handling and logging**
5. **Write tests**
6. **Update this README**

### Example Template

```typescript
/**
 * [Example Name]
 *
 * [Brief description of what this example demonstrates]
 * [Use case and scenarios covered]
 */

import { MCPServer } from 'universal-mcp-server';

// [Configuration setup]
const server = new MCPServer({
  name: 'example-server',
  version: '1.0.0',
  // ... configuration
});

// [Tool registration]
server.registerTool({
  name: 'example_tool',
  description: 'Description',
  inputSchema: {
    type: 'object',
    properties: {
      // ... schema
    },
  },
  handler: async params => {
    // ... implementation
    return result;
  },
});

// [Event handlers]
server.addEventListener('connection', event => {
  // ... event handling
});

// [Start server]
async function start() {
  try {
    await server.start();
    console.log('Example server started');
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

// [Graceful shutdown]
process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  start();
}

export { server };
```

## Troubleshooting Examples

### Common Issues

1. **Port conflicts**: Change ports in configuration
2. **Permission errors**: Check file/directory permissions
3. **Module not found**: Ensure dependencies are installed
4. **Connection timeouts**: Check firewall settings
5. **Memory issues**: Monitor and optimize memory usage

### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp:* npm run example:basic

# Enable verbose mode
VERBOSE=true npm run example:basic

# Enable profiling
node --prof tsx examples/basic-server.ts
```

## Community Examples

We encourage community contributions! Share your examples by:

1. Fork the repository
2. Add your example to the examples directory
3. Update this README
4. Submit a pull request

### Example Categories

- 🎯 **Business Applications**
- 🔧 **Developer Tools**
- 📊 **Analytics & Monitoring**
- 🗃️ **Data Processing**
- 🔌 **Integration Patterns**
- 🌐 **Web Applications**
- 📱 **Mobile Integrations**
- ☁️ **Cloud Services**

---

For more information, see the main [README](../README.md) and [Documentation](../docs/).
