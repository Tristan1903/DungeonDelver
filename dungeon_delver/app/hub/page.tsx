'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Quest } from '../../lib/campaign';
import { campaignKey } from '../../utils/campaignStorage';

const STORAGE_KEY = 'quests';
function sk(key: string) { return campaignKey(key); }
type SessionLike = { id: string; name: string; date: string; entries?: Array<{ type: string; title: string }> };
const sectionCard: React.CSSProperties = { background: '#1a202c', border: '1px solid #2d3748', borderRadius: '8px', padding: '14px' };

export default function CharacterHubPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [sessions, setSessions] = useState<SessionLike[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(sk(STORAGE_KEY)); if (raw) setQuests(JSON.parse(raw)); } catch { }
    try {
      const rawSessions = localStorage.getItem(sk('sessions'));
      if (rawSessions) { const parsed = JSON.parse(rawSessions) as { sessions?: SessionLike[]; activeSessionId?: string | null }; setSessions(parsed.sessions || []); setActiveSessionId(parsed.activeSessionId || null); }
    } catch { }
  }, []);

  const active = quests.filter((q) => q.status === 'active');
  const completed = quests.filter((q) => q.status === 'complete');
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const storylineHighlights = useMemo(() => active.slice(0, 3).map((q) => ({ id: q.id, title: q.name, openObjectives: q.objectives.filter((o) => !o.completed).length })), [active]);

  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', marginBottom: '6px' }}>Player Hub</h1>
        <p style={{ color: '#718096', margin: 0 }}>Your campaign command center: progression, objectives, notes, and session context.</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        <div style={sectionCard}><div style={{ color: '#718096', fontSize: '0.8rem' }}>Active Storylines</div><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{active.length}</div><div style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{completed.length} completed</div></div>
        <div style={sectionCard}><div style={{ color: '#718096', fontSize: '0.8rem' }}>Current Session</div><div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeSession?.name || 'None selected'}</div><div style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{activeSession ? activeSession.date : 'DM has not activated a session'}</div></div>
        <div style={sectionCard}>
          <div style={{ color: '#718096', fontSize: '0.8rem' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <Link href="/character-sheet" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '0.85rem' }}>Open Character Sheet</Link>
            <Link href="/notes" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '0.85rem' }}>Open Notes</Link>
            <Link href="/library" style={{ color: '#90cdf4', textDecoration: 'none', fontSize: '0.85rem' }}>Browse Library</Link>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
        <div style={sectionCard}>
          <h2 style={{ color: '#f6e05e', marginTop: 0, fontSize: '1rem' }}>Active Storyline Board</h2>
          {storylineHighlights.length === 0 && <p style={{ color: '#718096', fontSize: '0.85rem' }}>No active storylines currently.</p>}
          <div style={{ display: 'grid', gap: '8px' }}>
            {storylineHighlights.map((item) => (<div key={item.id} style={{ background: '#2d3748', borderRadius: '6px', padding: '10px' }}><div style={{ fontWeight: 700 }}>{item.title}</div><div style={{ color: '#a0aec0', fontSize: '0.8rem', marginTop: '3px' }}>{item.openObjectives} objective(s) remaining</div></div>))}
          </div>
          <Link href="/dm/quests" style={{ display: 'inline-block', marginTop: '10px', color: '#90cdf4', fontSize: '0.82rem', textDecoration: 'none' }}>View full quest tracker</Link>
        </div>
        <div style={sectionCard}>
          <h2 style={{ color: '#f6e05e', marginTop: 0, fontSize: '1rem' }}>Session Feed</h2>
          {activeSession?.entries?.length ? (
            <div style={{ display: 'grid', gap: '6px' }}>
              {activeSession.entries.slice(-6).reverse().map((entry, idx) => (<div key={`${entry.title}-${idx}`} style={{ background: '#2d3748', borderRadius: '6px', padding: '8px 10px' }}><div style={{ color: '#cbd5e0', fontWeight: 600, fontSize: '0.83rem' }}>{entry.title}</div><div style={{ color: '#718096', fontSize: '0.72rem', textTransform: 'uppercase' }}>{entry.type}</div></div>))}
            </div>
          ) : (<p style={{ color: '#718096', fontSize: '0.85rem' }}>No recent entries yet.</p>)}
        </div>
      </section>
    </div>
  );
}
