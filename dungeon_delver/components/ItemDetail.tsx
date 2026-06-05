'use client';
import { renderEntries } from '../utils/libraryHelpers';

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const panel: React.CSSProperties = { background: '#0c0e14', color: '#e8dcc8', padding: '30px', borderRadius: '8px', width: '480px', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #c9a84c' };
const nameStyle: React.CSSProperties = { color: '#c9a84c', margin: 0, fontSize: '1.2rem' };

export default function ItemDetail({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h2 style={nameStyle}>{item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5a5248', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: '#8a7e6a', marginBottom: '12px' }}>
          {item.rarity && item.rarity !== 'none' && <span style={{ background: '#1a1714', padding: '2px 8px', borderRadius: '3px' }}>{item.rarity}</span>}
          {item.type && <span style={{ background: '#1a1714', padding: '2px 8px', borderRadius: '3px' }}>{item.type}</span>}
          {item.source && <span style={{ background: '#1a1714', padding: '2px 8px', borderRadius: '3px' }}>{item.source}</span>}
          {item.reqAttune && <span style={{ background: '#1a1714', padding: '2px 8px', borderRadius: '3px', color: '#c9a84c' }}>Requires Attunement {item.reqAttune}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: '#e8dcc8', marginBottom: '12px' }}>
          {item.value != null && <span><strong>Value:</strong> {(item.value / 100).toFixed(0)} gp</span>}
          {item.weight != null && <span><strong>Weight:</strong> {item.weight} lb.</span>}
          {item.ac && <span><strong>AC:</strong> {typeof item.ac === 'number' ? item.ac : item.ac.ac || '—'}</span>}
          {item.dmg1 && <span><strong>Damage:</strong> {item.dmg1} {item.dmgType || ''}</span>}
          {item.range && <span><strong>Range:</strong> {item.range}</span>}
        </div>
        {item.entries?.length > 0 && <div style={{ margin: '12px 0', fontSize: '0.85rem', lineHeight: 1.6 }}>{renderEntries(item.entries)}</div>}
        {item.additionalEntries?.length > 0 && <div style={{ margin: '12px 0', fontSize: '0.85rem', lineHeight: 1.6 }}>{renderEntries(item.additionalEntries)}</div>}
        <hr style={{ borderColor: '#3d3528' }} />
        <button onClick={onClose} style={{ width: '100%', padding: '10px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '12px' }}>CLOSE</button>
      </div>
    </div>
  );
}
