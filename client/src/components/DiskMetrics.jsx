import { HardDrive } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function DiskBar({ disk }) {
  const getDiskColor = (percent) => {
    if (percent > 90) return '#ef4444';
    if (percent > 75) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div className="disk-item">
      <div className="disk-header">
        <span className="disk-mount">{disk.mount}</span>
        <span className="disk-type">{disk.type}</span>
      </div>
      <div className="disk-bar">
        <div
          className="disk-fill"
          style={{
            width: `${disk.usePercent}%`,
            backgroundColor: getDiskColor(disk.usePercent)
          }}
        />
      </div>
      <div className="disk-info">
        <span>{formatBytes(disk.used)} / {formatBytes(disk.size)}</span>
        <span className="disk-percent">{disk.usePercent?.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function DiskMetrics({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="component-loading">
        <HardDrive size={24} />
        <span>Loading disk metrics...</span>
      </div>
    );
  }

  return (
    <div className="disk-metrics">
      <h2><HardDrive size={20} /> Disk</h2>

      <div className="disk-list">
        {data.map((disk, index) => (
          <DiskBar key={index} disk={disk} />
        ))}
      </div>
    </div>
  );
}
