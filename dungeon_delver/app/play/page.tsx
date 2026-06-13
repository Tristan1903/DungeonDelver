'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncClient } from '../../utils/syncEngine';
import { loadCharFromLocal, saveCharToLocal } from '../../utils/storageEngine';
import { pullCharacter } from '../../utils/syncManager';
import { useLanSync } from '../../context/LanSyncContext';
import ProjectionRenderer from '../../components/ProjectionRenderer';

const s = {
  page: { padding: '1.5rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '1000px', margin: '0 auto' },
  header: { fontSize: '1.5rem', color: '#c9a84c', marginBottom: '0.25rem' },
  sub: { color: '#8a7e6a', fontSize: '0.8rem', marginBottom: '1rem' },
  card: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' },
  flex: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const },
  label: { fontSize: '0.7rem', color: '#8a7e6a', marginBottom: '2px' },
  value: { fontSize: '0.9rem', color: '#e8dcc8' },
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const },
  btn: { padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' as const },
};

const STATUS_COLORS: Record<string, string> = {
  connected: '#16a34a', connecting: '#c9a84c', disconnected: '#5a5248', error: '#a83232',
};

const ABIL_NAMES: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const SKILL_LIST = [
  { name: 'Acrobatics', stat: 'dex' }, { name: 'Animal Handling', stat: 'wis' },
  { name: 'Arcana', stat: 'int' }, { name: 'Athletics', stat: 'str' },
  { name: 'Deception', stat: 'cha' }, { name: 'History', stat: 'int' },
  { name: 'Insight', stat: 'wis' }, { name: 'Intimidation', stat: 'cha' },
  { name: 'Investigation', stat: 'int' }, { name: 'Medicine', stat: 'wis' },
  { name: 'Nature', stat: 'int' }, { name: 'Perception', stat: 'wis' },
  { name: 'Performance', stat: 'cha' }, { name: 'Persuasion', stat: 'cha' },
  { name: 'Religion', stat: 'int' }, { name: 'Sleight of Hand', stat: 'dex' },
  { name: 'Stealth', stat: 'dex' }, { name: 'Survival', stat: 'wis' },
];
const SAVE_STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function modStr(val: number): string {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function rollDice(formula: string): { total: number; rolls: number[] } {
  const m = formula.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) return { total: 0, rolls: [] };
  const count = parseInt(m[1] || '1');
  const sides = parseInt(m[2]);
  const mod = parseInt(m[3] || '0');
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  return { total: rolls.reduce((a, b) => a + b, 0) + mod, rolls };
}

function modFromAbil(val: number): number {
  return Math.floor((val - 10) / 2);
}

export default function PlayPage() {
  const [isMobile, setIsMobile] = useState(false);
  const lan = useLanSync();
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [character, setCharacter] = useState<any>(null);
  const [projections, setProjections] = useState<any[]>([]);
  const [chatMsgs, setChatMsgs] = useState<{ text: string; from: string; type: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [rollLog, setRollLog] = useState<{ label: string; total: number; rolls: number[] }[]>([]);
  const [tab, setTab] = useState<'character' | 'chat'>('character');
  const [serverChars, setServerChars] = useState<any[] | null>(null);
  const [loadingChars, setLoadingChars] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevClientRef = useRef<SyncClient | null>(null);

  // Load local character data once on mount
  useEffect(() => {
    const cid = lan.characterId || localStorage.getItem('dd-lan-character-id') || '';
    if (cid) {
      try {
        const key = cid.startsWith('dd-char-') ? cid : `dd-char-${cid}`;
        const char = loadCharFromLocal(key);
        if (char) setCharacter(char);
      } catch {}
    }
  }, []);

  // Fetch character list from server when connected but no character loaded
  useEffect(() => {
    if (lan.status !== 'connected' || character || !lan.serverUrl || !lan.room) { setServerChars(null); return; }
    setLoadingChars(true);
    const base = lan.serverUrl.replace(/\/+$/, '');
    fetch(`${base}/api/sync/characters?room=${encodeURIComponent(lan.room)}`)
      .then(r => r.json())
      .then(data => { setServerChars(data.characters || []); setLoadingChars(false); })
      .catch(() => { setServerChars([]); setLoadingChars(false); });
  }, [lan.status, character, lan.serverUrl, lan.room]);

  const selectServerChar = useCallback(async (charSummary: any) => {
    try {
      const base = lan.serverUrl.replace(/\/+$/, '');
      console.log('[SelectChar] fetching', charSummary.id, 'from', base, 'room', lan.room);
      const full = await pullCharacter(base, lan.room, charSummary.id);
      console.log('[SelectChar] pullCharacter returned:', full ? Object.keys(full) : 'null');
      if (full) {
        saveCharToLocal(full);
        setCharacter(full);
        setServerChars(null);
      }
    } catch (e) { console.error('[SelectChar] error:', e); }
  }, [lan.serverUrl, lan.room]);

  // Set up event listeners when syncClient changes
  useEffect(() => {
    const client = lan.syncClient;
    if (!client || client === prevClientRef.current) return;
    prevClientRef.current = client;

    const unsubState = client.onStateSync((state) => {
      if (state.characters) {
        const cid = lan.characterId || localStorage.getItem('dd-lan-character-id') || '';
        const found = state.characters.find((c: any) => cid && c.id === cid);
        if (found) setCharacter(found);
      }
    });

    const unsubProj = client.onProjection((proj) => {
      if (proj === null) { setProjections([]); }
      else { setProjections(prev => prev.find(p => p.id === proj.id) ? prev : [...prev, proj]); }
    });

    const unsubChat = client.onChat((text, senderId) => {
      setChatMsgs(prev => [...prev, { text, from: senderId, type: 'chat' }]);
    });

    const unsubRoll = client.onDiceRoll((payload, senderId) => {
      setChatMsgs(prev => [...prev, { text: `🎲 ${payload.label}: ${payload.result}`, from: senderId, type: 'roll' }]);
    });

    const unsubJoinAck = client.onJoinAck((payload) => {
      if (payload.character) setCharacter(payload.character);
    });

    const unsubDmDc = client.onDmDisconnected(() => {
      // DM disconnected - show status through context
    });

    return () => {
      unsubState(); unsubProj(); unsubChat(); unsubRoll(); unsubJoinAck(); unsubDmDc();
    };
  }, [lan.syncClient, lan.characterId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim() || !lan.syncClient) return;
    lan.syncClient.sendChat(chatInput.trim());
    setChatMsgs(prev => [...prev, { text: chatInput.trim(), from: 'you', type: 'chat' }]);
    setChatInput('');
  }, [chatInput, lan.syncClient]);

  const rollAndSend = useCallback((label: string, formula: string) => {
    const { total, rolls } = rollDice(formula);
    setRollLog(prev => [{ label, total, rolls }, ...prev].slice(0, 20));
    lan.syncClient?.sendDiceRoll(formula, total, label);
    setChatMsgs(prev => [...prev, { text: `🎲 ${label}: ${total} [${rolls.join(',')}]`, from: 'you', type: 'roll' }]);
  }, [lan.syncClient]);

  const handleProjectionRoll = useCallback((formula: string) => {
    rollAndSend(formula, formula);
  }, [rollAndSend]);

  const adjustHp = useCallback((delta: number) => {
    const cid = lan.characterId || localStorage.getItem('dd-lan-character-id') || '';
    if (!character || !lan.syncClient) return;
    const curHp = character.hp?.current || character.hp?.value || character.hp || 0;
    const maxHp = character.hp?.max || character.hp?.maximum || curHp;
    const newHp = Math.min(maxHp, Math.max(0, curHp + delta));
    const updated = { ...character };
    if (updated.hp && typeof updated.hp === 'object') {
      updated.hp = { ...updated.hp, current: newHp };
    } else {
      updated.hp = { current: newHp, max: maxHp, value: newHp, maximum: maxHp };
    }
    setCharacter(updated);
    lan.syncClient.updateCharacter(cid, updated);
  }, [character, lan.characterId, lan.syncClient]);

  const status = lan.status;
  const room = lan.room;
  const charId = lan.characterId;
  const charName = lan.characterName;
  const c = character || {};
  const curHp = c.hp?.current ?? c.hp?.value ?? (typeof c.hp === 'number' ? c.hp : null) ?? 0;
  const maxHp = c.hp?.max ?? c.hp?.maximum ?? curHp ?? 0;

  return (
    <div style={{ ...s.page, padding: isMobile ? '0.75rem' : '1.5rem', maxWidth: isMobile ? '100%' : '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: '0.75rem', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={s.header}>{charName || charId || 'Player View'}</h1>
          <p style={s.sub}>{room ? `Room: ${room}` : 'Not connected'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[status] || '#5a5248' }} />
            <span style={{ fontSize: '0.7rem', color: '#8a7e6a' }}>{status}</span>
          </div>
          {status === 'connected' && (
            <span style={{ fontSize: '0.7rem', color: '#16a34a' }}>Connected</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setTab('character')} style={{ ...s.btn, flex: isMobile ? 1 : undefined, background: tab === 'character' ? '#c9a84c' : '#1a1714', color: tab === 'character' ? '#0c0e14' : '#8a7e6a', border: '1px solid #3d3528' }}>Character</button>
        <button onClick={() => setTab('chat')} style={{ ...s.btn, flex: isMobile ? 1 : undefined, background: tab === 'chat' ? '#c9a84c' : '#1a1714', color: tab === 'chat' ? '#0c0e14' : '#8a7e6a', border: '1px solid #3d3528' }}>
          Chat {chatMsgs.length > 0 && `(${chatMsgs.length})`}
        </button>
      </div>

      {tab === 'character' && (
        <div style={s.flex}>
          <div style={{ flex: '2 1 400px' }}>
            <div style={s.card}>
              <h2 style={{ color: '#c9a84c', fontSize: '1rem', marginBottom: '0.75rem' }}>Character</h2>
              {c.name ? (
                <>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {c.name}
                    {c.id && <a href={`/character-sheet?id=${c.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.65rem', fontWeight: 'normal', color: '#c9a84c', textDecoration: 'none', padding: '3px 8px', border: '1px solid #c9a84c', borderRadius: '4px' }}>
                      Open Full Sheet ↗
                    </a>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8a7e6a', marginBottom: '12px' }}>
                    {c.race || 'Race'} {c.classes?.join('/') || c.class || 'Class'} &mdash; Level {c.totalLevel || c.level || 1}
                  </div>

                  <div style={{ background: '#1a1714', borderRadius: '6px', padding: '10px', marginBottom: '10px', border: '1px solid #3d3528' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#8a7e6a', fontSize: '0.7rem' }}>HP </span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: curHp <= maxHp * 0.25 ? '#a83232' : curHp <= maxHp * 0.5 ? '#c9a84c' : '#16a34a' }}>{curHp}</span>
                        <span style={{ color: '#8a7e6a', fontSize: '0.8rem' }}> / {maxHp}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => adjustHp(-1)} style={{ ...s.btn, background: '#a83232', color: '#e8dcc8', padding: '4px 10px', fontSize: '0.7rem' }}>-1</button>
                        <button onClick={() => adjustHp(-5)} style={{ ...s.btn, background: '#a83232', color: '#e8dcc8', padding: '4px 10px', fontSize: '0.7rem' }}>-5</button>
                        <button onClick={() => adjustHp(1)} style={{ ...s.btn, background: '#16a34a', color: '#e8dcc8', padding: '4px 10px', fontSize: '0.7rem' }}>+1</button>
                        <button onClick={() => adjustHp(5)} style={{ ...s.btn, background: '#16a34a', color: '#e8dcc8', padding: '4px 10px', fontSize: '0.7rem' }}>+5</button>
                      </div>
                    </div>
                    <div style={{ marginTop: '6px', background: '#0c0e14', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${maxHp > 0 ? (curHp / maxHp) * 100 : 0}%`, background: curHp <= maxHp * 0.25 ? '#a83232' : curHp <= maxHp * 0.5 ? '#c9a84c' : '#16a34a', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', marginBottom: '12px' }}>
                    <div><span style={{ color: '#8a7e6a' }}>AC: </span><strong>{c.ac || c.armorClass || '?'}</strong></div>
                    <div><span style={{ color: '#8a7e6a' }}>Speed: </span><strong>{c.speed || '30'}</strong></div>
                    {c.proficiencyBonus && <div><span style={{ color: '#8a7e6a' }}>Prof: </span><strong>+{c.proficiencyBonus}</strong></div>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: '4px', marginBottom: '12px' }}>
                    {SAVE_STATS.map(stat => {
                      const val = c.abilities?.[stat]?.value ?? c.abilities?.[stat] ?? c.baseStats?.[stat] ?? 10;
                      const proficient = c.savingThrows?.includes(stat) || c.proficientSaves?.includes(stat);
                      const bonus = modFromAbil(val) + (proficient ? (c.proficiencyBonus || 2) : 0);
                      return (
                        <div key={stat} style={{ background: '#1a1714', borderRadius: '6px', padding: '6px', textAlign: 'center', border: proficient ? '1px solid #c9a84c' : '1px solid #3d3528' }}>
                          <div style={{ fontSize: '0.55rem', color: '#8a7e6a', textTransform: 'uppercase' }}>{ABIL_NAMES[stat]}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#c9a84c' }}>{val}</div>
                          <div style={{ fontSize: '0.65rem', color: proficient ? '#c9a84c' : '#5a5248' }}>{bonus >= 0 ? `+${bonus}` : bonus}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div>
                  {loadingChars ? (
                    <p style={{ color: '#8a7e6a', fontSize: '0.85rem' }}>Loading available characters...</p>
                  ) : serverChars && serverChars.length > 0 ? (
                    <>
                      <p style={{ color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '10px' }}>
                        Select a character to play as:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {serverChars.map((ch: any) => (
                          <button key={ch.id} onClick={() => selectServerChar(ch)}
                            style={{ textAlign: 'left', padding: '10px 14px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '6px', color: '#e8dcc8', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <strong>{ch.name}</strong>
                            <span style={{ color: '#8a7e6a', fontSize: '0.7rem', marginLeft: '8px' }}>
                              {ch.race} {ch.class} &mdash; Level {ch.level}
                            </span>
                          </button>
                        ))}
                      </div>
                      <a href="/character-sheet"
                        style={{ display: 'inline-block', marginTop: '12px', padding: '8px 16px', background: '#2d3748', color: '#e8dcc8', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #4a5568' }}>
                        My character isn't here — Create New →
                      </a>
                    </>
                  ) : (
                    <>
                      <p style={{ color: '#8a7e6a', fontSize: '0.85rem' }}>
                        {lan.status === 'connected'
                          ? 'No characters found on this server. Create one to get started.'
                          : 'Connect to load character'}
                      </p>
                      {lan.status === 'connected' && (
                        <a href="/character-sheet"
                          style={{ display: 'inline-block', marginTop: '8px', padding: '8px 16px', background: '#c9a84c', color: '#0c0e14', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>
                          Create Character →
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={s.card}>
              <h2 style={{ color: '#c9a84c', fontSize: '1rem', marginBottom: '0.75rem' }}>Skills</h2>
              {c.name ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px' }}>
                  {SKILL_LIST.map(sk => {
                    const val = c.abilities?.[sk.stat]?.value ?? c.abilities?.[sk.stat] ?? c.baseStats?.[sk.stat] ?? 10;
                    const prof = c.skills?.includes(sk.name) || c.proficientSkills?.includes(sk.name);
                    const expert = c.expertiseSkills?.includes(sk.name);
                    const bonus = modFromAbil(val) + (expert ? (c.proficiencyBonus || 2) * 2 : prof ? (c.proficiencyBonus || 2) : 0);
                    return (
                      <div key={sk.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: prof ? '#1a1714' : 'transparent', fontSize: '0.7rem', border: prof ? '1px solid #3d3528' : '1px solid transparent' }}>
                        <span style={{ color: prof ? '#e8dcc8' : '#5a5248' }}>{sk.name}</span>
                        <span style={{ color: prof ? '#c9a84c' : '#3d3528' }}>{bonus >= 0 ? `+${bonus}` : bonus}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#8a7e6a', fontSize: '0.85rem' }}>No character loaded</p>
              )}
            </div>
          </div>

          <div style={{ flex: '1 1 300px' }}>
            <div style={s.card}>
              <h2 style={{ color: '#c9a84c', fontSize: '1rem', marginBottom: '0.75rem' }}>Dice</h2>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {[
                  { label: 'd20', formula: '1d20' }, { label: 'd20 adv', formula: '2d20kh1' },
                  { label: 'd20 dis', formula: '2d20kl1' }, { label: 'd12', formula: '1d12' },
                  { label: 'd10', formula: '1d10' }, { label: 'd8', formula: '1d8' },
                  { label: 'd6', formula: '1d6' }, { label: 'd4', formula: '1d4' },
                ].map(d => (
                  <button key={d.label} onClick={() => rollAndSend(d.label, d.formula)} disabled={status !== 'connected'}
                    style={{ ...s.btn, background: status === 'connected' ? '#1a1714' : '#0c0e14', border: '1px solid #3d3528', color: status === 'connected' ? '#e8dcc8' : '#5a5248', cursor: status === 'connected' ? 'pointer' : 'default' }}>
                    {d.label}
                  </button>
                ))}
              </div>
              {rollLog.length > 0 && (
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {rollLog.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', fontSize: '0.7rem', borderBottom: '1px solid #1a1714' }}>
                      <span style={{ color: '#8a7e6a' }}>{r.label}</span>
                      <span style={{ color: '#c9a84c', fontWeight: 'bold' }}>{r.total} <span style={{ color: '#5a5248', fontWeight: 'normal' }}>[{r.rolls.join(',')}]</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.card}>
              <h2 style={{ color: '#c9a84c', fontSize: '1rem', marginBottom: '0.75rem' }}>DM Projections</h2>
              {projections.length === 0 ? (
                <p style={{ color: '#8a7e6a', fontSize: '0.85rem' }}>Waiting for the DM to share something...</p>
              ) : (
                projections.map((proj, i) => (
                  <div key={proj.id || i} style={{ background: '#1a1714', borderRadius: '6px', padding: '12px', marginBottom: '8px', border: '1px solid #3d3528' }}>
                    <div style={{ fontSize: '0.65rem', color: '#c9a84c', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {proj.contentType || 'Message'}
                    </div>
                    <ProjectionRenderer content={typeof proj.content === 'string' ? proj.content : JSON.stringify(proj.content)} contentType={proj.contentType} onRoll={handleProjectionRoll} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div style={s.flex}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ ...s.card, display: 'flex', flexDirection: 'column', height: isMobile ? '300px' : '400px' }}>
              <h2 style={{ color: '#c9a84c', fontSize: '1rem', marginBottom: '0.75rem' }}>Chat & Rolls</h2>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {chatMsgs.length === 0 && <p style={{ color: '#5a5248', fontSize: '0.8rem' }}>No messages yet.</p>}
                {chatMsgs.map((m, i) => (
                  <div key={i} style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem',
                    background: m.type === 'roll' ? '#1a1714' : (m.from === 'you' ? '#2d3748' : '#0c0e14'),
                    border: m.type === 'roll' ? '1px solid #3d3528' : '1px solid transparent',
                    alignSelf: m.from === 'you' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}>
                    {m.type === 'roll' ? (
                      <span>{m.text}</span>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.6rem', color: '#8a7e6a', marginBottom: '2px' }}>
                          {m.from === 'you' ? 'You' : m.from.substring(0, 12)}
                        </div>
                        <div>{m.text}</div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input style={s.input} placeholder="Type a message..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat(); }} />
                <button onClick={sendChat} disabled={!chatInput.trim() || status !== 'connected'}
                  style={{ ...s.btn, background: chatInput.trim() && status === 'connected' ? '#c9a84c' : '#5a5248', color: chatInput.trim() && status === 'connected' ? '#0c0e14' : '#8a7e6a', flexShrink: 0 }}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
