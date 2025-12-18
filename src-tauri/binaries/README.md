# Building Desktop App with Embedded Node.js

## Current Status

The Next.js app has been built in standalone mode.

## Manual Steps Required

### For Windows Build:

1. Download Node.js portable for Windows:
   https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip

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
   https://nodejs.org/dist/v20.11.0/node-v20.11.0-darwin-x64.tar.gz

2. Extract to: src-tauri/binaries/node-darwin-x64/

3. Run: npm run tauri:build

### For macOS Build (Apple Silicon):

1. Download Node.js portable for macOS ARM:
   https://nodejs.org/dist/v20.11.0/node-v20.11.0-darwin-arm64.tar.gz

2. Extract to: src-tauri/binaries/node-darwin-arm64/

3. Run: npm run tauri:build

### For Linux Build:

1. Download Node.js portable for Linux:
   https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz

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
