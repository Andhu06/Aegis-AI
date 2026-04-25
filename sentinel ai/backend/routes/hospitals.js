// ============================================================
//  routes/hospitals.js  –  Hospital Finder via OpenStreetMap
// ============================================================

const express = require("express");
const router  = express.Router();
const { getNearbyHospitals } = require("../services/hospitalService");

/**
 * GET /api/hospitals?lat=12.9716&lng=77.5946
 * Returns up to 5 nearest real hospitals for the given coordinates.
 */
router.get("/", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: "lat and lng query params are required" });
  }

  const latitude  = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ success: false, error: "lat and lng must be valid numbers" });
  }

  try {
    const hospitals = await getNearbyHospitals(latitude, longitude);
    return res.json({ success: true, hospitals });
  } catch (err) {
    console.error("[/api/hospitals]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
