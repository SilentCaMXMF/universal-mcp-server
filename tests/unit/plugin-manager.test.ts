/**
 * Unit tests for PluginManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluginManager } from '../../src/core/plugin-manager';
import { Logger } from '../../src/utils/logger';
import { mockPlugin, errorPlugin } from '../fixtures/test-data';
import type { PluginConfig } from '../../src/types/index';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger({ level: 'error' });
    pluginManager = new PluginManager(mockLogger);
  });

  afterEach(async () => {
    await pluginManager.cleanup();
  });

  describe('Construction', () => {
    it('should create plugin manager with logger', () => {
      expect(pluginManager).toBeDefined();
      expect(pluginManager).toBeInstanceOf(PluginManager);
    });

    it('should start with no plugins', () => {
      expect(pluginManager.getPluginNames()).toHaveLength(0);
      expect(pluginManager.getActivePluginCount()).toBe(0);
    });
  });

  describe('Plugin Registration', () => {
    it('should register plugin successfully', () => {
      pluginManager.registerPlugin(mockPlugin);

      const pluginNames = pluginManager.getPluginNames();
      expect(pluginNames).toContain(mockPlugin.name);

      const plugin = pluginManager.getPlugin(mockPlugin.name);
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe(mockPlugin.name);
    });

    it('should throw error when registering duplicate plugin', () => {
      pluginManager.registerPlugin(mockPlugin);

      expect(() => pluginManager.registerPlugin(mockPlugin)).toThrow('Plugin already registered');
    });

    it('should unregister plugin successfully', () => {
      pluginManager.registerPlugin(mockPlugin);
      expect(pluginManager.getPluginNames()).toContain(mockPlugin.name);

      pluginManager.unregisterPlugin(mockPlugin.name);
      expect(pluginManager.getPluginNames()).not.toContain(mockPlugin.name);
    });

    it('should throw error when unregistering non-existent plugin', () => {
      expect(() => pluginManager.unregisterPlugin('non-existent')).toThrow('Plugin not found');
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should initialize plugins from config', async () => {
      const configs: PluginConfig[] = [
        { name: 'test-plugin-1', enabled: true },
        { name: 'test-plugin-2', enabled: true },
      ];

      await pluginManager.initialize(configs);

      expect(pluginManager.getPluginNames()).toHaveLength(2);
      expect(pluginManager.getActivePluginCount()).toBe(2);
    });

    it('should skip disabled plugins', async () => {
      const configs: PluginConfig[] = [
        { name: 'enabled-plugin', enabled: true },
        { name: 'disabled-plugin', enabled: false },
      ];

      await pluginManager.initialize(configs);

      expect(pluginManager.getPluginNames()).toHaveLength(1);
      expect(pluginManager.getActivePluginCount()).toBe(1);
      expect(pluginManager.getPluginNames()).toContain('enabled-plugin');
    });

    it('should handle plugin loading errors gracefully', async () => {
      const configs: PluginConfig[] = [
        { name: 'valid-plugin', enabled: true },
        { name: 'invalid-plugin', enabled: true },
      ];

      // Mock the createMockPlugin to throw for specific plugin
      const originalCreateMockPlugin = (pluginManager as any).createMockPlugin;
      (pluginManager as any).createMockPlugin = vi
        .fn()
        .mockImplementation((config: PluginConfig) => {
          if (config.name === 'invalid-plugin') {
            throw new Error('Failed to load plugin');
          }
          return originalCreateMockPlugin.call(pluginManager, config);
        });

      await pluginManager.initialize(configs);

      // Should still load the valid plugin
      expect(pluginManager.getPluginNames()).toContain('valid-plugin');
      expect(pluginManager.getActivePluginCount()).toBe(1);
    });
  });

  describe('Plugin Loading', () => {
    it('should load plugin successfully', async () => {
      const config: PluginConfig = {
        name: 'load-test-plugin',
        enabled: true,
      };

      await pluginManager.loadPlugin(config);

      expect(pluginManager.getPluginNames()).toContain('load-test-plugin');
      expect(pluginManager.getActivePluginCount()).toBe(1);
    });

    it('should throw error when loading duplicate plugin', async () => {
      const config: PluginConfig = {
        name: 'duplicate-plugin',
        enabled: true,
      };

      await pluginManager.loadPlugin(config);

      await expect(pluginManager.loadPlugin(config)).rejects.toThrow('Plugin already loaded');
    });

    it('should unload plugin successfully', async () => {
      const config: PluginConfig = {
        name: 'unload-test-plugin',
        enabled: true,
      };

      await pluginManager.loadPlugin(config);
      expect(pluginManager.getPluginNames()).toContain('unload-test-plugin');

      await pluginManager.unloadPlugin('unload-test-plugin');
      expect(pluginManager.getPluginNames()).not.toContain('unload-test-plugin');
    });

    it('should throw error when unloading non-existent plugin', async () => {
      await expect(pluginManager.unloadPlugin('non-existent')).rejects.toThrow('Plugin not found');
    });

    it('should reload plugin successfully', async () => {
      const config: PluginConfig = {
        name: 'reload-test-plugin',
        enabled: true,
      };

      await pluginManager.loadPlugin(config);
      const initialLoadTime = pluginManager.getPluginInfo('reload-test-plugin')?.loadedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await pluginManager.reloadPlugin('reload-test-plugin');

      expect(pluginManager.getPluginNames()).toContain('reload-test-plugin');
      const reloadTime = pluginManager.getPluginInfo('reload-test-plugin')?.loadedAt;
      expect(reloadTime).not.toBe(initialLoadTime);
    });

    it('should throw error when reloading non-existent plugin', async () => {
      await expect(pluginManager.reloadPlugin('non-existent')).rejects.toThrow('Plugin not found');
    });
  });

  describe('Tool Management', () => {
    beforeEach(async () => {
      pluginManager.registerPlugin(mockPlugin);
    });

    it('should get all tools from active plugins', () => {
      const tools = pluginManager.getAllTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      const testTool = tools.find(tool => tool.name === 'test_tool');
      expect(testTool).toBeDefined();
      expect(testTool?.description).toBe('A test tool');
    });

    it('should return empty array when no tools are available', () => {
      // Create new plugin manager with no plugins
      const emptyManager = new PluginManager(mockLogger);
      const tools = emptyManager.getAllTools();

      expect(tools).toHaveLength(0);
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      pluginManager.registerPlugin(mockPlugin);
    });

    it('should get all resources from active plugins', () => {
      const resources = pluginManager.getAllResources();

      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);

      const testResource = resources.find(resource => resource.uri === 'test://resource');
      expect(testResource).toBeDefined();
      expect(testResource?.name).toBe('Test Resource');
    });

    it('should get specific resource by URI', () => {
      const resource = pluginManager.getResource('test://resource');

      expect(resource).toBeDefined();
      expect(resource?.uri).toBe('test://resource');
      expect(resource?.name).toBe('Test Resource');
    });

    it('should return undefined for non-existent resource', () => {
      const resource = pluginManager.getResource('non-existent://resource');
      expect(resource).toBeUndefined();
    });
  });

  describe('Plugin State Management', () => {
    it('should enable and disable plugins', async () => {
      const config: PluginConfig = {
        name: 'toggle-test-plugin',
        enabled: true,
      };

      await pluginManager.loadPlugin(config);
      expect(pluginManager.getActivePluginCount()).toBe(1);

      // Disable plugin
      await pluginManager.setPluginEnabled('toggle-test-plugin', false);
      expect(pluginManager.getActivePluginCount()).toBe(0);

      // Re-enable plugin
      await pluginManager.setPluginEnabled('toggle-test-plugin', true);
      expect(pluginManager.getActivePluginCount()).toBe(1);
    });

    it('should throw error when toggling non-existent plugin', async () => {
      await expect(pluginManager.setPluginEnabled('non-existent', true)).rejects.toThrow(
        'Plugin not found'
      );
    });

    it('should get plugin info', () => {
      pluginManager.registerPlugin(mockPlugin);

      const info = pluginManager.getPluginInfo(mockPlugin.name);
      expect(info).toBeDefined();
      expect(info?.plugin.name).toBe(mockPlugin.name);
      expect(info?.config.name).toBe(mockPlugin.name);
    });

    it('should return undefined for non-existent plugin info', () => {
      const info = pluginManager.getPluginInfo('non-existent');
      expect(info).toBeUndefined();
    });

    it('should get all plugin info', () => {
      pluginManager.registerPlugin(mockPlugin);

      const allInfo = pluginManager.getAllPluginInfo();
      expect(allInfo).toBeDefined();
      expect(allInfo[mockPlugin.name]).toBeDefined();
    });
  });

  describe('Plugin Statistics', () => {
    it('should return correct statistics for empty manager', () => {
      const stats = pluginManager.getStats();

      expect(stats).toEqual({
        total: 0,
        active: 0,
        loaded: 0,
        error: 0,
        disabled: 0,
      });
    });

    it('should track active plugins', () => {
      pluginManager.registerPlugin(mockPlugin);

      const stats = pluginManager.getStats();
      expect(stats.total).toBe(1);
      expect(stats.active).toBe(1);
      expect(stats.loaded).toBe(1);
    });

    it('should track multiple plugins', () => {
      pluginManager.registerPlugin(mockPlugin);
      pluginManager.registerPlugin(errorPlugin);

      const stats = pluginManager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.loaded).toBe(2);
    });
  });

  describe('Plugin Configuration Validation', () => {
    it('should validate correct plugin config', () => {
      const validConfig: PluginConfig = {
        name: 'valid-plugin',
        enabled: true,
        options: { test: 'value' },
      };

      const validation = pluginManager.validatePluginConfig(validConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid plugin config', () => {
      const invalidConfig = {
        name: '',
        enabled: 'not-a-boolean',
        options: 'not-an-object',
      } as any;

      const validation = pluginManager.validatePluginConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Plugin name is required');
    });

    it('should detect missing plugin name', () => {
      const configWithoutName = {
        enabled: true,
      } as any;

      const validation = pluginManager.validatePluginConfig(configWithoutName);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Plugin name is required and must be a string');
    });

    it('should detect invalid enabled flag', () => {
      const configWithInvalidEnabled = {
        name: 'test-plugin',
        enabled: 'true',
      } as any;

      const validation = pluginManager.validatePluginConfig(configWithInvalidEnabled);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Plugin enabled flag is required and must be a boolean');
    });

    it('should detect invalid options object', () => {
      const configWithInvalidOptions = {
        name: 'test-plugin',
        enabled: true,
        options: 'not-an-object',
      } as any;

      const validation = pluginManager.validatePluginConfig(configWithInvalidOptions);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Plugin options must be an object');
    });
  });

  describe('Plugin Discovery', () => {
    it('should discover plugins without errors', async () => {
      const pluginManagerWithPath = new PluginManager(mockLogger, ['/fake/path']);

      const pluginFiles = await pluginManagerWithPath.discoverPlugins();

      // Should not throw and return array (even if empty)
      expect(Array.isArray(pluginFiles)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all plugins successfully', async () => {
      pluginManager.registerPlugin(mockPlugin);
      pluginManager.registerPlugin(errorPlugin);

      expect(pluginManager.getPluginNames()).toHaveLength(2);

      await pluginManager.cleanup();

      expect(pluginManager.getPluginNames()).toHaveLength(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      const pluginWithCleanupError = {
        ...mockPlugin,
        name: 'cleanup-error-plugin',
        cleanup: vi.fn().mockRejectedValue(new Error('Cleanup failed')),
      };

      pluginManager.registerPlugin(pluginWithCleanupError);

      // Should not throw even if cleanup fails
      await expect(pluginManager.cleanup()).resolves.not.toThrow();
    });
  });
});
