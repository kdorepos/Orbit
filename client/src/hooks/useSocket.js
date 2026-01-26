import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [processes, setProcesses] = useState(null);
  const [docker, setDocker] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('system:info', (data) => {
      setSystemInfo(data);
    });

    socket.on('metrics:system', (data) => {
      setSystemMetrics(data);
      setMetricsHistory(prev => {
        const updated = [...prev, {
          timestamp: data.timestamp,
          cpu: data.cpu.currentLoad,
          memory: data.memory.usePercent
        }];
        // Keep last 60 data points (2 minutes at 2s intervals)
        return updated.slice(-60);
      });
    });

    socket.on('metrics:processes', (data) => {
      setProcesses(data);
    });

    socket.on('metrics:docker', (data) => {
      setDocker(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    isConnected,
    systemInfo,
    systemMetrics,
    processes,
    docker,
    metricsHistory
  };
}
