# Dungeon Delver — Complete Startup Guide

This guide covers everything needed to get Dungeon Delver running and syncing data across devices.

---

## 1. Prerequisites

- **Node.js** v18+ (v20 LTS recommended)
- **npm** v9+ (ships with Node.js)

Verify:

```bash
node --version   # v18.0.0+
npm --version    # 9.0.0+
```

---

## 2. Installation

```bash
cd dungeon_delver
npm install
```

---

## 3. Running the App

```bash
npm run dev
```

Opens at **http://localhost:3000**.

---

## 4. Cross-Device Sync — How It Works

The app has its own sync server built into the codebase. No cloud accounts, no external services, no internet required.

```
Device A (server):   npm run sync-server  →  starts on port 3001
Device A (app):      npm run dev          →  app on port 3000
Device B (app):      point to http://192.168.1.42:3001  (A's LAN IP)
```

The sync server stores everything as JSON files in `dungeon_delver/data/sync/`. Characters and campaigns are organized by **room** — each player group or campaign uses a different room.

### Step 4.1: Start the sync server

```bash
# From inside dungeon_delver/
npm run sync-server
```

You'll see:

```
  🔄 DungeonDelver Sync Server
  ────────────────────────────
  HTTP API: http://localhost:3001/api/health
  WebSocket: ws://localhost:3001
  Data dir: .../dungeon_delver/data/sync/

  Share this URL with other devices on your network.
  Find your LAN IP with 'ipconfig' (e.g. http://192.168.1.42:3001)
```

### Step 4.2: Find your LAN IP

```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.42
```

### Step 4.3: Push characters to the server

**From the Character Select screen (`/character-sheet`):**
1. Each character card has an **↑ Push** button
2. At the top of the character list there's a **Connect** bar — enter your server URL and room name
3. Click **Connect**, then push individual characters

**From the Sync page (`/dm/sync` → Persistent Sync tab):**
1. Enter server URL and room name
2. Click **Connect**
3. Use **Push All Characters → Server** to push all local characters at once
4. Use **Push All Campaigns → Server** for campaigns

### Step 4.4: Pull characters on another device

On the second device:

1. Run `npm run dev`
2. Go to **Character Select** → enter the server URL (e.g. `http://192.168.1.42:3001`) and same room name → click **Connect**
3. Characters on the server appear in the list — click **Download** on each
4. Or go to **DM Hub** → **Multi-User Sync** → **Persistent Sync** tab → **Pull All Characters ← Server**

---

## 5. Real-Time LAN Sessions

For live session sharing (combat state, dice rolls, chat):

1. Run `npm run sync-server` on the DM's machine
2. DM goes to **DM Hub** → **Multi-User Sync** → **WebSocket (LAN)** tab
3. DM enters the server URL and room name, clicks **Connect**
4. Players go to the same page, same URL and room, click **Connect**
5. State broadcasts to all connected clients in real time

The LAN Sync page at `/dm/lan` offers a full session experience with character publishing, player management, and screen projection.

---

## 6. Building for Production

```bash
npm run build
npm start          # Serves on http://localhost:3000
```

---

## 7. Docker Deployment

```bash
# From project root (contains docker-compose.yml)
docker-compose up -d
```

Starts:
- Next.js app on port 80 (via nginx)
- Sync server on port 3001
- Game server on port 3002

---

## 8. API Reference (Sync Server)

The sync server provides HTTP endpoints at `http://<host>:3001/api/`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Server health check |
| `/api/sync/characters?room=xxx` | GET | List all characters in room |
| `/api/sync/characters` | POST | Push a character `{room, character}` |
| `/api/sync/characters/:id?room=xxx` | GET | Get a specific character |
| `/api/sync/characters/:id?room=xxx` | DELETE | Delete a character |
| `/api/sync/campaigns?room=xxx` | GET | List all campaigns in room |
| `/api/sync/campaigns` | POST | Push a campaign `{room, campaign}` |
| `/api/sync/campaigns/:id?room=xxx` | GET | Get a specific campaign |
| `/api/sync/campaigns/:id?room=xxx` | DELETE | Delete a campaign |

---

## 9. Troubleshooting

### Sync server won't start
- Port 3001 may be in use — kill the process or set `SYNC_PORT=3002`
- Run `netstat -ano | findstr :3001` to find the PID, then `taskkill /PID <pid> /F`

### "Cannot connect" on sync page
- Make sure `npm run sync-server` is running
- Check the URL — use `http://localhost:3001` on the same machine, or `http://192.168.1.X:3001` from another device
- Check firewall — Windows may block the port

### Characters not appearing on other device
- Both devices must use the **same room name**
- Push the character on the source device first
- Click **Refresh List** on the target device
- Characters are stored per-room, not per-user — room names are case-sensitive

### Data directory
All synced data is in `dungeon_delver/data/sync/` as JSON files:
```
data/sync/
  {room}/
    characters/
      {character-uuid}.json
    campaigns/
      {campaign-id}.json
```
You can back up, copy, or delete these manually.

### Port 3000 already in use
```bash
npx next dev -p 3001    # Use a different port
```
