/**
 * MCP Client usage example
 */

import { MCPRequest, MCPResponse } from '../src/types';

/**
 * Example MCP client for demonstration
 */
class MCPClient {
  private transport: string;

  constructor(transport: 'websocket' | 'http' | 'stdio', options: any) {
    this.transport = transport;
    // Initialize transport based on type
  }

  async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    // This would implement the actual transport logic
    console.log(`Sending ${request.method} request via ${this.transport}`);

    // Simulate a response
    return {
      id: request.id,
      result: { success: true },
      timestamp: Date.now(),
    };
  }

  async listTools(): Promise<any> {
    const request: MCPRequest = {
      id: '1',
      method: 'tools/list',
    };
    return await this.sendRequest(request);
  }

  async callTool(name: string, params: any): Promise<any> {
    const request: MCPRequest = {
      id: '2',
      method: 'tools/call',
      params: { name, arguments: params },
    };
    return await this.sendRequest(request);
  }

  async listResources(): Promise<any> {
    const request: MCPRequest = {
      id: '3',
      method: 'resources/list',
    };
    return await this.sendRequest(request);
  }

  async readResource(uri: string): Promise<any> {
    const request: MCPRequest = {
      id: '4',
      method: 'resources/read',
      params: { uri },
    };
    return await this.sendRequest(request);
  }

  async getServerInfo(): Promise<any> {
    const request: MCPRequest = {
      id: '5',
      method: 'server/info',
    };
    return await this.sendRequest(request);
  }
}

/**
 * Example usage of the MCP client
 */
async function demonstrateClientUsage() {
  console.log('🔧 MCP Client Example\n');

  // Create a WebSocket client
  const wsClient = new MCPClient('websocket', {
    url: 'ws://localhost:3000',
  });

  try {
    // Get server info
    console.log('📋 Getting server info...');
    const serverInfo = await wsClient.getServerInfo();
    console.log('Server info:', serverInfo.result);

    // List available tools
    console.log('\n🛠️  Listing available tools...');
    const tools = await wsClient.listTools();
    console.log(
      'Available tools:',
      (tools.result as any).tools.map((t: any) => t.name)
    );

    // Call the echo tool
    console.log('\n📞 Calling echo tool...');
    const echoResult = await wsClient.callTool('echo', { text: 'Hello from MCP Client!' });
    console.log('Echo result:', echoResult.result);

    // List resources
    console.log('\n📁 Listing resources...');
    const resources = await wsClient.listResources();
    console.log('Resources:', resources.result);
  } catch (error) {
    console.error('❌ Client error:', error);
  }
}

if (require.main === module) {
  demonstrateClientUsage();
}

export { MCPClient, demonstrateClientUsage };
