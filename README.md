# Universal MCP Server

[![npm version](https://badge.fury.io/js/universal-mcp-server.svg)](https://badge.fury.io/js/universal-mcp-server)
[![CI/CD](https://github.com/yourusername/universal-mcp-server/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/yourusername/universal-mcp-server/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/yourusername/universal-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/universal-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/universal-mcp-server.svg)](https://www.npmjs.com/package/universal-mcp-server)

🔌 **Universal MCP (Model Context Protocol) server and client library with plugin system, multi-protocol support, and production-ready features**

## ✨ Features

- 🚀 **Multi-Protocol Support**: WebSocket, HTTP, and stdio transport protocols
- 🧩 **Plugin System**: Extensible architecture with dynamic loading capabilities
- 🛡️ **Enterprise Security**: Built-in rate limiting, input validation, and secure defaults
- 📊 **Performance Monitoring**: Comprehensive metrics and performance tracking
- 🔧 **Built-in Tools**: File system, HTTP client, search, and system monitoring tools
- 💻 **TypeScript-First**: Full TypeScript support with comprehensive type definitions
- 🧪 **Comprehensive Testing**: Unit, integration, and E2E test coverage with >90% coverage
- 📚 **Extensive Documentation**: Detailed API docs, examples, and guides

## 🚀 Quick Start

### Installation

```bash
npm install universal-mcp-server
# or
yarn add universal-mcp-server
# or
pnpm add universal-mcp-server
```

### Basic Server Example

```typescript
import { MCPServer } from 'universal-mcp-server';

// Create server instance
const server = new MCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
  transports: {
    websocket: { port: 3000 },
    http: { port: 3001 },
  },
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
});

// Start the server
await server.start();
console.log('🚀 MCP Server running on WebSocket (3000) and HTTP (3001)');
```

### Client Example

```typescript
import { MCPClient } from 'universal-mcp-server';

// Create client
const client = new MCPClient({
  transport: {
    type: 'websocket',
    url: 'ws://localhost:3000',
  },
});

// Connect and use tools
await client.connect();
const result = await client.callTool('filesystem', 'readFile', {
  path: './example.txt',
});
console.log('File content:', result.content);
```

## 📖 Documentation

### Getting Started

- [Getting Started](./docs/getting-started.md) - Setup and basic usage
- [Installation Guide](./docs/getting-started.md#installation) - Detailed installation instructions
- [Quick Start Examples](./docs/getting-started.md#basic-usage) - Simple setup examples

### Core Documentation

- [API Reference](./docs/api-reference.md) - Complete API documentation
- [Configuration Guide](./docs/configuration.md) - Comprehensive configuration options
- [Plugin Development](./docs/plugin-development.md) - Building custom plugins
- [Transport Protocols](./docs/transports.md) - WebSocket, HTTP, and Stdio configuration

### Security & Performance

- [Security Guide](./docs/security.md) - Security features and best practices
- [Performance Optimization](./docs/performance.md) - Tuning and monitoring
- [Migration Guide](./docs/migration.md) - Migrating from other servers/APIs

### Support

- [Troubleshooting Guide](./docs/troubleshooting.md) - Common issues and solutions
- [Contributing Guide](./CONTRIBUTING.md) - Development guidelines

## 🎯 Examples

### 📁 [Examples Gallery](./examples/README.md)

Comprehensive collection of examples for all use cases

### 🚀 Basic Examples

- **[Basic Server](./examples/basic-server.ts)** - Simple MCP server with WebSocket and HTTP transports
- **[Client Usage](./examples/client-usage.ts)** - Complete client implementation with reconnection logic
- **[Plugin System](./examples/plugin-system.ts)** - Custom plugin development and loading

### 🏗️ Advanced Examples

- **[Enterprise Setup](./examples/enterprise-setup.ts)** - Production-ready server with security and monitoring
- **[Multi-Transport Server](./examples/multi-transport.ts)** - Using WebSocket, HTTP, and Stdio simultaneously
- **[File Server](./examples/file-server.ts)** - Full-featured file management system

### 🎓 Use Case Examples

- **E-commerce Integration** - Product catalog and order management
- **IoT Device Management** - Device monitoring and control systems
- **Analytics Dashboard** - Data analysis and reporting tools
- **API Testing Framework** - Automated testing capabilities

### 🛠️ Development Tools

- **Code Generation** - MCP-powered code generation
- **Build Automation** - CI/CD pipeline integration
- **Documentation Generator** - Dynamic documentation creation

## 🛠️ Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- TypeScript 4.9+

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/universal-mcp-server.git
cd universal-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Available Scripts

```bash
# Development
npm run dev              # Development mode with hot reload
npm run build            # Build for production
npm run build:dev        # Build for development

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage report
npm run test:coverage:unit    # Unit test coverage only
npm run test:coverage:integration  # Integration test coverage only
npm run test:coverage:e2e    # E2E test coverage only

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # TypeScript type checking

# Documentation
npm run docs:dev         # Generate docs in watch mode
npm run docs:build       # Build documentation

# Examples
npm run example:basic       # Run basic server example
npm run example:client      # Run client example
npm run example:plugins      # Run plugin system example
npm run example:enterprise  # Run enterprise setup example
npm run example:file-server # Run file server example
npm run example:multi-transport # Run multi-transport example

# Publishing
npm run release          # Build, test, and publish to npm
npm run prepublishOnly   # Prepare for publishing
```

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Individual component testing with Vitest
- **Integration Tests**: Multi-component interaction testing
- **E2E Tests**: End-to-end workflow testing
- **Security Tests**: Security vulnerability and penetration testing
- **Performance Tests**: Load and stress testing

```bash
# Run all tests
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code of Conduct
- Development setup
- Submitting issues and pull requests
- Coding standards and practices
- Release process

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`npm run test:run`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📋 Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 4.9+
- **npm**: >= 8.0.0

### Supported Platforms

- ✅ Linux (Ubuntu, Debian, CentOS, Alpine)
- ✅ macOS (Intel, Apple Silicon)
- ✅ Windows (10, 11, Server)

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 🆘 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/universal-mcp-server/issues)
- 💬 [Discussions](https://github.com/yourusername/universal-mcp-server/discussions)
- 📧 [Email Support](mailto:support@example.com)

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) specification
- Contributors and community members
- Open source projects that make this possible

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/universal-mcp-server?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/universal-mcp-server?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/universal-mcp-server)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/universal-mcp-server)

---

<div align="center">
  <strong>Built with ❤️ by the MCP community</strong>
</div>
