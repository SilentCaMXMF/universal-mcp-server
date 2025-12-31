/**
 * Unit tests for built-in tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { builtinTools } from '../../src/core/builtin-tools';
import { toolTestData, TestUtils } from '../fixtures/test-data';

describe('Built-in Tools', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    // Create test files for file operations
    await fs.writeFile(`${tempDir}/test.txt`, 'Test content', 'utf8');
    await fs.mkdir(`${tempDir}/subdir`, { recursive: true });
    await fs.writeFile(`${tempDir}/subdir/nested.txt`, 'Nested content', 'utf8');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('echoTool', () => {
    const tool = builtinTools.find(t => t.name === 'echo')!;

    it('should echo back provided message', async () => {
      const params = toolTestData.echo.valid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].text).toContain('Echo: Test echo message');
    });

    it('should handle missing message parameter', async () => {
      const params = toolTestData.echo.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('listFilesTool', () => {
    const tool = builtinTools.find(t => t.name === 'list_files')!;

    it('should list files in directory', async () => {
      const params = { ...toolTestData.listFiles.valid, path: tempDir };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();

      const content = JSON.parse(result.content[0].text);
      expect(content.directory).toBe(tempDir);
      expect(Array.isArray(content.files)).toBe(true);
      expect(content.files.length).toBeGreaterThan(0);
    });

    it('should list files recursively', async () => {
      const params = { ...toolTestData.listFiles.valid, path: tempDir, recursive: true };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const content = JSON.parse(result.content[0].text);
      expect(content.files.some((file: string) => file.includes('nested.txt'))).toBe(true);
    });

    it('should handle non-existent directory', async () => {
      const params = { path: '/non/existent/directory' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing files');
    });

    it('should handle missing path parameter', async () => {
      const params = toolTestData.listFiles.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });
  });

  describe('readFileTool', () => {
    const tool = builtinTools.find(t => t.name === 'read_file')!;

    it('should read file contents', async () => {
      const params = { ...toolTestData.readFile.valid, path: `${tempDir}/test.txt` };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Test content');
    });

    it('should handle non-existent file', async () => {
      const params = { path: '/non/existent/file.txt' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error reading file');
    });

    it('should handle missing path parameter', async () => {
      const params = toolTestData.readFile.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle different encodings', async () => {
      const params = { path: `${tempDir}/test.txt`, encoding: 'utf8' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Test content');
    });
  });

  describe('writeFileTool', () => {
    const tool = builtinTools.find(t => t.name === 'write_file')!;

    it('should write content to file', async () => {
      const filePath = `${tempDir}/written.txt`;
      const params = { ...toolTestData.writeFile.valid, path: filePath };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully wrote');

      // Verify file was actually written
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('Test content');
    });

    it('should handle missing path parameter', async () => {
      const params = toolTestData.writeFile.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle file system errors', async () => {
      const params = { ...toolTestData.writeFile.valid, path: '/invalid/path/file.txt' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error writing file');
    });
  });

  describe('executeCommandTool', () => {
    const tool = builtinTools.find(t => t.name === 'execute_command')!;

    it('should execute command successfully', async () => {
      const params = toolTestData.executeCommand.valid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Command executed successfully');
    });

    it('should handle command that fails', async () => {
      const params = { command: 'nonexistentcommand12345' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Command execution failed');
    });

    it('should handle missing command parameter', async () => {
      const params = toolTestData.executeCommand.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle command timeout', async () => {
      const params = { command: 'sleep', args: ['5'], timeout: 100 };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should execute command with working directory', async () => {
      const params = { command: 'pwd', cwd: tempDir };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(tempDir);
    });
  });

  describe('getSystemInfoTool', () => {
    const tool = builtinTools.find(t => t.name === 'get_system_info')!;

    it('should return system information', async () => {
      const result = (await tool.handler({})) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const info = JSON.parse(result.content[0].text);
      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('memory');
      expect(info).toHaveProperty('cpus');
    });

    it('should filter system information', async () => {
      const params = { include: ['platform', 'arch'] };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const info = JSON.parse(result.content[0].text);
      expect(Object.keys(info)).toEqual(['platform', 'arch']);
      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('arch');
      expect(info).not.toHaveProperty('memory');
    });
  });

  describe('httpRequestTool', () => {
    const tool = builtinTools.find(t => t.name === 'http_request')!;

    it('should make HTTP request successfully', async () => {
      const params = toolTestData.httpRequest.valid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('headers');
      expect(response).toHaveProperty('body');
    }, 10000); // Longer timeout for HTTP request

    it('should handle HTTP errors', async () => {
      const params = { url: 'http://nonexistent-domain-12345.com' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('HTTP request failed');
    }, 10000);

    it('should handle missing URL parameter', async () => {
      const params = toolTestData.httpRequest.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle request timeout', async () => {
      const params = {
        url: 'https://httpbin.org/delay/10',
        timeout: 1000,
      };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    }, 5000);

    it('should handle different HTTP methods', async () => {
      const params = {
        url: 'https://httpbin.org/anything',
        method: 'POST',
        body: 'Test body',
        headers: { 'Content-Type': 'text/plain' },
      };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const response = JSON.parse(result.content[0].text);
      expect(response.method).toBe('POST');
    }, 10000);
  });

  describe('searchFilesTool', () => {
    const tool = builtinTools.find(t => t.name === 'search_files')!;

    it('should search for files matching pattern', async () => {
      const params = { ...toolTestData.searchFiles.valid, directory: tempDir };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const searchResult = JSON.parse(result.content[0].text);
      expect(searchResult).toHaveProperty('pattern');
      expect(searchResult).toHaveProperty('files');
      expect(searchResult).toHaveProperty('count');
      expect(Array.isArray(searchResult.files)).toBe(true);
    });

    it('should limit search results', async () => {
      const params = {
        pattern: '*.txt',
        directory: tempDir,
        max_results: 1,
      };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const searchResult = JSON.parse(result.content[0].text);
      expect(searchResult.files.length).toBeLessThanOrEqual(1);
    });

    it('should include hidden files when requested', async () => {
      // Create hidden file
      await fs.writeFile(`${tempDir}/.hidden.txt`, 'Hidden content', 'utf8');

      const params = {
        pattern: '*.txt',
        directory: tempDir,
        include_hidden: true,
      };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      const searchResult = JSON.parse(result.content[0].text);
      const hiddenFile = searchResult.files.find((file: string) => file.includes('.hidden.txt'));
      expect(hiddenFile).toBeDefined();
    });

    it('should handle missing pattern parameter', async () => {
      const params = toolTestData.searchFiles.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle search errors', async () => {
      const params = { pattern: '*.txt', directory: '/non/existent/path' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false); // Glob doesn't throw for non-existent directories
    });
  });

  describe('createDirectoryTool', () => {
    const tool = builtinTools.find(t => t.name === 'create_directory')!;

    it('should create directory successfully', async () => {
      const dirPath = `${tempDir}/new-directory`;
      const params = { ...toolTestData.createDirectory.valid, path: dirPath };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully created directory');

      // Verify directory was created
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const dirPath = `${tempDir}/nested/deep/directory`;
      const params = { path: dirPath, recursive: true };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      // Verify directory was created
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should handle missing path parameter', async () => {
      const params = toolTestData.createDirectory.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle directory creation errors', async () => {
      const params = { path: '/invalid/path/that/cannot/be/created' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating directory');
    });
  });

  describe('deleteFileTool', () => {
    const tool = builtinTools.find(t => t.name === 'delete_file')!;

    it('should delete file successfully', async () => {
      const filePath = `${tempDir}/to-delete.txt`;
      await fs.writeFile(filePath, 'Content to delete', 'utf8');

      const params = { ...toolTestData.deleteFile.valid, path: filePath };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Successfully deleted');

      // Verify file was deleted
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('should delete directory recursively', async () => {
      const dirPath = `${tempDir}/dir-to-delete`;
      await fs.mkdir(`${dirPath}/subdir`, { recursive: true });
      await fs.writeFile(`${dirPath}/file.txt`, 'Content', 'utf8');

      const params = { path: dirPath, recursive: true };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);

      // Verify directory was deleted
      await expect(fs.stat(dirPath)).rejects.toThrow();
    });

    it('should handle missing path parameter', async () => {
      const params = toolTestData.deleteFile.invalid;
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle deletion of non-existent file', async () => {
      const params = { path: '/non/existent/file.txt' };
      const result = (await tool.handler(params)) as any;

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error deleting file');
    });
  });

  describe('Tool Validation', () => {
    it('should have all required built-in tools', () => {
      const expectedTools = [
        'echo',
        'list_files',
        'read_file',
        'write_file',
        'execute_command',
        'get_system_info',
        'http_request',
        'search_files',
        'create_directory',
        'delete_file',
      ];

      const actualTools = builtinTools.map(tool => tool.name);
      expect(actualTools).toEqual(expect.arrayContaining(expectedTools));
      expect(actualTools).toHaveLength(expectedTools.length);
    });

    it('should have valid tool definitions', () => {
      builtinTools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should have valid input schemas', () => {
      builtinTools.forEach(tool => {
        const schema = tool.inputSchema;
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
        expect(schema).toHaveProperty('properties');
        expect(typeof schema.properties).toBe('object');
      });
    });
  });
});
