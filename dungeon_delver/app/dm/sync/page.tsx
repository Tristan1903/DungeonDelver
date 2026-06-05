'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncClient, SyncStatus } from '../../../utils/syncEngine';

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '800px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' } as const,
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const },
};

const STATUS_COLORS: Record<SyncStatus, string> = {
  connected: '#16a34a',
  connecting: '#c9a84c',
  disconnected: '#5a5248',
  error: '#a83232',
};

export default function SyncPage() {
  const [serverUrl, setServerUrl] = useState('ws://localhost:3001');
  const [roomName, setRoomName] = useState('default');
  const [playerName, setPlayerName] = useState(() => `DM-${Math.random().toString(36).slice(2, 6)}`);
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [connectedClients, setConnectedClients] = useState<number>(0);
  const [chat, setChat] = useState<{ sender: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [lastState, setLastState] = useState<any>(null);
  const [hostView, setHostView] = useState(false);
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

  const sendState = () => {
    syncRef.current?.sendState({ test: true, time: Date.now(), from: playerName });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    syncRef.current?.sendChat(chatInput.trim());
    setChat(prev => [...prev, { sender: `${playerName} (you)`, text: chatInput.trim() }]);
    setChatInput('');
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Multi-User Sync</h1>
      <p style={styles.sub}>Connect players to share combat and campaign state in real time.</p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Connection panel */}
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
                  <button onClick={connect} style={{ flex: 1, padding: '8px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Connect
                  </button>
                ) : (
                  <button onClick={disconnect} style={{ flex: 1, padding: '8px', background: '#a83232', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Disconnect
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[status], transition: '0.3s' }} />
                <span style={{ fontSize: '0.75rem', color: '#8a7e6a' }}>{status}</span>
                {status === 'connected' && (
                  <span style={{ fontSize: '0.7rem', color: '#5a5248' }}>· {connectedClients} client{connectedClients !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {status === 'connected' && (
            <div style={styles.panel}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Actions</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={sendState} style={{ padding: '6px 14px', background: '#c9a84c', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                  Send Test State
                </button>
              </div>
              {lastState && (
                <div style={{ marginTop: '8px', padding: '6px', background: '#1a1714', borderRadius: '4px', fontSize: '0.65rem', color: '#8a7e6a' }}>
                  <div>Last state from <strong>{lastState.senderId}</strong> at {lastState.time}</div>
                  <pre style={{ margin: '4px 0 0', fontSize: '0.6rem' }}>{JSON.stringify(lastState.state, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* How to use */}
          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#5a5248' }}>How to Use</h3>
            <ol style={{ fontSize: '0.7rem', color: '#8a7e6a', margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
              <li>Run <code style={{ background: '#1a1714', padding: '1px 4px', borderRadius: '3px' }}>node server/sync-server.js</code></li>
              <li>DM connects with room name (e.g., "campaign-alpha")</li>
              <li>Players connect to the same URL and room</li>
              <li>State broadcasts to all connected clients</li>
              <li>Host IP: use <code style={{ background: '#1a1714', padding: '1px 4px', borderRadius: '3px' }}>ipconfig</code> to find LAN address, replace <code>localhost</code></li>
            </ol>
          </div>
        </div>

        {/* Chat panel */}
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
              <button onClick={sendChat} disabled={!chatInput.trim() || status !== 'connected'}
                style={{ padding: '8px 14px', background: '#c9a84c', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
