'use client';
// ===== 📘 FILE: app/cards/page.tsx =====
// 🎯 PURPOSE: Animated cards browser — filters and displays spell cards and Deck of Many Things
//   cards with preview GIFs and PDF download links.
// 🧠 REACT CONCEPT: useMemo + Controlled Filters — demonstrates memoizing filtered results based
//   on filter state (type, level, text query) to avoid re-computation on every render.
// =====
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getAllCards, getFilteredCards, CardEntry } from '../../utils/cardEngine';

const LEVEL_LABELS: Record<number, string> = { 0: 'Cantrip', 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' };

export default function CardsPage() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [filterType, setFilterType] = useState<'spell' | 'deck-of-many-things' | null>(null);
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CardEntry | null>(null);

  const allCards = useMemo(() => getAllCards(), []);

  const filtered = useMemo(() => {
    const type = filterType || undefined;
    const level = filterLevel !== null ? filterLevel : undefined;
    return getFilteredCards(allCards, { type, level, query: query || undefined });
  }, [allCards, filterType, filterLevel, query]);

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', color: '#e2e8f0' }}>
      <aside style={{ width: isMobile ? '100%' : '180px', flexShrink: 0, background: '#0f1419', borderRight: isMobile ? 'none' : '1px solid #4a5568', borderBottom: isMobile ? '1px solid #4a5568' : 'none', padding: isMobile ? '10px' : '20px 0', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '6px', overflowX: isMobile ? 'auto' : 'visible', alignItems: isMobile ? 'center' : undefined, flexWrap: isMobile ? 'nowrap' : undefined }}>
        {isMobile && <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#718096', fontWeight: 600, whiteSpace: 'nowrap' }}>Type</div>}
        {!isMobile && <div style={{ padding: '0 16px 16px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#718096', fontWeight: 600 }}>Type</div>}
        <FilterButton label="All Cards" active={filterType === null && filterLevel === null} onClick={() => { setFilterType(null); setFilterLevel(null); }} />
        <FilterButton label="Spells" active={filterType === 'spell'} onClick={() => setFilterType(filterType === 'spell' ? null : 'spell')} />
        <FilterButton label="Deck of Many" active={filterType === 'deck-of-many-things'} onClick={() => setFilterType(filterType === 'deck-of-many-things' ? null : 'deck-of-many-things')} />

        {isMobile && <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#718096', fontWeight: 600, whiteSpace: 'nowrap' }}>Level</div>}
        {!isMobile && <div style={{ padding: '20px 16px 8px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#718096', fontWeight: 600, marginTop: '8px', borderTop: '1px solid #2d3748' }}>Spell Level</div>}
        {[0, 1, 2, 3].map(lvl => (
          <FilterButton
            key={lvl}
            label={LEVEL_LABELS[lvl]}
            active={filterLevel === lvl}
            onClick={() => setFilterLevel(filterLevel === lvl ? null : lvl)}
          />
        ))}

        <div style={isMobile ? { flexShrink: 0 } : { padding: '0 16px', marginTop: '16px' }}>
          <input
            type="text"
            placeholder={isMobile ? "Search..." : "Search cards..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={isMobile ? {
              width: '120px', padding: '6px 8px', background: '#2d3748',
              border: '1px solid #4a5568', borderRadius: '4px', color: '#e2e8f0',
              fontSize: '0.75rem', flexShrink: 0,
            } : {
              width: '100%', padding: '8px 10px', background: '#2d3748',
              border: '1px solid #4a5568', borderRadius: '4px', color: '#e2e8f0',
              fontSize: '0.8rem', boxSizing: 'border-box',
            }}
          />
        </div>
      </aside>

      <main style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto' }}>
        <h1 style={{ fontFamily: 'serif', color: 'var(--dungeon-gold, #b8860b)', fontSize: '1.5rem', marginBottom: '4px' }}>Animated Cards</h1>
        <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '20px' }}>{filtered.length} cards</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
          {filtered.map(card => (
            <div
              key={card.id}
              onClick={() => setSelected(card)}
              style={{
                background: '#1e2538',
                border: '1px solid #4a5568',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#b8860b'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#4a5568'}
            >
              <div style={{
                width: '100%',
                aspectRatio: '3 / 4',
                background: '#0f1419',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {card.gifPath ? (
                  <img src={card.gifPath} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: '#4a5568', fontSize: '2rem' }}>?</div>
                )}
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {card.type === 'spell' && card.level !== undefined && (
                    <Badge color="#68d391">{LEVEL_LABELS[card.level]}</Badge>
                  )}
                  {card.type === 'deck-of-many-things' && (
                    <Badge color="#f6ad55">Deck</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>No cards match your filters.</div>
        )}
      </main>

      {selected && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#1a202c', border: '1px solid #4a5568', borderRadius: '12px',
              padding: '24px', maxWidth: '420px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'serif', color: '#e2e8f0', fontSize: '1.2rem', margin: 0 }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {selected.type === 'spell' && selected.level !== undefined && (
                    <Badge color="#68d391">{LEVEL_LABELS[selected.level]}</Badge>
                  )}
                  {selected.type === 'deck-of-many-things' && (
                    <Badge color="#f6ad55">Deck of Many Things</Badge>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#718096', fontSize: '1.5rem', cursor: 'pointer', padding: '0 4px' }}>&times;</button>
            </div>

            <div style={{
              width: '100%', aspectRatio: '3 / 4',
              background: '#0f1419', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px',
            }}>
              {selected.gifPath ? (
                <img src={selected.gifPath} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>No preview</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selected.pdfPaths.map((pdf, i) => (
                <a
                  key={i}
                  href={pdf.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', padding: '10px 14px', background: '#2d3748',
                    border: '1px solid #4a5568', borderRadius: '6px', color: '#e2e8f0',
                    textDecoration: 'none', fontSize: '0.85rem', textAlign: 'center',
                  }}
                >
                  Download {pdf.label}
                </a>
              ))}
              {selected.type === 'spell' && selected.spellName && (
                <Link
                  href={`/library?tab=spells&q=${encodeURIComponent(selected.spellName)}`}
                  style={{
                    display: 'block', padding: '10px 14px', background: '#2d3748',
                    border: '1px solid #b8860b', borderRadius: '6px', color: '#b8860b',
                    textDecoration: 'none', fontSize: '0.85rem', textAlign: 'center', marginTop: '4px',
                  }}
                >
                  View in Library
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px',
        background: active ? 'rgba(184,134,11,0.15)' : 'transparent',
        border: 'none', color: active ? '#b8860b' : '#cbd5e0', cursor: 'pointer',
        fontSize: '0.85rem', borderLeft: active ? '3px solid #b8860b' : '3px solid transparent',
      }}
    >
      {label}
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#fff', background: color, borderRadius: '3px', padding: '1px 5px' }}>
      {children}
    </span>
  );
}
