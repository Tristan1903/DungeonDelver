'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { SyncClient, SyncStatus } from '../utils/syncEngine';

interface LanSyncState {
  syncClient: SyncClient | null;
  status: SyncStatus;
  room: string;
  role: string;
  characterId: string;
  characterName: string;
  serverUrl: string;
  campaignConfig: any | null;
  connect: (url: string, room: string, role: string, characterId?: string, characterName?: string) => void;
  disconnect: () => void;
  publishCampaignConfig: (config: any) => void;
  isActive: boolean;
}

const LanSyncContext = createContext<LanSyncState>({
  syncClient: null,
  status: 'disconnected',
  room: '',
  role: '',
  characterId: '',
  characterName: '',
  serverUrl: '',
  campaignConfig: null,
  connect: () => {},
  disconnect: () => {},
  publishCampaignConfig: () => {},
  isActive: false,
});

export function useLanSync() {
  return useContext(LanSyncContext);
}

export function LanSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncClient, setSyncClient] = useState<SyncClient | null>(null);
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [room, setRoom] = useState('');
  const [role, setRole] = useState('');
  const [characterId, setCharacterId] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [campaignConfig, setCampaignConfig] = useState<any | null>(null);
  const clientRef = useRef<SyncClient | null>(null);

  function isLocalUrl(url: string) {
    try { const h = new URL(url).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'; } catch { return false; }
  }

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem('dd-sync-url');
      const savedRoom = localStorage.getItem('dd-lan-room');
      const savedRole = localStorage.getItem('dd-lan-role');
      const savedCharId = localStorage.getItem('dd-lan-character-id') || '';
      const savedCharName = localStorage.getItem('dd-lan-character-name') || '';

      if (savedUrl && savedRoom && savedRole && !isLocalUrl(savedUrl)) {
        setServerUrl(savedUrl);
        setRoom(savedRoom);
        setRole(savedRole);
        setCharacterId(savedCharId);
        setCharacterName(savedCharName);

        // Restore cached campaign config
        try {
          const cached = localStorage.getItem('dd-lan-campaign-config');
          if (cached) setCampaignConfig(JSON.parse(cached));
        } catch {}

        const base = savedUrl.replace(/\/+$/, '');
        const wsUrl = base.replace(/^http/, 'ws');
        const senderId = savedRole === 'dm' ? `dm-${Date.now()}` : (savedCharId ? `player-${savedCharId}-${Date.now()}` : `unassigned-${Date.now()}`);
        const client = new SyncClient(wsUrl, savedRoom, senderId);

        client.onStatus((s) => {
          setStatus(s);
          if (s === 'connected') {
            if (savedRole === 'dm') {
              client.joinAsDm();
            } else {
              client.joinAsPlayer(savedCharId, savedCharName || savedCharId || 'Adventurer');
            }
          }
        });

        client.onError(() => {
          // Reconnection is handled by SyncClient internally
        });

        client.connect();
        clientRef.current = client;
        setSyncClient(client);
      }
    } catch {}
  }, []);

  const connect = useCallback((url: string, newRoom: string, newRole: string, charId?: string, charName?: string) => {
    disconnect();

    localStorage.setItem('dd-sync-url', url);
    localStorage.setItem('dd-lan-room', newRoom);
    localStorage.setItem('dd-lan-role', newRole);
    if (charId) localStorage.setItem('dd-lan-character-id', charId);
    if (charName) localStorage.setItem('dd-lan-character-name', charName);

    setServerUrl(url);
    setRoom(newRoom);
    setRole(newRole);
    setCharacterId(charId || '');
    setCharacterName(charName || '');

    const base = url.replace(/\/+$/, '');
    const wsUrl = base.replace(/^http/, 'ws');
    const senderId = newRole === 'dm' ? `dm-${Date.now()}` : (charId ? `player-${charId}-${Date.now()}` : `unassigned-${Date.now()}`);
    const client = new SyncClient(wsUrl, newRoom, senderId);

    client.onStatus((s) => {
      setStatus(s);
      if (s === 'connected') {
        if (newRole === 'dm') {
          client.joinAsDm();
        } else {
          client.joinAsPlayer(charId || '', charName || charId || 'Adventurer');
        }
      }
    });

    client.connect();
    clientRef.current = client;
    setSyncClient(client);
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setSyncClient(null);
    setStatus('disconnected');

    try {
      localStorage.removeItem('dd-lan-room');
      localStorage.removeItem('dd-lan-role');
      localStorage.removeItem('dd-lan-character-id');
      localStorage.removeItem('dd-lan-character-name');
    } catch {}
  }, []);

  const publishCampaignConfig = useCallback(async (config: any) => {
    try {
      const base = (serverUrl || localStorage.getItem('dd-sync-url') || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`).replace(/\/+$/, '');
      const roomName = room || localStorage.getItem('dd-lan-room') || '';
      if (!roomName) return;
      await fetch(`${base}/api/campaign-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName, config }),
      });
      setCampaignConfig(config);
    } catch {}
  }, [serverUrl, room]);

  // Auto-fetch campaign config on connect (player side) with retry
  useEffect(() => {
    if (status !== 'connected' || role !== 'player') return;
    const base = (serverUrl || localStorage.getItem('dd-sync-url') || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`).replace(/\/+$/, '');
    const roomName = room || localStorage.getItem('dd-lan-room') || '';
    if (!roomName) return;

    let attempts = 0;
    const maxAttempts = 5;
    const tryFetch = () => {
      fetch(`${base}/api/campaign-config?room=${encodeURIComponent(roomName)}`)
        .then(r => r.ok ? r.json() : null)
        .then(config => {
          if (config) {
            setCampaignConfig(config);
            try { localStorage.setItem('dd-lan-campaign-config', JSON.stringify(config)); } catch {}
          } else if (++attempts < maxAttempts) {
            setTimeout(tryFetch, 2000);
          }
        })
        .catch(() => {
          if (++attempts < maxAttempts) setTimeout(tryFetch, 2000);
        });
    };
    tryFetch();
  }, [status, role, serverUrl, room]);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  return (
    <LanSyncContext.Provider value={{
      syncClient,
      status,
      room,
      role,
      characterId,
      characterName,
      serverUrl,
      campaignConfig,
      connect,
      disconnect,
      publishCampaignConfig,
      isActive: status === 'connected',
    }}>
      {children}
    </LanSyncContext.Provider>
  );
}
