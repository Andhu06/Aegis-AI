// ============================================================
//  services/earthquakeDetector.js  –  Real-time USGS Earthquake Detection
//  Polls USGS every 30 seconds, triggers alert flow for M4.5+ events
// ============================================================

const { findNearestHospitals } = require("./hospitalService");
const { sendAlertSMS }         = require("./alertService");

const USGS_URL      = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
const POLL_INTERVAL = 30_000;          // 30 seconds
const MIN_MAGNITUDE = 4.5;

// In-memory set of already-processed USGS event IDs
const processedIds = new Set();

// ── Core fetch + filter ────────────────────────────────────────
async function fetchEarthquakes() {
  const res = await fetch(USGS_URL, {
    headers: { "User-Agent": "SentinelAI/1.0 (disaster-response-backend)" },
  });

  if (!res.ok) {
    throw new Error(`USGS API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.features ?? [];
}

// ── Process a single quake feature ────────────────────────────
async function processQuake(feature, io) {
  const id  = feature.id;
  const mag = feature.properties?.mag;
  const place = feature.properties?.place ?? "Unknown location";
  const [lng, lat] = feature.geometry?.coordinates ?? [];

  // Guard: skip if already processed or below threshold
  if (processedIds.has(id))   return;
  if (mag < MIN_MAGNITUDE)    return;
  if (lat == null || lng == null) return;

  processedIds.add(id);

  console.log(`[Earthquake] 🌍 New earthquake detected`);
  console.log(`[Earthquake]    Magnitude : ${mag}`);
  console.log(`[Earthquake]    Location  : ${place}`);
  console.log(`[Earthquake]    Coords    : lat=${lat}, lng=${lng}`);
  console.log(`[Earthquake]    USGS ID   : ${id}`);

  // ── Trigger existing alert flow ──────────────────────────────
  try {
    const hospitals = await findNearestHospitals(lat, lng);

    if (!hospitals.length) {
      console.warn(`[Earthquake] No hospitals found near (${lat}, ${lng}) — skipping SMS`);
      return;
    }

    const alerts = await sendAlertSMS(hospitals, lat, lng, "earthquake");

    console.log(`[Earthquake] ✅ Alerts sent to ${alerts.length} hospital(s) near ${place}`);

    // Emit to all connected WebSocket clients if io is provided
    if (io) {
      io.emit("hospital_alert", {
        disaster: { lat, lng, type: "earthquake" },
        hospitals,
        alerts,
        timestamp: new Date().toISOString(),
        meta: { magnitude: mag, place, usgsId: id },
      });
    }
  } catch (err) {
    console.error(`[Earthquake] ❌ Alert flow failed for ${id}: ${err.message}`);
  }
}

// ── Main polling loop ──────────────────────────────────────────
async function pollEarthquakes(io) {
  try {
    const features = await fetchEarthquakes();
    const significant = features.filter(
      (f) => (f.properties?.mag ?? 0) >= MIN_MAGNITUDE
    );

    if (significant.length === 0) {
      console.log(`[Earthquake] Poll complete — no M${MIN_MAGNITUDE}+ events this cycle`);
      return;
    }

    console.log(`[Earthquake] Poll found ${significant.length} M${MIN_MAGNITUDE}+ event(s) in last hour`);

    // Process sequentially to avoid hammering the SMS provider
    for (const feature of significant) {
      await processQuake(feature, io);
    }
  } catch (err) {
    console.error(`[Earthquake] Poll error: ${err.message}`);
  }
}

// ── Start detector — call once from server.js ─────────────────
function startEarthquakeDetector(io) {
  console.log(`[Earthquake] 🚀 Detector started — polling every ${POLL_INTERVAL / 1000}s (threshold M${MIN_MAGNITUDE}+)`);

  // Run immediately on startup, then on interval
  pollEarthquakes(io);
  setInterval(() => pollEarthquakes(io), POLL_INTERVAL);
}

module.exports = { startEarthquakeDetector };
