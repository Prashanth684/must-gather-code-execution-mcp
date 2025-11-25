#!/bin/bash

# Test script for must-gather MCP server

echo "Testing must-gather MCP server..."
echo ""

# Check if built
if [ ! -f "dist/mcp-server.js" ]; then
    echo "❌ Server not built. Run: npm run build"
    exit 1
fi

echo "✅ Server built successfully"

# Check if must-gather data exists
MUST_GATHER_DIR="${MUST_GATHER_PATH:-$(pwd)}"
if [ ! -d "$MUST_GATHER_DIR" ]; then
    echo "❌ Must-gather directory not found: $MUST_GATHER_DIR"
    exit 1
fi

echo "✅ Must-gather directory found: $MUST_GATHER_DIR"

# Find the data directory
DATA_DIR=$(find "$MUST_GATHER_DIR" -maxdepth 1 -type d -name "quay-io-*" | head -1)
if [ -z "$DATA_DIR" ]; then
    echo "❌ No quay-io data directory found in must-gather"
    exit 1
fi

echo "✅ Data directory found: $(basename $DATA_DIR)"

# Check for key files
if [ -f "$DATA_DIR/etcd_info/endpoint_health.json" ]; then
    echo "✅ etcd_info found"
fi

if [ -d "$DATA_DIR/cluster-scoped-resources" ]; then
    echo "✅ cluster-scoped-resources found"
fi

if [ -d "$DATA_DIR/namespaces" ]; then
    NAMESPACE_COUNT=$(find "$DATA_DIR/namespaces" -maxdepth 1 -type d | wc -l)
    echo "✅ namespaces found: $((NAMESPACE_COUNT - 1)) namespaces"
fi

echo ""
echo "Configuration for Claude Desktop:"
echo "=================================="
echo ""
echo "Add this to your claude_desktop_config.json:"
echo ""
cat << EOF
{
  "mcpServers": {
    "must-gather": {
      "command": "node",
      "args": [
        "$(pwd)/dist/mcp-server.js"
      ],
      "env": {
        "MUST_GATHER_PATH": "$(pwd)"
      }
    }
  }
}
EOF

echo ""
echo ""
echo "Config file location:"
echo "  Linux:   ~/.config/Claude/claude_desktop_config.json"
echo "  macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "After adding the config, restart Claude Desktop!"
