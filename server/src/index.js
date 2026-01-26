import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSystemMetrics, getStaticSystemInfo, getSystemStatus } from './metrics/system.js';
import { getProcessList } from './metrics/processes.js';
import { getDockerInfo } from './metrics/docker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static files in production
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/system/info', async (req, res) => {
  try {
    const info = await getStaticSystemInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial static system info with status
  try {
    const staticInfo = await getStaticSystemInfo();
    const systemStatus = getSystemStatus();
    socket.emit('system:info', { ...staticInfo, status: systemStatus });
  } catch (error) {
    console.error('Error getting static system info:', error);
  }

  // Set up metrics emission interval
  const metricsInterval = setInterval(async () => {
    try {
      const [systemMetrics, processes, docker] = await Promise.all([
        getSystemMetrics(),
        getProcessList(),
        getDockerInfo()
      ]);

      socket.emit('metrics:system', systemMetrics);
      socket.emit('metrics:processes', processes);
      socket.emit('metrics:docker', docker);
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }, 2000);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    clearInterval(metricsInterval);
  });
});

// Catch-all for SPA routing in production
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Orbit server running on port ${PORT}`);
});
