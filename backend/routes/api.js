// ============================================================
//  routes/api.js  –  REST endpoints
// ============================================================

const express = require("express");
const router = express.Router();
const { getState, resetState } = require("../data/state");
const { runPipeline } = require("../agents/pipeline");

// ── GET /state ────────────────────────────────────────────────
// Returns full current system state snapshot
router.get("/state", (req, res) => {
  const state = getState();
  res.json({
    ok: true,
    data: {
      incident: state.incident,
      stats: state.stats,
      volunteers: state.volunteers,
      resources: state.resources,
      deployments: state.deployments,
      logs: state.logs.slice(0, 20),
      smslogs: state.smslogs.slice(0, 10),
      pipelineRunning: state.pipelineRunning,
      lastUpdated: state.lastUpdated,
    },
  });
});

// ── POST /start-demo ──────────────────────────────────────────
// Triggers the full 5-agent pipeline (non-blocking)
router.post("/start-demo", (req, res) => {
  const io = req.app.get("io");

  if (!io) {
    return res.status(500).json({ ok: false, error: "WebSocket not initialised" });
  }

  // Fire-and-forget — pipeline runs async
  runPipeline(io).catch((err) =>
    console.error("[Pipeline uncaught]", err.message)
  );

  res.json({
    ok: true,
    message: "Sentinel AI pipeline started — watch WebSocket for live events",
    pipelineId: `PIPE-${Date.now()}`,
  });
});

// ── POST /reset ───────────────────────────────────────────────
// Resets state to initial values (useful for demos)
router.post("/reset", (req, res) => {
  resetState();
  res.json({ ok: true, message: "State reset to initial values" });
});

// ── GET /health ───────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Sentinel AI Backend",
    status: "OPERATIONAL",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
