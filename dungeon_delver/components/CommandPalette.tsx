'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PaletteEntry, getStaticPages, getCharacters, buildSpellEntries, buildItemEntries, buildMonsterEntries, searchEntries, loadRecentIds, saveRecentId } from '../utils/commandPaletteEngine';

const CATEGORY_LABELS: Record<string, string> = {
  page: 'Pages',
  character: 'Characters',
  spell: 'Spells',
  item: 'Items',
  monster: 'Monsters',
};

const CATEGORY_COLORS: Record<string, string> = {
  page: '#63b3ed',
  character: '#b8860b',
  spell: '#68d391',
  item: '#f6ad55',
  monster: '#fc8181',
};

const MAX_PER_CATEGORY = 6;

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<PaletteEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const buildIndex = useCallback(async () => {
    if (index) return;
    setLoading(true);
    const pages = getStaticPages();
    const chars = getCharacters();
    const [spells, items, monsters] = await Promise.all([
      buildSpellEntries(),
      buildItemEntries(),
      buildMonsterEntries(),
    ]);
    setIndex([...pages, ...chars, ...spells, ...items, ...monsters]);
    setLoading(false);
  }, [index]);

  const results = index ? searchEntries(query, index) : [];

  const groupedResults: { category: string; entries: PaletteEntry[] }[] = [];
  if (results.length > 0) {
    const categories = ['page', 'character', 'spell', 'item', 'monster'];
    for (const cat of categories) {
      const filtered = results.filter(r => r.category === cat);
      if (filtered.length > 0) {
        groupedResults.push({ category: cat, entries: filtered.slice(0, MAX_PER_CATEGORY) });
      }
    }
  } else if (open && !query && index) {
    const recentEntries = index.filter(e => recentIds.includes(e.id));
    if (recentEntries.length > 0) {
      groupedResults.push({ category: 'recent', entries: recentEntries.slice(0, MAX_PER_CATEGORY) });
    }
  }

  const flatResults = groupedResults.flatMap(g => g.entries);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => {
          if (!prev) {
            setQuery('');
            setSelectedIdx(0);
            setRecentIds(loadRecentIds());
            buildIndex();
          }
          return !prev;
        });
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, buildIndex]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    setSelectedIdx(0);
  }, [open]);

  const navigate = useCallback((entry: PaletteEntry) => {
    saveRecentId(entry.id);
    setOpen(false);
    router.push(entry.route);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIdx]) {
      navigate(flatResults[selectedIdx]);
    }
  };

  useEffect(() => {
    if (listRef.current && selectedIdx >= 0) {
      const el = listRef.current.children[selectedIdx] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '80px',
        background: 'rgba(0,0,0,0.65)',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '540px',
          maxHeight: '460px',
          background: '#1a202c',
          border: '1px solid #4a5568',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2d3748' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, spells, items, monsters..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          ref={listRef}
          style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
        >
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
              Loading data...
            </div>
          )}

          {!loading && flatResults.length === 0 && query && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && flatResults.length === 0 && !query && !recentIds.length && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
              Type to start searching
            </div>
          )}

          {groupedResults.map((group) => (
            <div key={group.category}>
              <div
                style={{
                  padding: '6px 16px 4px',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#718096',
                  fontWeight: 600,
                }}
              >
                {group.category === 'recent' ? 'Recent' : CATEGORY_LABELS[group.category] || group.category}
              </div>
              {group.entries.map((entry, gi) => {
                const fi = flatResults.indexOf(entry);
                const isSelected = fi === selectedIdx;
                return (
                  <div
                    key={entry.id}
                    onClick={() => navigate(entry)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(184,134,11,0.15)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #b8860b' : '3px solid transparent',
                    }}
                    onMouseEnter={() => setSelectedIdx(fi)}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: '#fff',
                        background: CATEGORY_COLORS[entry.category] || '#718096',
                        borderRadius: '3px',
                        padding: '1px 6px',
                        flexShrink: 0,
                        textTransform: 'uppercase',
                      }}
                    >
                      {entry.category === 'page' ? 'Page' : entry.category.slice(0, 4)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
                        {entry.label}
                      </div>
                      {entry.description && (
                        <div style={{ color: '#718096', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #2d3748',
            display: 'flex',
            gap: '16px',
            fontSize: '0.7rem',
            color: '#718096',
          }}
        >
          <span><kbd style={kbdStyle}>↑↓</kbd> Navigate</span>
          <span><kbd style={kbdStyle}>↵</kbd> Open</span>
          <span><kbd style={kbdStyle}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  background: '#2d3748',
  border: '1px solid #4a5568',
  borderRadius: '3px',
  padding: '1px 5px',
  fontFamily: 'inherit',
  fontSize: '0.65rem',
  color: '#a0aec0',
};
