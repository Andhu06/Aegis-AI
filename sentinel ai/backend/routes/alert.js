// ============================================================
//  routes/alert.js  –  POST /api/alert
// ============================================================

const express = require("express");
const router  = express.Router();
const { findNearestHospitals } = require("../services/hospitalService");
const { findBestTeam }         = require("../services/resourceAllocator");

router.post("/", async (req, res) => {
  const { lat, lng, type } = req.body;

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
    console.log(`[Alert] Finding hospitals near (${latitude}, ${longitude})`);
    const hospitals = await findNearestHospitals(latitude, longitude);

    if (!hospitals.length) {
      return res.status(404).json({
        success: false,
        error: "No hospitals found within 10 km of the given coordinates",
      });
    }

    console.log(`[Alert] Found ${hospitals.length} hospital(s). Nearest: "${hospitals[0].name}"`);

    const allocation = findBestTeam(latitude, longitude);
    console.log(`[Alert] Team allocated: "${allocation.team}" | ETA: ${allocation.eta} | Reason: ${allocation.reason}`);

    const io = req.app.get("io");
    if (io) {
      io.emit("hospital_alert", { disaster, hospitals, allocation, timestamp: new Date().toISOString() });
      io.emit("team_allocated", { disaster, ...allocation, timestamp: new Date().toISOString() });
    }

    return res.json({ success: true, disaster, hospitals, allocation });

  } catch (err) {
    console.error("[Alert] ❌ Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
