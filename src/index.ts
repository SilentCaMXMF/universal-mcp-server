/**
 * Universal MCP Server - Main Entry Point
 *
 * A comprehensive, reusable MCP (Model Context Protocol) server implementation
 * with multi-protocol support and plugin system.
 */

// Core classes
export { MCPServer } from './core/server';
export { TransportManager } from './core/transport-manager';
export { PluginManager } from './core/plugin-manager';
export { Logger } from './utils/logger';
export { MetricsCollector } from './utils/metrics';

// Built-in tools
export { builtinTools } from './core/builtin-tools';

// Re-export all built-in tools individually for convenience
export {
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
} from './core/builtin-tools';

// Types
export type {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  MCPResource,
  Transport,
  Plugin,
  Metrics,
  ConnectionInfo,
  TransportConfig,
  WebSocketTransportConfig,
  HttpTransportConfig,
  StdioTransportConfig,
  PluginConfig,
  LoggingConfig,
  SecurityConfig,
  RateLimitConfig,
} from './types/index';

// Default export for easy usage
export { MCPServer as default } from './core/server';
