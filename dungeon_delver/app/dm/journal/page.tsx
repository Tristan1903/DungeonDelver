'use client';
import { useState, useEffect, useCallback } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import Link from 'next/link';
import { campaignKey } from '../../../utils/campaignStorage';

interface JournalEntry {
  id: string;
  type: 'session-recap' | 'lore' | 'npc' | 'quest' | 'world' | 'note';
  title: string;
  content: string;
  tags: string[];
  linkedEntries: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'journal-entries';
function sk() { return campaignKey(STORAGE_KEY); }
const TYPE_LABELS: Record<string, string> = {
  'session-recap': 'Session Recap', lore: 'Lore Entry', npc: 'NPC Profile',
  quest: 'Quest Note', world: 'World Building', note: 'Note',
};
const TYPE_COLORS: Record<string, string> = {
  'session-recap': '#48bb78', lore: '#ecc94b', npc: '#63b3ed',
  quest: '#9f7aea', world: '#f6ad55', note: '#718096',
};
const TEMPLATES: Record<string, string> = {
  'session-recap': '# Session Recap\n\n**Date:** \n**Party Level:** \n**Duration:** \n\n## Summary\n\n## Key Events\n\n## NPCs Encountered\n\n## Loot & Rewards\n\n## DM Notes\n',
  lore: '# Lore Entry\n\n**Category:** \n**Source:** \n\n## Description\n\n## Historical Context\n\n## Related Locations\n\n## Related NPCs\n',
  npc: '# NPC Profile\n\n**Name:** \n**Role:** \n**Location:** \n**Alignment:** \n\n## Appearance\n\n## Personality\n\n## Goals & Motivations\n\n## Secrets\n\n## Relationships\n',
  quest: '# Quest Note\n\n**Quest:** \n**Giver:** \n**Location:** \n\n## Objectives\n\n## Progress\n\n## Rewards\n\n## Notes\n',
  world: '# World Building\n\n**Domain:** \n\n## Description\n\n## History\n\n## Notable Locations\n\n## Factions & Inhabitants\n\n## Adventure Hooks\n',
  note: '# Notes\n\n',
};

function loadEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(sk());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEntries(entries: JournalEntry[]) {
  try { localStorage.setItem(sk(), JSON.stringify(entries)); } catch { /* noop */ }
}

function extractLinks(text: string): string[] {
  const matches = text.match(/\[\[([^\]]+)\]\]/g);
  return matches ? [...new Set(matches.map(m => m.slice(2, -2).trim()))] : [];
}

function newEntry(type: JournalEntry['type']): JournalEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: `New ${TYPE_LABELS[type]}`,
    content: TEMPLATES[type] || '',
    tags: [],
    linkedEntries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [adventureRefs, setAdventureRefs] = useState<any[]>([]);
  const [adventureSearch, setAdventureSearch] = useState('');
  const [showBacklinks, setShowBacklinks] = useState(true);

  useEffect(() => {
    setEntries(loadEntries());
    DataEngine.getAdventures().then(setAdventureRefs);
  }, []);

  useEffect(() => {
    if (entries.length > 0 && !activeEntry) {
      setActiveEntry(entries[0].id);
    }
  }, [entries, activeEntry]);

  const persist = useCallback((updated: JournalEntry[]) => { setEntries(updated); saveEntries(updated); }, []);

  const active = entries.find(e => e.id === activeEntry) || null;

  const filtered = entries.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const backlinks = active ? entries.filter(e => e.id !== active.id && extractLinks(e.content).includes(active.title)) : [];

  const updateActive = (patch: Partial<JournalEntry>) => {
    if (!active) return;
    const updated = { ...active, ...patch, updatedAt: new Date().toISOString(), linkedEntries: extractLinks(patch.content ?? active.content) };
    persist(entries.map(e => e.id === updated.id ? updated : e));
  };

  const createEntry = (type: JournalEntry['type']) => {
    const entry = newEntry(type);
    persist([entry, ...entries]);
    setActiveEntry(entry.id);
  };

  const deleteEntry = (id: string) => {
    if (!confirm('Delete this journal entry?')) return;
    persist(entries.filter(e => e.id !== id));
    if (activeEntry === id) setActiveEntry(entries.length > 1 ? entries.find(e => e.id !== id)?.id || null : null);
  };

  const insertLink = (name: string) => {
    if (!active) return;
    updateActive({ content: active.content + `\n[[${name}]]\n` });
  };

  const addTag = (tag: string) => {
    if (!active || !tag.trim() || active.tags.includes(tag.trim())) return;
    updateActive({ tags: [...active.tags, tag.trim()] });
  };

  const removeTag = (tag: string) => {
    if (!active) return;
    updateActive({ tags: active.tags.filter(t => t !== tag) });
  };

  const saveToVault = async () => {
    if (!active) return;
    const frontmatter = [
      '---',
      `title: "${active.title}"`,
      `type: ${active.type}`,
      `tags: [${active.tags.map(t => `"${t}"`).join(', ')}]`,
      `created: ${active.createdAt}`,
      `updated: ${active.updatedAt}`,
      '---',
      '',
    ].join('\n');
    const content = frontmatter + active.content;
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({ filters: [{ name: 'Markdown', extensions: ['md'] }], defaultPath: `${active.title.replace(/[\/\\:*?"<>|]/g, '_')}.md` });
      if (path) {
        await writeTextFile(path, content);
      }
    } catch { /* noop */ }
  };

  const importFromVault = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({ multiple: false, filters: [{ name: 'Markdown', extensions: ['md'] }] });
      if (selected && !Array.isArray(selected)) {
        const content = await readTextFile(selected);
      const fmMatch = content.match(/---[\s\S]*?---\n*/);
      const body = fmMatch ? content.slice(fmMatch[0].length) : content;
      const fm = fmMatch ? fmMatch[0] : '';
      const titleMatch = fm.match(/title:\s*"(.+?)"/);
      const typeMatch = fm.match(/type:\s*(\S+)/);
      const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/);
      const entry: JournalEntry = {
        id: `entry-${Date.now()}`,
        type: (typeMatch?.[1] as any) || 'note',
        title: titleMatch?.[1] || selected.split('/').pop()?.replace('.md', '') || 'Imported',
        content: body.trim(),
        tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')) : [],
        linkedEntries: extractLinks(body),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([entry, ...entries]);
      setActiveEntry(entry.id);
    }
    } catch { /* noop */ }
  };

  const filteredAdventures = adventureRefs.filter((a: any) => a.name?.toLowerCase().includes(adventureSearch.toLowerCase())).slice(0, 10);
  const allEntryTitles = entries.map(e => e.title).filter(t => t !== active?.title);

  return (
    <div style={{ padding: '2rem', color: 'white', display: 'grid', gridTemplateColumns: '300px 1fr 250px', gap: '16px', height: 'calc(100vh - 80px)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Left sidebar — entry list */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#1a202c', borderRadius: '8px', border: '1px solid #2d3748', overflow: 'hidden' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #2d3748' }}>
          <Link href="/dm" style={{ color: '#a0aec0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>← DM Hub</Link>
          <h2 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', fontSize: '1.2rem', margin: '0 0 8px' }}>Journal</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..."
            style={{ width: '100%', padding: '6px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '6px' }} />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {['all', 'session-recap', 'lore', 'npc', 'quest', 'world', 'note'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.65rem', background: typeFilter === t ? '#6366f1' : '#2d3748', color: 'white', whiteSpace: 'nowrap' }}>
                {t === 'all' ? 'All' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 && <p style={{ color: '#718096', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No entries yet.</p>}
          {filtered.map(e => (
            <div key={e.id} onClick={() => setActiveEntry(e.id)}
              style={{ padding: '8px', marginBottom: '4px', borderRadius: '4px', cursor: 'pointer', background: active?.id === e.id ? '#2d3748' : 'transparent', border: active?.id === e.id ? '1px solid #6366f1' : '1px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TYPE_COLORS[e.type], flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#718096', marginTop: '2px' }}>
                {TYPE_LABELS[e.type]} · {new Date(e.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px', borderTop: '1px solid #2d3748', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Object.keys(TEMPLATES).map(t => (
            <button key={t} onClick={() => createEntry(t as JournalEntry['type'])}
              style={{ padding: '4px 8px', background: TYPE_COLORS[t], border: 'none', color: '#1a202c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}>
              +{TYPE_LABELS[t].split(' ')[0]}
            </button>
          ))}
          <button onClick={importFromVault} style={{ padding: '4px 8px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}>Import .md</button>
        </div>
      </div>

      {/* Main editor */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#1a202c', borderRadius: '8px', border: '1px solid #2d3748', overflow: 'hidden' }}>
        {active ? (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid #2d3748' }}>
              <input value={active.title} onChange={e => updateActive({ title: e.target.value })}
                style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: 'white', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'serif', outline: 'none' }}
                placeholder="Entry title..." />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <select value={active.type} onChange={e => updateActive({ type: e.target.value as JournalEntry['type'] })}
                  style={{ padding: '4px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <span style={{ fontSize: '0.7rem', color: '#718096' }}>Updated {new Date(active.updatedAt).toLocaleString()}</span>
                <div style={{ flex: 1 }} />
                <button onClick={saveToVault} style={{ padding: '4px 10px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Save .md</button>
                <button onClick={() => deleteEntry(active.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
              </div>
              {/* Tags */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                {active.tags.map(t => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 8px', background: '#2d3748', borderRadius: '12px', fontSize: '0.7rem', color: '#a0aec0', border: '1px solid #4a5568' }}>
                    #{t}
                    <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', padding: 0, fontSize: '0.7rem' }}>×</button>
                  </span>
                ))}
                <input placeholder="Add tag..." onKeyDown={e => { if (e.key === 'Enter') { addTag((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; }}}
                  style={{ padding: '2px 6px', background: 'transparent', border: '1px solid #4a5568', color: 'white', borderRadius: '12px', fontSize: '0.7rem', width: '80px', outline: 'none' }} />
              </div>
            </div>
            <textarea value={active.content} onChange={e => updateActive({ content: e.target.value })}
              style={{ flex: 1, width: '100%', padding: '16px', background: '#0d1117', border: 'none', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.7, resize: 'none', outline: 'none' }} />
            <div style={{ padding: '8px 16px', borderTop: '1px solid #2d3748', fontSize: '0.7rem', color: '#718096', display: 'flex', gap: '8px' }}>
              <span>Use [[wiki-links]] to link entries</span>
              <span>·</span>
              <span>{active.content.length} chars</span>
              <span>·</span>
              <span>{extractLinks(active.content).length} links</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#718096' }}>
            Select or create an entry to begin.
          </div>
        )}
      </div>

      {/* Right sidebar — backlinks + refs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#1a202c', borderRadius: '8px', border: '1px solid #2d3748', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: '#f6e05e', margin: 0, fontSize: '0.85rem' }}>Backlinks</h3>
            <button onClick={() => setShowBacklinks(!showBacklinks)} style={{ padding: '2px 6px', background: '#2d3748', border: '1px solid #4a5568', color: '#a0aec0', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}>
              {showBacklinks ? 'Hide' : 'Show'}
            </button>
          </div>
          {showBacklinks && active && (
            <>
              {backlinks.length === 0 && <p style={{ color: '#718096', fontSize: '0.75rem', margin: 0 }}>No backlinks.</p>}
              {backlinks.map(e => (
                <div key={e.id} onClick={() => setActiveEntry(e.id)} style={{ padding: '6px 8px', marginBottom: '4px', background: '#2d3748', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#a0aec0' }}>
                  <span style={{ color: '#e2e8f0' }}>{e.title}</span>
                  <span style={{ fontSize: '0.65rem', color: TYPE_COLORS[e.type], marginLeft: '6px' }}>{TYPE_LABELS[e.type]}</span>
                </div>
              ))}
              {/* Links FROM this entry */}
              {extractLinks(active.content).length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid #2d3748', margin: '8px 0', paddingTop: '8px' }}>
                    <span style={{ color: '#718096', fontSize: '0.7rem' }}>Links to:</span>
                  </div>
                  {extractLinks(active.content).map(title => {
                    const target = entries.find(e => e.title === title);
                    return (
                      <div key={title} onClick={() => target && setActiveEntry(target.id)} style={{ padding: '4px 8px', marginBottom: '2px', borderRadius: '4px', cursor: target ? 'pointer' : 'default', fontSize: '0.7rem', color: target ? '#63b3ed' : '#718096', background: target ? '#2d3748' : 'transparent' }}>
                        {target ? `→ ${title}` : `? ${title} (missing)`}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div style={{ background: '#1a202c', borderRadius: '8px', border: '1px solid #2d3748', padding: '12px' }}>
          <h3 style={{ color: '#f6e05e', margin: '0 0 8px', fontSize: '0.85rem' }}>Insert Link</h3>
          <input value={adventureSearch} onChange={e => setAdventureSearch(e.target.value)} placeholder="Search..."
            style={{ width: '100%', padding: '4px 6px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '6px' }} />
          <div style={{ fontSize: '0.7rem', color: '#718096', marginBottom: '4px' }}>Adventures</div>
          {filteredAdventures.map((a: any, i: number) => (
            <button key={i} onClick={() => insertLink(a.name)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 6px', marginBottom: '2px', background: 'transparent', border: 'none', color: '#a0aec0', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
              {a.name}
            </button>
          ))}
          {allEntryTitles.length > 0 && (
            <>
              <div style={{ fontSize: '0.7rem', color: '#718096', margin: '6px 0 4px' }}>Entries</div>
              {allEntryTitles.map(t => (
                <button key={t} onClick={() => insertLink(t)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 6px', marginBottom: '2px', background: 'transparent', border: 'none', color: '#63b3ed', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                  {t}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
