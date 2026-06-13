'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadCharFromLocal } from '../../utils/storageEngine';
import { getActiveCampaign, getCampaigns } from '../../utils/campaignStorage';
import { useLanSync } from '../../context/LanSyncContext';
import { loadCampaignConfig } from '../../utils/campaignEngine';

const PAGE_STYLES = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '700px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' },
  box: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '12px', padding: '2rem' },
  title: { fontSize: '2rem', color: '#c9a84c', marginBottom: '0.5rem', textAlign: 'center' as const },
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '2rem', textAlign: 'center' as const },
  btn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' as const, transition: '0.2s' },
  input: { width: '100%', padding: '10px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '6px', color: '#e8dcc8', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '10px' },
  label: { fontSize: '0.75rem', color: '#8a7e6a', marginBottom: '4px', display: 'block' },
  error: { color: '#a83232', fontSize: '0.8rem', marginBottom: '10px', textAlign: 'center' as const },
  statusBox: { background: '#1a1714', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginTop: '1rem', fontSize: '0.8rem' },
};

function getDefaultSyncUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `http://${window.location.hostname}:3001`;
}

export default function JoinPage() {
  const router = useRouter();
  const lan = useLanSync();
  const [mode, setMode] = useState<'select' | 'dm' | 'player' | 'dm_hosting'>('select');
  const [syncUrl, setSyncUrl] = useState(getDefaultSyncUrl());
  const [room, setRoom] = useState('');
  const [password, setPassword] = useState('');
  const [charId, setCharId] = useState('');
  const [error, setError] = useState('');
  const [wsStatus, setWsStatus] = useState<string>('');
  const [hostInfo, setHostInfo] = useState<{ url: string; room: string; chars: { id: string; name: string }[] } | null>(null);
  const [availableChars, setAvailableChars] = useState<{ id: string; name: string }[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [fetchingRooms, setFetchingRooms] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dd-sync-url');
      if (saved) setSyncUrl(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const campaignId = getActiveCampaign();
      if (campaignId) {
        const campaigns = getCampaigns();
        const active = campaigns.find(c => c.id === campaignId);
        if (active) setRoom(active.name);
      }
    } catch {}
    const chars: { id: string; name: string }[] = [];
    try {
      const registry = JSON.parse(localStorage.getItem('dungeon-delver-character-registry') || '[]');
      for (const entry of registry) {
        const key = entry.id ? `dd-char-${entry.id}` : `dd-char-${entry.name}`;
        const char = loadCharFromLocal(key);
        if (char) chars.push({ id: char.id || entry.id, name: char.name });
      }
    } catch {}
    setAvailableChars(chars);
  }, []);

  const fetchActiveRooms = useCallback(async () => {
    setFetchingRooms(true);
    setError('');
    try {
      const base = syncUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/api/rooms/active`);
      const data = await res.json();
      setActiveRooms(data.rooms || []);
    } catch {
      setError('Could not connect to sync server. Is it running?');
    }
    setFetchingRooms(false);
  }, [syncUrl]);

  const startDmSession = useCallback(async () => {
    setError('');
    setWsStatus('connecting');
    const roomName = room.trim() || 'campaign';
    try {
      const base = syncUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName, password: password || null }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Failed to start session'); setWsStatus('error'); return; }

      lan.connect(syncUrl, roomName, 'dm');
      try { localStorage.setItem('dungeon-delver-role', 'dm'); } catch {}

      // Publish campaign config immediately
      try {
        const campaignId = getActiveCampaign();
        if (campaignId) {
          const config = loadCampaignConfig(campaignId);
          if (config) {
            const base = syncUrl.replace(/\/+$/, '');
            await fetch(`${base}/api/campaign-config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room: roomName, config }),
            });
          }
        }
      } catch {}

      const publishedChars = availableChars.filter(c => c.id);
      setHostInfo({ url: syncUrl, room: roomName, chars: publishedChars });
      setWsStatus('connected');
      setMode('dm_hosting');
    } catch {
      setError('Could not connect to sync server. Make sure to run npm run sync-server');
      setWsStatus('error');
    }
  }, [syncUrl, room, password, availableChars, lan]);

  const joinAsPlayer = useCallback(async () => {
    setError('');
    const roomName = room.trim() || 'campaign';
    try {
      const base = syncUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName, characterName: charId.trim() || '' }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Failed to join'); return; }

      lan.connect(syncUrl, roomName, 'player', charId.trim() || undefined, charId.trim() || 'Adventurer');
      router.push('/play');
    } catch {
      setError('Could not connect to sync server. Make sure to run npm run sync-server');
    }
  }, [syncUrl, room, charId, router, lan]);

  if (mode === 'select') {
    return (
      <div style={PAGE_STYLES.page}>
        <div style={PAGE_STYLES.box}>
          <h1 style={PAGE_STYLES.title}>Dungeon Delver</h1>
          <p style={PAGE_STYLES.sub}>Connect to a LAN game session</p>
          <label style={PAGE_STYLES.label}>Sync Server URL</label>
          <input style={PAGE_STYLES.input} placeholder={getDefaultSyncUrl()} value={syncUrl} onChange={e => setSyncUrl(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <button onClick={() => setMode('dm')}
              style={{ ...PAGE_STYLES.btn, background: '#c9a84c', color: '#0c0e14' }}>
              I&apos;m the Dungeon Master
            </button>
            <button onClick={() => setMode('player')}
              style={{ ...PAGE_STYLES.btn, background: '#2d3748', color: '#e8dcc8', border: '1px solid #4a5568' }}>
              I&apos;m a Player
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'dm') {
    return (
      <div style={PAGE_STYLES.page}>
        <div style={PAGE_STYLES.box}>
          <h1 style={PAGE_STYLES.title}>Start LAN Session</h1>
          <p style={PAGE_STYLES.sub}>Host a game for your players on the local network</p>
          <label style={PAGE_STYLES.label}>Sync Server URL</label>
          <input style={PAGE_STYLES.input} placeholder={getDefaultSyncUrl()} value={syncUrl} onChange={e => setSyncUrl(e.target.value)} />
          <label style={PAGE_STYLES.label}>Room / Campaign Name</label>
          <input style={PAGE_STYLES.input} placeholder="e.g., Curse of Strahd" value={room} onChange={e => setRoom(e.target.value)} />
          <label style={PAGE_STYLES.label}>Password (optional)</label>
          <input style={PAGE_STYLES.input} type="password" placeholder="Leave blank for no password" value={password} onChange={e => setPassword(e.target.value)} />
          {wsStatus === 'error' && <p style={PAGE_STYLES.error}>{error}</p>}
          <button onClick={startDmSession} disabled={wsStatus === 'connecting'}
            style={{ ...PAGE_STYLES.btn, background: wsStatus === 'connecting' ? '#5a5248' : '#c9a84c', color: '#0c0e14', marginTop: '6px' }}>
            {wsStatus === 'connecting' ? 'Starting...' : 'Start LAN Session'}
          </button>
          <button onClick={() => setMode('select')}
            style={{ ...PAGE_STYLES.btn, background: 'transparent', color: '#8a7e6a', border: '1px solid #3d3528', marginTop: '8px', fontSize: '0.85rem' }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'dm_hosting' && hostInfo) {
    const wsUrl = hostInfo.url.replace(/^http/, 'ws');
    return (
      <div style={PAGE_STYLES.page}>
        <div style={PAGE_STYLES.box}>
          <h1 style={PAGE_STYLES.title}>Session Active</h1>
          <p style={PAGE_STYLES.sub}>Your LAN session is running. Share this info with players.</p>
          <div style={PAGE_STYLES.statusBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
              <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '0.85rem' }}>Connected</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#c9a84c', fontSize: '0.7rem', marginBottom: '2px' }}>Sync Server URL</div>
              <div style={{ background: '#0c0e14', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                {hostInfo.url}
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#c9a84c', fontSize: '0.7rem', marginBottom: '2px' }}>WebSocket URL</div>
              <div style={{ background: '#0c0e14', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                {wsUrl}
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#c9a84c', fontSize: '0.7rem', marginBottom: '2px' }}>Room</div>
              <div style={{ background: '#0c0e14', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace' }}>{hostInfo.room}</div>
            </div>
            {hostInfo.chars.length > 0 && (
              <div>
                <div style={{ color: '#c9a84c', fontSize: '0.7rem', marginBottom: '4px' }}>Available Characters</div>
                {hostInfo.chars.map(c => (
                  <div key={c.id} style={{ background: '#0c0e14', padding: '6px 10px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.name}</span>
                    <span style={{ color: '#5a5248', fontSize: '0.7rem', fontFamily: 'monospace' }}>{c.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => router.push('/')}
              style={{ ...PAGE_STYLES.btn, background: '#c9a84c', color: '#0c0e14' }}>
              Open DM Dashboard
            </button>
            <button onClick={() => { setMode('select'); setHostInfo(null); setWsStatus(''); }}
              style={{ ...PAGE_STYLES.btn, background: 'transparent', color: '#8a7e6a', border: '1px solid #3d3528', fontSize: '0.85rem' }}>
              End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={PAGE_STYLES.page}>
      <div style={PAGE_STYLES.box}>
        <h1 style={PAGE_STYLES.title}>Join Game</h1>
        <p style={PAGE_STYLES.sub}>Enter the server details from your DM</p>
        <label style={PAGE_STYLES.label}>Sync Server URL</label>
        <input style={PAGE_STYLES.input} placeholder="http://192.168.1.42:3001" value={syncUrl} onChange={e => { setSyncUrl(e.target.value); setActiveRooms([]); }} />
        <button onClick={fetchActiveRooms} disabled={fetchingRooms}
          style={{ ...PAGE_STYLES.btn, background: fetchingRooms ? '#5a5248' : '#2d3748', color: '#e8dcc8', border: '1px solid #4a5568', marginBottom: '10px', padding: '8px', fontSize: '0.85rem' }}>
          {fetchingRooms ? 'Scanning...' : '🔍 Find Active Rooms'}
        </button>

        {activeRooms.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <label style={PAGE_STYLES.label}>Active Rooms — click to join</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {activeRooms.map(r => (
                <button key={r.id} onClick={() => setRoom(r.id)}
                  style={{ padding: '6px 14px', background: room === r.id ? '#c9a84c' : '#1a1714', border: `1px solid ${room === r.id ? '#c9a84c' : '#3d3528'}`, borderRadius: '6px', color: room === r.id ? '#0c0e14' : '#e8dcc8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: room === r.id ? 'bold' : 'normal' }}>
                  {r.id} {r.dmConnected ? '🟢' : '🔴'} ({r.playerCount} players)
                </button>
              ))}
            </div>
          </div>
        )}

        <label style={PAGE_STYLES.label}>Room Name</label>
        <input style={PAGE_STYLES.input} placeholder="e.g., Curse of Strahd" value={room} onChange={e => setRoom(e.target.value)} />
        <label style={PAGE_STYLES.label}>Character Name (optional — leave blank to join unassigned)</label>
        <input style={PAGE_STYLES.input} placeholder="Leave blank to create one later" value={charId} onChange={e => setCharId(e.target.value)} />
        {availableChars.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label style={PAGE_STYLES.label}>Quick select (local characters)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {availableChars.map(c => (
                <button key={c.id} onClick={() => setCharId(c.id)}
                  style={{ padding: '4px 10px', background: '#2d3748', border: `1px solid ${charId === c.id ? '#c9a84c' : '#4a5568'}`, borderRadius: '4px', color: '#e8dcc8', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p style={PAGE_STYLES.error}>{error}</p>}
        <button onClick={joinAsPlayer}
          style={{ ...PAGE_STYLES.btn, background: '#2d3748', color: '#e8dcc8', border: '1px solid #4a5568' }}>
          Join Game
        </button>
        <button onClick={() => setMode('select')}
          style={{ ...PAGE_STYLES.btn, background: 'transparent', color: '#8a7e6a', border: '1px solid #3d3528', marginTop: '8px', fontSize: '0.85rem' }}>
          Back
        </button>
      </div>
    </div>
  );
}