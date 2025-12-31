# Performance Optimization Guide

This guide covers performance tuning, monitoring, and optimization strategies for Universal MCP Server.

## Table of Contents

- [Performance Monitoring](#performance-monitoring)
- [Transport Optimization](#transport-optimization)
- [Memory Management](#memory-management)
- [CPU Optimization](#cpu-optimization)
- [Network Performance](#network-performance)
- [Caching Strategies](#caching-strategies)
- [Database Performance](#database-performance)
- [Scaling Strategies](#scaling-strategies)
- [Performance Testing](#performance-testing)

## Performance Monitoring

### Built-in Metrics

Universal MCP Server provides comprehensive performance metrics:

```typescript
// Get real-time metrics
const metrics = server.getMetrics();

console.log('Performance Metrics:', {
  requestsTotal: metrics.requestsTotal,
  requestsPerSecond: metrics.requestsPerSecond,
  averageResponseTime: metrics.averageResponseTime,
  p95ResponseTime: metrics.p95ResponseTime,
  p99ResponseTime: metrics.p99ResponseTime,
  errorRate: metrics.errorRate,
  activeConnections: metrics.activeConnections,
  memoryUsage: metrics.memoryUsage,
  cpuUsage: metrics.cpuUsage,
});
```

### Prometheus Integration

```typescript
const server = new MCPServer({
  name: 'mcp-server',
  version: '1.0.0',
  metrics: {
    enabled: true,
    collectInterval: 60000, // 1 minute
    endpoints: {
      prometheus: {
        enabled: true,
        port: 9090,
        path: '/metrics',
        auth: {
          username: 'metrics',
          password: process.env.METRICS_PASSWORD,
        },
      },
    },
  },
});

// Access metrics at: http://localhost:9090/metrics
```

### Custom Metrics

```typescript
// Register custom metrics
const metrics = server.getMetrics();

// Counter metrics
metrics.incrementCounter('user_logins');
metrics.incrementCounter('api_calls', { endpoint: '/tools/call' });

// Timer metrics
metrics.recordTimer('database_query', 150); // ms
metrics.recordTimer('file_upload', 5000);

// Gauge metrics
metrics.setGauge('active_users', 42);
metrics.setGauge('queue_size', 100);

// Histogram metrics
metrics.recordHistogram('response_sizes', 1024);
```

### Performance Dashboard Example

```typescript
server.registerTool({
  name: 'performance_dashboard',
  description: 'Get comprehensive performance dashboard',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: {
        type: 'string',
        enum: ['1m', '5m', '15m', '1h', '24h'],
        default: '15m',
      },
      includeDetails: {
        type: 'boolean',
        default: false,
      },
    },
  },
  handler: async params => {
    const metrics = server.getMetrics();
    const now = Date.now();

    return {
      timestamp: new Date().toISOString(),
      timeframe: params.timeframe,

      // Request metrics
      requests: {
        total: metrics.requestsTotal,
        perSecond: metrics.requestsPerSecond,
        errorRate: metrics.errorRate,
        successRate: 1 - metrics.errorRate,
      },

      // Response time metrics
      responseTime: {
        average: metrics.averageResponseTime,
        p50: metrics.p50ResponseTime,
        p95: metrics.p95ResponseTime,
        p99: metrics.p99ResponseTime,
        min: metrics.minResponseTime,
        max: metrics.maxResponseTime,
      },

      // Resource usage
      resources: {
        memory: {
          used: metrics.memoryUsage.heapUsed,
          total: metrics.memoryUsage.heapTotal,
          external: metrics.memoryUsage.external,
          rss: metrics.memoryUsage.rss,
        },
        cpu: {
          usage: metrics.cpuUsage,
          loadAverage: require('os').loadavg(),
        },
        connections: {
          active: metrics.activeConnections,
          total: metrics.totalConnections,
        },
      },

      // Tool performance
      tools: params.includeDetails ? metrics.toolMetrics : null,

      // System health
      health: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  },
});
```

## Transport Optimization

### WebSocket Optimization

```typescript
const server = new MCPServer({
  transports: {
    websocket: {
      port: 3000,

      // Connection limits
      maxConnections: 10000,

      // Performance tuning
      pingInterval: 30000, // Keep connection alive
      pingTimeout: 5000, // Drop unresponsive connections
      compression: true, // Enable compression

      // Buffer optimization
      maxPayload: 10 * 1024 * 1024, // 10MB max payload

      options: {
        // Compression settings
        perMessageDeflate: {
          zlibDeflateOptions: {
            level: 6, // Balance between CPU and compression
            memLevel: 8,
          },
          threshold: 1024, // Only compress messages > 1KB
        },

        // Connection optimization
        maxBufferedAmount: 1024 * 1024, // 1MB buffer
        handshakeTimeout: 10000, // 10s handshake timeout

        // Performance options
        disableHixie: true, // Disable old protocol
        ignoreXForwardedFor: true, // Trust proxy headers
      },
    },
  },
});
```

### HTTP Optimization

```typescript
const server = new MCPServer({
  transports: {
    http: {
      port: 3001,

      // Keep-alive optimization
      keepAlive: true,
      keepAliveTimeout: 65000, // 65 seconds
      maxSockets: 10000,
      maxFreeSockets: 100,

      // Request parsing
      maxRequestSize: 50 * 1024 * 1024, // 50MB
      timeout: 30000, // 30s timeout

      // Compression middleware
      compression: {
        enabled: true,
        level: 6,
        threshold: 1024,
      },

      // Caching headers
      cacheControl: {
        maxAge: 300, // 5 minutes
        mustRevalidate: true,
        noTransform: false,
      },

      // Security with performance balance
      helmet: {
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
        },
      },
    },
  },
});
```

### Stdio Optimization

```typescript
const server = new MCPServer({
  transports: {
    stdio: {
      encoding: 'utf8',
      delimiter: '\n',

      // Buffer optimization
      bufferSize: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000, // 60s timeout

      // Batch processing
      batchSize: 100, // Process 100 messages at once
      batchTimeout: 100, // 100ms max wait for batch
    },
  },
});
```

## Memory Management

### Memory Monitoring

```typescript
// Set up memory monitoring
const memoryMonitor = {
  interval: 30000, // 30 seconds
  threshold: 0.9, // 90% memory usage

  start() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const usageRatio = usage.heapUsed / usage.heapTotal;

      if (usageRatio > this.threshold) {
        console.warn(
          `High memory usage: ${heapUsedMB.toFixed(2)}MB/${heapTotalMB.toFixed(2)}MB (${(usageRatio * 100).toFixed(1)}%)`
        );

        // Trigger garbage collection
        if (global.gc) {
          global.gc();
          console.log('Manual garbage collection triggered');
        }
      }

      // Log memory metrics
      server.getMetrics().setGauge('memory_heap_used', heapUsedMB);
      server.getMetrics().setGauge('memory_heap_total', heapTotalMB);
      server.getMetrics().setGauge('memory_usage_ratio', usageRatio);
    }, this.interval);
  },
};

memoryMonitor.start();
```

### Memory Leak Detection

```typescript
// Memory leak detection
class MemoryLeakDetector {
  private snapshots: Array<{ time: number; heap: number; }> = [];
  private interval: NodeJS.Timeout;

  constructor(private threshold = 10 * 1024 * 1024) { // 10MB growth threshold

  setInterval(() => {
    const usage = process.memoryUsage();
    this.snapshots.push({
      time: Date.now(),
      heap: usage.heapUsed
    });

    // Keep only last 10 snapshots
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }

    // Check for memory growth
    if (this.snapshots.length >= 10) {
      const oldest = this.snapshots[0];
      const newest = this.snapshots[this.snapshots.length - 1];
      const growth = newest.heap - oldest.heap;

      if (growth > this.threshold) {
        console.warn(`Potential memory leak detected: ${(growth / 1024 / 1024).toFixed(2)}MB growth over ${this.snapshots.length - 1} intervals`);

        // Get heap snapshot for debugging
        if (global.gc) {
          global.gc();
          const afterGC = process.memoryUsage();
          const freed = newest.heap - afterGC.heapUsed;
          console.log(`Freed ${(freed / 1024 / 1024).toFixed(2)}MB after GC`);
        }
      }
    }
  }, 60000); // Check every minute
}

new MemoryLeakDetector();
```

## CPU Optimization

### CPU Monitoring

```typescript
// CPU usage monitoring
const cpuMonitor = {
  previousUsage: process.cpuUsage(),
  previousTime: process.hrtime.bigint(),

  getCpuUsage(): number {
    const currentUsage = process.cpuUsage(this.previousUsage);
    const currentTime = process.hrtime.bigint();

    const idleTime = Number(currentTime - this.previousTime) * 1e-9;
    const totalTime = currentUsage.user + currentUsage.system;

    this.previousUsage = process.cpuUsage();
    this.previousTime = currentTime;

    return (totalTime / idleTime) * 100;
  },
};

// Monitor CPU usage
setInterval(() => {
  const cpuUsage = cpuMonitor.getCpuUsage();
  server.getMetrics().setGauge('cpu_usage', cpuUsage);

  if (cpuUsage > 80) {
    console.warn(`High CPU usage: ${cpuUsage.toFixed(2)}%`);
  }
}, 5000); // Every 5 seconds
```

### Load Balancing

```typescript
// Load balancing across workers
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker: any, code: number, signal: string) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Worker process
  const server = new MCPServer({
    name: 'mcp-server-worker',
    version: '1.0.0',
    transports: {
      http: {
        port: 3000 + parseInt(process.env.WORKER_ID || '0'),
      },
    },
  });

  server.start().then(() => {
    console.log(`Worker ${process.pid} started`);
  });
}
```

## Network Performance

### Connection Pooling

```typescript
// Connection pool for external services
class ConnectionPool {
  private connections: Map<string, any[]> = new Map();
  private maxPoolSize = 10;

  async getConnection(serviceName: string): Promise<any> {
    if (!this.connections.has(serviceName)) {
      this.connections.set(serviceName, []);
    }

    const pool = this.connections.get(serviceName)!;

    if (pool.length > 0) {
      return pool.pop();
    }

    // Create new connection
    return await this.createConnection(serviceName);
  }

  async releaseConnection(serviceName: string, connection: any): Promise<void> {
    const pool = this.connections.get(serviceName);
    if (pool && pool.length < this.maxPoolSize) {
      pool.push(connection);
    } else {
      await connection.close();
    }
  }

  private async createConnection(serviceName: string): Promise<any> {
    // Service-specific connection creation
    switch (serviceName) {
      case 'database':
        return await createDatabaseConnection();
      case 'redis':
        return await createRedisConnection();
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }
}
```

### Request Batching

```typescript
// Request batching for efficiency
class RequestBatcher {
  private batch: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 100;
  private readonly maxWaitTime = 100; // ms

  constructor(private processBatch: (items: any[]) => Promise<any>) {}

  add(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batch.push({ request, resolve, reject });

      if (this.batch.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.flush(), this.maxWaitTime);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batch.length === 0) return;

    const currentBatch = this.batch.splice(0);

    try {
      const results = await this.processBatch(currentBatch.map(item => item.request));

      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      currentBatch.forEach(item => {
        item.reject(error);
      });
    }
  }
}
```

## Caching Strategies

### In-Memory Cache

```typescript
// In-memory LRU cache
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Tool with caching
const cache = new LRUCache<string, any>(1000);

server.registerTool({
  name: 'cached_api_call',
  description: 'Make cached API calls',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      ttl: { type: 'number', default: 300000 }, // 5 minutes
    },
  },
  handler: async params => {
    const cacheKey = `api:${params.url}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      server.getMetrics().incrementCounter('cache_hits');
      return { ...cached, cached: true };
    }

    server.getMetrics().incrementCounter('cache_misses');

    const response = await fetch(params.url);
    const data = await response.json();

    cache.set(cacheKey, data);

    // Auto-expire after TTL
    setTimeout(() => {
      cache.delete(cacheKey);
    }, params.ttl);

    return { ...data, cached: false };
  },
});
```

### Redis Cache Integration

```typescript
// Redis cache wrapper
class RedisCache {
  private client: any;

  constructor(private redisUrl: string) {
    this.connect();
  }

  private async connect(): Promise<void> {
    const Redis = require('redis');
    this.client = Redis.createClient({ url: this.redisUrl });
    await this.client.connect();
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setEx(key, ttl / 1000, serialized); // TTL in seconds
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}

// Usage in tools
const redisCache = new RedisCache(process.env.REDIS_URL);

server.registerTool({
  name: 'expensive_computation',
  description: 'Perform expensive computation with caching',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' },
      ttl: { type: 'number', default: 3600000 }, // 1 hour
    },
  },
  handler: async params => {
    const cacheKey = `computation:${crypto.createHash('md5').update(params.input).digest('hex')}`;

    // Try cache first
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Perform expensive computation
    const result = await performExpensiveComputation(params.input);

    // Cache result
    await redisCache.set(cacheKey, result, params.ttl);

    return { ...result, cached: false };
  },
});
```

## Database Performance

### Connection Pooling

```typescript
// Database connection pool
class DatabasePool {
  private pool: any;

  constructor(config: any) {
    // Using pg as example
    const { Pool } = require('pg');
    this.pool = new Pool({
      ...config,
      max: 20, // Maximum connections
      min: 5, // Minimum connections
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 10000, // 10 seconds
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

const dbPool = new DatabasePool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

### Query Optimization

```typescript
// Query optimization helper
class QueryOptimizer {
  private slowQueryThreshold = 1000; // ms

  async executeQuery(sql: string, params?: any[]): Promise<any> {
    const startTime = process.hrtime.bigint();

    try {
      const result = await dbPool.query(sql, params);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected (${duration.toFixed(2)}ms):`, { sql, params });
        server.getMetrics().incrementCounter('slow_queries');
      }

      // Record metrics
      server.getMetrics().recordTimer('database_query_duration', duration);
      server.getMetrics().incrementCounter('database_queries');

      return result;
    } catch (error) {
      server.getMetrics().incrementCounter('database_errors');
      throw error;
    }
  }

  // Query cache for repeated queries
  private queryCache = new LRUCache<string, any>(100);

  async cachedQuery(sql: string, params?: any[], ttl: number = 300000): Promise<any> {
    const cacheKey = `${sql}:${JSON.stringify(params)}`;
    const cached = this.queryCache.get(cacheKey);

    if (cached) {
      server.getMetrics().incrementCounter('query_cache_hits');
      return cached;
    }

    server.getMetrics().incrementCounter('query_cache_misses');

    const result = await this.executeQuery(sql, params);

    this.queryCache.set(cacheKey, result);

    // Auto-expire
    setTimeout(() => {
      this.queryCache.delete(cacheKey);
    }, ttl);

    return result;
  }
}

const queryOptimizer = new QueryOptimizer();
```

## Scaling Strategies

### Horizontal Scaling

```typescript
// Load balancer configuration
const loadBalancer = {
  servers: [
    { host: 'mcp-server-1.internal', port: 3000, weight: 1 },
    { host: 'mcp-server-2.internal', port: 3000, weight: 1 },
    { host: 'mcp-server-3.internal', port: 3000, weight: 1 },
  ],

  currentIndex: 0,

  getNextServer() {
    // Round-robin selection
    const server = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    return server;
  },

  async forwardRequest(request: any): Promise<any> {
    const server = this.getNextServer();

    // Forward request to selected server
    const response = await fetch(`http://${server.host}:${server.port}/api/mcp`, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request),
    });

    return response.json();
  },
};
```

### Auto-scaling

```typescript
// Auto-scaling monitor
class AutoScaler {
  private metrics: { [key: string]: number } = {};
  private thresholds = {
    cpu: 80, // 80% CPU usage
    memory: 85, // 85% memory usage
    responseTime: 1000, // 1s response time
    connections: 1000, // 1000 connections
  };

  startMonitoring(): void {
    setInterval(async () => {
      const metrics = server.getMetrics();

      const shouldScaleUp = this.shouldScaleUp(metrics);
      const shouldScaleDown = this.shouldScaleDown(metrics);

      if (shouldScaleUp) {
        await this.scaleUp();
      } else if (shouldScaleDown) {
        await this.scaleDown();
      }
    }, 60000); // Check every minute
  }

  private shouldScaleUp(metrics: any): boolean {
    return (
      metrics.cpuUsage > this.thresholds.cpu ||
      metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal > this.thresholds.memory / 100 ||
      metrics.averageResponseTime > this.thresholds.responseTime ||
      metrics.activeConnections > this.thresholds.connections
    );
  }

  private shouldScaleDown(metrics: any): boolean {
    return (
      metrics.cpuUsage < this.thresholds.cpu * 0.5 &&
      metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal <
        (this.thresholds.memory * 0.5) / 100 &&
      metrics.averageResponseTime < this.thresholds.responseTime * 0.5 &&
      metrics.activeConnections < this.thresholds.connections * 0.5
    );
  }

  private async scaleUp(): Promise<void> {
    console.log('Scaling up: Launching new instance');

    // Trigger container orchestration (Kubernetes, ECS, etc.)
    await this.triggerScalingEvent(1);

    server.getMetrics().incrementCounter('scaling_events', { direction: 'up' });
  }

  private async scaleDown(): Promise<void> {
    console.log('Scaling down: Terminating instance');

    // Trigger container orchestration
    await this.triggerScalingEvent(-1);

    server.getMetrics().incrementCounter('scaling_events', { direction: 'down' });
  }

  private async triggerScalingEvent(delta: number): Promise<void> {
    // Integration with your orchestration platform
    // Example: Kubernetes API call, ECS service update, etc.
  }
}

const autoScaler = new AutoScaler();
autoScaler.startMonitoring();
```

## Performance Testing

### Load Testing

```typescript
// Load testing utility
class LoadTester {
  async runLoadTest(config: {
    targetUrl: string;
    concurrentUsers: number;
    duration: number;
    requestsPerSecond: number;
    toolName?: string;
    toolArgs?: any;
  }): Promise<any> {
    const { targetUrl, concurrentUsers, duration, requestsPerSecond, toolName, toolArgs } = config;

    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[],
      errors: [] as string[],
      startTime: Date.now(),
    };

    // Create concurrent users
    const users = Array.from({ length: concurrentUsers }, async (_, userId) => {
      const endTime = Date.now() + duration;

      while (Date.now() < endTime) {
        const startTime = process.hrtime.bigint();

        try {
          const request = {
            id: `${userId}_${Date.now()}`,
            method: toolName ? 'tools/call' : 'tools/list',
            params: toolName
              ? {
                  name: toolName,
                  arguments: toolArgs,
                }
              : undefined,
          };

          const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });

          const endTime = process.hrtime.bigint();
          const responseTime = Number(endTime - startTime) / 1000000; // Convert to ms

          results.responseTimes.push(responseTime);

          if (response.ok) {
            results.successfulRequests++;
          } else {
            results.failedRequests++;
            results.errors.push(`HTTP ${response.status}: ${await response.text()}`);
          }
        } catch (error) {
          results.failedRequests++;
          results.errors.push(error.message);
        }

        results.totalRequests++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000 / requestsPerSecond));
      }
    });

    // Wait for all users to complete
    await Promise.all(users);

    // Calculate statistics
    const sortedTimes = results.responseTimes.sort((a, b) => a - b);
    const totalDuration = Date.now() - results.startTime;

    return {
      ...results,
      duration: totalDuration,
      averageResponseTime:
        results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length,
      p50ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      requestsPerSecond: results.totalRequests / (totalDuration / 1000),
      errorRate: results.failedRequests / results.totalRequests,
    };
  }
}

// Usage
const loadTester = new LoadTester();

// Example load test
const testResults = await loadTester.runLoadTest({
  targetUrl: 'http://localhost:3001/api/mcp',
  concurrentUsers: 100,
  duration: 60000, // 1 minute
  requestsPerSecond: 100,
  toolName: 'server_info',
});

console.log('Load Test Results:', testResults);
```

### Performance Benchmarking Tool

```typescript
server.registerTool({
  name: 'performance_benchmark',
  description: 'Run performance benchmarks on server tools',
  inputSchema: {
    type: 'object',
    properties: {
      toolName: { type: 'string', description: 'Tool to benchmark' },
      iterations: { type: 'number', default: 100, minimum: 1, maximum: 10000 },
      concurrency: { type: 'number', default: 10, minimum: 1, maximum: 100 },
      args: { type: 'object', description: 'Tool arguments' },
    },
  },
  handler: async params => {
    const results = {
      toolName: params.toolName,
      iterations: params.iterations,
      concurrency: params.concurrency,
      totalDuration: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      successRate: 0,
      errors: [] as string[],
      responseTimes: [] as number[],
    };

    const startTime = Date.now();
    const promises = [];

    // Create concurrent workers
    for (let i = 0; i < params.concurrency; i++) {
      const worker = async () => {
        for (let j = 0; j < Math.ceil(params.iterations / params.concurrency); j++) {
          const iterationStart = process.hrtime.bigint();

          try {
            const request = {
              id: `benchmark_${i}_${j}`,
              method: 'tools/call',
              params: {
                name: params.toolName,
                arguments: params.args,
              },
            };

            const response = await server.processRequest(request);
            const iterationEnd = process.hrtime.bigint();
            const responseTime = Number(iterationEnd - iterationStart) / 1000000;

            results.responseTimes.push(responseTime);
            results.minResponseTime = Math.min(results.minResponseTime, responseTime);
            results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
          } catch (error) {
            results.errors.push(error.message);
          }
        }
      };

      promises.push(worker());
    }

    await Promise.all(promises);
    results.totalDuration = Date.now() - startTime;

    // Calculate statistics
    if (results.responseTimes.length > 0) {
      const sortedTimes = results.responseTimes.sort((a, b) => a - b);
      results.averageResponseTime =
        results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
      results.p50ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
      results.p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      results.p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    }

    results.successRate = (results.responseTimes.length / params.iterations) * 100;

    return results;
  },
});
```

---

For more performance optimization examples, see the [examples directory](../examples/).
