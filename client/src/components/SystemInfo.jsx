import { Server, Cpu, HardDrive, Clock, Package, AlertTriangle, RefreshCw, CheckCircle, Monitor, Box } from 'lucide-react';

function formatUptime(seconds) {
  if (!seconds) return '--';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

function formatBytes(bytes) {
  if (!bytes) return '--';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function StatusBadge({ type, children }) {
  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    danger: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' }
  };

  const style = colors[type] || colors.info;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.85em',
      fontWeight: 500,
      backgroundColor: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`
    }}>
      {children}
    </span>
  );
}

export default function SystemInfo({ data, uptime }) {
  if (!data) {
    return (
      <div className="component-loading">
        <Server size={24} />
        <span>Loading system info...</span>
      </div>
    );
  }

  const status = data.status || {};
  const updates = status.updates || { totalUpdates: 0, securityUpdates: 0 };
  const kernel = status.kernel || { updateAvailable: false };
  const restartRequired = status.restartRequired || false;

  // Determine update status type
  const getUpdateStatusType = () => {
    if (updates.securityUpdates > 0) return 'danger';
    if (updates.totalUpdates > 0) return 'warning';
    return 'success';
  };

  // Determine kernel status type
  const getKernelStatusType = () => {
    if (kernel.updateAvailable && restartRequired) return 'danger';
    if (kernel.updateAvailable) return 'warning';
    return 'success';
  };

  return (
    <div className="system-info">
      <h2><Server size={20} /> System Information</h2>

      {/* System Identity Section */}
      <div className="info-section">
        <h3 className="info-section-title"><Monitor size={16} /> System</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Hostname</label>
            <span>{data.hostname}</span>
          </div>

          <div className="info-item">
            <label>Operating System</label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <StatusBadge type="info">
                <Monitor size={12} />
                {data.prettyName || `${data.distro} ${data.release}`}
              </StatusBadge>
            </span>
          </div>

          <div className="info-item">
            <label>Architecture</label>
            <span>{data.arch}</span>
          </div>

          <div className="info-item">
            <label><Clock size={14} /> Uptime</label>
            <span>{formatUptime(uptime)}</span>
          </div>
        </div>
      </div>

      {/* Hardware Section */}
      <div className="info-section">
        <h3 className="info-section-title"><Cpu size={16} /> Hardware</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>CPU</label>
            <span>{data.cpuModel}</span>
          </div>

          <div className="info-item">
            <label>CPU Cores</label>
            <span>{data.cpuPhysicalCores} physical / {data.cpuCores} logical</span>
          </div>

          <div className="info-item">
            <label><HardDrive size={14} /> Total Memory</label>
            <span>{formatBytes(data.totalMemory)}</span>
          </div>
        </div>
      </div>

      {/* System Status Section */}
      <div className="info-section">
        <h3 className="info-section-title"><Box size={16} /> Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Kernel</label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {kernel.running || data.kernel}
              {kernel.updateAvailable ? (
                <StatusBadge type={getKernelStatusType()}>
                  <AlertTriangle size={12} />
                  Update pending
                </StatusBadge>
              ) : (
                <StatusBadge type="success">
                  <CheckCircle size={12} />
                  Current
                </StatusBadge>
              )}
            </span>
          </div>

          <div className="info-item">
            <label><Package size={14} /> APT Updates</label>
            <span>
              {updates.totalUpdates === 0 ? (
                <StatusBadge type="success">
                  <CheckCircle size={12} />
                  System up to date
                </StatusBadge>
              ) : (
                <StatusBadge type={getUpdateStatusType()}>
                  <Package size={12} />
                  {updates.totalUpdates} available
                  {updates.securityUpdates > 0 && ` (${updates.securityUpdates} security)`}
                </StatusBadge>
              )}
            </span>
          </div>

          <div className="info-item">
            <label><RefreshCw size={14} /> Restart</label>
            <span>
              {restartRequired ? (
                <StatusBadge type="danger">
                  <AlertTriangle size={12} />
                  Restart required
                </StatusBadge>
              ) : (
                <StatusBadge type="success">
                  <CheckCircle size={12} />
                  No restart needed
                </StatusBadge>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
