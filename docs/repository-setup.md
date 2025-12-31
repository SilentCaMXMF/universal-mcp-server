# GitHub Repository Setup Guide

This guide will help you set up the Universal MCP Server repository for GitHub hosting and npm publishing.

## 🚀 Initial Repository Setup

### 1. Fork or Create Repository

**Option A: Fork Existing Repository**

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/universal-mcp-server.git
cd universal-mcp-server
```

**Option B: Create New Repository**

```bash
# Create new repository on GitHub, then clone
git clone https://github.com/YOUR_USERNAME/universal-mcp-server.git
cd universal-mcp-server
# Copy files from current location to new repository
```

### 2. Configure Repository

```bash
# Add original repository as upstream (if forked)
git remote add upstream https://github.com/original-owner/universal-mcp-server.git

# Set up Git configuration
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create and switch to main branch
git checkout -b main
git push -u origin main
```

### 3. Configure GitHub Settings

#### Repository Settings

- **Repository Name**: `universal-mcp-server`
- **Description**: `🔌 Universal MCP (Model Context Protocol) server and client library with plugin system, multi-protocol support, and production-ready features`
- **Website**: `https://universal-mcp-server.dev`
- **Topics**: `mcp, model-context-protocol, typescript, websocket, http, plugin-system, ai, llm`

#### Branch Protection

Go to Settings → Branches → Add rule:

- **Branch name pattern**: `main`
- **Require pull request reviews before merging**: ✅
- **Require approvals**: 2
- **Dismiss stale PR approvals when new commits are pushed**: ✅
- **Require status checks to pass before merging**: ✅
- **Require branches to be up to date before merging**: ✅
- **Required status checks**:
  - `Test (18.x)`
  - `Test (20.x)`
  - `Build`
  - `Lint`
  - `Security Scan`

#### Integrations and Permissions

- **Actions**: Enable and configure workflows
- **Dependabot**: Enable for version updates
- **Code scanning**: Enable GitHub Advanced Security (if available)
- **Pages**: Enable for documentation hosting

## 📦 npm Publishing Setup

### 1. npm Account Setup

```bash
# Login to npm
npm login

# Verify authentication
npm whoami
```

### 2. Configure npm Tokens

Create an npm automation token:

1. Go to [npmjs.com](https://www.npmjs.com) → Account → Access Tokens
2. Create new token with "Automation" permissions
3. Add token to GitHub repository secrets:
   - Go to repository → Settings → Secrets → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm automation token

### 3. Configure Package Publishing

Update `package.json` with correct repository information:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/universal-mcp-server.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/universal-mcp-server/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/universal-mcp-server#readme"
}
```

### 4. Test Publishing (Dry Run)

```bash
# Test package build
npm run build

# Check what will be published
npm pack --dry-run

# Verify package integrity
npm run prepublishOnly
```

## 🔧 GitHub Actions Configuration

### 1. Enable Workflows

All workflows are already configured in `.github/workflows/`:

- `ci-cd.yml` - Main CI/CD pipeline
- `security.yml` - Security scanning
- `performance.yml` - Performance testing

### 2. Configure Additional Secrets

```bash
# Optional: Add these secrets for enhanced features
# GitHub repository → Settings → Secrets

CODECOV_TOKEN          # For coverage reporting
SNYK_TOKEN            # For security scanning
DISCORD_WEBHOOK_URL    # For release notifications
GITHUB_TOKEN           # For automated operations (auto-provided)
```

### 3. Set up Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Check for npm package updates
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    open-pull-requests-limit: 10
    reviewers:
      - 'your-username'
    assignees:
      - 'your-username'
    commit-message:
      prefix: 'deps'
      include: 'scope'

  # Check for GitHub Actions updates
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    open-pull-requests-limit: 5
```

## 📚 Documentation Setup

### 1. GitHub Pages

1. Go to repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` or `main`
4. Folder: `/docs` (if using docs folder)

### 2. Automatic Documentation Deployment

The CI/CD pipeline automatically builds and deploys documentation to GitHub Pages when pushing to `main`.

### 3. Configure README Badges

Update badges in `README.md` with your repository URLs:

```markdown
[![npm version](https://badge.fury.io/js/universal-mcp-server.svg)](https://badge.fury.io/js/universal-mcp-server)
[![CI/CD](https://github.com/YOUR_USERNAME/universal-mcp-server/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/YOUR_USERNAME/universal-mcp-server/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/universal-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/universal-mcp-server)
```

## 🏷️ Release Process

### 1. Configure Releases

1. Go to repository → Settings → General
2. Set "Automatic releases" (optional)
3. Configure release notes template

### 2. Semantic Release Setup

The project uses conventional commits for automatic versioning:

```bash
# Feature release
git commit -m "feat(transport): add websocket support"

# Bug fix
git commit -m "fix(server): resolve memory leak"

# Breaking change
git commit -m "feat!: new plugin system API"
```

### 3. Create Release

```bash
# Option 1: GitHub UI
# Go to repository → Releases → Create a new release

# Option 2: Git tags
git tag v1.0.0
git push origin v1.0.0

# Option 3: npm version
npm version patch  # or minor, major
git push --follow-tags
npm publish
```

## 🔍 Quality Assurance

### 1. Enable Repository Checks

- **Security alerts**: Enable in Settings → Security & analysis
- **Dependency graph**: Enable for vulnerability monitoring
- **Code scanning**: Enable if Advanced Security is available
- **Insights**: Enable for repository analytics

### 2. Configure Status Checks

Ensure the following status checks are required in branch protection:

- `Test (18.x)` - Unit and integration tests
- `Test (20.x)` - Multi-version compatibility
- `Build` - TypeScript compilation
- `Lint` - Code quality checks
- `Security Scan` - Vulnerability analysis

### 3. Set up Code Owners

Create `CODEOWNERS` file:

```
# Global owners
* @your-username @team-username

# Specific file patterns
.github/workflows/* @your-username
src/core/* @your-username
src/client/* @team-username
```

## 🚀 Deployment Workflow

### 1. Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... code, test, commit ...

# 3. Push and create PR
git push origin feature/new-feature
# Create pull request on GitHub
```

### 2. Review Process

1. Automated tests run on PR
2. Code review by maintainers
3. All status checks must pass
4. Merge to `develop` branch
5. Periodically merge `develop` to `main`

### 3. Production Deployment

```bash
# Merge to main triggers:
# - Full test suite
# - Security scan
# - Build process
# - npm publish (if tagged as release)
# - Documentation deployment
```

## 📊 Monitoring and Analytics

### 1. GitHub Insights

Monitor repository health with:

- Traffic analytics
- Clone counts
- Contributor statistics
- Issue/PR metrics

### 2. npm Analytics

Track package usage with:

- Download statistics
- Dependents count
- Version distribution
- Geographic distribution

### 3. External Monitoring

Set up optional monitoring:

- **Bundle size**: `npm run size-check`
- **Performance**: Regular performance benchmarks
- **Security**: Dependabot alerts and Snyk scanning

## 🤝 Community Management

### 1. Issue Templates

Already configured:

- `bug_report.yml` - For reporting bugs
- `feature_request.yml` - For requesting features

### 2. PR Template

Already configured with comprehensive guidelines and checklists.

### 3. Community Guidelines

- Enforce Code of Conduct
- Respond to issues within 24-48 hours
- Regular review and triage of open issues
- Community contributions recognition

## 🔄 Maintenance Tasks

### Weekly

- Review and triage new issues
- Check Dependabot PRs
- Monitor CI/CD pipeline health
- Review code coverage trends

### Monthly

- Update dependencies
- Review and update documentation
- Performance benchmarking
- Security audit review

### Quarterly

- Major dependency updates
- Architecture review
- Roadmap planning
- Community engagement activities

---

## 📞 Support Resources

- **GitHub Discussions**: Community Q&A
- **Issues**: Bug reports and feature requests
- **Email**: support@universal-mcp-server.dev
- **Documentation**: https://universal-mcp-server.dev/docs

---

**Your Universal MCP Server repository is now ready for professional open-source development and npm publishing! 🎉**
