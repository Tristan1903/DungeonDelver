const { WebSocketServer } = require('ws');

const PORT = process.env.WS_PORT || 3001;

const rooms = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`Sync server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  let clientRoom = null;
  let clientId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        clientRoom = msg.room;
        clientId = msg.senderId;

        if (!rooms.has(clientRoom)) {
          rooms.set(clientRoom, new Map());
        }
        rooms.get(clientRoom).set(clientId, ws);
        console.log(`[${clientRoom}] ${clientId} joined (${rooms.get(clientRoom).size} clients)`);
        return;
      }

      if (msg.type === 'leave') {
        if (clientRoom && rooms.has(clientRoom)) {
          rooms.get(clientRoom).delete(clientId);
          if (rooms.get(clientRoom).size === 0) rooms.delete(clientRoom);
        }
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', room: msg.room, senderId: 'server', timestamp: Date.now() }));
        return;
      }

      if (clientRoom && rooms.has(clientRoom)) {
        const clients = rooms.get(clientRoom);
        for (const [id, client] of clients) {
          if (id !== clientId && client.readyState === 1) {
            client.send(JSON.stringify(msg));
          }
        }
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    if (clientRoom && rooms.has(clientRoom)) {
      rooms.get(clientRoom).delete(clientId);
      if (rooms.get(clientRoom).size === 0) rooms.delete(clientRoom);
      console.log(`[${clientRoom}] ${clientId} left`);
    }
  });
});
