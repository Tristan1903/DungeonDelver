'use client';
import { useState, useEffect, useCallback } from 'react';
import { SessionFile, SessionEncounterLog, SessionJournalEntry, SessionLogStore } from '../../../lib/campaign';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { campaignKey } from '../../../utils/campaignStorage';

const STORAGE_KEY = 'sessions';
function sk() { return campaignKey(STORAGE_KEY); }

function loadStore(): SessionLogStore {
  if (typeof window === 'undefined') return { sessions: [], activeSessionId: null };
  try {
    const raw = localStorage.getItem(sk());
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sessions: [], activeSessionId: null };
}

function saveStore(store: SessionLogStore) {
  try { localStorage.setItem(sk(), JSON.stringify(store)); } catch { /* ignore */ }
}

function newSession(name: string): SessionFile {
  return {
    id: `session-${Date.now()}`,
    name,
    date: new Date().toISOString().split('T')[0],
    encounters: [],
    notes: '',
    xpTotal: 0,
    entries: [],
  };
}

function xpThresholds(level: number): { easy: number; medium: number; hard: number; deadly: number } {
  const table: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
    1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
    2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
    3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
    4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
    5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
    6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
    7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
    8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
    9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
    10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
    11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
    12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
    13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
    14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
    15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
    16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
    17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
    18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
    19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
    20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
  };
  return table[level] || table[1];
}

function estimateDifficulty(totalXp: number, playerCount: number, avgLevel: number): string {
  if (playerCount === 0 || avgLevel === 0) return '';
  const perPlayer = Math.round(totalXp / playerCount);
  const thresholds = xpThresholds(avgLevel);
  if (perPlayer >= thresholds.deadly) return 'Deadly';
  if (perPlayer >= thresholds.hard) return 'Hard';
  if (perPlayer >= thresholds.medium) return 'Medium';
  return 'Easy';
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SessionPage() {
  const router = useRouter();
  const [store, setStore] = useState<SessionLogStore>({ sessions: [], activeSessionId: null });
  const [editing, setEditing] = useState(false);
  const [playerCount, setPlayerCount] = useState(4);
  const [avgLevel, setAvgLevel] = useState(5);
  const [newEntryType, setNewEntryType] = useState<SessionJournalEntry['type']>('note');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');

  useEffect(() => {
    setStore(loadStore());
  }, []);

  const persist = useCallback((s: SessionLogStore) => {
    setStore(s);
    saveStore(s);
  }, []);

  const activeSession = store.sessions.find(s => s.id === store.activeSessionId) || null;

  const updateSession = useCallback((updated: SessionFile) => {
    persist({
      ...store,
      sessions: store.sessions.map(s => s.id === updated.id ? updated : s),
    });
  }, [store, persist]);

  const createSession = () => {
    const name = `Session ${store.sessions.length + 1}`;
    const s = newSession(name);
    persist({ sessions: [...store.sessions, s], activeSessionId: s.id });
  };

  const deleteSession = (id: string) => {
    const remaining = store.sessions.filter(s => s.id !== id);
    persist({
      sessions: remaining,
      activeSessionId: store.activeSessionId === id ? (remaining[0]?.id || null) : store.activeSessionId,
    });
  };

  const addEncounter = () => {
    if (!activeSession) return;
    const enc: SessionEncounterLog = {
      id: `enc-${Date.now()}`,
      name: `Encounter ${activeSession.encounters.length + 1}`,
      combatants: [],
      initiativeMode: 'auto',
      xp: 0,
      xpPerPlayer: 0,
      outcome: 'ongoing',
      notes: '',
    };
    updateSession({ ...activeSession, encounters: [...activeSession.encounters, enc] });
  };

  const updateEncounter = (id: string, changes: Partial<SessionEncounterLog>) => {
    if (!activeSession) return;
    const encounters = activeSession.encounters.map(e => e.id === id ? { ...e, ...changes } : e);
    const xpTotal = encounters.reduce((sum, e) => sum + (e.xp || 0), 0);
    updateSession({ ...activeSession, encounters, xpTotal });
  };

  const removeEncounter = (id: string) => {
    if (!activeSession) return;
    const encounters = activeSession.encounters.filter(e => e.id !== id);
    const xpTotal = encounters.reduce((sum, e) => sum + (e.xp || 0), 0);
    updateSession({ ...activeSession, encounters, xpTotal });
  };

  const loadToCombat = (enc: SessionEncounterLog) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingEncounter', JSON.stringify(enc));
      router.push('/combat');
    }
  };

  const addJournalEntry = () => {
    if (!activeSession || !newEntryTitle.trim()) return;
    const entry: SessionJournalEntry = {
      id: `entry-${Date.now()}`,
      type: newEntryType,
      title: newEntryTitle.trim(),
      content: newEntryContent.trim(),
      timestamp: new Date().toISOString(),
    };
    updateSession({
      ...activeSession,
      entries: [...(activeSession.entries || []), entry],
    });
    setNewEntryTitle('');
    setNewEntryContent('');
  };

  const removeJournalEntry = (id: string) => {
    if (!activeSession) return;
    updateSession({
      ...activeSession,
      entries: (activeSession.entries || []).filter(e => e.id !== id),
    });
  };

  const saveToFile = async () => {
    if (!activeSession) return;
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: `${activeSession.name}.session.json` });
      if (path) {
        await writeTextFile(path, JSON.stringify(activeSession, null, 2));
      }
    } catch { /* noop */ }
  };

  const loadFromFile = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (selected && !Array.isArray(selected)) {
        const content = await readTextFile(selected);
        const loaded: SessionFile = JSON.parse(content);
        if (!loaded.id) loaded.id = `session-${Date.now()}`;
        if (!loaded.entries) loaded.entries = [];
        persist({
          sessions: [...store.sessions.filter(s => s.id !== loaded.id), loaded],
          activeSessionId: loaded.id,
        });
      }
    } catch { /* noop */ }
  };

  const entryTypeOptions: { value: SessionJournalEntry['type']; label: string }[] = [
    { value: 'note', label: 'Note' },
    { value: 'encounter', label: 'Encounter' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'loot', label: 'Loot' },
    { value: 'rest-short', label: 'Short Rest' },
    { value: 'rest-long', label: 'Long Rest' },
    { value: 'level-up', label: 'Level Up' },
  ];

  const typeIcons: Record<SessionJournalEntry['type'], string> = {
    note: '📝',
    encounter: '⚔️',
    milestone: '⭐',
    loot: '💰',
    'rest-short': '☕',
    'rest-long': '🌙',
    'level-up': '⬆️',
  };

  return (
    <div style={{ padding: '2rem', color: 'white', display: 'flex', gap: '20px', minHeight: 'calc(100vh - 4rem)' }}>
      {/* Session sidebar */}
      <div style={{ width: '240px', flexShrink: 0 }}>
        <Link href="/dm" style={{ color: '#a0aec0', display: 'block', marginBottom: '12px' }}>← DM Hub</Link>
        <h2 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', fontSize: '1rem', margin: '0 0 10px' }}>Sessions</h2>
        <button onClick={createSession} style={{ width: '100%', padding: '8px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px', fontSize: '0.85rem' }}>
          + New Session
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {store.sessions.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
              background: s.id === store.activeSessionId ? '#2d3748' : 'transparent',
              border: `1px solid ${s.id === store.activeSessionId ? '#6366f1' : 'transparent'}`,
            }} onClick={() => persist({ ...store, activeSessionId: s.id })}>
              <span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ fontSize: '0.7rem', color: '#718096' }}>{s.date}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }}>×</button>
            </div>
          ))}
          {store.sessions.length === 0 && (
            <p style={{ color: '#718096', fontSize: '0.8rem' }}>No sessions yet.</p>
          )}
        </div>
      </div>

      {/* Session detail */}
      <div style={{ flex: 1 }}>
        {!activeSession ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#718096' }}>
            Create a session to get started.
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                {editing ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input value={activeSession.name} onChange={e => updateSession({ ...activeSession, name: e.target.value })}
                      style={{ padding: '6px 10px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '1.2rem' }} />
                    <input value={activeSession.date} onChange={e => updateSession({ ...activeSession, date: e.target.value })}
                      style={{ padding: '6px 10px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', width: '120px' }} />
                    <button onClick={() => setEditing(false)} style={{ background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>Done</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                    <h1 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', margin: 0 }}>{activeSession.name}</h1>
                    <span style={{ color: '#718096', fontSize: '0.85rem' }}>{activeSession.date}</span>
                    <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>✎</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={saveToFile} style={{ padding: '8px 16px', background: '#b8860b', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Export JSON</button>
                <button onClick={loadFromFile} style={{ padding: '8px 16px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Import JSON</button>
              </div>
            </div>

            {/* XP summary bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px 16px', background: '#2d3748', borderRadius: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div><strong>Total XP:</strong> {activeSession.xpTotal || 0}</div>
              <div><strong>Encounters:</strong> {activeSession.encounters.length}</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Players:</label>
                <input type="number" min={1} max={20} value={playerCount} onChange={e => setPlayerCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '50px', padding: '4px 6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
                <label style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Avg Lvl:</label>
                <input type="number" min={1} max={20} value={avgLevel} onChange={e => setAvgLevel(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '50px', padding: '4px 6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
              </div>
              {activeSession.xpTotal && activeSession.xpTotal > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#ecc94b' }}>
                  Difficulty: <strong>{estimateDifficulty(activeSession.xpTotal, playerCount, avgLevel)}</strong>
                  <span style={{ color: '#718096' }}> ({Math.round(activeSession.xpTotal / playerCount)} XP/player)</span>
                </div>
              )}
            </div>

            {/* Session notes */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#a0aec0', fontSize: '0.9rem', margin: '0 0 6px' }}>Session Notes</h3>
              <textarea value={activeSession.notes || ''} onChange={e => updateSession({ ...activeSession, notes: e.target.value })}
                placeholder="DM notes, story hooks, player decisions..."
                style={{ width: '100%', minHeight: '80px', padding: '10px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', resize: 'vertical' }} />
            </div>

            {/* Encounters */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: '#a0aec0', fontSize: '0.9rem', margin: 0 }}>Encounters</h3>
                <button onClick={addEncounter} style={{ padding: '6px 14px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add Encounter</button>
              </div>
              {activeSession.encounters.map(enc => (
                <div key={enc.id} style={{ background: '#1a202c', padding: '12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #2d3748' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={enc.name} onChange={e => updateEncounter(enc.id, { name: e.target.value })}
                      style={{ padding: '4px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', width: '180px' }} />
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: '#718096' }}>XP:</span>
                      <input type="number" min={0} value={enc.xp || ''} onChange={e => updateEncounter(enc.id, { xp: parseInt(e.target.value) || 0 })}
                        style={{ width: '70px', padding: '4px 6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: '#718096' }}>XP/player:</span>
                      <span style={{ fontWeight: 'bold' }}>{Math.round((enc.xp || 0) / Math.max(1, playerCount))}</span>
                    </div>
                    <select value={enc.outcome || 'ongoing'} onChange={e => updateEncounter(enc.id, { outcome: e.target.value as any })}
                      style={{ padding: '4px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <option value="ongoing">Ongoing</option>
                      <option value="victory">Victory</option>
                      <option value="defeat">Defeat</option>
                      <option value="fled">Fled</option>
                    </select>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                      <button onClick={() => loadToCombat(enc)} style={{ padding: '4px 10px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Load to Combat</button>
                      <button onClick={() => removeEncounter(enc.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <textarea value={enc.notes || ''} onChange={e => updateEncounter(enc.id, { notes: e.target.value })}
                      placeholder="Encounter notes, tactics, loot..."
                      style={{ width: '100%', minHeight: '36px', padding: '6px 8px', background: '#1a202c', border: '1px solid #2d3748', color: '#cbd5e0', borderRadius: '4px', fontSize: '0.8rem', resize: 'vertical' }} />
                  </div>
                </div>
              ))}
              {activeSession.encounters.length === 0 && (
                <p style={{ color: '#718096', fontSize: '0.8rem' }}>No encounters yet.</p>
              )}
            </div>

            {/* Journal */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: '#a0aec0', fontSize: '0.9rem', margin: 0 }}>Journal</h3>
              </div>

              {/* Add journal entry form */}
              <div style={{ background: '#2d3748', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <select value={newEntryType} onChange={e => setNewEntryType(e.target.value as SessionJournalEntry['type'])}
                    style={{ padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {entryTypeOptions.map(o => <option key={o.value} value={o.value}>{typeIcons[o.value]} {o.label}</option>)}
                  </select>
                  <input value={newEntryTitle} onChange={e => setNewEntryTitle(e.target.value)} placeholder="Entry title..."
                    style={{ flex: 1, padding: '6px 10px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', minWidth: '150px' }} />
                </div>
                <textarea value={newEntryContent} onChange={e => setNewEntryContent(e.target.value)} placeholder="Details..."
                  style={{ width: '100%', minHeight: '50px', padding: '6px 10px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem', resize: 'vertical', marginBottom: '8px' }} />
                <button onClick={addJournalEntry} disabled={!newEntryTitle.trim()}
                  style={{ padding: '6px 16px', background: newEntryTitle.trim() ? '#6366f1' : '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: newEntryTitle.trim() ? 'pointer' : 'not-allowed', fontSize: '0.8rem', opacity: newEntryTitle.trim() ? 1 : 0.5 }}>
                  Add Entry
                </button>
              </div>

              {/* Journal entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(activeSession.entries || []).slice().reverse().map(entry => (
                  <div key={entry.id} style={{ background: '#1a202c', padding: '10px 14px', borderRadius: '6px', border: '1px solid #2d3748' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1rem' }}>{typeIcons[entry.type] || '📝'}</span>
                        <strong style={{ color: '#e2e8f0' }}>{entry.title}</strong>
                        <span style={{ color: '#718096', fontSize: '0.75rem' }}>{formatTimestamp(entry.timestamp)}</span>
                      </div>
                      <button onClick={() => removeJournalEntry(entry.id)}
                        style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}>×</button>
                    </div>
                    {entry.content && (
                      <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#a0aec0', whiteSpace: 'pre-wrap' }}>{entry.content}</div>
                    )}
                  </div>
                ))}
                {(!activeSession.entries || activeSession.entries.length === 0) && (
                  <p style={{ color: '#718096', fontSize: '0.8rem' }}>No journal entries yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
