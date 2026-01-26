import { Network, ArrowDown, ArrowUp } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec < 0) return '0.00 MB/s';
  const mbPerSec = bytesPerSec / (1024 * 1024);
  return `${mbPerSec.toFixed(2)} MB/s`;
}

function NetworkInterface({ net }) {
  return (
    <div className="network-interface">
      <div className="network-header">
        <span className="network-name">{net.interface}</span>
      </div>

      <div className="network-stats">
        <div className="network-stat rx">
          <ArrowDown size={16} />
          <div className="stat-content">
            <span className="stat-label">Download</span>
            <span className="stat-speed">{formatSpeed(net.rxSec)}</span>
            <span className="stat-total">Total: {formatBytes(net.rxBytes)}</span>
          </div>
        </div>

        <div className="network-stat tx">
          <ArrowUp size={16} />
          <div className="stat-content">
            <span className="stat-label">Upload</span>
            <span className="stat-speed">{formatSpeed(net.txSec)}</span>
            <span className="stat-total">Total: {formatBytes(net.txBytes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NetworkMetrics({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="component-loading">
        <Network size={24} />
        <span>Loading network metrics...</span>
      </div>
    );
  }

  return (
    <div className="network-metrics">
      <h2><Network size={20} /> Network</h2>

      <div className="network-list">
        {data.map((net, index) => (
          <NetworkInterface key={index} net={net} />
        ))}
      </div>
    </div>
  );
}
