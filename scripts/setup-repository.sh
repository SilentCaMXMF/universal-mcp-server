#!/bin/bash

# Universal MCP Server - Repository Setup Script
# This script helps set up the repository for GitHub hosting and npm publishing

set -e

echo "🚀 Universal MCP Server Repository Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${BLUE}📝 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_warning "$1 is not installed"
        return 1
    fi
}

# Prerequisites
print_step "Checking prerequisites"

if check_command "git" && check_command "node" && check_command "npm"; then
    echo "✅ Prerequisites satisfied"
else
    print_error "Please install missing prerequisites and try again"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    print_success "Node.js version $NODE_VERSION is compatible"
else
    print_error "Node.js version $NODE_VERSION is too old. Required: >= $REQUIRED_VERSION"
    exit 1
fi

# Repository Configuration
print_step "Configuring repository"

# Prompt for GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME
if [ -z "$GITHUB_USERNAME" ]; then
    print_error "GitHub username is required"
    exit 1
fi

# Update package.json with user's repository
print_step "Updating package.json configuration"

# Replace placeholder with actual username
sed -i.bak "s/yourusername/$GITHUB_USERNAME/g" package.json
rm package.json.bak

# Update repository URLs in package.json
npm pkg set "repository.url=https://github.com/$GITHUB_USERNAME/universal-mcp-server.git"
npm pkg set "bugs.url=https://github.com/$GITHUB_USERNAME/universal-mcp-server/issues"
npm pkg set "homepage=https://github.com/$GITHUB_USERNAME/universal-mcp-server#readme"

print_success "Updated package.json with your GitHub username"

# Git Setup
print_step "Setting up Git repository"

if [ ! -d ".git" ]; then
    git init
    print_success "Initialized Git repository"
    
    # Add remote
    git remote add origin "https://github.com/$GITHUB_USERNAME/universal-mcp-server.git"
    print_success "Added remote origin"
else
    print_success "Git repository already exists"
fi

# Create initial commit if needed
if [ -z "$(git status --porcelain)" ]; then
    print_success "Repository is up to date"
else
    git add .
    git commit -m "feat: initial setup with Universal MCP Server

- Complete repository configuration
- GitHub Actions workflows for CI/CD
- Comprehensive documentation
- npm publishing setup
- Issue and PR templates

This commit includes:
- Core MCP server implementation
- Multi-protocol transport support
- Plugin system
- Security and monitoring features
- Comprehensive test suite
- Professional documentation
- GitHub integration workflows"

    print_success "Created initial commit"
fi

# Branch setup
print_step "Setting up branch structure"

# Create and switch to main branch if not already on main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    git checkout -b main
    print_success "Switched to main branch"
fi

# Protect main branch (instruction)
print_warning "Remember to enable branch protection for 'main' branch in GitHub settings"

# npm Setup
print_step "Configuring npm publishing"

# Check if user is logged into npm
if npm whoami > /dev/null 2>&1; then
    print_success "Already logged into npm as $(npm whoami)"
else
    print_warning "You need to log into npm for publishing:"
    echo "Run: npm login"
fi

# Build verification
print_step "Verifying build process"

echo "Running build..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed. Please fix issues before publishing"
    exit 1
fi

echo "Running tests..."
if npm run test:run; then
    print_success "All tests passed"
else
    print_error "Some tests failed. Please fix before publishing"
    exit 1
fi

# Package verification
print_step "Verifying package contents"

echo "Checking what will be published..."
if npm pack --dry-run > /dev/null; then
    print_success "Package verification passed"
else
    print_error "Package verification failed"
    exit 1
fi

# Final instructions
print_step "Setup complete! Next steps:"

cat << 'EOF'

🎉 Repository setup complete!

📋 NEXT STEPS:

1. Push to GitHub:
   git push -u origin main

2. Configure GitHub repository:
   - Go to: https://github.com/USERNAME/universal-mcp-server/settings
   - Enable branch protection for 'main' branch
   - Enable GitHub Actions
   - Configure secrets (NPM_TOKEN, CODECOV_TOKEN)
   - Enable GitHub Pages for documentation

3. Set up npm publishing:
   - Create npm automation token: https://www.npmjs.com
   - Add NPM_TOKEN to GitHub repository secrets
   - Verify npm authentication: npm whoami

4. Create first release:
   git tag v1.0.0
   git push origin v1.0.0
   # Or create release through GitHub UI

🔧 USEFUL COMMANDS:

# Development
npm run dev              # Start development server
npm run test              # Run tests in watch mode
npm run lint              # Check code quality

# Building & Publishing
npm run build            # Build for production
npm run test:run         # Run all tests
npm pack --dry-run      # Check package contents
npm publish             # Publish to npm

# Documentation
npm run docs:dev         # Development documentation
npm run docs:build       # Build documentation

📚 DOCUMENTATION:
- README.md           - Main documentation
- docs/               - Detailed guides
- examples/           - Usage examples
- CONTRIBUTING.md     - Contribution guidelines

🆘 SUPPORT:
- Issues: https://github.com/USERNAME/universal-mcp-server/issues
- Discussions: https://github.com/USERNAME/universal-mcp-server/discussions
- Email: support@universal-mcp-server.dev

🔒 SECURITY:
- Report vulnerabilities: security@universal-mcp-server.dev
- Security policy: https://github.com/USERNAME/universal-mcp-server/security

Happy coding! 🚀
EOF

# Clean up
print_step "Cleanup"

echo "Cleaning up temporary files..."
find . -name "*.bak" -delete
print_success "Cleanup complete"

echo -e "\n${GREEN}🎉 Repository setup completed successfully!${NC}"
echo -e "${BLUE}Follow the next steps above to complete your GitHub and npm setup.${NC}"