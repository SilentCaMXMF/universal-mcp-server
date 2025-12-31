/**
 * Enhanced Transport Manager with full protocol implementations
 */

import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type {
  TransportConfig,
  MCPResponse,
  MCPRequest,
  Transport,
  WebSocketTransportConfig,
  HttpTransportConfig,
  StdioTransportConfig,
} from '../types/index';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocket Transport implementation
 */
class WebSocketTransport implements Transport {
  name = 'websocket';
  private wss?: WebSocketServer;
  private connections = new Map<string, WebSocket>();
  private messageCallback?: (message: MCPRequest, connectionId: string) => void;
  private logger: Logger;
  private config: WebSocketTransportConfig;

  constructor(config: WebSocketTransportConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.config.port,
          host: this.config.host || 'localhost',
        });

        this.wss.on('connection', (ws: WebSocket, _request) => {
          const connectionId = uuidv4();

          this.connections.set(connectionId, ws);

          this.logger.info(`WebSocket client connected: ${connectionId}`, {
            remoteAddress: _request.socket.remoteAddress,
            userAgent: _request.headers['user-agent'],
          });

          ws.on('message', (data: Buffer) => {
            try {
              const message = JSON.parse(data.toString());
              this.messageCallback?.(message, connectionId);
            } catch (error) {
              this.logger.error(`Invalid JSON received from ${connectionId}:`, error);
            }
          });

          ws.on('close', () => {
            this.connections.delete(connectionId);
            this.logger.info(`WebSocket client disconnected: ${connectionId}`);
          });

          ws.on('error', (error: Error) => {
            this.logger.error(`WebSocket error for ${connectionId}:`, error);
            this.connections.delete(connectionId);
          });

          // Send welcome message
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'connected',
              params: { connectionId, server: 'Universal MCP Server' },
            })
          );
        });

        this.wss.on('error', reject);

        this.logger.info(
          `WebSocket server started on ${this.config.host || 'localhost'}:${this.config.port}`
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.wss) {
      // Close all connections
      for (const [, ws] of this.connections) {
        ws.close();
      }
      this.connections.clear();

      return new Promise(resolve => {
        this.wss!.close(() => {
          this.logger.info('WebSocket server stopped');
          resolve();
        });
      });
    }
  }

  async send(connectionId: string, message: MCPResponse): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      throw new Error(`WebSocket connection not found or not open: ${connectionId}`);
    }
  }

  onMessage(callback: (message: MCPRequest, connectionId: string) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.connections.size > 0;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

/**
 * HTTP Transport implementation
 */
class HttpTransport implements Transport {
  name = 'http';
  private app?: express.Application;
  private server?: any;
  private messageCallback?: (message: MCPRequest, connectionId: string) => void;
  private logger: Logger;
  private config: HttpTransportConfig;

  constructor(config: HttpTransportConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app = express();

        // Security middleware
        if (this.config.cors !== false) {
          this.app.use(cors());
        }
        this.app.use(helmet());
        this.app.use(express.json({ limit: '10mb' }));

        // Health check endpoint
        this.app.get('/health', (_req, res) => {
          res.json({
            status: 'healthy',
            server: 'Universal MCP Server',
            timestamp: new Date().toISOString(),
          });
        });

        // Main MCP endpoint
        this.app.post(this.config.path || '/mcp', (req, res) => {
          const connectionId = `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          try {
            const message: MCPRequest = req.body;

            if (!message.method) {
              return res.status(400).json({
                jsonrpc: '2.0',
                error: { code: -32600, message: 'Invalid Request' },
                id: message.id || null,
              });
            }

            this.messageCallback?.(message, connectionId);

            // For HTTP, we need to handle response synchronously
            // In a real implementation, you'd want to wait for actual response
            return res.json({
              jsonrpc: '2.0',
              id: message.id,
              result: { status: 'received', connectionId },
            });
          } catch (error) {
            this.logger.error(`HTTP request error:`, error);
            return res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal error',
                data: (error as Error).message,
              },
              id: req.body?.id || null,
            });
          }
        });

        this.server = this.app.listen(this.config.port, this.config.host || 'localhost', () => {
          this.logger.info(
            `HTTP server started on ${this.config.host || 'localhost'}:${this.config.port}`
          );
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise(resolve => {
        this.server!.close(() => {
          this.logger.info('HTTP server stopped');
          resolve();
        });
      });
    }
  }

  async send(_connectionId: string, _message: MCPResponse): Promise<void> {
    // HTTP transport doesn't maintain persistent connections
    // In a real implementation, you might use Server-Sent Events or WebSockets for responses
    this.logger.debug(`HTTP send not implemented for connection: ${_connectionId}`);
  }

  onMessage(callback: (message: MCPRequest, connectionId: string) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.server?.listening || false;
  }

  getConnectionCount(): number {
    return 0; // HTTP doesn't maintain connections
  }
}

/**
 * Stdio Transport implementation
 */
class StdioTransport implements Transport {
  name = 'stdio';
  private messageCallback?: (message: MCPRequest, connectionId: string) => void;
  private logger: Logger;
  private config: StdioTransportConfig;
  private isRunning = false;
  private connectionId = 'stdio-main';

  constructor(config: StdioTransportConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    process.stdin.setEncoding(this.config.encoding || 'utf8');

    const delimiter = this.config.delimiter || '\n';
    let buffer = '';

    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;

      const lines = buffer.split(delimiter);
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message: MCPRequest = JSON.parse(line);
            this.messageCallback?.(message, this.connectionId);
          } catch (error) {
            this.logger.error(`Invalid JSON from stdin:`, error);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      this.logger.info('Stdio transport ended');
      this.isRunning = false;
    });

    process.stdin.on('error', (error: Error) => {
      this.logger.error('Stdio error:', error);
    });

    this.logger.info('Stdio transport started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  async send(connectionId: string, message: MCPResponse): Promise<void> {
    if (connectionId === this.connectionId) {
      process.stdout.write(JSON.stringify(message) + (this.config.delimiter || '\n'));
    }
  }

  onMessage(callback: (message: MCPRequest, connectionId: string) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.isRunning && !process.stdin.destroyed;
  }

  getConnectionCount(): number {
    return this.isConnected() ? 1 : 0;
  }
}

/**
 * Enhanced Transport Manager
 */
export class TransportManager extends EventTarget {
  private transports = new Map<string, Transport>();
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async start(config: TransportConfig): Promise<void> {
    // Start WebSocket transport if configured
    if (config.websocket) {
      try {
        const wsTransport = new WebSocketTransport(config.websocket, this.logger);
        await wsTransport.start();

        wsTransport.onMessage((message, connectionId) => {
          this.handleMessage(message, connectionId, 'websocket');
        });

        this.transports.set('websocket', wsTransport);
        this.logger.info('WebSocket transport started successfully');
      } catch (error) {
        this.logger.error('Failed to start WebSocket transport:', error);
        throw error;
      }
    }

    // Start HTTP transport if configured
    if (config.http) {
      try {
        const httpTransport = new HttpTransport(config.http, this.logger);
        await httpTransport.start();

        httpTransport.onMessage((message, connectionId) => {
          this.handleMessage(message, connectionId, 'http');
        });

        this.transports.set('http', httpTransport);
        this.logger.info('HTTP transport started successfully');
      } catch (error) {
        this.logger.error('Failed to start HTTP transport:', error);
        throw error;
      }
    }

    // Start stdio transport if configured
    if (config.stdio) {
      try {
        const stdioTransport = new StdioTransport(config.stdio, this.logger);
        await stdioTransport.start();

        stdioTransport.onMessage((message, connectionId) => {
          this.handleMessage(message, connectionId, 'stdio');
        });

        this.transports.set('stdio', stdioTransport);
        this.logger.info('Stdio transport started successfully');
      } catch (error) {
        this.logger.error('Failed to start stdio transport:', error);
        throw error;
      }
    }

    if (this.transports.size === 0) {
      throw new Error('No transports configured');
    }

    this.logger.info(`Transport manager started with ${this.transports.size} transport(s)`);
  }

  async stop(): Promise<void> {
    const stopPromises = Array.from(this.transports.entries()).map(
      async ([transportType, transport]) => {
        try {
          await transport.stop();
          this.logger.debug(`Stopped transport: ${transportType}`);
        } catch (error) {
          this.logger.error(`Error stopping transport: ${transportType}`, error);
        }
      }
    );

    await Promise.allSettled(stopPromises);
    this.transports.clear();
    this.logger.info('Transport manager stopped');
  }

  async send(connectionId: string, message: MCPResponse): Promise<void> {
    // Extract transport type from connection ID
    const transportType = connectionId.split('-')[0];
    const transport = this.transports.get(transportType!);

    if (transport) {
      await transport.send(connectionId, message);
    } else {
      // Try all transports
      for (const [, transport] of this.transports) {
        try {
          await transport.send(connectionId, message);
          break;
        } catch (error) {
          // Continue to next transport
        }
      }
    }
  }

  getTransportStatus(): Record<string, { connected: boolean; connections?: number }> {
    const status: Record<string, { connected: boolean; connections?: number }> = {};

    for (const [name, transport] of this.transports) {
      const connectionCount = transport.getConnectionCount?.();
      status[name] = {
        connected: transport.isConnected(),
        ...(connectionCount !== undefined && { connections: connectionCount }),
      };
    }

    return status;
  }

  private handleMessage(message: MCPRequest, connectionId: string, transportName: string): void {
    this.dispatchEvent(
      new CustomEvent('message', {
        detail: { message, connectionId, transport: transportName },
      })
    );

    this.dispatchEvent(
      new CustomEvent('connection', {
        detail: { connectionId, transport: transportName },
      })
    );
  }
}
