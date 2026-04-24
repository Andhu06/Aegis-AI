// Uses native fetch (Node 18+)

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findNearestHospitals(lat, lng) {
  const radius = 10000;

  const amenities = ["hospital", "clinic", "doctors", "nursing_home", "health_centre"];

  // Build union of node/way/relation for each amenity type
  const union = amenities
    .flatMap((type) => [
      `node["amenity"="${type}"](around:${radius},${lat},${lng});`,
      `way["amenity"="${type}"](around:${radius},${lat},${lng});`,
      `relation["amenity"="${type}"](around:${radius},${lat},${lng});`,
    ])
    .join("");

  const query = `[out:json][timeout:30];(${union});out center;`;

  const ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  let res;
  for (const url of ENDPOINTS) {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "SentinelAI/1.0 (disaster-response-backend)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (res.ok) break;
  }

  if (!res || !res.ok) {
    const text = await res?.text?.() ?? "no response";
    throw new Error(`Overpass API error: ${res?.status} ${text}`);
  }

  const data = await res.json();

  // Deduplicate by name+lat+lng key
  const seen = new Set();

  const hospitals = data.elements
    .map((h) => {
      const elat = h.lat ?? h.center?.lat;
      const elng = h.lon ?? h.center?.lon;
      const name = h.tags?.name || "Unnamed Facility";
      const type = h.tags?.amenity || "hospital";
      return { name, lat: elat, lng: elng, type };
    })
    .filter((h) => {
      if (h.lat == null || h.lng == null) return false;
      const key = `${h.name}|${h.lat.toFixed(4)}|${h.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((h) => ({
      ...h,
      _dist: haversineDistance(lat, lng, h.lat, h.lng),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, 25)
    .map(({ _dist, ...h }) => h); // strip internal distance field

  return hospitals;
}

module.exports = { findNearestHospitals };
