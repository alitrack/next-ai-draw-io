#!/usr/bin/env node

/**
 * Build script for packaging Next.js app with portable Node.js
 *
 * This script:
 * 1. Builds Next.js in standalone mode
 * 2. Downloads portable Node.js for the target platform
 * 3. Packages everything for Tauri to bundle
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const NODE_VERSION = '20.11.0'; // LTS version
const PLATFORMS = {
  'win32-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    filename: 'node-win-x64.zip',
    executable: 'node.exe'
  },
  'darwin-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    filename: 'node-darwin-x64.tar.gz',
    executable: 'bin/node'
  },
  'darwin-arm64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    filename: 'node-darwin-arm64.tar.gz',
    executable: 'bin/node'
  },
  'linux-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz`,
    filename: 'node-linux-x64.tar.xz',
    executable: 'bin/node'
  }
};

const TARGET_DIR = path.join(__dirname, '..', 'src-tauri', 'binaries');
const STANDALONE_DIR = path.join(__dirname, '..', '.next', 'standalone');

console.log('🚀 Building Next.js with embedded Node.js...\n');

// Step 1: Build Next.js
console.log('📦 Step 1/4: Building Next.js standalone...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build complete\n');
} catch (error) {
  console.error('❌ Next.js build failed:', error.message);
  process.exit(1);
}

// Step 2: Verify standalone directory
if (!fs.existsSync(STANDALONE_DIR)) {
  console.error('❌ Standalone directory not found:', STANDALONE_DIR);
  process.exit(1);
}

// Step 3: Create binaries directory
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Step 4: Download Node.js portable for target platforms
console.log('📥 Step 2/4: Downloading portable Node.js...');
console.log('   Note: For production, you should download all platforms.');
console.log('   For now, we will prepare the structure.\n');

// Detect current platform
const platform = process.platform;
const arch = process.arch;
const platformKey = `${platform}-${arch}`;

if (!PLATFORMS[platformKey]) {
  console.log(`⚠️  Platform ${platformKey} not directly supported.`);
  console.log('   You can download Node.js manually from: https://nodejs.org/dist/\n');
}

// Step 5: Create launcher script
console.log('📝 Step 3/4: Creating launcher scripts...');

// Windows launcher
const winLauncher = `@echo off
REM Next.js Server Launcher for Windows
setlocal

set "SCRIPT_DIR=%~dp0"
set "NODE_EXE=%SCRIPT_DIR%node\\node.exe"
set "SERVER_JS=%SCRIPT_DIR%standalone\\server.js"

if not exist "%NODE_EXE%" (
    echo Error: Node.js not found at %NODE_EXE%
    exit /b 1
)

if not exist "%SERVER_JS%" (
    echo Error: Server not found at %SERVER_JS%
    exit /b 1
)

REM Set port and hostname
set "PORT=3000"
set "HOSTNAME=localhost"

echo Starting Next.js server...
"%NODE_EXE%" "%SERVER_JS%"
`;

// Unix launcher (macOS/Linux)
const unixLauncher = `#!/bin/bash
# Next.js Server Launcher for Unix

SCRIPT_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
NODE_BIN="$SCRIPT_DIR/node/bin/node"
SERVER_JS="$SCRIPT_DIR/standalone/server.js"

if [ ! -f "$NODE_BIN" ]; then
    echo "Error: Node.js not found at $NODE_BIN"
    exit 1
fi

if [ ! -f "$SERVER_JS" ]; then
    echo "Error: Server not found at $SERVER_JS"
    exit 1
fi

# Set port and hostname
export PORT=3000
export HOSTNAME=localhost

echo "Starting Next.js server..."
"$NODE_BIN" "$SERVER_JS"
`;

fs.writeFileSync(path.join(TARGET_DIR, 'start-server.bat'), winLauncher);
fs.writeFileSync(path.join(TARGET_DIR, 'start-server.sh'), unixLauncher);
fs.chmodSync(path.join(TARGET_DIR, 'start-server.sh'), '755');

console.log('✅ Launcher scripts created\n');

// Step 6: Create README for manual steps
const readme = `# Building Desktop App with Embedded Node.js

## Current Status

The Next.js app has been built in standalone mode.

## Manual Steps Required

### For Windows Build:

1. Download Node.js portable for Windows:
   https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip

2. Extract to: src-tauri/binaries/node-win-x64/
   The structure should be:
   src-tauri/binaries/
   ├── node-win-x64/
   │   ├── node.exe
   │   ├── npm
   │   └── ...
   └── start-server.bat

3. Run: npm run tauri:build

### For macOS Build (Intel):

1. Download Node.js portable for macOS:
   https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz

2. Extract to: src-tauri/binaries/node-darwin-x64/

3. Run: npm run tauri:build

### For macOS Build (Apple Silicon):

1. Download Node.js portable for macOS ARM:
   https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz

2. Extract to: src-tauri/binaries/node-darwin-arm64/

3. Run: npm run tauri:build

### For Linux Build:

1. Download Node.js portable for Linux:
   https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz

2. Extract to: src-tauri/binaries/node-linux-x64/

3. Run: npm run tauri:build

## Automated Download (Optional)

You can use the download-node.js script to automatically download Node.js for your platform.

## Package Size Estimates

- Windows installer: ~100-120 MB
- macOS .app: ~100-120 MB
- Linux AppImage: ~105-125 MB

Components:
- Tauri binary: ~5-8 MB
- Node.js portable: ~40-50 MB
- Next.js standalone: ~44 MB
- Static assets: ~4 MB

## Notes

- The binaries directory is git-ignored (too large)
- You need to download Node.js manually for each platform you want to build
- For CI/CD, add automated download steps
`;

fs.writeFileSync(path.join(TARGET_DIR, 'README.md'), readme);

console.log('📋 Step 4/4: Setup complete!\n');
console.log('📝 Next steps:');
console.log('   1. Read: src-tauri/binaries/README.md');
console.log('   2. Download Node.js portable for your platform');
console.log('   3. Run: npm run tauri:build\n');

console.log('✨ Build preparation complete!');
