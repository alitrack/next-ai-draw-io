@echo off
REM Next.js Server Launcher for Windows
setlocal

set "SCRIPT_DIR=%~dp0"
set "NODE_EXE=%SCRIPT_DIR%node\node.exe"
set "SERVER_JS=%SCRIPT_DIR%standalone\server.js"

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
