import { Cpu, Thermometer, ListTree } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

function formatMemory(kb) {
  if (!kb) return '0 KB';
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function GaugeChart({ value, label, color = '#3b82f6' }) {
  const percentage = Math.min(100, Math.max(0, value || 0));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="gauge-container">
      <svg viewBox="0 0 100 100" className="gauge">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="50" y="50" textAnchor="middle" dy="0.35em" className="gauge-text">
          {percentage.toFixed(1)}%
        </text>
      </svg>
      <span className="gauge-label">{label}</span>
    </div>
  );
}

export default function CpuMetrics({ data, history, processes }) {
  if (!data) {
    return (
      <div className="component-loading">
        <Cpu size={24} />
        <span>Loading CPU metrics...</span>
      </div>
    );
  }

  const getLoadColor = (load) => {
    if (load > 80) return '#ef4444';
    if (load > 60) return '#f59e0b';
    return '#22c55e';
  };

  const topProcesses = processes?.topByCpu?.slice(0, 10) || [];

  return (
    <div className="cpu-metrics">
      <h2><Cpu size={20} /> CPU</h2>

      <div className="cpu-content">
        <div className="cpu-gauges">
          <GaugeChart
            value={data.currentLoad}
            label="Total"
            color={getLoadColor(data.currentLoad)}
          />
          {data.temperature && (
            <div className="cpu-temp">
              <Thermometer size={16} />
              <span>{data.temperature}°C</span>
            </div>
          )}
        </div>

        <div className="cpu-cores">
          <h4>Per-Core Usage</h4>
          <div className="core-bars">
            {data.cpus?.map((load, index) => (
              <div key={index} className="core-bar">
                <div
                  className="core-bar-fill"
                  style={{
                    height: `${load}%`,
                    backgroundColor: getLoadColor(load)
                  }}
                />
                <span className="core-label">{index}</span>
              </div>
            ))}
          </div>
        </div>

        {topProcesses.length > 0 && (
          <div className="panel-processes">
            <h4><ListTree size={14} /> Top Processes by CPU</h4>
            <div className="mini-process-list">
              {topProcesses.map((proc, index) => (
                <div key={`${proc.pid}-${index}`} className="mini-process-row">
                  <span className="mini-process-name" title={proc.command}>{proc.name}</span>
                  <span
                    className="mini-process-value"
                    style={{
                      color: proc.cpu > 50 ? '#ef4444' : proc.cpu > 20 ? '#f59e0b' : 'var(--text-primary)'
                    }}
                  >
                    {proc.cpu?.toFixed(1)}%
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
