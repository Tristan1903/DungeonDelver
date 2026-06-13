'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncClient, SyncStatus } from '../../../utils/syncEngine';
import { getActiveCampaign, getCampaigns } from '../../../utils/campaignStorage';
import { loadCharFromLocal } from '../../../utils/storageEngine';
import ProjectToPlayers from '../../../components/ProjectToPlayers';

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '800px', margin: '0 auto' },
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' },
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' },
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const },
  label: { fontSize: '0.7rem', color: '#8a7e6a', marginBottom: '4px', display: 'block' },
  btn: { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' as const },
};

const STATUS_COLORS: Record<string, string> = {
  connected: '#16a34a', connecting: '#c9a84c', disconnected: '#5a5248', error: '#a83232',
};

export default function DmLanPage() {
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [room, setRoom] = useState('');
  const [players, setPlayers] = useState<{ characterId: string; characterName: string }[]>([]);
  const [projections, setProjections] = useState<any[]>([]);
  const [characters, setCharacters] = useState<{ id: string; name: string }[]>([]);
  const [publishMsg, setPublishMsg] = useState('');
  const syncRef = useRef<SyncClient | null>(null);

  useEffect(() => {
    const chars: { id: string; name: string }[] = [];
    try {
      const registry = JSON.parse(localStorage.getItem('dungeon-delver-character-registry') || '[]');
      for (const entry of registry) {
        const key = entry.id ? `dd-char-${entry.id}` : `dd-char-${entry.name}`;
        const char = loadCharFromLocal(key);
        if (char) chars.push({ id: char.id || entry.id, name: char.name });
      }
    } catch {}
    setCharacters(chars);

    try {
      const campaignId = getActiveCampaign();
      if (campaignId) {
        const campaigns = getCampaigns();
        const active = campaigns.find(c => c.id === campaignId);
        if (active) setRoom(active.name);
      }
    } catch {}
  }, []);

  const connect = useCallback(() => {
    if (syncRef.current) syncRef.current.disconnect();
    const roomName = room.trim() || 'campaign';
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const client = new SyncClient(wsUrl, roomName, `dm-${Date.now()}`);
    syncRef.current = client;

    client.onStatus(setStatus);

    client.onJoinAck((payload) => {
      if (payload.summary) {
        setPlayers([]);
      }
    });

    client.onPlayerJoined((payload) => {
      setPlayers(prev => {
        const exists = prev.find(p => p.characterId === payload.characterId);
        if (exists) return prev;
        return [...prev, { characterId: payload.characterId, characterName: payload.characterName || payload.characterId }];
      });
    });

    client.onPlayerLeft((payload) => {
      setPlayers(prev => prev.filter(p => p.characterId !== payload.characterId));
    });

    client.onCharacterUpdate((payload) => {
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

    client.onProjection((proj) => {
      if (proj === null) {
        setProjections([]);
      } else {
        setProjections(prev => {
          const exists = prev.find(p => p.id === proj.id);
          if (exists) return prev;
          return [...prev, proj];
        });
      }
    });

    client.connect();
    setTimeout(() => {
      if (client.getStatus() === 'connected') {
        client.joinAsDm();
      }
    }, 500);
  }, [room]);

  const disconnect = useCallback(() => {
    syncRef.current?.disconnect();
    syncRef.current = null;
    setStatus('disconnected');
    setPlayers([]);
  }, []);

  const publishCharacters = useCallback(() => {
    const client = syncRef.current;
    if (!client || status !== 'connected') return;
    const chars = characters.filter(c => c.id);
    const fullChars = chars.map(c => {
      const key = c.id.startsWith('dd-char-') ? c.id : `dd-char-${c.id}`;
      return loadCharFromLocal(key) || c;
    });
    client.publishCharacters(fullChars);
    setPublishMsg(`Published ${fullChars.length} characters`);
    setTimeout(() => setPublishMsg(''), 3000);
  }, [characters, status]);

  useEffect(() => {
    return () => { syncRef.current?.disconnect(); };
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>LAN Session</h1>
      <p style={styles.sub}>Manage your local network game session</p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 350px' }}>
          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Connection</h3>
            <label style={styles.label}>Room Name</label>
            <input style={styles.input} placeholder="Campaign name" value={room} onChange={e => setRoom(e.target.value)} />
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {status === 'disconnected' || status === 'error' ? (
                <button onClick={connect} style={{ ...styles.btn, background: '#16a34a', color: '#e8dcc8', flex: 1 }}>Connect</button>
              ) : (
                <button onClick={disconnect} style={{ ...styles.btn, background: '#a83232', color: '#e8dcc8', flex: 1 }}>Disconnect</button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[status] }} />
              <span style={{ fontSize: '0.7rem', color: '#8a7e6a' }}>{status}</span>
              {status === 'connected' && players.length > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#5a5248' }}>· {players.length} player{players.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {status === 'connected' && (
            <>
              <div style={styles.panel}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Characters</h3>
                <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginBottom: '8px' }}>
                  {characters.length} character{characters.length !== 1 ? 's' : ''} found in localStorage
                </div>
                {characters.length > 0 && (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
                    {characters.map(c => (
                      <div key={c.id} style={{ fontSize: '0.75rem', padding: '2px 0', color: '#e8dcc8' }}>
                        {c.name} <span style={{ color: '#5a5248', fontSize: '0.65rem' }}>({c.id})</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={publishCharacters} style={{ ...styles.btn, background: '#c9a84c', color: '#0c0e14', width: '100%' }}>
                  Publish Characters to Server
                </button>
                {publishMsg && <p style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '6px' }}>{publishMsg}</p>}
              </div>

              <div style={styles.panel}>
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
            </>
          )}
        </div>

        <div style={{ flex: '1 1 350px' }}>
          {status === 'connected' && (
            <ProjectToPlayers syncRef={syncRef} status={status} projections={projections} />
          )}

          <div style={styles.panel}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Session Info</h3>
            <div style={{ fontSize: '0.75rem', color: '#8a7e6a', lineHeight: 1.8 }}>
              <p><strong>Server URL:</strong> {typeof window !== 'undefined' ? window.location.origin : '...'}/join</p>
              <p><strong>Room:</strong> {room || 'default'}</p>
              <p><strong>Character IDs:</strong> Share these with players</p>
              <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {characters.map(c => (
                  <div key={c.id} style={{ fontSize: '0.7rem', fontFamily: 'monospace', padding: '1px 0' }}>
                    {c.name}: <span style={{ color: '#5a5248' }}>{c.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
