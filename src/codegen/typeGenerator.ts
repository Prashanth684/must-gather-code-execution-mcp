/**
 * Type Definition Generator
 *
 * Generates TypeScript type definitions for must-gather data structures.
 * Supports on-demand type exploration with configurable depth.
 */

export interface TypeDefinition {
  name: string;
  definition: string;
  source?: string;
  examples?: any;
}

/**
 * Get TypeScript type definitions for specified types
 */
export function getTypeDefinitions(
  typeNames: string[],
  depth: number = 1,
  includeExamples: boolean = false
): TypeDefinition[] {
  const types: TypeDefinition[] = [];
  const processedTypes = new Set<string>();

  for (const typeName of typeNames) {
    addTypeDefinition(typeName, types, processedTypes, depth, includeExamples, 0);
  }

  return types;
}

/**
 * Recursively add type definition and nested types
 */
function addTypeDefinition(
  typeName: string,
  types: TypeDefinition[],
  processedTypes: Set<string>,
  maxDepth: number,
  includeExamples: boolean,
  currentDepth: number
): void {
  // Handle nested type paths like "Pod.status"
  const [baseType, ...path] = typeName.split('.');

  // Avoid duplicate processing
  if (processedTypes.has(baseType)) {
    return;
  }
  processedTypes.add(baseType);

  // Get the type definition
  const typeDef = getTypeDefinition(baseType, includeExamples);
  if (typeDef) {
    types.push(typeDef);

    // Recursively add nested types if within depth limit
    if (currentDepth < maxDepth) {
      const nestedTypes = getNestedTypes(baseType);
      for (const nestedType of nestedTypes) {
        if (!processedTypes.has(nestedType)) {
          addTypeDefinition(
            nestedType,
            types,
            processedTypes,
            maxDepth,
            includeExamples,
            currentDepth + 1
          );
        }
      }
    }
  }
}

/**
 * Get type definition for a specific type
 */
function getTypeDefinition(typeName: string, includeExamples: boolean): TypeDefinition | null {
  switch (typeName) {
    case 'Node':
      return {
        name: 'Node',
        definition: `interface Node {
  name: string;                // Node name (e.g., "master-0", "worker-1")
  status: string;              // "Ready" | "NotReady"
  roles: string[];             // Node roles (e.g., ["master"], ["worker"])
  version: string;             // Kubelet version
  conditions: Condition[];     // Node conditions
}`,
        source: 'must-gather-lib.ts:17',
        examples: includeExamples
          ? {
              name: 'master-0',
              status: 'Ready',
              roles: ['master'],
              version: 'v1.27.6+b49f9d1',
              conditions: []
            }
          : undefined
      };

    case 'Pod':
      return {
        name: 'Pod',
        definition: `interface Pod {
  name: string;                // Pod name
  namespace: string;           // Namespace containing the pod
  status: string;              // Pod phase
  phase: string;               // "Running" | "Pending" | "Failed" | "Succeeded" | "Unknown"
  containers: Container[];     // Container details
  conditions: Condition[];     // Pod conditions
}`,
        source: 'must-gather-lib.ts:25',
        examples: includeExamples
          ? {
              name: 'etcd-master-0',
              namespace: 'openshift-etcd',
              status: 'Running',
              phase: 'Running',
              containers: [],
              conditions: []
            }
          : undefined
      };

    case 'Container':
      return {
        name: 'Container',
        definition: `interface Container {
  name: string;                // Container name
  image: string;               // Container image
  state: string;               // "Running" | "Waiting: <reason>" | "Terminated: <reason>"
  ready: boolean;              // Whether container is ready
  restartCount: number;        // Number of container restarts
}`,
        source: 'must-gather-lib.ts:34',
        examples: includeExamples
          ? {
              name: 'etcd',
              image: 'quay.io/openshift-release-dev/ocp-v4.0-art-dev@sha256:...',
              state: 'Running',
              ready: true,
              restartCount: 0
            }
          : undefined
      };

    case 'Event':
      return {
        name: 'Event',
        definition: `interface Event {
  namespace: string;           // Namespace where event occurred
  type: string;                // "Normal" | "Warning" | "Error"
  reason: string;              // Event reason (e.g., "FailedScheduling", "Unhealthy")
  message: string;             // Human-readable event message
  involvedObject: {
    kind: string;              // Resource kind (e.g., "Pod", "Node", "Deployment")
    name: string;              // Resource name
  };
  timestamp: string;           // ISO 8601 timestamp
  lastTimestamp?: string;      // Last occurrence timestamp
  firstTimestamp?: string;     // First occurrence timestamp
}`,
        source: 'must-gather-lib.ts:42',
        examples: includeExamples
          ? {
              namespace: 'default',
              type: 'Warning',
              reason: 'BackOff',
              message: 'Back-off restarting failed container',
              involvedObject: { kind: 'Pod', name: 'my-pod' },
              timestamp: '2025-11-25T10:30:00Z'
            }
          : undefined
      };

    case 'EtcdHealth':
      return {
        name: 'EtcdHealth',
        definition: `interface EtcdHealth {
  endpoint: string;            // Etcd member endpoint URL
  health: boolean;             // true if healthy, false if unhealthy
  took: string;                // Time taken for health check
  error?: string;              // Error message if unhealthy
}`,
        source: 'must-gather-lib.ts:56',
        examples: includeExamples
          ? {
              endpoint: 'https://10.0.0.1:2379',
              health: true,
              took: '15ms'
            }
          : undefined
      };

    case 'ClusterOperator':
      return {
        name: 'ClusterOperator',
        definition: `interface ClusterOperator {
  name: string;                // Operator name (e.g., "authentication", "kube-apiserver")
  available: string;           // "True" | "False" | "Unknown"
  progressing: string;         // "True" | "False" | "Unknown"
  degraded: string;            // "True" | "False" | "Unknown"
  conditions: Condition[];     // Detailed operator conditions
}`,
        source: 'generated from getClusterOperators()',
        examples: includeExamples
          ? {
              name: 'authentication',
              available: 'True',
              progressing: 'False',
              degraded: 'False',
              conditions: []
            }
          : undefined
      };

    case 'Condition':
      return {
        name: 'Condition',
        definition: `interface Condition {
  type: string;                // Condition type (e.g., "Ready", "Available", "Degraded")
  status: string;              // "True" | "False" | "Unknown"
  reason?: string;             // Machine-readable reason
  message?: string;            // Human-readable message
  lastTransitionTime?: string; // ISO 8601 timestamp of last status change
}`,
        source: 'Kubernetes standard type'
      };

    case 'MustGatherConfig':
      return {
        name: 'MustGatherConfig',
        definition: `interface MustGatherConfig {
  basePath: string;            // Path to must-gather directory
  dataDir?: string;            // Optional override for data directory
}`,
        source: 'must-gather-lib.ts:12'
      };

    case 'MustGatherAnalyzer':
      return {
        name: 'MustGatherAnalyzer',
        definition: `class MustGatherAnalyzer {
  constructor(config: MustGatherConfig);

  // Namespace operations
  listNamespaces(): string[];

  // Node operations
  getNodes(): Node[];

  // Pod operations
  getPods(namespace?: string): Pod[];
  getFailingPods(): Pod[];
  getPodLogs(namespace: string, podName: string, container?: string): string | null;

  // Event operations
  getEvents(namespace?: string): Event[];
  getWarningEvents(): Event[];

  // Cluster health
  getEtcdHealth(): EtcdHealth[];
  getEtcdStatus(): any;
  getClusterOperators(): ClusterOperator[];
  getDegradedOperators(): ClusterOperator[];
}`,
        source: 'must-gather-lib.ts:63',
        examples: includeExamples
          ? `// Usage example:
import { MustGatherAnalyzer } from './must-gather-lib.js';

const analyzer = new MustGatherAnalyzer({
  basePath: '/path/to/must-gather'
});

const degraded = analyzer.getDegradedOperators();`
          : undefined
      };

    default:
      return null;
  }
}

/**
 * Get nested types that should be expanded for a given base type
 */
function getNestedTypes(baseType: string): string[] {
  const nestedTypeMap: Record<string, string[]> = {
    Node: ['Condition'],
    Pod: ['Container', 'Condition'],
    Container: [],
    Event: [],
    EtcdHealth: [],
    ClusterOperator: ['Condition'],
    Condition: [],
    MustGatherConfig: [],
    MustGatherAnalyzer: ['MustGatherConfig', 'Node', 'Pod', 'Event', 'EtcdHealth', 'ClusterOperator']
  };

  return nestedTypeMap[baseType] || [];
}

/**
 * Get a summary of all available types
 */
export function getAllTypeNames(): string[] {
  return [
    'MustGatherAnalyzer',
    'MustGatherConfig',
    'Node',
    'Pod',
    'Container',
    'Event',
    'EtcdHealth',
    'ClusterOperator',
    'Condition'
  ];
}
