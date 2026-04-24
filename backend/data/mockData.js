// ============================================================
//  data/mockData.js  –  All static seed data for Sentinel AI
// ============================================================

const INCIDENT = {
  id: "INC-2024-0730-001",
  name: "Kerala Floods 2024",
  type: "flood",
  location: "Alappuzha, Kerala",
  lat: 9.4981,
  lng: 76.3388,
  severity: 8.7,
  status: "CRITICAL",
  timestamp: new Date().toISOString(),
  affectedRadius: 18000,   // metres
  riverLevel: "+2.1m",
  source: "NOAA Real-time Sensors",
};

const VOLUNTEERS = [
  { id: "V01", name: "Team Alpha Lead",  lat: 9.52, lng: 76.42, skill: "Search & Rescue",  phone: "+91 98765 43210" },
  { id: "V02", name: "Rajan K.",         lat: 9.50, lng: 76.48, skill: "Medical",          phone: "+91 91234 56789" },
  { id: "V03", name: "Meera P.",         lat: 9.55, lng: 76.40, skill: "Logistics",        phone: "+91 99987 66554" },
  { id: "V04", name: "Arun S.",          lat: 9.58, lng: 76.52, skill: "Boat Operator",    phone: "+91 88991 12233" },
  { id: "V05", name: "Deepa V.",         lat: 9.46, lng: 76.36, skill: "First Aid",        phone: "+91 77665 44332" },
  { id: "V06", name: "Suresh N.",        lat: 9.44, lng: 76.44, skill: "Communication",    phone: "+91 66778 99001" },
  { id: "V07", name: "Priya M.",         lat: 9.62, lng: 76.46, skill: "Evacuation",       phone: "+91 98765 12345" },
  { id: "V08", name: "Vijay T.",         lat: 9.40, lng: 76.38, skill: "Water Rescue",     phone: "+91 91234 98765" },
  { id: "V09", name: "Latha R.",         lat: 9.56, lng: 76.56, skill: "Medical",          phone: "+91 77665 11234" },
  { id: "V10", name: "Mohan D.",         lat: 9.48, lng: 76.60, skill: "Logistics",        phone: "+91 88990 55443" },
  { id: "V11", name: "Sindhu A.",        lat: 9.64, lng: 76.38, skill: "First Aid",        phone: "+91 66778 34521" },
  { id: "V12", name: "Rahul B.",         lat: 9.38, lng: 76.50, skill: "Boat Operator",    phone: "+91 98123 45678" },
  { id: "V13", name: "Geetha C.",        lat: 9.54, lng: 76.34, skill: "Counselling",      phone: "+91 91876 54321" },
  { id: "V14", name: "Bijoy K.",         lat: 9.42, lng: 76.54, skill: "Search & Rescue",  phone: "+91 77234 56789" },
  { id: "V15", name: "Anjali M.",        lat: 9.66, lng: 76.44, skill: "Evacuation",       phone: "+91 88765 43210" },
];

const RESOURCES = [
  { id: "R01", name: "Relief Camp A",     lat: 9.51, lng: 76.45, type: "camp",       count: 3,  unit: "camps"   },
  { id: "R02", name: "Medical Unit 1",    lat: 9.47, lng: 76.41, type: "medical",    count: 12, unit: "kits"    },
  { id: "R03", name: "Supply Depot",      lat: 9.55, lng: 76.50, type: "supply",     count: 48, unit: "packs"   },
  { id: "R04", name: "Boat Station",      lat: 9.43, lng: 76.47, type: "boat",       count: 7,  unit: "boats"   },
  { id: "R05", name: "Helicopter Pad",    lat: 9.59, lng: 76.38, type: "heli",       count: 2,  unit: "helis"   },
  { id: "R06", name: "Water Purifier",    lat: 9.45, lng: 76.57, type: "water",      count: 5,  unit: "units"   },
];

const DEPLOYMENTS = [
  {
    id: "DEP-001",
    name: "Team Alpha",
    emoji: "🚁",
    sub: "Search & Rescue · 8 members",
    status: "enroute",
    progress: 68,
    eta: "ETA 4 min",
  },
  {
    id: "DEP-002",
    name: "Medical Unit 2",
    emoji: "🏥",
    sub: "Field Medics · 5 members",
    status: "arrived",
    progress: 100,
    eta: "Arrived",
  },
];

const SMS_TEMPLATES = [
  (zone, phone) => `ALERT: Deploy to zone ${zone}, Alappuzha. Bring 10 water kits. – Sentinel AI`,
  (zone, phone) => `URGENT: Flood victims in zone ${zone} need evacuation. Proceed immediately. – Sentinel AI`,
  (zone, phone) => `DISPATCH: Medical supplies needed at zone ${zone}. ETA under 15 mins. – Sentinel AI`,
  (zone, phone) => `NOTICE: Boat crew dispatched to zone ${zone}. Rendezvous at Kottayam jetty. – Sentinel AI`,
  (zone, phone) => `UPDATE: Water purification unit activated for zone ${zone}. Coordination confirmed. – Sentinel AI`,
];

const MOCK_AI_RESPONSES = [
  {
    reply: "You may be experiencing dehydration symptoms.\nPlease drink clean water and rest in an elevated area. If dizziness persists for more than 20 minutes, signal for medical assistance.",
    confidence: 87,
  },
  {
    reply: "Help is en route to your coordinates. Stay on the second floor or higher ground.\nAvoid contact with floodwater — it may carry contaminants and electrical hazards.",
    confidence: 92,
  },
  {
    reply: "Medical team has been alerted and is 8 minutes from your location.\nKeep calm. Signal responders using a bright cloth from your window.",
    confidence: 79,
  },
  {
    reply: "First aid kit is confirmed at the relief camp 200m north.\nA trained volunteer will reach you within 12 minutes. Stay visible.",
    confidence: 84,
  },
  {
    reply: "Evacuation route via NH-66 is clear. Proceed south toward Kottayam bypass.\nTeam Alpha has been alerted to escort your group.",
    confidence: 88,
  },
];

module.exports = {
  INCIDENT,
  VOLUNTEERS,
  RESOURCES,
  DEPLOYMENTS,
  SMS_TEMPLATES,
  MOCK_AI_RESPONSES,
};
