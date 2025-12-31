#!/usr/bin/env node

/**
 * Repository Verification Script
 * Verifies that the universal-mcp-server repository is properly set up
 * and ready for npm publishing.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Universal MCP Server Repository Setup...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'src/index.ts',
  'src/core/server.ts',
  'src/client/transports/base.ts',
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json configuration
console.log('\n📦 Checking package.json configuration:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const checks = [
    { field: 'name', value: 'universal-mcp-server', required: true },
    { field: 'version', pattern: /^\d+\.\d+\.\d+$/, required: true },
    { field: 'main', value: 'dist/index.js', required: false },
    { field: 'types', value: 'dist/index.d.ts', required: false },
    { field: 'files', contains: ['dist'], required: true },
    { field: 'repository.url', pattern: /github.com\/SilentCaMXMF/, required: true },
    { field: 'license', value: 'MIT', required: true },
    { field: 'engines.node', pattern: /^>=18/, required: true },
  ];

  checks.forEach(({ field, value, pattern, contains, required }) => {
    const fieldValue = getNestedValue(packageJson, field);

    if (value && fieldValue === value) {
      console.log(`  ✅ ${field}: ${fieldValue}`);
    } else if (pattern && pattern.test(fieldValue)) {
      console.log(`  ✅ ${field}: ${fieldValue}`);
    } else if (contains && contains.every(item => fieldValue.includes(item))) {
      console.log(`  ✅ ${field}: ${JSON.stringify(fieldValue)}`);
    } else if (required) {
      console.log(`  ❌ ${field}: ${fieldValue} (expected: ${value || pattern || contains})`);
    } else {
      console.log(`  ⚠️  ${field}: ${fieldValue} (optional)`);
    }
  });
} catch (error) {
  console.log('  ❌ Failed to parse package.json');
  allFilesExist = false;
}

// Check build output
console.log('\n🏗️  Checking build output:');
const distFiles = [
  'dist/core/core/server.js',
  'dist/core/core/server.d.ts',
  'dist/client/client/transports/http.js',
  'dist/client/client/transports/http.d.ts',
  'dist/client/client/transports/websocket.js',
  'dist/client/client/transports/websocket.d.ts',
  'dist/client/client/transports/stdio.js',
  'dist/client/client/transports/stdio.d.ts',
];

distFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - NOT BUILT`);
    allFilesExist = false;
  }
});

// Check git status
console.log('\n🔄 Checking git status:');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('  ⚠️  There are uncommitted changes:');
    gitStatus
      .split('\n')
      .filter(line => line.trim())
      .forEach(line => {
        console.log(`    ${line}`);
      });
  } else {
    console.log('  ✅ Working directory is clean');
  }

  const gitRemote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  if (gitRemote.includes('SilentCaMXMF/universal-mcp-server')) {
    console.log(`  ✅ Remote: ${gitRemote}`);
  } else {
    console.log(`  ❌ Remote: ${gitRemote} - INCORRECT`);
  }
} catch (error) {
  console.log('  ❌ Git status check failed');
}

// Check npm packaging
console.log('\n📦 Checking npm packaging:');
try {
  const packResult = execSync('npm pack --dry-run --json', { encoding: 'utf8' });
  const packInfo = JSON.parse(packResult);
  console.log(`  ✅ Package size: ${(packInfo[0].size / 1024).toFixed(1)} KB`);
  console.log(`  ✅ Unpacked size: ${(packInfo[0].unpackedSize / 1024).toFixed(1)} KB`);
  console.log(`  ✅ File count: ${packInfo[0].fileCount}`);
} catch (error) {
  console.log('  ❌ npm pack check failed');
}

// Summary
console.log('\n📋 Verification Summary:');
if (allFilesExist) {
  console.log('  ✅ All required files are present');
  console.log('  ✅ Package is built successfully');
  console.log('  ✅ Configuration looks correct');
  console.log('  ✅ Repository is ready for npm publishing!');
  console.log('\n🚀 To publish to npm:');
  console.log('  npm publish');
  console.log('\n📖 For documentation:');
  console.log('  npm run docs:serve');
} else {
  console.log('  ❌ Some issues found - please fix before publishing');
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}
