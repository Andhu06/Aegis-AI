// ============================================================
//  server.js  –  Sentinel AI Backend Entry Point
//  dotenv MUST be first — before any require that reads process.env
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

console.log("SMS system removed - using backend only");

// ── BOOT ENV CHECK ─────────────────────────────────────────────
console.log("=== BOOT ENV CHECK ===");
console.log("WORKING DIR     :", process.cwd());
console.log("__dirname       :", __dirname);
console.log("ENV FILE        :", path.resolve(__dirname, ".env"));
console.log("======================");

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");

const apiRoutes              = require("./routes/api");
const chatRoutes             = require("./routes/chat");
const hospitalRoutes         = require("./routes/hospitals");
const alertRoutes            = require("./routes/alert");
const earthquakeRoutes       = require("./routes/earthquakes");
const { startStatsTicker, startLogTicker } = require("./agents/pipeline");
const { startEarthquakeDetector }          = require("./services/earthquakeDetector");

// ── App setup ─────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Socket.IO setup ────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

app.set("io", io);

// ── WebSocket connection handler ───────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  const { getState } = require("./data/state");
  const state = getState();

  socket.emit("init_state", {
    incident:    state.incident,
    stats:       state.stats,
    volunteers:  state.volunteers,
    resources:   state.resources,
    deployments: state.deployments,
    logs:        state.logs.slice(0, 20),
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WS] Client disconnected: ${socket.id} — ${reason}`);
  });

  socket.on("trigger_demo", () => {
    const { runPipeline } = require("./agents/pipeline");
    runPipeline(io).catch((e) => console.error("[Pipeline socket trigger]", e.message));
  });
});

// ── REST Routes ────────────────────────────────────────────────
app.use("/", apiRoutes);
app.use("/chat", chatRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/alert", alertRoutes);
app.use("/api/earthquakes", earthquakeRoutes);

// ── Background tickers ────────────────────────────────────────
startStatsTicker(io);
startLogTicker(io);
startEarthquakeDetector(io);

// ── Start ──────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       SENTINEL AI BACKEND — ONLINE           ║
╠══════════════════════════════════════════════╣
║  HTTP  → http://localhost:${PORT}              ║
║  WS    → ws://localhost:${PORT}                ║
║  API   → POST /start-demo                    ║
║          POST /chat                          ║
║          GET  /state                         ║
║          GET  /health                        ║
║          GET  /api/hospitals?lat=&lng=       ║
║          POST /api/alert                     ║
║          GET  /api/earthquakes               ║
║  Mode  → ${process.env.ANTHROPIC_API_KEY ? "Claude API (LIVE)" : "Mock AI (no API key)"}  ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
