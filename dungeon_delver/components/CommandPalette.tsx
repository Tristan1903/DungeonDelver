// =============================================================================
// 📘 FILE: components/CommandPalette.tsx
// =============================================================================
// 🎯 PURPOSE: A Ctrl+K (or Cmd+K) command palette overlay. Users can search
//    across pages, characters, spells, items, and monsters — then press Enter
//    to navigate directly to the result.
//
// 🧠 REACT CONCEPT #1: useRef + useEffect for DOM Access
//    useRef creates a reference to a DOM element (like the search input).
//    useEffect then calls inputRef.current.focus() when the palette opens.
//    This is how you imperatively control DOM elements in React.
//
// 🧠 REACT CONCEPT #2: Keyboard Events
//    This component listens for global keyboard events:
//    - Ctrl+K / Cmd+K to open the palette
//    - Escape to close
//    - Arrow Up/Down to navigate results
//    - Enter to select
//    Keyboard events are added with addEventListener in useEffect, with
//    proper cleanup on unmount.
//
// 🧠 REACT CONCEPT #3: useCallback + useMemo for Performance
//    useCallback prevents the buildIndex function from being recreated on
//    every render. The `results` are derived from state (query + index) and
//    computed on every render — which is fine for a search UI.
//
// 🔧 HOW TO ALTER:
//    - Change keyboard shortcut: modify the (e.ctrlKey || e.metaKey) && e.key === 'k' check
//    - Add new search categories: build new entry builders in commandPaletteEngine.ts
//    - Change max results per category: modify MAX_PER_CATEGORY
//    - Change the visual style: modify the inline styles in the JSX
// =============================================================================

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// 🧠 useRouter — Next.js hook for programmatic navigation.
//    router.push('/some-path') navigates to a page, just like a Link click.
//    Used here when the user presses Enter on a search result.

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
  // 🧠 State for the palette:
  const [open, setOpen] = useState(false);           // Is the palette visible?
  const [query, setQuery] = useState('');             // Current search text
  const [index, setIndex] = useState<PaletteEntry[] | null>(null);  // All searchable entries
  const [loading, setLoading] = useState(false);       // Loading state while building index
  const [selectedIdx, setSelectedIdx] = useState(0);   // Currently highlighted result
  const [recentIds, setRecentIds] = useState<string[]>([]);  // Recently opened entries

  // 🧠 useRef — Holds a reference to the <input> DOM element.
  //    Unlike useState, changing a ref does NOT cause re-render.
  //    Used to call .focus() on the input when the palette opens.
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 🧠 useCallback — Memoizes the function so it's NOT recreated on every render.
  //    The dependency `[index]` means it only recreates if `index` changes.
  //    If the index is already built, it skips loading (early return).
  const buildIndex = useCallback(async () => {
    if (index) return;  // Already built
    setLoading(true);
    // 🧠 Static pages are synchronous (defined in the engine file).
    // Characters are synchronous (read from localStorage).
    // Spells/items/monsters are ASYNC (fetched from JSON files via fetch()).
    // We use Promise.all to load them in parallel for speed.
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

  // 🧠 Derived state: results are computed from `query` and `index` on every render.
  //    This is fine — searchEntries is fast and runs synchronously.
  const results = index ? searchEntries(query, index) : [];

  // 🧠 Group results by category, limiting to MAX_PER_CATEGORY each.
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
    // 🧠 If no query is typed, show recent items instead.
    const recentEntries = index.filter(e => recentIds.includes(e.id));
    if (recentEntries.length > 0) {
      groupedResults.push({ category: 'recent', entries: recentEntries.slice(0, MAX_PER_CATEGORY) });
    }
  }

  // 🧠 Flat list of all results across categories (for keyboard navigation indexing).
  const flatResults = groupedResults.flatMap(g => g.entries);

  // 🧠 KEYBOARD SHORTCUT LISTENER (Ctrl+K / Cmd+K)
  //    Added via useEffect to window.addEventListener.
    //    Returns a cleanup function that removes the listener.
  //
  //    🧠 Dependency array: [open, buildIndex]
  //    When `open` changes, the effect re-runs with the new closure value.
  //    The `buildIndex` is memoized with useCallback so it's stable.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 🧠 Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => {
          if (!prev) {
            setQuery('');
            setSelectedIdx(0);
            setRecentIds(loadRecentIds());
            buildIndex();  // Build search index when opening
          }
          return !prev;
        });
      }
      // Escape closes
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    // 🧠 Cleanup function — runs when component unmounts or deps change.
    //    If we didn't remove the listener, it would keep firing even after
    //    the component is gone (memory leak!).
    return () => window.removeEventListener('keydown', handler);
  }, [open, buildIndex]);

  // 🧠 Auto-focus the input when the palette opens.
  //    Also reset the selection index to 0.
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    setSelectedIdx(0);
  }, [open]);

  // 🧠 Navigate to a selected entry
  const navigate = useCallback((entry: PaletteEntry) => {
    saveRecentId(entry.id);    // Save to recent items
    setOpen(false);             // Close palette
    router.push(entry.route);   // Navigate to the page
  }, [router]);

  // 🧠 Keyboard navigation within the results list
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

  // 🧠 Scroll the selected result into view
  useEffect(() => {
    if (listRef.current && selectedIdx >= 0) {
      const el = listRef.current.children[selectedIdx] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  // 🧠 Early return: If the palette is closed, render NOTHING.
  //    This is more efficient than showing a hidden overlay.
  if (!open) return null;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    // 🧠 Overlay backdrop — clicking outside closes the palette
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', justifyContent: 'center',
        paddingTop: '80px',
        background: 'rgba(0,0,0,0.65)',
      }}
      onClick={() => setOpen(false)}  // Click backdrop → close
    >
      {/* 🧠 Modal card — clicking the card itself does NOT close (stopPropagation) */}
      <div
        style={{
          width: '540px', maxHeight: '460px',
          background: '#1a202c', border: '1px solid #4a5568',
          borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}  // 🧠 Prevents click from reaching the backdrop
      >
        {/* 🧠 Search input */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2d3748' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, spells, items, monsters..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#2d3748', border: '1px solid #4a5568',
              borderRadius: '6px', color: '#e2e8f0', fontSize: '0.95rem',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 🧠 Results list */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {/* Loading state */}
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
              Loading data...
            </div>
          )}

          {/* Empty search state */}
          {!loading && flatResults.length === 0 && query && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Initial empty state */}
          {!loading && flatResults.length === 0 && !query && !recentIds.length && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#718096', fontSize: '0.9rem' }}>
              Type to start searching
            </div>
          )}

          {/* 🧠 Grouped results rendering */}
          {groupedResults.map((group) => (
            <div key={group.category}>
              {/* Category header */}
              <div style={{ padding: '6px 16px 4px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#718096', fontWeight: 600 }}>
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
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 16px', cursor: 'pointer',
                      background: isSelected ? 'rgba(184,134,11,0.15)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #b8860b' : '3px solid transparent',
                    }}
                    onMouseEnter={() => setSelectedIdx(fi)}  // Track mouse for keyboard/mouse sync
                  >
                    {/* Category badge */}
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff', background: CATEGORY_COLORS[entry.category] || '#718096', borderRadius: '3px', padding: '1px 6px', flexShrink: 0, textTransform: 'uppercase' }}>
                      {entry.category === 'page' ? 'Page' : entry.category.slice(0, 4)}
                    </span>
                    {/* Entry text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{entry.label}</div>
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

        {/* Keyboard shortcuts hint */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #2d3748', display: 'flex', gap: '16px', fontSize: '0.7rem', color: '#718096' }}>
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
