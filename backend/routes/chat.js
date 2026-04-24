// ============================================================
//  routes/chat.js  –  Triage Agent  (POST /chat)
//  Uses Claude API if ANTHROPIC_API_KEY is set, else mock
// ============================================================

const express = require("express");
const router = express.Router();
const { addMessage } = require("../data/state");
const { MOCK_AI_RESPONSES } = require("../data/mockData");

let mockIdx = 0;

// ── Claude API caller (real) ───────────────────────────────────
async function callClaude(userMessage) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: `You are the Sentinel AI Triage Agent — an emergency disaster response AI deployed during the Kerala Floods 2024 in Alappuzha, India.

Your role: provide calm, accurate, actionable triage guidance to flood survivors and field responders.

Rules:
- Keep responses concise (2-4 sentences max)
- Prioritise safety and immediate action
- Reference real flood response protocols (shelter, hydration, evacuation routes)
- Never panic; always reassuring but direct
- End with one concrete next step`,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content[0].text;
}

// ── Mock response (fallback) ───────────────────────────────────
function getMockResponse() {
  const entry = MOCK_AI_RESPONSES[mockIdx % MOCK_AI_RESPONSES.length];
  mockIdx++;
  return entry;
}

// ── POST /chat ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "message is required" });
  }

  const userMsg = {
    role: "user",
    content: message.trim(),
    timestamp: new Date().toISOString(),
  };
  addMessage(userMsg);

  try {
    let reply, confidence;

    if (process.env.ANTHROPIC_API_KEY) {
      // Real Claude response
      reply = await callClaude(message.trim());
      confidence = 75 + Math.floor(Math.random() * 20);
    } else {
      // Mock fallback — no API key needed
      const mock = getMockResponse();
      reply = mock.reply;
      confidence = mock.confidence;
      // Simulate realistic network delay
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    }

    const aiMsg = {
      role: "assistant",
      content: reply,
      confidence,
      timestamp: new Date().toISOString(),
    };
    addMessage(aiMsg);

    // Also emit to WebSocket so other connected clients see it
    const io = req.app.get("io");
    if (io) {
      io.emit("chat_update", {
        userMessage: message.trim(),
        reply,
        confidence,
        timestamp: aiMsg.timestamp,
      });
    }

    return res.json({ ok: true, reply, confidence });
  } catch (err) {
    console.error("[Chat error]", err.message);

    // Always fall back to mock on error
    const mock = getMockResponse();
    addMessage({
      role: "assistant",
      content: mock.reply,
      confidence: mock.confidence,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      reply: mock.reply,
      confidence: mock.confidence,
      _mock: true,
    });
  }
});

module.exports = router;
