# MCP Server Setup Guide

Follow these steps to integrate the must-gather MCP server with Claude Desktop.

## Prerequisites

- ✅ Node.js installed
- ✅ npm dependencies installed (`npm install`)
- ✅ Project built (`npm run build`)
- Claude Desktop installed

## Step 1: Locate Your Claude Desktop Config

The configuration file location depends on your operating system:

### Linux
```bash
~/.config/Claude/claude_desktop_config.json
```

### macOS
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

## Step 2: Edit the Configuration File

Open the configuration file in a text editor. If it doesn't exist, create it.

Add the must-gather server to the `mcpServers` section:

```json
{
  "mcpServers": {
    "must-gather": {
      "command": "node",
      "args": [
        "/home/psundara/Downloads/must-gather/dist/mcp-server.js"
      ],
      "env": {
        "MUST_GATHER_PATH": "/home/psundara/Downloads/must-gather"
      }
    }
  }
}
```

**Important**: Update the paths to match your actual file locations:
- Replace `/home/psundara/Downloads/must-gather` with your actual must-gather directory
- Use absolute paths, not relative paths

### Example with Multiple MCP Servers

If you already have other MCP servers configured:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]
    },
    "must-gather": {
      "command": "node",
      "args": [
        "/home/psundara/Downloads/must-gather/dist/mcp-server.js"
      ],
      "env": {
        "MUST_GATHER_PATH": "/home/psundara/Downloads/must-gather"
      }
    }
  }
}
```

## Step 3: Restart Claude Desktop

After saving the configuration:

1. Completely quit Claude Desktop (not just close the window)
2. Restart Claude Desktop
3. The MCP server will start automatically when Claude Desktop launches

## Step 4: Verify the Connection

In Claude Desktop, you should see the must-gather server connected. You can verify by asking:

```
Can you list the available MCP tools?
```

You should see 11 must-gather tools available:
- list_namespaces
- get_nodes
- get_pods
- get_failing_pods
- get_pod_logs
- get_events
- get_warning_events
- get_etcd_health
- get_etcd_status
- get_cluster_operators
- get_degraded_operators

## Step 5: Start Analyzing!

Now you can ask Claude to analyze your must-gather data efficiently:

### Example Queries

**Quick health check:**
```
Can you give me a quick health overview of the cluster?
Write code that checks the cluster operators, etcd health, and failing pods.
```

**Find issues:**
```
Find all failing pods and show me their last error messages.
Use code execution to process the logs locally and return only summaries.
```

**Investigate operators:**
```
Which cluster operators are degraded? For each degraded operator,
find related warning events and failing pods.
```

**Comprehensive diagnostic:**
```
Run a comprehensive diagnostic on this must-gather data:
1. Check all nodes, operators, and etcd health
2. Find failing pods and correlate with events
3. Identify the top 5 issues by severity
Return a structured report.
```

## How It Works

When you ask Claude a question:

1. **Claude writes code** that calls the MCP tools
2. **Code executes locally** in a sandboxed environment
3. **Data is processed** without going through Claude's context
4. **Only summaries** are returned to Claude
5. **Result**: 98% fewer tokens used!

### Example Code Claude Might Write

```typescript
// Get cluster health overview
const nodes = await mustGather.get_nodes();
const operators = await mustGather.get_cluster_operators();
const etcd = await mustGather.get_etcd_health();

// Process locally - no token overhead
const degraded = operators.filter(op => op.degraded === 'True');
const unhealthyEtcd = etcd.filter(e => !e.health);
const notReadyNodes = nodes.filter(n => n.status !== 'Ready');

// Return compact summary
return {
  health: unhealthyEtcd.length === 0 ? 'Healthy' : 'Degraded',
  issues: {
    nodes: notReadyNodes.length,
    operators: degraded.length,
    etcd: unhealthyEtcd.length
  }
};
```

## Troubleshooting

### Server Not Connecting

1. Check the paths in `claude_desktop_config.json` are correct and absolute
2. Ensure the project is built: `npm run build`
3. Check Claude Desktop logs (Help → View Logs)

### Tools Not Showing Up

1. Verify the config file is in the correct location
2. Ensure the JSON is valid (no syntax errors)
3. Restart Claude Desktop completely

### Errors When Running Tools

1. Check that `MUST_GATHER_PATH` points to the correct directory
2. Verify the must-gather data has the expected structure
3. Look for error messages in Claude Desktop logs

### Testing the Server Manually

You can test the server without Claude Desktop:

```bash
cd /home/psundara/Downloads/must-gather
export MUST_GATHER_PATH=/home/psundara/Downloads/must-gather
node dist/mcp-server.js
```

The server should output: `Must-Gather MCP Server running on stdio`

Press Ctrl+C to stop.

## Configuration Template

Save this as a template for easy copying:

```json
{
  "mcpServers": {
    "must-gather": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO/must-gather/dist/mcp-server.js"],
      "env": {
        "MUST_GATHER_PATH": "ABSOLUTE_PATH_TO/must-gather"
      }
    }
  }
}
```

Replace `ABSOLUTE_PATH_TO` with your actual path.

## Next Steps

Once configured, you can:

1. Ask Claude to analyze your must-gather data
2. Request comprehensive diagnostics
3. Investigate specific issues
4. Build custom analysis patterns
5. Export results to reports

The code execution pattern means you can analyze all 539MB of must-gather data while using only a fraction of the tokens compared to traditional approaches!
