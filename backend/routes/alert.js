// ============================================================
//  routes/alert.js  –  POST /api/alert
//  1. Finds nearest hospitals for given coordinates
//  2. Returns full result summary (SMS removed)
// ============================================================

const express = require("express");
const router  = express.Router();
const { findNearestHospitals } = require("../services/hospitalService");

/**
 * POST /api/alert
 * Body: { lat, lng, type }
 *
 * Response:
 * {
 *   success: true,
 *   disaster: { lat, lng, type },
 *   hospitals: [...]
 * }
 */
router.post("/", async (req, res) => {
  const { lat, lng, type } = req.body;

  // ── Validate ──────────────────────────────────────────────
  if (lat === undefined || lng === undefined || !type) {
    return res.status(400).json({
      success: false,
      error: "Request body must include: lat (number), lng (number), type (string)",
    });
  }

  const latitude  = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ success: false, error: "lat and lng must be valid numbers" });
  }

  const disaster = { lat: latitude, lng: longitude, type };

  try {
    // ── Step 1: Find hospitals ───────────────────────────────
    const hospitals = await findNearestHospitals(latitude, longitude);

    if (!hospitals.length) {
      return res.status(404).json({
        success: false,
        error: "No hospitals found within 10 km of the given coordinates",
      });
    }

    // ── Step 2: Emit via Socket.IO if io is available ───────
    const io = req.app.get("io");
    if (io) {
      io.emit("hospital_alert", {
        disaster,
        hospitals,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({ success: true, disaster, hospitals });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
