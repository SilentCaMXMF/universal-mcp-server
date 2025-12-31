/**
 * Built-in tools for the Universal MCP Server
 * Extracted and enhanced from the original mcp-server.js implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import * as https from 'https';
import * as http from 'http';
import { glob } from 'glob';
import type { MCPTool } from '../types/index';

/**
 * Echo tool - Returns the provided message
 */
export const echoTool: MCPTool = {
  name: 'echo',
  description: 'Echo back the provided message',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to echo back' },
    },
    required: ['message'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { message } = params as { message: string };
    return {
      content: [
        {
          type: 'text',
          text: `Echo: ${message}`,
        },
      ],
      isError: false,
    };
  },
};

/**
 * File operations tool - List files in a directory
 */
export const listFilesTool: MCPTool = {
  name: 'list_files',
  description: 'List files in a directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path to list' },
      recursive: {
        type: 'boolean',
        description: 'List recursively',
        default: false,
      },
    },
    required: ['path'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { path: dirPath, recursive } = params as {
      path: string;
      recursive?: boolean;
    };
    try {
      const targetPath = dirPath || '.';
      const files = await fs.readdir(targetPath);

      let result: string[] = [];

      if (recursive) {
        // Recursive implementation
        for (const file of files) {
          const fullPath = path.join(targetPath, file);
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            const subFiles = await listRecursive(fullPath);
            result = result.concat(subFiles);
          } else {
            result.push(fullPath);
          }
        }
      } else {
        result = files.map(file => path.join(targetPath, file));
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                directory: targetPath,
                files: result,
                count: result.length,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing files: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * File operations tool - Read file contents
 */
export const readFileTool: MCPTool = {
  name: 'read_file',
  description: 'Read file contents',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read' },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf8',
      },
    },
    required: ['path'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { path: filePath, encoding } = params as {
      path: string;
      encoding?: string;
    };
    try {
      const content = await fs.readFile(filePath, {
        encoding: (encoding || 'utf8') as BufferEncoding,
      });

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * File operations tool - Write content to a file
 */
export const writeFileTool: MCPTool = {
  name: 'write_file',
  description: 'Write content to a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to write' },
      content: { type: 'string', description: 'Content to write' },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf8',
      },
    },
    required: ['path', 'content'],
  },
  handler: async (params: Record<string, unknown>) => {
    const {
      path: filePath,
      content,
      encoding,
    } = params as {
      path: string;
      content: string;
      encoding?: string;
    };
    try {
      await fs.writeFile(filePath, content, { encoding: (encoding || 'utf8') as BufferEncoding });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote ${content.length} characters to ${filePath}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error writing file: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * System operations tool - Execute a shell command
 */
export const executeCommandTool: MCPTool = {
  name: 'execute_command',
  description: 'Execute a shell command',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
      args: {
        type: 'array',
        description: 'Command arguments',
        items: { type: 'string' },
      },
      cwd: { type: 'string', description: 'Working directory' },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 10000)',
        default: 10000,
      },
    },
    required: ['command'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { command, args, cwd, timeout } = params as {
      command: string;
      args?: string[];
      cwd?: string;
      timeout?: number;
    };
    try {
      const fullCommand = args ? [command, ...args].join(' ') : command;

      const result = execSync(fullCommand, {
        cwd,
        encoding: 'utf8',
        timeout: timeout || 10000,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Command executed successfully:\n\n${result}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Command execution failed: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * System operations tool - Get system information
 */
export const getSystemInfoTool: MCPTool = {
  name: 'get_system_info',
  description: 'Get system information',
  inputSchema: {
    type: 'object',
    properties: {
      include: {
        type: 'array',
        description: 'Information to include (optional filter)',
        items: { type: 'string' },
      },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    const { include } = params as { include?: string[] };
    const os = require('os');
    const info = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
    };

    // Filter information if include array is provided
    const filteredInfo = include
      ? Object.fromEntries(Object.entries(info).filter(([key]) => include!.includes(key)))
      : info;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filteredInfo, null, 2),
        },
      ],
      isError: false,
    };
  },
};

/**
 * HTTP operations tool - Make an HTTP request
 */
export const httpRequestTool: MCPTool = {
  name: 'http_request',
  description: 'Make an HTTP request',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to request' },
      method: {
        type: 'string',
        description: 'HTTP method',
        default: 'GET',
      },
      headers: { type: 'object', description: 'Request headers' },
      body: { type: 'string', description: 'Request body' },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 30000,
      },
    },
    required: ['url'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { url, method, headers, body, timeout } = params as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    };
    return new Promise(resolve => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const requestOptions = {
        method: method || 'GET',
        headers: headers || {},
        timeout: timeout || 30000,
      };

      const req = client.request(url, requestOptions, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: data,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          });
        });
      });

      req.on('error', error => {
        resolve({
          content: [
            {
              type: 'text',
              text: `HTTP request failed: ${error.message}`,
            },
          ],
          isError: true,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          content: [
            {
              type: 'text',
              text: `HTTP request timed out after ${timeout}ms`,
            },
          ],
          isError: true,
        });
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  },
};

/**
 * Search operations tool - Search for files matching a pattern
 */
export const searchFilesTool: MCPTool = {
  name: 'search_files',
  description: 'Search for files matching a pattern',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Search pattern (glob)' },
      directory: {
        type: 'string',
        description: 'Directory to search in',
      },
      max_results: {
        type: 'number',
        description: 'Maximum results',
        default: 100,
      },
      include_hidden: {
        type: 'boolean',
        description: 'Include hidden files',
        default: false,
      },
    },
    required: ['pattern'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { pattern, directory, max_results, include_hidden } = params as {
      pattern: string;
      directory?: string;
      max_results?: number;
      include_hidden?: boolean;
    };
    try {
      const searchPattern = pattern;
      const searchDirectory = directory || '.';
      const maxResults = max_results || 100;

      const files = await glob(searchPattern, {
        cwd: searchDirectory,
        dot: include_hidden || false,
      });

      // Limit results manually since maxResults is not supported
      const limitedFiles = files.slice(0, maxResults);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                pattern: searchPattern,
                directory: searchDirectory,
                files: limitedFiles,
                count: files.length,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `File search error: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Directory operations tool - Create directory
 */
export const createDirectoryTool: MCPTool = {
  name: 'create_directory',
  description: 'Create a directory (including parent directories)',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path to create' },
      recursive: {
        type: 'boolean',
        description: 'Create parent directories if needed',
        default: true,
      },
    },
    required: ['path'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { path: dirPath, recursive } = params as {
      path: string;
      recursive?: boolean;
    };
    try {
      await fs.mkdir(dirPath, { recursive: recursive !== false });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully created directory: ${dirPath}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating directory: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * File operations tool - Delete file or directory
 */
export const deleteFileTool: MCPTool = {
  name: 'delete_file',
  description: 'Delete a file or directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to delete' },
      recursive: {
        type: 'boolean',
        description: 'Delete directory recursively',
        default: false,
      },
    },
    required: ['path'],
  },
  handler: async (params: Record<string, unknown>) => {
    const { path: filePath, recursive } = params as {
      path: string;
      recursive?: boolean;
    };
    try {
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await fs.rmdir(filePath, { recursive });
      } else {
        await fs.unlink(filePath);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted: ${filePath}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error deleting file: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Export all built-in tools
 */
export const builtinTools: MCPTool[] = [
  echoTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
  executeCommandTool,
  getSystemInfoTool,
  httpRequestTool,
  searchFilesTool,
  createDirectoryTool,
  deleteFileTool,
];

/**
 * Helper function for recursive directory listing
 */
async function listRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const subFiles = await listRecursive(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}
