/**
 * Real-World File Server Example
 *
 * This example demonstrates a practical file server with MCP that provides:
 * - File browsing and management capabilities
 * - Security and access control
 * - File search and filtering
 * - Upload/download operations
 * - Directory management
 */

import { MCPServer } from 'universal-mcp-server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Configuration
const config = {
  name: 'file-server',
  version: '1.0.0',
  rootDirectory: process.env.FILE_SERVER_ROOT || './shared-files',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: [
    '.txt',
    '.json',
    '.csv',
    '.md',
    '.pdf',
    '.doc',
    '.docx',
    '.png',
    '.jpg',
    '.gif',
  ],
  enableSearch: true,
  enableUpload: true,
  enableDelete: true,
};

async function createFileServer() {
  const server = new MCPServer({
    name: config.name,
    version: config.version,
    description: 'Enterprise file management server',

    transports: {
      http: {
        port: 3002,
        cors: {
          origin: ['http://localhost:3000', 'https://filemanager.company.com'],
          credentials: true,
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 500,
        },
      },
      websocket: {
        port: 3003,
        path: '/mcp',
      },
    },

    security: {
      enableRateLimit: true,
      maxRequestSize: config.maxFileSize + 1024, // Extra space for metadata
      enableInputValidation: true,
    },
  });

  // Ensure root directory exists
  try {
    await fs.access(config.rootDirectory);
  } catch {
    await fs.mkdir(config.rootDirectory, { recursive: true });
    console.log(`Created root directory: ${config.rootDirectory}`);
  }

  // Helper functions
  function isSafePath(requestedPath: string): boolean {
    const resolvedPath = path.resolve(config.rootDirectory, requestedPath);
    return resolvedPath.startsWith(path.resolve(config.rootDirectory));
  }

  function getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  function isAllowedExtension(filename: string): boolean {
    const ext = getFileExtension(filename);
    return config.allowedExtensions.includes(ext);
  }

  async function getFileStats(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8),
      };
    } catch {
      return null;
    }
  }

  async function calculateFileHash(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // File browsing tool
  server.registerTool({
    name: 'list_directory',
    description: 'List files and directories in a given path',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to list (relative to root)',
          default: '.',
        },
        recursive: {
          type: 'boolean',
          description: 'List files recursively',
          default: false,
        },
        includeHidden: {
          type: 'boolean',
          description: 'Include hidden files (starting with .)',
          default: false,
        },
        filter: {
          type: 'object',
          properties: {
            extensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by file extensions (e.g., [".txt", ".json"])',
            },
            namePattern: {
              type: 'string',
              description: 'Filter by name pattern (glob syntax)',
            },
            sizeRange: {
              type: 'object',
              properties: {
                min: { type: 'integer' },
                max: { type: 'integer' },
              },
            },
          },
        },
        sort: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              enum: ['name', 'size', 'modified', 'created'],
              default: 'name',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
          },
        },
      },
    },
    handler: async params => {
      const targetPath = path.resolve(config.rootDirectory, params.path || '.');

      if (!isSafePath(params.path || '.')) {
        throw new Error('Access denied: path outside allowed directory');
      }

      try {
        const entries = [];
        const processDirectory = async (dirPath: string, relativePath: string = '') => {
          const items = await fs.readdir(dirPath, { withFileTypes: true });

          for (const item of items) {
            const itemPath = path.join(dirPath, item.name);
            const relativeItemPath = path.join(relativePath, item.name);

            // Skip hidden files unless requested
            if (!params.includeHidden && item.name.startsWith('.')) {
              continue;
            }

            // Apply filters
            if (params.filter) {
              if (params.filter.extensions && !item.isDirectory()) {
                const ext = getFileExtension(item.name);
                if (!params.filter.extensions.includes(ext)) {
                  continue;
                }
              }

              if (params.filter.sizeRange && item.isFile()) {
                const stats = await getFileStats(itemPath);
                if (stats) {
                  const { min, max } = params.filter.sizeRange;
                  if (min && stats.size < min) continue;
                  if (max && stats.size > max) continue;
                }
              }
            }

            const stats = await getFileStats(itemPath);
            if (!stats) continue;

            const entry = {
              name: item.name,
              path: relativeItemPath,
              type: item.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              created: stats.created,
              modified: stats.modified,
              accessed: stats.accessed,
              permissions: stats.permissions,
            };

            // Add hash for files (up to 1MB to avoid performance issues)
            if (item.isFile() && stats.size <= 1024 * 1024) {
              entry.hash = await calculateFileHash(itemPath);
            }

            entries.push(entry);

            // Recurse if requested
            if (params.recursive && item.isDirectory()) {
              await processDirectory(itemPath, relativeItemPath);
            }
          }
        };

        await processDirectory(targetPath);

        // Apply sorting
        if (params.sort) {
          entries.sort((a, b) => {
            const field = params.sort.field;
            const order = params.sort.order === 'desc' ? -1 : 1;

            let aVal, bVal;
            if (field === 'name') {
              aVal = a.name.toLowerCase();
              bVal = b.name.toLowerCase();
            } else if (field === 'size') {
              aVal = a.size;
              bVal = b.size;
            } else if (field === 'modified') {
              aVal = new Date(a.modified).getTime();
              bVal = new Date(b.modified).getTime();
            } else if (field === 'created') {
              aVal = new Date(a.created).getTime();
              bVal = new Date(b.created).getTime();
            }

            if (aVal < bVal) return -1 * order;
            if (aVal > bVal) return 1 * order;
            return 0;
          });
        }

        return {
          path: params.path || '.',
          entries,
          totalCount: entries.length,
          directoryCount: entries.filter(e => e.type === 'directory').length,
          fileCount: entries.filter(e => e.type === 'file').length,
        };
      } catch (error) {
        throw new Error(`Failed to list directory: ${error.message}`);
      }
    },
  });

  // File reading tool
  server.registerTool({
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to read (relative to root)',
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'base64', 'hex'],
          default: 'utf8',
          description: 'File encoding',
        },
        range: {
          type: 'object',
          properties: {
            start: { type: 'integer', minimum: 0 },
            end: { type: 'integer', minimum: 0 },
          },
          description: 'Read specific byte range',
        },
        preview: {
          type: 'boolean',
          default: false,
          description: 'Return preview only (first 1KB)',
        },
      },
      required: ['path'],
    },
    handler: async params => {
      if (!isSafePath(params.path)) {
        throw new Error('Access denied: path outside allowed directory');
      }

      const filePath = path.resolve(config.rootDirectory, params.path);

      try {
        const stats = await getFileStats(filePath);
        if (!stats) {
          throw new Error('File not found');
        }

        if (stats.isDirectory()) {
          throw new Error('Cannot read directory as file');
        }

        // Check file size
        if (!params.range && stats.size > config.maxFileSize && !params.preview) {
          throw new Error(`File too large (${stats.size} bytes). Use range or preview.`);
        }

        let content: string | Buffer;
        const options: any = { encoding: params.encoding || 'utf8' };

        if (params.range) {
          const { start, end } = params.range;
          if (start > 0 || end !== undefined) {
            const buffer = await fs.readFile(filePath);
            const actualEnd = end !== undefined ? Math.min(end, buffer.length) : buffer.length;
            content = buffer.slice(start, actualEnd);
            if (params.encoding === 'utf8') {
              content = content.toString('utf8');
            }
          } else {
            content = await fs.readFile(filePath, options);
          }
        } else if (params.preview) {
          const buffer = await fs.readFile(filePath);
          content = buffer.slice(0, 1024);
          if (params.encoding === 'utf8') {
            content = content.toString('utf8');
          }
        } else {
          content = await fs.readFile(filePath, options);
        }

        return {
          path: params.path,
          content,
          encoding: params.encoding || 'utf8',
          size: stats.size,
          modified: stats.modified,
          contentType: getContentType(params.path),
          hash: await calculateFileHash(filePath),
          range: params.range,
          preview: params.preview || false,
        };
      } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
    },
  });

  // File writing tool
  server.registerTool({
    name: 'write_file',
    description: 'Write content to a file (create or overwrite)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to write (relative to root)',
        },
        content: {
          type: 'string',
          description: 'File content',
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'base64', 'hex'],
          default: 'utf8',
        },
        createDirectory: {
          type: 'boolean',
          default: true,
          description: "Create parent directories if they don't exist",
        },
        overwrite: {
          type: 'boolean',
          default: true,
          description: 'Overwrite existing file',
        },
        append: {
          type: 'boolean',
          default: false,
          description: 'Append to existing file instead of overwriting',
        },
      },
      required: ['path', 'content'],
    },
    handler: async params => {
      if (!config.enableUpload) {
        throw new Error('File upload is disabled');
      }

      if (!isSafePath(params.path)) {
        throw new Error('Access denied: path outside allowed directory');
      }

      // Check file extension
      if (!isAllowedExtension(params.path)) {
        throw new Error(`File extension not allowed: ${getFileExtension(params.path)}`);
      }

      const filePath = path.resolve(config.rootDirectory, params.path);
      const dirPath = path.dirname(filePath);

      try {
        // Create directory if needed
        if (params.createDirectory) {
          await fs.mkdir(dirPath, { recursive: true });
        }

        // Check if file exists
        const existingStats = await getFileStats(filePath);
        if (existingStats && !params.overwrite && !params.append) {
          throw new Error('File already exists and overwrite is disabled');
        }

        // Prepare content
        let content: Buffer;
        if (params.encoding === 'base64') {
          content = Buffer.from(params.content, 'base64');
        } else if (params.encoding === 'hex') {
          content = Buffer.from(params.content, 'hex');
        } else {
          content = Buffer.from(params.content, 'utf8');
        }

        // Check file size
        const existingSize = existingStats ? existingStats.size : 0;
        const totalSize = params.append ? existingSize + content.length : content.length;

        if (totalSize > config.maxFileSize) {
          throw new Error(
            `File size (${totalSize} bytes) exceeds maximum (${config.maxFileSize} bytes)`
          );
        }

        // Write file
        const writeOptions: any = {
          encoding: params.encoding || 'utf8',
        };

        if (params.append) {
          await fs.appendFile(filePath, content, writeOptions);
        } else {
          await fs.writeFile(filePath, content, writeOptions);
        }

        const finalStats = await getFileStats(filePath);
        const hash = await calculateFileHash(filePath);

        return {
          path: params.path,
          size: finalStats.size,
          modified: finalStats.modified,
          hash,
          operation: params.append ? 'appended' : 'written',
          contentType: getContentType(params.path),
        };
      } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
      }
    },
  });

  // File deletion tool
  server.registerTool({
    name: 'delete_file',
    description: 'Delete a file or directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to delete (relative to root)',
        },
        recursive: {
          type: 'boolean',
          default: false,
          description: 'Delete directories recursively',
        },
        backup: {
          type: 'boolean',
          default: true,
          description: 'Create backup before deletion',
        },
      },
      required: ['path'],
    },
    handler: async params => {
      if (!config.enableDelete) {
        throw new Error('File deletion is disabled');
      }

      if (!isSafePath(params.path)) {
        throw new Error('Access denied: path outside allowed directory');
      }

      const targetPath = path.resolve(config.rootDirectory, params.path);

      try {
        const stats = await getFileStats(targetPath);
        if (!stats) {
          throw new Error('File or directory not found');
        }

        // Create backup if requested
        let backupPath = null;
        if (params.backup) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupName = `.backup_${timestamp}_${path.basename(params.path)}`;
          backupPath = path.resolve(config.rootDirectory, backupName);

          await fs.rename(targetPath, backupPath);
          console.log(`Backup created: ${backupPath}`);
        }

        // Delete the item
        if (stats.isDirectory()) {
          if (!params.recursive) {
            const items = await fs.readdir(targetPath);
            if (items.length > 0) {
              throw new Error(
                'Directory not empty. Use recursive: true to delete non-empty directories.'
              );
            }
          }
          await fs.rm(targetPath, { recursive: params.recursive });
        } else {
          await fs.unlink(targetPath);
        }

        return {
          path: params.path,
          deleted: true,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          backup: backupPath
            ? {
                path: backupPath,
                createdAt: new Date().toISOString(),
              }
            : null,
        };
      } catch (error) {
        throw new Error(`Failed to delete: ${error.message}`);
      }
    },
  });

  // File search tool
  server.registerTool({
    name: 'search_files',
    description: 'Search for files and directories',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (supports glob patterns and regex)',
        },
        path: {
          type: 'string',
          default: '.',
          description: 'Directory to search in (relative to root)',
        },
        caseSensitive: {
          type: 'boolean',
          default: false,
        },
        includeContent: {
          type: 'boolean',
          default: false,
          description: 'Search within file content (text files only)',
        },
        maxResults: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 100,
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Limit search to specific file types/extensions',
        },
      },
      required: ['query'],
    },
    handler: async params => {
      if (!config.enableSearch) {
        throw new Error('Search functionality is disabled');
      }

      if (!isSafePath(params.path || '.')) {
        throw new Error('Access denied: path outside allowed directory');
      }

      const searchPath = path.resolve(config.rootDirectory, params.path || '.');
      const results = [];
      const regex = new RegExp(
        params.caseSensitive ? params.query : params.query,
        params.caseSensitive ? 'g' : 'gi'
      );

      const searchDirectory = async (dirPath: string, relativePath: string = '') => {
        try {
          const items = await fs.readdir(dirPath, { withFileTypes: true });

          for (const item of items) {
            if (results.length >= params.maxResults) break;

            const itemPath = path.join(dirPath, item.name);
            const relativeItemPath = path.join(relativePath, item.name);

            // Check if filename matches
            let filenameMatch = false;
            if (regex.test(item.name)) {
              filenameMatch = true;
            }

            // Check file type filter
            let fileTypeMatch = true;
            if (params.fileTypes && item.isFile()) {
              const ext = getFileExtension(item.name);
              fileTypeMatch = params.fileTypes.includes(ext);
            }

            let contentMatch = false;
            let contentPreview = null;

            // Search within content for text files
            if (params.includeContent && item.isFile() && isTextFile(item.name)) {
              try {
                const content = await fs.readFile(itemPath, 'utf8');
                if (regex.test(content)) {
                  contentMatch = true;
                  // Extract context around match
                  const matches = content.match(regex);
                  if (matches && matches.length > 0) {
                    const index = content.indexOf(matches[0]);
                    const start = Math.max(0, index - 50);
                    const end = Math.min(content.length, index + matches[0].length + 50);
                    contentPreview = content.substring(start, end) + '...';
                  }
                }
              } catch {
                // Skip files that can't be read as text
              }
            }

            // Add result if match found
            if ((filenameMatch || contentMatch) && fileTypeMatch) {
              const stats = await getFileStats(itemPath);
              results.push({
                path: relativeItemPath,
                name: item.name,
                type: item.isDirectory() ? 'directory' : 'file',
                size: stats?.size || 0,
                modified: stats?.modified,
                matchType: filenameMatch ? 'filename' : 'content',
                contentPreview: contentMatch ? contentPreview : null,
              });
            }

            // Recurse into directories
            if (item.isDirectory()) {
              await searchDirectory(itemPath, relativeItemPath);
            }
          }
        } catch (error) {
          // Skip directories that can't be accessed
        }
      };

      await searchDirectory(searchPath);

      return {
        query: params.query,
        path: params.path || '.',
        results,
        totalFound: results.length,
        maxResults: params.maxResults,
        truncated: results.length >= params.maxResults,
      };
    },
  });

  // File information tool
  server.registerTool({
    name: 'get_file_info',
    description: 'Get detailed information about a file or directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to examine (relative to root)',
        },
        includeContentHash: {
          type: 'boolean',
          default: false,
          description: 'Calculate content hash (may be slow for large files)',
        },
        includePreview: {
          type: 'boolean',
          default: false,
          description: 'Include text preview for files',
        },
      },
      required: ['path'],
    },
    handler: async params => {
      if (!isSafePath(params.path)) {
        throw new Error('Access denied: path outside allowed directory');
      }

      const targetPath = path.resolve(config.rootDirectory, params.path);

      try {
        const stats = await getFileStats(targetPath);
        if (!stats) {
          throw new Error('File or directory not found');
        }

        const info = {
          path: params.path,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          created: stats.created,
          modified: stats.modified,
          accessed: stats.accessed,
          permissions: stats.permissions,
          extension: stats.isFile() ? getFileExtension(params.path) : null,
          contentType: stats.isFile() ? getContentType(params.path) : null,
        };

        // Add hash if requested
        if (params.includeContentHash && stats.isFile() && stats.size <= 10 * 1024 * 1024) {
          info.hash = await calculateFileHash(targetPath);
        }

        // Add preview if requested
        if (
          params.includePreview &&
          stats.isFile() &&
          isTextFile(params.path) &&
          stats.size <= 4096
        ) {
          try {
            const content = await fs.readFile(targetPath, 'utf8');
            info.preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
          } catch {
            // Preview not available
          }
        }

        // For directories, count contents
        if (stats.isDirectory()) {
          try {
            const items = await fs.readdir(targetPath, { withFileTypes: true });
            info.contents = {
              total: items.length,
              files: items.filter(item => item.isFile()).length,
              directories: items.filter(item => item.isDirectory()).length,
            };
          } catch {
            info.contents = { total: 0, files: 0, directories: 0 };
          }
        }

        return info;
      } catch (error) {
        throw new Error(`Failed to get file info: ${error.message}`);
      }
    },
  });

  return server;
}

// Helper functions
function getContentType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes = {
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

function isTextFile(filename: string): boolean {
  const textExtensions = [
    '.txt',
    '.json',
    '.csv',
    '.md',
    '.js',
    '.ts',
    '.html',
    '.css',
    '.xml',
    '.yml',
    '.yaml',
  ];
  return textExtensions.includes(getFileExtension(filename));
}

// Start the file server
async function main() {
  try {
    const server = await createFileServer();
    await server.start();

    console.log('🗂️  File Server started');
    console.log(`📁 Root directory: ${config.rootDirectory}`);
    console.log(`🌐 HTTP API: http://localhost:3002/api/v1/mcp`);
    console.log(`📡 WebSocket: ws://localhost:3003/mcp`);
    console.log(`📋 Allowed extensions: ${config.allowedExtensions.join(', ')}`);
    console.log(`📏 Max file size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
  } catch (error) {
    console.error('❌ Failed to start file server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { createFileServer };
