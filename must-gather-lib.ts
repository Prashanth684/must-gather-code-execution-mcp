/**
 * Must-Gather Helper Library
 *
 * Provides structured access to OpenShift must-gather data.
 * Demonstrates the code execution pattern for efficient data analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export interface MustGatherConfig {
  basePath: string;
  dataDir?: string;
}

export interface Node {
  name: string;
  status: string;
  roles: string[];
  version: string;
  conditions: any[];
}

export interface Pod {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  containers: Container[];
  conditions: any[];
}

export interface Container {
  name: string;
  image: string;
  state: string;
  ready: boolean;
  restartCount: number;
}

export interface Event {
  namespace: string;
  type: string;
  reason: string;
  message: string;
  involvedObject: {
    kind: string;
    name: string;
  };
  timestamp: string;
  lastTimestamp?: string;
  firstTimestamp?: string;
}

export interface EtcdHealth {
  endpoint: string;
  health: boolean;
  took: string;
  error?: string;
}

export class MustGatherAnalyzer {
  private basePath: string;
  private dataDir: string;

  constructor(config: MustGatherConfig) {
    this.basePath = config.basePath;

    // Auto-detect the data directory (the long quay.io directory name)
    if (!config.dataDir) {
      const files = fs.readdirSync(this.basePath);
      const dataDirs = files.filter(f => f.startsWith('quay-io-'));
      if (dataDirs.length === 0) {
        throw new Error('No must-gather data directory found');
      }
      this.dataDir = path.join(this.basePath, dataDirs[0]);
    } else {
      this.dataDir = path.join(this.basePath, config.dataDir);
    }
  }

  /**
   * List all namespaces in the cluster
   */
  listNamespaces(): string[] {
    const namespacesPath = path.join(this.dataDir, 'namespaces');
    if (!fs.existsSync(namespacesPath)) {
      return [];
    }
    return fs.readdirSync(namespacesPath).filter(f => {
      const stat = fs.statSync(path.join(namespacesPath, f));
      return stat.isDirectory();
    });
  }

  /**
   * Get all nodes in the cluster
   */
  getNodes(): Node[] {
    const nodesPath = path.join(this.dataDir, 'cluster-scoped-resources', 'core', 'nodes');
    if (!fs.existsSync(nodesPath)) {
      return [];
    }

    const nodeFiles = fs.readdirSync(nodesPath).filter(f => f.endsWith('.yaml'));
    return nodeFiles.map(file => {
      const content = fs.readFileSync(path.join(nodesPath, file), 'utf8');
      const node = yaml.parse(content);

      return {
        name: node.metadata.name,
        status: this.getNodeStatus(node),
        roles: this.getNodeRoles(node),
        version: node.status?.nodeInfo?.kubeletVersion || 'unknown',
        conditions: node.status?.conditions || []
      };
    });
  }

  /**
   * Get pods from a specific namespace or all namespaces
   */
  getPods(namespace?: string): Pod[] {
    const namespaces = namespace ? [namespace] : this.listNamespaces();
    const allPods: Pod[] = [];

    for (const ns of namespaces) {
      const podsPath = path.join(this.dataDir, 'namespaces', ns, 'core', 'pods');
      if (!fs.existsSync(podsPath)) {
        continue;
      }

      const podFiles = fs.readdirSync(podsPath).filter(f => f.endsWith('.yaml'));
      for (const file of podFiles) {
        const content = fs.readFileSync(path.join(podsPath, file), 'utf8');
        const pod = yaml.parse(content);

        allPods.push({
          name: pod.metadata.name,
          namespace: ns,
          status: pod.status?.phase || 'Unknown',
          phase: pod.status?.phase || 'Unknown',
          containers: this.extractContainers(pod),
          conditions: pod.status?.conditions || []
        });
      }
    }

    return allPods;
  }

  /**
   * Get pods filtered by status
   */
  getFailingPods(): Pod[] {
    const failingStatuses = ['Failed', 'CrashLoopBackOff', 'Error', 'Unknown'];
    return this.getPods().filter(pod => {
      const hasFailingStatus = failingStatuses.includes(pod.status);
      const hasFailingContainer = pod.containers.some(c =>
        !c.ready || c.restartCount > 0
      );
      return hasFailingStatus || hasFailingContainer;
    });
  }

  /**
   * Get pod logs (from must-gather logs directory if available)
   */
  getPodLogs(namespace: string, podName: string, container?: string): string | null {
    const logsPath = path.join(this.dataDir, 'namespaces', namespace, 'pods', podName, 'logs');

    if (!fs.existsSync(logsPath)) {
      return null;
    }

    const logFiles = fs.readdirSync(logsPath);
    const targetLog = container
      ? logFiles.find(f => f.includes(container))
      : logFiles[0];

    if (!targetLog) {
      return null;
    }

    return fs.readFileSync(path.join(logsPath, targetLog), 'utf8');
  }

  /**
   * Get events from a namespace or all namespaces
   */
  getEvents(namespace?: string): Event[] {
    const namespaces = namespace ? [namespace] : this.listNamespaces();
    const allEvents: Event[] = [];

    for (const ns of namespaces) {
      const eventsPath = path.join(this.dataDir, 'namespaces', ns, 'core', 'events.yaml');
      if (!fs.existsSync(eventsPath)) {
        continue;
      }

      const content = fs.readFileSync(eventsPath, 'utf8');
      const eventsDoc = yaml.parse(content);

      if (eventsDoc && eventsDoc.items) {
        for (const event of eventsDoc.items) {
          allEvents.push({
            namespace: ns,
            type: event.type || 'Normal',
            reason: event.reason || '',
            message: event.message || '',
            involvedObject: {
              kind: event.involvedObject?.kind || '',
              name: event.involvedObject?.name || ''
            },
            timestamp: event.lastTimestamp || event.firstTimestamp || ''
          });
        }
      }
    }

    return allEvents;
  }

  /**
   * Get warning/error events only
   */
  getWarningEvents(): Event[] {
    return this.getEvents().filter(e => e.type === 'Warning' || e.type === 'Error');
  }

  /**
   * Get etcd health information
   */
  getEtcdHealth(): EtcdHealth[] {
    const healthPath = path.join(this.dataDir, 'etcd_info', 'endpoint_health.json');
    if (!fs.existsSync(healthPath)) {
      return [];
    }

    const content = fs.readFileSync(healthPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Get etcd endpoint status
   */
  getEtcdStatus(): any {
    const statusPath = path.join(this.dataDir, 'etcd_info', 'endpoint_status.json');
    if (!fs.existsSync(statusPath)) {
      return null;
    }

    const content = fs.readFileSync(statusPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Get cluster operators status
   */
  getClusterOperators(): any[] {
    const operatorsPath = path.join(
      this.dataDir,
      'cluster-scoped-resources',
      'config.openshift.io',
      'clusteroperators'
    );

    if (!fs.existsSync(operatorsPath)) {
      return [];
    }

    const operatorFiles = fs.readdirSync(operatorsPath).filter(f => f.endsWith('.yaml'));
    return operatorFiles.map(file => {
      const content = fs.readFileSync(path.join(operatorsPath, file), 'utf8');
      const operator = yaml.parse(content);

      return {
        name: operator.metadata.name,
        available: this.getOperatorCondition(operator, 'Available'),
        progressing: this.getOperatorCondition(operator, 'Progressing'),
        degraded: this.getOperatorCondition(operator, 'Degraded'),
        conditions: operator.status?.conditions || []
      };
    });
  }

  /**
   * Get degraded cluster operators
   */
  getDegradedOperators(): any[] {
    return this.getClusterOperators().filter(op =>
      op.degraded === 'True' || op.available !== 'True'
    );
  }

  // Helper methods

  private getNodeStatus(node: any): string {
    const conditions = node.status?.conditions || [];
    const ready = conditions.find((c: any) => c.type === 'Ready');
    return ready?.status === 'True' ? 'Ready' : 'NotReady';
  }

  private getNodeRoles(node: any): string[] {
    const labels = node.metadata?.labels || {};
    return Object.keys(labels)
      .filter(k => k.startsWith('node-role.kubernetes.io/'))
      .map(k => k.replace('node-role.kubernetes.io/', ''));
  }

  private extractContainers(pod: any): Container[] {
    const containerStatuses = pod.status?.containerStatuses || [];
    return containerStatuses.map((cs: any) => ({
      name: cs.name,
      image: cs.image,
      state: this.getContainerState(cs.state),
      ready: cs.ready || false,
      restartCount: cs.restartCount || 0
    }));
  }

  private getContainerState(state: any): string {
    if (!state) return 'Unknown';
    if (state.running) return 'Running';
    if (state.waiting) return `Waiting: ${state.waiting.reason || 'Unknown'}`;
    if (state.terminated) return `Terminated: ${state.terminated.reason || 'Unknown'}`;
    return 'Unknown';
  }

  private getOperatorCondition(operator: any, type: string): string {
    const conditions = operator.status?.conditions || [];
    const condition = conditions.find((c: any) => c.type === type);
    return condition?.status || 'Unknown';
  }
}
