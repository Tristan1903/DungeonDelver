'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SyncClient } from '../../utils/syncEngine';
import { loadCharFromLocal, saveCharToLocal } from '../../utils/storageEngine';
import { getActiveCampaign, getCampaigns } from '../../utils/campaignStorage';
import { loadCampaignConfig } from '../../utils/campaignEngine';
import { useLanSync } from '../../context/LanSyncContext';
import ProjectionRenderer from '../../components/ProjectionRenderer';
import { pullCharacter, pushCharacter } from '../../utils/syncManager';

const s = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '800px', margin: '0 auto' },
  box: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '12px', padding: '2rem' },
  title: { fontSize: '1.8rem', color: '#c9a84c', marginBottom: '0.25rem', textAlign: 'center' as const },
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' as const },
  label: { fontSize: '0.75rem', color: '#8a7e6a', marginBottom: '4px', display: 'block' },
  input: { width: '100%', padding: '10px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '6px', color: '#e8dcc8', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '10px' },
  textarea: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '6px', color: '#e8dcc8', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px', minHeight: '80px', fontFamily: 'monospace' },
  btn: { padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' as const },
  card: { background: '#1a1714', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  error: { color: '#a83232', fontSize: '0.8rem', marginBottom: '10px', textAlign: 'center' as const },
};

function getDefaultSyncUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `http://${window.location.hostname}:3001`;
}
function isLocalUrl(url: string) {
  try { const h = new URL(url).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'; } catch { return false; }
}
const STATUS_COLORS: Record<string, string> = {
  connected: '#16a34a', connecting: '#c9a84c', disconnected: '#5a5248', error: '#a83232',
};
const CONTENT_TYPES = [
  { value: 'message', label: 'Message' },
  { value: 'handout', label: 'Handout' },
  { value: 'map', label: 'Map' },
  { value: 'monster', label: 'Monster Stats' },
  { value: 'item', label: 'Item' },
  { value: 'note', label: 'Note' },
];

export default function LanPage() {
  const router = useRouter();
  const lan = useLanSync();
  const [tab, setTab] = useState<'dm' | 'player' | 'manage'>('dm');
  const [syncUrl, setSyncUrl] = useState(getDefaultSyncUrl());
  const [room, setRoom] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [players, setPlayers] = useState<{ characterId: string; characterName: string }[]>([]);
  const [characters, setCharacters] = useState<{ id: string; name: string }[]>([]);
  const [projections, setProjections] = useState<any[]>([]);
  const [chatMsgs, setChatMsgs] = useState<{ text: string; from: string; type: string }[]>([]);
  const [publishMsg, setPublishMsg] = useState('');
  const [campaignPubMsg, setCampaignPubMsg] = useState('');
  const [debugData, setDebugData] = useState('');
  const [projType, setProjType] = useState('message');
  const [projContent, setProjContent] = useState('');

  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [fetchingRooms, setFetchingRooms] = useState(false);
  const [availableChars, setAvailableChars] = useState<{ id: string; name: string }[]>([]);

  const prevClientRef = useRef<SyncClient | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dd-sync-url');
      if (saved && !isLocalUrl(saved)) setSyncUrl(saved);
    } catch {}
    try {
      const savedRoom = localStorage.getItem('dd-sync-room');
      if (savedRoom) setRoom(savedRoom);
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
        const char = entry.path ? loadCharFromLocal(entry.path) : null;
        if (char) chars.push({ id: char.id, name: char.name });
      }
    } catch {}
    setAvailableChars(chars);
  }, []);

  // If already connected as DM, show management view
  useEffect(() => {
    if (lan.isActive && lan.role === 'dm') {
      setTab('manage');
    }
  }, [lan.isActive, lan.role]);

  // DM event listeners on syncClient
  useEffect(() => {
    const client = lan.syncClient;
    if (!client || client === prevClientRef.current || lan.role !== 'dm') return;
    prevClientRef.current = client;

    const unsubJoin = client.onPlayerJoined((payload) => {
      setPlayers(prev => {
        if (prev.find(p => p.characterId === payload.characterId)) return prev;
        return [...prev, { characterId: payload.characterId, characterName: payload.characterName || payload.characterId }];
      });
    });

    const unsubLeave = client.onPlayerLeft((payload) => {
      setPlayers(prev => prev.filter(p => p.characterId !== payload.characterId));
    });

    const unsubCharUpdate = client.onCharacterUpdate((payload) => {
      setCharacters(prev => {
        const idx = prev.findIndex(c => c.id === payload.characterId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], name: payload.data?.name || next[idx].name };
          return next;
        }
        return prev;
      });
    });

    const unsubProj = client.onProjection((proj) => {
      if (proj === null) { setProjections([]); }
      else { setProjections(prev => prev.find(p => p.id === proj.id) ? prev : [...prev, proj]); }
    });

    const unsubJoinAck = client.onJoinAck((payload) => {
      if (payload.summary) setPlayers([]);
    });

    const unsubChat = client.onChat((text, senderId) => {
      setChatMsgs(prev => [...prev, { text, from: senderId, type: 'chat' }]);
    });

    const unsubRoll = client.onDiceRoll((payload, senderId) => {
      setChatMsgs(prev => [...prev, { text: `🎲 ${payload.label}: ${payload.result}`, from: senderId, type: 'roll' }]);
    });

    return () => { unsubJoin(); unsubLeave(); unsubCharUpdate(); unsubProj(); unsubJoinAck(); unsubChat(); unsubRoll(); };
  }, [lan.syncClient, lan.role]);

  const startDmSession = useCallback(async () => {
    setError('');
    setConnecting(true);
    const roomName = room.trim() || 'campaign';
    try {
      const base = syncUrl.replace(/\/+$/, '');
      console.log('[LAN DM] URL:', base, 'Room:', roomName);
      const res = await fetch(`${base}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName, password: password || null }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Failed to start session'); setConnecting(false); return; }

      lan.connect(syncUrl, roomName, 'dm');
      try { localStorage.setItem('dungeon-delver-role', 'dm'); } catch {}
      setConnecting(false);

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
    } catch (e: any) {
      setError(`Could not connect to sync server at ${syncUrl}. Error: ${e.message || e}. Make sure to run npm run sync-server`);
      setConnecting(false);
    }
  }, [syncUrl, room, password, lan]);

  const stopSession = useCallback(() => {
    lan.disconnect();
    setPlayers([]);
    setProjections([]);
    setTab('dm');
  }, [lan]);

  const publishCharacters = useCallback(async () => {
    const client = lan.syncClient;
    if (!client || lan.status !== 'connected') return;
    const chars = availableChars.filter(c => c.id);
    const fullChars = chars.map(c => {
      const key = `dd-char-${c.id}`;
      return loadCharFromLocal(key) || c;
    });
    client.publishCharacters(fullChars);
    // Also write to server disk so "Fetch from Server" can find them
    const base = syncUrl.replace(/\/+$/, '');
    const roomName = room || localStorage.getItem('dd-sync-room') || 'default';
    let httpFailures = 0;
    for (const c of fullChars) {
      try { await pushCharacter(base, roomName, c); } catch (e) { console.error('[Publish HTTP POST failed]', c.id, c.name, e); httpFailures++; }
    }
    const wsNote = httpFailures > 0 ? ` (${httpFailures} HTTP POSTs failed, but characters were broadcast via WebSocket and should persist if server is restarted with the latest code)` : '';
    setPublishMsg(`Published ${fullChars.length} characters${wsNote}`);
    setTimeout(() => setPublishMsg(''), 3000);
  }, [availableChars, lan.syncClient, lan.status, syncUrl, room]);

  const publishCampaignConfig = useCallback(async () => {
    try {
      const campaignId = getActiveCampaign();
      if (!campaignId) { setCampaignPubMsg('No active campaign found'); setTimeout(() => setCampaignPubMsg(''), 3000); return; }
      const config = loadCampaignConfig(campaignId);
      if (!config) { setCampaignPubMsg('No campaign config found'); setTimeout(() => setCampaignPubMsg(''), 3000); return; }
      await lan.publishCampaignConfig(config);
      setCampaignPubMsg('Campaign config published');
      setTimeout(() => setCampaignPubMsg(''), 3000);
    } catch { setCampaignPubMsg('Failed to publish'); setTimeout(() => setCampaignPubMsg(''), 3000); }
  }, [lan]);

  const fetchServerCharacters = useCallback(async () => {
    setPublishMsg('');
    const base = syncUrl.replace(/\/+$/, '');
    const roomName = room || localStorage.getItem('dd-sync-room') || 'default';
    console.log('[Fetch] URL:', base, 'Room:', roomName);
    try {
      const url = `${base}/api/sync/characters?room=${encodeURIComponent(roomName)}`;
      console.log('[Fetch] HTTP GET', url);
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown error');
        setPublishMsg(`Server returned HTTP ${res.status}: ${errText}`);
        setTimeout(() => setPublishMsg(''), 5000);
        return;
      }
      const data = await res.json();
      const chars = data.characters || [];
      console.log('[Fetch] response:', chars);
      if (chars.length === 0) { setPublishMsg('No characters on server'); setTimeout(() => setPublishMsg(''), 3000); return; }
      let count = 0;
      for (const c of chars) {
        try {
          const full = await pullCharacter(base, roomName, c.id);
          if (full) {
            saveCharToLocal(full);
            count++;
          }
        } catch {}
      }
      const updated = [...availableChars];
      for (const c of chars) {
        if (!updated.find(u => u.id === c.id)) {
          updated.push({ id: c.id, name: c.name });
        }
      }
      setAvailableChars(updated);
      setPublishMsg(`Fetched ${count} characters from server`);
      setTimeout(() => setPublishMsg(''), 3000);
    } catch (e: any) {
      console.error('[Fetch] network error:', e);
      setPublishMsg(`Failed to reach server: ${e.message}. URL: ${base}/api/sync/characters?room=${encodeURIComponent(roomName)}`);
      setTimeout(() => setPublishMsg(''), 6000);
    }
  }, [syncUrl, room, availableChars]);

  const sendProjection = useCallback(() => {
    if (!projContent.trim() || lan.status !== 'connected' || !lan.syncClient) return;
    lan.syncClient.project(projType, projContent.trim());
    setProjContent('');
  }, [projContent, projType, lan.status, lan.syncClient]);

  const clearProjections = useCallback(() => {
    if (lan.status !== 'connected' || !lan.syncClient) return;
    lan.syncClient.clearProjections();
  }, [lan.status, lan.syncClient]);

  const fetchActiveRooms = useCallback(async () => {
    setFetchingRooms(true);
    setError('');
    try {
      const base = syncUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/api/rooms/active`);
      const data = await res.json();
      setActiveRooms(data.rooms || []);
    } catch (e) {
      setError(`Failed to reach sync server at ${syncUrl}. Check the URL and ensure the server allows remote connections (Windows firewall may block port 3001)`);
    }
    setFetchingRooms(false);
  }, [syncUrl]);

  const destroyRoom = useCallback(async (roomId: string) => {
    try {
      const base = syncUrl.replace(/\/+$/, '');
      await fetch(`${base}/api/rooms/destroy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: roomId }) });
      setActiveRooms(prev => prev.filter(r => r.id !== roomId));
      if (room === roomId) setRoom('');
    } catch (e) {
      setError(`Failed to destroy room: ${(e as any).message}`);
    }
  }, [syncUrl, room]);

  const joinAsPlayer = useCallback(async () => {
    setError('');
    const roomName = room.trim() || 'campaign';
    try {
      const base = syncUrl.replace(/\/+$/, '');
      console.log('[LAN Join] URL:', base, 'Room:', roomName);
      const res = await fetch(`${base}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Failed to join'); return; }
      lan.connect(syncUrl, roomName, 'player');
      router.push('/play');
    } catch (e) {
      setError(`Could not reach sync server at ${syncUrl}/api/rooms/join. Ensure the sync server is running and reachable from this device (check firewall/network)`);
    }
  }, [syncUrl, room, router, lan]);

  // ── Start or Manage view ──
  if (lan.isActive && lan.role === 'dm') {
    const isConnect = lan.status === 'connected';
    return (
      <div style={s.page}>
        <div style={s.box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ ...s.title, margin: 0, textAlign: 'left' as const }}>LAN Session</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={async () => {
                const roomName = room || localStorage.getItem('dd-sync-room');
                if (roomName) {
                  try {
                    const base = syncUrl.replace(/\/+$/, '');
                    await fetch(`${base}/api/rooms/destroy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: roomName }) });
                  } catch {}
                }
                stopSession();
              }} style={{ ...s.btn, background: '#ef4444', color: '#e8dcc8', fontSize: '0.8rem' }}>Delete Room</button>
              <button onClick={stopSession} style={{ ...s.btn, background: '#a83232', color: '#e8dcc8', fontSize: '0.8rem' }}>End Session</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', padding: '0.75rem', background: '#1a1714', borderRadius: '6px', border: '1px solid #3d3528' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[lan.status] }} />
            <span style={{ color: '#e8dcc8', fontSize: '0.85rem' }}>{lan.status}</span>
            <span style={{ color: '#8a7e6a', fontSize: '0.75rem' }}>· Room: {lan.room}</span>
            {players.length > 0 && <span style={{ color: '#5a5248', fontSize: '0.75rem' }}>· {players.length} player{players.length !== 1 ? 's' : ''}</span>}
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 350px' }}>
              <div style={s.card}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Connected Players</h3>
                {players.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: '#5a5248' }}>No players connected yet.</p>
                ) : (
                  players.map(p => (
                    <div key={p.characterId} style={{ fontSize: '0.75rem', padding: '4px 0', color: '#e8dcc8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.characterName || p.characterId}</span>
                      <span style={{ color: '#16a34a', fontSize: '0.65rem' }}>connected</span>
                    </div>
                  ))
                )}
              </div>

              <div style={s.card}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Characters</h3>
                <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginBottom: '8px' }}>
                  {availableChars.length} character{availableChars.length !== 1 ? 's' : ''} found in localStorage
                </div>
                {availableChars.length > 0 && (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
                    {availableChars.map(c => (
                      <div key={c.id} style={{ fontSize: '0.75rem', padding: '2px 0', color: '#e8dcc8' }}>
                        {c.name} <span style={{ color: '#5a5248', fontSize: '0.65rem' }}>({c.id})</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={publishCharacters} style={{ ...s.btn, background: isConnect ? '#c9a84c' : '#5a5248', color: isConnect ? '#0c0e14' : '#8a7e6a', width: '100%', cursor: isConnect ? 'pointer' : 'default' }}>
                  Publish Characters to Server
                </button>
                <button onClick={fetchServerCharacters} disabled={!isConnect}
                  style={{ ...s.btn, background: isConnect ? '#2d3748' : '#5a5248', color: isConnect ? '#e8dcc8' : '#8a7e6a', width: '100%', cursor: isConnect ? 'pointer' : 'default', marginTop: '6px', border: '1px solid #4a5568' }}>
                  Fetch from Server
                </button>
                {publishMsg && <p style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '6px' }}>{publishMsg}</p>}
                <button onClick={publishCampaignConfig} style={{ ...s.btn, background: isConnect ? '#2d3748' : '#5a5248', color: isConnect ? '#e8dcc8' : '#8a7e6a', width: '100%', cursor: isConnect ? 'pointer' : 'default', marginTop: '6px', border: '1px solid #4a5568' }}>
                  Publish Campaign Config
                </button>
                {campaignPubMsg && <p style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '6px' }}>{campaignPubMsg}</p>}
                <button onClick={async () => {
                  try {
                    const base = syncUrl.replace(/\/+$/, '');
                    const roomName = room || localStorage.getItem('dd-sync-room') || 'default';
                    const res = await fetch(`${base}/api/sync/characters?room=${encodeURIComponent(roomName)}`);
                    const data = await res.json();
                    setDebugData(JSON.stringify(data, null, 2));
                    const allChars = await fetch(`${base}/api/health`);
                    const health = await allChars.json();
                    console.log('[Debug] rooms on server:', health.rooms);
                    console.log('[Debug] characters response:', data);
                  } catch (e: any) { setDebugData(`Error: ${e.message}`); }
                }} style={{ ...s.btn, background: '#2d3748', color: '#8a7e6a', width: '100%', marginTop: '6px', border: '1px solid #4a5568', fontSize: '0.7rem' }}>
                  Debug: Check Server
                </button>
                {debugData && <pre style={{ fontSize: '0.6rem', color: '#8a7e6a', marginTop: '6px', maxHeight: '150px', overflowY: 'auto', background: '#0c0e14', padding: '6px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{debugData}</pre>}
              </div>
            </div>

            <div style={{ flex: '1 1 350px' }}>
              <div style={s.card}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Project to Players</h3>
                <select value={projType} onChange={e => setProjType(e.target.value)}
                  style={{ ...s.input, cursor: 'pointer', appearance: 'auto' as any, marginBottom: '8px' }}>
                  {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <textarea style={s.textarea} placeholder="Type content to share..." value={projContent} onChange={e => setProjContent(e.target.value)} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={sendProjection} disabled={!projContent.trim() || !isConnect}
                    style={{ ...s.btn, background: projContent.trim() && isConnect ? '#c9a84c' : '#5a5248', color: projContent.trim() && isConnect ? '#0c0e14' : '#8a7e6a', flex: 1 }}>
                    Send to Players
                  </button>
                  <button onClick={clearProjections} disabled={!isConnect || projections.length === 0}
                    style={{ ...s.btn, background: isConnect && projections.length > 0 ? '#a83232' : '#5a5248', color: isConnect && projections.length > 0 ? '#e8dcc8' : '#8a7e6a' }}>
                    Clear All
                  </button>
                </div>
              </div>

              {projections.length > 0 && (
                <div style={s.card}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Active Projections ({projections.length})</h3>
                  {projections.map((proj, i) => (
                    <div key={proj.id || i} style={{ background: '#0c0e14', borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
                      <div style={{ color: '#c9a84c', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>{proj.contentType || 'message'}</div>
                      <ProjectionRenderer content={typeof proj.content === 'string' ? proj.content : JSON.stringify(proj.content)} contentType={proj.contentType} />
                    </div>
                  ))}
                </div>
              )}

              <div style={s.card}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Player Chat & Rolls</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {chatMsgs.length === 0 && <p style={{ color: '#5a5248', fontSize: '0.75rem' }}>No messages from players yet.</p>}
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{
                      padding: '4px 8px', borderRadius: '4px',
                      background: m.type === 'roll' ? '#0c0e14' : '#1a1714',
                      border: m.type === 'roll' ? '1px solid #3d3528' : '1px solid transparent',
                    }}>
                      <div style={{ fontSize: '0.6rem', color: '#8a7e6a' }}>{m.from.substring(0, 16)}</div>
                      <div>{m.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={s.card}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Session Info</h3>
                <div style={{ fontSize: '0.75rem', color: '#8a7e6a', lineHeight: 1.8 }}>
                  <p><strong>Sync Server:</strong> {lan.serverUrl || syncUrl}</p>
                  <p><strong>Room:</strong> {lan.room}</p>
                  <p><strong>Players:</strong> {players.length} connected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lan.isActive && lan.role === 'player') {
    return (
      <div style={s.page}>
        <div style={s.box}>
          <h1 style={s.title}>Connected as Player</h1>
          <p style={s.sub}>You are connected to room "{lan.room}"</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[lan.status] }} />
            <span style={{ color: '#8a7e6a', fontSize: '0.85rem' }}>{lan.status}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => router.push('/play')} style={{ ...s.btn, background: '#c9a84c', color: '#0c0e14', width: '100%', maxWidth: '300px' }}>
              Open Player View
            </button>
            <button onClick={() => { lan.disconnect(); }} style={{ ...s.btn, background: '#a83232', color: '#e8dcc8', width: '100%', maxWidth: '300px' }}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Setup view (not connected) ──
  return (
    <div style={s.page}>
      <div style={s.box}>
        <h1 style={s.title}>LAN Session</h1>
        <p style={s.sub}>Host or join a game on your local network</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          <button onClick={() => setTab('dm')} style={{ ...s.btn, flex: 1, maxWidth: '200px', background: tab === 'dm' ? '#c9a84c' : '#1a1714', color: tab === 'dm' ? '#0c0e14' : '#8a7e6a', border: '1px solid #3d3528' }}>I&apos;m the DM</button>
          <button onClick={() => setTab('player')} style={{ ...s.btn, flex: 1, maxWidth: '200px', background: tab === 'player' ? '#c9a84c' : '#1a1714', color: tab === 'player' ? '#0c0e14' : '#8a7e6a', border: '1px solid #3d3528' }}>I&apos;m a Player</button>
        </div>

        {tab === 'dm' && (
          <>
            <label style={s.label}>Sync Server URL</label>
            <input style={s.input} placeholder={getDefaultSyncUrl()} value={syncUrl} onChange={e => { setSyncUrl(e.target.value); localStorage.setItem('dd-sync-url', e.target.value); }} />
            <button onClick={async () => {
              try {
                const res = await fetch(`${syncUrl.replace(/\/+$/, '')}/api/health`);
                const data = await res.json();
                setPublishMsg(`✓ Connected: ${JSON.stringify(data)}`);
              } catch (e: any) {
                setPublishMsg(`✗ Failed: ${e.message}`);
              }
              setTimeout(() => setPublishMsg(''), 4000);
            }}
              style={{ background: 'transparent', border: '1px solid #4a5568', color: '#8a7e6a', borderRadius: '4px', padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer', marginBottom: '10px' }}>
              Test Connection
            </button>
            {publishMsg && <div style={{ fontSize: '0.7rem', color: publishMsg.startsWith('✓') ? '#16a34a' : '#ef4444', marginBottom: '8px' }}>{publishMsg}</div>}
            <label style={s.label}>Room / Campaign Name</label>
            <input style={s.input} placeholder="e.g., Curse of Strahd" value={room} onChange={e => { setRoom(e.target.value); localStorage.setItem('dd-sync-room', e.target.value); }} />
            <label style={s.label}>Password (optional)</label>
            <input style={s.input} type="password" placeholder="Leave blank for no password" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p style={s.error}>{error}</p>}
            <button onClick={startDmSession} disabled={connecting}
              style={{ ...s.btn, background: connecting ? '#5a5248' : '#c9a84c', color: '#0c0e14', width: '100%' }}>
              {connecting ? 'Starting...' : 'Start LAN Session'}
            </button>
          </>
        )}

        {tab === 'player' && (
          <>
            <label style={s.label}>Sync Server URL</label>
            <input style={s.input} placeholder="http://192.168.1.42:3001" value={syncUrl} onChange={e => { setSyncUrl(e.target.value); localStorage.setItem('dd-sync-url', e.target.value); setActiveRooms([]); }} />
            <button onClick={async () => {
              try {
                const res = await fetch(`${syncUrl.replace(/\/+$/, '')}/api/health`);
                const data = await res.json();
                setPublishMsg(`✓ Connected: ${JSON.stringify(data)}`);
              } catch (e: any) {
                setPublishMsg(`✗ Failed: ${e.message}`);
              }
              setTimeout(() => setPublishMsg(''), 4000);
            }}
              style={{ background: 'transparent', border: '1px solid #4a5568', color: '#8a7e6a', borderRadius: '4px', padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer', marginBottom: '10px' }}>
              Test Connection
            </button>
            {publishMsg && <div style={{ fontSize: '0.7rem', color: publishMsg.startsWith('✓') ? '#16a34a' : '#ef4444', marginBottom: '8px' }}>{publishMsg}</div>}
            <button onClick={fetchActiveRooms} disabled={fetchingRooms}
              style={{ ...s.btn, background: fetchingRooms ? '#5a5248' : '#2d3748', color: '#e8dcc8', border: '1px solid #4a5568', marginBottom: '10px', padding: '10px', width: '100%', fontSize: '0.85rem' }}>
              {fetchingRooms ? 'Scanning...' : 'Find Active Rooms'}
            </button>

            {activeRooms.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={s.label}>Active Rooms — click to select</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {activeRooms.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => setRoom(r.id)}
                        style={{ flex: 1, padding: '6px 14px', background: room === r.id ? '#c9a84c' : '#1a1714', border: `1px solid ${room === r.id ? '#c9a84c' : '#3d3528'}`, borderRadius: '6px', color: room === r.id ? '#0c0e14' : '#e8dcc8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: room === r.id ? 'bold' : 'normal', textAlign: 'left' }}>
                        {r.id} {r.dmConnected ? '🟢' : '🔴'} ({r.playerCount} players)
                      </button>
                      <button onClick={() => destroyRoom(r.id)}
                        style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={s.label}>Room Name</label>
            <input style={s.input} placeholder="e.g., Curse of Strahd" value={room} onChange={e => { setRoom(e.target.value); localStorage.setItem('dd-sync-room', e.target.value); }} />
            {error && <p style={s.error}>{error}</p>}
            <button onClick={joinAsPlayer}
              style={{ ...s.btn, background: '#2d3748', color: '#e8dcc8', border: '1px solid #4a5568', width: '100%', marginTop: '10px' }}>
              Join Game
            </button>
          </>
        )}
      </div>
    </div>
  );
}
