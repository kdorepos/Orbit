import { MemoryStick, ListTree } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatMemory(kb) {
  if (!kb) return '0 KB';
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function ProgressBar({ value, label, used, total, color = '#3b82f6' }) {
  const percentage = Math.min(100, Math.max(0, value || 0));

  return (
    <div className="progress-item">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{formatBytes(used)} / {formatBytes(total)}</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
      <span className="progress-percent">{percentage.toFixed(1)}%</span>
    </div>
  );
}

export default function MemoryMetrics({ data, processes }) {
  if (!data) {
    return (
      <div className="component-loading">
        <MemoryStick size={24} />
        <span>Loading memory metrics...</span>
      </div>
    );
  }

  const getMemoryColor = (percent) => {
    if (percent > 90) return '#ef4444';
    if (percent > 70) return '#f59e0b';
    return '#22c55e';
  };

  const topProcesses = processes?.topByMem?.slice(0, 10) || [];

  return (
    <div className="memory-metrics">
      <h2><MemoryStick size={20} /> Memory</h2>

      <div className="memory-content">
        <ProgressBar
          value={data.usePercent}
          label="RAM"
          used={data.used}
          total={data.total}
          color={getMemoryColor(data.usePercent)}
        />

        {data.swapTotal > 0 && (
          <ProgressBar
            value={data.swapPercent}
            label="Swap"
            used={data.swapUsed}
            total={data.swapTotal}
            color={getMemoryColor(data.swapPercent)}
          />
        )}

        <div className="memory-details">
          <div className="detail-item">
            <span className="detail-label">Active</span>
            <span className="detail-value">{formatBytes(data.active)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Available</span>
            <span className="detail-value">{formatBytes(data.available)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Free</span>
            <span className="detail-value">{formatBytes(data.free)}</span>
          </div>
        </div>

        {topProcesses.length > 0 && (
          <div className="panel-processes">
            <h4><ListTree size={14} /> Top Processes by Memory</h4>
            <div className="mini-process-list">
              {topProcesses.map((proc, index) => (
                <div key={`${proc.pid}-${index}`} className="mini-process-row">
                  <span className="mini-process-name" title={proc.command}>{proc.name}</span>
                  <span className="mini-process-value">
                    {formatMemory(proc.memRss)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
