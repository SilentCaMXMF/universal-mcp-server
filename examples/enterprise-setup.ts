/**
 * Enterprise Setup Example
 *
 * This example demonstrates a production-ready MCP server with:
 * - Multiple transports (WebSocket, HTTP, Stdio)
 * - Security features (rate limiting, authentication)
 * - Monitoring and metrics
 * - Logging and error handling
 * - Health checks
 */

import { MCPServer } from 'universal-mcp-server';

async function createEnterpriseServer() {
  // Enterprise-grade configuration
  const server = new MCPServer({
    name: 'enterprise-mcp-server',
    version: '2.1.0',
    description: 'Production-ready enterprise MCP server',

    // Multiple transport configuration
    transports: {
      // WebSocket for real-time clients
      websocket: {
        port: 3000,
        host: '0.0.0.0',
        path: '/mcp',
        maxConnections: 1000,
        pingInterval: 30000,
        pingTimeout: 5000,
        compression: true,
      },

      // HTTP for web clients and APIs
      http: {
        port: 3001,
        host: '0.0.0.0',
        path: '/api/v1/mcp',
        cors: {
          origin: ['https://app.company.com', 'https://admin.company.com'],
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // Higher limit for enterprise
          message: 'Rate limit exceeded. Please try again later.',
          standardHeaders: true,
        },
      },

      // Stdio for CLI and automation
      stdio: {
        encoding: 'utf8',
        delimiter: '\n',
        timeout: 60000, // Longer timeout for enterprise operations
        bufferSize: 10 * 1024 * 1024, // 10MB buffer
      },
    },

    // Enterprise logging
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      transports: {
        console: {
          enabled: process.env.NODE_ENV !== 'production',
          colorize: true,
        },
        file: {
          enabled: true,
          path: '/var/log/mcp-server/app.log',
          maxSize: '100MB',
          maxFiles: 30,
        },
      },
    },

    // Enterprise security
    security: {
      enableRateLimit: true,
      enableInputValidation: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      allowedOrigins: ['https://app.company.com', 'https://admin.company.com'],
      ipWhitelist: ['10.0.0.0/8', '192.168.0.0/16', '172.16.0.0/12'],
      maxConnectionsPerIP: 50,
    },

    // Performance monitoring
    metrics: {
      enabled: true,
      collectInterval: 60000, // 1 minute
      retention: {
        memory: '24h',
        disk: '30d',
      },
    },
  });

  // Enterprise-grade custom tools

  // User management tool
  server.registerTool({
    name: 'user_management',
    description: 'Enterprise user management operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['create', 'update', 'delete', 'list', 'search', 'activate', 'deactivate'],
          description: 'Operation to perform',
        },
        userId: {
          type: 'string',
          description: 'User ID (for user-specific operations)',
        },
        userData: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user', 'readonly'] },
            department: { type: 'string' },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
      required: ['operation'],
    },
    handler: async params => {
      // Mock enterprise user operations
      console.log(`User operation: ${params.operation}`, params);

      switch (params.operation) {
        case 'create':
          return {
            success: true,
            user: { id: generateId(), ...params.userData, createdAt: new Date().toISOString() },
          };

        case 'update':
          return {
            success: true,
            user: { id: params.userId, ...params.userData, updatedAt: new Date().toISOString() },
          };

        case 'delete':
          return { success: true, deletedAt: new Date().toISOString() };

        case 'list':
          return {
            users: [
              { id: '1', name: 'John Doe', email: 'john@company.com', role: 'admin' },
              { id: '2', name: 'Jane Smith', email: 'jane@company.com', role: 'user' },
            ],
            pagination: { page: 1, limit: 20, total: 2 },
          };

        default:
          throw new Error(`Unsupported operation: ${params.operation}`);
      }
    },
  });

  // Reporting and analytics tool
  server.registerTool({
    name: 'generate_report',
    description: 'Generate enterprise reports and analytics',
    inputSchema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: [
            'usage_analytics',
            'security_audit',
            'performance_metrics',
            'user_activity',
            'system_health',
          ],
          description: 'Type of report to generate',
        },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
          required: ['start', 'end'],
        },
        format: {
          type: 'string',
          enum: ['json', 'csv'],
          default: 'json',
        },
      },
      required: ['reportType', 'dateRange'],
    },
    handler: async params => {
      // Mock report generation
      const reportData = {
        id: generateReportId(),
        type: params.reportType,
        period: params.dateRange,
        generatedAt: new Date().toISOString(),
        format: params.format,

        // Mock data based on report type
        data:
          {
            usage_analytics: {
              totalRequests: 150000,
              uniqueUsers: 500,
              topTools: ['user_management', 'generate_report', 'server_info'],
              averageResponseTime: 120,
            },
            security_audit: {
              totalAttempts: 100000,
              blockedRequests: 120,
              suspiciousIPs: ['192.168.1.100', '10.0.0.50'],
              complianceScore: 98.5,
            },
            performance_metrics: {
              averageResponseTime: 85,
              p95ResponseTime: 200,
              p99ResponseTime: 350,
              throughput: 1250, // requests per minute
              errorRate: 0.02,
            },
          }[params.reportType] || {},
      };

      console.log(`Generated ${params.reportType} report:`, reportData);
      return reportData;
    },
  });

  // System administration tool
  server.registerTool({
    name: 'system_admin',
    description: 'System administration and maintenance operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'restart_service',
            'clear_cache',
            'rotate_logs',
            'backup_database',
            'cleanup_temp_files',
            'check_system_status',
          ],
          description: 'Administration operation',
        },
        parameters: {
          type: 'object',
          description: 'Operation-specific parameters',
        },
      },
      required: ['operation'],
    },
    handler: async params => {
      console.log(`System admin operation: ${params.operation}`, params);

      // Mock system operations
      const results = {
        restart_service: {
          success: true,
          restartedAt: new Date().toISOString(),
          downtime: 5000, // ms
        },
        clear_cache: {
          success: true,
          clearedItems: 1250,
          freedMemory: '256MB',
        },
        rotate_logs: {
          success: true,
          rotatedFiles: 12,
          compressedSize: '150MB',
        },
        backup_database: {
          success: true,
          backupPath: '/backups/db_' + Date.now() + '.sql',
          size: '2.5GB',
          duration: 120, // seconds
        },
        cleanup_temp_files: {
          success: true,
          deletedFiles: 850,
          freedSpace: '1.2GB',
        },
        check_system_status: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          connections: server.getMetrics().connections,
          lastBackup: new Date().toISOString(),
        },
      };

      return results[params.operation] || { success: false, error: 'Unknown operation' };
    },
  });

  // Event handlers for enterprise monitoring
  server.addEventListener('connection', (event: any) => {
    const connection = event.detail;
    console.log('New client connection', {
      connectionId: connection.id,
      transport: connection.transport,
      remoteAddress: connection.remoteAddress,
      timestamp: new Date().toISOString(),
    });

    // Update metrics
    server.getMetrics().incrementCounter('connections.active');
  });

  server.addEventListener('disconnection', (event: any) => {
    const connection = event.detail;
    console.log('Client disconnected', {
      connectionId: connection.id,
      duration: connection.duration,
      reason: connection.reason,
    });

    // Update metrics
    server.getMetrics().decrementCounter('connections.active');
  });

  server.addEventListener('error', (event: any) => {
    const error = event.detail;
    console.error('Server error', {
      error: error.message,
      stack: error.stack,
      connectionId: error.connectionId,
      timestamp: new Date().toISOString(),
    });

    // Increment error counter
    server.getMetrics().incrementCounter('errors.total');
  });

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully');

    try {
      // Stop accepting new connections
      await server.stop();
      console.log('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  return server;
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function generateReportId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start enterprise server
async function main() {
  try {
    const server = await createEnterpriseServer();

    // Start server with all transports
    await server.start();

    console.log('🚀 Enterprise MCP Server started successfully');
    console.log(`📡 WebSocket: ws://0.0.0.0:3000/mcp`);
    console.log(`🌐 HTTP: http://0.0.0.0:3001/api/v1/mcp`);
    console.log(`💻 Stdio: Available for CLI integration`);
  } catch (error) {
    console.error('❌ Failed to start enterprise server:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { createEnterpriseServer };
