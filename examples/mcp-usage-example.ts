/**
 * MCP Server Usage Example
 *
 * Demonstrates how to use the must-gather MCP server with code execution.
 * This simulates what an AI agent would do when given access to the MCP server.
 */

/**
 * Example 1: Traditional tool calling approach (INEFFICIENT)
 *
 * Problem: Each tool call passes full results through the model's context.
 */
async function traditionalApproach(mcpClient: any) {
  console.log('=== TRADITIONAL APPROACH (Inefficient) ===\n');

  // Step 1: Get all namespaces - passes full list through context
  const namespaces = await mcpClient.callTool('list_namespaces', {});
  console.log(`Token cost: ~${JSON.stringify(namespaces).length} chars`);

  // Step 2: Get pods for each namespace - passes HUGE data through context
  let totalPods: any[] = [];
  for (const ns of namespaces.slice(0, 5)) { // Just 5 namespaces for demo
    const pods = await mcpClient.callTool('get_pods', { namespace: ns });
    totalPods = totalPods.concat(pods);
    console.log(`Token cost for ${ns}: ~${JSON.stringify(pods).length} chars`);
  }

  // Step 3: Get events - more data through context
  const events = await mcpClient.callTool('get_warning_events', {});
  console.log(`Token cost for events: ~${JSON.stringify(events).length} chars`);

  // Total: Potentially 100K+ tokens just to gather data!
  const totalChars = JSON.stringify(namespaces).length +
                     JSON.stringify(totalPods).length +
                     JSON.stringify(events).length;
  console.log(`\nTotal token cost: ~${totalChars} chars (~${Math.ceil(totalChars / 4)} tokens)\n`);
}

/**
 * Example 2: Code execution approach (EFFICIENT)
 *
 * Solution: Write code that uses MCP tools locally, process data,
 * return only the summary.
 */
async function codeExecutionApproach(mustGather: any) {
  console.log('=== CODE EXECUTION APPROACH (Efficient) ===\n');

  // All this code runs in the execution environment
  // MCP tools are called locally, data doesn't go through model context

  const namespaces = await mustGather.list_namespaces();
  const failingPods: any[] = [];

  // Process all namespaces locally
  for (const ns of namespaces) {
    const pods = await mustGather.get_pods({ namespace: ns });

    // Filter and transform locally
    const failing = pods.filter((p: any) =>
      p.status !== 'Running' ||
      p.containers.some((c: any) => !c.ready || c.restartCount > 0)
    );

    // Only extract essential info
    failing.forEach((pod: any) => {
      failingPods.push({
        pod: `${ns}/${pod.name}`,
        status: pod.status,
        restarts: pod.containers.reduce((s: number, c: any) => s + c.restartCount, 0)
      });
    });
  }

  // Get events and correlate locally
  const events = await mustGather.get_warning_events();
  const eventsByPod = events.reduce((acc: any, event: any) => {
    const key = `${event.namespace}/${event.involvedObject.name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event.reason);
    return acc;
  }, {});

  // Enrich failing pods with event data (all local processing)
  const enrichedPods = failingPods.map(pod => ({
    ...pod,
    relatedEvents: eventsByPod[pod.pod]?.slice(0, 3) || []
  }));

  // Only return the summary - minimal token usage!
  const summary = {
    totalNamespaces: namespaces.length,
    failingPods: enrichedPods.length,
    topIssues: enrichedPods.slice(0, 10)
  };

  const resultSize = JSON.stringify(summary).length;
  console.log(`Token cost: ~${resultSize} chars (~${Math.ceil(resultSize / 4)} tokens)\n`);
  console.log('Result:', JSON.stringify(summary, null, 2));

  return summary;
}

/**
 * Example 3: Complex diagnostic pattern
 *
 * Demonstrates analyzing multiple data sources with cross-correlation.
 */
async function comprehensiveDiagnostic(mustGather: any) {
  console.log('=== COMPREHENSIVE DIAGNOSTIC ===\n');

  // Gather all data sources in parallel (locally)
  const [nodes, operators, etcdHealth, failingPods, events] = await Promise.all([
    mustGather.get_nodes(),
    mustGather.get_cluster_operators(),
    mustGather.get_etcd_health(),
    mustGather.get_failing_pods(),
    mustGather.get_warning_events()
  ]);

  // Complex analysis - all local, no token overhead
  const issues = [];

  // Check control plane
  const unhealthyEtcd = etcdHealth.filter((e: any) => !e.health);
  if (unhealthyEtcd.length > 0) {
    issues.push({
      category: 'control-plane',
      severity: 'critical',
      issue: 'etcd unhealthy',
      details: unhealthyEtcd.map((e: any) => e.endpoint)
    });
  }

  // Check operators
  const degraded = operators.filter((op: any) =>
    op.degraded === 'True' || op.available !== 'True'
  );
  if (degraded.length > 0) {
    issues.push({
      category: 'operators',
      severity: 'high',
      issue: `${degraded.length} operators degraded`,
      details: degraded.map((op: any) => op.name).slice(0, 5)
    });
  }

  // Check nodes
  const notReady = nodes.filter((n: any) => n.status !== 'Ready');
  if (notReady.length > 0) {
    issues.push({
      category: 'infrastructure',
      severity: 'high',
      issue: `${notReady.length} nodes not ready`,
      details: notReady.map((n: any) => n.name)
    });
  }

  // Analyze pod patterns
  const podsByNamespace = failingPods.reduce((acc: any, pod: any) => {
    acc[pod.namespace] = (acc[pod.namespace] || 0) + 1;
    return acc;
  }, {});

  const topNamespaces = Object.entries(podsByNamespace)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  if (topNamespaces.length > 0) {
    issues.push({
      category: 'workloads',
      severity: 'medium',
      issue: 'failing pods detected',
      details: topNamespaces.map(([ns, count]) => `${ns}: ${count} pods`)
    });
  }

  // Event pattern analysis
  const eventReasons = events.reduce((acc: any, event: any) => {
    acc[event.reason] = (acc[event.reason] || 0) + 1;
    return acc;
  }, {});

  const topReasons = Object.entries(eventReasons)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3);

  // Final diagnostic report (compact summary)
  const report = {
    timestamp: new Date().toISOString(),
    clusterHealth: issues.some(i => i.severity === 'critical') ? 'CRITICAL' :
                   issues.some(i => i.severity === 'high') ? 'DEGRADED' : 'HEALTHY',
    summary: {
      nodes: { total: nodes.length, notReady: notReady.length },
      operators: { total: operators.length, degraded: degraded.length },
      etcd: { total: etcdHealth.length, unhealthy: unhealthyEtcd.length },
      pods: { failing: failingPods.length }
    },
    issues: issues,
    topEventReasons: topReasons.map(([reason, count]) => ({ reason, count }))
  };

  console.log('Token cost: ~', JSON.stringify(report).length, 'chars');
  console.log('\nReport:', JSON.stringify(report, null, 2));

  return report;
}

/**
 * Example 4: Progressive tool discovery
 *
 * Load only the tools you need, when you need them.
 */
async function progressiveDiscovery(mustGather: any) {
  console.log('=== PROGRESSIVE TOOL DISCOVERY ===\n');

  // Start with high-level check
  console.log('Step 1: Quick health check');
  const operators = await mustGather.get_cluster_operators();
  const degradedOps = operators.filter((op: any) => op.degraded === 'True');

  if (degradedOps.length === 0) {
    console.log('All operators healthy, no deep dive needed');
    return { status: 'healthy' };
  }

  // Only if issues found, load more tools
  console.log(`Step 2: Found ${degradedOps.length} degraded operators, investigating...`);

  // Now we discover and use more specific tools
  const events = await mustGather.get_warning_events();
  const operatorEvents = events.filter((e: any) =>
    degradedOps.some((op: any) => e.message.includes(op.name))
  );

  console.log(`Step 3: Found ${operatorEvents.length} related events`);

  // Only if specific patterns detected, get pod data
  if (operatorEvents.some((e: any) => e.reason.includes('Pod'))) {
    console.log('Step 4: Operator issues related to pods, fetching pod data...');
    const failingPods = await mustGather.get_failing_pods();

    return {
      status: 'degraded',
      degradedOperators: degradedOps.map((op: any) => op.name),
      relatedPods: failingPods.slice(0, 5)
    };
  }

  return {
    status: 'degraded',
    degradedOperators: degradedOps.map((op: any) => op.name)
  };
}

// Mock MCP client for demonstration
const mockMustGather = {
  list_namespaces: async () => ['default', 'kube-system', 'openshift-monitoring'],
  get_pods: async ({ namespace }: any) => [
    { name: 'pod1', namespace, status: 'Running', containers: [{ ready: true, restartCount: 0 }] }
  ],
  get_nodes: async () => [
    { name: 'node1', status: 'Ready' }
  ],
  get_cluster_operators: async () => [
    { name: 'authentication', available: 'True', degraded: 'False' }
  ],
  get_etcd_health: async () => [
    { endpoint: 'https://10.0.0.1:2379', health: true }
  ],
  get_failing_pods: async () => [],
  get_warning_events: async () => []
};

// Run examples
async function main() {
  console.log('Must-Gather MCP Code Execution Examples\n');
  console.log('=' .repeat(60) + '\n');

  await codeExecutionApproach(mockMustGather);
  console.log('\n' + '='.repeat(60) + '\n');

  await comprehensiveDiagnostic(mockMustGather);
  console.log('\n' + '='.repeat(60) + '\n');

  await progressiveDiscovery(mockMustGather);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
