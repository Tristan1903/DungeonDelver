'use client';
// =============================================================================
// 📘 FILE: components/HandoutCard.tsx
// =============================================================================
// 🎯 PURPOSE: A printable handout card component for spells and items. Renders
//    a compact, styled card suitable for printing (uses CSS classes like
//    `handout-card`, `handout-header`). Includes helper functions to format
//    spell/item fields (time, range, components, duration).
//
// 🧠 REACT CONCEPT: Presentational Components
//    `SpellCard` and `ItemCard` are pure presentational components — they receive
//    data via props and render it without side effects or local state. The helper
//    functions (`formatTime`, `formatRange`, etc.) are co-located for clarity.
// =============================================================================

export function SpellCard({ spell }: { spell: any }) {
  const levelLabel = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  const entries = spell.entries || [];
  const higher = spell.entriesHigher?.['1'] || spell.scalingLevelEffects?.['1'];

  return (
    <div className="handout-card">
      <div className="handout-header">
        <div className="handout-title">{spell.name}</div>
        <div className="handout-subtitle">{levelLabel} {spell.school || ''}</div>
      </div>
      <div className="handout-stats">
        <span><strong>Casting Time:</strong> {formatTime(spell.time)}</span>
        <span><strong>Range:</strong> {formatRange(spell.range)}</span>
        <span><strong>Components:</strong> {formatComponents(spell.components)}</span>
        <span><strong>Duration:</strong> {formatDuration(spell.duration)}</span>
      </div>
      <div className="handout-divider" />
      <div className="handout-description">
        {entries.map((e: any, i: number) => (
          <p key={i}>{typeof e === 'string' ? e : e.text || JSON.stringify(e)}</p>
        ))}
        {higher && <p style={{ fontStyle: 'italic', marginTop: '8px', color: '#555' }}><strong>At Higher Levels:</strong> {typeof higher === 'string' ? higher : higher.text || JSON.stringify(higher)}</p>}
      </div>
    </div>
  );
}

export function ItemCard({ item }: { item: any }) {
  const entries = item.entries || [];
  const attunement = item.attunement ? (typeof item.attunement === 'string' ? item.attunement : 'Required') : null;

  return (
    <div className="handout-card">
      <div className="handout-header">
        <div className="handout-title">{item.name}</div>
        <div className="handout-subtitle">{item.type || 'Item'} {item.rarity && item.rarity !== 'none' ? `— ${item.rarity}` : ''}</div>
      </div>
      {attunement && <div style={{ color: '#b8860b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>(Requires Attunement{typeof attunement === 'string' ? ` ${attunement}` : ''})</div>}
      <div className="handout-stats">
        {item.value && <span><strong>Value:</strong> {(item.value / 100).toFixed(0)} gp</span>}
        {item.weight && <span><strong>Weight:</strong> {item.weight} lb.</span>}
        {item.ac && <span><strong>AC:</strong> {typeof item.ac === 'number' ? item.ac : item.ac.ac || '?'}</span>}
        {item.dmg1 && <span><strong>Damage:</strong> {item.dmg1} {item.dmgType}</span>}
      </div>
      <div className="handout-divider" />
      <div className="handout-description">
        {entries.map((e: any, i: number) => (
          <p key={i}>{typeof e === 'string' ? e : e.text || JSON.stringify(e)}</p>
        ))}
        {!entries.length && <p style={{ color: '#999', fontStyle: 'italic' }}>No description available.</p>}
      </div>
    </div>
  );
}

function formatTime(time: any): string {
  if (!time) return '—';
  if (Array.isArray(time)) return time.map((t: any) => `${t.number || 1} ${t.unit || 'action'}`).join(' or ');
  if (typeof time === 'object') return `${time.number || 1} ${time.unit || 'action'}`;
  return String(time);
}

function formatRange(range: any): string {
  if (!range) return '—';
  if (typeof range === 'object') {
    if (range.distance) return typeof range.distance === 'object' ? `${range.distance.amount || '?'} ${range.distance.type || 'ft'}` : String(range.distance);
    return range.short && range.long ? `${range.short}/${range.long} ft` : '—';
  }
  return String(range);
}

function formatComponents(comp: any): string {
  if (!comp) return '—';
  const parts: string[] = [];
  if (comp.v) parts.push('V');
  if (comp.s) parts.push('S');
  if (comp.m) parts.push(`M (${comp.m})`);
  return parts.join(', ') || '—';
}

function formatDuration(dur: any): string {
  if (!dur) return '—';
  if (Array.isArray(dur)) return dur.map((d: any) => {
    if (d.concentration) return `Concentration, up to ${d.duration?.amount || '?'} ${d.duration?.type || 'rounds'}`;
    return `${d.duration?.amount || '?'} ${d.duration?.type || 'rounds'}`;
  }).join(' or ');
  if (typeof dur === 'object') {
    if (dur.concentration) return `Concentration, up to ${dur.duration?.amount || '?'} ${dur.duration?.type || 'rounds'}`;
    const amt = dur.duration?.amount || dur.amount || '?';
    const type = dur.duration?.type || dur.type || 'rounds';
    return `${amt} ${type}`;
  }
  return String(dur);
}
