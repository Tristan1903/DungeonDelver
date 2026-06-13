const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const state = require('./state');

const PORT = process.env.SYNC_PORT || 3001;
const DATA_DIR = path.resolve(__dirname, '..', 'data', 'sync');

// Room membership for WebSocket broadcast
const wsClients = new Map();
const rooms = new Map();

// ─── File helpers ────────────────────────────────────────────────────────────

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function charsDir(room) {
  return ensureDir(path.join(DATA_DIR, sanitize(room), 'characters'));
}

function campsDir(room) {
  return ensureDir(path.join(DATA_DIR, sanitize(room), 'campaigns'));
}

function listJsonFiles(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.json')); }
  catch { return []; }
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

function writeJson(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8'); return true; }
  catch { return false; }
}

function deleteFile(filePath) {
  try { fs.unlinkSync(filePath); return true; }
  catch { return false; }
}

function broadcastToRoom(room, msg) {
  const members = rooms.get(room);
  if (!members) return;
  const msgStr = JSON.stringify(msg);
  for (const id of members) {
    const client = wsClients.get(id);
    if (client && client.readyState === 1) client.send(msgStr);
  }
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  if (parts[0] !== 'api') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const endpoint = parts.slice(1).join('/');

  try {
    // ── Health ──
    if (endpoint === 'health' && req.method === 'GET') {
      const activeRooms = state.getActiveRoomIds().map(id => state.getRoomSummary(id));
      return sendJson(res, 200, { status: 'ok', server: 'dungeon-delver-sync', rooms: activeRooms });
    }

    // ── DM: Create a room ──
    if (endpoint === 'rooms/create' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { room, password } = body;
      if (!room) return sendJson(res, 400, { error: 'Room name required' });
      state.setDmPassword(room, password || null);
      const token = state.generateToken();
      state.registerDm(room, token);
      console.log(`[ROOM] Created room "${room}"`);
      return sendJson(res, 200, { success: true, token, room });
    }

    // ── Player: Join a room ──
    if (endpoint === 'rooms/join' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { room, characterName } = body;
      if (!room) return sendJson(res, 400, { error: 'Room name required' });
      const token = state.generateToken();
      return sendJson(res, 200, { success: true, token, room, characterName: characterName || '' });
    }

    // ── Destroy a room ──
    if (endpoint === 'rooms/destroy' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { room } = body;
      if (!room) return sendJson(res, 400, { error: 'Room name required' });
      state.destroyRoom(room);
      return sendJson(res, 200, { success: true });
    }

    // ── List active rooms ──
    if (endpoint === 'rooms/active' && req.method === 'GET') {
      const activeRooms = state.getActiveRoomIds().map(id => state.getRoomSummary(id));
      return sendJson(res, 200, { rooms: activeRooms });
    }

    // ── Room summary ──
    if (endpoint.startsWith('rooms/') && endpoint.endsWith('/summary') && req.method === 'GET') {
      const roomId = endpoint.split('/')[1];
      const summary = state.getRoomSummary(roomId);
      if (summary) return sendJson(res, 200, summary);
      return sendJson(res, 404, { error: 'Room not found' });
    }

    // ── Store campaign config ──
    if (endpoint === 'campaign-config' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { room, config } = body;
      if (!room || !config) return sendJson(res, 400, { error: 'Room and config required' });
      state.storeCampaignConfig(room, config);
      console.log(`[ROOM] Campaign config saved for room "${room}"`);
      return sendJson(res, 200, { success: true });
    }

    // ── Get campaign config ──
    if (endpoint === 'campaign-config' && req.method === 'GET') {
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });
      const config = state.getCampaignConfig(room);
      if (config) return sendJson(res, 200, config);
      return sendJson(res, 404, { error: 'No campaign config found for this room' });
    }

    // ── List characters in room ──
    if (endpoint === 'sync/characters' && req.method === 'GET') {
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });

      const files = listJsonFiles(charsDir(room));
      const characters = files.map(f => {
        const c = readJson(path.join(charsDir(room), f));
        if (!c) return null;
        return {
          id: c.id || f.replace('.json', ''),
          name: c.name || 'Unknown',
          class: c.class || (c.classLevels?.[0]?.className) || '',
          race: c.race || '',
          level: c.totalLevel || c.level || 1,
          last_sync: c.last_sync || '',
        };
      }).filter(Boolean);

      return sendJson(res, 200, { characters });
    }

    // ── Push character ──
    if (endpoint === 'sync/characters' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { room, character } = body;
      if (!room) return sendJson(res, 400, { error: 'Missing room' });
      if (!character || !character.id) return sendJson(res, 400, { error: 'Missing character with id' });

      character.last_sync = new Date().toISOString();
      const filePath = path.join(charsDir(room), `${sanitize(character.id)}.json`);

      if (writeJson(filePath, character)) {
        broadcastToRoom(room, { type: 'character_synced', payload: { id: character.id, name: character.name } });
        return sendJson(res, 200, { success: true, id: character.id });
      }
      return sendJson(res, 500, { error: 'Failed to write character' });
    }

    // ── Get specific character ──
    if (endpoint.startsWith('sync/characters/') && req.method === 'GET') {
      const charId = endpoint.split('/')[2];
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });

      const filePath = path.join(charsDir(room), `${sanitize(charId)}.json`);
      const data = readJson(filePath);
      if (data) return sendJson(res, 200, data);
      return sendJson(res, 404, { error: 'Character not found' });
    }

    // ── Delete character ──
    if (endpoint.startsWith('sync/characters/') && req.method === 'DELETE') {
      const charId = endpoint.split('/')[2];
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });

      const filePath = path.join(charsDir(room), `${sanitize(charId)}.json`);
      if (deleteFile(filePath)) {
        broadcastToRoom(room, { type: 'character_deleted', payload: { id: charId } });
        return sendJson(res, 200, { success: true });
      }
      return sendJson(res, 404, { error: 'Character not found' });
    }

    // ── List campaigns in room ──
    if (endpoint === 'sync/campaigns' && req.method === 'GET') {
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });

      const files = listJsonFiles(campsDir(room));
      const campaigns = files.map(f => {
        const c = readJson(path.join(campsDir(room), f));
        if (!c) return null;
        return {
          id: c.id || f.replace('.json', ''),
          name: c.name || 'Unknown',
          last_sync: c.last_sync || '',
        };
      }).filter(Boolean);

      return sendJson(res, 200, { campaigns });
    }

    // ── Push campaign ──
    if (endpoint === 'sync/campaigns' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { room, campaign } = body;
      if (!room) return sendJson(res, 400, { error: 'Missing room' });
      if (!campaign || !campaign.id) return sendJson(res, 400, { error: 'Missing campaign with id' });

      campaign.last_sync = new Date().toISOString();
      const filePath = path.join(campsDir(room), `${sanitize(campaign.id)}.json`);

      if (writeJson(filePath, campaign)) {
        broadcastToRoom(room, { type: 'campaign_synced', payload: { id: campaign.id, name: campaign.name } });
        return sendJson(res, 200, { success: true, id: campaign.id });
      }
      return sendJson(res, 500, { error: 'Failed to write campaign' });
    }

    // ── Get specific campaign ──
    if (endpoint.startsWith('sync/campaigns/') && req.method === 'GET') {
      const campId = endpoint.split('/')[2];
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });

      const filePath = path.join(campsDir(room), `${sanitize(campId)}.json`);
      const data = readJson(filePath);
      if (data) return sendJson(res, 200, data);
      return sendJson(res, 404, { error: 'Campaign not found' });
    }

    // ── Delete campaign ──
    if (endpoint.startsWith('sync/campaigns/') && req.method === 'DELETE') {
      const campId = endpoint.split('/')[2];
      const room = url.searchParams.get('room');
      if (!room) return sendJson(res, 400, { error: 'Missing room query param' });

      const filePath = path.join(campsDir(room), `${sanitize(campId)}.json`);
      if (deleteFile(filePath)) {
        broadcastToRoom(room, { type: 'campaign_deleted', payload: { id: campId } });
        return sendJson(res, 200, { success: true });
      }
      return sendJson(res, 404, { error: 'Campaign not found' });
    }

    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (e) {
    sendJson(res, 400, { error: e.message });
  }
});

// ─── WebSocket (real-time relay with DM/player role tracking) ────────────────

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
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
        if (!rooms.has(clientRoom)) rooms.set(clientRoom, new Set());
        rooms.get(clientRoom).add(clientId);

        const payload = msg.payload || {};

        if (payload.role === 'dm') {
          state.registerDm(clientRoom, clientId);
          clientRole = 'dm';
          ws.send(JSON.stringify({ type: 'join_ack', room: clientRoom, senderId: 'server', payload: { role: 'dm', summary: state.getRoomSummary(clientRoom) }, timestamp: Date.now() }));
        } else if (payload.role === 'player') {
          clientCharacterId = payload.characterId || null;
          state.registerPlayer(clientRoom, clientId, payload.characterId || '', payload.characterName || 'Unknown');
          clientRole = 'player';

          // Resolve character: try by ID, then by name, in memory then disk
          let charData = null;
          let resolvedId = payload.characterId;
          if (resolvedId) {
            // 1. By ID in memory
            charData = state.getCharacter(clientRoom, resolvedId);
            // 2. By name in memory
            if (!charData) {
              const allChars = state.getAllCharacters(clientRoom);
              const found = allChars.find(c => c.name === resolvedId);
              if (found) { charData = found; resolvedId = found.id; }
            }
            // 3. By ID on disk
            if (!charData) {
              const diskPath = path.join(charsDir(clientRoom), `${sanitize(resolvedId)}.json`);
              charData = readJson(diskPath);
            }
            // 4. By name on disk (scan files)
            if (!charData) {
              const files = listJsonFiles(charsDir(clientRoom));
              for (const f of files) {
                const c = readJson(path.join(charsDir(clientRoom), f));
                if (c && c.name === resolvedId) { charData = c; resolvedId = c.id; break; }
              }
            }
            // Cache in memory if found by any path
            if (charData) state.storeCharacter(clientRoom, resolvedId, charData);
          }
          ws.send(JSON.stringify({ type: 'join_ack', room: clientRoom, senderId: 'server', payload: { role: 'player', characterId: resolvedId || payload.characterId, character: charData, summary: state.getRoomSummary(clientRoom) }, timestamp: Date.now() }));

          const dmId = state.getDmClientId(clientRoom);
          if (dmId) {
            broadcastToId(dmId, { type: 'player_joined', room: clientRoom, senderId: clientId, payload: { characterId: payload.characterId, characterName: payload.characterName }, timestamp: Date.now() });
          }
        } else {
          // Basic join without role
          ws.send(JSON.stringify({ type: 'join_ack', room: clientRoom, senderId: 'server', payload: { summary: state.getRoomSummary(clientRoom) }, timestamp: Date.now() }));
        }

        console.log(`[WS][${clientRoom}] ${clientId} joined as ${payload.role || 'unknown'}${payload.characterId ? ' (' + payload.characterId + ')' : ''}`);
        return;
      }

      if (msg.type === 'leave') {
        if (clientRoom && rooms.has(clientRoom)) {
          rooms.get(clientRoom).delete(clientId);
          wsClients.delete(clientId);
          if (rooms.get(clientRoom).size === 0) rooms.delete(clientRoom);
        }
        state.unregisterClient(clientRoom, clientId);
        if (clientRole === 'dm') {
          broadcastToRoom(clientRoom, { type: 'dm_disconnected', room: clientRoom, senderId: 'server', timestamp: Date.now() });
        }
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', room: msg.room, senderId: 'server', timestamp: Date.now() }));
        return;
      }

      // ── DM publishes state to all players ──
      if (msg.type === 'state_publish' && clientRole === 'dm') {
        state.publishState(clientRoom, msg.payload);
        broadcastToRoom(clientRoom, { type: 'state_sync', room: clientRoom, senderId: clientId, payload: msg.payload, timestamp: Date.now() });
        return;
      }

      // ── DM sends projection to all players ──
      if (msg.type === 'project' && clientRole === 'dm') {
        const proj = state.addProjection(clientRoom, msg.payload.contentType, msg.payload.content);
        broadcastToRoom(clientRoom, { type: 'projection', room: clientRoom, senderId: clientId, payload: proj, timestamp: Date.now() });
        return;
      }

      // ── DM clears projections ──
      if (msg.type === 'clear_projections' && clientRole === 'dm') {
        state.clearProjections(clientRoom);
        broadcastToRoom(clientRoom, { type: 'projections_cleared', room: clientRoom, senderId: clientId, timestamp: Date.now() });
        return;
      }

      // ── Player updates character ──
      if (msg.type === 'character_update' && clientRole === 'player') {
        state.storeCharacter(clientRoom, msg.payload.characterId, msg.payload.data);
        const dmId = state.getDmClientId(clientRoom);
        if (dmId) {
          broadcastToId(dmId, { type: 'character_updated', room: clientRoom, senderId: clientId, payload: msg.payload, timestamp: Date.now() });
        }
        ws.send(JSON.stringify({ type: 'character_update_ack', room: clientRoom, senderId: 'server', timestamp: Date.now() }));
        return;
      }

      // ── DM publishes character list to players ──
      if (msg.type === 'publish_characters' && clientRole === 'dm') {
        broadcastToRoom(clientRoom, { type: 'character_list', room: clientRoom, senderId: clientId, payload: msg.payload, timestamp: Date.now() });
        // Persist to disk + in-memory state so HTTP fetch and player reconnects find them
        const characters = msg.payload?.characters || msg.payload || [];
        for (const c of characters) {
          if (c && c.id) {
            c.last_sync = new Date().toISOString();
            const filePath = path.join(charsDir(clientRoom), `${sanitize(c.id)}.json`);
            writeJson(filePath, c);
            state.storeCharacter(clientRoom, c.id, c);
          }
        }
        return;
      }

      // ── Player requests character data ──
      if (msg.type === 'request_characters') {
        const chars = state.getAllCharacters(clientRoom);
        ws.send(JSON.stringify({ type: 'character_list', room: clientRoom, senderId: 'server', payload: { characters: chars }, timestamp: Date.now() }));
        return;
      }

      // Relay to all other clients in the same room
      if (clientRoom && rooms.has(clientRoom)) {
        const msgStr = JSON.stringify(msg);
        for (const id of rooms.get(clientRoom)) {
          if (id !== clientId) {
            const client = wsClients.get(id);
            if (client && client.readyState === 1) client.send(msgStr);
          }
        }
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });

  ws.on('close', () => {
    if (clientRoom) {
      state.unregisterClient(clientRoom, clientId);
      if (clientRole === 'dm') {
        broadcastToRoom(clientRoom, { type: 'dm_disconnected', room: clientRoom, senderId: 'server', timestamp: Date.now() });
      }
    }
    if (clientRoom && rooms.has(clientRoom)) {
      rooms.get(clientRoom).delete(clientId);
      wsClients.delete(clientId);
      if (rooms.get(clientRoom).size === 0) rooms.delete(clientRoom);
      console.log(`[WS][${clientRoom}] ${clientId} left`);
    }
  });
});

function broadcastToId(clientId, msg) {
  const client = wsClients.get(clientId);
  if (client && client.readyState === 1) client.send(JSON.stringify(msg));
}

// ─── Startup ─────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🔄 DungeonDelver Sync Server`);
  console.log(`  ────────────────────────────`);
  console.log(`  HTTP API: http://localhost:${PORT}/api/health`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  Data dir: ${DATA_DIR}`);
  console.log(``);
  console.log(`  Share this URL with other devices on your network.`);
  console.log(`  Find your LAN IP with 'ipconfig' (e.g. http://192.168.1.42:${PORT})`);
  console.log(``);
});
