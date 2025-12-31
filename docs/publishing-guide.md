# Publishing Guide

This guide covers the complete process for publishing Universal MCP Server to npm and maintaining the package.

## 🚀 Pre-Publishing Checklist

### 1. Code Quality

```bash
# Run all quality checks
npm run lint
npm run type-check
npm run test:run
npm run build

# Verify package contents
npm pack --dry-run

# Check bundle size
npm run size-check
```

### 2. Version Management

```bash
# Update version (semantic)
npm version patch    # 1.0.1 (bug fixes)
npm version minor    # 1.1.0 (new features)
npm version major    # 2.0.0 (breaking changes)

# Pre-release versions
npm version prepatch --preid=alpha    # 1.0.1-alpha.0
npm version prerelease --preid=beta   # 1.1.0-beta.0
```

### 3. Documentation Updates

- [ ] Update `CHANGELOG.md` with new version
- [ ] Update `README.md` if needed
- [ ] Update API documentation
- [ ] Verify all examples still work
- [ ] Update version numbers in configuration files

## 📦 Publishing Process

### 1. Automated Publishing (Recommended)

The GitHub Actions workflow handles publishing automatically:

1. **Create Release on GitHub**

   ```bash
   # Tag and push
   git tag v1.0.0
   git push origin v1.0.0

   # Or create release through GitHub UI
   ```

2. **Trigger GitHub Actions**
   - Go to Actions tab
   - Ensure CI/CD workflow runs
   - Verify all checks pass
   - Package publishes automatically to npm

### 2. Manual Publishing

For emergencies or special cases:

```bash
# Build and test
npm run build
npm run test:run

# Check what will be published
npm pack --dry-run

# Publish to npm
npm publish --access public

# Or use the release script
npm run release
```

## 🔐 Authentication Setup

### 1. npm Token Configuration

**For GitHub Actions:**

1. Create npm automation token: [npmjs.com](https://www.npmjs.com)
2. Add to GitHub repository secrets:
   - Name: `NPM_TOKEN`
   - Value: Your automation token

**For Local Publishing:**

```bash
# Login to npm
npm login

# Or use token directly
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### 2. Two-Factor Authentication

If 2FA is enabled (recommended):

```bash
# One-time password required for publish
npm publish --otp 123456

# Or configure for automated publishing
npm profile enable-automation
```

## 📋 Package Structure

### Files Included

The `.npmignore` file ensures only necessary files are published:

```
✅ dist/                 # Built JavaScript/TypeScript
✅ README.md             # Documentation
✅ LICENSE                # License file
✅ CHANGELOG.md          # Version history
✅ docs/                 # Additional documentation
✅ examples/             # Usage examples
```

### Files Excluded

```
❌ src/                  # Source code (not needed)
❌ tests/                # Test files
❌ .github/              # GitHub specific
❌ node_modules/          # Dependencies
❌ .env files             # Environment secrets
```

## 🔄 Version Bumping Strategy

### Semantic Versioning

- **Major (X.0.0)**: Breaking changes
- **Minor (X.Y.0)**: New features, backward compatible
- **Patch (X.Y.Z)**: Bug fixes, backward compatible

### Pre-release Versions

- **Alpha**: Early development, unstable
- **Beta**: Feature complete, testing phase
- **RC**: Release candidate, final testing

### Automation

The project uses `conventional-commits` for automatic versioning:

```bash
# Feat (minor)
git commit -m "feat(transport): add websocket support"

# Fix (patch)
git commit -m "fix(server): resolve memory leak"

# Breaking change (major)
git commit -m "feat!: new plugin system API"
```

## 📊 Post-Publishing Tasks

### 1. Verification

```bash
# Install published version
npm install universal-mcp-server@latest

# Test installation
node -e "require('universal-mcp-server')"

# Check npm registry
npm view universal-mcp-server
```

### 2. Announcements

- **GitHub Release**: Auto-generated
- **NPM Registry**: Available immediately
- **Documentation**: Update if needed
- **Community**: Post in discussions/issues

### 3. Monitoring

Track package metrics:

- Download statistics
- Bundlephobia analysis
- Bundle size trends
- Dependency updates

## 🚨 Troubleshooting

### Common Issues

#### 1. "402 Payment Required"

```bash
# This is a paid private package
# Use --access public for free packages
npm publish --access public
```

#### 2. "Permission Denied"

```bash
# Check npm authentication
npm whoami

# Relogin if needed
npm login
```

#### 3. "Version Already Exists"

```bash
# Bump version first
npm version patch
npm publish
```

#### 4. "Package Too Large"

```bash
# Check .npmignore
npm pack --dry-run

# Optimize bundle
npm run size-check
```

### Rollback Process

If something goes wrong:

```bash
# Unpublish entire package (emergency only)
npm unpublish universal-mcp-server

# Or unpublish specific version
npm unpublish universal-mcp-server@1.0.0

# Deprecate version (preferred)
npm deprecate universal-mcp-server@1.0.0 "Security issue"
```

## 📈 Best Practices

### 1. Security

- Use 2FA on npm account
- Keep npm tokens secure
- Regular security audits
- Dependabot for dependency updates

### 2. Quality

- Automated testing before publish
- Code coverage requirements
- TypeScript strict mode
- ESLint and Prettier

### 3. Documentation

- Comprehensive README
- API reference
- Examples and tutorials
- Changelog maintenance

### 4. Release Management

- Semantic versioning
- Conventional commits
- Release notes
- Automated workflows

## 🔧 Configuration Files

### package.json Key Fields

```json
{
  "name": "universal-mcp-server",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": {
    "access": "public"
  }
}
```

### .npmignore Guidelines

```gitignore
# Exclude source and test files
src/
tests/

# Exclude development files
.github/
.vscode/

# Include necessary files
!dist/
!README.md
!LICENSE
```

## 📞 Support

For publishing issues:

- **npm Support**: https://www.npmjs.com/support
- **GitHub Issues**: Repository issues
- **Documentation**: Repository README
- **Community**: GitHub Discussions

---

**Following this guide ensures smooth, secure, and professional package publishing for Universal MCP Server! 🚀**
