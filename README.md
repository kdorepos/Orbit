# Orbit

A real-time system monitoring dashboard that displays live performance metrics, process information, and Docker container status through an intuitive web interface.

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![React](https://img.shields.io/badge/React-18-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## Features

- **System Information** - OS details, hostname, CPU model, architecture, uptime
- **CPU Metrics** - Real-time usage gauge, per-core utilization, historical chart, temperature
- **Memory Metrics** - RAM and swap usage with detailed breakdown
- **Disk Metrics** - Per-partition usage with mount points
- **Network Metrics** - Interface throughput (RX/TX) with totals
- **Process List** - Top processes sorted by CPU or memory usage
- **Docker Containers** - Container status, resource usage, port mappings

All metrics update every 2 seconds via WebSocket for a responsive, real-time experience.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express, Socket.io |
| Frontend | React, Vite, Recharts |
| Icons | Lucide React |
| System Metrics | systeminformation |
| Docker Integration | dockerode |
| Styling | CSS with dark theme |

## Quick Start

### Docker Hub Deployment (Recommended)

The easiest way to run Orbit is by pulling the image from [Docker Hub](https://hub.docker.com/r/orbitmonitor/orbit) and running with Docker Compose.

```
services:
  orbit:
    image: orbitmonitor/orbit:latest
    container_name: orbit
    ports:
      - "3001:3001"
    volumes:
      # Mount Docker socket to enable container monitoring
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Mount host's /etc/hostname to read actual hostname
      - /etc/hostname:/host/etc/hostname:ro
      # Mount host root filesystem to monitor disk usage
      - /:/hostfs:ro
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    # Required for accessing host system metrics
    pid: host
    # Allows reading system information
    privileged: false
    security_opt:
      - no-new-privileges:true
```
Open http://localhost:3001 in your browser.

### Build it Yourself

```bash
# Clone the repository
git clone https://github.com/kdorepos/Orbit.git
cd Orbit

# Build and run with Docker Compose
docker compose up --build
```

Open http://localhost:3001 in your browser.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |

### Docker Socket Access

To monitor Docker containers, the Docker socket must be mounted:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

If Docker monitoring isn't needed, the dashboard will gracefully show a "Docker Not Available" message.

### Host System Metrics

For accurate system metrics when running in Docker, the container uses:

```yaml
pid: host  # Access to host process information
```

## API Endpoints

### REST API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/system/info` | Static system information |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `system:info` | Server → Client | Static system info (on connect) |
| `metrics:system` | Server → Client | CPU, memory, disk, network (every 2s) |
| `metrics:processes` | Server → Client | Top processes (every 2s) |
| `metrics:docker` | Server → Client | Docker containers (every 2s) |

## Security Considerations

- The Docker socket mount provides read-only access (`ro` flag)
- No authentication is included by default - add a reverse proxy with auth for public deployments
- The container runs with `no-new-privileges` security option
- Consider network isolation if exposing to untrusted networks
