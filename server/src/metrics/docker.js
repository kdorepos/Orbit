import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

let dockerAvailable = null;

async function checkDockerAvailable() {
  if (dockerAvailable !== null) {
    return dockerAvailable;
  }

  try {
    await docker.ping();
    dockerAvailable = true;
  } catch (error) {
    dockerAvailable = false;
    console.warn('Docker not available:', error.message);
  }

  return dockerAvailable;
}

function calculateCpuPercent(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;

  if (systemDelta > 0 && cpuDelta > 0) {
    return (cpuDelta / systemDelta) * cpuCount * 100;
  }
  return 0;
}

function calculateMemoryPercent(stats) {
  const usage = stats.memory_stats.usage || 0;
  const limit = stats.memory_stats.limit || 1;
  return (usage / limit) * 100;
}

async function getContainerStats(container) {
  try {
    const stats = await container.stats({ stream: false });
    return {
      cpuPercent: calculateCpuPercent(stats),
      memoryUsage: stats.memory_stats.usage || 0,
      memoryLimit: stats.memory_stats.limit || 0,
      memoryPercent: calculateMemoryPercent(stats),
      networkRx: Object.values(stats.networks || {}).reduce((acc, net) => acc + (net.rx_bytes || 0), 0),
      networkTx: Object.values(stats.networks || {}).reduce((acc, net) => acc + (net.tx_bytes || 0), 0),
      blockRead: stats.blkio_stats?.io_service_bytes_recursive?.find(s => s.op === 'read')?.value || 0,
      blockWrite: stats.blkio_stats?.io_service_bytes_recursive?.find(s => s.op === 'write')?.value || 0
    };
  } catch (error) {
    return null;
  }
}

export async function getDockerInfo() {
  const isAvailable = await checkDockerAvailable();

  if (!isAvailable) {
    return {
      available: false,
      containers: [],
      images: 0,
      error: 'Docker socket not accessible'
    };
  }

  try {
    const [containers, info] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.info()
    ]);

    const containerDetails = await Promise.all(
      containers.map(async (containerInfo) => {
        const container = docker.getContainer(containerInfo.Id);

        // Only get stats for running containers
        let stats = null;
        if (containerInfo.State === 'running') {
          stats = await getContainerStats(container);
        }

        // Parse port mappings
        const ports = containerInfo.Ports.map(p => ({
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort,
          type: p.Type,
          ip: p.IP
        })).filter(p => p.publicPort);

        return {
          id: containerInfo.Id.substring(0, 12),
          name: containerInfo.Names[0]?.replace(/^\//, '') || 'unknown',
          image: containerInfo.Image,
          imageId: containerInfo.ImageID?.substring(7, 19),
          state: containerInfo.State,
          status: containerInfo.Status,
          created: containerInfo.Created,
          ports,
          stats
        };
      })
    );

    return {
      available: true,
      containers: containerDetails,
      containersRunning: info.ContainersRunning,
      containersStopped: info.ContainersStopped,
      containersPaused: info.ContainersPaused,
      images: info.Images,
      dockerVersion: info.ServerVersion,
      memoryLimit: info.MemTotal,
      cpus: info.NCPU
    };
  } catch (error) {
    console.error('Error getting Docker info:', error);
    return {
      available: false,
      containers: [],
      error: error.message
    };
  }
}
