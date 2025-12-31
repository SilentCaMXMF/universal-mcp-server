# Configuration Guide

This comprehensive guide covers all configuration options available in Universal MCP Server.

## Table of Contents

- [Server Configuration](#server-configuration)
- [Transport Configuration](#transport-configuration)
- [Plugin Configuration](#plugin-configuration)
- [Security Configuration](#security-configuration)
- [Logging Configuration](#logging-configuration)
- [Metrics Configuration](#metrics-configuration)
- [Environment Variables](#environment-variables)
- [Configuration Examples](#configuration-examples)

## Server Configuration

The main server configuration is passed to the MCPServer constructor:

```typescript
interface MCPServerConfig {
  // Basic server info
  name: string;
  version: string;
  description?: string;

  // Transports and plugins
  transports?: Record<string, TransportConfig>;
  plugins?: PluginConfig[];

  // Optional configurations
  logging?: LoggingConfig;
  security?: SecurityConfig;
  metrics?: MetricsConfig;
  healthCheck?: HealthCheckConfig;
}
```

### Required Fields

| Field     | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `name`    | `string` | Server name used in identification        |
| `version` | `string` | Server version for compatibility checking |

### Optional Fields

| Field         | Type                              | Description                              |
| ------------- | --------------------------------- | ---------------------------------------- |
| `description` | `string`                          | Human-readable description of the server |
| `transports`  | `Record<string, TransportConfig>` | Transport protocol configurations        |
| `plugins`     | `PluginConfig[]`                  | Plugin configurations                    |
| `logging`     | `LoggingConfig`                   | Logging configuration                    |
| `security`    | `SecurityConfig`                  | Security settings                        |
| `metrics`     | `MetricsConfig`                   | Performance metrics configuration        |
| `healthCheck` | `HealthCheckConfig`               | Health check configuration               |

## Transport Configuration

Each transport protocol has its own configuration options.

### WebSocket Transport

```typescript
interface WebSocketTransportConfig extends TransportConfig {
  // Connection settings
  port: number;
  host?: string; // Default: 'localhost'
  path?: string; // Default: '/'

  // Performance settings
  maxConnections?: number; // Default: 1000
  pingInterval?: number; // Default: 30000 (30s)
  pingTimeout?: number; // Default: 5000 (5s)
  compression?: boolean; // Default: true

  // WebSocket options
  options?: {
    perMessageDeflate?: {
      zlibDeflateOptions?: object;
    };
    // Additional ws options
    [key: string]: any;
  };
}
```

#### Example

```typescript
transports: {
  websocket: {
    port: 3000,
    host: '0.0.0.0',
    path: '/mcp',
    maxConnections: 500,
    pingInterval: 45000,
    pingTimeout: 10000,
    compression: true,
    options: {
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 6
        }
      }
    }
  }
}
```

### HTTP Transport

```typescript
interface HttpTransportConfig extends TransportConfig {
  // Connection settings
  port: number;
  host?: string; // Default: 'localhost'
  path?: string; // Default: '/'

  // CORS configuration
  cors?: {
    origin?: string[] | string | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
  };

  // Rate limiting
  rateLimit?: {
    windowMs: number; // Time window in ms
    max: number; // Max requests per window
    message?: string; // Rate limit message
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };

  // Security headers (Helmet)
  helmet?: {
    contentSecurityPolicy?: object;
    hsts?: object;
    // Additional helmet options
    [key: string]: any;
  };

  // Express app attachment
  attachTo?: Express | null; // Attach to existing Express app
}
```

#### Example

```typescript
transports: {
  http: {
    port: 3001,
    host: '0.0.0.0',
    path: '/api/v1/mcp',
    cors: {
      origin: ['https://app.example.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 1000,
      message: 'Rate limit exceeded. Try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true
      }
    }
  }
}
```

### Stdio Transport

```typescript
interface StdioTransportConfig extends TransportConfig {
  encoding?: string; // Default: 'utf8'
  delimiter?: string; // Default: '\n'
  timeout?: number; // Default: 30000 (30s)
  bufferSize?: number; // Default: 1048576 (1MB)
  echo?: boolean; // Default: false
}
```

#### Example

```typescript
transports: {
  stdio: {
    encoding: 'utf8',
    delimiter: '\n',
    timeout: 60000,
    bufferSize: 10 * 1024 * 1024,  // 10MB
    echo: false
  }
}
```

## Plugin Configuration

```typescript
interface PluginConfig {
  name: string; // Plugin identifier
  enabled: boolean; // Whether plugin is enabled
  options?: Record<string, any>; // Plugin-specific options
}
```

#### Example

```typescript
plugins: [
  {
    name: 'database',
    enabled: true,
    options: {
      connectionString: 'postgresql://localhost:5432/mcp',
      poolSize: 20,
      timeout: 30000,
    },
  },
  {
    name: 'authentication',
    enabled: true,
    options: {
      provider: 'jwt',
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    },
  },
  {
    name: 'monitoring',
    enabled: process.env.NODE_ENV === 'production',
    options: {
      endpoint: 'https://metrics.example.com',
      interval: 60000,
    },
  },
];
```

## Security Configuration

```typescript
interface SecurityConfig {
  // Basic security
  enableRateLimit?: boolean; // Default: true
  enableInputValidation?: boolean; // Default: true
  maxRequestSize?: number; // Default: 1048576 (1MB)

  // Access control
  allowedOrigins?: string[]; // CORS allowed origins
  ipWhitelist?: string[]; // Allowed IP ranges (CIDR)
  blacklistEnabled?: boolean; // Enable IP blacklist
  maxConnectionsPerIP?: number; // Max connections per IP

  // Authentication
  apiKeys?: {
    enabled: boolean;
    headerName?: string; // Default: 'X-API-Key'
    rotationDays?: number; // API key rotation period
  };

  jwt?: {
    enabled: boolean;
    secret: string; // JWT secret key
    algorithm?: string; // Default: 'HS256'
    expiresIn?: string; // Default: '1h'
    issuer?: string;
    audience?: string;
  };

  // Encryption
  encryption?: {
    enabled: boolean;
    algorithm?: string; // Default: 'aes-256-gcm'
    key?: string; // Encryption key
  };
}
```

#### Example

```typescript
security: {
  enableRateLimit: true,
  enableInputValidation: true,
  maxRequestSize: 10 * 1024 * 1024,  // 10MB

  allowedOrigins: [
    'https://app.example.com',
    'https://admin.example.com'
  ],

  ipWhitelist: [
    '10.0.0.0/8',
    '192.168.0.0/16',
    '172.16.0.0/12'
  ],

  blacklistEnabled: true,
  maxConnectionsPerIP: 100,

  apiKeys: {
    enabled: true,
    headerName: 'X-API-Key',
    rotationDays: 90
  },

  jwt: {
    enabled: true,
    secret: process.env.JWT_SECRET,
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: 'mcp-server',
    audience: 'mcp-clients'
  },

  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY
  }
}
```

## Logging Configuration

```typescript
interface LoggingConfig {
  level?: string; // Default: 'info'
  format?: 'json' | 'text'; // Default: 'json'

  transports?: {
    console?: {
      enabled: boolean;
      colorize?: boolean; // Default: true
    };

    file?: {
      enabled: boolean;
      path: string; // Log file path
      maxSize?: string; // Default: '100MB'
      maxFiles?: number; // Default: 10
      rotate?: 'daily' | 'weekly' | 'monthly'; // Default: 'daily'
      compress?: boolean; // Default: true
    };

    syslog?: {
      enabled: boolean;
      host: string;
      port?: number; // Default: 514
      facility?: string; // Default: 'local0'
    };

    http?: {
      enabled: boolean;
      url: string;
      method?: string; // Default: 'POST'
      headers?: Record<string, string>;
      interval?: number; // Batch interval in ms
    };
  };

  correlation?: {
    enabled: boolean;
    headerName?: string; // Default: 'X-Request-ID'
    includeInResponse?: boolean; // Default: true
  };

  filters?: {
    exclude?: string[]; // Exclude certain loggers
    include?: string[]; // Include only certain loggers
    level?: Record<string, string>; // Custom levels per logger
  };
}
```

#### Example

```typescript
logging: {
  level: 'info',
  format: 'json',

  transports: {
    console: {
      enabled: process.env.NODE_ENV !== 'production',
      colorize: true
    },

    file: {
      enabled: true,
      path: '/var/log/mcp-server/app.log',
      maxSize: '100MB',
      maxFiles: 30,
      rotate: 'daily',
      compress: true
    },

    syslog: {
      enabled: process.env.NODE_ENV === 'production',
      host: 'syslog.example.com',
      port: 514,
      facility: 'local0'
    }
  },

  correlation: {
    enabled: true,
    headerName: 'X-Request-ID',
    includeInResponse: true
  },

  filters: {
    exclude: ['very-noisy-logger'],
    level: {
      'security': 'warn',
      'performance': 'debug'
    }
  }
}
```

## Metrics Configuration

```typescript
interface MetricsConfig {
  enabled?: boolean; // Default: true
  collectInterval?: number; // Collection interval in ms

  retention?: {
    memory?: string; // Default: '24h'
    disk?: string; // Default: '30d'
  };

  endpoints?: {
    prometheus?: {
      enabled: boolean;
      port?: number; // Default: 9090
      path?: string; // Default: '/metrics'
      auth?: {
        username?: string;
        password?: string;
      };
    };

    grafana?: {
      enabled: boolean;
      dashboard?: string; // Dashboard ID
      apiKey?: string;
    };

    influxdb?: {
      enabled: boolean;
      url: string;
      database: string;
      username?: string;
      password?: string;
    };
  };

  custom?: {
    enabled: boolean;
    handlers?: Record<string, Function>;
  };
}
```

#### Example

```typescript
metrics: {
  enabled: true,
  collectInterval: 60000,  // 1 minute

  retention: {
    memory: '24h',
    disk: '30d'
  },

  endpoints: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: '/metrics',
      auth: {
        username: 'metrics',
        password: process.env.METRICS_PASSWORD
      }
    },

    grafana: {
      enabled: true,
      dashboard: 'mcp-server-overview',
      apiKey: process.env.GRAFANA_API_KEY
    },

    influxdb: {
      enabled: process.env.NODE_ENV === 'production',
      url: 'https://influx.example.com',
      database: 'mcp_metrics',
      username: 'mcp_user',
      password: process.env.INFLUX_PASSWORD
    }
  }
}
```

## Health Check Configuration

```typescript
interface HealthCheckConfig {
  enabled?: boolean; // Default: true
  endpoint?: string; // Default: '/health'

  checks?: {
    memory?: {
      enabled: boolean;
      threshold?: number; // Memory usage threshold (0-1)
    };

    disk?: {
      enabled: boolean;
      threshold?: number; // Disk usage threshold (0-1)
      path?: string; // Default: '/'
    };

    cpu?: {
      enabled: boolean;
      threshold?: number; // CPU usage threshold (0-1)
      interval?: number; // Check interval in ms
    };

    database?: {
      enabled: boolean;
      timeout?: number; // Timeout in ms
      interval?: number; // Check interval in ms
    };

    externalServices?: Array<{
      name: string;
      url: string;
      timeout?: number;
      method?: string; // Default: 'GET'
      headers?: Record<string, string>;
      expectedStatus?: number; // Default: 200
    }>;
  };

  response?: {
    includeDetails?: boolean; // Default: true
    includeMetrics?: boolean; // Default: false
    includeUptime?: boolean; // Default: true
    customData?: Record<string, any>;
  };
}
```

#### Example

```typescript
healthCheck: {
  enabled: true,
  endpoint: '/health',

  checks: {
    memory: {
      enabled: true,
      threshold: 0.9  // 90%
    },

    disk: {
      enabled: true,
      threshold: 0.95,  // 95%
      path: '/data'
    },

    cpu: {
      enabled: true,
      threshold: 0.8,  // 80%
      interval: 5000
    },

    database: {
      enabled: true,
      timeout: 5000,
      interval: 30000
    },

    externalServices: [
      {
        name: 'auth-service',
        url: 'https://auth.example.com/health',
        timeout: 3000
      },
      {
        name: 'notification-service',
        url: 'https://notify.example.com/health',
        timeout: 3000,
        expectedStatus: 200
      }
    ]
  },

  response: {
    includeDetails: true,
    includeMetrics: true,
    includeUptime: true,
    customData: {
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV
    }
  }
}
```

## Environment Variables

Universal MCP Server supports configuration through environment variables:

| Variable               | Description                          | Default                 |
| ---------------------- | ------------------------------------ | ----------------------- |
| `MCP_SERVER_NAME`      | Server name                          | Required                |
| `MCP_SERVER_VERSION`   | Server version                       | Required                |
| `NODE_ENV`             | Environment (development/production) | `development`           |
| `LOG_LEVEL`            | Logging level                        | `info`                  |
| `LOG_FORMAT`           | Log format (json/text)               | `json`                  |
| `JWT_SECRET`           | JWT secret key                       | Required for JWT auth   |
| `ENCRYPTION_KEY`       | Encryption key                       | Required for encryption |
| `MAX_REQUEST_SIZE`     | Max request size in bytes            | `1048576`               |
| `RATE_LIMIT_WINDOW`    | Rate limit window in ms              | `900000`                |
| `RATE_LIMIT_MAX`       | Max requests per window              | `100`                   |
| `METRICS_ENABLED`      | Enable metrics                       | `true`                  |
| `HEALTH_CHECK_ENABLED` | Enable health checks                 | `true`                  |
| `WEBSOCKET_PORT`       | WebSocket port                       | `3000`                  |
| `HTTP_PORT`            | HTTP port                            | `3001`                  |
| `HOST`                 | Server host                          | `localhost`             |

## Configuration Examples

### Development Configuration

```typescript
const devConfig = {
  name: 'mcp-server-dev',
  version: '1.0.0',

  transports: {
    websocket: {
      port: 3000,
      host: 'localhost',
      compression: false, // Disable for easier debugging
    },
    http: {
      port: 3001,
      cors: {
        origin: true, // Allow all origins in dev
      },
      rateLimit: {
        windowMs: 60000, // 1 minute
        max: 1000, // More generous limit
      },
    },
  },

  logging: {
    level: 'debug',
    format: 'text',
    transports: {
      console: {
        enabled: true,
        colorize: true,
      },
    },
  },

  security: {
    enableRateLimit: false, // Disable for easier testing
    maxRequestSize: 50 * 1024 * 1024, // 50MB
  },
};
```

### Production Configuration

```typescript
const prodConfig = {
  name: 'mcp-server-prod',
  version: '1.0.0',

  transports: {
    websocket: {
      port: parseInt(process.env.WEBSOCKET_PORT || '3000'),
      host: '0.0.0.0',
      path: '/mcp',
      maxConnections: 10000,
      pingInterval: 30000,
      pingTimeout: 5000,
      compression: true,
    },
    http: {
      port: parseInt(process.env.HTTP_PORT || '3001'),
      host: '0.0.0.0',
      path: '/api/v1/mcp',
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
        credentials: true,
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        message: 'Rate limit exceeded',
        standardHeaders: true,
        legacyHeaders: false,
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        },
      },
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    transports: {
      console: {
        enabled: false,
      },
      file: {
        enabled: true,
        path: '/var/log/mcp-server/app.log',
        maxSize: '100MB',
        maxFiles: 30,
      },
      syslog: {
        enabled: true,
        host: 'syslog.internal',
        port: 514,
        facility: 'local0',
      },
    },
  },

  security: {
    enableRateLimit: true,
    enableInputValidation: true,
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '1048576'),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    ipWhitelist: ['10.0.0.0/8', '192.168.0.0/16'],
    maxConnectionsPerIP: 50,
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET!,
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'mcp-server',
      audience: 'mcp-clients',
    },
  },

  metrics: {
    enabled: true,
    collectInterval: 60000,
    endpoints: {
      prometheus: {
        enabled: true,
        port: 9090,
        path: '/metrics',
      },
    },
  },

  healthCheck: {
    enabled: true,
    checks: {
      memory: { enabled: true, threshold: 0.9 },
      disk: { enabled: true, threshold: 0.95 },
    },
  },
};
```

### Multi-Environment Configuration

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment-specific .env file
const env = process.env.NODE_ENV || 'development';
config({ path: resolve(process.cwd(), `.env.${env}`) });

function getConfig(): MCPServerConfig {
  const baseConfig = {
    name: process.env.MCP_SERVER_NAME || 'mcp-server',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',

    // Common configuration
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      transports: {
        console: {
          enabled: env === 'development',
          colorize: true,
        },
        file: {
          enabled: env === 'production',
          path: '/var/log/mcp-server/app.log',
        },
      },
    },
  };

  // Environment-specific additions
  if (env === 'development') {
    return {
      ...baseConfig,
      transports: {
        websocket: {
          port: 3000,
          compression: false,
        },
        http: {
          port: 3001,
          cors: { origin: true },
          rateLimit: { windowMs: 60000, max: 1000 },
        },
      },
      security: {
        enableRateLimit: false,
        maxRequestSize: 50 * 1024 * 1024,
      },
    };
  }

  if (env === 'production') {
    return {
      ...baseConfig,
      transports: {
        websocket: {
          port: parseInt(process.env.WEBSOCKET_PORT || '3000'),
          host: '0.0.0.0',
          maxConnections: 10000,
        },
        http: {
          port: parseInt(process.env.HTTP_PORT || '3001'),
          host: '0.0.0.0',
          cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
          },
        },
      },
      security: {
        enableRateLimit: true,
        jwt: {
          enabled: true,
          secret: process.env.JWT_SECRET!,
        },
      },
      metrics: {
        enabled: true,
        endpoints: {
          prometheus: { enabled: true, port: 9090 },
        },
      },
    };
  }

  return baseConfig;
}

// Usage
const server = new MCPServer(getConfig());
```

---

Need more configuration examples? Check out the [examples directory](../examples/) for complete working configurations.
