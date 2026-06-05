'use client';
import { getSchoolName, formatTime, formatRange, componentLabel, formatDuration, renderEntries } from '../utils/libraryHelpers';

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const panel: React.CSSProperties = { background: '#0c0e14', color: '#e8dcc8', padding: '30px', borderRadius: '8px', width: '520px', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #c9a84c' };
const nameStyle: React.CSSProperties = { color: '#c9a84c', margin: 0, fontSize: '1.2rem' };

export default function SpellDetail({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <h2 style={nameStyle}>{item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5a5248', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>×</button>
        </div>
        {item._classLabel && <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#8a7e6a', marginBottom: '4px' }}>{item._classLabel}</p>}
        <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#8a7e6a', marginBottom: '12px' }}>
          {item.level === 0 ? 'Cantrip' : `${item.level}${item.level === 1 ? 'st' : item.level === 2 ? 'nd' : item.level === 3 ? 'rd' : 'th'}-level`} {getSchoolName(item.school)} · {item.source}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', marginBottom: '12px', color: '#8a7e6a' }}>
          <span style={{ background: '#1a1714', padding: '4px 8px', borderRadius: '3px' }}><strong style={{ color: '#c9a84c' }}>Casting Time:</strong> {formatTime(item.time)}</span>
          <span style={{ background: '#1a1714', padding: '4px 8px', borderRadius: '3px' }}><strong style={{ color: '#c9a84c' }}>Range:</strong> {formatRange(item.range)}</span>
          <span style={{ background: '#1a1714', padding: '4px 8px', borderRadius: '3px' }}><strong style={{ color: '#c9a84c' }}>Components:</strong> {componentLabel(item.components)}</span>
          <span style={{ background: '#1a1714', padding: '4px 8px', borderRadius: '3px' }}><strong style={{ color: '#c9a84c' }}>Duration:</strong> {formatDuration(item.duration)}</span>
        </div>
        {item.entries?.length > 0 && <div style={{ margin: '12px 0', fontSize: '0.85rem', lineHeight: 1.6 }}>{renderEntries(item.entries)}</div>}
        {item.entriesHigherLevel?.length > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #3d3528', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '4px' }}>AT HIGHER LEVELS</div>
            {renderEntries(item.entriesHigherLevel)}
          </div>
        )}
        {item.classes && <p style={{ margin: '8px 0', fontSize: '0.75rem', color: '#5a5248' }}><strong style={{ color: '#8a7e6a' }}>Classes:</strong> {Array.isArray(item.classes) ? item.classes.join(', ') : item.classes}</p>}
        <hr style={{ borderColor: '#3d3528' }} />
        <button onClick={onClose} style={{ width: '100%', padding: '10px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '12px' }}>CLOSE</button>
      </div>
    </div>
  );
}
