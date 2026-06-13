'use client';
// =============================================================================
// 📘 FILE: components/RaceDetail.tsx
// =============================================================================
// 🎯 PURPOSE: A modal overlay displaying race details: size, source, speed,
//    ability bonuses, description/entries, and language proficiencies. Used in
//    the Library race browser.
//
// 🧠 REACT CONCEPT: Inline Modal (same pattern as other *Detail components)
//    Fixed overlay + centered panel with stopPropagation on the inner div.
//    This consistent pattern appears in BackgroundDetail, ItemDetail,
//    MonsterDetail, SpellDetail, and RaceDetail — demonstrating component
//    consistency in a codebase.
// =============================================================================
import { formatSpeed, renderEntries } from '../utils/libraryHelpers';

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const panel: React.CSSProperties = { background: '#0c0e14', color: '#e8dcc8', padding: '30px', borderRadius: '8px', width: '480px', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #c9a84c' };
const nameStyle: React.CSSProperties = { color: '#c9a84c', margin: 0, fontSize: '1.2rem' };

export default function RaceDetail({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <h2 style={nameStyle}>{item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5a5248', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>×</button>
        </div>
        <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#8a7e6a', marginBottom: '12px' }}>{item.size?.[0] || '—'} · {item.source}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', marginBottom: '12px' }}>
          <span><strong>Speed:</strong> {formatSpeed(item.speed)}</span>
          {item.ability && <span><strong>Ability Bonuses:</strong> {Array.isArray(item.ability) ? item.ability.map((a: any) => Object.entries(a).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ')).join('; ') : '—'}</span>}
        </div>
        {(item.description?.length > 0 || item.entries?.length > 0) && <div style={{ margin: '12px 0', fontSize: '0.85rem', lineHeight: 1.6 }}>{renderEntries(item.description || item.entries)}</div>}
        {item.languageProficiencies && <p style={{ margin: '8px 0', fontSize: '0.75rem', color: '#5a5248' }}><strong>Languages:</strong> {Array.isArray(item.languageProficiencies) ? item.languageProficiencies.map((l: any) => typeof l === 'string' ? l : Object.keys(l)[0] || '').filter(Boolean).join(', ') : '—'}</p>}
        <hr style={{ borderColor: '#3d3528' }} />
        <button onClick={onClose} style={{ width: '100%', padding: '10px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '12px' }}>CLOSE</button>
      </div>
    </div>
  );
}
