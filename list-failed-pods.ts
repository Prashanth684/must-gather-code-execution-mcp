#!/usr/bin/env tsx

import { MustGatherAnalyzer } from './must-gather-lib.js';

const analyzer = new MustGatherAnalyzer({
  basePath: '/home/psundara/Downloads/must-gather'
});

console.log('Analyzing must-gather data for failed pods...\n');

const failingPods = analyzer.getFailingPods();

if (failingPods.length === 0) {
  console.log('No failed pods found!');
} else {
  console.log(`Found ${failingPods.length} failed pod(s):\n`);

  failingPods.forEach(pod => {
    console.log(`Namespace: ${pod.namespace}`);
    console.log(`Pod: ${pod.name}`);
    console.log(`Status: ${pod.status}`);
    console.log(`Phase: ${pod.phase}`);

    if (pod.containers.length > 0) {
      console.log('Containers:');
      pod.containers.forEach(container => {
        console.log(`  - ${container.name}:`);
        console.log(`    State: ${container.state}`);
        console.log(`    Ready: ${container.ready}`);
        console.log(`    Restart Count: ${container.restartCount}`);
      });
    }

    console.log('---\n');
  });

  console.log(`Total failed pods: ${failingPods.length}`);
}
