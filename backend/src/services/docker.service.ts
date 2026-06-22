import http from 'http';
import { execSync } from 'child_process';
import os from 'os';
import { logger } from '../utils/logger';

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const COMPOSE_PROJECT = process.env.COMPOSE_PROJECT_NAME || 'task_manager';

interface DockerContainer {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Image: string;
  Created: number;
  Ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>;
}

interface DockerStats {
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus: number };
  memory_stats: { usage: number; limit: number };
  networks: Record<string, { rx_bytes: number; tx_bytes: number }>;
}

function dockerRequest(method: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: DOCKER_SOCKET, path, method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Docker socket timeout')); });
    req.end();
  });
}

function getContainerName(names: string[]) {
  const name = names[0] || '';
  return name.startsWith('/') ? name.slice(1) : name;
}

function filterComposeContainers(containers: DockerContainer[]) {
  return containers.filter((c) => {
    const name = getContainerName(c.Names);
    return name.startsWith(`${COMPOSE_PROJECT}-`) || name.startsWith('task-manager-');
  });
}

function mapServiceName(name: string): string {
  if (name.includes('backend')) return 'backend';
  if (name.includes('frontend')) return 'frontend';
  if (name.includes('postgres') || name.includes('db')) return 'db';
  if (name.includes('redis')) return 'redis';
  return name;
}

export async function getServiceStatus() {
  const containers: DockerContainer[] = await dockerRequest('GET', '/containers/json?all=true');
  const composeContainers = filterComposeContainers(containers);

  const services = composeContainers.map((c) => {
    const name = getContainerName(c.Names);
    const serviceName = mapServiceName(name);

    return {
      id: c.Id.slice(0, 12),
      name: serviceName,
      containerName: name,
      state: c.State,
      status: c.Status,
      image: c.Image.split(':').pop()?.slice(0, 12) || c.Image,
      createdAt: new Date(c.Created * 1000).toISOString(),
    };
  });

  const byName = new Map<string, typeof services[0]>();
  for (const s of services) {
    if (!byName.has(s.name)) byName.set(s.name, s);
  }

  return Array.from(byName.values());
}

export async function restartService(serviceName: string) {
  const containers: DockerContainer[] = await dockerRequest('GET', '/containers/json?all=true');
  const composeContainers = filterComposeContainers(containers);

  const target = composeContainers.find((c) => {
    const name = getContainerName(c.Names).toLowerCase();
    return name.includes(serviceName.toLowerCase());
  });

  if (!target) {
    throw new Error(`Service "${serviceName}" not found`);
  }

  const containerName = getContainerName(target.Names);
  logger.info({ service: serviceName, container: containerName }, 'Restarting container');

  await dockerRequest('POST', `/containers/${target.Id}/restart?t=10`);

  logger.info({ service: serviceName, container: containerName }, 'Container restarted');

  return {
    service: serviceName,
    container: containerName,
    message: `Service "${serviceName}" restarted successfully`,
  };
}

export async function getContainerStats() {
  const containers: DockerContainer[] = await dockerRequest('GET', '/containers/json?all=true');
  const composeContainers = filterComposeContainers(containers);

  const statsPromises = composeContainers.map(async (c) => {
    const name = getContainerName(c.Names);
    const serviceName = mapServiceName(name);

    try {
      const stats: DockerStats = await dockerRequest('GET', `/containers/${c.Id}/stats?stream=false`);

      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage;
      const cpuCount = stats.cpu_stats.online_cpus || 1;
      const cpuPercent = systemDelta > 0 ? ((cpuDelta / systemDelta) * cpuCount * 100) : 0;

      const memUsage = stats.memory_stats.usage || 0;
      const memLimit = stats.memory_stats.limit || 0;
      const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100 : 0;

      const networks = stats.networks || {};
      let networkRx = 0;
      let networkTx = 0;
      for (const net of Object.values(networks)) {
        networkRx += net.rx_bytes || 0;
        networkTx += net.tx_bytes || 0;
      }

      return {
        serviceName,
        containerName: name,
        containerId: c.Id.slice(0, 12),
        state: c.State,
        status: c.Status,
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsage: memUsage,
        memoryLimit: memLimit,
        memoryPercent: Math.round(memPercent * 100) / 100,
        networkRx,
        networkTx,
      };
    } catch (error) {
      logger.error({ error, service: serviceName }, 'Failed to get container stats');
      return {
        serviceName,
        containerName: name,
        containerId: c.Id.slice(0, 12),
        state: c.State,
        status: c.Status,
        cpuPercent: 0,
        memoryUsage: 0,
        memoryLimit: 0,
        memoryPercent: 0,
        networkRx: 0,
        networkTx: 0,
      };
    }
  });

  return Promise.all(statsPromises);
}

export function getDiskUsage() {
  try {
    const output = execSync("df -B1 / | tail -1 | awk '{print $2,$3,$4,$5}'", { encoding: 'utf-8' }).trim();
    const [total, used, available, percentStr] = output.split(' ');
    return {
      total: parseInt(total) || 0,
      used: parseInt(used) || 0,
      available: parseInt(available) || 0,
      percent: parseFloat(percentStr) || 0,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get disk usage');
    return { total: 0, used: 0, available: 0, percent: 0 };
  }
}

export function getCpuLoad(): [number, number, number] {
  const load = os.loadavg();
  return [load[0], load[1], load[2]];
}
