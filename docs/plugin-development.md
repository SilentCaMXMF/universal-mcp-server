# Plugin Development Guide

This guide explains how to create and use plugins with Universal MCP Server.

## What is a Plugin?

A plugin is a modular component that extends the functionality of an MCP server by providing:

- Custom tools that clients can execute
- Resources that clients can access
- Custom initialization and cleanup logic

## Creating a Plugin

### Basic Plugin Structure

```typescript
import type { Plugin, PluginConfig, MCPTool, MCPResource } from 'universal-mcp-server';

export class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';
  description = 'A custom plugin for demonstration';

  // Optional: Custom tools
  tools: MCPTool[] = [
    {
      name: 'my_tool',
      description: 'Description of what this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          parameter: {
            type: 'string',
            description: 'Description of the parameter',
          },
        },
        required: ['parameter'],
      },
      handler: async params => {
        // Tool implementation
        return { result: `Processed: ${params.parameter}` };
      },
    },
  ];

  // Optional: Resources this plugin provides
  resources: MCPResource[] = [
    {
      uri: 'my-plugin://example',
      name: 'Example Resource',
      description: 'An example resource',
      mimeType: 'text/plain',
    },
  ];

  // Optional: Initialize plugin
  async initialize(config: PluginConfig): Promise<void> {
    console.log(`Initializing ${this.name} plugin`);
    // Setup code here
  }

  // Optional: Cleanup when server stops
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name} plugin`);
    // Cleanup code here
  }
}
```

## Plugin Development Best Practices

### 1. Tool Design

#### Input Schema

Always define clear input schemas using JSON Schema:

```typescript
{
  name: 'weather_forecast',
  description: 'Get weather forecast for a location',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or coordinates',
        examples: ['New York', '40.7128,-74.0060']
      },
      days: {
        type: 'number',
        description: 'Number of days to forecast',
        minimum: 1,
        maximum: 7,
        default: 3
      }
    },
    required: ['location']
  }
}
```

#### Error Handling

Always handle errors gracefully:

```typescript
handler: async params => {
  try {
    // Your logic here
    if (!params.location) {
      throw new Error('Location is required');
    }

    const weather = await getWeather(params.location);
    return weather;
  } catch (error) {
    // Log error for debugging
    console.error('Weather fetch failed:', error);

    // Re-throw with user-friendly message
    throw new Error(`Failed to get weather: ${error.message}`);
  }
};
```

#### Validation

Validate inputs before processing:

```typescript
handler: async params => {
  // Validate URL format
  if (params.url && !isValidUrl(params.url)) {
    throw new Error('Invalid URL format');
  }

  // Validate ranges
  if (params.timeout && (params.timeout < 1000 || params.timeout > 60000)) {
    throw new Error('Timeout must be between 1 and 60 seconds');
  }

  // Continue with processing
};
```

### 2. Resource Design

Resources represent data that clients can access:

```typescript
resources: MCPResource[] = [
  {
    uri: 'file:///home/user/documents',
    name: 'Documents Folder',
    description: 'User documents directory',
    mimeType: 'inode/directory',
    // Additional metadata can be added
    metadata: {
      size: 1024000,
      created: '2024-01-01T00:00:00Z',
      modified: '2024-01-15T12:00:00Z'
    }
  }
];
```

### 3. Plugin Configuration

Use configuration for customization:

```typescript
async initialize(config: PluginConfig): Promise<void> {
  // Use plugin-specific options
  this.apiKey = config.options?.apiKey;
  this.baseUrl = config.options?.baseUrl || 'https://api.example.com';

  // Validate required configuration
  if (!this.apiKey) {
    throw new Error('API key is required for this plugin');
  }

  // Initialize connections or resources
  await this.setupApiClient();
}
```

## Example Plugins

### 1. HTTP Client Plugin

```typescript
export class HttpClientPlugin implements Plugin {
  name = 'httpclient';
  version = '1.0.0';
  description = 'HTTP client for making web requests';

  tools: MCPTool[] = [
    {
      name: 'http_get',
      description: 'Make HTTP GET request',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to request' },
          headers: { type: 'object', description: 'HTTP headers' },
        },
        required: ['url'],
      },
      handler: async params => {
        const response = await fetch(params.url, {
          method: 'GET',
          headers: params.headers || {},
        });

        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
        };
      },
    },
  ];
}
```

### 2. File System Plugin

```typescript
export class FileSystemPlugin implements Plugin {
  name = 'filesystem';
  version = '1.0.0';
  description = 'File system operations';

  tools: MCPTool[] = [
    {
      name: 'fs_read_file',
      description: 'Read file contents',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' },
        },
        required: ['path'],
      },
      handler: async params => {
        const fs = await import('fs/promises');
        const content = await fs.readFile(params.path, params.encoding);
        return { content };
      },
    },
  ];
}
```

## Using Plugins

### 1. Registering a Plugin

```typescript
import { MCPServer } from 'universal-mcp-server';
import { MyPlugin } from './plugins/my-plugin';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  plugins: [
    {
      name: 'my-plugin',
      enabled: true,
      options: {
        apiKey: 'your-api-key',
        baseUrl: 'https://api.example.com',
      },
    },
  ],
});

// Or register directly after server creation
const myPlugin = new MyPlugin();
server.getPluginManager().registerPlugin(myPlugin);
```

### 2. Dynamic Plugin Loading

```typescript
async function loadPlugin(name: string, config: PluginConfig) {
  const pluginModule = await import(`./plugins/${name}`);
  const PluginClass = pluginModule.default;
  const plugin = new PluginClass();

  await plugin.initialize(config);
  return plugin;
}

// Usage
const plugin = await loadPlugin('weather-plugin', {
  name: 'weather',
  enabled: true,
  options: { apiKey: 'weather-api-key' },
});

server.getPluginManager().registerPlugin(plugin);
```

## Testing Plugins

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { MyPlugin } from './my-plugin';

describe('MyPlugin', () => {
  it('should initialize successfully', async () => {
    const plugin = new MyPlugin();
    await expect(plugin.initialize({ name: 'test', enabled: true })).resolves.not.toThrow();
  });

  it('should execute tool correctly', async () => {
    const plugin = new MyPlugin();
    const tool = plugin.tools[0];

    const result = await tool.handler({ parameter: 'test' });
    expect(result.result).toBe('Processed: test');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPServer } from 'universal-mcp-server';
import { MyPlugin } from './my-plugin';

describe('Plugin Integration', () => {
  let server: MCPServer;

  beforeAll(async () => {
    server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      plugins: [{ name: 'my-plugin', enabled: true }],
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should register plugin tools', () => {
    const tools = server.getTools();
    expect(tools.some(t => t.name === 'my_tool')).toBe(true);
  });

  it('should execute plugin tool via request', async () => {
    const request = {
      id: '1',
      method: 'tools/call',
      params: { name: 'my_tool', arguments: { parameter: 'test' } },
    };

    const response = await server.processRequest(request);
    expect(response.result).toEqual({ result: 'Processed: test' });
  });
});
```

## Distribution

### Publishing Your Plugin

1. Create a new npm package
2. Export your plugin as default export
3. Include types for TypeScript users
4. Add documentation and examples

```typescript
// index.ts of your plugin package
export { default } from './my-plugin';
export type { MyPluginConfig } from './types';
```

### Plugin Registry

Consider submitting your plugin to a registry:

- Official MCP Plugin Registry
- GitHub Marketplace
- npm with `mcp-plugin` keyword

## Best Practices Summary

1. **Clear Naming**: Use descriptive names for tools and resources
2. **Comprehensive Schemas**: Define detailed input/output schemas
3. **Error Handling**: Always handle errors gracefully
4. **Documentation**: Document all tools and parameters
5. **Testing**: Write comprehensive tests
6. **Configuration**: Make plugins configurable
7. **Security**: Validate inputs and handle sensitive data
8. **Performance**: Use async/await and handle timeouts

---

Need more examples? Check out the [examples directory](../examples/) for complete plugin implementations.
