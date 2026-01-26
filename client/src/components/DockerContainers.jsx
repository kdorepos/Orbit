import { Container, Play, Square, Pause, AlertCircle } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function getStateIcon(state) {
  switch (state) {
    case 'running':
      return <Play size={14} className="state-icon running" />;
    case 'paused':
      return <Pause size={14} className="state-icon paused" />;
    case 'exited':
      return <Square size={14} className="state-icon stopped" />;
    default:
      return <AlertCircle size={14} className="state-icon" />;
  }
}

function ContainerCard({ container }) {
  const isRunning = container.state === 'running';

  return (
    <div className={`container-card ${container.state}`}>
      <div className="container-header">
        <div className="container-name">
          {getStateIcon(container.state)}
          <span>{container.name}</span>
        </div>
        <span className="container-id">{container.id}</span>
      </div>

      <div className="container-image">
        <span className="label">Image:</span>
        <span className="value">{container.image}</span>
      </div>

      <div className="container-status">{container.status}</div>

      {container.ports.length > 0 && (
        <div className="container-ports">
          <span className="label">Ports:</span>
          <div className="ports-list">
            {container.ports.map((port, i) => (
              <span key={i} className="port-badge">
                {port.publicPort}:{port.privatePort}/{port.type}
              </span>
            ))}
          </div>
        </div>
      )}

      {isRunning && container.stats && (
        <div className="container-stats">
          <div className="stat">
            <span className="stat-label">CPU</span>
            <span className="stat-value">{container.stats.cpuPercent?.toFixed(2)}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Memory</span>
            <span className="stat-value">
              {formatBytes(container.stats.memoryUsage)} / {formatBytes(container.stats.memoryLimit)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DockerContainers({ data }) {
  if (!data) {
    return (
      <div className="component-loading">
        <Container size={24} />
        <span>Loading Docker info...</span>
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className="docker-unavailable">
        <AlertCircle size={24} />
        <h3>Docker Not Available</h3>
        <p>{data.error || 'Unable to connect to Docker socket'}</p>
        <p className="hint">Make sure to mount the Docker socket when running in a container:</p>
        <code>-v /var/run/docker.sock:/var/run/docker.sock</code>
      </div>
    );
  }

  return (
    <div className="docker-containers">
      <div className="docker-header">
        <h2><Container size={20} /> Docker Containers</h2>
        <div className="docker-summary">
          <span className="running">{data.containersRunning} running</span>
          <span className="stopped">{data.containersStopped} stopped</span>
          <span className="images">{data.images} images</span>
        </div>
      </div>

      {data.containers.length === 0 ? (
        <div className="no-containers">
          <Container size={32} />
          <p>No containers found</p>
        </div>
      ) : (
        <div className="containers-grid">
          {data.containers.map((container) => (
            <ContainerCard key={container.id} container={container} />
          ))}
        </div>
      )}

      <div className="docker-version">
        Docker {data.dockerVersion}
      </div>
    </div>
  );
}
