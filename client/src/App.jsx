import { useSocket } from './hooks/useSocket';
import SystemInfo from './components/SystemInfo';
import CpuMetrics from './components/CpuMetrics';
import MemoryMetrics from './components/MemoryMetrics';
import DiskMetrics from './components/DiskMetrics';
import NetworkMetrics from './components/NetworkMetrics';
import DockerContainers from './components/DockerContainers';
import { Activity, Wifi, WifiOff } from 'lucide-react';

function App() {
  const {
    isConnected,
    systemInfo,
    systemMetrics,
    processes,
    docker,
    metricsHistory
  } = useSocket();

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <Activity size={28} />
          <h1>Orbit</h1>
        </div>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-grid">
          <section className="card system-info-card">
            <SystemInfo data={systemInfo} uptime={systemMetrics?.uptime} />
          </section>

          <section className="card cpu-card">
            <CpuMetrics data={systemMetrics?.cpu} history={metricsHistory} processes={processes} />
          </section>

          <section className="card memory-card">
            <MemoryMetrics data={systemMetrics?.memory} processes={processes} />
          </section>

          <section className="card disk-card">
            <DiskMetrics data={systemMetrics?.disks} />
          </section>

          <section className="card network-card">
            <NetworkMetrics data={systemMetrics?.networks} />
          </section>

          <section className="card docker-card">
            <DockerContainers data={docker} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
