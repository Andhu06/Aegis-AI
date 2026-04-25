// ============================================================
//  routes/earthquakes.js  –  Earthquake Data Endpoint
//  Fetches recent M4.5+ earthquakes from USGS live feed
// ============================================================

const express = require("express");
const router  = express.Router();

const USGS_URL    = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
const MIN_MAGNITUDE = 4.5;

/**
 * GET /api/earthquakes
 * Returns recent significant (M4.5+) earthquakes from the USGS feed.
 * Optional query params:
 *   ?minMag=<number>   override minimum magnitude (default 4.5)
 *   ?limit=<number>    max number of results to return (default 20)
 */
router.get("/", async (req, res) => {
  const minMag = parseFloat(req.query.minMag) || MIN_MAGNITUDE;
  const limit  = parseInt(req.query.limit, 10) || 20;

  try {
    const response = await fetch(USGS_URL, {
      headers: { "User-Agent": "SentinelAI/1.0 (disaster-response-backend)" },
    });

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const features = data.features ?? [];

    const significant = features
      .filter((f) => (f.properties?.mag ?? 0) >= minMag)
      .slice(0, limit)
      .map((f) => ({
        id:        f.id,
        magnitude: f.properties.mag,
        place:     f.properties.place,
        time:      new Date(f.properties.time).toISOString(),
        url:       f.properties.url,
        lat:       f.geometry?.coordinates?.[1] ?? null,
        lng:       f.geometry?.coordinates?.[0] ?? null,
        depth:     f.geometry?.coordinates?.[2] ?? null,
        status:    f.properties.status,
        tsunami:   f.properties.tsunami === 1,
      }));

    return res.json({
      ok:    true,
      count: significant.length,
      data:  significant,
      meta: {
        source:        "USGS Earthquake Hazards Program",
        feed:          USGS_URL,
        minMagnitude:  minMag,
        fetchedAt:     new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[/api/earthquakes]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
