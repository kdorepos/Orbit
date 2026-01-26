import { execSync } from 'child_process';
import si from 'systeminformation';

// Kernel thread names to filter out
const KERNEL_THREADS = new Set([
  'kthreadd', 'kworker', 'ksoftirqd', 'migration', 'rcu_sched', 'rcu_bh',
  'watchdog', 'cpuhp', 'netns', 'kdevtmpfs', 'inet_frag_wq', 'kauditd',
  'khungtaskd', 'oom_reaper', 'writeback', 'kcompactd', 'ksmd', 'khugepaged',
  'kintegrityd', 'kblockd', 'blkcg_punt_bio', 'tpm_dev_wq', 'edac-poller',
  'devfreq_wq', 'kswapd', 'ecryptfs-kthrea', 'kthrotld', 'irq', 'acpi_thermal_pm',
  'hwrng', 'raid5wq', 'nfit', 'scsi_eh', 'scsi_tmf', 'dm_bufio_cache',
  'ipv6_addrconf', 'kstrp', 'zswap', 'charger_manager', 'mpt_poll', 'mpt',
  'scsi_eh_0', 'scsi_tmf_0', 'card', 'krfcommd', 'hci', 'kworker/u'
]);

function isKernelThread(name, ppid) {
  if (ppid === 2) return true;
  const lowerName = name?.toLowerCase() || '';
  if (lowerName.startsWith('kworker/')) return true;
  if (lowerName.startsWith('kthread')) return true;
  if (lowerName.match(/^\[.*\]$/)) return true;
  if (lowerName.match(/^(irq|scsi|migration|ksoftirqd|watchdog|cpuhp)/)) return true;
  for (const kt of KERNEL_THREADS) {
    if (lowerName === kt || lowerName.startsWith(kt + '/') || lowerName.startsWith(kt + '-')) {
      return true;
    }
  }
  return false;
}

function mapProcessState(state) {
  const stateMap = {
    'R': 'running',
    'S': 'sleeping',
    'D': 'waiting',
    'Z': 'zombie',
    'T': 'stopped',
    't': 'tracing',
    'I': 'idle'
  };
  if (!state) return 'unknown';
  const firstChar = state.charAt(0).toUpperCase();
  return stateMap[firstChar] || state.toLowerCase();
}

function getProcessesFromPs() {
  try {
    // Use ps with custom format to get all needed fields
    // %cpu and %mem are calculated by ps over the process lifetime
    const output = execSync(
      'ps -eo pid,ppid,user,stat,%cpu,%mem,rss,comm --no-headers --sort=-%cpu',
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );

    const processes = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 8) continue;

      const pid = parseInt(parts[0], 10);
      const ppid = parseInt(parts[1], 10);
      const user = parts[2];
      const state = parts[3];
      const cpu = parseFloat(parts[4]) || 0;
      const mem = parseFloat(parts[5]) || 0;
      const rss = parseInt(parts[6], 10) || 0;
      const name = parts.slice(7).join(' ');

      // Skip kernel threads
      if (isKernelThread(name, ppid)) continue;
      // Skip processes with no name
      if (!name) continue;

      processes.push({
        pid,
        ppid,
        name,
        cpu,
        mem,
        memRss: rss,
        user,
        state: mapProcessState(state),
        command: name
      });
    }

    return processes;
  } catch (error) {
    console.error('Error getting processes from ps:', error.message);
    return [];
  }
}

export async function getProcessList(limit = 10) {
  // Get process counts from systeminformation (more reliable for counts)
  let processCounts = { all: 0, running: 0, blocked: 0, sleeping: 0 };
  try {
    const siProcs = await si.processes();
    processCounts = {
      all: siProcs.all,
      running: siProcs.running,
      blocked: siProcs.blocked,
      sleeping: siProcs.sleeping
    };
  } catch (error) {
    console.error('Error getting process counts:', error.message);
  }

  // Get process list with CPU data from ps command
  const processes = getProcessesFromPs();

  // Already sorted by CPU from ps command
  const topByCpu = processes.slice(0, limit);

  // Sort by memory for topByMem
  const topByMem = [...processes]
    .sort((a, b) => b.memRss - a.memRss)
    .slice(0, limit);

  return {
    ...processCounts,
    topByCpu,
    topByMem
  };
}
