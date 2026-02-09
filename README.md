# CloudPulse Monitor

CloudPulse Monitor is a real-time multi-cloud health monitoring dashboard for AWS, Azure, GCP, and on-premise infrastructure.

It provides a unified view of:
- Overall platform health and uptime
- CPU and memory utilization
- Network latency and throughput
- Application/resource status
- Security and performance alerts

This project uses simulated data so you can demo and extend the architecture without needing real cloud credentials. The backend and UI are structured to easily plug in real metrics from CloudWatch, Azure Monitor, GCP Cloud Monitoring, or on-prem systems later.

---

## Features

- **Unified multi-cloud overview**: Aggregated health score, uptime, and utilization across AWS, Azure, GCP, and on-prem.
- **Per-provider health**: Status cards and KPIs for each cloud provider.
- **Resource-level metrics**: Simulated servers/services with CPU, memory, uptime, latency, error rate, and security incident counts.
- **Real-time updates**: WebSocket stream that pushes updated metrics and alerts every few seconds.
- **Alerting**: Threshold-based alerts for availability, performance, errors, and security behavior.
- **Modern dashboard UI**: Responsive layout, dark-themed dashboard, cards, tables, and visual metric bars built with React + TailwindCSS.

---

## Tech Stack

- **Backend**
  - Node.js, TypeScript
  - Express (REST API)
  - Socket.IO (real-time metrics stream)
  - In-memory metric simulator for AWS, Azure, GCP, on-prem

- **Frontend**
  - React + TypeScript
  - Vite (bundler/dev server)
  - TailwindCSS (styling)
  - Socket.IO client (live updates)

---

## Project Structure

```text
CloudVista 360 /
  README.md
  backend /
    package.json
    tsconfig.json
    src /
      index.ts
      config.ts
      types.ts
      data /
        mockProviders.ts
      services /
        metricsService.ts
  frontend /
    package.json
    tsconfig.json
    vite.config.ts
    postcss.config.cjs
    tailwind.config.cjs
    index.html
    src /
      main.tsx
      App.tsx
      index.css
      types.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm or yarn

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Run the backend (API + WebSocket)

```bash
npm run dev
```

The backend will start on `http://localhost:4000` by default.

### 3. Install frontend dependencies

In a new terminal:

```bash
cd frontend
npm install
```

### 4. Run the frontend (dashboard)

```bash
npm run dev
```

The frontend dev server usually runs on `http://localhost:5173`.

The dashboard will automatically connect to the backend API and WebSocket using these defaults.

---

## Configuration

### Backend

Environment variables (optional):

- `PORT`: Port for the backend server (default: `4000`).
- `FRONTEND_ORIGIN`: Allowed CORS/WebSocket origin (default: `http://localhost:5173`).

### Frontend

You can override the backend URLs using a `.env` file in `frontend`:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

---

## How the Simulation Works

- A pool of resources is created across AWS, Azure, GCP, and on-prem.
- Every few seconds the backend updates CPU, memory, latency, error rate, and uptime with small random variations.
- Based on thresholds, each resource is classified as **healthy**, **warning**, or **critical**.
- Alerts are emitted when metrics cross thresholds (e.g., high CPU, degraded uptime, high latency, repeated errors, or security incidents).
- A global health score and per-provider scores are computed and pushed to the frontend via WebSocket.

---

## Extending to Real Cloud Providers

To plug in real data instead of the simulator, you can:

- Replace the simulator in `backend/src/data/mockProviders.ts` with calls to:
  - AWS CloudWatch / CloudWatch Logs
  - Azure Monitor / Log Analytics
  - GCP Cloud Monitoring / Cloud Logging
  - On-prem Prometheus / custom agents
- Map provider-specific metrics into the unified `ResourceMetric` and `Alert` types.
- Optionally persist metrics in a database (e.g., PostgreSQL, TimescaleDB, InfluxDB) and add historical views.

The current structure is intentionally simple but layered so you can demonstrate both architecture and UI/UX in a project or academic setting.
