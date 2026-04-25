function distance(a, b) {
  return Math.sqrt(
    Math.pow(a.lat - b.lat, 2) +
    Math.pow(a.lng - b.lng, 2)
  );
}

function findBestTeam(lat, lng) {
  const teams = [
    { name: "Team Alpha",   lat: 12.9716, lng: 77.5946, available: true  },
    { name: "Team Bravo",   lat: 12.9616, lng: 77.6046, available: true  },
    { name: "Team Charlie", lat: 12.9816, lng: 77.5846, available: false },
  ];

  let best = null;
  let min  = Infinity;

  for (const t of teams) {
    if (!t.available) continue;
    const d = distance({ lat, lng }, t);
    if (d < min) { min = d; best = t; }
  }

  const eta = best ? Math.max(2, Math.floor(min * 100)) : null;

  return {
    team:   best ? best.name                : "No team available",
    eta:    best ? `${eta} mins`            : "N/A",
    reason: best ? "Closest available team" : "No available teams",
  };
}

module.exports = { findBestTeam };