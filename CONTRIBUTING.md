# Contributing to Orbit

Contributions to Orbit are welcome. This document provides technical guidelines for development, testing, and submission processes.

## Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for containerized deployment)
- Git

## Development Setup

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd orbit

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### Running Locally

Development requires two terminal sessions:

```bash
# Terminal 1: Backend (port 3001)
cd server
npm run dev

# Terminal 2: Frontend (port 5173)
cd client
npm run dev
```

Access the dashboard at `http://localhost:5173`

### Docker Development

```bash
# Build and start services
docker compose up --build

# Restart after code changes
docker compose restart orbit
```

## Testing

### Socket Integration Tests

```bash
# Requires server running on port 3001
npm test
```

### Playwright UI Tests

```bash
# Requires server running on port 3001
npx playwright test

# Run specific test file
npx playwright test tests/dashboard.spec.js

# Interactive mode
npx playwright test --ui
```

**Note:** Playwright is configured to use Firefox by default (`playwright.config.js`) due to GPU compatibility issues with headless Chromium in some environments.

## Code Organization

### Backend Structure (`server/`)

- `src/index.js` - Express + Socket.io server initialization
- `src/metrics/system.js` - CPU, memory, disk, network metrics; host OS detection
- `src/metrics/processes.js` - Process list collection
- `src/metrics/docker.js` - Docker container monitoring via dockerode

### Frontend Structure (`client/`)

- `src/App.jsx` - Main dashboard layout and grid
- `src/hooks/useSocket.js` - WebSocket connection management and state
- `src/components/` - Dashboard UI components:
  - `SystemInfo.jsx` - System information card
  - `CpuMetrics.jsx` - CPU gauge, per-core usage, top CPU processes
  - `MemoryMetrics.jsx` - Memory/swap bars, top memory processes
  - `DiskMetrics.jsx` - Disk partition usage
  - `NetworkMetrics.jsx` - Network interface throughput
  - `DockerContainers.jsx` - Container status and stats
- `src/styles/index.css` - Styling with CSS variables for theming

### Icons

The project uses [Lucide React](https://lucide.dev/) for icons.

## Architecture Notes

### WebSocket Protocol

| Event | Direction | Payload | Frequency |
|-------|-----------|---------|-----------|
| `system:info` | Server → Client | Static system information | On connect |
| `metrics:system` | Server → Client | CPU, memory, disk, network | Every 2s |
| `metrics:processes` | Server → Client | Top processes by CPU/memory | Every 2s |
| `metrics:docker` | Server → Client | Container status and stats | Every 2s |

### Docker Host Access

When running containerized, metrics are collected from the host system via:

- `/hostfs` volume mount → Host root filesystem
- `/host/etc/hostname` volume mount → Host hostname
- `pid: host` → Host process namespace
- `/var/run/docker.sock` volume mount → Docker API

The backend prioritizes `/hostfs/etc/os-release` over `/etc/os-release` to detect the host OS rather than the container's Alpine Linux.

## Coding Standards

### JavaScript Style

- ES6+ syntax
- Async/await for asynchronous operations
- Functional React components with hooks
- Descriptive variable names

### State Management

All dashboard state is managed through the `useSocket` hook:

- `systemInfo` - Static system details (server-cached)
- `systemMetrics` - Real-time CPU, memory, disk, network
- `processes` - Process arrays: `topByCpu`, `topByMem`
- `docker` - Container list with runtime stats
- `metricsHistory` - Rolling 60-point buffer for charts

## Submitting Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-gpu-monitoring`
- `fix/socket-reconnection`
- `docs/update-readme`

### Commit Messages

Follow conventional commit format:
```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process

1. Ensure all tests pass locally
2. Update documentation for user-facing changes
3. Build frontend successfully: `cd client && npm run build`
4. Create PR with clear description of changes
5. Reference related issues if applicable

## Questions and Support

Open an issue for:
- Bug reports (include steps to reproduce)
- Feature requests (describe use case)
- Technical questions about architecture

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
