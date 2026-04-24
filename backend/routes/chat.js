// ============================================================
//  routes/chat.js  –  Emergency AI Assistant  (POST /chat)
//  Powered by Groq for intent-based triage, ETA, hospital, and general advice
// ============================================================

const express = require("express");
const router  = express.Router();
const { addMessage, getState } = require("../data/state");
const { MOCK_AI_RESPONSES }    = require("../data/mockData");
const { findNearestHospitals } = require("../services/hospitalService");

let mockIdx = 0;

// ── GROQ CONFIG ────────────────────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.1-8b-instant"; // fast, free-tier, actively supported

// ── INTENT DETECTION ───────────────────────────────────────────
/**
 * Detects user intent from message keywords.
 * Returns one of: "TRIAGE" | "ETA" | "HOSPITAL" | "GENERAL"
 */
function detectIntent(message) {
  const msg = message.toLowerCase();

  const triageKeywords   = ["injury", "injured", "pain", "bleeding", "wound", "hurt", "broken", "unconscious", "breathing", "chest", "fracture", "burn", "allergic", "seizure", "stroke", "faint", "dizzy", "vomit", "fever", "swollen", "cut", "bite", "sting"];
  const etaKeywords      = ["when", "how long", "eta", "arrive", "coming", "wait", "time", "minutes", "hours", "rescue", "team"];
  const hospitalKeywords = ["hospital", "clinic", "medical center", "nearest", "nearby", "doctor", "ambulance", "emergency room", "er", "where"];

  if (triageKeywords.some(k => msg.includes(k)))   return "TRIAGE";
  if (etaKeywords.some(k => msg.includes(k)))       return "ETA";
  if (hospitalKeywords.some(k => msg.includes(k)))  return "HOSPITAL";
  return "GENERAL";
}

// ── GROQ API CALLER ────────────────────────────────────────────
async function callGroq(systemPrompt, userMessage) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      temperature: 0.3,
      max_tokens:  400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ── STEP 2: TRIAGE ─────────────────────────────────────────────
async function handleTriage(message) {
  const system = `You are an emergency medical triage assistant deployed during a disaster response operation.
Your job: assess the situation from the user's description, classify severity, and give clear actionable steps.

RULES:
- Be concise and calm. No fluff.
- Always classify severity as: CRITICAL / HIGH / MODERATE / LOW
- Give exactly 3 numbered action steps
- Never say "call 911" — say "alert the nearest rescue team immediately"
- End with one reassurance line

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "type": "triage",
  "severity": "CRITICAL|HIGH|MODERATE|LOW",
  "condition": "one-line summary of what you think is happening",
  "steps": ["step 1", "step 2", "step 3"],
  "reassurance": "one calming sentence"
}`;

  const raw = await callGroq(system, message);

  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    // If JSON parse fails, return a safe structured fallback
    return {
      type:        "triage",
      severity:    "HIGH",
      condition:   "Unable to parse exact condition — treat as urgent.",
      steps:       [
        "Keep the person still and calm.",
        "Apply pressure to any visible wounds with a clean cloth.",
        "Alert the nearest rescue team immediately.",
      ],
      reassurance: "Help is on the way — stay with the person and keep them reassured.",
      _raw:        raw,
    };
  }
}

// ── STEP 3: ETA ────────────────────────────────────────────────
function handleETA() {
  const state = getState();

  // Look for the first actively deployed team
  const deployed = state.deployments?.find(d => d.status === "active" || d.status === "deployed");

  if (deployed) {
    return {
      type: "eta",
      team: deployed.team || deployed.name || "Rescue Team",
      eta:  deployed.eta  || "10–15 minutes",
      status: deployed.status,
    };
  }

  // Fallback: check resources for any ambulance / rescue unit
  const unit = state.resources?.find(r =>
    r.type?.toLowerCase().includes("ambulance") ||
    r.type?.toLowerCase().includes("rescue")
  );

  return {
    type:   "eta",
    team:   unit?.name || "Rescue Team Alpha",
    eta:    "Approximately 10–15 minutes",
    status: "en-route",
  };
}

// ── STEP 4: HOSPITAL ───────────────────────────────────────────
async function handleHospital(context) {
  const { lat, lng } = context;

  if (!lat || !lng) {
    return {
      type:    "hospital",
      message: "Location not available. Please share your coordinates so we can find the nearest hospital.",
    };
  }

  const hospitals = await findNearestHospitals(lat, lng);

  if (!hospitals.length) {
    return {
      type:    "hospital",
      message: "No hospitals found within 10 km of your location.",
    };
  }

  const nearest = hospitals[0];
  return {
    type:     "hospital",
    name:     nearest.name,
    address:  nearest.vicinity || nearest.address || "Address unavailable",
    distance: nearest.distance ? `${(nearest.distance / 1000).toFixed(1)} km` : "Nearby",
    lat:      nearest.geometry?.location?.lat,
    lng:      nearest.geometry?.location?.lng,
  };
}

// ── STEP 5: GENERAL ────────────────────────────────────────────
async function handleGeneral(message) {
  const system = `You are Sentinel AI — an emergency disaster response assistant deployed during the Kerala Floods 2024 in Alappuzha, India.

Your role: answer emergency-related questions clearly and concisely for flood survivors and field responders.

RULES:
- 2–4 sentences max
- Always give at least one concrete, actionable next step
- Be calm, reassuring, and direct
- If the question is not emergency-related, gently redirect to emergency topics
- Never speculate or make up facts about specific people or locations`;

  const reply = await callGroq(system, message);
  return { type: "general", reply };
}

// ── MOCK FALLBACK ──────────────────────────────────────────────
function getMockResponse() {
  const entry = MOCK_AI_RESPONSES[mockIdx % MOCK_AI_RESPONSES.length];
  mockIdx++;
  return { type: "general", reply: entry.reply, confidence: entry.confidence, _mock: true };
}

// ── MAIN HANDLER ───────────────────────────────────────────────
/**
 * handleChat(userMessage, context)
 * context: { lat?, lng? }  — optional GPS coords from request body
 */
async function handleChat(userMessage, context = {}) {
  const intent = detectIntent(userMessage);
  console.log("[Chat] Intent:", intent, "| Message:", userMessage);

  let response;

  switch (intent) {
    case "TRIAGE":
      response = await handleTriage(userMessage);
      break;
    case "ETA":
      response = handleETA();
      break;
    case "HOSPITAL":
      response = await handleHospital(context);
      break;
    default:
      response = await handleGeneral(userMessage);
  }

  console.log("[Chat] Response:", JSON.stringify(response));
  return response;
}

// ── FORMAT RESPONSE FOR CLIENT ─────────────────────────────────
/**
 * Converts structured handler output into a human-readable reply string
 * and a confidence score, for backward-compatible API response.
 */
function formatForClient(response) {
  switch (response.type) {
    case "triage": {
      const severityEmoji = {
        CRITICAL: "🔴",
        HIGH:     "🟠",
        MODERATE: "🟡",
        LOW:      "🟢",
      }[response.severity] || "🟠";

      const steps = response.steps?.map((s, i) => `${i + 1}. ${s}`).join("\n") || "";
      const reply = `${severityEmoji} **Severity: ${response.severity}**\n${response.condition}\n\n${steps}\n\n${response.reassurance}`;
      const confidenceMap = { CRITICAL: 95, HIGH: 88, MODERATE: 80, LOW: 75 };
      return { reply, confidence: confidenceMap[response.severity] || 85, structured: response };
    }

    case "eta": {
      const reply = `🚁 **${response.team}** is en route and estimated to arrive in **${response.eta}**. Stay in a visible, safe location and signal with any bright material if possible.`;
      return { reply, confidence: 90, structured: response };
    }

    case "hospital": {
      if (response.message) {
        return { reply: `🏥 ${response.message}`, confidence: 70, structured: response };
      }
      const reply = `🏥 **Nearest Hospital:** ${response.name}\n📍 ${response.address}\n📏 Distance: ${response.distance}\n\nHead there immediately or alert rescue teams to transport you.`;
      return { reply, confidence: 92, structured: response };
    }

    default: {
      return {
        reply:      response.reply || "I'm here to help. Please describe your emergency situation.",
        confidence: response.confidence || 80,
        structured: response,
      };
    }
  }
}

// ── POST /chat ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { message, lat, lng } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "message is required" });
  }

  const userMsg = {
    role:      "user",
    content:   message.trim(),
    timestamp: new Date().toISOString(),
  };
  addMessage(userMsg);

  let reply, confidence, structured;

  try {
    if (process.env.GROQ_API_KEY) {
      const handlerResult = await handleChat(message.trim(), { lat, lng });
      const formatted     = formatForClient(handlerResult);
      reply      = formatted.reply;
      confidence = formatted.confidence;
      structured = formatted.structured;
    } else {
      // No API key — use mock fallback
      console.warn("[Chat] GROQ_API_KEY not set — using mock response");
      const mock = getMockResponse();
      reply      = mock.reply;
      confidence = mock.confidence || 75;
      structured = mock;
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
  } catch (err) {
    console.error("[Chat error]", err.message);
    // Always fall back to mock on error — never crash
    const mock = getMockResponse();
    reply      = mock.reply;
    confidence = mock.confidence || 75;
    structured = { ...mock, _error: err.message };
  }

  const aiMsg = {
    role:      "assistant",
    content:   reply,
    confidence,
    timestamp: new Date().toISOString(),
  };
  addMessage(aiMsg);

  // Emit to WebSocket for connected clients
  const io = req.app.get("io");
  if (io) {
    io.emit("chat_update", {
      userMessage: message.trim(),
      reply,
      confidence,
      structured,
      timestamp: aiMsg.timestamp,
    });
  }

  return res.json({ ok: true, reply, confidence, structured });
});

module.exports = router;
