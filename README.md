# Must-Gather Progressive Disclosure MCP Server

Efficient OpenShift must-gather analysis using [Anthropic's progressive disclosure pattern](https://www.anthropic.com/engineering/code-execution-with-mcp) for the Model Context Protocol (MCP).

## Overview

This project implements **progressive disclosure** - a pattern that reduces AI context overhead by 92% while enabling unlimited scalability. Instead of loading all analysis tools upfront, agents discover capabilities on-demand through intelligent search.

### The Evolution

**Traditional MCP** (v1.0):
- ❌ 11 tools exposed directly
- ❌ ~6,000 tokens just for tool definitions
- ❌ Difficult to scale beyond 20-30 tools
- ✅ Code execution pattern (local data processing)

**Progressive Disclosure** (v2.0 - this version):
- ✅ **2 meta-tools** for discovery
- ✅ **~500 tokens** for tool definitions (92% reduction!)
- ✅ **Scales to 100+ methods** with no context penalty
- ✅ **Intelligent search** by component, severity, keyword
- ✅ **On-demand type exploration**
- ✅ Code execution pattern (local data processing)

### The Problem

Traditional AI agents struggle with must-gather analysis:
- **539MB** of data across **5,245 files**
- Loading all tools consumes precious context
- Agents must know exact tool names in advance
- Can't scale to comprehensive analysis capabilities

### The Solution

**Progressive Disclosure** + **Code Execution**:

1. **Discover** - Search for analysis methods by intent (severity, component, keyword)
2. **Explore** - Get type definitions on-demand
3. **Execute** - Write code that processes data locally
4. **Summarize** - Return only insights, not raw data

**Result**: 98%+ token reduction, unlimited scalability, better agent experience

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  AI Agent (Claude)                                  │
│  ├─ Searches for methods: "degraded operators"     │
│  ├─ Gets type definitions: ClusterOperator         │
│  ├─ Writes analysis code                           │
│  └─ Receives compact results                       │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Progressive Disclosure Layer (2 Meta-Tools)        │
│  ├─ mustGather_searchAnalysis()                    │
│  │  → Returns: method signatures, examples         │
│  │  → Tokens: ~200 per search                      │
│  │                                                  │
│  └─ mustGather_getTypeDefinition()                 │
│     → Returns: TypeScript interfaces               │
│     → Tokens: ~150 per type lookup                 │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Analysis Method Index (11+ methods)                │
│  ├─ getDegradedOperators()                         │
│  ├─ getFailingPods()                               │
│  ├─ getEtcdHealth()                                │
│  └─ ... 8 more (easily extensible to 100+)        │
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
git clone https://github.com/Prshanth684/must-gather-code-execution-mcp.git
cd must-gather-code-execution-mcp
npm install
npm run build
```

### 2. Obtain Must-Gather Data

Collect must-gather data from your OpenShift cluster:

```bash
oc adm must-gather
```

This creates a directory like `must-gather.local.XXXXX/` containing your cluster diagnostics.

## Usage

### MCP Server (Recommended)

Start the progressive disclosure MCP server:

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
      "args": ["/absolute/path/to/must-gather-code-execution-mcp/dist/mcp-server.js"],
      "env": {
        "MUST_GATHER_PATH": "/absolute/path/to/must-gather.local.xxxxx"
      }
    }
  }
}
```

### Progressive Disclosure Workflow

**Example Agent Interaction:**

```
User: "What's wrong with my cluster?"

Agent thinks: "I need to discover critical cluster health methods"

Step 1: SEARCH FOR METHODS
→ Uses: mustGather_searchAnalysis({ severity: "critical", scope: "cluster" })
→ Returns:
  - getDegradedOperators(): ClusterOperator[]
  - getEtcdHealth(): EtcdHealth[]
  - usage: "CODE EXECUTION PATTERN: (1) READ library resource, (2) WRITE script, (3) EXECUTE with tsx"
→ Tokens: ~200

Step 2: READ LIBRARY RESOURCE
→ Uses: ReadMcpResourceTool({ server: "must-gather", uri: "file:///must-gather-lib.ts" })
→ Returns: Complete TypeScript library code
→ Tokens: ~1,500 (one-time cost)

Step 3: WRITE ANALYSIS SCRIPT
→ Agent writes must-gather-lib.ts to current directory (from resource)
→ Agent writes analysis script (e.g., analyze-cluster.ts):
  import { MustGatherAnalyzer } from './must-gather-lib.js';
  const analyzer = new MustGatherAnalyzer({ basePath: '/path' });

  const degraded = analyzer.getDegradedOperators();
  const etcd = analyzer.getEtcdHealth().filter(e => !e.health);

  console.log({
    status: degraded.length === 0 && etcd.length === 0 ? 'Healthy' : 'Degraded',
    issues: {
      degradedOperators: degraded.length,
      unhealthyEtcd: etcd.length
    }
  });
→ Tokens: ~100

Step 4: EXECUTE ANALYSIS
→ Uses: Bash({ command: "tsx analyze-cluster.ts" })
→ Returns: Only the concise result object
→ Tokens: ~50

Total: ~1,850 tokens first time, ~350 tokens subsequent (vs ~11,000 with traditional approach!)
```

**Key Insight**: The library resource is read once and reused for all subsequent analyses, making this extremely efficient for multi-step investigations.

### Code Execution Pattern Explained

The MCP server uses **embedded instructions** in tool descriptions to guide AI agents through the code execution workflow:

1. **Tool Description Instructions**: The `mustGather_searchAnalysis` tool description explicitly tells the agent to:
   - Search for methods first
   - READ the library resource (uri: file:///must-gather-lib.ts)
   - WRITE a TypeScript script that imports from ./must-gather-lib.js
   - EXECUTE the script with tsx

2. **Result Usage Instructions**: When methods are discovered, the response includes a `usage` field with step-by-step instructions:
   ```
   CODE EXECUTION PATTERN:
   1. READ the library: Use ReadMcpResourceTool with server="must-gather" and uri="file:///must-gather-lib.ts"
   2. WRITE a TypeScript script in the current directory
   3. EXECUTE with: tsx your-script.ts
   ```

3. **Resource Description Instructions**: The library resource description tells agents to:
   - READ the resource content
   - WRITE it to ./must-gather-lib.ts
   - Import from it in analysis scripts

This approach embeds execution instructions directly in tool descriptions to guide LLMs through complex workflows.

## Available Meta-Tools

### 1. `mustGather_searchAnalysis`

Search for analysis methods by component, severity, scope, category, or keyword.

**Parameters:**
- `component` (optional): "etcd", "operators", "pods", "nodes", "events", "namespaces"
- `severity` (optional): "critical", "warning", "info"
- `scope` (optional): "cluster", "namespace", "pod", "node", "container"
- `category` (optional): "health", "performance", "configuration", "logs"
- `keyword` (optional): Free text search (e.g., "degraded", "failing", "error")
- `limit` (optional): Max results (default 10, max 50)

**Returns:**
```typescript
{
  summary: string,
  totalMethods: number,
  methods: [{
    name: string,
    signature: string,
    description: string,
    component: string,
    severity: string,
    scope: string,
    category: string,
    parameters: Parameter[],
    returns: string,
    example: string  // TypeScript code example
  }],
  usage: string  // How to import and use
}
```

**Examples:**

```typescript
// Find critical cluster health methods
searchAnalysis({ severity: "critical", scope: "cluster" })
→ Returns: getDegradedOperators, getEtcdHealth

// Find pod-related methods
searchAnalysis({ component: "pods" })
→ Returns: getPods, getFailingPods, getPodLogs

// Find methods by keyword
searchAnalysis({ keyword: "degraded" })
→ Returns: getDegradedOperators (exact match)

// Find all log-related methods
searchAnalysis({ category: "logs" })
→ Returns: getPodLogs
```

### 2. `mustGather_getTypeDefinition`

Get TypeScript type definitions for must-gather data structures.

**Parameters:**
- `typeNames` (required): Array of type names
- `depth` (optional): How deep to expand nested types (default 1, max 3)
- `includeExamples` (optional): Include example values

**Available Types:**
- `Node` - Cluster node information
- `Pod` - Pod details
- `Container` - Container information
- `Event` - Kubernetes events
- `EtcdHealth` - Etcd health status
- `ClusterOperator` - OpenShift operator status
- `Condition` - Standard Kubernetes condition
- `MustGatherAnalyzer` - Helper library API

**Returns:**
```typescript
{
  types: [{
    name: string,
    definition: string,  // TypeScript interface
    source: string,      // Source location
    examples?: any       // Sample data (if requested)
  }],
  availableTypes: string[]
}
```

**Examples:**

```typescript
// Get Pod type definition
getTypeDefinition({ typeNames: ["Pod"] })

// Get multiple types with nested expansion
getTypeDefinition({
  typeNames: ["Pod", "ClusterOperator"],
  depth: 2
})

// Get types with examples
getTypeDefinition({
  typeNames: ["Node"],
  includeExamples: true
})
```

## Helper Library API

The `MustGatherAnalyzer` class provides programmatic access to must-gather data:

```typescript
class MustGatherAnalyzer {
  constructor(config: { basePath: string, dataDir?: string });

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
  getClusterOperators(): ClusterOperator[]
  getDegradedOperators(): ClusterOperator[]
}
```

All 11 methods are indexed and discoverable via `searchAnalysis`.

## Examples

### Run Progressive Disclosure Demo

```bash
npm run example:progressive-disclosure
```

This demonstrates:
1. Searching for methods by severity and scope
2. Getting type definitions on-demand
3. Keyword-based search
4. Component-specific search
5. Token usage comparison

### Traditional Analysis Examples

```bash
# Find failing pods with errors
npm run example:failing-pods

# Comprehensive cluster health
npm run example:health

# Correlate pod failures with events
npm run example:correlate
```

## Progressive Disclosure Benefits

### Token Efficiency

| Approach | Initial Load | Per Query | Total (10 queries) |
|----------|--------------|-----------|-------------------|
| **Traditional (11 tools)** | 6,000 | 500 | 11,000 |
| **Traditional (50 tools)** | 30,000 | 1,000 | 40,000 |
| **Progressive Disclosure** | **500** | **200** | **2,500** |
| **Reduction** | **92%** | **60%** | **77%** |

### Scalability

- **Traditional**: Each new tool adds ~500 tokens to initial context
- **Progressive Disclosure**: Each new method adds 0 tokens to initial context
- **Result**: Can add 100+ methods with no penalty

### Better Agent Experience

**Traditional:**
```
Agent: Uses get_degraded_operators()
       ↑ Must know exact name
```

**Progressive Disclosure:**
```
Agent: Searches for "degraded"
       ↓ Discovers getDegradedOperators()
       ↓ Sees example usage
       ↓ Executes with confidence
```

### Discovery Examples

```typescript
// Intent-based discovery
"find broken components" → getDegradedOperators
"failing pods" → getFailingPods
"etcd problems" → getEtcdHealth

// Component exploration
component: "operators" → getClusterOperators, getDegradedOperators
component: "pods" → getPods, getFailingPods, getPodLogs

// Severity filtering
severity: "critical" → getDegradedOperators, getEtcdHealth
severity: "warning" → getFailingPods, getWarningEvents
```

## Architecture Details

### Method Index

All analysis methods are indexed in `src/analysis/methodIndex.ts`:

```typescript
export interface AnalysisMethod {
  name: string;           // Method name
  signature: string;      // TypeScript signature
  description: string;    // What it does
  component: string;      // "etcd", "operators", "pods", etc.
  severity: string;       // "critical", "warning", "info"
  scope: string;          // "cluster", "namespace", "pod", etc.
  category: string;       // "health", "logs", etc.
  parameters: Parameter[];
  returns: string;
  example: string;        // TypeScript code example
  keywords: string[];     // For search
}
```

### Search Algorithm

Located in `src/analysis/search.ts`:

1. **Filter** by exact component, severity, scope, category
2. **Score** by keyword matches:
   - Exact name match: 100 points
   - Name contains keyword: 80 points
   - Keyword array match: 20 points each
   - Description match: 10 points
3. **Rank** by score (highest first)
4. **Limit** results (default 10, max 50)

### Type Generator

Located in `src/codegen/typeGenerator.ts`:

- Generates TypeScript interfaces from library code
- Supports nested type expansion (configurable depth)
- Optional example values
- Circular reference prevention

## Adding New Analysis Methods

Progressive disclosure makes it trivial to add new capabilities:

### Step 1: Add Method to Library

```typescript
// must-gather-lib.ts
export class MustGatherAnalyzer {
  getNetworkPolicies(namespace?: string): NetworkPolicy[] {
    // Implementation
  }
}
```

### Step 2: Index the Method

```typescript
// src/analysis/methodIndex.ts
{
  name: 'getNetworkPolicies',
  signature: 'getNetworkPolicies(namespace?: string): NetworkPolicy[]',
  description: 'Get network policies from a namespace or all namespaces',
  component: 'networking',
  severity: 'info',
  scope: 'namespace',
  category: 'configuration',
  parameters: [
    { name: 'namespace', type: 'string', optional: true }
  ],
  returns: 'NetworkPolicy[]',
  example: `const policies = analyzer.getNetworkPolicies('default');`,
  keywords: ['network', 'policy', 'firewall', 'security', 'ingress', 'egress']
}
```

### Step 3: Done!

- Method is automatically discoverable
- Searchable by component: "networking"
- Searchable by keyword: "network", "policy", "security"
- No MCP server changes needed
- No context overhead

## Progressive Disclosure Implementation

This implementation uses the progressive disclosure pattern for must-gather analysis:

| Aspect | Details |
|--------|---------|
| **Pattern** | Progressive Disclosure |
| **Meta-Tools** | 2 (searchAnalysis, getTypeDefinition) |
| **Domain** | Must-gather snapshots |
| **Data Source** | YAML/JSON files |
| **Methods** | 11+ analysis methods (extensible) |
| **Token Reduction** | 92% (initial), 77% (total) |
| **Discovery** | By component, severity, keyword |

## Migration from v1.0

### Breaking Changes

**v1.0** exposed 11 direct tools:
- `list_namespaces()`
- `get_nodes()`
- `get_pods(namespace?)`
- ... 8 more

**v2.0** exposes 2 meta-tools:
- `mustGather_searchAnalysis(...)`
- `mustGather_getTypeDefinition(...)`

### Migration Path

**Before (v1.0):**
```typescript
// Agent directly calls tool
const pods = await get_pods({ namespace: 'default' });
```

**After (v2.0):**
```typescript
// Agent discovers method
const methods = await searchAnalysis({ component: 'pods' });
// → finds getPods

// Agent writes code
import { MustGatherAnalyzer } from './must-gather-lib.js';
const analyzer = new MustGatherAnalyzer({ basePath: '/path' });
const pods = analyzer.getPods('default');
```

**Benefits:**
- Agents learn to discover capabilities
- Better for complex multi-step analysis
- Scales to many more methods

**Note:** v1.0 server saved as `mcp-server.traditional.ts` for reference.

## Performance

- **Initial context**: ~500 tokens (vs ~6,000 traditional)
- **Search query**: ~200 tokens per search
- **Type lookup**: ~150 tokens per type
- **Total workflow**: ~2,500 tokens for 10 queries (vs ~11,000 traditional)

## Contributing

To add new analysis methods:
1. Add implementation to `must-gather-lib.ts`
2. Add index entry to `src/analysis/methodIndex.ts`
3. Add type definition to `src/codegen/typeGenerator.ts` (if new type)
4. Build and test: `npm run build && npm run example:progressive-disclosure`

## License

MIT

## Related

- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenShift Must-Gather](https://docs.openshift.com/container-platform/latest/support/gathering-cluster-data.html)

## Citation

If you use this pattern in your work, please cite:

```bibtex
@software{must_gather_progressive_disclosure,
  title = {Must-Gather Progressive Disclosure MCP Server},
  author = {Prashanth Sundararaman},
  year = {2025},
  url = {https://github.com/Prshanth684/must-gather-code-execution-mcp},
  note = {Based on Anthropic's progressive disclosure pattern for MCP}
}
```
