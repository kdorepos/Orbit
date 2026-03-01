# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orbit is a real-time system monitoring dashboard. It uses Socket.io to push live metrics (CPU, memory, disk, network, processes, Docker containers) from a Node.js/Express backend to a React frontend every 2 seconds.

## Development Commands

### Setup
```bash
cd server && npm install && cd ../client && npm install
```

### Development (requires two terminals)
```bash
# Terminal 1: Backend on :3001 (auto-restarts on changes)
cd server && npm run dev

# Terminal 2: Frontend on :5173 (proxies API/WebSocket to :3001)
cd client && npm run dev
```

### Docker
```bash
docker compose up --build          # Build and run
docker compose restart orbit       # Restart after changes
```

### Testing
```bash
npm test                                          # Socket integration test (server must be running)
npx playwright test                               # All E2E tests (Firefox)
npx playwright test tests/dashboard.spec.js       # Single test file
npx playwright test --ui                          # Interactive mode
```

### Build
```bash
cd client && npm run build    # Output: client/dist/
```

## Architecture

### Monorepo Structure
- `server/` — Express + Socket.io backend (plain JS, ES modules)
- `client/` — React 18 + Vite frontend (plain JS, ES modules)
- `tests/` — Playwright E2E specs and socket integration tests
- Root `package.json` is for test dependencies only

### Backend (`server/src/`)
- `index.js` — Express server, Socket.io setup, REST endpoints (`/api/health`, `/api/system/info`), metrics emission loop (2s interval per client)
- `metrics/system.js` — CPU, memory, disk, network collection. Caches static system info. Reads from `/hostfs/` and `/host/etc/` for accurate host OS detection when running in a container.
- `metrics/processes.js` — Runs `ps` command, filters kernel threads, returns top 10 by CPU and memory
- `metrics/docker.js` — Uses dockerode via `/var/run/docker.sock`. Gracefully returns `available: false` if Docker is inaccessible.

### Frontend (`client/src/`)
- `hooks/useSocket.js` — Single hook managing all app state (connection, system info, metrics, processes, docker). Maintains a 60-point rolling history buffer for charts.
- `components/` — One component per metric category: `SystemInfo`, `CpuMetrics`, `MemoryMetrics`, `DiskMetrics`, `NetworkMetrics`, `DockerContainers`
- `styles/index.css` — Dark theme using CSS variables, 12-column CSS Grid layout
- `App.jsx` — Dashboard grid layout composing all metric components

### WebSocket Events (server → client)
- `system:info` — Static system details, sent on connect
- `metrics:system` — CPU, memory, disk, network stats
- `metrics:processes` — Top processes by CPU/memory, process counts
- `metrics:docker` — Container list with stats, Docker summary

### Key Patterns
- No TypeScript, no linter, no state management library — intentionally simple
- All state flows through `useSocket` hook; components receive data as props from `App.jsx`
- Vite proxy config (`client/vite.config.js`) forwards `/api` and `/socket.io` to backend during development
- Production mode: Express serves built frontend from `../client/dist` with SPA catch-all routing
- Conventional commits: `type(scope): description`
