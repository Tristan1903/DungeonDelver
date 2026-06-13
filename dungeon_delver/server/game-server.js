const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const state = require('./state');

const PORT = process.env.PORT || 3000;
const OUT_DIR = path.resolve(__dirname, '..', 'out');
const DEV_PROXY = process.env.DEV_PROXY || null;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

function serveStatic(req, res) {
  const cleanUrl = req.url.split('?')[0].split('#')[0];
  const decoded = cleanUrl === '/' ? cleanUrl : decodeURI(cleanUrl);
  let filePath = path.join(OUT_DIR, decoded === '/' ? 'index.html' : decoded);

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    const tryIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(tryIndex)) {
      filePath = tryIndex;
    } else {
      const alt = filePath + '.html';
      if (fs.existsSync(alt)) {
        filePath = alt;
      } else {
        filePath = path.join(OUT_DIR, 'index.html');
      }
    }
  }

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch {
    try {
      const fallback = fs.readFileSync(path.join(OUT_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fallback);
    } catch {
      res.writeHead(500);
      res.end('Server error');
    }
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  if (pathParts[0] !== 'api') {
    serveStatic(req, res);
    return;
  }

  const endpoint = pathParts.slice(1).join('/');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (endpoint === 'auth/dm' && req.method === 'POST') {
      const { room, password } = await parseJsonBody(req);
      if (!room) return sendJson(res, 400, { success: false, error: 'Room name required' });
      if (state.verifyDmPassword(room, password || '')) {
        const token = state.generateToken();
        state.registerDm(room, `dm-${token}`);
        return sendJson(res, 200, { success: true, token, role: 'dm', room });
      }
      return sendJson(res, 401, { success: false, error: 'Incorrect password' });
    }

    if (endpoint === 'auth/dm/setup' && req.method === 'POST') {
      const { room, password } = await parseJsonBody(req);
      if (!room) return sendJson(res, 400, { success: false, error: 'Room name required' });
      state.setDmPassword(room, password || null);
      const token = state.generateToken();
      state.registerDm(room, `dm-${token}`);
      return sendJson(res, 200, { success: true, token, role: 'dm', room });
    }

    if (endpoint === 'auth/player' && req.method === 'POST') {
      const { room, characterId, characterName } = await parseJsonBody(req);
      if (!room) return sendJson(res, 400, { success: false, error: 'Room name required' });
      if (!characterId) return sendJson(res, 400, { success: false, error: 'Character ID required' });
      const token = state.generateToken();
      return sendJson(res, 200, { success: true, token, role: 'player', room, characterId, characterName });
    }

    if (endpoint === 'health') {
      return sendJson(res, 200, {
        status: 'ok',
        rooms: state.getActiveRoomIds().map(id => state.getRoomSummary(id)),
      });
    }

    if (endpoint.startsWith('characters/') && req.method === 'GET') {
      const characterId = endpoint.split('/')[1];
      const roomId = url.searchParams.get('room');
      if (!roomId) return sendJson(res, 400, { error: 'Room query param required' });
      const char = state.getCharacter(roomId, characterId);
      if (char) return sendJson(res, 200, char);
      return sendJson(res, 404, { error: 'Character not found' });
    }

    if (endpoint === 'projections' && req.method === 'GET') {
      const roomId = url.searchParams.get('room');
      if (!roomId) return sendJson(res, 400, { error: 'Room query param required' });
      return sendJson(res, 200, { projections: state.getProjections(roomId) });
    }

    if (endpoint === 'room/summary' && req.method === 'GET') {
      const roomId = url.searchParams.get('room');
      if (!roomId) return sendJson(res, 400, { error: 'Room query param required' });
      const summary = state.getRoomSummary(roomId);
      if (summary) return sendJson(res, 200, summary);
      return sendJson(res, 404, { error: 'Room not found' });
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    sendJson(res, 400, { error: e.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
  } else {
    const clean = req.url.split('?')[0].split('#')[0];
    if (clean !== '/' && !clean.endsWith('/') && !path.extname(clean)) {
      res.writeHead(308, { 'Location': clean + '/', 'Content-Type': 'text/plain' });
      res.end(clean + '/');
      return;
    }
    serveStatic(req, res);
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  let clientRoom = null;
  let clientId = null;
  let clientRole = null;
  let clientCharacterId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        clientRoom = msg.room;
        clientId = msg.senderId;
        wsClients.set(clientId, ws);
        const payload = msg.payload || {};

        if (payload.role === 'dm') {
          state.registerDm(clientRoom, clientId);
          clientRole = 'dm';
          ws.send(JSON.stringify({ type: 'join_ack', room: clientRoom, senderId: 'server', payload: { role: 'dm', summary: state.getRoomSummary(clientRoom) }, timestamp: Date.now() }));
        } else if (payload.role === 'player') {
          clientCharacterId = payload.characterId;
          state.registerPlayer(clientRoom, clientId, payload.characterId, payload.characterName || 'Unknown');
          clientRole = 'player';

          const charData = state.getCharacter(clientRoom, payload.characterId);
          ws.send(JSON.stringify({ type: 'join_ack', room: clientRoom, senderId: 'server', payload: { role: 'player', characterId: payload.characterId, character: charData, summary: state.getRoomSummary(clientRoom) }, timestamp: Date.now() }));

          const dmId = state.getDmClientId(clientRoom);
          if (dmId) {
            broadcastTo(dmId, { type: 'player_joined', room: clientRoom, senderId: clientId, payload: { characterId: payload.characterId, characterName: payload.characterName }, timestamp: Date.now() });
          }
        }

        console.log(`[${clientRoom}] ${clientId} joined as ${payload.role}${payload.characterId ? ' (' + payload.characterId + ')' : ''}`);
        return;
      }

      if (msg.type === 'leave') {
        if (clientRoom) {
          state.unregisterClient(clientRoom, clientId);
          const dmId = state.getDmClientId(clientRoom);
          if (dmId && clientRole === 'player') {
            broadcastTo(dmId, { type: 'player_left', room: clientRoom, senderId: clientId, payload: { characterId: clientCharacterId }, timestamp: Date.now() });
          }
        }
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', room: msg.room, senderId: 'server', timestamp: Date.now() }));
        return;
      }

      if (!clientRoom) return;

      if (msg.type === 'state_publish') {
        if (clientRole !== 'dm') {
          ws.send(JSON.stringify({ type: 'error', payload: { error: 'Only DM can publish state' } }));
          return;
        }
        state.publishState(clientRoom, msg.payload);
        const playerIds = state.getPlayerClientIds(clientRoom);
        broadcastToMany(playerIds, { type: 'state_sync', room: clientRoom, senderId: 'server', payload: msg.payload, timestamp: Date.now() });
        return;
      }

      if (msg.type === 'project') {
        if (clientRole !== 'dm') {
          ws.send(JSON.stringify({ type: 'error', payload: { error: 'Only DM can project' } }));
          return;
        }
        const proj = state.addProjection(clientRoom, msg.payload.contentType, msg.payload.content);
        const playerIds = state.getPlayerClientIds(clientRoom);
        broadcastToMany(playerIds, { type: 'projection', room: clientRoom, senderId: 'server', payload: proj, timestamp: Date.now() });
        broadcastTo(clientId, { type: 'projection_ack', room: clientRoom, senderId: 'server', payload: proj, timestamp: Date.now() });
        return;
      }

      if (msg.type === 'clear_projections') {
        if (clientRole !== 'dm') return;
        state.clearProjections(clientRoom);
        const playerIds = state.getPlayerClientIds(clientRoom);
        broadcastToMany(playerIds, { type: 'projections_cleared', room: clientRoom, senderId: 'server', timestamp: Date.now() });
        return;
      }

      if (msg.type === 'character_update') {
        if (clientRole !== 'player') return;
        state.storeCharacter(clientRoom, msg.payload.characterId, msg.payload.data);
        const dmId = state.getDmClientId(clientRoom);
        if (dmId) {
          broadcastTo(dmId, { type: 'character_updated', room: clientRoom, senderId: clientId, payload: { characterId: msg.payload.characterId, data: msg.payload.data }, timestamp: Date.now() });
        }
        ws.send(JSON.stringify({ type: 'character_update_ack', room: clientRoom, senderId: 'server', timestamp: Date.now() }));
        return;
      }

      if (msg.type === 'publish_characters') {
        if (clientRole !== 'dm') return;
        const chars = msg.payload.characters || [];
        chars.forEach(c => state.storeCharacter(clientRoom, c.id, c));
        console.log(`[${clientRoom}] DM published ${chars.length} characters`);
        ws.send(JSON.stringify({ type: 'publish_characters_ack', room: clientRoom, senderId: 'server', payload: { count: chars.length }, timestamp: Date.now() }));
        return;
      }

      if (msg.type === 'request_characters') {
        if (clientRole !== 'player') return;
        const chars = state.getAllCharacters(clientRoom);
        ws.send(JSON.stringify({ type: 'character_list', room: clientRoom, senderId: 'server', payload: { characters: chars }, timestamp: Date.now() }));
        return;
      }

      if (msg.type === 'chat') {
        const playerIds = state.getPlayerClientIds(clientRoom);
        const dmId = state.getDmClientId(clientRoom);
        const allIds = dmId ? [dmId, ...playerIds] : playerIds;
        broadcastToMany(allIds.filter(id => id !== clientId), { type: 'chat', room: clientRoom, senderId: clientId, payload: msg.payload, timestamp: Date.now() });
        return;
      }

      if (msg.type === 'dice_roll') {
        const playerIds = state.getPlayerClientIds(clientRoom);
        const dmId = state.getDmClientId(clientRoom);
        const allIds = dmId ? [dmId, ...playerIds] : playerIds;
        broadcastToMany(allIds.filter(id => id !== clientId), { type: 'dice_roll', room: clientRoom, senderId: clientId, payload: msg.payload, timestamp: Date.now() });
        return;
      }

    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    if (clientId) wsClients.delete(clientId);
    if (clientRoom) {
      state.unregisterClient(clientRoom, clientId);
      console.log(`[${clientRoom}] ${clientId} (${clientRole || 'unknown'}) disconnected`);
      if (clientRole === 'dm') {
        const playerIds = state.getPlayerClientIds(clientRoom);
        broadcastToMany(playerIds, { type: 'dm_disconnected', room: clientRoom, senderId: 'server', timestamp: Date.now() });
      } else if (clientRole === 'player') {
        const dmId = state.getDmClientId(clientRoom);
        if (dmId) {
          broadcastTo(dmId, { type: 'player_left', room: clientRoom, senderId: clientId, payload: { characterId: clientCharacterId }, timestamp: Date.now() });
        }
      }
    }
  });
});

function broadcastTo(clientId, msg) {
  const ws = wsClients.get(clientId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToMany(clientIds, msg) {
  const data = JSON.stringify(msg);
  for (const id of clientIds) {
    const ws = wsClients.get(id);
    if (ws && ws.readyState === 1) {
      ws.send(data);
    }
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🏰 DungeonDelver Game Server`);
  console.log(`  ──────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  LAN:     http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`  WS:      ws://0.0.0.0:${PORT}/ws`);
  console.log(`  API:     http://0.0.0.0:${PORT}/api/health`);
  console.log(`\n  Share the LAN URL with your players!`);
  console.log(`  (Run 'npm run build' first, or set DEV_PROXY=http://localhost:3000)\n`);
});
