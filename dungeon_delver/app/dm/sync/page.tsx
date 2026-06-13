'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncClient, SyncStatus } from '../../../utils/syncEngine';
import {
  checkServerHealth, pushAllCharacters, pullAllCharacters, pushAllCampaigns, pullAllCampaigns,
  listCloudCharacters, listCloudCampaigns, pushCharacter, pullCharacter,
  pushCampaign, pullCampaign,
} from '../../../utils/syncManager';

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '900px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' } as const,
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const },
  tab: (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', background: active ? '#c9a84c' : 'transparent', border: `1px solid ${active ? '#c9a84c' : '#3d3528'}`,
    color: active ? '#000' : '#8a7e6a', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? 'bold' : 'normal',
  }),
  btn: (bg: string, disabled?: boolean): React.CSSProperties => ({
    padding: '8px 16px', background: disabled ? '#2d3748' : bg, border: 'none', color: disabled ? '#5a5248' : '#e8dcc8',
    borderRadius: '4px', cursor: disabled ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
  }),
};

const STATUS_COLORS: Record<string, string> = {
  connected: '#16a34a', connecting: '#c9a84c', disconnected: '#5a5248', error: '#a83232',
  idle: '#5a5248', syncing: '#c9a84c', success: '#16a34a',
};

export default function SyncPage() {
  const [tab, setTab] = useState<'websocket' | 'persistent'>('websocket');

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Multi-User Sync</h1>
      <p style={styles.sub}>WebSocket for LAN real-time &bull; Sync Server for persistent cross-device sync</p>

      <div style={{ display: 'flex', gap: '0', marginBottom: '0' }}>
        <button onClick={() => setTab('websocket')} style={styles.tab(tab === 'websocket')}>WebSocket (LAN)</button>
        <button onClick={() => setTab('persistent')} style={styles.tab(tab === 'persistent')}>Persistent Sync</button>
      </div>

      {tab === 'websocket' ? <WebSocketSync /> : <PersistentSync />}
    </div>
  );
}

// ─── WebSocket (LAN) Tab ─────────────────────────────────────────────────────

function WebSocketSync() {
  const [serverUrl, setServerUrl] = useState('ws://localhost:3001');
  const [roomName, setRoomName] = useState('default');
  const [playerName, setPlayerName] = useState(() => `DM-${Math.random().toString(36).slice(2, 6)}`);
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [chat, setChat] = useState<{ sender: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [lastState, setLastState] = useState<any>(null);
  const syncRef = useRef<SyncClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const connect = useCallback(() => {
    if (syncRef.current) syncRef.current.disconnect();
    const client = new SyncClient(serverUrl, roomName, playerName);
    syncRef.current = client;
    client.onStatus(setStatus);
    client.onState((state, senderId) => {
      setLastState({ state, senderId, time: new Date().toLocaleTimeString() });
    });
    client.onChat((text, senderId) => {
      setChat(prev => [...prev, { sender: senderId, text }]);
    });
    client.connect();
  }, [serverUrl, roomName, playerName]);

  const disconnect = useCallback(() => {
    syncRef.current?.disconnect();
    syncRef.current = null;
  }, []);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    syncRef.current?.sendChat(chatInput.trim());
    setChat(prev => [...prev, { sender: `${playerName} (you)`, text: chatInput.trim() }]);
    setChatInput('');
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
      <div style={{ flex: '1 1 350px' }}>
        <div style={styles.panel}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Connection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input style={styles.input} placeholder="Server URL" value={serverUrl} onChange={e => setServerUrl(e.target.value)} />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input style={{ ...styles.input, flex: 1 }} placeholder="Room name" value={roomName} onChange={e => setRoomName(e.target.value)} />
              <input style={{ ...styles.input, flex: 1 }} placeholder="Your name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {status === 'disconnected' || status === 'error' ? (
                <button onClick={connect} style={styles.btn('#16a34a')}>Connect</button>
              ) : (
                <button onClick={disconnect} style={styles.btn('#a83232')}>Disconnect</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[status], transition: '0.3s' }} />
              <span style={{ fontSize: '0.75rem', color: '#8a7e6a' }}>{status}</span>
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#5a5248' }}>How to Use</h3>
          <ol style={{ fontSize: '0.7rem', color: '#8a7e6a', margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
            <li>Run <code style={{ background: '#1a1714', padding: '1px 4px', borderRadius: '3px' }}>npm run sync-server</code></li>
            <li>DM connects with room name (e.g., "campaign-alpha")</li>
            <li>Players connect to the same URL and room</li>
            <li>State broadcasts to all connected clients</li>
            <li>Host IP: use <code style={{ background: '#1a1714', padding: '1px 4px', borderRadius: '3px' }}>ipconfig</code> to find LAN address</li>
          </ol>
        </div>
      </div>

      <div style={{ flex: '1 1 300px' }}>
        <div style={{ ...styles.panel, display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Chat</h3>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {chat.length === 0 && <span style={{ fontSize: '0.7rem', color: '#5a5248' }}>No messages yet.</span>}
            {chat.map((m, i) => (
              <div key={i} style={{ fontSize: '0.7rem', padding: '4px 6px', background: '#1a1714', borderRadius: '4px' }}>
                <strong style={{ color: '#c9a84c' }}>{m.sender}:</strong> {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input style={styles.input} placeholder="Type a message..." value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()} />
            <button onClick={sendChat} disabled={!chatInput.trim() || status !== 'connected'} style={styles.btn('#c9a84c')}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Persistent Sync Tab ─────────────────────────────────────────────────────

function PersistentSync() {
  const [serverUrl, setServerUrl] = useState(() => `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`);
  const [room, setRoom] = useState('default');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('idle');
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [cloudChars, setCloudChars] = useState<any[]>([]);
  const [cloudCamps, setCloudCamps] = useState<any[]>([]);

  const onStatus = useCallback((status: string, msg?: string) => {
    setSyncStatus(status);
    if (msg) setSyncMsg(msg);
    setTimeout(() => setSyncMsg(null), 5000);
  }, []);

  const testConnection = useCallback(async () => {
    const ok = await checkServerHealth(serverUrl);
    setConnected(ok);
    if (ok) {
      onStatus('success', 'Connected to sync server');
      refreshLists();
    } else {
      onStatus('error', 'Could not connect to sync server');
    }
  }, [serverUrl, room]);

  const refreshLists = useCallback(async () => {
    const chars = await listCloudCharacters(serverUrl, room, onStatus);
    setCloudChars(chars);
    const camps = await listCloudCampaigns(serverUrl, room, onStatus);
    setCloudCamps(camps);
  }, [serverUrl, room, onStatus]);

  useEffect(() => { testConnection(); }, []);

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Connection settings */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'end' }}>
        <div style={{ flex: '1 1 250px' }}>
          <div style={{ fontSize: '0.65rem', color: '#5a5248', marginBottom: '4px' }}>Server URL</div>
          <input style={styles.input} value={serverUrl} onChange={e => setServerUrl(e.target.value)}
            placeholder={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`} />
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <div style={{ fontSize: '0.65rem', color: '#5a5248', marginBottom: '4px' }}>Room</div>
          <input style={styles.input} value={room} onChange={e => setRoom(e.target.value)}
            placeholder="default" />
        </div>
        <button onClick={testConnection} style={styles.btn('#c9a84c')}>
          {connected === true ? 'Reconnect' : connected === false ? 'Retry' : 'Connect'}
        </button>
      </div>

      {connected === false && (
        <div style={{ ...styles.panel, borderColor: '#a83232' }}>
          <div style={{ fontSize: '0.8rem', color: '#a83232' }}>
            Cannot connect. Make sure the sync server is running (<code style={{ background: '#1a1714', padding: '1px 4px', borderRadius: '3px' }}>npm run sync-server</code>).
          </div>
        </div>
      )}

      {connected === null && (
        <div style={{ ...styles.panel }}>
          <div style={{ fontSize: '0.8rem', color: '#8a7e6a' }}>Connecting to sync server...</div>
        </div>
      )}

      {connected === true && (
        <>
          {syncMsg && (
            <div style={{
              fontSize: '0.75rem', marginBottom: '0.5rem', padding: '6px 10px',
              background: '#1a1714', borderRadius: '4px',
              color: syncStatus === 'error' ? '#a83232' : syncStatus === 'syncing' ? '#c9a84c' : '#16a34a',
            }}>
              {syncStatus === 'syncing' && '⏳ '}
              {syncStatus === 'success' && '✓ '}
              {syncStatus === 'error' && '✗ '}
              {syncMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button onClick={() => pushAllCharacters(serverUrl, room, onStatus)} style={styles.btn('#16a34a', syncStatus === 'syncing')}>
              Push All Characters → Server
            </button>
            <button onClick={() => pullAllCharacters(serverUrl, room, onStatus)} style={styles.btn('#2980b9', syncStatus === 'syncing')}>
              Pull All Characters ← Server
            </button>
            <button onClick={() => pushAllCampaigns(serverUrl, room, onStatus)} style={styles.btn('#16a34a', syncStatus === 'syncing')}>
              Push All Campaigns → Server
            </button>
            <button onClick={() => pullAllCampaigns(serverUrl, room, onStatus)} style={styles.btn('#2980b9', syncStatus === 'syncing')}>
              Pull All Campaigns ← Server
            </button>
            <button onClick={refreshLists} style={styles.btn('#c9a84c', syncStatus === 'syncing')}>
              Refresh List
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Characters */}
            <div style={{ flex: '1 1 350px' }}>
              <div style={styles.panel}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#c9a84c' }}>
                  Characters on Server ({cloudChars.length})
                </h3>
                {cloudChars.length === 0 && (
                  <p style={{ fontSize: '0.7rem', color: '#5a5248' }}>No characters on server yet. Push some!</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cloudChars.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', background: '#1a1714', borderRadius: '4px', fontSize: '0.7rem',
                    }}>
                      <div>
                        <strong style={{ color: '#c9a84c' }}>{c.name}</strong>
                        <span style={{ color: '#5a5248', marginLeft: '6px' }}>Lv{c.level} {c.race} · {c.class}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={async () => {
                          await pullCharacter(serverUrl, room, c.id, onStatus);
                          refreshLists();
                        }} style={{ background: '#2980b9', border: 'none', color: '#e8dcc8', borderRadius: '3px', padding: '2px 8px', fontSize: '0.6rem', cursor: 'pointer' }}>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaigns */}
            <div style={{ flex: '1 1 350px' }}>
              <div style={styles.panel}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#c9a84c' }}>
                  Campaigns on Server ({cloudCamps.length})
                </h3>
                {cloudCamps.length === 0 && (
                  <p style={{ fontSize: '0.7rem', color: '#5a5248' }}>No campaigns on server yet. Push some!</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cloudCamps.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', background: '#1a1714', borderRadius: '4px', fontSize: '0.7rem',
                    }}>
                      <strong style={{ color: '#c9a84c' }}>{c.name}</strong>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={async () => {
                          await pullCampaign(serverUrl, room, c.id, onStatus);
                          refreshLists();
                        }} style={{ background: '#2980b9', border: 'none', color: '#e8dcc8', borderRadius: '3px', padding: '2px 8px', fontSize: '0.6rem', cursor: 'pointer' }}>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
