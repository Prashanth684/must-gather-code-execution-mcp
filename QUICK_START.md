# Quick Start Guide

This guide will help you set up and test the Must-Gather MCP Server.

## Prerequisites

✅ Node.js installed
✅ npm installed
✅ Must-gather data available
✅ Claude Desktop installed (for full integration)

## Step 1: Build the Server

```bash
cd /path/to/must-gather-code-execution-mcp
npm install
npm run build
```

**Expected output:**
```
> must-gather-mcp-server@2.0.0 build
> tsc
```

## Step 2: Test the Server Manually

### Option A: Using the test script

```bash
./test-mcp-server.sh
```

### Option B: Manual test

```bash
export MUST_GATHER_PATH="/path/to/must-gather"
node dist/mcp-server.js
```

**Expected output:**
```
Must-Gather Progressive Disclosure MCP Server running
Must-gather path: /path/to/must-gather
Pattern: Progressive Disclosure (2 meta-tools)
```

Press `Ctrl+C` to stop the server.

## Step 3: Set Up Claude Desktop Integration

### Find your Claude Desktop config file

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### Edit the configuration

Open the file and add the MCP server:

```json
{
  "mcpServers": {
    "must-gather": {
      "command": "node",
      "args": [
        "/path/to/must-gather-code-execution-mcp/dist/mcp-server.js"
      ],
      "env": {
        "MUST_GATHER_PATH": "/path/to/must-gather"
      }
    }
  }
}
```

### Restart Claude Desktop

1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. The MCP server will start automatically

## Step 4: Verify in Claude Desktop

In Claude Desktop, you can verify the connection by asking:

```
What MCP tools are available?
```

You should see:
- `mustGather_searchAnalysis` - Search for analysis methods
- `mustGather_getTypeDefinition` - Get TypeScript type definitions

## Step 5: Try Some Queries

### Example 1: Quick health check
```
What's wrong with my cluster? Check the critical health issues.
```

### Example 2: Find failing pods
```
Find all failing pods and show me their errors.
```

### Example 3: Check operators
```
Which cluster operators are degraded?
```

### Example 4: Comprehensive analysis
```
Run a comprehensive diagnostic:
1. Check cluster operators and etcd health
2. Find failing pods
3. Show the top 5 issues
```

## How the Progressive Disclosure Pattern Works

When you ask a question, Claude will:

1. **Search for methods** using `mustGather_searchAnalysis`
   ```
   Example: { severity: "critical", scope: "cluster" }
   → Finds: getDegradedOperators, getEtcdHealth
   ```

2. **Read the library** resource from the MCP server
   ```
   ReadMcpResourceTool({ server: "must-gather", uri: "file:///must-gather-lib.ts" })
   ```

3. **Write a TypeScript script**
   ```typescript
   import { MustGatherAnalyzer } from './must-gather-lib.js';
   const analyzer = new MustGatherAnalyzer({
     basePath: '/path/to/must-gather'
   });

   const degraded = analyzer.getDegradedOperators();
   console.log(JSON.stringify({ degradedCount: degraded.length }));
   ```

4. **Execute the script** with tsx
   ```
   tsx analyze.ts
   ```

5. **Return only the results** (not all the raw data)

## Testing the Progressive Disclosure Pattern

You can test the pattern locally with the demo:

```bash
npm run example:progressive-disclosure
```

This demonstrates:
- Searching for methods by severity and scope
- Getting type definitions on-demand
- Keyword-based search
- Token usage comparison

## Troubleshooting

### Server won't start

**Check the paths:**
```bash
ls -la dist/mcp-server.js
ls -la /path/to/must-gather
```

**Rebuild if needed:**
```bash
npm run build
```

### Claude Desktop doesn't see the tools

1. Check the config file location:
   ```bash
   cat ~/.config/Claude/claude_desktop_config.json
   ```

2. Verify JSON syntax (use a JSON validator)

3. Check Claude Desktop logs:
   - Help → View Logs
   - Look for MCP server connection errors

### No must-gather data found

The server expects a directory structure like:
```
must-gather/
└── quay-io-openshift-release-dev-xxxx/
    ├── cluster-scoped-resources/
    ├── namespaces/
    ├── etcd_info/
    └── host_service_logs/
```

If your must-gather is a tar file, extract it first:
```bash
cd ~/Downloads
tar -xf must-gather.tar
```

## Available Analysis Methods

The server provides 11+ analysis methods:

| Method | Description | Severity |
|--------|-------------|----------|
| `listNamespaces()` | List all namespaces | info |
| `getNodes()` | Get all nodes with status | info |
| `getPods(namespace?)` | Get pods from namespace(s) | info |
| `getFailingPods()` | Get failing/crashed pods | warning |
| `getPodLogs(ns, pod, container?)` | Get pod logs | info |
| `getEvents(namespace?)` | Get cluster events | info |
| `getWarningEvents()` | Get warning/error events | warning |
| `getEtcdHealth()` | Get etcd health status | critical |
| `getEtcdStatus()` | Get etcd endpoint status | info |
| `getClusterOperators()` | Get all cluster operators | info |
| `getDegradedOperators()` | Get degraded operators | critical |

All methods are discoverable through `mustGather_searchAnalysis`!

## Next Steps

- Try different search queries to discover methods
- Experiment with complex multi-step analyses
- Check the `examples/` directory for more patterns
- Read the full README.md for architecture details

## Support

- Documentation: README.md and SETUP_GUIDE.md
- Examples: `npm run example:progressive-disclosure`
- Issues: https://github.com/Prshanth684/must-gather-code-execution-mcp/issues
