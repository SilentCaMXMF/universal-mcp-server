# Contributing to Universal MCP Server

🎉 We love your contributions! This guide will help you get started with contributing to the Universal MCP Server project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Getting Help](#getting-help)

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: Latest version
- **IDE**: VS Code (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - GitLens

### Development Environment Setup

1. **Fork the Repository**

   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/universal-mcp-server.git
   cd universal-mcp-server
   ```

2. **Add Upstream Remote**

   ```bash
   git remote add upstream https://github.com/original-owner/universal-mcp-server.git
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Run Initial Tests**

   ```bash
   npm run test:run
   npm run lint
   npm run type-check
   ```

5. **Set Up Development Environment**

   ```bash
   # Create a feature branch
   git checkout -b feature/your-feature-name

   # Start development server
   npm run dev
   ```

### Environment Configuration

Create a `.env.development` file for local development:

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
MCP_SERVER_PORT=3001
```

## Development Workflow

### Branch Strategy

We follow a simplified Git flow:

- **`main`**: Production-ready code (protected)
- **`develop`**: Integration branch for features
- **`feature/*`**: New features
- **`bugfix/*`**: Bug fixes
- **`hotfix/*`**: Critical production fixes

### Workflow Steps

1. **Start with Latest Code**

   ```bash
   git checkout main
   git pull upstream main
   git checkout develop
   git pull upstream develop
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code following our standards
   - Add tests
   - Update documentation
   - Commit frequently with conventional commits

4. **Run Local Tests**

   ```bash
   npm run test:run
   npm run lint
   npm run type-check
   npm run build
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

## Code Standards

### TypeScript Guidelines

- **Strict Mode**: All code must pass TypeScript strict mode
- **Type Safety**: Prefer explicit types over `any`
- **Interfaces**: Use interfaces for object shapes, types for unions
- **Imports**: Use type imports for types: `import type { Config }`
- **Naming**:
  - Classes: PascalCase (`MCPServer`)
  - Functions/Variables: camelCase (`createServer`)
  - Constants: UPPER_SNAKE_CASE (`MAX_CONNECTIONS`)
  - Files: kebab-case (`transport-manager.ts`)

### Code Style

```typescript
// ✅ Good
import type { ServerConfig } from './types';

export class MCPServer {
  private readonly config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = { ...config };
  }

  /**
   * Starts the MCP server with the configured transports
   * @returns Promise that resolves when server is ready
   */
  public async start(): Promise<void> {
    // Implementation
  }
}

// ❌ Bad
import { ServerConfig } from './types';

export class mcpServer {
  config: any;

  constructor(c) {
    this.config = c;
  }
}
```

### Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting, missing semicolons, etc.
- `refactor`: Code refactoring without API changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependency updates, etc.

**Examples:**

```
feat(transport): add websocket transport support
fix(plugin): resolve memory leak in plugin manager
docs(api): update server configuration documentation
refactor(server): simplify connection handling
```

## Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests for individual functions/classes
├── integration/    # Tests for component interactions
├── e2e/           # End-to-end workflow tests
├── performance/   # Performance and load tests
├── security/     # Security-focused tests
└── fixtures/     # Test data and mocks
```

### Writing Tests

```typescript
// tests/unit/server.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MCPServer } from '../../src/core/server';

describe('MCPServer', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  describe('constructor', () => {
    it('should create server with default config', () => {
      expect(server.getName()).toBe('test-server');
    });
  });

  describe('start', () => {
    it('should start server successfully', async () => {
      await expect(server.start()).resolves.not.toThrow();
    });
  });
});
```

### Test Requirements

- **Coverage**: Minimum 80% test coverage
- **Unit Tests**: All public APIs must have unit tests
- **Integration Tests**: Critical workflows must have integration tests
- **Performance Tests**: New features that impact performance
- **Security Tests**: Security-related changes

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance

# Run tests for specific file
npm run test:run -- tests/unit/server.test.ts
```

## Documentation

### Types of Documentation

1. **API Documentation**: JSDoc comments for all public APIs
2. **User Documentation**: README and guides in `/docs`
3. **Code Comments**: Complex logic explanations
4. **Examples**: Working examples in `/examples`

### Documentation Standards

````typescript
/**
 * Creates a new MCP server instance with the provided configuration
 *
 * @example
 * ```typescript
 * const server = MCPServer.create({
 *   name: 'my-server',
 *   transports: { websocket: { port: 3000 } }
 * });
 * ```
 *
 * @param config - Server configuration object
 * @returns Configured MCPServer instance
 * @throws {ValidationError} When configuration is invalid
 * @since 1.0.0
 */
public static create(config: ServerConfig): MCPServer {
  // Implementation
}
````

### Documentation Updates Required

- ✅ New features: API docs, examples, README updates
- ✅ Breaking changes: Migration guide
- ✅ Bug fixes: Changelog entry
- ✅ Deprecations: Deprecation notices and timeline

## Pull Request Process

### Before Opening a PR

1. **Check Requirements**
   - [ ] All tests pass (`npm run test:run`)
   - [ ] Code is linted (`npm run lint`)
   - [ ] Types compile (`npm run type-check`)
   - [ ] Build succeeds (`npm run build`)
   - [ ] Documentation is updated

2. **Update Changelog**

   ```markdown
   ## [1.1.0] - 2024-01-20

   ### Added

   - WebSocket transport support (#123)
   - Plugin system v2 (#125)

   ### Fixed

   - Memory leak in connection manager (#127)
   - Type inference issues (#128)

   ### Breaking Changes

   - Removed deprecated `legacyConfig` option (#126)
   ```

3. **PR Title and Description**

   ```markdown
   feat(transport): add websocket support

   - Implement WebSocket transport layer
   - Add connection management and reconnection
   - Include comprehensive tests
   - Update documentation with examples

   Closes #123
   ```

### PR Review Process

1. **Automated Checks**
   - CI/CD pipeline must pass
   - Code coverage must be maintained
   - Security scans must pass

2. **Code Review**
   - At least one maintainer approval required
   - All reviewer comments addressed
   - No merge conflicts

3. **Merge**
   - Squash and merge for feature branches
   - Maintainers can merge directly
   - Automated version bump and release

## Release Process

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (2.0.0)
- **MINOR**: New features, backward compatible (1.1.0)
- **PATCH**: Bug fixes, backward compatible (1.0.1)

### Automated Release

1. **Version Update**

   ```bash
   # Bump version (automated by conventional commits)
   npm version patch  # or minor, major
   ```

2. **Release Notes**
   - Automatically generated from conventional commits
   - Reviewed by maintainers

3. **Publishing**
   - Automated via GitHub Actions
   - Published to npm and GitHub Releases

### Manual Release (Emergency)

```bash
# Create release tag
git tag v1.0.1
git push origin v1.0.1

# Trigger release workflow
# Or publish manually
npm publish --access public
```

## Getting Help

### Resources

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/universal-mcp-server/issues)
- 💬 [Discussions](https://github.com/yourusername/universal-mcp-server/discussions)
- 📧 [Email Support](mailto:support@example.com)

### Types of Issues

- **Bug Reports**: Use bug report template
- **Feature Requests**: Use feature request template
- **Questions**: Start a discussion or ask in issues
- **Security**: Use [private vulnerability reporting](https://github.com/yourusername/universal-mcp-server/security)

### Community Guidelines

- Be respectful and inclusive
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)
- Help others when you can
- Focus on constructive feedback

---

Thank you for contributing to Universal MCP Server! 🚀

Every contribution, whether it's a bug fix, feature, documentation improvement, or simply reporting an issue, helps make this project better for everyone.
