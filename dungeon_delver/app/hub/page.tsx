'use client';
// ===== 📘 FILE: app/hub/page.tsx =====
// 🎯 PURPOSE: Player hub dashboard — shows active storylines, current session info, and quick
//   links to character sheet, notes, and library.
// 🧠 REACT CONCEPT: Dashboard Composition — combines multiple data sources (quests, sessions)
//   loaded via useEffect into a single page with stat cards, a storyline board, and a session
//   feed. Uses useMemo for derived data (storylineHighlights).
// =====
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Quest } from '../../lib/campaign';
import { campaignKey } from '../../utils/campaignStorage';

const STORAGE_KEY = 'quests';
function sk(key: string) { return campaignKey(key); }
type SessionLike = { id: string; name: string; date: string; entries?: Array<{ type: string; title: string }> };

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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}>
          Player Hub
        </h1>
        <p className="text-muted-foreground text-sm m-0">
          Your campaign command center: progression, objectives, notes, and session context.
        </p>
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Active Storylines</div>
          <div className="text-xl font-bold text-foreground">{active.length}</div>
          <div className="text-xs text-muted-foreground">{completed.length} completed</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Current Session</div>
          <div className="text-base font-bold text-foreground">{activeSession?.name || 'None selected'}</div>
          <div className="text-xs text-muted-foreground">{activeSession ? activeSession.date : 'DM has not activated a session'}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Quick Actions</div>
          <div className="flex flex-col gap-1.5 mt-2">
            <Link href="/character-sheet" className="text-xs hover:text-primary transition-colors underline underline-offset-2" style={{ color: '#8a7e6a' }}>Open Character Sheet</Link>
            <Link href="/notes" className="text-xs hover:text-primary transition-colors underline underline-offset-2" style={{ color: '#8a7e6a' }}>Open Notes</Link>
            <Link href="/library" className="text-xs hover:text-primary transition-colors underline underline-offset-2" style={{ color: '#8a7e6a' }}>Browse Library</Link>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h2 className="text-base font-bold mt-0 mb-3" style={{ color: '#c9a84c' }}>Active Storyline Board</h2>
          {storylineHighlights.length === 0 && <p className="text-muted-foreground text-xs">No active storylines currently.</p>}
          <div className="grid gap-2">
            {storylineHighlights.map((item) => (
              <div key={item.id} className="bg-muted/50 rounded-md p-3 border border-border">
                <div className="font-bold text-sm text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.openObjectives} objective(s) remaining</div>
              </div>
            ))}
          </div>
          <Link href="/dm/quests" className="inline-block mt-3 text-xs underline underline-offset-2 hover:text-primary transition-colors" style={{ color: '#8a7e6a' }}>
            View full quest tracker
          </Link>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-base font-bold mt-0 mb-3" style={{ color: '#c9a84c' }}>Session Feed</h2>
          {activeSession?.entries?.length ? (
            <div className="grid gap-2">
              {activeSession.entries.slice(-6).reverse().map((entry, idx) => (
                <div key={`${entry.title}-${idx}`} className="bg-muted/50 rounded-md p-2.5 border border-border">
                  <div className="font-semibold text-xs text-foreground">{entry.title}</div>
                  <div className="text-[0.65rem] text-muted-foreground uppercase mt-0.5">{entry.type}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No recent entries yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
