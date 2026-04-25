// ============================================================
//  agents/pipeline.js  –  Agentic pipeline (5 agents)
//  Emits real-time WebSocket events progressively
// ============================================================

const { getState, updateStats, addLog, addSMS, setPipelineRunning, deployVolunteer } = require("../data/state");
const { VOLUNTEERS, SMS_TEMPLATES } = require("../data/mockData");

// ── Helpers ──────────────────────────────────────────────────

function now() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Haversine distance in km
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function emitLog(io, entry) {
  addLog(entry);
  io.emit("agent_log", entry);
}

// ── Agent 1: Sentinel Agent ──────────────────────────────────
async function runSentinelAgent(io) {
  const state = getState();

  emitLog(io, {
    time: now(),
    agent: "Sentinel Agent",
    cls: "sentinel",
    msg: "Real-time data anomaly detected from NOAA sensors",
  });

  await delay(900);

  emitLog(io, {
    time: now(),
    agent: "Sentinel Agent",
    cls: "sentinel",
    msg: `Flood event confirmed: ${state.incident.location} — Type: ${state.incident.type.toUpperCase()}`,
  });

  await delay(800);

  emitLog(io, {
    time: now(),
    agent: "Sentinel Agent",
    cls: "sentinel",
    msg: `River level: Pamba ${state.incident.riverLevel} above danger mark`,
  });

  await delay(700);

  // Emit map update with incident zone
  io.emit("map_update", {
    type: "incident_confirmed",
    incident: state.incident,
    volunteers: state.volunteers,
    resources: state.resources,
  });

  return state.incident;
}

// ── Agent 2: Severity Engine ─────────────────────────────────
async function runSeverityEngine(io, incident) {
  emitLog(io, {
    time: now(),
    agent: "Severity Engine",
    cls: "calc",
    msg: "Ingesting sensor telemetry: rainfall, wind, population density…",
  });

  await delay(1000);

  // Mock severity calculation
  const severityScore = parseFloat(
    (7.5 + Math.random() * 1.5).toFixed(1)
  );

  emitLog(io, {
    time: now(),
    agent: "Severity Engine",
    cls: "calc",
    msg: `Severity score calculated: ${severityScore}/10 — Classification: CRITICAL`,
  });

  await delay(600);

  emitLog(io, {
    time: now(),
    agent: "Severity Engine",
    cls: "calc",
    msg: `Estimated people at risk: ${(24000 + Math.floor(Math.random() * 2000)).toLocaleString()} in affected radius`,
  });

  // Bump stats
  updateStats({ peopleAtRisk: 24453 + Math.floor(Math.random() * 500) });
  io.emit("stats_update", getState().stats);

  return severityScore;
}

// ── Agent 3: Resource Matcher ─────────────────────────────────
async function runResourceMatcher(io, incident) {
  emitLog(io, {
    time: now(),
    agent: "Resource Matcher",
    cls: "resource",
    msg: "Scanning volunteer database for nearest available units…",
  });

  await delay(1100);

  // Sort volunteers by distance to incident
  const sorted = [...VOLUNTEERS]
    .map((v) => ({
      ...v,
      dist: distKm(incident.lat, incident.lng, v.lat, v.lng),
    }))
    .sort((a, b) => a.dist - b.dist);

  const selected = sorted.slice(0, 8);

  emitLog(io, {
    time: now(),
    agent: "Resource Matcher",
    cls: "resource",
    msg: `Found ${selected.length} volunteers within ${Math.ceil(selected[selected.length - 1].dist)} km radius`,
  });

  await delay(700);

  // Mark as deployed
  selected.forEach((v) => deployVolunteer(v.id));

  // Build routes from incident center to each selected volunteer
  const routes = selected.map((v) => ({
    from: [incident.lat, incident.lng],
    to: [v.lat, v.lng],
    volunteer: v.name,
    dist: v.dist.toFixed(1),
  }));

  emitLog(io, {
    time: now(),
    agent: "Resource Matcher",
    cls: "resource",
    msg: `Route optimisation complete — dispatching Team Alpha (${selected[0].name})`,
  });

  await delay(600);

  // Update stats
  updateStats({
    volunteersActive: 312 + selected.length,
    resourcesDeployed: 128 + Math.floor(selected.length * 1.5),
  });
  io.emit("stats_update", getState().stats);

  io.emit("map_update", {
    type: "routes_ready",
    routes,
    deployedVolunteers: selected,
  });

  return selected;
}

// ── Agent 4: Comms Agent ──────────────────────────────────────
async function runCommsAgent(io, volunteers) {
  emitLog(io, {
    time: now(),
    agent: "Comms Agent",
    cls: "comms",
    msg: `Preparing SMS dispatch for ${volunteers.length} volunteers…`,
  });

  await delay(800);

  let delivered = 0;

  for (let i = 0; i < volunteers.length; i++) {
    await delay(350 + Math.random() * 200);

    const zone = Math.floor(Math.random() * 5) + 1;
    const template = SMS_TEMPLATES[i % SMS_TEMPLATES.length];
    const msgText = template(zone, volunteers[i].phone);
    const status = Math.random() > 0.12 ? "DELIVERED" : "SENT";
    if (status === "DELIVERED") delivered++;

    const sms = {
      time: (() => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
      })(),
      to: `To: ${volunteers[i].phone}`,
      msg: msgText,
      status,
      volunteer: volunteers[i].name,
    };

    addSMS(sms);
    io.emit("sms_update", sms);
  }

  await delay(500);

  emitLog(io, {
    time: now(),
    agent: "Comms Agent",
    cls: "comms",
    msg: `SMS delivery confirmed: ${delivered}/${volunteers.length} volunteers — Pipeline complete`,
  });

  // Final stats bump
  updateStats({
    livesImpacted: getState().stats.livesImpacted + Math.floor(Math.random() * 50) + 20,
  });
  io.emit("stats_update", getState().stats);
}

// ── Agent 5: Triage Agent (see /routes/chat.js) ──────────────
// Chat is handled per-request via POST /chat

// ── Master pipeline runner ─────────────────────────────────────
async function runPipeline(io) {
  const state = getState();
  if (state.pipelineRunning) {
    io.emit("agent_log", {
      time: now(),
      agent: "Sentinel Agent",
      cls: "sentinel",
      msg: "⚠️  Pipeline already running — ignoring duplicate trigger",
    });
    return;
  }

  setPipelineRunning(true);

  try {
    io.emit("agent_log", {
      time: now(),
      agent: "Sentinel Agent",
      cls: "sentinel",
      msg: "══════ SENTINEL AI PIPELINE STARTED ══════",
    });

    // Step 1
    const incident = await runSentinelAgent(io);
    await delay(600);

    // Step 2
    const severity = await runSeverityEngine(io, incident);
    await delay(600);

    // Step 3
    const volunteers = await runResourceMatcher(io, incident);
    await delay(600);

    // Step 4
    await runCommsAgent(io, volunteers);
    await delay(400);

    emitLog(io, {
      time: now(),
      agent: "Triage Agent",
      cls: "triage",
      msg: "Triage chat session initialised — accepting incoming queries",
    });

    await delay(500);

    emitLog(io, {
      time: now(),
      agent: "Triage Agent",
      cls: "triage",
      msg: "3 survivors reporting symptoms — AI triage active",
    });

    io.emit("agent_log", {
      time: now(),
      agent: "Sentinel Agent",
      cls: "sentinel",
      msg: "══════ ALL AGENTS OPERATIONAL ══════",
    });
  } catch (err) {
    console.error("[Pipeline Error]", err.message);
    io.emit("agent_log", {
      time: now(),
      agent: "Sentinel Agent",
      cls: "sentinel",
      msg: `Pipeline error: ${err.message}`,
    });
  } finally {
    setPipelineRunning(false);
  }
}

// ── Continuous background stat ticker ─────────────────────────
function startStatsTicker(io) {
  setInterval(() => {
    const s = getState().stats;
    updateStats({
      peopleAtRisk: s.peopleAtRisk + Math.floor(Math.random() * 50) + 5,
      volunteersActive: s.volunteersActive + Math.floor(Math.random() * 3),
      resourcesDeployed: s.resourcesDeployed + Math.floor(Math.random() * 2),
      livesImpacted: s.livesImpacted + Math.floor(Math.random() * 20) + 5,
    });
    io.emit("stats_update", getState().stats);
  }, 5000);
}

// ── Continuous background log ticker ──────────────────────────
const BACKGROUND_LOGS = [
  { agent: "Sentinel Agent",   cls: "sentinel", msgs: [
    "River gauge at Mankombu: +1.8m, rising",
    "Satellite imagery updated — flood extent +12%",
    "NOAA rainfall forecast: 180mm next 6h",
    "Wind speed: 42 km/h NE — boats on alert",
  ]},
  { agent: "Resource Matcher", cls: "resource", msgs: [
    "Re-routing Team Bravo via NH-66",
    "Medical van 3 reached checkpoint Alpha",
    "Drone survey complete — zone 4 accessible",
    "Supply convoy ETA updated: 7 minutes",
  ]},
  { agent: "Comms Agent",      cls: "comms",    msgs: [
    "Broadcast sent to all field units",
    "District Collector notified via priority line",
    "Radio relay active on frequency 156.8 MHz",
    "WhatsApp alerts sent to 1,240 registered families",
  ]},
  { agent: "Triage Agent",     cls: "triage",   msgs: [
    "New chat session: survivor at Ward 7",
    "AI assessed: non-critical, redirected to camp",
    "Medical query resolved — 94% confidence",
    "Connecting survivor to on-ground medic",
  ]},
];

function startLogTicker(io) {
  setInterval(() => {
    const src = BACKGROUND_LOGS[Math.floor(Math.random() * BACKGROUND_LOGS.length)];
    const msg = src.msgs[Math.floor(Math.random() * src.msgs.length)];
    const entry = { time: now(), agent: src.agent, cls: src.cls, msg };
    addLog(entry);
    io.emit("agent_log", entry);
  }, 3500);
}

// ── Continuous SMS ticker ──────────────────────────────────────
const LIVE_SMS_MESSAGES = [
  "Proceeding to zone 4. ETA 8 mins.",
  "Medical supplies loaded. En route.",
  "Boat crew dispatched from Kottayam.",
  "Water purification unit activated.",
  "Evacuation complete: 12 families.",
  "Team Bravo checked in at camp.",
  "Requesting additional stretchers at zone 2.",
  "Power restored at medical camp — equipment online.",
];

const PHONES = ["98765 12345","91234 98765","77665 11234","88990 55443","66778 34521"];

function startSmsTicker(io) {
  setInterval(() => {
    const d = new Date();
    const sms = {
      time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} ${d.getHours() >= 12 ? "PM" : "AM"}`,
      to: `To: +91 ${PHONES[Math.floor(Math.random() * PHONES.length)]}`,
      msg: LIVE_SMS_MESSAGES[Math.floor(Math.random() * LIVE_SMS_MESSAGES.length)],
      status: Math.random() > 0.3 ? "DELIVERED" : "SENT",
    };
    addSMS(sms);
    io.emit("sms_update", sms);
  }, 4000);
}

module.exports = { runPipeline, startStatsTicker, startLogTicker, startSmsTicker };
