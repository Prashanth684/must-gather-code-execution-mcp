# Must-Gather MCP Server

Efficient OpenShift must-gather analysis using the Model Context Protocol (MCP) and code execution patterns.

## Overview

This project demonstrates how to apply the **code execution approach** from [Anthropic's MCP article](https://www.anthropic.com/engineering/code-execution-with-mcp) to OpenShift must-gather data analysis.

### The Problem

Traditional AI agent approaches to must-gather analysis are inefficient:
- **539MB** of data across **5,245 files**
- Each tool call passes large YAML/JSON files through the model's context
- Analyzing all namespaces, pods, events, and logs can consume **100K+ tokens**
- Repeatedly requesting the same data wastes context and increases errors

### The Solution

This project provides:
1. **MCP Server** - Exposes must-gather data through 11 specialized tools
2. **Helper Library** - Structured TypeScript API for local data processing
3. **Example Patterns** - Reusable analysis scripts demonstrating code execution

**Result**: Process 539MB locally, return only insights → **98%+ token reduction**

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  AI Agent (Claude)                                  │
│  ├─ Writes analysis code                           │
│  └─ Receives compact results                       │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Code Execution Environment                         │
│  ├─ MustGatherAnalyzer (helper library)            │
│  ├─ Process data locally (no token overhead)       │
│  ├─ Cross-correlate events, logs, resources        │
│  └─ Return only summaries                          │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  MCP Server (optional)                              │
│  ├─ list_namespaces()                              │
│  ├─ get_pods(namespace?)                           │
│  ├─ get_failing_pods()                             │
│  ├─ get_events(namespace?)                         │
│  ├─ get_cluster_operators()                        │
│  └─ ... 6 more tools                               │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Must-Gather Data (539MB)                           │
│  ├─ cluster-scoped-resources/                      │
│  ├─ namespaces/                                    │
│  ├─ etcd_info/                                     │
│  └─ host_service_logs/                             │
└─────────────────────────────────────────────────────┘
```

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/must-gather-mcp.git
cd must-gather-mcp
npm install
npm run build
```

### 2. Obtain Must-Gather Data

Collect must-gather data from your OpenShift cluster:

```bash
oc adm must-gather
```

This creates a directory like `must-gather.local.XXXXX/` containing your cluster diagnostics.

Alternatively, if you already have must-gather data, ensure it follows the standard OpenShift structure:
```
must-gather/
├── quay-io-openshift-release-dev-.../
│   ├── cluster-scoped-resources/
│   ├── namespaces/
│   ├── etcd_info/
│   └── host_service_logs/
└── must-gather.log
```

## Usage

### 1. Helper Library (Direct Usage)

```typescript
import { MustGatherAnalyzer } from './must-gather-lib.js';

const analyzer = new MustGatherAnalyzer({
  basePath: '/path/to/must-gather'
});

// Get cluster health overview
const nodes = analyzer.getNodes();
const operators = analyzer.getClusterOperators();
const degraded = operators.filter(op => op.degraded === 'True');

console.log(`Cluster: ${nodes.length} nodes, ${degraded.length} degraded operators`);
```

### 2. MCP Server

Start the server:

```bash
export MUST_GATHER_PATH=/path/to/must-gather
npm run start
```

Configure in Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "must-gather": {
      "command": "node",
      "args": ["/path/to/must-gather/dist/mcp-server.js"],
      "env": {
        "MUST_GATHER_PATH": "/path/to/must-gather"
      }
    }
  }
}
```

### 3. Analysis Patterns Examples

Run the example diagnostics:

```bash
# Find all failing pods with error messages
npm run example:failing-pods

# Get comprehensive cluster health overview
npm run example:health

# Correlate pod failures with events
npm run example:correlate

# Analyze resource usage by namespace
npm run example:namespaces

# Detect common cluster issues
npm run example:detect

# See MCP code execution examples
npm run example:mcp
```

## Code Execution Examples

### Traditional Approach (Inefficient)

```typescript
// ❌ Each call passes full data through model context
const namespaces = await mustGather.list_namespaces();    // ~2K tokens
const pods = await mustGather.get_pods();                 // ~50K tokens
const events = await mustGather.get_events();             // ~30K tokens
const logs = await mustGather.get_pod_logs(ns, pod);      // ~20K tokens
// Total: ~102K tokens just to gather data!
```

### Code Execution Approach (Efficient)

```typescript
// ✅ Process locally, return only insights
const namespaces = await mustGather.list_namespaces();
const issues = [];

for (const ns of namespaces) {
  const pods = await mustGather.get_pods({ namespace: ns });
  const failing = pods.filter(p => p.status !== 'Running');

  for (const pod of failing) {
    const logs = await mustGather.get_pod_logs({ namespace: ns, pod: pod.name });
    const lastError = logs?.split('\n').filter(l => /ERROR/.test(l)).slice(-1);

    issues.push({
      pod: `${ns}/${pod.name}`,
      error: lastError
    });
  }
}

return { summary: `${issues.length} failing pods`, issues };
// Total: ~2K tokens for complete analysis!
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_namespaces` | List all namespaces |
| `get_nodes` | Get node status and conditions |
| `get_pods` | Get pods (optionally filtered by namespace) |
| `get_failing_pods` | Get only failing/crashed pods |
| `get_pod_logs` | Get logs for a specific pod |
| `get_events` | Get cluster events |
| `get_warning_events` | Get only warning/error events |
| `get_etcd_health` | Get etcd cluster health |
| `get_etcd_status` | Get detailed etcd status |
| `get_cluster_operators` | Get all cluster operators |
| `get_degraded_operators` | Get only degraded operators |

## Helper Library API

```typescript
class MustGatherAnalyzer {
  // Namespace operations
  listNamespaces(): string[]

  // Node operations
  getNodes(): Node[]

  // Pod operations
  getPods(namespace?: string): Pod[]
  getFailingPods(): Pod[]
  getPodLogs(namespace: string, podName: string, container?: string): string | null

  // Event operations
  getEvents(namespace?: string): Event[]
  getWarningEvents(): Event[]

  // Cluster health
  getEtcdHealth(): EtcdHealth[]
  getEtcdStatus(): any
  getClusterOperators(): any[]
  getDegradedOperators(): any[]
}
```

## Example Analysis Patterns

### 1. Find Failing Pods with Errors

```typescript
const failingPods = analyzer.getFailingPods();
const withErrors = failingPods.map(pod => {
  const logs = analyzer.getPodLogs(pod.namespace, pod.name);
  const errors = logs?.split('\n').filter(l => /ERROR|FATAL/.test(l)).slice(-3);
  return { pod: `${pod.namespace}/${pod.name}`, errors };
});
```

### 2. Cluster Health Overview

```typescript
const nodes = analyzer.getNodes();
const operators = analyzer.getDegradedOperators();
const etcd = analyzer.getEtcdHealth().filter(e => !e.health);

return {
  health: etcd.length === 0 && operators.length === 0 ? 'Healthy' : 'Degraded',
  issues: { nodes: nodes.length, degraded: operators.length, etcd: etcd.length }
};
```

### 3. Correlate Pod Failures with Events

```typescript
const failingPods = analyzer.getFailingPods();
const allEvents = analyzer.getEvents();

const correlations = failingPods.map(pod => {
  const relatedEvents = allEvents.filter(e =>
    e.namespace === pod.namespace && e.involvedObject.name === pod.name
  );
  return { pod: pod.name, eventCount: relatedEvents.length };
});
```

## Benefits

1. **Token Efficiency**: Process 539MB locally, return only insights (~98% reduction)
2. **Complex Queries**: Cross-reference events, logs, resources without round-trips
3. **Privacy**: Sensitive cluster data stays in execution environment
4. **Reusable**: Build libraries of common diagnostic patterns
5. **Progressive**: Load only the data you need when you need it

## Must-Gather Data Structure

This tool works with standard OpenShift must-gather output:

```
must-gather/
├── quay-io-openshift-release-dev-.../
│   ├── cluster-scoped-resources/
│   │   ├── core/nodes/
│   │   ├── config.openshift.io/clusteroperators/
│   │   └── ...
│   ├── namespaces/
│   │   ├── default/
│   │   ├── kube-system/
│   │   └── openshift-*/
│   ├── etcd_info/
│   │   ├── endpoint_health.json
│   │   └── endpoint_status.json
│   └── host_service_logs/
└── must-gather.log
```

## License

MIT

## Related

- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenShift Must-Gather](https://docs.openshift.com/container-platform/latest/support/gathering-cluster-data.html)
