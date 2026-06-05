'use client';
import { useState, useEffect } from 'react';
import { CAMPAIGN_PANTHEONS, getDeitiesInPantheon, CustomDeity } from '../utils/campaignEngine';
import { DataEngine } from '../utils/dataLoader';

const SELECT_STYLE: React.CSSProperties = {
  padding: '8px 10px', background: '#0c0e14', border: '1px solid #3d3528',
  color: '#e8dcc8', borderRadius: '4px', fontSize: '0.85rem', width: '100%',
  cursor: 'pointer',
};
const SECTION_HEADER: React.CSSProperties = {
  fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px',
};
const INPUT: React.CSSProperties = {
  padding: '6px 10px', background: '#0c0e14', border: '1px solid #3d3528',
  color: '#e8dcc8', borderRadius: '4px', fontSize: '0.78rem', width: '100%',
  boxSizing: 'border-box',
};
const BTN: React.CSSProperties = {
  padding: '6px 14px', background: '#c9a84c', border: 'none',
  color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
  fontSize: '0.78rem',
};
const BTN_GHOST: React.CSSProperties = {
  padding: '4px 10px', background: 'transparent', border: '1px solid #3d3528',
  color: '#c9a84c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem',
};

interface PantheonConfigProps {
  pantheonSetting: string;
  customDeities: CustomDeity[];
  onChange: (setting: string, customs: CustomDeity[]) => void;
}

export default function PantheonConfig({ pantheonSetting, customDeities, onChange }: PantheonConfigProps) {
  const [allDeities, setAllDeities] = useState<any[]>([]);
  const [newDeity, setNewDeity] = useState<CustomDeity>({ name: '', domains: '', alignment: '', symbol: '', description: '' });
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [detailDeity, setDetailDeity] = useState<any | null>(null);

  useEffect(() => {
    DataEngine.getDeities().then(setAllDeities);
  }, []);

  // Deduplicate full list by name for the browser
  const uniqueDeities = allDeities.filter((d: any, i: number, arr: any[]) =>
    i === arr.findIndex((x: any) => x.name.toLowerCase() === d.name.toLowerCase())
  );

  const preset = CAMPAIGN_PANTHEONS.find(p => p.id === pantheonSetting);
  const filteredDeities = preset && preset.pantheons.length > 0
    ? getDeitiesInPantheon(preset.pantheons, allDeities)
    : [];

  // Deduplicate across preset + custom to avoid double-counting
  const customNameSet = new Set(customDeities.map((d) => d.name.toLowerCase()));
  const presetDeduped = filteredDeities.filter((d: any) => !customNameSet.has(d.name.toLowerCase()));

  const addCustom = () => {
    if (!newDeity.name.trim()) return;
    onChange(pantheonSetting, [...customDeities, { ...newDeity, name: newDeity.name.trim() }]);
    setNewDeity({ name: '', domains: '', alignment: '', symbol: '', description: '' });
  };

  const addDeityFromSource = (d: any) => {
    const name = d.name;
    if (customNameSet.has(name.toLowerCase())) return;
    const domains = Array.isArray(d.domains) ? d.domains.join(', ') : (d.domains || '');
    const alignment = Array.isArray(d.alignment) ? d.alignment.join('/') : (d.alignment || '');
    onChange(pantheonSetting, [...customDeities, { name, domains, alignment, symbol: d.symbol || '', description: d.province || '' }]);
  };

  const removeCustom = (index: number) => {
    onChange(pantheonSetting, customDeities.filter((_, i) => i !== index));
  };

  const browseResults = browseSearch.trim()
    ? uniqueDeities
        .filter((d: any) => d.name.toLowerCase().includes(browseSearch.toLowerCase()))
        .slice(0, 50)
    : [];

  const renderEntries = (entries: any[]) => {
    return entries.map((entry: any, i: number) => {
      if (typeof entry === 'string') {
        return <p key={i} style={{ margin: '0 0 10px', fontSize: '0.82rem', lineHeight: '1.6', color: '#cbd5e0' }}>{entry}</p>;
      }
      if (entry.type === 'section' && entry.name) {
        return (
          <div key={i} style={{ marginTop: '16px' }}>
            <h3 style={{ color: '#c9a84c', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{entry.name}</h3>
            {renderEntries(entry.entries || [])}
          </div>
        );
      }
      if (entry.type === 'list' && entry.items) {
        return (
          <ul key={i} style={{ margin: '0 0 10px', paddingLeft: '20px', color: '#cbd5e0', fontSize: '0.82rem', lineHeight: '1.6' }}>
            {entry.items.map((item: any, j: number) => (
              <li key={j}>{typeof item === 'string' ? item : item.type === 'item' ? item.name || item.text : JSON.stringify(item)}</li>
            ))}
          </ul>
        );
      }
      if (entry.type === 'quote' && entry.entries) {
        return (
          <blockquote key={i} style={{ borderLeft: '3px solid #c9a84c', margin: '0 0 10px', padding: '4px 12px', color: '#a0aec0', fontSize: '0.82rem', fontStyle: 'italic' }}>
            {renderEntries(entry.entries)}
            {entry.by && <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#5a5248' }}>— {entry.by}</div>}
          </blockquote>
        );
      }
      if (entry.type === 'table' && entry.rows) {
        return (
          <div key={i} style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              {entry.caption && <caption style={{ color: '#c9a84c', fontWeight: 600, marginBottom: '4px', textAlign: 'left' }}>{entry.caption}</caption>}
              <tbody>
                {entry.rows.map((row: any[], j: number) => (
                  <tr key={j} style={{ borderBottom: '1px solid #2d3748' }}>
                    {row.map((cell: any, k: number) => (
                      <td key={k} style={{ padding: '4px 8px', color: '#cbd5e0' }}>{typeof cell === 'string' ? cell : ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return null;
    });
  };

  const sourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      PHB: 'PHB\u201924', MTF: 'MToF', VGM: 'VGM', SCAG: 'SCAG', GGR: 'GGR',
      MOT: 'MOoT', AI: 'AI', OGA: 'OGA', EGW: 'EGW', IDRF: 'IDRF',
      TTP: 'TTP', BMT: 'BMT', 'GH:CG': 'GH:CG\u201924',
    };
    return labels[source] || source;
  };

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={SECTION_HEADER}>Pantheon Setting</div>
        <p style={{ margin: '2px 0 6px', fontSize: '0.75rem', color: '#5a5248' }}>
          Choose a campaign setting to auto-populate its deities, or select Homebrew for a blank slate.
        </p>
        <select
          value={pantheonSetting}
          onChange={(e) => onChange(e.target.value, customDeities)}
          style={SELECT_STYLE}
        >
          <option value="">— Select a pantheon —</option>
          {CAMPAIGN_PANTHEONS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {preset && preset.description && (
          <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#5a5248', fontStyle: 'italic' }}>{preset.description}</p>
        )}
      </div>

      {pantheonSetting && (
        <div style={{ background: '#0c0e14', borderRadius: '6px', padding: '12px', border: '1px solid #3d3528' }}>
          <div style={SECTION_HEADER}>
            Deities ({presetDeduped.length + customDeities.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {presetDeduped.length === 0 && customDeities.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: '#5a5248', margin: 0 }}>No deities yet. Add custom deities below, or select a setting above.</p>
            )}
            {presetDeduped.map((d: any, i: number) => (
              <div key={`${d.name}-${d.pantheon}-${i}`} style={{
                padding: '8px 10px', background: '#12141a', borderRadius: '4px',
                border: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer',
              }} onClick={() => setDetailDeity(d)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#c9a84c' }}>{d.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#5a5248', marginTop: '2px' }}>
                    {d.domains?.join(', ') || ''}{d.alignment ? ` — ${d.alignment.join('/')}` : ''}
                  </div>
                  {d.symbol && <div style={{ fontSize: '0.65rem', color: '#3d3528', marginTop: '1px' }}>Symbol: {d.symbol}</div>}
                </div>
                <span style={{ fontSize: '0.6rem', color: '#5a5248', whiteSpace: 'nowrap', padding: '2px 6px', background: '#0c0e14', borderRadius: '3px' }}>
                  {d.pantheon}
                </span>
              </div>
            ))}
            {customDeities.map((d, i) => (
              <div key={`custom-${i}`} style={{
                padding: '8px 10px', background: '#12141a', borderRadius: '4px',
                border: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#68d391' }}>{d.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#5a5248', marginTop: '2px' }}>
                    {d.domains}{d.alignment ? ` — ${d.alignment}` : ''}
                  </div>
                  {d.symbol && <div style={{ fontSize: '0.65rem', color: '#3d3528', marginTop: '1px' }}>Symbol: {d.symbol}</div>}
                  {d.description && <div style={{ fontSize: '0.7rem', color: '#5a5248', marginTop: '2px' }}>{d.description}</div>}
                </div>
                <button onClick={() => removeCustom(i)} style={{ ...BTN_GHOST, padding: '2px 6px', color: '#e53e3e', borderColor: '#e53e3e', fontSize: '0.65rem' }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pantheonSetting && (
        <div style={{ marginTop: '12px' }}>
          <button onClick={() => setBrowseOpen(!browseOpen)} style={{ ...BTN_GHOST, width: '100%', textAlign: 'center' }}>
            {browseOpen ? '▼ Hide Deity Browser' : '▶ Browse All Deities'}
          </button>
          {browseOpen && (
            <div style={{ marginTop: '8px' }}>
              <input
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                placeholder="Search deities by name..."
                style={INPUT}
                autoFocus
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                {(browseSearch.trim() ? browseResults : uniqueDeities.slice(0, 100)).length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: '#5a5248', margin: 0 }}>No matching deities.</p>
                ) : (
                  (browseSearch.trim() ? browseResults : uniqueDeities.slice(0, 100)).map((d: any, i: number) => {
                    const alreadyAdded = customNameSet.has(d.name.toLowerCase());
                    return (
                      <div key={`browse-${i}`} style={{
                        padding: '6px 8px', background: '#12141a', borderRadius: '4px',
                        border: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDetailDeity(d)}>
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#e8dcc8' }}>{d.name}</div>
                          <div style={{ fontSize: '0.6rem', color: '#5a5248', marginTop: '1px' }}>
                            {d.pantheon}{d.domains?.length ? ` · ${d.domains.slice(0, 2).join(', ')}` : ''}
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <span style={{ color: '#68d391', fontSize: '0.7rem', padding: '2px 8px', whiteSpace: 'nowrap' }}>✓ Added</span>
                        ) : (
                          <button onClick={() => addDeityFromSource(d)} style={{ ...BTN, padding: '3px 10px', fontSize: '0.7rem' }}>+ Add</button>
                        )}
                      </div>
                    );
                  })
                )}
                {!browseSearch.trim() && uniqueDeities.length > 100 && (
                  <p style={{ fontSize: '0.65rem', color: '#5a5248', margin: '4px 0 0', textAlign: 'center' }}>
                    Showing first 100 — type to search for more specific results
                  </p>
                )}
                {browseSearch.trim() && browseResults.length >= 50 && (
                  <p style={{ fontSize: '0.65rem', color: '#5a5248', margin: '4px 0 0', textAlign: 'center' }}>
                    Refine your search for more specific results
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <div style={SECTION_HEADER}>Add Custom Deity</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
          <input value={newDeity.name} onChange={(e) => setNewDeity({ ...newDeity, name: e.target.value })} placeholder="Deity name" style={INPUT} />
          <input value={newDeity.domains} onChange={(e) => setNewDeity({ ...newDeity, domains: e.target.value })} placeholder="Domains (e.g. War, Life)" style={INPUT} />
          <input value={newDeity.alignment} onChange={(e) => setNewDeity({ ...newDeity, alignment: e.target.value })} placeholder="Alignment (e.g. LG)" style={INPUT} />
          <input value={newDeity.symbol} onChange={(e) => setNewDeity({ ...newDeity, symbol: e.target.value })} placeholder="Symbol" style={INPUT} />
        </div>
        <textarea
          value={newDeity.description}
          onChange={(e) => setNewDeity({ ...newDeity, description: e.target.value })}
          placeholder="Description (optional)"
          rows={2}
          style={{ ...INPUT, marginTop: '6px', resize: 'vertical' }}
        />
        <button onClick={addCustom} disabled={!newDeity.name.trim()} style={{ ...BTN, marginTop: '6px', opacity: newDeity.name.trim() ? 1 : 0.5 }}>+ Add Deity</button>
      </div>

      {/* Deity Detail Modal */}
      {detailDeity && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setDetailDeity(null)}>
          <div style={{
            background: '#1a1714', border: '1px solid #3d3528', borderRadius: '12px',
            width: '90%', maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto',
            padding: '0', position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => setDetailDeity(null)} style={{
              position: 'absolute', top: '12px', right: '12px', zIndex: 10,
              background: 'transparent', border: 'none', color: '#5a5248', fontSize: '1.4rem',
              cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
            }}>×</button>

            {/* Header */}
            <div style={{
              background: 'linear-gradient(180deg, #0c0e14 0%, #1a1714 100%)',
              borderBottom: '1px solid #3d3528', padding: '24px 24px 16px',
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e8dcc8', fontFamily: 'serif' }}>
                {detailDeity.name}
                {detailDeity.title ? <span style={{ color: '#8a7e6a', fontWeight: 400, fontSize: '1rem' }}>, {detailDeity.title}</span> : ''}
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#5a5248', marginTop: '4px' }}>
                {sourceLabel(detailDeity.source)}{detailDeity.page ? `, p${detailDeity.page}` : ''}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 24px 24px' }}>
              {/* Info block */}
              <div style={{
                background: '#12141a', border: '1px solid #2a2a2a', borderRadius: '8px',
                padding: '12px 16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                {detailDeity.category && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                    <span style={{ color: '#8a7e6a' }}>Category: </span>{detailDeity.category}
                  </div>
                )}
                {detailDeity.domains && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                    <span style={{ color: '#8a7e6a' }}>Domains: </span>
                    {Array.isArray(detailDeity.domains) ? detailDeity.domains.join(', ') : detailDeity.domains}
                  </div>
                )}
                {detailDeity.pantheon && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                    <span style={{ color: '#8a7e6a' }}>Pantheon: </span>{detailDeity.pantheon}
                  </div>
                )}
                {detailDeity.alignment && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                    <span style={{ color: '#8a7e6a' }}>Alignment: </span>
                    {Array.isArray(detailDeity.alignment) ? detailDeity.alignment.join('/') : detailDeity.alignment}
                  </div>
                )}
                {detailDeity.symbol && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                    <span style={{ color: '#8a7e6a' }}>Symbol: </span>{detailDeity.symbol}
                  </div>
                )}
              </div>

              {/* Entries */}
              {detailDeity.entries && detailDeity.entries.length > 0 ? (
                <div style={{ color: '#cbd5e0' }}>
                  {renderEntries(detailDeity.entries)}
                </div>
              ) : detailDeity.province ? (
                <p style={{ fontSize: '0.85rem', color: '#cbd5e0', lineHeight: '1.6', margin: 0 }}>{detailDeity.province}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
