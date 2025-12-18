#!/usr/bin/env node

/**
 * Download portable Node.js for target platform
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const NODE_VERSION = '20.11.0';
const TARGET_DIR = path.join(__dirname, '..', 'src-tauri', 'binaries');

// Platform detection
const platform = process.platform;
const arch = process.arch;

console.log(`🔍 Detected platform: ${platform}-${arch}\n`);

const PLATFORMS = {
  'win32-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    filename: 'node-win-x64.zip',
    extractDir: 'node-win-x64',
    nodeDir: `node-v${NODE_VERSION}-win-x64`
  },
  'darwin-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    filename: 'node-darwin-x64.tar.gz',
    extractDir: 'node-darwin-x64',
    nodeDir: `node-v${NODE_VERSION}-darwin-x64`
  },
  'darwin-arm64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    filename: 'node-darwin-arm64.tar.gz',
    extractDir: 'node-darwin-arm64',
    nodeDir: `node-v${NODE_VERSION}-darwin-arm64`
  },
  'linux-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz`,
    filename: 'node-linux-x64.tar.xz',
    extractDir: 'node-linux-x64',
    nodeDir: `node-v${NODE_VERSION}-linux-x64`
  }
};

const platformKey = `${platform}-${arch}`;
const config = PLATFORMS[platformKey];

if (!config) {
  console.error(`❌ Unsupported platform: ${platformKey}`);
  console.log('Supported platforms:', Object.keys(PLATFORMS).join(', '));
  process.exit(1);
}

// Create directories
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const downloadPath = path.join(TARGET_DIR, config.filename);
const extractPath = path.join(TARGET_DIR, config.extractDir);

// Check if already downloaded
if (fs.existsSync(extractPath)) {
  console.log(`✅ Node.js already exists at: ${extractPath}`);
  console.log('   Delete it if you want to re-download.\n');
  process.exit(0);
}

// Download Node.js
console.log(`📥 Downloading Node.js v${NODE_VERSION} for ${platformKey}...`);
console.log(`   URL: ${config.url}\n`);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let downloaded = 0;

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      const totalSize = parseInt(response.headers['content-length'], 10);

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = ((downloaded / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n✅ Download complete!\n');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// Download and extract
(async () => {
  try {
    await downloadFile(config.url, downloadPath);

    console.log('📦 Extracting Node.js...');

    // Extract based on platform
    if (platform === 'win32') {
      // Windows: need unzip
      console.log('   For Windows, please manually extract the zip file:');
      console.log(`   File: ${downloadPath}`);
      console.log(`   Extract to: ${TARGET_DIR}\\${config.extractDir}`);
      console.log('\n   Or use PowerShell:');
      console.log(`   Expand-Archive -Path "${downloadPath}" -DestinationPath "${TARGET_DIR}"`);
      console.log(`   Rename-Item "${path.join(TARGET_DIR, config.nodeDir)}" "${config.extractDir}"`);
    } else {
      // Unix: use tar
      execSync(`cd "${TARGET_DIR}" && tar -xf "${config.filename}"`, { stdio: 'inherit' });
      fs.renameSync(
        path.join(TARGET_DIR, config.nodeDir),
        extractPath
      );
      fs.unlinkSync(downloadPath); // Clean up archive
      console.log(`✅ Extracted to: ${extractPath}\n`);
    }

    console.log('✨ Node.js portable ready!');
    console.log('   Next step: npm run tauri:build');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
