import si from 'systeminformation';
import { readFileSync, statfsSync } from 'fs';
import { execSync } from 'child_process';

// Cache for static system info (doesn't change often)
let staticInfoCache = null;

// Cache for network stats to calculate transfer rates
let previousNetworkStats = null;
let previousNetworkTime = null;

// Get the host's hostname (not the container's)
function getHostHostname(fallback) {
  if (process.env.HOST_HOSTNAME) {
    return process.env.HOST_HOSTNAME;
  }
  try {
    const hostname = readFileSync('/host/etc/hostname', 'utf8').trim();
    if (hostname) return hostname;
  } catch (e) {
    // Not mounted, continue
  }
  return fallback;
}

// Get host OS information - tries multiple paths for container and host deployments
function getHostOsInfo() {
  // Paths to try in order: hostfs mount (container), then direct (host)
  const osReleasePaths = [
    '/hostfs/etc/os-release',
    '/etc/os-release'
  ];

  for (const osPath of osReleasePaths) {
    try {
      const osRelease = readFileSync(osPath, 'utf8');
      const info = {};
      for (const line of osRelease.split('\n')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          info[key] = valueParts.join('=').replace(/^"|"$/g, '');
        }
      }

      // Skip if this looks like a container OS (Alpine in Docker)
      const name = info.NAME || '';
      const prettyName = info.PRETTY_NAME || '';
      if (osPath === '/etc/os-release' &&
          (name.toLowerCase().includes('alpine') || prettyName.toLowerCase().includes('alpine'))) {
        continue; // Try next path or fall through
      }

      return {
        distro: info.NAME || 'Linux',
        release: info.VERSION_ID || '',
        prettyName: info.PRETTY_NAME || info.NAME || 'Linux',
        versionCodename: info.VERSION_CODENAME || '',
        version: info.VERSION || ''
      };
    } catch (e) {
      // Try next path
      continue;
    }
  }
  return null;
}

// Get package update information from host
function getHostUpdateInfo() {
  try {
    const updatesFile = readFileSync('/hostfs/var/lib/update-notifier/updates-available', 'utf8');

    let totalUpdates = 0;
    let securityUpdates = 0;

    // Parse "X updates can be applied immediately"
    const updatesMatch = updatesFile.match(/(\d+)\s+updates?\s+can\s+be\s+applied/i);
    if (updatesMatch) {
      totalUpdates = parseInt(updatesMatch[1], 10);
    }

    // Parse "X of these updates are standard security updates"
    const securityMatch = updatesFile.match(/(\d+)\s+of\s+these.*security/i);
    if (securityMatch) {
      securityUpdates = parseInt(securityMatch[1], 10);
    }

    return { totalUpdates, securityUpdates };
  } catch (e) {
    return { totalUpdates: 0, securityUpdates: 0 };
  }
}

// Check if system restart is required
function isRestartRequired() {
  try {
    readFileSync('/hostfs/var/run/reboot-required', 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

// Check if kernel update is pending (running kernel vs latest installed)
function getKernelUpdateStatus() {
  try {
    const runningKernel = execSync('uname -r', { encoding: 'utf8' }).trim();
    const installedKernels = execSync('ls /hostfs/lib/modules/', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(k => k.length > 0)
      .sort();

    // Get the latest installed kernel (simple string sort works for most cases)
    const latestKernel = installedKernels[installedKernels.length - 1] || runningKernel;

    return {
      running: runningKernel,
      latest: latestKernel,
      updateAvailable: runningKernel !== latestKernel
    };
  } catch (e) {
    return { running: 'unknown', latest: 'unknown', updateAvailable: false };
  }
}

// Get host network statistics from /sys/class/net/*/statistics/
function getHostNetworkStats() {
  const sysNetPaths = [
    '/hostfs/sys/class/net',
    '/sys/class/net'
  ];

  let netPath = null;
  for (const path of sysNetPaths) {
    try {
      const interfaces = execSync(`ls "${path}" 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n');
      if (interfaces.length > 0) {
        netPath = path;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!netPath) {
    return [];
  }

  const now = Date.now();
  const currentStats = {};

  try {
    const interfaces = execSync(`ls "${netPath}" 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n');

    for (const iface of interfaces) {
      if (!iface) continue;

      // Skip loopback, docker, veth, and bridge interfaces
      if (iface === 'lo' ||
          iface.startsWith('veth') ||
          iface.startsWith('br-') ||
          iface.startsWith('docker') ||
          iface === 'docker0') {
        continue;
      }

      try {
        const statsPath = `${netPath}/${iface}/statistics`;
        const rxBytes = parseInt(readFileSync(`${statsPath}/rx_bytes`, 'utf8').trim(), 10) || 0;
        const txBytes = parseInt(readFileSync(`${statsPath}/tx_bytes`, 'utf8').trim(), 10) || 0;

        // Only include interfaces with traffic
        if (rxBytes > 0 || txBytes > 0) {
          currentStats[iface] = { rxBytes, txBytes };
        }
      } catch (e) {
        // Skip interfaces we can't read
        continue;
      }
    }
  } catch (e) {
    return [];
  }

  // Calculate rates if we have previous stats
  const networks = [];
  const timeDiffMs = previousNetworkTime ? (now - previousNetworkTime) : 0;
  const timeDiffSec = timeDiffMs / 1000;

  for (const [iface, stats] of Object.entries(currentStats)) {
    let rxSec = 0;
    let txSec = 0;

    if (previousNetworkStats && previousNetworkStats[iface] && timeDiffSec > 0) {
      const prevStats = previousNetworkStats[iface];
      rxSec = Math.max(0, (stats.rxBytes - prevStats.rxBytes) / timeDiffSec);
      txSec = Math.max(0, (stats.txBytes - prevStats.txBytes) / timeDiffSec);
    }

    networks.push({
      interface: iface,
      rxBytes: stats.rxBytes,
      txBytes: stats.txBytes,
      rxSec,
      txSec
    });
  }

  // Update previous stats for next calculation
  previousNetworkStats = currentStats;
  previousNetworkTime = now;

  // Sort by total traffic (rx + tx)
  networks.sort((a, b) => (b.rxBytes + b.txBytes) - (a.rxBytes + a.txBytes));

  return networks;
}

// Get disk usage for host mounts via /hostfs bind mount
function getHostDisks() {
  try {
    const mounts = readFileSync('/proc/1/mounts', 'utf8');
    const disks = [];
    const seenDevices = new Set();

    // Valid filesystem types to include
    const validFsTypes = ['ext4', 'ext3', 'xfs', 'btrfs', 'zfs', 'ntfs', 'vfat', 'exfat', 'nfs', 'cifs', 'smb'];

    for (const line of mounts.split('\n')) {
      const parts = line.split(' ');
      if (parts.length < 3) continue;

      const [device, mountPoint, fsType] = parts;

      // Skip non-filesystem mounts
      if (!validFsTypes.includes(fsType)) continue;

      // Skip if not a block device or network mount
      const isBlockDevice = device.startsWith('/dev/');
      const isNetworkMount = ['nfs', 'cifs', 'smb'].includes(fsType);
      if (!isBlockDevice && !isNetworkMount) continue;

      // Skip duplicate devices (keep first mount point)
      if (seenDevices.has(device)) continue;
      seenDevices.add(device);

      // Skip snap mounts
      if (mountPoint.startsWith('/snap')) continue;

      // Skip boot partitions
      if (mountPoint.startsWith('/boot')) continue;

      // Get disk usage via /hostfs path
      const hostfsPath = '/hostfs' + mountPoint;
      try {
        const output = execSync(`df -B1 "${hostfsPath}" 2>/dev/null | tail -1`, { encoding: 'utf8' });
        const dfParts = output.trim().split(/\s+/);

        // df output format: [device] size used available use% mount
        // Device may be missing or on separate line, so parse from the end
        // The last element is mount point, second to last is percentage, etc.
        if (dfParts.length >= 4) {
          // Find the percentage field (contains %)
          let percentIdx = dfParts.findIndex(p => p.includes('%'));
          if (percentIdx >= 3) {
            const size = parseInt(dfParts[percentIdx - 3], 10) || 0;
            const used = parseInt(dfParts[percentIdx - 2], 10) || 0;
            const available = parseInt(dfParts[percentIdx - 1], 10) || 0;

            if (size > 0) {
              disks.push({
                mount: mountPoint,
                type: fsType,
                size,
                used,
                available,
                usePercent: (used / size) * 100
              });
            }
          }
        }
      } catch (e) {
        // Skip mounts we can't access
      }
    }

    return disks;
  } catch (e) {
    return [];
  }
}

export async function getStaticSystemInfo() {
  if (staticInfoCache) {
    return staticInfoCache;
  }

  const [system, cpu, osInfo, mem] = await Promise.all([
    si.system(),
    si.cpu(),
    si.osInfo(),
    si.mem()
  ]);

  // Get host OS info (prefer host over container)
  const hostOs = getHostOsInfo();

  staticInfoCache = {
    hostname: getHostHostname(osInfo.hostname),
    platform: osInfo.platform,
    distro: hostOs?.distro || osInfo.distro,
    release: hostOs?.release || osInfo.release,
    prettyName: hostOs?.prettyName || `${osInfo.distro} ${osInfo.release}`,
    versionCodename: hostOs?.versionCodename || osInfo.codename || '',
    version: hostOs?.version || '',
    arch: osInfo.arch,
    kernel: osInfo.kernel,
    cpuModel: cpu.manufacturer + ' ' + cpu.brand,
    cpuCores: cpu.cores,
    cpuPhysicalCores: cpu.physicalCores,
    cpuSpeed: cpu.speed,
    totalMemory: mem.total,
    manufacturer: system.manufacturer,
    model: system.model
  };

  return staticInfoCache;
}

// Get dynamic system status (updates, restart required, etc.)
export function getSystemStatus() {
  const updateInfo = getHostUpdateInfo();
  const kernelStatus = getKernelUpdateStatus();
  const restartRequired = isRestartRequired();

  return {
    updates: updateInfo,
    kernel: kernelStatus,
    restartRequired
  };
}

export async function getSystemMetrics() {
  const [
    cpuLoad,
    cpuTemp,
    mem
  ] = await Promise.all([
    si.currentLoad(),
    si.cpuTemperature().catch(() => ({ main: null })),
    si.mem()
  ]);

  // Get uptime
  const uptime = si.time().uptime;

  // Get disk usage from host mounts
  const disks = getHostDisks();

  // Get network stats from host /proc/net/dev for accurate measurements
  const networks = getHostNetworkStats();

  return {
    timestamp: Date.now(),
    uptime,
    cpu: {
      currentLoad: cpuLoad.currentLoad,
      currentLoadUser: cpuLoad.currentLoadUser,
      currentLoadSystem: cpuLoad.currentLoadSystem,
      cpus: cpuLoad.cpus.map(cpu => cpu.load),
      temperature: cpuTemp.main
    },
    memory: {
      total: mem.total,
      used: mem.total - mem.available,
      free: mem.free,
      available: mem.available,
      active: mem.active,
      usePercent: ((mem.total - mem.available) / mem.total) * 100,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
      swapPercent: mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0
    },
    disks,
    networks
  };
}
