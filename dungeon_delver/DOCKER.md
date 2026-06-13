# Docker Guide — DungeonDelver

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

## Quick Start

```bash
# From the dungeon_delver/ directory

docker compose up --build
```

Then open **http://localhost:3000**

Press `Ctrl+C` to stop.

## Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | `3000` | Next.js static build served by nginx |
| `sync-server` | `3001` | WebSocket relay for multi-user sync |

- The sync-server is optional — the app works without it, but real-time sync features (DM Sync page) won't function.
- The app starts only after the sync-server is ready (`depends_on`).

## Build & Run Individually

### App only (no sync)

```bash
docker build -t dungeon-delver .
docker run -p 3000:80 dungeon-delver
```

### Sync server only

```bash
docker build -f Dockerfile.sync-server -t dd-sync .
docker run -p 3001:3001 -e WS_PORT=3001 dd-sync
```

## Configuration

Set via environment variables on the `sync-server` service in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | `3001` | WebSocket server port |

The app itself requires no environment variables — it's a fully static site.

## Production Deployment

```bash
docker compose up --build -d    # start in background
docker compose logs -f          # follow logs
docker compose down             # stop
```

The Dockerfile produces a minimal nginx image (~25 MB) with the compiled static output. No Node.js runtime is needed at runtime.

## Troubleshooting

**Port conflict on 3000/3001:**
```bash
# Edit the left side of the port mapping in docker-compose.yml:
#   "3000:80"  →  "8080:80"
#   "3001:3001" → "3002:3001"
```

**Changes not showing up:**
```bash
docker compose build --no-cache   # force rebuild without cache
docker compose up --build         # or rebuild on the fly
```

**Sync server not connecting:**
- Verify the WebSocket URL in the app matches where the sync-server is exposed
- The app connects to `ws://localhost:3001` by default
- Check sync-server logs: `docker compose logs sync-server`
