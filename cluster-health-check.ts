#!/usr/bin/env tsx

/**
 * Comprehensive Cluster Health Analysis
 *
 * Analyzes must-gather data to identify:
 * - Degraded or unavailable cluster operators
 * - Etcd health issues
 * - Failing pods across all namespaces
 * - Critical warnings and errors
 */

import { MustGatherAnalyzer } from './must-gather-lib.js';

const analyzer = new MustGatherAnalyzer({ basePath: process.cwd() });

console.log('='.repeat(80));
console.log('CLUSTER HEALTH ANALYSIS');
console.log('='.repeat(80));
console.log();

// 1. Cluster Operators Health
console.log('1. CLUSTER OPERATORS STATUS');
console.log('-'.repeat(80));

const allOperators = analyzer.getClusterOperators();
const degradedOperators = analyzer.getDegradedOperators();

console.log(`Total Operators: ${allOperators.length}`);
console.log(`Degraded/Unavailable: ${degradedOperators.length}`);
console.log();

if (degradedOperators.length > 0) {
  console.log('❌ DEGRADED OPERATORS:');
  degradedOperators.forEach(op => {
    console.log(`  - ${op.name}`);
    console.log(`    Available: ${op.available || 'Unknown'}`);
    console.log(`    Degraded: ${op.degraded || 'Unknown'}`);
    console.log(`    Progressing: ${op.progressing || 'Unknown'}`);
    if (op.message) {
      console.log(`    Message: ${op.message}`);
    }
    console.log();
  });
} else {
  console.log('✅ All cluster operators are healthy');
}
console.log();

// 2. Etcd Health
console.log('2. ETCD HEALTH STATUS');
console.log('-'.repeat(80));

const etcdHealth = analyzer.getEtcdHealth();
const etcdStatus = analyzer.getEtcdStatus();

if (etcdHealth && etcdHealth.length > 0) {
  const unhealthyEtcd = etcdHealth.filter(e => !e.health);
  console.log(`Total Etcd Members: ${etcdHealth.length}`);
  console.log(`Unhealthy Members: ${unhealthyEtcd.length}`);
  console.log();

  if (unhealthyEtcd.length > 0) {
    console.log('❌ UNHEALTHY ETCD MEMBERS:');
    unhealthyEtcd.forEach(member => {
      console.log(`  - Endpoint: ${member.endpoint}`);
      console.log(`    Health: ${member.health}`);
      console.log(`    Error: ${member.error || 'N/A'}`);
      console.log();
    });
  } else {
    console.log('✅ All etcd members are healthy');
  }
} else {
  console.log('⚠️  No etcd health data available');
}

if (etcdStatus && etcdStatus.header) {
  console.log(`Etcd Cluster ID: ${etcdStatus.header.cluster_id}`);
  console.log(`Etcd Version: ${etcdStatus.version || 'Unknown'}`);
}
console.log();

// 3. Failing Pods Analysis
console.log('3. FAILING PODS ANALYSIS');
console.log('-'.repeat(80));

const failingPods = analyzer.getFailingPods();
console.log(`Total Failing Pods: ${failingPods.length}`);
console.log();

if (failingPods.length > 0) {
  // Group by namespace
  const byNamespace = failingPods.reduce((acc, pod) => {
    if (!acc[pod.namespace]) {
      acc[pod.namespace] = [];
    }
    acc[pod.namespace].push(pod);
    return acc;
  }, {} as Record<string, typeof failingPods>);

  console.log('❌ FAILING PODS BY NAMESPACE:');
  Object.keys(byNamespace).sort().forEach(ns => {
    console.log(`\n  Namespace: ${ns} (${byNamespace[ns].length} failing)`);
    byNamespace[ns].forEach(pod => {
      console.log(`    - ${pod.name}`);
      console.log(`      Phase: ${pod.phase}`);
      console.log(`      Status: ${pod.status}`);
      const totalRestarts = pod.containers.reduce((sum, c) => sum + c.restartCount, 0);
      const readyContainers = pod.containers.filter(c => c.ready).length;
      console.log(`      Restarts: ${totalRestarts}`);
      console.log(`      Ready: ${readyContainers}/${pod.containers.length}`);

      // Try to get recent error from logs
      const logs = analyzer.getPodLogs(pod.namespace, pod.name);
      if (logs) {
        const errorLines = logs.split('\n')
          .filter(line => /ERROR|FATAL|panic|failed/i.test(line))
          .slice(-3);

        if (errorLines.length > 0) {
          console.log(`      Recent Errors:`);
          errorLines.forEach(err => {
            console.log(`        ${err.substring(0, 100)}`);
          });
        }
      }
    });
  });
} else {
  console.log('✅ No failing pods detected');
}
console.log();

// 4. Critical Events
console.log('4. WARNING AND ERROR EVENTS');
console.log('-'.repeat(80));

const warningEvents = analyzer.getWarningEvents();
console.log(`Total Warning/Error Events: ${warningEvents.length}`);
console.log();

if (warningEvents.length > 0) {
  // Show most recent 10 critical events
  const recentEvents = warningEvents
    .sort((a, b) => {
      const timeA = a.lastTimestamp || a.firstTimestamp || '';
      const timeB = b.lastTimestamp || b.firstTimestamp || '';
      return timeB.localeCompare(timeA);
    })
    .slice(0, 10);

  console.log('⚠️  RECENT CRITICAL EVENTS (last 10):');
  recentEvents.forEach(event => {
    const time = event.lastTimestamp || event.firstTimestamp || 'Unknown';
    console.log(`  - [${event.type}] ${event.reason}`);
    console.log(`    Time: ${time}`);
    console.log(`    Object: ${event.involvedObject.kind}/${event.involvedObject.name}`);
    console.log(`    Namespace: ${event.namespace || 'cluster-scoped'}`);
    console.log(`    Message: ${event.message}`);
    console.log();
  });
}
console.log();

// 5. Summary and Recommendations
console.log('5. HEALTH SUMMARY');
console.log('='.repeat(80));

const issues: string[] = [];
const warnings: string[] = [];

if (degradedOperators.length > 0) {
  issues.push(`${degradedOperators.length} degraded cluster operator(s)`);
}

if (etcdHealth) {
  const unhealthyEtcd = etcdHealth.filter(e => !e.health);
  if (unhealthyEtcd.length > 0) {
    issues.push(`${unhealthyEtcd.length} unhealthy etcd member(s)`);
  }
}

if (failingPods.length > 0) {
  issues.push(`${failingPods.length} failing pod(s)`);
}

if (warningEvents.length > 10) {
  warnings.push(`${warningEvents.length} warning/error events detected`);
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ CLUSTER STATUS: HEALTHY');
  console.log('No critical issues detected.');
} else {
  console.log('❌ CLUSTER STATUS: DEGRADED');
  console.log();
  console.log('Critical Issues:');
  issues.forEach(issue => console.log(`  - ${issue}`));

  if (warnings.length > 0) {
    console.log();
    console.log('Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  console.log();
  console.log('RECOMMENDATIONS:');

  if (degradedOperators.length > 0) {
    console.log('  1. Investigate degraded operators - check operator logs and conditions');
  }

  if (etcdHealth && etcdHealth.filter(e => !e.health).length > 0) {
    console.log('  2. Etcd health is critical - check etcd member logs immediately');
  }

  if (failingPods.length > 0) {
    console.log('  3. Review failing pod logs and events for root cause');
  }

  if (warningEvents.length > 10) {
    console.log('  4. Review recent cluster events for patterns or recurring issues');
  }
}

console.log();
console.log('='.repeat(80));
