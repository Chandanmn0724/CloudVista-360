import express, { type Request, type Response } from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { FRONTEND_ORIGIN, PORT, UPDATE_INTERVAL_MS } from "./config";
import { advanceAndGetSnapshot, getCurrentSnapshot } from "./services/metricsService";

const app = express();

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/api/overview", (req: Request, res: Response) => {
  const snapshot = getCurrentSnapshot();
  res.json(snapshot.overview);
});

app.get("/api/providers", (req: Request, res: Response) => {
  const snapshot = getCurrentSnapshot();
  res.json(snapshot.providers);
});

app.get("/api/resources", (req: Request, res: Response) => {
  const snapshot = getCurrentSnapshot();
  const { provider, status } = req.query;

  let resources = snapshot.resources;

  if (typeof provider === "string") {
    resources = resources.filter((r) => r.provider === provider);
  }

  if (typeof status === "string") {
    resources = resources.filter((r) => r.status === status);
  }

  res.json(resources);
});

app.get("/api/alerts", (req: Request, res: Response) => {
  const snapshot = getCurrentSnapshot();
  res.json(snapshot.alerts);
});

app.get("/api/snapshot", (req: Request, res: Response) => {
  const snapshot = getCurrentSnapshot();
  res.json(snapshot);
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
  },
});

io.on("connection", (socket: Socket) => {
  socket.emit("metrics_update", getCurrentSnapshot());
});

setInterval(() => {
  const snapshot = advanceAndGetSnapshot();
  io.emit("metrics_update", snapshot);
}, UPDATE_INTERVAL_MS);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`CloudPulse backend listening on port ${PORT}`);
});
