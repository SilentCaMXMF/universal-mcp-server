/**
 * Enhanced Plugin Manager with dynamic loading and lifecycle management
 */

import type { Plugin, PluginConfig, MCPTool, MCPResource } from '../types/index';
import { Logger } from '../utils/logger';

/**
 * Plugin state enum
 */
enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVE = 'active',
  ERROR = 'error',
}

/**
 * Plugin wrapper with state management
 */
interface PluginWrapper {
  plugin: Plugin;
  config: PluginConfig;
  state: PluginState;
  error?: Error;
  loadedAt?: number;
}

/**
 * Enhanced Plugin Manager
 */
export class PluginManager {
  private plugins = new Map<string, PluginWrapper>();
  private logger: Logger;
  private pluginPaths: string[] = [];

  constructor(logger: Logger, pluginPaths: string[] = []) {
    this.logger = logger;
    this.pluginPaths = pluginPaths;
  }

  async initialize(configs: PluginConfig[]): Promise<void> {
    this.logger.info(`Initializing ${configs.length} plugins`);

    for (const config of configs) {
      if (config.enabled) {
        try {
          await this.loadPlugin(config);
        } catch (error) {
          this.logger.error(`Failed to initialize plugin: ${config.name}`, error);
        }
      } else {
        this.logger.info(`Plugin disabled: ${config.name}`);
      }
    }

    this.logger.info(
      `Plugin initialization complete. Active plugins: ${this.getActivePluginCount()}`
    );
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up plugins');

    for (const [name, wrapper] of this.plugins) {
      try {
        if (wrapper.plugin.cleanup) {
          await wrapper.plugin.cleanup();
        }
        this.logger.debug(`Cleaned up plugin: ${name}`);
      } catch (error) {
        this.logger.error(`Error cleaning up plugin: ${name}`, error);
      }
    }
    this.plugins.clear();
    this.logger.info('Plugin cleanup complete');
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(config: PluginConfig): Promise<void> {
    if (this.plugins.has(config.name)) {
      throw new Error(`Plugin already loaded: ${config.name}`);
    }

    const wrapper: PluginWrapper = {
      plugin: null as any,
      config,
      state: PluginState.LOADING,
    };
    this.plugins.set(config.name, wrapper);

    try {
      // Try to dynamically import the plugin
      let plugin: Plugin;

      // For now, create a mock plugin to demonstrate the structure
      // In a real implementation, you would dynamically import from files
      plugin = await this.createMockPlugin(config);

      // Initialize the plugin if it has an initialize method
      if (plugin.initialize) {
        await plugin.initialize(config);
      }

      wrapper.plugin = plugin;
      wrapper.state = PluginState.ACTIVE;
      wrapper.loadedAt = Date.now();

      this.logger.info(`Plugin loaded successfully: ${config.name} v${plugin.version}`);
    } catch (error) {
      wrapper.state = PluginState.ERROR;
      wrapper.error = error as Error;
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const wrapper = this.plugins.get(name);
    if (!wrapper) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (wrapper.state === PluginState.ACTIVE && wrapper.plugin.cleanup) {
      await wrapper.plugin.cleanup();
    }

    this.plugins.delete(name);
    this.logger.info(`Plugin unloaded: ${name}`);
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(name: string): Promise<void> {
    const wrapper = this.plugins.get(name);
    if (!wrapper) {
      throw new Error(`Plugin not found: ${name}`);
    }

    const config = wrapper.config;
    await this.unloadPlugin(name);
    await this.loadPlugin(config);
    this.logger.info(`Plugin reloaded: ${name}`);
  }

  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const wrapper of this.plugins.values()) {
      if (wrapper.state === PluginState.ACTIVE && wrapper.plugin.tools) {
        tools.push(...wrapper.plugin.tools);
      }
    }
    return tools;
  }

  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const wrapper of this.plugins.values()) {
      if (wrapper.state === PluginState.ACTIVE && wrapper.plugin.resources) {
        resources.push(...wrapper.plugin.resources);
      }
    }
    return resources;
  }

  getResource(uri: string): MCPResource | undefined {
    for (const wrapper of this.plugins.values()) {
      if (wrapper.state === PluginState.ACTIVE && wrapper.plugin.resources) {
        const resource = wrapper.plugin.resources.find(r => r.uri === uri);
        if (resource) {
          return resource;
        }
      }
    }
    return undefined;
  }

  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`);
    }

    const wrapper: PluginWrapper = {
      plugin,
      config: { name: plugin.name, enabled: true },
      state: PluginState.ACTIVE,
      loadedAt: Date.now(),
    };

    this.plugins.set(plugin.name, wrapper);
    this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  unregisterPlugin(name: string): void {
    const wrapper = this.plugins.get(name);
    if (!wrapper) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (wrapper.state === PluginState.ACTIVE && wrapper.plugin.cleanup) {
      wrapper.plugin.cleanup();
    }

    this.plugins.delete(name);
    this.logger.debug(`Plugin unregistered: ${name}`);
  }

  getPlugin(name: string): Plugin | undefined {
    const wrapper = this.plugins.get(name);
    return wrapper?.state === PluginState.ACTIVE ? wrapper.plugin : undefined;
  }

  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginInfo(name: string): PluginWrapper | undefined {
    return this.plugins.get(name);
  }

  getAllPluginInfo(): Record<string, PluginWrapper> {
    return Object.fromEntries(this.plugins.entries());
  }

  getActivePluginCount(): number {
    return Array.from(this.plugins.values()).filter(wrapper => wrapper.state === PluginState.ACTIVE)
      .length;
  }

  /**
   * Enable or disable a plugin
   */
  async setPluginEnabled(name: string, enabled: boolean): Promise<void> {
    const wrapper = this.plugins.get(name);
    if (!wrapper) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (enabled && wrapper.state !== PluginState.ACTIVE) {
      await this.reloadPlugin(name);
    } else if (!enabled && wrapper.state === PluginState.ACTIVE) {
      await this.unloadPlugin(name);
      // Keep the plugin info but mark as disabled
      wrapper.state = PluginState.UNLOADED;
      this.plugins.set(name, wrapper);
    }
  }

  /**
   * Create a mock plugin for demonstration
   * In a real implementation, this would dynamically load from files
   */
  private async createMockPlugin(config: PluginConfig): Promise<Plugin> {
    return {
      name: config.name,
      version: '1.0.0',
      description: `Mock plugin for ${config.name}`,
      tools: [],
      resources: [],
      initialize: async (config: PluginConfig) => {
        this.logger.debug(`Mock plugin initialized: ${config.name}`);
      },
      cleanup: async () => {
        this.logger.debug(`Mock plugin cleaned up: ${config.name}`);
      },
    };
  }

  /**
   * Search for plugins in configured paths
   */
  async discoverPlugins(): Promise<string[]> {
    const pluginFiles: string[] = [];

    for (const pluginPath of this.pluginPaths) {
      try {
        // In a real implementation, you would scan directories for plugin files
        this.logger.debug(`Scanning for plugins in: ${pluginPath}`);
      } catch (error) {
        this.logger.warn(`Failed to scan plugin path: ${pluginPath}`, error);
      }
    }

    return pluginFiles;
  }

  /**
   * Validate plugin configuration
   */
  validatePluginConfig(config: PluginConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('Plugin enabled flag is required and must be a boolean');
    }

    if (config.options && typeof config.options !== 'object') {
      errors.push('Plugin options must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    total: number;
    active: number;
    loaded: number;
    error: number;
    disabled: number;
  } {
    const stats = {
      total: this.plugins.size,
      active: 0,
      loaded: 0,
      error: 0,
      disabled: 0,
    };

    for (const wrapper of this.plugins.values()) {
      switch (wrapper.state) {
        case PluginState.ACTIVE:
          stats.active++;
          stats.loaded++;
          break;
        case PluginState.LOADED:
          stats.loaded++;
          break;
        case PluginState.ERROR:
          stats.error++;
          break;
        case PluginState.UNLOADED:
          stats.disabled++;
          break;
      }
    }

    return stats;
  }
}
