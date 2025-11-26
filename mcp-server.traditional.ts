/**
 * MCP Server for Must-Gather Analysis
 *
 * Exposes OpenShift must-gather data through the Model Context Protocol.
 * Enables efficient code execution patterns for cluster diagnostics.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { MustGatherAnalyzer } from './must-gather-lib.js';

// Initialize the must-gather analyzer
const MUST_GATHER_PATH = process.env.MUST_GATHER_PATH || process.cwd();
const analyzer = new MustGatherAnalyzer({ basePath: MUST_GATHER_PATH });

// Define available tools
const TOOLS: Tool[] = [
  {
    name: 'list_namespaces',
    description: 'List all namespaces in the cluster',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_nodes',
    description: 'Get all nodes with their status, roles, and conditions',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_pods',
    description: 'Get pods from a specific namespace or all namespaces',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Namespace to query (optional, returns all if not specified)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_failing_pods',
    description: 'Get all pods that are failing, crashed, or have restarting containers',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_pod_logs',
    description: 'Get logs for a specific pod',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Namespace of the pod'
        },
        pod: {
          type: 'string',
          description: 'Name of the pod'
        },
        container: {
          type: 'string',
          description: 'Container name (optional, returns first container if not specified)'
        }
      },
      required: ['namespace', 'pod']
    }
  },
  {
    name: 'get_events',
    description: 'Get cluster events from a specific namespace or all namespaces',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Namespace to query (optional, returns all if not specified)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_warning_events',
    description: 'Get only warning and error events from the cluster',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_etcd_health',
    description: 'Get etcd cluster health status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_etcd_status',
    description: 'Get detailed etcd endpoint status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_cluster_operators',
    description: 'Get all cluster operators with their availability and degradation status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_degraded_operators',
    description: 'Get only degraded or unavailable cluster operators',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'must-gather-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'list_namespaces':
        result = analyzer.listNamespaces();
        break;

      case 'get_nodes':
        result = analyzer.getNodes();
        break;

      case 'get_pods':
        result = analyzer.getPods(args?.namespace as string | undefined);
        break;

      case 'get_failing_pods':
        result = analyzer.getFailingPods();
        break;

      case 'get_pod_logs':
        if (!args?.namespace || !args?.pod) {
          throw new Error('namespace and pod are required');
        }
        result = analyzer.getPodLogs(
          args.namespace as string,
          args.pod as string,
          args.container as string | undefined
        );
        break;

      case 'get_events':
        result = analyzer.getEvents(args?.namespace as string | undefined);
        break;

      case 'get_warning_events':
        result = analyzer.getWarningEvents();
        break;

      case 'get_etcd_health':
        result = analyzer.getEtcdHealth();
        break;

      case 'get_etcd_status':
        result = analyzer.getEtcdStatus();
        break;

      case 'get_cluster_operators':
        result = analyzer.getClusterOperators();
        break;

      case 'get_degraded_operators':
        result = analyzer.getDegradedOperators();
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Must-Gather MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
