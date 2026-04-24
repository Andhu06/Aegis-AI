# Sentinel AI — Agentic Disaster Response Backend

Real-time Node.js backend powering the Sentinel AI disaster response dashboard.
Five AI agents run sequentially and stream live updates via WebSocket.

---

## Quick Start

```bash
# 1. Install dependencies
cd sentinel-ai-backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — ANTHROPIC_API_KEY is optional (mock used if absent)

# 3. Copy your frontend HTML into /public
cp sentinel-ai-dashboard.html public/index.html
#    (already done if you're using the pre-patched version)

# 4. Start server
npm start
# or for dev with auto-reload:
npm run dev

# 5. Open browser
open http://localhost:3001
```

---

## Folder Structure

```
sentinel-ai-backend/
├── server.js              ← Entry point (Express + Socket.IO)
├── package.json
├── .env.example
│
├── agents/
│   └── pipeline.js        ← 5-agent pipeline + background tickers
│
├── data/
│   ├── mockData.js        ← Volunteers, resources, SMS templates, AI mocks
│   └── state.js           ← In-memory state (no database)
│
├── routes/
│   ├── api.js             ← REST: /state /start-demo /reset /health
│   └── chat.js            ← POST /chat  (Claude API or mock)
│
└── public/
    └── index.html         ← Frontend (copy your HTML here)
```

---

## REST API

| Method | Endpoint       | Description                              |
|--------|----------------|------------------------------------------|
| POST   | `/start-demo`  | Start 5-agent pipeline simulation        |
| GET    | `/state`       | Full system state snapshot               |
| POST   | `/chat`        | Triage agent chat (Claude API or mock)   |
| POST   | `/reset`       | Reset state to initial values            |
| GET    | `/health`      | Server health check                      |

### POST /chat
```json
// Request
{ "message": "I feel dizzy and can't move" }

// Response
{ "ok": true, "reply": "You may be experiencing...", "confidence": 87 }
```

---

## WebSocket Events (Socket.IO)

| Event          | Payload                                          | Frontend target                  |
|----------------|--------------------------------------------------|----------------------------------|
| `init_state`   | Full state snapshot on connect                   | Initial render                   |
| `agent_log`    | `{ time, agent, cls, msg }`                      | Activity feed (left panel)       |
| `stats_update` | `{ peopleAtRisk, volunteersActive, ... }`        | Top-bar stat counters            |
| `sms_update`   | `{ time, to, msg, status }`                      | SMS list (right panel)           |
| `map_update`   | `{ type, routes, deployedVolunteers, ... }`      | Leaflet map markers & routes     |
| `chat_update`  | `{ userMessage, reply, confidence, timestamp }`  | Chat panel (broadcast to all)    |

### Client-emittable events
| Event          | Description                |
|----------------|----------------------------|
| `trigger_demo` | Start pipeline from client |

---

## Agent Pipeline

When `POST /start-demo` is called:

```
1. Sentinel Agent    → Detects anomaly, confirms incident, emits map_update
2. Severity Engine   → Calculates severity score, updates stats
3. Resource Matcher  → Finds nearest 8 volunteers (Haversine), draws routes
4. Comms Agent       → Sends SMS to each volunteer, streams sms_update
5. Triage Agent      → Activates via POST /chat (Claude API or mock)
```

All steps emit `agent_log` events progressively with realistic delays.

---

## Frontend Integration Changes

Only **one block** was added to the original HTML — a `<script>` tag injected
just before the existing `<script>` block. **Zero UI changes.**

What it does:
- Loads `socket.io.min.js` from CDN
- Connects to backend on page load
- Calls `POST /start-demo` automatically
- Listens for `agent_log`, `sms_update`, `stats_update`, `map_update`
- Patches `sendChatMsg()` to call `POST /chat` instead of using mock array
- Gracefully falls back to original mock behaviour if backend is unreachable

---

## Environment Variables

| Variable            | Default     | Description                             |
|---------------------|-------------|-----------------------------------------|
| `PORT`              | `3001`      | HTTP + WebSocket port                   |
| `ANTHROPIC_API_KEY` | *(none)*    | Claude API key — mock used if absent    |
| `CORS_ORIGIN`       | `*`         | Allowed CORS origin(s)                  |

---

## Running Without Claude API

The system works **100% without an API key**. The Triage Agent returns
realistic mock responses from `data/mockData.js`. To enable real Claude:

1. Add your key to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
2. Restart the server

---

## Production Notes

- Replace `CORS_ORIGIN=*` with your actual frontend URL
- Add rate limiting (e.g. `express-rate-limit`) to `/chat`
- The `/reset` endpoint should be protected in production
