/**
 * Abstract Base Transport for MCP Client
 */

import { EventEmitter } from 'eventemitter3';
import { ClientTransport, MCPRequest, MCPResponse } from '../types.js';

export abstract class BaseTransport extends EventEmitter implements ClientTransport {
  public abstract name: string;
  public connected = false;
  protected _messageCallback?: (response: MCPResponse) => void;
  protected _errorCallback?: (error: Error) => void;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(request: MCPRequest): Promise<MCPResponse>;

  onMessage(callback: (response: MCPResponse) => void): void {
    this._messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this._errorCallback = callback;
  }

  protected handleMessage(response: MCPResponse): void {
    if (this._messageCallback) {
      this._messageCallback(response);
    }
    this.emit('message', response);
  }

  protected handleError(error: Error): void {
    if (this._errorCallback) {
      this._errorCallback(error);
    }
    this.emit('error', error);
  }

  protected setConnected(state: boolean): void {
    const wasConnected = this.connected;
    this.connected = state;

    if (wasConnected !== state) {
      if (state) {
        this.emit('connected');
      } else {
        this.emit('disconnected');
      }
    }
  }

  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateRequest(request: MCPRequest): void {
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }
    if (!request.method || typeof request.method !== 'string') {
      throw new Error('Method is required and must be a string');
    }
    if (!request.id) {
      throw new Error('Request ID is required');
    }
  }

  protected validateResponse(response: MCPResponse): void {
    if (!response.jsonrpc || response.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version in response');
    }
    if (!response.id) {
      throw new Error('Response ID is required');
    }
    if (!response.result && !response.error) {
      throw new Error('Response must have either result or error');
    }
    if (response.error) {
      const error = response.error;
      if (!error.code || !error.message) {
        throw new Error('Invalid error format in response');
      }
    }
  }
}
