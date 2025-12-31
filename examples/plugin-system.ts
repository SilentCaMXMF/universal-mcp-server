/**
 * Plugin system example
 */

import type { Plugin, PluginConfig, MCPTool, MCPResource } from '../src/types';
import { Logger } from '../src/utils/logger';

/**
 * Example plugin that provides file system tools
 */
class FileSystemPlugin implements Plugin {
  name = 'filesystem';
  version = '1.0.0';
  description = 'File system operations plugin';

  private logger?: Logger;

  tools: MCPTool[] = [
    {
      name: 'fs_read_file',
      description: 'Read the contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
          encoding: {
            type: 'string',
            enum: ['utf8', 'base64'],
            default: 'utf8',
          },
        },
        required: ['path'],
      },
      handler: async (params: any) => {
        // This would implement actual file reading
        this.logger?.info(`Reading file: ${params.path}`);
        return { content: `Contents of ${params.path}`, size: 1024 };
      },
    },
    {
      name: 'fs_write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
          encoding: {
            type: 'string',
            enum: ['utf8', 'base64'],
            default: 'utf8',
          },
        },
        required: ['path', 'content'],
      },
      handler: async (params: any) => {
        // This would implement actual file writing
        this.logger?.info(`Writing to file: ${params.path}`);
        return { success: true, bytesWritten: params.content.length };
      },
    },
  ];

  resources: MCPResource[] = [
    {
      uri: 'fs:///root',
      name: 'Root Directory',
      description: 'Root directory of the file system',
      mimeType: 'inode/directory',
    },
    {
      uri: 'fs:///home',
      name: 'Home Directory',
      description: 'User home directory',
      mimeType: 'inode/directory',
    },
  ];

  async initialize(config: PluginConfig): Promise<void> {
    this.logger = new Logger({
      level: 'info',
      format: 'text',
    });
    this.logger?.info(`Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    this.logger?.info(`Cleaning up ${this.name} plugin`);
  }
}

/**
 * Example plugin that provides system information tools
 */
class SystemInfoPlugin implements Plugin {
  name = 'systeminfo';
  version = '1.0.0';
  description = 'System information plugin';

  async initialize(config: PluginConfig): Promise<void> {
    console.log(`Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name} plugin`);
  }

  tools: MCPTool[] = [
    {
      name: 'system_info',
      description: 'Get system information',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        };
      },
    },
    {
      name: 'system_env',
      description: 'Get environment variables',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter variables by prefix (optional)',
          },
        },
      },
      handler: async (params: any) => {
        const env = process.env;
        if (params.filter) {
          const filtered: Record<string, string> = {};
          for (const [key, value] of Object.entries(env)) {
            if (key.startsWith(params.filter)) {
              filtered[key] = value || '';
            }
          }
          return filtered;
        }
        return env;
      },
    },
  ];
}

/**
 * Example plugin that provides HTTP client tools
 */
class HttpClientPlugin implements Plugin {
  name = 'httpclient';
  version = '1.0.0';
  description = 'HTTP client plugin';

  async initialize(config: PluginConfig): Promise<void> {
    console.log(`Initializing ${this.name} plugin`);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name} plugin`);
  }

  tools: MCPTool[] = [
    {
      name: 'http_get',
      description: 'Make HTTP GET request',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to request',
          },
          headers: {
            type: 'object',
            description: 'HTTP headers (optional)',
          },
        },
        required: ['url'],
      },
      handler: async (params: any) => {
        // This would implement actual HTTP requests
        const response = await fetch(params.url, {
          method: 'GET',
          headers: params.headers || {},
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          contentType,
          body: text.substring(0, 1000), // Limit response size
        };
      },
    },
  ];
}

/**
 * Example usage of the plugin system
 */
async function demonstratePluginSystem() {
  console.log('🔌 Plugin System Example\n');

  // Create plugin instances
  const fsPlugin = new FileSystemPlugin();
  const systemPlugin = new SystemInfoPlugin();
  const httpPlugin = new HttpClientPlugin();

  // Initialize plugins
  await fsPlugin.initialize({ name: 'filesystem', enabled: true });
  await systemPlugin.initialize({ name: 'systeminfo', enabled: true });
  await httpPlugin.initialize({ name: 'httpclient', enabled: true });

  // Demonstrate plugin tools
  console.log('📁 File System Plugin Tools:');
  for (const tool of fsPlugin.tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }

  console.log('\n💻 System Info Plugin Tools:');
  for (const tool of systemPlugin.tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }

  console.log('\n🌐 HTTP Client Plugin Tools:');
  for (const tool of httpPlugin.tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }

  // Test a few tools
  console.log('\n🧪 Testing Tools:');

  try {
    // Test system info tool
    const systemInfo = await systemPlugin.tools[0].handler({});
    console.log('System Info:', JSON.stringify(systemInfo, null, 2));

    // Test file read tool
    const fileResult = await fsPlugin.tools[0].handler({ path: '/tmp/test.txt' });
    console.log('File Read Result:', fileResult);
  } catch (error) {
    console.error('Error testing tools:', error);
  }

  // Cleanup plugins
  await fsPlugin.cleanup();
  await systemPlugin.cleanup();
  await httpPlugin.cleanup();
}

if (require.main === module) {
  demonstratePluginSystem();
}

export { FileSystemPlugin, SystemInfoPlugin, HttpClientPlugin, demonstratePluginSystem };
