// ============================================================
//  server.js  –  Sentinel AI Backend Entry Point
//  Express + Socket.IO + Agent Pipeline
// ============================================================

require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");
const path       = require("path");

const apiRoutes  = require("./routes/api");
const chatRoutes = require("./routes/chat");
const { startStatsTicker, startLogTicker, startSmsTicker } = require("./agents/pipeline");

// ── App setup ─────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Serve the frontend HTML directly from /public (or / if a frontend
// file is placed alongside server.js)
app.use(express.static(path.join(__dirname, "public")));

// ── Socket.IO setup ────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
  // Allow transport fallback
  transports: ["websocket", "polling"],
});

// Make io accessible inside route handlers via req.app.get("io")
app.set("io", io);

// ── WebSocket connection handler ───────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send current state snapshot immediately on connect
  const { getState } = require("./data/state");
  const state = getState();

  socket.emit("init_state", {
    incident:    state.incident,
    stats:       state.stats,
    volunteers:  state.volunteers,
    resources:   state.resources,
    deployments: state.deployments,
    logs:        state.logs.slice(0, 20),
    smslogs:     state.smslogs.slice(0, 10),
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WS] Client disconnected: ${socket.id} — ${reason}`);
  });

  // Allow client to manually trigger demo from socket
  socket.on("trigger_demo", () => {
    const { runPipeline } = require("./agents/pipeline");
    runPipeline(io).catch((e) => console.error("[Pipeline socket trigger]", e.message));
  });
});

// ── REST Routes ────────────────────────────────────────────────
app.use("/", apiRoutes);    // GET /state, POST /start-demo, POST /reset, GET /health
app.use("/chat", chatRoutes); // POST /chat

// ── Background tickers ────────────────────────────────────────
// These keep the UI alive with live data even without a pipeline run
startStatsTicker(io);
startLogTicker(io);
startSmsTicker(io);

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
║  Mode  → ${process.env.ANTHROPIC_API_KEY ? "Claude API (LIVE)" : "Mock AI (no API key)       "}       ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
