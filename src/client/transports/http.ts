/**
 * HTTP Transport for MCP Client
 */

import { BaseTransport } from './base.js';
import { MCPRequest, MCPResponse, HttpClientConfig } from '../types.js';

export class HttpTransport extends BaseTransport {
  public name = 'http';
  private config: HttpClientConfig;
  private abortedRequests = new Set<string | number>();

  constructor(config: HttpClientConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      keepAlive: true,
      ...config,
    };
  }

  async connect(): Promise<void> {
    // HTTP is stateless, so we just validate the configuration
    try {
      const response = await this.makeHttpRequest({
        jsonrpc: '2.0',
        id: 'connect_test',
        method: 'ping',
      });

      if (response.error) {
        throw new Error(`Server error during connection: ${response.error.message}`);
      }

      this.setConnected(true);
    } catch (error) {
      this.setConnected(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // HTTP is stateless, but we can mark as disconnected
    this.setConnected(false);

    // Abort any pending requests
    for (const requestId of this.abortedRequests) {
      this.abortedRequests.delete(requestId);
    }
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this.connected) {
      throw new Error('HTTP transport not connected');
    }

    this.validateRequest(request);
    this.abortedRequests.add(request.id);

    try {
      const response = await this.makeHttpRequestWithRetry(request);
      this.validateResponse(response);
      return response;
    } finally {
      this.abortedRequests.delete(request.id);
    }
  }

  private async makeHttpRequest(request: MCPRequest): Promise<MCPResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'mcp-client/1.0.0',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      };

      if (this.config.keepAlive !== undefined) {
        fetchOptions.keepalive = this.config.keepAlive;
      }

      const response = await fetch(this.config.baseURL, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return responseData as MCPResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout for ${request.method}`);
      }

      throw error;
    }
  }

  private async makeHttpRequestWithRetry(request: MCPRequest): Promise<MCPResponse> {
    let lastError: Error | null = null;
    const maxAttempts = this.config.retryAttempts || 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.makeHttpRequest(request);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof Error &&
          (error.message.includes('400') || // Bad Request
            error.message.includes('401') || // Unauthorized
            error.message.includes('403') || // Forbidden
            error.message.includes('404') || // Not Found
            error.message.includes('Invalid JSON-RPC'))
        ) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts) {
          throw error;
        }

        // Wait before retrying
        const delay = this.config.retryDelay ? this.config.retryDelay * attempt : 1000 * attempt;
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeHttpRequest({
        jsonrpc: '2.0',
        id: 'health_check',
        method: 'ping',
      });
      return !response.error;
    } catch {
      return false;
    }
  }

  // Get server info
  async getServerInfo(): Promise<Record<string, unknown>> {
    const response = await this.makeHttpRequest({
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'server.info',
    });

    if (response.error) {
      throw new Error(`Failed to get server info: ${response.error.message}`);
    }

    return response.result as Record<string, unknown>;
  }

  // Batch request support
  async sendBatch(requests: MCPRequest[]): Promise<MCPResponse[]> {
    if (!this.connected) {
      throw new Error('HTTP transport not connected');
    }

    // Validate all requests
    for (const request of requests) {
      this.validateRequest(request);
      this.abortedRequests.add(request.id);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'mcp-client/1.0.0',
          ...this.config.headers,
        },
        body: JSON.stringify(requests),
        signal: controller.signal,
      };

      if (this.config.keepAlive !== undefined) {
        fetchOptions.keepalive = this.config.keepAlive;
      }

      const response = await fetch(this.config.baseURL, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responses = (await response.json()) as MCPResponse[];

      // Validate all responses
      for (const response of responses) {
        this.validateResponse(response);
      }

      return responses;

      return responses;
    } finally {
      for (const request of requests) {
        this.abortedRequests.delete(request.id);
      }
    }
  }
}
