#!/bin/bash
# Next.js Server Launcher for Unix

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
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
