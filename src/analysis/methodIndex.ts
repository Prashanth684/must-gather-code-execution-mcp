/**
 * Analysis Method Index
 *
 * Central registry of all available must-gather analysis methods.
 * Used by the progressive disclosure search tool to help agents discover capabilities.
 */

export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface AnalysisMethod {
  name: string;
  signature: string;
  description: string;
  component?: string;
  severity: 'critical' | 'warning' | 'info';
  scope: 'cluster' | 'namespace' | 'pod' | 'node' | 'container';
  category: 'health' | 'performance' | 'configuration' | 'logs';
  parameters: Parameter[];
  returns: string;
  example: string;
  keywords: string[];
}

export const ANALYSIS_METHODS: AnalysisMethod[] = [
  {
    name: 'listNamespaces',
    signature: 'listNamespaces(): string[]',
    description: 'List all namespaces in the cluster',
    component: 'namespaces',
    severity: 'info',
    scope: 'cluster',
    category: 'configuration',
    parameters: [],
    returns: 'string[]',
    example: `const namespaces = analyzer.listNamespaces();
const openshift = namespaces.filter(ns => ns.startsWith('openshift-'));
console.log(\`Found \${openshift.length} OpenShift namespaces\`);`,
    keywords: ['namespace', 'project', 'list', 'inventory']
  },
  {
    name: 'getNodes',
    signature: 'getNodes(): Node[]',
    description: 'Get all nodes with status, roles, and conditions',
    component: 'nodes',
    severity: 'info',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'Node[]',
    example: `const nodes = analyzer.getNodes();
const notReady = nodes.filter(n => n.status !== 'Ready');
if (notReady.length > 0) {
  console.log(\`Warning: \${notReady.length} nodes are not ready\`);
}`,
    keywords: ['node', 'infrastructure', 'compute', 'ready', 'status', 'worker', 'master']
  },
  {
    name: 'getPods',
    signature: 'getPods(namespace?: string): Pod[]',
    description: 'Get pods from a specific namespace or all namespaces',
    component: 'pods',
    severity: 'info',
    scope: 'namespace',
    category: 'health',
    parameters: [
      {
        name: 'namespace',
        type: 'string',
        optional: true,
        description: 'Namespace to filter by (returns all if not specified)'
      }
    ],
    returns: 'Pod[]',
    example: `const pods = analyzer.getPods('openshift-etcd');
const running = pods.filter(p => p.status === 'Running');
console.log(\`\${running.length}/\${pods.length} pods running\`);`,
    keywords: ['pod', 'container', 'namespace', 'workload', 'application']
  },
  {
    name: 'getFailingPods',
    signature: 'getFailingPods(): Pod[]',
    description: 'Get pods that are failing, crashed, or have restarting containers',
    component: 'pods',
    severity: 'warning',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'Pod[]',
    example: `const failing = analyzer.getFailingPods();
failing.forEach(pod => {
  const logs = analyzer.getPodLogs(pod.namespace, pod.name);
  const errors = logs?.split('\\n').filter(l => /ERROR|FATAL/.test(l));
  console.log(\`\${pod.namespace}/\${pod.name}: \${errors?.length || 0} errors\`);
});`,
    keywords: ['pod', 'failing', 'crashed', 'error', 'restart', 'crashloop', 'failed']
  },
  {
    name: 'getPodLogs',
    signature: 'getPodLogs(namespace: string, podName: string, container?: string): string | null',
    description: 'Get logs for a specific pod and optional container',
    component: 'pods',
    severity: 'info',
    scope: 'pod',
    category: 'logs',
    parameters: [
      {
        name: 'namespace',
        type: 'string',
        optional: false,
        description: 'Namespace of the pod'
      },
      {
        name: 'podName',
        type: 'string',
        optional: false,
        description: 'Name of the pod'
      },
      {
        name: 'container',
        type: 'string',
        optional: true,
        description: 'Container name (returns first container if not specified)'
      }
    ],
    returns: 'string | null',
    example: `const logs = analyzer.getPodLogs('openshift-etcd', 'etcd-master-0');
if (logs) {
  const errors = logs.split('\\n').filter(l => /ERROR/.test(l));
  console.log(\`Found \${errors.length} error lines\`);
}`,
    keywords: ['logs', 'pod', 'container', 'error', 'debug', 'output', 'stdout', 'stderr']
  },
  {
    name: 'getEvents',
    signature: 'getEvents(namespace?: string): Event[]',
    description: 'Get cluster events from a namespace or all namespaces',
    component: 'events',
    severity: 'info',
    scope: 'namespace',
    category: 'health',
    parameters: [
      {
        name: 'namespace',
        type: 'string',
        optional: true,
        description: 'Namespace to filter by (returns all if not specified)'
      }
    ],
    returns: 'Event[]',
    example: `const events = analyzer.getEvents('default');
const recent = events
  .sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
  .slice(0, 10);
console.log('Recent events:', recent);`,
    keywords: ['event', 'warning', 'error', 'history', 'timeline', 'audit']
  },
  {
    name: 'getWarningEvents',
    signature: 'getWarningEvents(): Event[]',
    description: 'Get only warning and error events from across the cluster',
    component: 'events',
    severity: 'warning',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'Event[]',
    example: `const warnings = analyzer.getWarningEvents();
const grouped = warnings.reduce((acc, e) => {
  acc[e.reason] = (acc[e.reason] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
console.log('Warning counts by reason:', grouped);`,
    keywords: ['event', 'warning', 'error', 'critical', 'issue', 'problem', 'alert']
  },
  {
    name: 'getEtcdHealth',
    signature: 'getEtcdHealth(): EtcdHealth[]',
    description: 'Get etcd cluster health status for all members',
    component: 'etcd',
    severity: 'critical',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'EtcdHealth[]',
    example: `const etcd = analyzer.getEtcdHealth();
const unhealthy = etcd.filter(e => !e.health);
if (unhealthy.length > 0) {
  console.log('CRITICAL: Unhealthy etcd members:', unhealthy);
}`,
    keywords: ['etcd', 'health', 'database', 'quorum', 'critical', 'control-plane']
  },
  {
    name: 'getEtcdStatus',
    signature: 'getEtcdStatus(): any',
    description: 'Get detailed etcd endpoint status and metadata',
    component: 'etcd',
    severity: 'info',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'any',
    example: `const status = analyzer.getEtcdStatus();
if (status) {
  console.log(\`Etcd version: \${status.version}\`);
  console.log(\`Cluster ID: \${status.header?.cluster_id}\`);
}`,
    keywords: ['etcd', 'status', 'version', 'endpoint', 'metadata', 'cluster-id']
  },
  {
    name: 'getClusterOperators',
    signature: 'getClusterOperators(): ClusterOperator[]',
    description: 'Get all cluster operators with availability and degradation status',
    component: 'operators',
    severity: 'info',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'ClusterOperator[]',
    example: `const ops = analyzer.getClusterOperators();
const healthy = ops.filter(o =>
  o.available === 'True' && o.degraded !== 'True'
);
console.log(\`\${healthy.length}/\${ops.length} operators healthy\`);`,
    keywords: ['operator', 'cluster', 'health', 'availability', 'component', 'openshift']
  },
  {
    name: 'getDegradedOperators',
    signature: 'getDegradedOperators(): ClusterOperator[]',
    description: 'Get only degraded or unavailable cluster operators',
    component: 'operators',
    severity: 'critical',
    scope: 'cluster',
    category: 'health',
    parameters: [],
    returns: 'ClusterOperator[]',
    example: `const degraded = analyzer.getDegradedOperators();
if (degraded.length > 0) {
  console.log('CRITICAL: Degraded operators detected');
  degraded.forEach(op => {
    console.log(\`- \${op.name}: degraded=\${op.degraded}, available=\${op.available}\`);
  });
}`,
    keywords: ['operator', 'degraded', 'unavailable', 'failing', 'critical', 'broken']
  }
];
