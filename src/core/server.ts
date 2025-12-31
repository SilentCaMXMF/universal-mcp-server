/**
 * Core MCP Server implementation
 */

import type {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  Metrics,
  ConnectionInfo,
} from '../types/index';
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { PluginManager } from './plugin-manager';
import { TransportManager } from './transport-manager';

/**
 * Generate a UUID v4
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Main MCP Server class that orchestrates all components
 */
export class MCPServer extends EventTarget {
  private config: MCPServerConfig;
  private logger: Logger;
  private metrics: MetricsCollector;
  private pluginManager: PluginManager;
  private transportManager: TransportManager;
  private isRunning = false;
  private connections = new Map<string, ConnectionInfo>();
  private tools = new Map<string, MCPTool>();

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
    this.logger = new Logger(config.logging);
    this.metrics = new MetricsCollector();
    this.pluginManager = new PluginManager(this.logger);
    this.transportManager = new TransportManager(this.logger);

    this.setupErrorHandling();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      this.logger.info(`Starting MCP server: ${this.config.name} v${this.config.version}`);

      // Initialize plugins
      await this.pluginManager.initialize(this.config.plugins || []);

      // Register built-in tools
      this.registerBuiltinTools();

      // Load plugin tools
      const pluginTools = this.pluginManager.getAllTools();
      pluginTools.forEach((tool: MCPTool) => {
        this.tools.set(tool.name, tool);
      });

      // Start transports
      await this.transportManager.start(this.config.transports);

      // Setup transport message handlers
      this.setupTransportHandlers();

      this.isRunning = true;
      this.dispatchEvent(new CustomEvent('started'));
      this.logger.info('MCP server started successfully');
    } catch (error) {
      this.logger.error('Failed to start MCP server', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping MCP server');

      // Stop transports
      await this.transportManager.stop();

      // Cleanup plugins
      await this.pluginManager.cleanup();

      // Clear connections
      this.connections.clear();

      this.isRunning = false;
      this.dispatchEvent(new CustomEvent('stopped'));
      this.logger.info('MCP server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping MCP server', error);
      throw error;
    }
  }

  /**
   * Process an incoming MCP request
   */
  async processRequest(request: MCPRequest, connectionId?: string): Promise<MCPResponse> {
    const startTime = Date.now();
    const requestId = request.id || uuidv4();

    try {
      this.logger.debug(`Processing request: ${request.method}`, {
        requestId,
        params: request.params,
      });

      // Update connection activity
      if (connectionId) {
        this.updateConnectionActivity(connectionId);
      }

      // Route request to appropriate handler
      let result: unknown;
      switch (request.method) {
        case 'tools/list':
          result = this.handleListTools();
          break;
        case 'tools/call':
          result = await this.handleToolCall(request.params || {});
          break;
        case 'resources/list':
          result = this.handleListResources();
          break;
        case 'resources/read':
          result = await this.handleReadResource(request.params || {});
          break;
        case 'server/info':
          result = this.handleServerInfo();
          break;
        default:
          throw new Error(`Unknown method: ${request.method}`);
      }

      const response: MCPResponse = {
        id: requestId,
        result,
        timestamp: Date.now(),
      };

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.recordRequest(duration, true);

      this.logger.debug(`Request completed: ${request.method}`, { requestId, duration });
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordRequest(duration, false);

      const mcpError: MCPError = {
        code: (error as any).code || -32603,
        message: (error as Error).message || 'Internal server error',
        data: (error as any).data,
      };

      const response: MCPResponse = {
        id: requestId,
        error: mcpError,
        timestamp: Date.now(),
      };

      this.logger.error(`Request failed: ${request.method}`, { requestId, error });
      return response;
    }
  }

  /**
   * Get current server metrics
   */
  getMetrics(): Metrics {
    return {
      ...this.metrics.getMetrics(),
      activeConnections: this.connections.size,
    };
  }

  /**
   * Get all registered tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.tools.delete(name);
    this.logger.debug(`Unregistered tool: ${name}`);
  }

  private setupErrorHandling(): void {
    this.addEventListener('error', (event: any) => {
      this.logger.error('Server error', event.detail);
    });
  }

  private setupTransportHandlers(): void {
    this.transportManager.addEventListener('message', async (event: any) => {
      const { request, connectionId } = event.detail;
      try {
        const response = await this.processRequest(request, connectionId);
        await this.transportManager.send(connectionId, response);
      } catch (error) {
        this.logger.error('Error handling transport message', error);
      }
    });

    this.transportManager.addEventListener('connection', (event: any) => {
      const { connectionId, transport } = event.detail;
      const connection: ConnectionInfo = {
        id: connectionId,
        transport,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };
      this.connections.set(connectionId, connection);
      this.dispatchEvent(new CustomEvent('connection', { detail: connection }));
      this.logger.debug(`New connection: ${connectionId} (${transport})`);
    });

    this.transportManager.addEventListener('disconnection', (event: any) => {
      const connectionId = event.detail;
      this.connections.delete(connectionId);
      this.dispatchEvent(new CustomEvent('disconnection', { detail: connectionId }));
      this.logger.debug(`Connection closed: ${connectionId}`);
    });
  }

  private registerBuiltinTools(): void {
    // Import and register all built-in tools
    const { builtinTools } = require('./builtin-tools');
    builtinTools.forEach((tool: MCPTool) => {
      this.registerTool(tool);
    });

    // Additional server-specific tools
    this.registerTool({
      name: 'server_info',
      description: 'Get server information and status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => this.handleServerInfo(),
    });

    this.registerTool({
      name: 'server_metrics',
      description: 'Get server performance metrics',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => this.getMetrics(),
    });
  }

  private handleListTools(): {
    tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
  } {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return { tools };
  }

  private async handleToolCall(params: Record<string, unknown>): Promise<unknown> {
    const { name, arguments: args } = params as {
      name?: string;
      arguments?: Record<string, unknown>;
    };

    if (!name) {
      throw new Error('Tool name is required');
    }

    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    this.logger.debug(`Executing tool: ${name}`, args);
    return await tool.handler(args || {});
  }

  private handleListResources(): {
    resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }>;
  } {
    const resources = this.pluginManager.getAllResources();
    return { resources };
  }

  private async handleReadResource(params: Record<string, unknown>): Promise<unknown> {
    const { uri } = params as { uri?: string };

    if (!uri) {
      throw new Error('Resource URI is required');
    }

    const resource = this.pluginManager.getResource(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    return { contents: [resource] };
  }

  private handleServerInfo(): Record<string, unknown> {
    return {
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      capabilities: {
        tools: true,
        resources: true,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }
}
