'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataEngine } from '../../../utils/dataLoader';
import { formatEntries, cleanString } from '../../../utils/formatters';
import { rollD20, parseMonsterDamageTypes } from '../../../utils/rollEngine';
import { rollActionSimple } from '../../../utils/actionRoller';

type CRFilter = string | 'all';
type TypeFilter = string | 'all';

let bestiaryIndex: Record<string, string> | null = null;

async function loadSource(sourceFile: string): Promise<any[]> {
  try {
    const data = await DataEngine.loadLocalJson(`data/bestiary/${sourceFile}`);
    return data?.monster || [];
  } catch { return []; }
}

// Book source IDs that map to data/book/book-{id}.json
const BOOK_SOURCES: Record<string, { file: string; sourceKey: string }> = {
  GHPG: { file: 'data/book/book-ghpg.json', sourceKey: 'GHPG' },
  GrimHollowMG24: { file: 'data/book/book-ghmg.json', sourceKey: 'GrimHollowMG24' },
  GrimHollowCG24: { file: 'data/book/book-ghcg.json', sourceKey: 'GrimHollowCG24' },
};

async function loadBookMonsters(sourceKey: string): Promise<any[]> {
  const info = BOOK_SOURCES[sourceKey];
  if (!info) return [];
  try {
    const data = await DataEngine.loadLocalJson(info.file);
    return (data?.monster || []).map((m: any) => ({ ...m, source: m.source || sourceKey }));
  } catch { return []; }
}

async function getIndex(): Promise<Record<string, string>> {
  if (!bestiaryIndex) {
    const data = await DataEngine.loadLocalJson('data/bestiary/index.json');
    bestiaryIndex = data || {};
  }
  return bestiaryIndex!;
}

const SOURCE_LABELS: Record<string, string> = {
  MM: 'Monster Manual',
  XMM: '2024 Monster Manual',
  MPMM: 'Mordenkainen Presents',
  XPHB: '2024 PHB',
  PHB: 'Player\'s Handbook',
  VGM: 'Volo\'s Guide',
  MTF: 'Mordenkainen\'s Tome',
  FTD: 'Fizban\'s Treasury',
  BGG: 'Bigby Presents',
  BMT: 'Book of Many Things',
  EGW: 'Explorer\'s Guide',
  ERLW: 'Eberron',
  CoS: 'Curse of Strahd',
  TCE: 'Tasha\'s Cauldron',
  GHPG: 'Grim Hollow: Player\'s Guide',
  GrimHollowMG24: 'Grim Hollow: Monster Grimoire',
  GrimHollowCG24: 'Grim Hollow: Campaign Guide',
};

function getTypeLabel(monster: any): string {
  const t = monster.type;
  if (typeof t === 'string') return t;
  if (!t) return 'unknown';
  const typeVal = t.type;
  if (typeof typeVal === 'string') return typeVal;
  if (typeVal && typeof typeVal === 'object' && typeVal.choose) {
    return typeVal.choose[0] || 'unknown';
  }
  return 'unknown';
}

function formatCR(cr: any): string {
  if (typeof cr === 'string') return cr;
  if (cr?.cr) return cr.cr;
  return '—';
}

function crToNumber(cr: string): number {
  if (!cr || cr === '—') return 999;
  if (cr === '1/8') return 0.125;
  if (cr === '1/4') return 0.25;
  if (cr === '1/2') return 0.5;
  return parseInt(cr) || 999;
}

function formatSpeed(speed: any): string {
  if (!speed) return '—';
  if (typeof speed === 'string') return speed;
  const parts: string[] = [];
  Object.entries(speed).forEach(([k, v]) => {
    if (k === 'choose' && typeof v === 'object' && v) {
      const vObj = v as { from?: string[]; amount?: number };
      const from = Array.isArray(vObj.from) ? vObj.from.join(' or ') : '';
      parts.push(`${from} ${vObj.amount || ''}`.trim());
    } else {
      parts.push(`${k} ${v}`);
    }
  });
  return parts.join(', ');
}

function formatAC(ac: any): string {
  if (!ac || !ac[0]) return '—';
  const first = ac[0];
  const val = typeof first === 'number' ? first : (first.ac ?? first.value);
  if (val === undefined) return '—';
  return first.from ? `${val} (${first.from.join(', ')})` : `${val}`;
}

export default function MonsterManagerPage() {
  const router = useRouter();
  const [monsters, setMonsters] = useState<any[]>([]);
  const [loadedSources, setLoadedSources] = useState<Record<string, boolean>>({});
  const [availableSources, setAvailableSources] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [crFilter, setCrFilter] = useState<CRFilter>('all');
  const [selectedMonster, setSelectedMonster] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [rollResult, setRollResult] = useState<string | null>(null);

  // Load index and default sources
  useEffect(() => {
    const init = async () => {
      const idx = await getIndex();
      setAvailableSources(idx);
      // Auto-load MM and XMM
      const sourcesToLoad = ['MM', 'XMM'].filter(s => idx[s]);
      let all: any[] = [];
      for (const src of sourcesToLoad) {
        const m = await loadSource(idx[src]);
        all = [...all, ...m.map((mon: any) => ({ ...mon, _source: src }))];
        setLoadedSources(prev => ({ ...prev, [src]: true }));
      }
      // Auto-load Grim Hollow Monster Grimoire
      const ghmgMonsters = await loadBookMonsters('GrimHollowMG24');
      all = [...all, ...ghmgMonsters];
      setLoadedSources(prev => ({ ...prev, GrimHollowMG24: true }));
      setMonsters(all);
      setLoading(false);
    };
    init();
  }, []);

  const addSource = async (src: string) => {
    if (loadedSources[src]) return;
    let m: any[];
    if (BOOK_SOURCES[src]) {
      m = await loadBookMonsters(src);
    } else if (availableSources[src]) {
      m = await loadSource(availableSources[src]);
    } else {
      return;
    }
    const tagged = m.map((mon: any) => ({ ...mon, _source: src }));
    setMonsters(prev => [...prev, ...tagged]);
    setLoadedSources(prev => ({ ...prev, [src]: true }));
  };

  const filtered = monsters.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && getTypeLabel(m) !== typeFilter) return false;
    if (crFilter !== 'all') {
      const mCR = formatCR(m.cr);
      if (crFilter === '1') {
        if (!['1', '1/2', '1/4', '1/8'].includes(mCR)) return false;
      } else if (crFilter.startsWith('>')) {
        const min = parseInt(crFilter.slice(1));
        if (crToNumber(mCR) <= min) return false;
      } else if (crFilter.startsWith('<')) {
        const max = parseInt(crFilter.slice(1));
        if (crToNumber(mCR) >= max) return false;
      } else if (mCR !== crFilter) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const toggleSelect = (name: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const pushToCombat = (names: string[]) => {
    const combatants = names.map(name => {
      const mon = monsters.find(m => m.name === name);
      if (!mon) return null;
      const dexMod = Math.floor(((mon.dex || 10) - 10) / 2);
      const init = rollD20(dexMod, `${mon.name} initiative`, 'combat').total;
      const dmgTypes = parseMonsterDamageTypes(mon);
      return {
        id: Date.now() + Math.random(),
        name: mon.name,
        initiative: init,
        currentHp: mon.hp?.average || 10,
        maxHp: mon.hp?.average || 10,
        ac: typeof mon.ac?.[0] === 'number' ? mon.ac[0] : mon.ac?.[0]?.ac || 10,
        conditions: [],
        concentratingOn: null,
        ...dmgTypes,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);

    const existing = sessionStorage.getItem('pendingEncounter');
    const existingList = existing ? JSON.parse(existing) : [];
    const enc = existingList.combatants || [];
    sessionStorage.setItem('pendingEncounter', JSON.stringify({
      ...(typeof existing === 'string' ? JSON.parse(existing) : {}),
      combatants: [...enc, ...combatants],
      initiativeMode: 'auto',
    }));
    router.push('/combat');
  };

  const types = [...new Set(monsters.map(getTypeLabel))].sort();
  const crOptions = ['1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '30'];

  return (
    <div style={{ padding: '2rem', color: '#e8dcc8' }}>
      <Link href="/dm" style={{ color: '#8a7e6a' }}>← DM Hub</Link>
      <h1 style={{ color: '#c9a84c', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif' }}>NPC & Monster Manager</h1>

      {/* Source toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', color: '#8a7e6a', marginBottom: '6px' }}>Loaded Sources:</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(availableSources).filter(([src]) => ['MM', 'XMM', 'MPMM', 'PHB', 'XPHB', 'VGM', 'MTF', 'FTD', 'BGG', 'BMT', 'EGW', 'ERLW', 'CoS', 'TCE', 'GHPG', 'GrimHollowMG24', 'GrimHollowCG24'].includes(src)).map(([src]) => (
            <button key={src} onClick={() => addSource(src)} disabled={loadedSources[src]}
              style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', fontSize: '0.75rem', cursor: loadedSources[src] ? 'default' : 'pointer', background: loadedSources[src] ? '#16a34a' : '#3d3528', color: '#e8dcc8', opacity: loadedSources[src] ? 1 : 0.7 }}>
              {SOURCE_LABELS[src] || src}
            </button>
          ))}
        </div>
      </div>

      {/* Search & filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search monsters..."
          style={{ padding: '8px 12px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '4px', width: '260px', fontSize: '0.85rem' }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '4px', fontSize: '0.85rem' }}>
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={crFilter} onChange={e => setCrFilter(e.target.value)}
          style={{ padding: '8px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '4px', fontSize: '0.85rem' }}>
          <option value="all">All CRs</option>
          <option value="0">CR 0</option>
          <option value="1/8">CR 1/8</option>
          <option value="1/4">CR 1/4</option>
          <option value="1/2">CR 1/2</option>
          {crOptions.filter(c => !c.includes('/')).map(c => <option key={c} value={c}>CR {c}</option>)}
          <option value=">10">CR &gt; 10</option>
          <option value=">15">CR &gt; 15</option>
          <option value=">20">CR &gt; 20</option>
        </select>
        <span style={{ fontSize: '0.8rem', color: '#5a5248' }}>{filtered.length} monsters</span>
      </div>

      {/* Action buttons */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => pushToCombat([...selectedIds])} disabled={selectedIds.size === 0}
            style={{ padding: '8px 20px', background: selectedIds.size === 0 ? '#3d3528' : '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem', opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
            Push Selected ({selectedIds.size}) to Combat
          </button>
          <button onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #3d3528', color: '#8a7e6a', borderRadius: '4px', cursor: selectedIds.size === 0 ? 'default' : 'pointer', fontSize: '0.8rem' }}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Monster list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#5a5248' }}>Loading bestiary...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.map(m => {
            const isSelected = selectedIds.has(m.name);
            return (
              <div key={`${m._source}-${m.name}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', background: isSelected ? '#0c0e14' : '#0c0e14',
                borderRadius: '6px', border: `1px solid ${isSelected ? '#16a34a' : '#1a1714'}`,
                cursor: 'pointer', transition: 'border-color 0.1s',
              }}
                onClick={() => setSelectedMonster(m)}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#3d3528'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#1a1714'; }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(m.name)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#c9a84c', minWidth: '160px' }}>{m.name}</span>
                  <span style={{ color: '#5a5248', fontSize: '0.75rem' }}>{m._source}</span>
                  <span style={{ color: '#8a7e6a', fontSize: '0.75rem' }}>{getTypeLabel(m)}</span>
                  <span style={{ color: '#c9a84c', fontSize: '0.75rem' }}>CR {formatCR(m.cr)}</span>
                  <span style={{ color: '#8a7e6a' }}>AC {formatAC(m.ac)}</span>
                  <span style={{ color: '#16a34a' }}>HP {m.hp?.average || '—'}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#5a5248' }}>No monsters match your filters.</div>
          )}
        </div>
      )}

      {/* Statblock modal */}
      {selectedMonster && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0c0e14', color: '#e8dcc8', padding: '30px', borderRadius: '8px', width: '520px', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #c9a84c' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <h2 style={{ color: '#c9a84c', margin: 0 }}>{selectedMonster.name}</h2>
              <button onClick={() => setSelectedMonster(null)}
                style={{ background: 'none', border: 'none', color: '#5a5248', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}>×</button>
            </div>
            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#8a7e6a', marginBottom: '12px' }}>
              {selectedMonster.size?.[0] || ''} {getTypeLabel(selectedMonster)}{selectedMonster.alignment ? `, ${Array.isArray(selectedMonster.alignment) ? selectedMonster.alignment.join(' ') : selectedMonster.alignment}` : ''}
            </p>

            {/* Core stats block */}
            <div style={{ border: '1px solid #c9a84c', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ margin: '2px 0' }}><strong>Armor Class:</strong> {formatAC(selectedMonster.ac)}</p>
              <p style={{ margin: '2px 0' }}><strong>Hit Points:</strong> {selectedMonster.hp?.average || '—'}{selectedMonster.hp?.formula ? ` (${selectedMonster.hp.formula})` : ''}</p>
              <p style={{ margin: '2px 0' }}><strong>Speed:</strong> {formatSpeed(selectedMonster.speed)}</p>
            </div>

            {/* Ability scores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '12px', textAlign: 'center' }}>
              {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(abbr => {
                const key = abbr.toLowerCase().slice(0, 3);
                const val = selectedMonster[key];
                const mod = val != null ? Math.floor((val - 10) / 2) : null;
                return (
                  <div key={abbr} style={{ background: '#1a1714', padding: '6px 2px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: '#c9a84c' }}>{abbr}</div>
                    <div style={{ fontSize: '1rem' }}>{val ?? '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8a7e6a' }}>{mod != null ? `${mod >= 0 ? '+' : ''}${mod}` : '—'}</div>
                  </div>
                );
              })}
            </div>

            {/* Saves & Skills */}
            {(() => {
              const s = selectedMonster.save;
              if (s && Object.keys(s).length > 0) {
                return <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Saving Throws:</strong> {Object.entries(s).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')}</p>;
              }
              return null;
            })()}
            {(() => {
              const s = selectedMonster.skill;
              if (s && Object.keys(s).length > 0) {
                return <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Skills:</strong> {Object.entries(s).map(([k, v]) => `${k} ${v}`).join(', ')}</p>;
              }
              return null;
            })()}

            {/* Resistances, Immunities, etc */}
            {[['resist', 'Resistances'], ['immune', 'Immunities'], ['vuln', 'Vulnerabilities'], ['conditionImmune', 'Condition Immunities']].map(([key, label]) => {
              const val = selectedMonster[key];
              if (!val?.length) return null;
              return <p key={key} style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{label}:</strong> {Array.isArray(val) ? val.join(', ') : typeof val === 'string' ? val : ''}</p>;
            })}

            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
              <strong>Senses:</strong> {(() => {
                const sen = selectedMonster.senses;
                const parts: string[] = [];
                if (typeof sen === 'string') parts.push(sen);
                else if (typeof sen === 'object') Object.entries(sen).forEach(([k, v]) => parts.push(`${k} ${v}`));
                if (selectedMonster.passive) parts.push(`Passive Perception ${selectedMonster.passive}`);
                return parts.join(', ') || '—';
              })()}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
              <strong>Languages:</strong> {typeof selectedMonster.languages === 'string' ? selectedMonster.languages : Array.isArray(selectedMonster.languages) ? selectedMonster.languages.join(', ') : '—'}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
              <strong>CR:</strong> {formatCR(selectedMonster.cr)} <span style={{ color: '#5a5248' }}>({selectedMonster._source})</span>
            </p>

            <hr style={{ borderColor: '#3d3528' }} />

            {/* Traits */}
            {selectedMonster.trait?.map((t: any, i: number) => (
              <div key={`trait-${i}`} style={{ margin: '10px 0' }}>
                <strong style={{ color: '#c9a84c' }}>{cleanString(t.name)}.</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(t.entries)}</div>
              </div>
            ))}

            {rollResult && (
              <div style={{ background: '#c9a84c', padding: '8px 12px', borderRadius: '4px', marginBottom: '10px', fontSize: '0.85rem', color: '#0c0e14' }}>
                {rollResult}
                <button onClick={() => setRollResult(null)} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
              </div>
            )}
            {/* Actions */}
            {selectedMonster.action?.map((a: any, i: number) => (
              <div key={`action-${i}`} style={{ margin: '10px 0' }}>
                <button onClick={() => {
                  const result = rollActionSimple(a);
                  setRollResult(`${a.name}: ${result.rollResult}`);
                }}                 style={{ marginRight: '10px', padding: '4px 10px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', float: 'right' }}>
                  Roll
                </button>
                <strong style={{ color: '#c9a84c' }}>{cleanString(a.name)}.</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(a.entries)}</div>
              </div>
            ))}

            {/* Reactions */}
            {selectedMonster.reaction?.map((r: any, i: number) => (
              <div key={`reaction-${i}`} style={{ margin: '10px 0' }}>
                <strong style={{ color: '#c9a84c' }}>{cleanString(r.name)}.</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(r.entries)}</div>
              </div>
            ))}

            {/* Legendary actions */}
            {selectedMonster.legendary?.map((l: any, i: number) => (
              <div key={`legendary-${i}`} style={{ margin: '10px 0' }}>
                <strong style={{ color: '#c9a84c' }}>{cleanString(l.name)}.</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>{formatEntries(l.entries)}</div>
              </div>
            ))}

            {/* Modal footer */}
            <hr style={{ borderColor: '#3d3528' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={() => { pushToCombat([selectedMonster.name]); setSelectedMonster(null); }}
                style={{ flex: 1, padding: '10px', background: '#16a34a', border: 'none', color: '#e8dcc8', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>
                Add to Combat
              </button>
              <button onClick={() => { setSelectedIds(prev => { const n = new Set(prev); n.add(selectedMonster.name); return n; }); setSelectedMonster(null); }}
                style={{ padding: '10px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


