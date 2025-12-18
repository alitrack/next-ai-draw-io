#!/usr/bin/env node
/**
 * Next.js Standalone Server Wrapper for pkg
 *
 * This wrapper script starts the Next.js standalone server.
 * It's designed to be packaged with pkg into a single executable.
 */

const path = require('path');
const { spawn } = require('child_process');

// Get the directory of the executable
const exeDir = process.pkg
  ? path.dirname(process.execPath)
  : __dirname;

// Path to the Next.js standalone server
const serverPath = process.pkg
  ? path.join(exeDir, 'standalone', 'server.js')
  : path.join(__dirname, '..', '.next', 'standalone', 'server.js');

console.log('[Server Wrapper] Starting Next.js server from:', serverPath);
console.log('[Server Wrapper] Working directory:', process.cwd());

// Set environment variables
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || 'localhost';

// Import and run the Next.js server
try {
  require(serverPath);
  console.log('[Server Wrapper] Next.js server started successfully');
} catch (error) {
  console.error('[Server Wrapper] Failed to start Next.js server:', error);
  process.exit(1);
}
