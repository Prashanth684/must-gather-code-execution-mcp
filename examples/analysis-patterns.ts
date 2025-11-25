/**
 * Must-Gather Analysis Patterns
 *
 * Example scripts demonstrating the code execution pattern.
 * These show how to efficiently analyze must-gather data without
 * passing large amounts of data through the model's context.
 */

import { MustGatherAnalyzer } from '../must-gather-lib.js';

// Initialize analyzer
const analyzer = new MustGatherAnalyzer({
  basePath: process.env.MUST_GATHER_PATH || '.'
});

/**
 * Example 1: Find all failing pods with their last error message
 *
 * Traditional approach would:
 * 1. List all namespaces → large response
 * 2. Get all pods → very large response
 * 3. Get logs for each pod → extremely large response
 * 4. Parse and extract errors → all data through context
 *
 * Code execution approach:
 * - Process everything locally
 * - Only return summary of issues
 */
export function findFailingPodsWithErrors() {
  const failingPods = analyzer.getFailingPods();

  const results = failingPods.map(pod => {
    // Get logs locally without passing through context
    const logs = analyzer.getPodLogs(pod.namespace, pod.name);

    // Extract only the relevant error info
    const errorLines = logs
      ?.split('\n')
      .filter(line => /ERROR|FATAL|panic/i.test(line))
      .slice(-3); // Only last 3 error lines

    return {
      pod: `${pod.namespace}/${pod.name}`,
      status: pod.status,
      restarts: pod.containers.reduce((sum, c) => sum + c.restartCount, 0),
      lastErrors: errorLines || ['No logs available'],
      containerStates: pod.containers.map(c => ({
        name: c.name,
        state: c.state,
        ready: c.ready
      }))
    };
  });

  return {
    summary: `Found ${results.length} failing pods`,
    pods: results
  };
}

/**
 * Example 2: Cluster health overview
 *
 * Aggregates data from multiple sources into a concise health report.
 * All processing happens locally - only the summary passes through context.
 */
export function getClusterHealthOverview() {
  const nodes = analyzer.getNodes();
  const operators = analyzer.getClusterOperators();
  const etcdHealth = analyzer.getEtcdHealth();
  const warningEvents = analyzer.getWarningEvents();
  const failingPods = analyzer.getFailingPods();

  // Process locally to extract insights
  const notReadyNodes = nodes.filter(n => n.status !== 'Ready');
  const degradedOperators = operators.filter(op =>
    op.degraded === 'True' || op.available !== 'True'
  );
  const unhealthyEtcd = etcdHealth.filter(e => !e.health);

  // Recent events (last hour simulated by taking last 50)
  const recentWarnings = warningEvents.slice(-50);

  // Group events by reason for pattern detection
  const eventReasons = recentWarnings.reduce((acc, event) => {
    acc[event.reason] = (acc[event.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    clusterHealth: unhealthyEtcd.length === 0 && degradedOperators.length === 0 ? 'Healthy' : 'Degraded',
    summary: {
      totalNodes: nodes.length,
      notReadyNodes: notReadyNodes.length,
      totalOperators: operators.length,
      degradedOperators: degradedOperators.length,
      etcdMembers: etcdHealth.length,
      unhealthyEtcd: unhealthyEtcd.length,
      failingPods: failingPods.length,
      recentWarnings: recentWarnings.length
    },
    issues: {
      nodes: notReadyNodes.map(n => ({
        name: n.name,
        status: n.status,
        roles: n.roles
      })),
      operators: degradedOperators.map(op => ({
        name: op.name,
        available: op.available,
        degraded: op.degraded
      })),
      etcd: unhealthyEtcd.map(e => ({
        endpoint: e.endpoint,
        health: e.health
      })),
      topEventReasons: Object.entries(eventReasons)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }))
    }
  };
}

/**
 * Example 3: Cross-correlate pod failures with events
 *
 * Demonstrates complex data correlation without token overhead.
 */
export function correlatePodFailuresWithEvents() {
  const failingPods = analyzer.getFailingPods();
  const allEvents = analyzer.getEvents();

  const correlations = failingPods.map(pod => {
    // Find events related to this pod
    const relatedEvents = allEvents.filter(event =>
      event.namespace === pod.namespace &&
      event.involvedObject.name === pod.name
    );

    // Categorize events
    const warnings = relatedEvents.filter(e => e.type === 'Warning');
    const recent = warnings.slice(-5); // Last 5 warnings

    return {
      pod: `${pod.namespace}/${pod.name}`,
      status: pod.status,
      totalEvents: relatedEvents.length,
      warnings: warnings.length,
      recentWarnings: recent.map(e => ({
        reason: e.reason,
        message: e.message,
        timestamp: e.timestamp
      }))
    };
  }).filter(c => c.warnings > 0); // Only pods with warning events

  return {
    summary: `${correlations.length} failing pods with associated warning events`,
    correlations
  };
}

/**
 * Example 4: Namespace resource usage analysis
 *
 * Shows how to aggregate data across many resources efficiently.
 */
export function analyzeNamespaceResources() {
  const namespaces = analyzer.listNamespaces();

  const analysis = namespaces.map(ns => {
    const pods = analyzer.getPods(ns);
    const events = analyzer.getEvents(ns);

    const podsByPhase = pods.reduce((acc, pod) => {
      acc[pod.phase] = (acc[pod.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalContainers = pods.reduce(
      (sum, pod) => sum + pod.containers.length,
      0
    );

    const totalRestarts = pods.reduce(
      (sum, pod) => sum + pod.containers.reduce((s, c) => s + c.restartCount, 0),
      0
    );

    const warningEvents = events.filter(e => e.type === 'Warning').length;

    return {
      namespace: ns,
      pods: {
        total: pods.length,
        byPhase: podsByPhase,
        totalContainers,
        totalRestarts
      },
      events: {
        total: events.length,
        warnings: warningEvents
      },
      healthScore: calculateHealthScore(pods.length, totalRestarts, warningEvents)
    };
  });

  // Sort by health score (worst first)
  analysis.sort((a, b) => a.healthScore - b.healthScore);

  return {
    summary: `Analyzed ${analysis.length} namespaces`,
    namespaces: analysis.slice(0, 10) // Top 10 unhealthiest
  };
}

function calculateHealthScore(pods: number, restarts: number, warnings: number): number {
  if (pods === 0) return 100;
  // Simple scoring: lower is worse
  const restartPenalty = (restarts / pods) * 10;
  const warningPenalty = (warnings / pods) * 5;
  return Math.max(0, 100 - restartPenalty - warningPenalty);
}

/**
 * Example 5: Detect common issues
 *
 * Pattern matching across the entire must-gather data.
 */
export function detectCommonIssues() {
  const issues: Array<{ type: string; severity: string; description: string; count?: number }> = [];

  // Check etcd health
  const etcdHealth = analyzer.getEtcdHealth();
  const unhealthyEtcd = etcdHealth.filter(e => !e.health);
  if (unhealthyEtcd.length > 0) {
    issues.push({
      type: 'etcd-unhealthy',
      severity: 'critical',
      description: `${unhealthyEtcd.length} etcd members are unhealthy`
    });
  }

  // Check for degraded operators
  const degradedOps = analyzer.getDegradedOperators();
  if (degradedOps.length > 0) {
    issues.push({
      type: 'operators-degraded',
      severity: 'high',
      description: `${degradedOps.length} cluster operators are degraded`,
      count: degradedOps.length
    });
  }

  // Check for crashlooping pods
  const failingPods = analyzer.getFailingPods();
  const crashLooping = failingPods.filter(pod =>
    pod.containers.some(c => c.restartCount > 5)
  );
  if (crashLooping.length > 0) {
    issues.push({
      type: 'crashloop-pods',
      severity: 'high',
      description: `${crashLooping.length} pods are crash looping`,
      count: crashLooping.length
    });
  }

  // Check for image pull failures
  const warningEvents = analyzer.getWarningEvents();
  const imagePullErrors = warningEvents.filter(e =>
    e.reason.includes('ImagePull') || e.reason.includes('ErrImagePull')
  );
  if (imagePullErrors.length > 10) {
    issues.push({
      type: 'image-pull-errors',
      severity: 'medium',
      description: `Detected ${imagePullErrors.length} image pull failures`,
      count: imagePullErrors.length
    });
  }

  // Check for disk pressure
  const nodes = analyzer.getNodes();
  const diskPressure = nodes.filter(n =>
    n.conditions.some(c => c.type === 'DiskPressure' && c.status === 'True')
  );
  if (diskPressure.length > 0) {
    issues.push({
      type: 'disk-pressure',
      severity: 'high',
      description: `${diskPressure.length} nodes reporting disk pressure`,
      count: diskPressure.length
    });
  }

  return {
    summary: `Detected ${issues.length} potential issues`,
    issues: issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity as keyof typeof severityOrder] -
             severityOrder[b.severity as keyof typeof severityOrder];
    })
  };
}

// CLI interface for running examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const examples = {
    'failing-pods': findFailingPodsWithErrors,
    'health-overview': getClusterHealthOverview,
    'correlate-events': correlatePodFailuresWithEvents,
    'namespace-analysis': analyzeNamespaceResources,
    'detect-issues': detectCommonIssues
  };

  const exampleName = process.argv[2];

  if (!exampleName || !examples[exampleName as keyof typeof examples]) {
    console.log('Available examples:');
    Object.keys(examples).forEach(name => console.log(`  - ${name}`));
    process.exit(1);
  }

  const result = examples[exampleName as keyof typeof examples]();
  console.log(JSON.stringify(result, null, 2));
}
