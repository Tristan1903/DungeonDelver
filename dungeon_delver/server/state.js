const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rooms = new Map();
const STATE_FILE = path.resolve(__dirname, 'state.json');
let saveTimer = null;

function saveState() {
  const data = {};
  for (const [id, room] of rooms) {
    data[id] = {
      id: room.id,
      password: room.password,
      dm: room.dm ? { id: room.dm.id, connected: false } : null,
      players: Array.from(room.players.entries()).map(([id, p]) => [id, { ...p, connected: false }]),
      state: room.state,
      projections: room.projections,
      characters: Array.from(room.characters.entries()),
      campaignConfig: room.campaignConfig || null,
      createdAt: room.createdAt,
    };
  }
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2)); } catch {}
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 500);
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    for (const [id, r] of Object.entries(data)) {
      rooms.set(id, {
        id: r.id,
        password: r.password,
        dm: r.dm,
        players: new Map(r.players || []),
        state: r.state || null,
        projections: r.projections || [],
        characters: new Map(r.characters || []),
        campaignConfig: r.campaignConfig || null,
        createdAt: r.createdAt || Date.now(),
      });
    }
    console.log(`[state] Loaded ${rooms.size} room(s) from disk`);
  } catch (e) {
    console.error('[state] Failed to load state:', e.message);
  }
}

// Load on startup
loadState();

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      password: null,
      dm: null,
      players: new Map(),
      state: null,
      projections: [],
      characters: new Map(),
      campaignConfig: null,
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId);
}

function setDmPassword(roomId, password) {
  const room = getRoom(roomId);
  room.password = password;
  scheduleSave();
}

function verifyDmPassword(roomId, password) {
  const room = getRoom(roomId);
  if (!room.password) return true;
  return room.password === password;
}

function registerDm(roomId, wsId) {
  const room = getRoom(roomId);
  room.dm = { id: wsId, connected: true, joinedAt: Date.now() };
  scheduleSave();
}

function registerPlayer(roomId, wsId, characterId, characterName) {
  const room = getRoom(roomId);
  room.players.set(wsId, { id: wsId, characterId, characterName, connected: true, joinedAt: Date.now() });
  scheduleSave();
}

function unregisterClient(roomId, wsId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.dm && room.dm.id === wsId) {
    room.dm = null;
  }
  if (room.players.has(wsId)) {
    room.players.delete(wsId);
  }
  if (!room.dm && room.players.size === 0) {
    rooms.delete(roomId);
  }
  scheduleSave();
}

function publishState(roomId, state) {
  const room = getRoom(roomId);
  room.state = state;
  scheduleSave();
}

function getState(roomId) {
  const room = rooms.get(roomId);
  return room ? room.state : null;
}

function storeCharacter(roomId, characterId, data) {
  const room = getRoom(roomId);
  room.characters.set(characterId, data);
  scheduleSave();
}

function getCharacter(roomId, characterId) {
  const room = rooms.get(roomId);
  return room ? room.characters.get(characterId) || null : null;
}

function getAllCharacters(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.characters.values());
}

function addProjection(roomId, contentType, content) {
  const room = getRoom(roomId);
  const projection = { id: generateToken(), contentType, content, createdAt: Date.now() };
  room.projections.push(projection);
  scheduleSave();
  return projection;
}

function clearProjections(roomId) {
  const room = rooms.get(roomId);
  if (room) room.projections = [];
  scheduleSave();
}

function getProjections(roomId) {
  const room = rooms.get(roomId);
  return room ? room.projections : [];
}

function storeCampaignConfig(roomId, config) {
  const room = getRoom(roomId);
  room.campaignConfig = config;
  scheduleSave();
}

function getCampaignConfig(roomId) {
  const room = rooms.get(roomId);
  return room ? room.campaignConfig : null;
}

function getDmClientId(roomId) {
  const room = rooms.get(roomId);
  return room && room.dm && room.dm.connected ? room.dm.id : null;
}

function getPlayerClientIds(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.players.entries())
    .filter(([, p]) => p.connected)
    .map(([id]) => id);
}

function isDm(roomId, wsId) {
  const room = rooms.get(roomId);
  return room && room.dm && room.dm.id === wsId;
}

function getRoomSummary(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    dmConnected: room.dm ? room.dm.connected : false,
    playerCount: Array.from(room.players.values()).filter(p => p.connected).length,
    characterCount: room.characters.size,
    hasState: !!room.state,
    projectionCount: room.projections.length,
  };
}

function getActiveRoomIds() {
  return Array.from(rooms.keys());
}

function destroyRoom(roomId) {
  rooms.delete(roomId);
  scheduleSave();
}

module.exports = {
  setDmPassword,
  verifyDmPassword,
  registerDm,
  registerPlayer,
  unregisterClient,
  publishState,
  getState,
  storeCharacter,
  getCharacter,
  getAllCharacters,
  addProjection,
  clearProjections,
  getProjections,
  storeCampaignConfig,
  getCampaignConfig,
  getDmClientId,
  getPlayerClientIds,
  isDm,
  getRoomSummary,
  getActiveRoomIds,
  destroyRoom,
  generateToken,
};
