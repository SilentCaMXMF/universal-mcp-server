# Deployment Guide

This comprehensive guide covers deploying Universal MCP Server to production environments.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Environment Setup](#environment-setup)
- [Production Configuration](#production-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Load Balancing](#load-balancing)
- [Monitoring & Observability](#monitoring--observability)
- [Backup & Recovery](#backup--recovery)
- [Security Hardening](#security-hardening)

## Deployment Overview

### Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │  API Gateway   │    │   CDN / WAF   │
│   (NGINX/HA)  │    │   (Optional)   │    │   (Optional)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MCP Server Cluster                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Instance │  │ Instance │  │ Instance │  │ Instance │  │
│  │    1    │  │    2    │  │    3    │  │    N    │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │      Cache      │    │  File Storage   │
│  (PostgreSQL)   │    │     (Redis)     │    │     (S3)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Security settings applied
- [ ] Load balancer configured
- [ ] SSL/TLS certificates
- [ ] Monitoring setup
- [ ] Backup strategy
- [ ] Health checks configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Scalability tested

## Environment Setup

### System Requirements

#### Minimum Requirements

- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Storage**: 20GB SSD
- **Network**: 100Mbps
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+)

#### Recommended Requirements

- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ SSD
- **Network**: 1Gbps
- **OS**: Ubuntu 22.04 LTS

#### Node.js Requirements

```bash
# Install Node.js 18+ using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be v18.x.x or higher
npm --version   # Should be 8.x.x or higher
```

### Environment Variables

Create a `.env.production` file:

```bash
# Server Configuration
MCP_SERVER_NAME=production-mcp-server
MCP_SERVER_VERSION=1.0.0
NODE_ENV=production
LOG_LEVEL=info

# Network Configuration
HOST=0.0.0.0
WEBSOCKET_PORT=3000
HTTP_PORT=3001

# Security
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key
API_KEY_ROTATION_DAYS=90

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/mcp_prod
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# File Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=mcp-server-files

# Monitoring
METRICS_ENABLED=true
PROMETHEUS_PORT=9090
SENTRY_DSN=https://your-sentry-dsn
HEALTH_CHECK_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
MAX_CONNECTIONS_PER_IP=50

# Logging
LOG_FORMAT=json
LOG_FILE_PATH=/var/log/mcp-server/app.log
SYSLOG_HOST=logserver.internal
SYSLOG_PORT=514

# CORS
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

## Production Configuration

### Complete Production Config

```typescript
import { MCPServer } from 'universal-mcp-server';

const productionConfig = {
  name: process.env.MCP_SERVER_NAME!,
  version: process.env.MCP_SERVER_VERSION!,
  description: 'Production MCP Server',

  transports: {
    websocket: {
      port: parseInt(process.env.WEBSOCKET_PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      path: '/mcp',
      maxConnections: 10000,
      pingInterval: 30000,
      pingTimeout: 5000,
      compression: true,

      // SSL/TLS
      ssl: {
        key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : undefined,
        cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : undefined,
        ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined,
      },
    },

    http: {
      port: parseInt(process.env.HTTP_PORT || '3001'),
      host: process.env.HOST || '0.0.0.0',
      path: '/api/v1/mcp',

      // CORS
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
        maxAge: 86400, // 24 hours
      },

      // Rate Limiting
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
        message: 'Rate limit exceeded. Please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
      },

      // Security Headers
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
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
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        frameguard: { action: 'deny' },
        noSniff: true,
        referrerPolicy: { policy: ['no-referrer', 'strict-origin-when-cross-origin'] },
      },

      // Keep-alive
      keepAlive: true,
      keepAliveTimeout: 65000,
      maxSockets: 10000,
      maxFreeSockets: 100,
    },
  },

  // Security
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
      clockSkew: 60,
    },

    // Network Security
    ipWhitelist: ['10.0.0.0/8', '192.168.0.0/16', '172.16.0.0/12'],
    maxConnectionsPerIP: parseInt(process.env.MAX_CONNECTIONS_PER_IP || '50'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',

    transports: {
      console: {
        enabled: false,
      },

      file: {
        enabled: true,
        path: process.env.LOG_FILE_PATH || '/var/log/mcp-server/app.log',
        maxSize: '100MB',
        maxFiles: 30,
        rotate: 'daily',
        compress: true,
      },

      syslog: {
        enabled: !!process.env.SYSLOG_HOST,
        host: process.env.SYSLOG_HOST,
        port: parseInt(process.env.SYSLOG_PORT || '514'),
        facility: 'local0',
      },
    },

    correlation: {
      enabled: true,
      headerName: 'X-Request-ID',
      includeInResponse: true,
    },
  },

  // Metrics
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    collectInterval: 60000,

    endpoints: {
      prometheus: {
        enabled: true,
        port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        path: '/metrics',
      },
    },

    retention: {
      memory: '24h',
      disk: '30d',
    },
  },

  // Health Checks
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    endpoint: '/health',

    checks: {
      memory: {
        enabled: true,
        threshold: 0.9,
      },
      disk: {
        enabled: true,
        threshold: 0.95,
        path: '/',
      },
      database: {
        enabled: true,
        timeout: 5000,
        interval: 30000,
      },
    },
  },
};

const server = new MCPServer(productionConfig);
export default server;
```

### PM2 Process Management

```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: './dist/index.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    env_production: {
      NODE_ENV: 'production'
    },

    // Process management
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,

    // Logging
    log_file: '/var/log/mcp-server/pm2.log',
    out_file: '/var/log/mcp-server/pm2-out.log',
    error_file: '/var/log/mcp-server/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Monitoring
    pmx: true,

    // Restart strategy
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs'],

    // Health check
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
};
```

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js --env production

# Save the process list
pm2 save

# Setup startup script
pm2 startup
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g mcp && adduser -D -G mcp mcp

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create directories
RUN mkdir -p /var/log/mcp-server /var/tmp/mcp-server && \
    chown -R mcp:mcp /app /var/log/mcp-server /var/tmp/mcp-server

# Switch to non-root user
USER mcp

# Expose ports
EXPOSE 3000 3001 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/health-check.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000' # WebSocket
      - '3001:3001' # HTTP
      - '9090:9090' # Metrics
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://mcp:${DB_PASSWORD}@postgres:5432/mcp_prod
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - ./logs:/var/log/mcp-server
      - ./uploads:/var/tmp/mcp-server

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mcp_prod
      - POSTGRES_USER=mcp
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - '5432:5432'
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U mcp -d mcp_prod']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - mcp-server
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Build and Deploy

```bash
# Build the Docker image
docker build -t mcp-server:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f mcp-server

# Scale the service
docker-compose -f docker-compose.prod.yml up -d --scale mcp-server=5
```

## Kubernetes Deployment

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-server
  labels:
    name: mcp-server
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-server-config
  namespace: mcp-server
data:
  NODE_ENV: 'production'
  LOG_LEVEL: 'info'
  LOG_FORMAT: 'json'
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-server-secrets
  namespace: mcp-server
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  jwt-secret: <base64-encoded-jwt-secret>
  encryption-key: <base64-encoded-encryption-key>
---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: mcp-server
  labels:
    app: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
        - name: mcp-server
          image: mcp-server:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
              name: websocket
            - containerPort: 3001
              name: http
            - containerPort: 9090
              name: metrics
          env:
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: mcp-server-config
                  key: NODE_ENV
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: mcp-server-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: mcp-server-secrets
                  key: jwt-secret
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: mcp-server-secrets
                  key: encryption-key
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '2000m'
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
  namespace: mcp-server
  labels:
    app: mcp-server
spec:
  selector:
    app: mcp-server
  ports:
    - name: websocket
      port: 3000
      targetPort: 3000
      protocol: TCP
    - name: http
      port: 3001
      targetPort: 3001
      protocol: TCP
    - name: metrics
      port: 9090
      targetPort: 9090
      protocol: TCP
  type: ClusterIP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-server-ingress
  namespace: mcp-server
  annotations:
    kubernetes.io/ingress.class: 'nginx'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/proxy-body-size: '10m'
    nginx.ingress.kubernetes.io/rate-limit: '100'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
spec:
  tls:
    - hosts:
        - mcp.yourdomain.com
      secretName: mcp-server-tls
  rules:
    - host: mcp.yourdomain.com
      http:
        paths:
          - path: /mcp
            pathType: Prefix
            backend:
              service:
                name: mcp-server-service
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: mcp-server-service
                port:
                  number: 3001
---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server-hpa
  namespace: mcp-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

# Configuration
NAMESPACE="mcp-server"
IMAGE_TAG=${1:-latest}
REGISTRY="your-registry.com"
IMAGE_NAME="mcp-server"

echo "Deploying MCP Server to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Image: $REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets (replace with actual values)
kubectl apply -f k8s/secret.yaml

# Apply config
kubectl apply -f k8s/configmap.yaml

# Update image in deployment
sed "s|image: mcp-server:latest|image: $REGISTRY/$IMAGE_NAME:$IMAGE_TAG|g" k8s/deployment.yaml | kubectl apply -f -

# Apply services
kubectl apply -f k8s/service.yaml

# Apply ingress
kubectl apply -f k8s/ingress.yaml

# Apply HPA
kubectl apply -f k8s/hpa.yaml

# Wait for deployment
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/mcp-server -n $NAMESPACE --timeout=300s

# Get status
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo "Deployment completed successfully!"
```

## Cloud Platform Deployment

### AWS ECS

```json
// ecs-task-definition.json
{
  "family": "mcp-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        },
        {
          "containerPort": 3001,
          "protocol": "tcp"
        },
        {
          "containerPort": 9090,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:mcp-db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:mcp-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mcp-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

```bash
# Deploy to ECS
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

aws ecs update-service \
  --cluster mcp-cluster \
  --service mcp-server \
  --task-definition mcp-server
```

### Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/mcp-server:latest

# Deploy to Cloud Run
gcloud run deploy mcp-server \
  --image gcr.io/PROJECT_ID/mcp-server:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=mcp-db-url:latest \
  --set-secrets JWT_SECRET=mcp-jwt-secret:latest
```

### Azure Container Instances

```bash
# Deploy to Azure
az container create \
  --resource-group mcp-rg \
  --name mcp-server \
  --image your-registry.azurecr.io/mcp-server:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000 3001 9090 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables JWT_SECRET=$JWT_SECRET \
  --dns-name-label mcp-server
```

## Load Balancing

### Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream mcp_ws_backend {
        least_conn;
        server mcp-server-1:3000 weight=1 max_fails=3 fail_timeout=30s;
        server mcp-server-2:3000 weight=1 max_fails=3 fail_timeout=30s;
        server mcp-server-3:3000 weight=1 max_fails=3 fail_timeout=30s;
    }

    upstream mcp_http_backend {
        least_conn;
        server mcp-server-1:3001 weight=1 max_fails=3 fail_timeout=30s;
        server mcp-server-2:3001 weight=1 max_fails=3 fail_timeout=30s;
        server mcp-server-3:3001 weight=1 max_fails=3 fail_timeout=30s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=http_limit:10m rate=100r/s;

    server {
        listen 80;
        server_name mcp.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name mcp.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # WebSocket upgrades
        location /mcp {
            limit_req zone=ws_limit burst=20 nodelay;

            proxy_pass http://mcp_ws_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }

        # HTTP API
        location /api {
            limit_req zone=http_limit burst=200 nodelay;

            proxy_pass http://mcp_http_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Increase timeouts for large uploads
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
            send_timeout 300s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://mcp_http_backend;
        }

        # Static files and assets
        location /static {
            alias /var/www/static;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### HAProxy Configuration

```haproxy
# haproxy.cfg
global
    daemon
    maxconn 4096
    log stdout local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog

frontend http_frontend
    bind *:80
    redirect scheme https code 301 if !{ ssl_fc }

frontend https_frontend
    bind *:443 ssl crt /etc/ssl/cert.pem
    default_backend mcp_backend

    # WebSocket detection
    acl is_websocket hdr(upgrade) -i websocket

    # Route WebSocket connections
    use_backend mcp_ws_backend if is_websocket

    # Route HTTP API
    use_backend mcp_http_backend if !is_websocket

backend mcp_ws_backend
    balance roundrobin
    server mcp1 mcp-server-1:3000 check
    server mcp2 mcp-server-2:3000 check
    server mcp3 mcp-server-3:3000 check

backend mcp_http_backend
    balance roundrobin
    option httpchk GET /health
    server mcp1 mcp-server-1:3001 check
    server mcp2 mcp-server-2:3001 check
    server mcp3 mcp-server-3:3001 check
```

## Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'mcp_rules.yml'

scrape_configs:
  - job_name: 'mcp-server'
    static_configs:
      - targets:
          - 'mcp-server-1:9090'
          - 'mcp-server-2:9090'
          - 'mcp-server-3:9090'
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - 'mcp-server-1:9100'
          - 'mcp-server-2:9100'
          - 'mcp-server-3:9100'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "MCP Server Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mcp_requests_total[5m])",
            "legendFormat": "{{method}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(mcp_response_time_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(mcp_requests_total{status=~\"5..\"}[5m]) / rate(mcp_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

### ELK Stack Integration

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/mcp-server/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: mcp-server
      environment: production

output.elasticsearch:
  hosts: ['elasticsearch:9200']
  index: 'mcp-server-%{+yyyy.MM.dd}'
  template.name: 'mcp-server'
  template.pattern: 'mcp-server-*'

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_docker_metadata: ~
```

## Backup & Recovery

### Database Backup Script

```bash
#!/bin/bash
# backup-database.sh

set -e

BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mcp_backup_${TIMESTAMP}.sql"
DB_URL="${DATABASE_URL}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Extract connection details from DATABASE_URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Starting database backup..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create backup
PGPASSWORD=$DB_PASS pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$DB_NAME \
  --no-password \
  --verbose \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/${BACKUP_FILE}.gz"
```

### Application State Backup

```bash
#!/bin/bash
# backup-application.sh

set -e

BACKUP_DIR="/backups/application"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/config_${TIMESTAMP}.tar.gz \
  /etc/mcp-server/ \
  /var/lib/mcp-server/

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/config_${TIMESTAMP}.tar.gz \
  s3://mcp-backups/application/config_${TIMESTAMP}.tar.gz

# Clean local backup
rm $BACKUP_DIR/config_${TIMESTAMP}.tar.gz

echo "Application backup completed"
```

## Security Hardening

### System Hardening Checklist

```bash
#!/bin/bash
# security-hardening.sh

echo "=== System Security Hardening ==="

# Update system
apt update && apt upgrade -y

# Install security tools
apt install -y fail2ban ufw auditd rkhunter

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

# File permissions
chmod 600 /etc/mcp-server/secrets
chmod 644 /etc/mcp-server/config
chmod 755 /var/log/mcp-server

echo "Security hardening completed"
```

### SSL Certificate Management

```bash
#!/bin/bash
# setup-ssl.sh

DOMAIN="mcp.yourdomain.com"
EMAIL="admin@yourdomain.com"
CERT_DIR="/etc/ssl/mcp"

mkdir -p $CERT_DIR

# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx \
  -d $DOMAIN \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  --redirect \
  --staple-ocsp \
  --must-staple

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

echo "SSL setup completed for $DOMAIN"
```

---

For more deployment examples and templates, see the [examples directory](../examples/deployment/).
