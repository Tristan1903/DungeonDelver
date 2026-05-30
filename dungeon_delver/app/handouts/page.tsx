'use client';
import { useState, useCallback } from 'react';
import { DataEngine } from '../../utils/dataLoader';
import { loadHBItems, loadHBSpells } from '../../utils/homebrewEngine';
import { SpellCard, ItemCard } from '../../components/HandoutCard';

export default function HandoutPage() {
  const [tab, setTab] = useState<'spells' | 'items'>('spells');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);

  const runSearch = useCallback(async () => {
    const q = search.toLowerCase();
    if (tab === 'spells') {
      const spells = await DataEngine.getSpells();
      const homebrew = loadHBSpells();
      setResults([...spells, ...homebrew].filter((s: any) => s.name.toLowerCase().includes(q)).slice(0, 100));
    } else {
      const items = await DataEngine.getItems();
      const homebrew = loadHBItems();
      setResults([...items, ...homebrew.map((i: any) => ({ ...i, _homebrew: true }))].filter((i: any) => i.name.toLowerCase().includes(q)).slice(0, 100));
    }
  }, [tab, search]);

  const toggleSelect = (item: any) => {
    setSelected(prev => {
      const exists = prev.find(s => s.name === item.name && s.source === item.source);
      if (exists) return prev.filter(s => s !== exists);
      return [...prev, item];
    });
  };

  const clearSelected = () => setSelected([]);

  const cardCount = selected.length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', color: '#e2e8f0' }} className="handout-page">
      <aside className="handout-sidebar" style={{ width: '280px', flexShrink: 0, background: '#0f1419', borderRight: '1px solid #4a5568', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'serif', color: '#b8860b', fontSize: '1rem', margin: 0 }}>Handout Generator</h2>

        <div style={{ display: 'flex', gap: '4px' }}>
          {(['spells', 'items'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setResults([]); setSearch(''); }} style={{ flex: 1, padding: '6px', background: tab === t ? '#b8860b' : '#2d3748', border: 'none', color: 'white', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch()}
          placeholder={`Search ${tab}...`}
          style={{ padding: '8px 10px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.8rem' }}
        />
        <button onClick={runSearch} style={{ padding: '8px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>Search</button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {results.map((r, i) => {
            const isSelected = selected.some(s => s.name === r.name && s.source === r.source);
            return (
              <div
                key={i}
                onClick={() => toggleSelect(r)}
                style={{
                  padding: '6px 8px', background: isSelected ? 'rgba(184,134,11,0.15)' : '#1e2538',
                  border: `1px solid ${isSelected ? '#b8860b' : '#4a5568'}`,
                  borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.name}</div>
                <div style={{ color: '#718096', fontSize: '0.65rem' }}>
                  {r.level !== undefined ? (r.level === 0 ? 'Cantrip' : `Level ${r.level}`) : r.type || ''}
                  {r.rarity && r.rarity !== 'none' ? ` — ${r.rarity}` : ''}
                </div>
              </div>
            );
          })}
          {results.length === 0 && <p style={{ color: '#718096', fontSize: '0.75rem', textAlign: 'center', marginTop: '16px' }}>Search to find {tab}</p>}
        </div>

        <div style={{ borderTop: '1px solid #2d3748', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#718096' }}>{cardCount} selected</span>
          {cardCount > 0 && <button onClick={clearSelected} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>Clear</button>}
        </div>
      </aside>

      <main className="handout-main" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontFamily: 'serif', color: '#b8860b', fontSize: '1.3rem', margin: 0 }}>Print Preview</h1>
          <button
            onClick={() => window.print()}
            disabled={cardCount === 0}
            style={{
              padding: '10px 24px', background: cardCount > 0 ? '#b8860b' : '#4a5568',
              border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.9rem', cursor: cardCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Print / Save PDF ({cardCount} cards)
          </button>
        </div>

        {cardCount === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🖨️</div>
            <p>Search for spells or items on the left, then click to add them to the print preview.</p>
          </div>
        ) : (
          <div className="handout-grid">
            {selected.map((item, i) => (
              tab === 'spells' ? <SpellCard key={i} spell={item} /> : <ItemCard key={i} item={item} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 0.4in; }
          .handout-sidebar { display: none !important; }
          .handout-page { display: block !important; background: white !important; }
          .handout-main { padding: 0 !important; }
          .handout-main > div:first-child { display: none !important; }
          .handout-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10mm !important; }
          .handout-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #333 !important;
            background: white !important;
            color: black !important;
            padding: 10px !important;
            font-size: 8pt !important;
          }
          .handout-card .handout-title { font-size: 10pt !important; }
          .handout-card .handout-subtitle { font-size: 7pt !important; }
          .handout-card .handout-description { font-size: 7pt !important; }
        }
        .handout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .handout-card {
          background: #1e2538;
          border: 1px solid #4a5568;
          border-radius: 8px;
          padding: 14px;
          break-inside: avoid;
        }
        .handout-header {
          margin-bottom: 8px;
        }
        .handout-title {
          font-family: serif;
          font-size: 1rem;
          font-weight: 700;
          color: #b8860b;
        }
        .handout-subtitle {
          font-size: 0.75rem;
          color: #a0aec0;
          font-style: italic;
        }
        .handout-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          font-size: 0.7rem;
          color: #cbd5e0;
          margin-bottom: 6px;
        }
        .handout-stats span { white-space: nowrap; }
        .handout-divider {
          height: 1px;
          background: #4a5568;
          margin: 6px 0;
        }
        .handout-description {
          font-size: 0.75rem;
          color: #e2e8f0;
          line-height: 1.4;
        }
        .handout-description p { margin: 0 0 4px; }
      `}</style>
    </div>
  );
}
