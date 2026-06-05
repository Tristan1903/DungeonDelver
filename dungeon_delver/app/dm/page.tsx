'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { OPTIONAL_MODULES, loadCampaignConfig } from '../../utils/campaignEngine';

interface SessionSummary { sessions: Array<{ id: string; name: string; date: string; encounters?: unknown[] }>; activeSessionId: string | null; }
interface QuestSummary { id: string; status: 'active' | 'complete' | 'failed'; }

const cardStyle: React.CSSProperties = { background: '#1a1714', border: '1px solid #3d3528', borderRadius: '10px', padding: '16px' };

const quickLinks = [
  { href: '/dm/session', label: 'Session & Encounter Prep', desc: 'Run prep templates, encounter queues, and journal entries.' },
  { href: '/dm/quests', label: 'Storylines & Quests', desc: 'Track quest arcs, objectives, rewards, and notes.' },
  { href: '/dm/journal', label: 'Lore & Journal', desc: 'Curate world lore and session logs with backlinks.' },
  { href: '/dm/modules', label: 'Optional Subsystems', desc: 'Enable and configure campaign variants.' },
  { href: '/dm/screen', label: 'DM Screen', desc: 'Live tools for checks, conditions, and references.' },
  { href: '/dm/sync', label: 'Multi-User Sync', desc: 'Monitor and coordinate player synchronization.' },
];

const tools = [
  { href: '/dm/party', label: 'Party Management' },
  { href: '/dm/monsters', label: 'Monster Manager' },
  { href: '/dm/items', label: 'Magic Items' },
  { href: '/dm/homebrew', label: 'Homebrew' },
  { href: '/dm/obsidian', label: 'Obsidian Vault' },
  { href: '/dm/tables', label: 'Random Tables' },
  { href: '/dm/calendar', label: 'World Calendar' },
  { href: '/dm/npcs', label: 'NPC Generator' },
  { href: '/dm/influence', label: 'Influence Tracker' },
  { href: '/dm/zone-combat', label: 'Zone Combat' },
];

export default function DMHub() {
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>({ sessions: [], activeSessionId: null });
  const [questSummary, setQuestSummary] = useState<QuestSummary[]>([]);

  useEffect(() => {
    try { const cfg = loadCampaignConfig(); setActiveModules(cfg.enabledModules || []); } catch { setActiveModules([]); }
    try { const rawSessions = localStorage.getItem('dd-sessions'); if (rawSessions) setSessionSummary(JSON.parse(rawSessions)); } catch { setSessionSummary({ sessions: [], activeSessionId: null }); }
    try { const rawQuests = localStorage.getItem('dd-quests'); if (rawQuests) setQuestSummary(JSON.parse(rawQuests)); } catch { setQuestSummary([]); }
  }, []);

  const activeSession = useMemo(() => sessionSummary.sessions.find((s) => s.id === sessionSummary.activeSessionId) || null, [sessionSummary]);
  const moduleNames = useMemo(() => OPTIONAL_MODULES.filter((m) => activeModules.includes(m.id)).map((m) => m.name), [activeModules]);
  const activeQuests = questSummary.filter((q) => q.status === 'active').length;

  return (
    <div style={{ padding: '2rem', color: '#e8dcc8', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', marginBottom: '8px' }}>DM Command Hub</h1>
        <p style={{ color: '#8a7e6a', margin: 0 }}>Central ops for campaign flow, storylines, subsystem tuning, and live session control.</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <div style={{ color: '#5a5248', fontSize: '0.8rem' }}>Active Session</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeSession?.name || 'None selected'}</div>
          <div style={{ color: '#8a7e6a', fontSize: '0.8rem', marginTop: '4px' }}>{activeSession ? `${activeSession.encounters?.length || 0} encounters planned` : 'Create one in Session Prep'}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#5a5248', fontSize: '0.8rem' }}>Storyline Load</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeQuests} active quests</div>
          <div style={{ color: '#8a7e6a', fontSize: '0.8rem', marginTop: '4px' }}>{questSummary.length} total tracked quests</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#5a5248', fontSize: '0.8rem' }}>Subsystems Enabled</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeModules.length}</div>
          <div style={{ color: '#8a7e6a', fontSize: '0.8rem', marginTop: '4px' }}>{moduleNames.slice(0, 2).join(', ') || 'No optional modules yet'}</div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
        <div style={{ ...cardStyle, padding: '14px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#c9a84c' }}>Primary Workflow</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none', color: '#e8dcc8', background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '12px', display: 'block' }}>
                <div style={{ fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: '0.82rem', color: '#8a7e6a', marginTop: '4px' }}>{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: '14px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#c9a84c' }}>Toolbox</h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: 'none', color: '#e8dcc8', padding: '9px 10px', borderRadius: '6px', border: '1px solid #3d3528', background: '#0c0e14', fontSize: '0.85rem' }}>{tool.label}</Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
