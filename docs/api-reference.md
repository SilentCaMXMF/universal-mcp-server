# API Reference

This document provides a complete API reference for Universal MCP Server.

## Table of Contents

- [Core Classes](#core-classes)
  - [MCPServer](#mcpserver)
  - [MCPClient](#mcpclient)
  - [PluginManager](#pluginmanager)
  - [TransportManager](#transportmanager)
- [Interfaces](#interfaces)
  - [Plugin](#plugin)
  - [MCPTool](#mcptool)
  - [MCPResource](#mcpresource)
  - [Transport](#transport)
- [Configuration](#configuration)
  - [MCPServerConfig](#mcpserverconfig)
  - [TransportConfig](#transportconfig)
  - [PluginConfig](#pluginconfig)
- [Built-in Tools](#built-in-tools)
- [Events](#events)
- [Utilities](#utilities)

## Core Classes

### MCPServer

The main server class that manages transports, plugins, and request handling.

```typescript
import { MCPServer } from 'universal-mcp-server';

const server = new MCPServer(config);
```

#### Constructor

```typescript
constructor(config: MCPServerConfig)
```

Creates a new MCP server instance with the specified configuration.

**Parameters:**

- `config`: Server configuration object

#### Methods

##### start()

```typescript
async start(): Promise<void>
```

Starts the server and initializes all configured transports and plugins.

**Example:**

```typescript
await server.start();
console.log('Server started successfully');
```

##### stop()

```typescript
async stop(): Promise<void>
```

Stops the server and gracefully shuts down all transports and plugins.

**Example:**

```typescript
await server.stop();
console.log('Server stopped');
```

##### registerTool()

```typescript
registerTool(tool: MCPTool): void
```

Registers a custom tool with the server.

**Parameters:**

- `tool`: Tool definition object

**Example:**

```typescript
server.registerTool({
  name: 'calculate',
  description: 'Perform calculations',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string' },
    },
    required: ['expression'],
  },
  handler: async params => ({
    result: eval(params.expression),
  }),
});
```

##### processRequest()

```typescript
async processRequest(request: MCPRequest): Promise<MCPResponse>
```

Processes an incoming MCP request.

**Parameters:**

- `request`: MCP request object

**Returns:**

- Promise resolving to MCP response

**Example:**

```typescript
const response = await server.processRequest({
  id: '1',
  method: 'tools/list',
});
```

##### getTools()

```typescript
getTools(): MCPTool[]
```

Returns all registered tools.

**Example:**

```typescript
const tools = server.getTools();
console.log(`Server has ${tools.length} tools`);
```

##### getResources()

```typescript
getResources(): MCPResource[]
```

Returns all available resources.

**Example:**

```typescript
const resources = server.getResources();
console.log(`Server has ${resources.length} resources`);
```

##### getMetrics()

```typescript
getMetrics(): Metrics
```

Returns server performance metrics.

**Example:**

```typescript
const metrics = server.getMetrics();
console.log(`Requests processed: ${metrics.requestsTotal}`);
```

#### Events

The server emits the following events:

- `connection`: New client connected
- `disconnection`: Client disconnected
- `request`: Request received
- `error`: Error occurred

**Example:**

```typescript
server.addEventListener('connection', event => {
  console.log('New connection:', event.detail.id);
});
```

### MCPClient

Client class for connecting to MCP servers.

```typescript
import { MCPClient } from 'universal-mcp-server';

const client = new MCPClient(config);
```

#### Constructor

```typescript
constructor(config: MCPClientConfig)
```

Creates a new MCP client instance.

#### Methods

##### connect()

```typescript
async connect(): Promise<void>
```

Connects to the configured MCP server.

##### disconnect()

```typescript
async disconnect(): Promise<void>
```

Disconnects from the server.

##### callTool()

```typescript
async callTool(toolName: string, args?: any): Promise<any>
```

Calls a tool on the server.

**Parameters:**

- `toolName`: Name of the tool to call
- `args`: Tool arguments (optional)

**Example:**

```typescript
const result = await client.callTool('calculate', {
  expression: '2 + 2',
});
console.log(result); // { result: 4 }
```

##### listTools()

```typescript
async listTools(): Promise<MCPTool[]>
```

Lists all available tools on the server.

##### readResource()

```typescript
async readResource(uri: string): Promise<string>
```

Reads a resource from the server.

**Parameters:**

- `uri`: Resource URI

### PluginManager

Manages plugin lifecycle and registration.

#### Methods

##### registerPlugin()

```typescript
registerPlugin(plugin: Plugin): Promise<void>
```

Registers a plugin with the server.

##### unregisterPlugin()

```typescript
unregisterPlugin(pluginName: string): Promise<void>
```

Unregisters a plugin.

##### getPlugin()

```typescript
getPlugin(name: string): Plugin | undefined
```

Retrieves a plugin by name.

##### listPlugins()

```typescript
listPlugins(): Plugin[]
```

Lists all registered plugins.

### TransportManager

Manages transport protocols and connections.

#### Methods

##### addTransport()

```typescript
addTransport(transport: Transport): void
```

Adds a new transport protocol.

##### removeTransport()

```typescript
removeTransport(transportType: string): void
```

Removes a transport protocol.

##### getTransport()

```typescript
getTransport(type: string): Transport | undefined
```

Retrieves a transport by type.

## Interfaces

### Plugin

Interface for plugin implementations.

```typescript
interface Plugin {
  name: string;
  version: string;
  description?: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  initialize?(config: PluginConfig): Promise<void>;
  cleanup?(): Promise<void>;
}
```

### MCPTool

Interface for tool definitions.

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  handler: (params: any) => Promise<any>;
}
```

### MCPResource

Interface for resource definitions.

```typescript
interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}
```

### Transport

Interface for transport implementations.

```typescript
interface Transport {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(connectionId: string, data: any): Promise<void>;
  isConnected(): boolean;
}
```

## Configuration

### MCPServerConfig

Complete server configuration interface.

```typescript
interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  transports?: Record<string, TransportConfig>;
  plugins?: PluginConfig[];
  logging?: LoggingConfig;
  security?: SecurityConfig;
  metrics?: MetricsConfig;
}
```

### TransportConfig

Base configuration for transports.

```typescript
interface TransportConfig {
  enabled?: boolean;
  options?: Record<string, any>;
}
```

#### WebSocketTransportConfig

```typescript
interface WebSocketTransportConfig extends TransportConfig {
  port: number;
  host?: string;
  path?: string;
  maxConnections?: number;
}
```

#### HttpTransportConfig

```typescript
interface HttpTransportConfig extends TransportConfig {
  port: number;
  host?: string;
  path?: string;
  cors?: boolean;
  rateLimit?: RateLimitConfig;
}
```

#### StdioTransportConfig

```typescript
interface StdioTransportConfig extends TransportConfig {
  encoding?: string;
  delimiter?: string;
}
```

### PluginConfig

Plugin configuration interface.

```typescript
interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, any>;
}
```

## Built-in Tools

### server_info

Returns server information and status.

**Parameters:** None

**Returns:**

```typescript
{
  name: string;
  version: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  connections: number;
}
```

### server_metrics

Returns server performance metrics.

**Parameters:** None

**Returns:**

```typescript
{
  requestsTotal: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
}
```

### echo

Echoes back the provided input.

**Parameters:**

```typescript
{
  message: string;
}
```

**Returns:**

```typescript
{
  message: string;
  timestamp: string;
}
```

### filesystem_list_files

Lists files in a directory.

**Parameters:**

```typescript
{
  path: string;
  recursive?: boolean;
}
```

**Returns:**

```typescript
{
  files: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modified: string;
  }>;
}
```

### filesystem_read_file

Reads file contents.

**Parameters:**

```typescript
{
  path: string;
  encoding?: string;
}
```

**Returns:**

```typescript
{
  content: string;
  size: number;
  encoding: string;
}
```

### filesystem_write_file

Writes content to a file.

**Parameters:**

```typescript
{
  path: string;
  content: string;
  encoding?: string;
}
```

**Returns:**

```typescript
{
  success: boolean;
  path: string;
  bytesWritten: number;
}
```

### http_request

Makes HTTP requests.

**Parameters:**

```typescript
{
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}
```

**Returns:**

```typescript
{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}
```

## Events

### Server Events

- `connection`: Fired when a client connects
- `disconnection`: Fired when a client disconnects
- `request`: Fired when a request is received
- `response`: Fired when a response is sent
- `error`: Fired when an error occurs
- `tool-called`: Fired when a tool is called

### Client Events

- `connected`: Fired when connected to server
- `disconnected`: Fired when disconnected from server
- `error`: Fired when an error occurs
- `tool-response`: Fired when tool call response is received

## Utilities

### Logger

Logging utility with multiple levels and formatters.

```typescript
import { Logger } from 'universal-mcp-server';

const logger = new Logger('my-component');
logger.info('Server started');
logger.error('Connection failed', { error: err });
```

### MetricsCollector

Performance metrics collection.

```typescript
import { MetricsCollector } from 'universal-mcp-server';

const metrics = new MetricsCollector();
metrics.incrementCounter('requests');
metrics.recordTimer('response_time', 150);
```

### ErrorManager

Centralized error handling.

```typescript
import { ErrorManager } from 'universal-mcp-server';

ErrorManager.handle(error, {
  context: 'tool_execution',
  userId: '123',
});
```

## Type Definitions

Complete type definitions are available as part of the TypeScript package. All interfaces and types are exported from the main module.

```typescript
import type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  Plugin,
  Transport,
  // ... other types
} from 'universal-mcp-server';
```

---

Need more examples? Check out the [examples directory](../examples/) for complete working examples.
