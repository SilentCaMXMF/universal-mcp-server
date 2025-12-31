/**
 * MCP Client Type Definitions
 */

import { EventEmitter } from 'eventemitter3';

// Re-export core types from server for consistency
export * from '../types';

// Ensure MCPError is available for client
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPClientConfig {
  name?: string;
  version?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  transports: ClientTransportConfig;
}

export interface ClientTransportConfig {
  websocket?: WebSocketClientConfig;
  http?: HttpClientConfig;
  stdio?: StdioClientConfig;
}

export interface WebSocketClientConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  handshakeTimeout?: number;
  pingInterval?: number;
  pongTimeout?: number;
}

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  keepAlive?: boolean;
}

export interface StdioClientConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  encoding?: BufferEncoding;
  delimiter?: string;
}

export interface ClientTransport extends EventEmitter {
  name: string;
  connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(request: MCPRequest): Promise<MCPResponse>;
  onMessage(callback: (response: MCPResponse) => void): void;
  onError(callback: (error: Error) => void): void;
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface ToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface PromptInfo {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64 encoded binary data
}

export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content:
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; resource: ResourceContent };
}

export interface ClientMetrics {
  requestsTotal: number;
  requestsSuccessful: number;
  requestsFailed: number;
  averageResponseTime: number;
  lastRequestTime: number;
  connectionUptime: number;
  reconnectCount: number;
  toolsExecuted: number;
  resourcesAccessed: number;
  promptsUsed: number;
}

export interface ConnectionInfo {
  id: string;
  transport: string;
  connectedAt: number;
  lastActivity: number;
  state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
}

export interface MCPClientEvents {
  connected: () => void;
  disconnected: () => void;
  reconnecting: (attempt: number) => void;
  error: (error: Error) => void;
  message: (message: MCPResponse) => void;
  metrics: (metrics: ClientMetrics) => void;
}
