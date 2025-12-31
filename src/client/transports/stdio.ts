/**
 * Stdio Transport for MCP Client
 */

import { spawn, ChildProcess } from 'child_process';
import { BaseTransport } from './base.js';
import { MCPRequest, MCPResponse, StdioClientConfig } from '../types.js';

export class StdioTransport extends BaseTransport {
  public name = 'stdio';
  private config: StdioClientConfig;
  private process: ChildProcess | null = null;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (response: MCPResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private buffer = '';
  private reconnectAttempts = 0;

  constructor(config: StdioClientConfig) {
    super();
    this.config = {
      encoding: 'utf8',
      delimiter: '\n',
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.startProcess();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      // Reject all pending requests
      for (const pending of this.pendingRequests.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Process terminated'));
      }
      this.pendingRequests.clear();

      // Kill the process
      if (!this.process.killed) {
        this.process.kill('SIGTERM');
      }

      this.process = undefined;
    }

    this.setConnected(false);
    this.buffer = '';
    this.reconnectAttempts = 0;
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this.connected || !this.process) {
      throw new Error('Stdio transport not connected');
    }

    this.validateRequest(request);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout for ${request.method}`));
      }, 30000); // Default timeout for stdio

      this.pendingRequests.set(request.id, { resolve, reject, timeout });

      try {
        const message = JSON.stringify(request) + this.config.delimiter;
        this.process!.stdin!.write(message, this.config.encoding!);
      } catch (error) {
        this.pendingRequests.delete(request.id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async startProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        cwd: this.config.cwd,
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'inherit'], // inherit stderr for debugging
        shell: true,
      };

      this.process = spawn(this.config.command, this.config.args || [], options);

      if (!this.process.stdin || !this.process.stdout) {
        reject(new Error('Failed to create stdio streams'));
        return;
      }

      let resolved = false;

      // Set up stdout handling
      this.process.stdout.setEncoding(this.config.encoding!);
      this.process.stdout.on('data', (data: Buffer | string) => {
        this.handleData(data.toString(this.config.encoding));
      });

      // Set up error handling
      this.process.on('error', (error: Error) => {
        if (!resolved) {
          resolved = true;
          reject(error);
        } else {
          this.handleError(error);
        }
      });

      this.process.on('exit', (code: number | null, signal: string | null) => {
        this.setConnected(false);

        if (!resolved) {
          resolved = true;
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code} or signal ${signal}`));
          }
        } else {
          // Handle unexpected termination
          this.handleError(
            new Error(`Process exited unexpectedly with code ${code} or signal ${signal}`)
          );
        }
      });

      // Wait a bit for the process to start
      setTimeout(() => {
        if (!resolved && this.process) {
          resolved = true;
          this.setConnected(true);
          resolve();
        }
      }, 1000);
    });
  }

  private handleData(data: string): void {
    this.buffer += data;

    // Process complete messages
    const delimiter = this.config.delimiter!;
    let delimiterIndex = this.buffer.indexOf(delimiter);

    while (delimiterIndex !== -1) {
      const message = this.buffer.substring(0, delimiterIndex);
      this.buffer = this.buffer.substring(delimiterIndex + delimiter.length);

      try {
        const response: MCPResponse = JSON.parse(message);
        this.validateResponse(response);
        this.handleResponse(response);
      } catch (error) {
        this.handleError(error as Error);
      }

      delimiterIndex = this.buffer.indexOf(delimiter);
    }
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

  // Health check for stdio processes
  async healthCheck(): Promise<boolean> {
    if (!this.connected || !this.process) {
      return false;
    }

    try {
      const response = await this.send({
        jsonrpc: '2.0',
        id: 'health_check',
        method: 'ping',
      });
      return !response.error;
    } catch {
      return false;
    }
  }

  // Send signal to the process
  sendSignal(signal: NodeJS.Signals): void {
    if (this.process && !this.process.killed) {
      this.process.kill(signal);
    }
  }

  // Get process information
  getProcessInfo(): { pid: number | null; command: string; args: string[] } {
    return {
      pid: this.process?.pid || null,
      command: this.config.command,
      args: this.config.args || [],
    };
  }

  // Restart the process
  async restart(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }
}
