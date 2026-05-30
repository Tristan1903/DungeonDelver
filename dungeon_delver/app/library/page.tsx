'use client';
import { useState, useEffect, useCallback } from 'react';
import { DataEngine } from '../../utils/dataLoader';
import { loadHBItems, loadHBMonsters, loadHBSpells } from '../../utils/homebrewEngine';

type Tab = 'books' | 'monsters' | 'items' | 'spells' | 'races' | 'backgrounds';

const TAB_LIST: { id: Tab; label: string }[] = [
  { id: 'books', label: 'Books' },
  { id: 'monsters', label: 'Monsters' },
  { id: 'items', label: 'Items' },
  { id: 'spells', label: 'Spells' },
  { id: 'races', label: 'Races' },
  { id: 'backgrounds', label: 'Backgrounds' },
];

const SOURCE_GROUPS: Record<string, string[]> = {
  'Core': ['PHB', 'XPHB', 'MM', 'DMG'],
  'Supplements': ['XGE', 'TCE', 'VGTM', 'MTF', 'MPMM', 'VGM'],
  'Settings': ['SCAG', 'GGR', 'ERLW', 'EGW', 'MOoT', 'DSotDQ', 'BGG', 'LoX'],
  'Adventures': ['LMoP', 'HotDQ', 'RotT', 'PotA', 'OotA', 'CoS', 'TftYP', 'ToA', 'SKT', 'TTP', 'WDH', 'WDMM', 'IDRotF', 'EGW', 'CotN', 'DSotDQ', 'BGG', 'LoX'],
  'Third Party': ['GHPG'],
};

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('books');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [books, setBooks] = useState<any[]>([]);
  const [allMonsters, setAllMonsters] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allSpells, setAllSpells] = useState<any[]>([]);
  const [allRaces, setAllRaces] = useState<any[]>([]);
  const [allBackgrounds, setAllBackgrounds] = useState<any[]>([]);

  // Load all data on mount
  useEffect(() => {
    const load = async () => {
      const [b, m, i, s, r, bg] = await Promise.all([
        DataEngine.getBooks(),
        DataEngine.getBestiary(),
        DataEngine.getItems(),
        DataEngine.getSpells(),
        DataEngine.getMergedRaces(),
        DataEngine.getMergedBackgrounds(),
      ]);
      setBooks(b);
      setAllMonsters([...m, ...loadHBMonsters().map((x: any) => ({ ...x, _homebrew: true }))]);
      setAllItems([...i, ...loadHBItems().map((x: any) => ({ ...x, _homebrew: true }))]);
      setAllSpells([...s, ...loadHBSpells().map((x: any) => ({ ...x, _homebrew: true }))]);
      setAllRaces(r);
      setAllBackgrounds(bg);
    };
    load();
  }, []);

  // Get available sources for current tab
  const getSources = useCallback(() => {
    const items = tab === 'monsters' ? allMonsters : tab === 'items' ? allItems : tab === 'spells' ? allSpells : tab === 'races' ? allRaces : tab === 'backgrounds' ? allBackgrounds : [];
    const sourceSet = new Set(items.map((i: any) => i.source).filter(Boolean));
    return ['All', ...Array.from(sourceSet).sort()];
  }, [tab, allMonsters, allItems, allSpells, allRaces, allBackgrounds]);

  // Search/filter
  useEffect(() => {
    const q = search.toLowerCase();
    let items: any[] = [];

    switch (tab) {
      case 'books':
        items = books;
        break;
      case 'monsters':
        items = allMonsters;
        break;
      case 'items':
        items = allItems;
        break;
      case 'spells':
        items = allSpells;
        break;
      case 'races':
        items = allRaces;
        break;
      case 'backgrounds':
        items = allBackgrounds;
        break;
    }

    if (q) items = items.filter((i: any) => i.name?.toLowerCase().includes(q));
    if (selectedSource !== 'All') items = items.filter((i: any) => i.source === selectedSource);

    setResults(tab === 'books' ? items : items.slice(0, 200));
  }, [tab, search, selectedSource, books, allMonsters, allItems, allSpells, allRaces, allBackgrounds]);

  const sources = getSources();

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: 'serif', color: 'var(--dungeon-gold, #b8860b)' }}>Content Library</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {TAB_LIST.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setSelectedSource('All'); }}
            style={{
              padding: '8px 16px',
              background: tab === t.id ? 'var(--dungeon-gold, #b8860b)' : 'var(--dungeon-surface, #2d3748)',
              border: 'none', color: 'white', borderRadius: 'var(--dungeon-radius-sm, 4px)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: tab === t.id ? 700 : 400,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Source filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab}...`}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', background: 'var(--dungeon-surface)', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text)', borderRadius: 'var(--dungeon-radius-sm, 4px)', fontSize: '0.85rem' }} />
        {tab !== 'books' && sources.length > 2 && (
          <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--dungeon-surface)', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text)', borderRadius: 'var(--dungeon-radius-sm, 4px)', fontSize: '0.8rem' }}>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Results count */}
      <div style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-dim)', marginBottom: '8px' }}>
        {results.length} {results.length === 1 ? 'result' : 'results'}
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gap: '6px' }}>
        {tab === 'books' ? (
          results.map((book: any, i: number) => (
            <div key={i} style={{ padding: '14px', background: 'var(--dungeon-surface)', borderRadius: '6px', border: '1px solid var(--dungeon-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ color: 'var(--dungeon-gold)', fontSize: '0.95rem' }}>{book.name}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-dim)', marginTop: '2px' }}>
                    {book.author} {book.published && `· ${book.published}`}
                  </div>
                </div>
                <span style={{ padding: '2px 8px', background: 'var(--dungeon-bg)', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--dungeon-text-dim)' }}>
                  {book.group}
                </span>
              </div>
              {book.contents && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {book.contents.filter((c: any) => c.name !== 'Credits').map((c: any, j: number) => (
                    <span key={j} style={{ padding: '2px 6px', background: 'var(--dungeon-bg)', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--dungeon-text)' }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          results.map((r: any, i: number) => (
            <div key={i} style={{ padding: '10px 14px', background: 'var(--dungeon-surface)', borderRadius: '6px', border: '1px solid var(--dungeon-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.85rem' }}>{r.name}</strong>
                  {r._homebrew && <span style={{ padding: '1px 6px', background: 'var(--dungeon-accent)', borderRadius: '3px', fontSize: '0.6rem', color: 'white' }}>Homebrew</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: 'var(--dungeon-text-dim)' }}>
                  {r.source && <span>{r.source}</span>}
                  {r.cr && <span>CR {typeof r.cr === 'string' ? r.cr : r.cr.cr || '—'}</span>}
                  {r.level !== undefined && <span>Lvl {r.level}</span>}
                  {r.rarity && r.rarity !== 'none' && <span>{r.rarity}</span>}
                </div>
              </div>
              {tab === 'monsters' && r.hp && (
                <div style={{ fontSize: '0.7rem', color: 'var(--dungeon-text-dim)', marginTop: '2px' }}>
                  HP {r.hp.average || r.hp} · AC {Array.isArray(r.ac) ? r.ac[0]?.ac || r.ac[0] : r.ac}
                </div>
              )}
              {tab === 'spells' && (
                <div style={{ fontSize: '0.7rem', color: 'var(--dungeon-text-dim)', marginTop: '2px' }}>
                  {r.level === 0 ? 'Cantrip' : `Level ${r.level}`} · {r.school || '—'}
                  {r.classes && <span> · {Array.isArray(r.classes) ? r.classes.join(', ') : r.classes}</span>}
                </div>
              )}
              {tab === 'items' && (
                <div style={{ fontSize: '0.7rem', color: 'var(--dungeon-text-dim)', marginTop: '2px' }}>
                  {r.type && <span>{r.type}</span>}
                  {r.value && <span> · {(r.value / 100).toFixed(0)} gp</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
