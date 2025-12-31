/**
 * Core type definitions for the Universal MCP Server
 */

export interface MCPRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
  timestamp?: number;
}

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: MCPError;
  timestamp: number;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  transports: TransportConfig;
  plugins?: PluginConfig[];
  logging?: LoggingConfig;
  security?: SecurityConfig;
}

export interface TransportConfig {
  websocket?: WebSocketTransportConfig;
  http?: HttpTransportConfig;
  stdio?: StdioTransportConfig;
}

export interface WebSocketTransportConfig {
  port: number;
  host?: string;
  path?: string;
  maxConnections?: number;
}

export interface HttpTransportConfig {
  port: number;
  host?: string;
  path?: string;
  cors?: boolean;
  rateLimit?: RateLimitConfig;
}

export interface StdioTransportConfig {
  encoding?: BufferEncoding;
  delimiter?: string;
}

export interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  file?: string;
}

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableInputValidation: boolean;
  maxRequestSize?: number;
  allowedOrigins?: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

export interface Transport {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(connectionId: string, message: MCPResponse): Promise<void>;
  onMessage(callback: (message: MCPRequest, connectionId: string) => void): void;
  isConnected(): boolean;
  getConnectionCount?(): number;
}

export interface Plugin {
  name: string;
  version: string;
  description: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  initialize?(config: PluginConfig): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface Metrics {
  requestsTotal: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface ConnectionInfo {
  id: string;
  transport: string;
  connectedAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}
