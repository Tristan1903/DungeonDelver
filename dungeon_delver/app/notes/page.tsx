'use client';
// ===== 📘 FILE: app/notes/page.tsx =====
// 🎯 PURPOSE: Notes and messaging — tabbed interface with private messages (Player↔DM),
//   personal notes, and session notes. All data persisted to localStorage.
// 🧠 REACT CONCEPT: Tabbed Interface + localStorage Persistence — demonstrates managing multiple
//   content types under tabs, with immediate save-to-localStorage on every edit. Messages are
//   reversed with useMemo for chronological display.
// =====
import { useEffect, useMemo, useState } from 'react';
import { campaignKey } from '../../utils/campaignStorage';

type Message = { from: string; to: string; text: string; time: string };
type NotesState = { personal: string; session: string; pinned: string };

const MSG_KEY = 'notes-messages';
const NOTE_KEY = 'notes-content';
function sk(key: string) { return campaignKey(key); }

const tabBtn = (active: boolean): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 'var(--dungeon-radius-sm)', border: '1px solid var(--dungeon-border)', background: active ? 'var(--dungeon-accent)' : 'var(--dungeon-surface)', color: 'white', cursor: 'pointer', fontSize: '0.82rem', minHeight: '44px' });
const inputBox: React.CSSProperties = { background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text)', borderRadius: 'var(--dungeon-radius-sm)' };

export default function NotesPage() {
  const [tab, setTab] = useState<'messages' | 'personal' | 'session'>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [from, setFrom] = useState('Player');
  const [to, setTo] = useState('DM');
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<NotesState>({ personal: '', session: '', pinned: '' });

  useEffect(() => {
    try { const rawMessages = localStorage.getItem(sk(MSG_KEY)); if (rawMessages) setMessages(JSON.parse(rawMessages)); } catch { }
    try { const rawNotes = localStorage.getItem(sk(NOTE_KEY)); if (rawNotes) setNotes(JSON.parse(rawNotes)); } catch { }
  }, []);

  const persistMessages = (next: Message[]) => { setMessages(next); try { localStorage.setItem(sk(MSG_KEY), JSON.stringify(next)); } catch { } };
  const persistNotes = (next: NotesState) => { setNotes(next); try { localStorage.setItem(sk(NOTE_KEY), JSON.stringify(next)); } catch { } };

  const send = () => {
    if (!text.trim()) return;
    const next = [...messages, { from, to, text, time: new Date().toLocaleTimeString() }];
    persistMessages(next);
    setText('');
  };

  const sortedMessages = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: 'serif', color: 'var(--dungeon-gold)', marginBottom: '6px' }}>Notes and Messages</h1>
      <p style={{ color: 'var(--dungeon-text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>Unified space for table messages, personal notes, and session planning notes.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('messages')} style={tabBtn(tab === 'messages')}>Messages</button>
        <button onClick={() => setTab('personal')} style={tabBtn(tab === 'personal')}>Personal Notes</button>
        <button onClick={() => setTab('session')} style={tabBtn(tab === 'session')}>Session Notes</button>
      </div>

      <div style={{ background: 'var(--dungeon-surface)', borderRadius: 'var(--dungeon-radius-md)', padding: '15px', border: '1px solid var(--dungeon-border)' }}>
        {tab === 'messages' && (
          <>
            <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '12px' }}>
              {sortedMessages.length === 0 && <p style={{ color: 'var(--dungeon-text-dim)' }}>No messages yet.</p>}
              {sortedMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: '10px', padding: '10px', background: 'var(--dungeon-bg)', borderRadius: 'var(--dungeon-radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-muted)' }}>{m.from} to {m.to} - {m.time}</div>
                  <div style={{ marginTop: '4px' }}>{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px', ...inputBox }}><option>Player</option><option>DM</option></select>
              <span style={{ alignSelf: 'center', color: 'var(--dungeon-text-dim)' }}>to</span>
              <select value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px', ...inputBox }}><option>DM</option><option>Player</option></select>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Private message..." style={{ width: '100%', padding: '10px', ...inputBox, minHeight: '80px' }} />
            <button onClick={send} className="touch-target" style={{ marginTop: '10px', padding: '10px 20px', background: 'var(--dungeon-accent)', border: 'none', color: 'white', borderRadius: 'var(--dungeon-radius-sm)', cursor: 'pointer' }}>Send</button>
          </>
        )}

        {tab === 'personal' && (
          <>
            <label style={{ color: 'var(--dungeon-text-muted)', fontSize: '0.82rem' }}>Pinned quick note</label>
            <input value={notes.pinned} onChange={(e) => persistNotes({ ...notes, pinned: e.target.value })} placeholder="One-line reminder" style={{ width: '100%', marginTop: '5px', marginBottom: '10px', padding: '8px', ...inputBox }} />
            <textarea value={notes.personal} onChange={(e) => persistNotes({ ...notes, personal: e.target.value })} placeholder="Character ideas, clues, shopping list..." style={{ width: '100%', minHeight: '320px', padding: '10px', ...inputBox, borderRadius: 'var(--dungeon-radius-sm)', lineHeight: 1.5 }} />
          </>
        )}

        {tab === 'session' && (
          <>
            <p style={{ color: 'var(--dungeon-text-muted)', fontSize: '0.82rem', marginTop: 0 }}>Session-side notes shared on this device. Use this for recap, NPC names, and open threads.</p>
            <textarea value={notes.session} onChange={(e) => persistNotes({ ...notes, session: e.target.value })} placeholder="Session recap, unresolved hooks, loot, scene prep..." style={{ width: '100%', minHeight: '340px', padding: '10px', ...inputBox, borderRadius: 'var(--dungeon-radius-sm)', lineHeight: 1.5 }} />
          </>
        )}
      </div>
    </div>
  );
}
