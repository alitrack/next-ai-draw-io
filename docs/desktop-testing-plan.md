# Desktop Application Testing Plan

This document outlines the testing plan for the Tauri desktop application on Windows, macOS, and Linux platforms.

## Prerequisites

Before testing, ensure you have the following installed on each platform:
- Rust toolchain (https://www.rust-lang.org/tools/install)
- Node.js and npm
- Platform-specific dependencies (see below)

## Platform-Specific Setup

### Windows
- Visual Studio Community with C++ development tools
- WebView2 runtime (usually pre-installed on Windows 10+)

### macOS
- Xcode command line tools: `xcode-select --install`
- For Apple Silicon Macs, Rosetta 2 may be needed for some dependencies

### Linux
- Ubuntu/Debian:
  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```
- Fedora/CentOS:
  ```bash
  sudo dnf install webkit2gtk4.0-devel openssl-devel sqlite-devel
  ```

## Testing Steps

### 1. Build Process Testing
1. Clone the repository
2. Run `npm install`
3. Run `npm run tauri:build`
4. Verify that the build completes without errors
5. Check that executable files are created in `src-tauri/target/release/`

### 2. Installation Testing
1. Locate the platform-specific installer/bundle:
   - Windows: `.msi` file
   - macOS: `.app` bundle or `.dmg` file
   - Linux: `.deb` or `.AppImage` file
2. Run the installer
3. Verify that the application installs correctly
4. Launch the application from the installed location

### 3. Basic Functionality Testing
1. Launch the application
2. Verify that the main window opens correctly
3. Check that the application loads the web interface
4. Test basic navigation within the app

### 4. Menu System Testing
1. Open the File menu
2. Test Open, Save, and Save As functions
3. Verify keyboard shortcuts work (Ctrl+O, Ctrl+S, etc.)
4. Test Edit menu functions (Undo, Redo, Cut, Copy, Paste)
5. Test View menu functions (Reload, Toggle Fullscreen)
6. Test Help menu functions (About, Check for Updates)

### 5. File System Access Testing
1. Create a simple diagram
2. Save the diagram using the Save As dialog
3. Verify that the file is saved to the correct location
4. Close the application
5. Reopen the application
6. Use Open dialog to load the saved diagram
7. Verify that the diagram loads correctly

### 6. System Tray Testing
1. Minimize the application to the system tray
2. Verify that the application icon appears in the system tray
3. Click the system tray icon
4. Verify that the application window is restored

### 7. Update System Testing
1. Open the Help menu
2. Select "Check for Updates"
3. Verify that the update dialog appears
4. If an update is available, verify that the update process works correctly

### 8. Cross-Platform Consistency Testing
1. Perform the same tests on all platforms
2. Verify that functionality is consistent across platforms
3. Note any platform-specific differences in behavior

## Expected Results

### Successful Build
- Executable files should be created without compilation errors
- Bundle sizes should be reasonable (typically under 10MB for Tauri apps)

### Successful Installation
- Application should install without errors
- Application should appear in the system's application list
- Desktop shortcuts should be created (if applicable)

### Successful Functionality
- Application should launch and display the main interface
- All menu items should function correctly
- File operations should work as expected
- System tray integration should work
- Update system should function

## Troubleshooting

### Common Issues
1. **Missing dependencies**: Ensure all prerequisites are installed
2. **Permission errors**: On Linux/macOS, ensure execute permissions are set
3. **WebView issues**: On Windows, ensure WebView2 is installed
4. **Path issues**: On Windows, ensure paths with spaces are handled correctly

### Platform-Specific Notes
1. **Windows**: Antivirus software may flag the executable as suspicious during first run
2. **macOS**: Gatekeeper may prevent unsigned apps from running (right-click Open to bypass)
3. **Linux**: May need to chmod +x the AppImage file

## Reporting Issues

When reporting issues, include:
1. Platform and version (Windows 11, macOS 12.0, Ubuntu 20.04, etc.)
2. Application version
3. Steps to reproduce the issue
4. Expected vs actual behavior
5. Screenshots or error messages
6. Log files if available

## Test Completion Criteria

Testing is considered complete when:
1. All platforms build successfully
2. All platforms install successfully
3. All core functionality works on all platforms
4. No critical issues are found
5. Minor issues are documented and prioritized