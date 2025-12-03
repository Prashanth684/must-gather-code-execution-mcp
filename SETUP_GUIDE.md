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
        "/absolute/path/to/must-gather-code-execution-mcp/dist/mcp-server.js"
      ],
      "env": {
        "MUST_GATHER_PATH": "/absolute/path/to/must-gather.local.xxxxx"
      }
    }
  }
}
```

**Important**: Update the paths to match your actual file locations:
- Replace `/absolute/path/to/must-gather-code-execution-mcp` with the directory where you cloned this project
- Replace `/absolute/path/to/must-gather.local.xxxxx` with your actual must-gather data directory
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
        "/absolute/path/to/must-gather-code-execution-mcp/dist/mcp-server.js"
      ],
      "env": {
        "MUST_GATHER_PATH": "/absolute/path/to/must-gather.local.xxxxx"
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

You should see 2 progressive disclosure meta-tools:
- `mustGather_searchAnalysis` - Search for analysis methods by component, severity, scope, category, or keyword
- `mustGather_getTypeDefinition` - Get TypeScript type definitions for must-gather data structures

These 2 meta-tools provide access to 11+ analysis methods through progressive discovery, reducing initial context by 92%.

## Step 5: Start Analyzing!

Now you can ask Claude to analyze your must-gather data efficiently:

### Example Queries

**Quick health check:**
```
What's wrong with my cluster? Check the critical health issues.
```

**Find specific issues:**
```
Find all failing pods and correlate them with recent error events.
```

**Investigate operators:**
```
Which cluster operators are degraded? Show me detailed information.
```

**Comprehensive diagnostic:**
```
Run a comprehensive diagnostic on this must-gather data:
1. Check all nodes, operators, and etcd health
2. Find failing pods and correlate with events
3. Identify the top 5 issues by severity
Return a structured report.
```

Claude will use progressive disclosure to:
1. Search for relevant analysis methods
2. Read the must-gather library resource
3. Write TypeScript code to analyze the data locally
4. Execute the code and return concise results

## How It Works

Progressive disclosure + code execution workflow:

1. **Search for methods** - Claude uses `mustGather_searchAnalysis` to find relevant analysis methods by intent
2. **Get type definitions** - Claude uses `mustGather_getTypeDefinition` to understand data structures
3. **Read library resource** - Claude reads the `must-gather-lib.ts` resource to get the analyzer code
4. **Write analysis script** - Claude writes a TypeScript script that imports and uses the discovered methods
5. **Execute locally** - Claude runs the script with tsx to process data locally
6. **Return summaries** - Only concise results are returned, not raw data
7. **Result**: 92% reduction in initial context, 77% fewer tokens overall!

### Example Code Claude Might Write

```typescript
// After discovering getDegradedOperators and getEtcdHealth methods
import { MustGatherAnalyzer } from './must-gather-lib.js';

const analyzer = new MustGatherAnalyzer({
  basePath: '/path/to/must-gather.local.xxxxx'
});

// Process locally - no token overhead
const degraded = analyzer.getDegradedOperators();
const etcd = analyzer.getEtcdHealth();
const unhealthyEtcd = etcd.filter(e => !e.health);

// Return compact summary
console.log(JSON.stringify({
  status: degraded.length === 0 && unhealthyEtcd.length === 0 ? 'Healthy' : 'Degraded',
  issues: {
    degradedOperators: degraded.length,
    unhealthyEtcd: unhealthyEtcd.length
  }
}, null, 2));
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
cd /path/to/must-gather-code-execution-mcp
export MUST_GATHER_PATH=/path/to/must-gather.local.xxxxx
node dist/mcp-server.js
```

The server should output: `Must-Gather Progressive Disclosure MCP Server running`

Press Ctrl+C to stop.

## Configuration Template

Save this as a template for easy copying:

```json
{
  "mcpServers": {
    "must-gather": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO/must-gather-code-execution-mcp/dist/mcp-server.js"],
      "env": {
        "MUST_GATHER_PATH": "ABSOLUTE_PATH_TO/must-gather.local.xxxxx"
      }
    }
  }
}
```

Replace `ABSOLUTE_PATH_TO` with your actual paths.

## Next Steps

Once configured, you can:

1. Ask Claude to analyze your must-gather data
2. Request comprehensive diagnostics
3. Investigate specific issues
4. Build custom analysis patterns
5. Export results to reports

The code execution pattern means you can analyze all 539MB of must-gather data while using only a fraction of the tokens compared to traditional approaches!
