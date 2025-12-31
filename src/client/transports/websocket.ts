/**
 * WebSocket Transport for MCP Client
 */

import WebSocket from 'ws';
import { BaseTransport } from './base.js';
import { MCPRequest, MCPResponse, WebSocketClientConfig } from '../types.js';

export class WebSocketTransport extends BaseTransport {
  public name = 'websocket';
  private ws: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (response: MCPResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketClientConfig) {
    super();
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      handshakeTimeout: 30000,
      pingInterval: 30000,
      pongTimeout: 10000,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.createConnection();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.clearTimers();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.setConnected(false);
    this.reconnectAttempts = 0;

    // Reject all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    this.validateRequest(request);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout for ${request.method}`));
      }, this.config.handshakeTimeout);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(request.id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      const timeout = setTimeout(() => {
        if (this.ws) {
          this.ws.terminate();
        }
        reject(new Error('Connection timeout'));
      }, this.config.handshakeTimeout);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.setConnected(true);
        this.reconnectAttempts = 0;
        this.setupPingInterval();
        this.setupWebSocketListeners();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const response: MCPResponse = JSON.parse(data.toString());
          this.validateResponse(response);
          this.handleResponse(response);
        } catch (error) {
          this.handleError(error as Error);
        }
      });

      this.ws.on('close', () => {
        clearTimeout(timeout);
        this.setConnected(false);
        this.clearPingInterval();
        this.handleDisconnection();
      });

      this.ws.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private setupWebSocketListeners(): void {
    if (!this.ws) return;

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const response: MCPResponse = JSON.parse(data.toString());
        this.validateResponse(response);
        this.handleResponse(response);
      } catch (error) {
        this.handleError(error as Error);
      }
    });

    this.ws.on('close', () => {
      this.setConnected(false);
      this.clearPingInterval();
      this.handleDisconnection();
    });

    this.ws.on('error', (error: Error) => {
      this.handleError(error);
    });

    this.ws.on('pong', () => {
      this.clearPongTimer();
    });
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      clearTimeout(pending.timeout);
      pending.resolve(response);
    } else {
      // Handle unsolicited responses (notifications)
      this.handleMessage(response);
    }
  }

  private handleDisconnection(): void {
    if (
      this.config.maxReconnectAttempts &&
      this.reconnectAttempts < this.config.maxReconnectAttempts
    ) {
      this.attemptReconnect();
    } else {
      this.handleError(new Error('Max reconnection attempts reached'));
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.createConnection();
      } catch (error) {
        // Reconnect failed, will try again
        if (this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
          this.attemptReconnect();
        } else {
          this.handleError(new Error('Max reconnection attempts reached'));
        }
      }
    }, this.config.reconnectInterval);
  }

  private setupPingInterval(): void {
    if (this.config.pingInterval && this.config.pingInterval > 0) {
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.ping();
          this.setupPongTimer();
        }
      }, this.config.pingInterval);
    }
  }

  private clearPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private setupPongTimer(): void {
    if (this.config.pongTimeout && this.config.pongTimeout > 0) {
      this.pongTimer = setTimeout(() => {
        if (this.ws) {
          this.ws.terminate();
        }
        this.handleError(new Error('WebSocket pong timeout'));
      }, this.config.pongTimeout);
    }
  }

  private clearPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearPingInterval();
    this.clearPongTimer();
  }
}
