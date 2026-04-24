// ============================================================
//  routes/earthquakes.js  –  Proxy USGS earthquake feed
// ============================================================

const express = require("express");
const router  = express.Router();

// USGS real-time feed — significant earthquakes, past 7 days
const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";

// Fallback mock data if USGS is unreachable
const MOCK_EVENTS = [
  {
    id: "mock-001",
    magnitude: 5.2,
    place: "Southern Kerala, India",
    lat: 9.4981,
    lng: 76.3388,
    time: new Date().toISOString(),
  },
];

router.get("/", async (req, res) => {
  try {
    const response = await fetch(USGS_URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);

    const data = await response.json();

    const events = (data.features || []).map((f) => ({
      id:        f.id,
      magnitude: f.properties.mag,
      place:     f.properties.place,
      lat:       f.geometry.coordinates[1],
      lng:       f.geometry.coordinates[0],
      time:      new Date(f.properties.time).toISOString(),
    }));

    return res.json(events.length > 0 ? events : MOCK_EVENTS);
  } catch (err) {
    console.warn("[earthquakes] USGS fetch failed:", err.message, "— using mock data");
    return res.json(MOCK_EVENTS);
  }
});

module.exports = router;
