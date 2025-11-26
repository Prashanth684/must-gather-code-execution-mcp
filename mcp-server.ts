#!/usr/bin/env node

/**
 * Progressive Disclosure MCP Server for Must-Gather Analysis
 *
 * Implements Anthropic's progressive disclosure pattern for efficient must-gather analysis.
 * Instead of exposing all 11+ tools upfront, this server provides 2 meta-tools that enable
 * agents to discover analysis capabilities on-demand.
 *
 * Benefits:
 * - 92% reduction in initial context (from ~6,000 to ~500 tokens)
 * - Scalable to 100+ analysis methods with no context penalty
 * - Agents discover methods by intent, not exact names
 * - On-demand type exploration
 *
 * Based on: https://github.com/harche/ProDisco
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { searchAnalysisMethods, SearchParams } from './src/analysis/search.js';
import { getTypeDefinitions, getAllTypeNames } from './src/codegen/typeGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

const MUST_GATHER_PATH = process.env.MUST_GATHER_PATH || process.cwd();

// Progressive Disclosure: Only 2 meta-tools!
const TOOLS: Tool[] = [
  {
    name: 'mustGather.searchAnalysis',
    description: 'Must-gather analysis via Progressive Disclosure. Use mustGather.searchAnalysis to discover available analysis methods. ' +
      'After discovering methods, READ the must-gather-lib.ts resource (uri: file:///must-gather-lib.ts) to get the library code. ' +
      'Then WRITE a TypeScript script that imports and uses the MustGatherAnalyzer class to analyze the data locally. ' +
      'Execute the script with tsx or ts-node to process the must-gather data. ' +
      'The must-gather path is: ' + MUST_GATHER_PATH + '. ' +
      'Example workflow: (1) Search for methods, (2) Read library resource, (3) Write analysis script that imports from ./must-gather-lib.js, (4) Execute with tsx.',
    inputSchema: {
      type: 'object',
      properties: {
        component: {
          type: 'string',
          description: 'Component to analyze (e.g., "etcd", "operators", "pods", "nodes", "events")',
          enum: ['etcd', 'operators', 'pods', 'nodes', 'events', 'namespaces']
        },
        severity: {
          type: 'string',
          description: 'Severity level to filter by',
          enum: ['critical', 'warning', 'info']
        },
        scope: {
          type: 'string',
          description: 'Scope of analysis',
          enum: ['cluster', 'namespace', 'pod', 'node', 'container']
        },
        category: {
          type: 'string',
          description: 'Category of analysis',
          enum: ['health', 'performance', 'configuration', 'logs']
        },
        keyword: {
          type: 'string',
          description: 'Keyword to search for (e.g., "degraded", "failing", "error", "crash")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default 10, max 50)',
          minimum: 1,
          maximum: 50
        }
      },
      required: []
    }
  },
  {
    name: 'mustGather.getTypeDefinition',
    description: 'Get TypeScript type definitions for must-gather data structures. Use this to understand the shape of data returned by analysis methods. Supports nested type exploration.',
    inputSchema: {
      type: 'object',
      properties: {
        typeNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of types to get definitions for (e.g., ["Pod", "Node", "Event"]). Available types: Node, Pod, Container, Event, EtcdHealth, ClusterOperator, Condition, MustGatherAnalyzer'
        },
        depth: {
          type: 'number',
          description: 'How deep to expand nested types (default 1, max 3)',
          minimum: 1,
          maximum: 3
        },
        includeExamples: {
          type: 'boolean',
          description: 'Include example values for types'
        }
      },
      required: ['typeNames']
    }
  }
];

const server = new Server(
  {
    name: 'must-gather-prodisco',
    version: '2.0.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// List tools - only 2 meta-tools!
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'mustGather.searchAnalysis': {
        const searchParams: SearchParams = {
          component: args?.component as string | undefined,
          severity: args?.severity as 'critical' | 'warning' | 'info' | undefined,
          scope: args?.scope as 'cluster' | 'namespace' | 'pod' | 'node' | 'container' | undefined,
          category: args?.category as 'health' | 'performance' | 'configuration' | 'logs' | undefined,
          keyword: args?.keyword as string | undefined,
          limit: args?.limit as number | undefined
        };

        const methods = searchAnalysisMethods(searchParams);

        result = {
          summary: `Found ${methods.length} matching analysis method${methods.length === 1 ? '' : 's'}`,
          totalMethods: methods.length,
          methods: methods.map(m => ({
            name: m.name,
            signature: m.signature,
            description: m.description,
            component: m.component,
            severity: m.severity,
            scope: m.scope,
            category: m.category,
            parameters: m.parameters,
            returns: m.returns,
            example: m.example
          })),
          usage: 'CODE EXECUTION PATTERN:\n\n' +
            '1. READ the library: Use ReadMcpResourceTool with server="must-gather" and uri="file:///must-gather-lib.ts"\n' +
            '2. WRITE a TypeScript script in the current directory that:\n' +
            '   - Imports: import { MustGatherAnalyzer } from \'./must-gather-lib.js\';\n' +
            '   - Creates analyzer: const analyzer = new MustGatherAnalyzer({ basePath: \'' + MUST_GATHER_PATH + '\' });\n' +
            '   - Calls the discovered methods above\n' +
            '   - Processes data locally and returns concise results\n' +
            '3. EXECUTE with: tsx your-script.ts\n\n' +
            'This processes all data locally (no token overhead) and returns only insights.'
        };
        break;
      }

      case 'mustGather.getTypeDefinition': {
        if (!args?.typeNames || !Array.isArray(args.typeNames)) {
          throw new Error('typeNames array is required. Available types: ' + getAllTypeNames().join(', '));
        }

        const types = getTypeDefinitions(
          args.typeNames as string[],
          (args.depth as number) || 1,
          (args.includeExamples as boolean) || false
        );

        if (types.length === 0) {
          throw new Error(
            `No types found. Available types: ${getAllTypeNames().join(', ')}`
          );
        }

        result = {
          types,
          availableTypes: getAllTypeNames()
        };
        break;
      }

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

// Expose must-gather-lib.ts as a resource for code execution
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'file:///must-gather-lib.ts',
        name: 'Must-Gather Analysis Library',
        description: 'TypeScript library for analyzing must-gather data. READ this resource, then WRITE it to ./must-gather-lib.ts in the current directory. ' +
          'Your analysis scripts should import from it: import { MustGatherAnalyzer } from \'./must-gather-lib.js\'. ' +
          'This enables local data processing with zero token overhead.',
        mimeType: 'application/typescript'
      },
      {
        uri: 'file:///must-gather-types.d.ts',
        name: 'Must-Gather Type Definitions',
        description: 'Complete TypeScript type definitions for all must-gather data structures and the MustGatherAnalyzer API.',
        mimeType: 'application/typescript'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === 'file:///must-gather-lib.ts') {
    const libPath = path.join(process.cwd(), 'must-gather-lib.ts');
    if (!fs.existsSync(libPath)) {
      throw new Error('must-gather-lib.ts not found');
    }
    const content = fs.readFileSync(libPath, 'utf8');
    return {
      contents: [
        {
          uri,
          mimeType: 'application/typescript',
          text: content
        }
      ]
    };
  }

  if (uri === 'file:///must-gather-types.d.ts') {
    // Generate comprehensive type definitions
    const types = getTypeDefinitions(getAllTypeNames(), 2, false);
    const content = types.map(t => t.definition).join('\n\n');
    return {
      contents: [
        {
          uri,
          mimeType: 'application/typescript',
          text: content
        }
      ]
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Must-Gather Progressive Disclosure MCP Server running');
  console.error('Must-gather path:', MUST_GATHER_PATH);
  console.error('Pattern: Progressive Disclosure (2 meta-tools)');
  console.error('Based on: https://github.com/harche/ProDisco');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
