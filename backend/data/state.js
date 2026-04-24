// ============================================================
//  data/state.js  –  In-memory system state (no database)
// ============================================================

const { INCIDENT, VOLUNTEERS, RESOURCES, DEPLOYMENTS } = require("./mockData");

// Deep-clone initial values so resets work cleanly
const createInitialState = () => ({
  incident: { ...INCIDENT, timestamp: new Date().toISOString() },
  stats: {
    peopleAtRisk: 24453,
    volunteersActive: 312,
    resourcesDeployed: 128,
    livesImpacted: 1846,
  },
  volunteers: VOLUNTEERS.map((v) => ({ ...v, deployed: false })),
  resources: RESOURCES.map((r) => ({ ...r })),
  deployments: DEPLOYMENTS.map((d) => ({ ...d })),
  logs: [],
  messages: [],
  smslogs: [],
  pipelineRunning: false,
  lastUpdated: new Date().toISOString(),
});

let state = createInitialState();

const getState = () => state;

const resetState = () => {
  state = createInitialState();
};

const updateStats = (delta) => {
  state.stats = { ...state.stats, ...delta };
  state.lastUpdated = new Date().toISOString();
};

const addLog = (log) => {
  state.logs.unshift(log);
  if (state.logs.length > 50) state.logs.pop();
};

const addSMS = (sms) => {
  state.smslogs.unshift(sms);
  if (state.smslogs.length > 20) state.smslogs.pop();
};

const addMessage = (msg) => {
  state.messages.push(msg);
};

const setPipelineRunning = (val) => {
  state.pipelineRunning = val;
};

const deployVolunteer = (id) => {
  const vol = state.volunteers.find((v) => v.id === id);
  if (vol) vol.deployed = true;
};

module.exports = {
  getState,
  resetState,
  updateStats,
  addLog,
  addSMS,
  addMessage,
  setPipelineRunning,
  deployVolunteer,
};
