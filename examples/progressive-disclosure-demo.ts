#!/usr/bin/env tsx

/**
 * Progressive Disclosure Pattern Demo
 *
 * Demonstrates how the progressive disclosure pattern works:
 * 1. Search for analysis methods by intent
 * 2. Discover method signatures and examples
 * 3. Get type definitions on-demand
 * 4. Execute analysis code using discovered methods
 *
 * This simulates what an AI agent would do when using the MCP server.
 */

import { searchAnalysisMethods } from '../src/analysis/search.js';
import { getTypeDefinitions } from '../src/codegen/typeGenerator.js';
import { MustGatherAnalyzer } from '../must-gather-lib.js';

console.log('='.repeat(80));
console.log('PROGRESSIVE DISCLOSURE PATTERN DEMO');
console.log('='.repeat(80));
console.log();

// Scenario: Agent wants to find what's wrong with the cluster
console.log('SCENARIO: "What\'s wrong with my cluster?"');
console.log('-'.repeat(80));
console.log();

// Step 1: Search for critical cluster health methods
console.log('Step 1: SEARCH FOR CRITICAL HEALTH METHODS');
console.log('Query: { severity: "critical", scope: "cluster" }');
console.log();

const criticalMethods = searchAnalysisMethods({
  severity: 'critical',
  scope: 'cluster'
});

console.log(`Found ${criticalMethods.length} critical cluster health methods:\n`);
criticalMethods.forEach((method, i) => {
  console.log(`${i + 1}. ${method.name}`);
  console.log(`   ${method.description}`);
  console.log(`   Signature: ${method.signature}`);
  console.log();
});

// Step 2: Get type definitions for discovered methods
console.log('Step 2: GET TYPE DEFINITIONS');
console.log('Types needed: ClusterOperator, EtcdHealth');
console.log();

const types = getTypeDefinitions(['ClusterOperator', 'EtcdHealth'], 1, false);

types.forEach(type => {
  console.log(type.definition);
  console.log();
});

// Step 3: Execute analysis using discovered methods
console.log('Step 3: EXECUTE ANALYSIS');
console.log('-'.repeat(80));
console.log();

try {
  const analyzer = new MustGatherAnalyzer({ basePath: process.cwd() });

  // Use the discovered getDegradedOperators method
  console.log('Running: analyzer.getDegradedOperators()');
  const degraded = analyzer.getDegradedOperators();
  console.log(`Result: ${degraded.length} degraded operators`);
  if (degraded.length > 0) {
    degraded.forEach(op => {
      console.log(`  - ${op.name}: degraded=${op.degraded}, available=${op.available}`);
    });
  }
  console.log();

  // Use the discovered getEtcdHealth method
  console.log('Running: analyzer.getEtcdHealth()');
  const etcd = analyzer.getEtcdHealth();
  const unhealthyEtcd = etcd.filter(e => !e.health);
  console.log(`Result: ${etcd.length} etcd members, ${unhealthyEtcd.length} unhealthy`);
  if (unhealthyEtcd.length > 0) {
    unhealthyEtcd.forEach(e => {
      console.log(`  - ${e.endpoint}: ${e.error}`);
    });
  }
  console.log();
} catch (error) {
  console.log('Note: Run this from a must-gather directory to see actual results');
  console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.log();
}

// Step 4: Demonstrate keyword search
console.log('Step 4: KEYWORD SEARCH');
console.log('Query: { keyword: "failing" }');
console.log();

const failingMethods = searchAnalysisMethods({ keyword: 'failing' });
console.log(`Found ${failingMethods.length} methods related to "failing":\n`);
failingMethods.forEach((method, i) => {
  console.log(`${i + 1}. ${method.name}`);
  console.log(`   ${method.description}`);
  console.log();
});

// Step 5: Demonstrate component-specific search
console.log('Step 5: COMPONENT-SPECIFIC SEARCH');
console.log('Query: { component: "pods", category: "logs" }');
console.log();

const podLogMethods = searchAnalysisMethods({
  component: 'pods',
  category: 'logs'
});

console.log(`Found ${podLogMethods.length} pod log methods:\n`);
podLogMethods.forEach((method, i) => {
  console.log(`${i + 1}. ${method.name}`);
  console.log(`   ${method.signature}`);
  console.log(`   Example:`);
  console.log(method.example.split('\n').map(l => '   ' + l).join('\n'));
  console.log();
});

// Summary
console.log('='.repeat(80));
console.log('PROGRESSIVE DISCLOSURE BENEFITS');
console.log('='.repeat(80));
console.log();
console.log('Traditional Approach:');
console.log('  - Load all 11 tools upfront (~6,000 tokens)');
console.log('  - Agent must know exact tool names');
console.log('  - Difficult to scale beyond 20-30 tools');
console.log();
console.log('Progressive Disclosure Approach:');
console.log('  - Load 2 meta-tools upfront (~500 tokens) - 92% reduction!');
console.log('  - Agent discovers methods by intent (severity, component, keyword)');
console.log('  - Can scale to 100+ methods with no context penalty');
console.log('  - On-demand type exploration');
console.log('  - Better discovery experience');
console.log();
console.log('Token Usage Comparison (10 queries):');
console.log('  Traditional:          ~11,000 tokens');
console.log('  Progressive Disclose: ~2,500 tokens');
console.log('  Reduction:            77% fewer tokens!');
console.log();
console.log('='.repeat(80));
