'use client';
import { ABILITY_KEYS, ABILITY_LABELS, getTypeLabel, formatCR, formatSpeed, formatAC, renderEntries } from '../utils/libraryHelpers';
import { formatEntries, cleanString } from '../utils/formatters';

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const panel: React.CSSProperties = { background: '#0c0e14', color: '#e8dcc8', padding: '30px', borderRadius: '8px', width: '540px', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #c9a84c' };
const nameStyle: React.CSSProperties = { color: '#c9a84c', margin: 0, fontSize: '1.2rem' };

export default function MonsterDetail({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <h2 style={nameStyle}>{item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5a5248', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>×</button>
        </div>
        <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#8a7e6a', marginBottom: '12px' }}>
          {item.size?.[0] || ''} {getTypeLabel(item)}{item.alignment ? `, ${Array.isArray(item.alignment) ? item.alignment.join(' ') : item.alignment}` : ''}
        </p>
        <div style={{ border: '1px solid #c9a84c', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
          <p style={{ margin: '2px 0' }}><strong>Armor Class:</strong> {formatAC(item.ac)}</p>
          <p style={{ margin: '2px 0' }}><strong>Hit Points:</strong> {item.hp?.average || '—'}{item.hp?.formula ? ` (${item.hp.formula})` : ''}</p>
          <p style={{ margin: '2px 0' }}><strong>Speed:</strong> {formatSpeed(item.speed)}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '12px', textAlign: 'center' }}>
          {ABILITY_KEYS.map((key, idx) => {
            const val = item[key];
            const mod = val != null ? Math.floor((val - 10) / 2) : null;
            return (
              <div key={key} style={{ background: '#1a1714', padding: '6px 2px', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: '#c9a84c' }}>{ABILITY_LABELS[idx]}</div>
                <div style={{ fontSize: '1rem' }}>{val ?? '—'}</div>
                <div style={{ fontSize: '0.75rem', color: '#8a7e6a' }}>{mod != null ? `${mod >= 0 ? '+' : ''}${mod}` : '—'}</div>
              </div>
            );
          })}
        </div>
        {item.save && Object.keys(item.save).length > 0 && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Saving Throws:</strong> {Object.entries(item.save).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')}</p>}
        {item.skill && Object.keys(item.skill).length > 0 && <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Skills:</strong> {Object.entries(item.skill).map(([k, v]) => `${k} ${v}`).join(', ')}</p>}
        {[['resist', 'Damage Resistances'], ['immune', 'Damage Immunities'], ['vuln', 'Damage Vulnerabilities'], ['conditionImmune', 'Condition Immunities']].map(([key, label]) => {
          const val = item[key]; if (!val?.length) return null;
          return <p key={key} style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{label}:</strong> {Array.isArray(val) ? val.join(', ') : typeof val === 'string' ? val : ''}</p>;
        })}
        <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
          <strong>Senses:</strong> {(() => { const sen = item.senses; const parts: string[] = []; if (typeof sen === 'string') parts.push(sen); else if (typeof sen === 'object') Object.entries(sen).forEach(([k, v]) => parts.push(`${k} ${v}`)); if (item.passive) parts.push(`Passive Perception ${item.passive}`); return parts.join(', ') || '—'; })()}
        </p>
        <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Languages:</strong> {typeof item.languages === 'string' ? item.languages : Array.isArray(item.languages) ? item.languages.join(', ') : '—'}</p>
        <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>CR:</strong> {formatCR(item.cr)}</p>
        {item.trait?.length > 0 && <><hr style={{ borderColor: '#3d3528' }} /><div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '8px' }}>TRAITS</div>{item.trait.map((t: any, i: number) => (<div key={`trait-${i}`} style={{ margin: '8px 0' }}><strong style={{ color: '#c9a84c' }}>{cleanString(t.name)}.</strong><div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(t.entries)}</div></div>))}</>}
        {item.action?.length > 0 && <><hr style={{ borderColor: '#3d3528' }} /><div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '8px' }}>ACTIONS</div>{item.action.map((a: any, i: number) => (<div key={`action-${i}`} style={{ margin: '8px 0' }}><strong style={{ color: '#c9a84c' }}>{cleanString(a.name)}.</strong><div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(a.entries)}</div></div>))}</>}
        {item.reaction?.length > 0 && <><hr style={{ borderColor: '#3d3528' }} /><div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '8px' }}>REACTIONS</div>{item.reaction.map((r: any, i: number) => (<div key={`reaction-${i}`} style={{ margin: '8px 0' }}><strong style={{ color: '#c9a84c' }}>{cleanString(r.name)}.</strong><div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(r.entries)}</div></div>))}</>}
        {item.legendary?.length > 0 && <><hr style={{ borderColor: '#3d3528' }} /><div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '8px' }}>LEGENDARY ACTIONS</div>{item.legendary.map((l: any, i: number) => (<div key={`legendary-${i}`} style={{ margin: '8px 0' }}><strong style={{ color: '#c9a84c' }}>{cleanString(l.name)}.</strong><div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(l.entries)}</div></div>))}</>}
        <hr style={{ borderColor: '#3d3528' }} />
        <button onClick={onClose} style={{ width: '100%', padding: '10px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '12px' }}>CLOSE</button>
      </div>
    </div>
  );
}
