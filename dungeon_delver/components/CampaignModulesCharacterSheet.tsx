'use client';
import { useState, useEffect } from 'react';
import { Character, ModuleData } from '../lib/character';
import { getCampaigns, campaignKey, type CampaignEntry } from '../utils/campaignStorage';
import { useRole } from '../context/RoleContext';
import { loadCampaignConfig, CAMPAIGN_PANTHEONS, getDeitiesInPantheon, type CustomDeity } from '../utils/campaignEngine';
import { DataEngine } from '../utils/dataLoader';

const colors = {
  gold: '#f6e05e', textDim: '#718096', textMuted: '#a0aec0',
  textLight: '#cbd5e0', accent: '#6366f1', bgPanel: '#1a202c', border: '#4a5568',
};
const radii = { sm: '4px', md: '8px' };
const cardPanel: React.CSSProperties = {
  background: '#2d3748', borderRadius: radii.md, padding: '12px 16px',
  border: `1px solid ${colors.border}`,
};
const inputStyle: React.CSSProperties = {
  padding: '4px 6px', background: '#1a202c', border: `1px solid ${colors.border}`,
  color: 'white', borderRadius: radii.sm, fontSize: '0.75rem', width: 60,
};
const btnStyle: React.CSSProperties = {
  background: 'transparent', border: `1px solid ${colors.border}`,
  color: colors.textLight, padding: '2px 8px', borderRadius: radii.sm,
  fontSize: '0.7rem', cursor: 'pointer',
};

export function getActiveModules(char: Character): { enabledModules: string[]; moduleConfig: any } {
  const cid = char.campaignId || 'default';
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(campaignKey('campaign-config', cid)) : null;
    if (!raw) return { enabledModules: [], moduleConfig: {} };
    const config = JSON.parse(raw);
    return { enabledModules: config.enabledModules || [], moduleConfig: config.moduleConfig || {} };
  } catch { return { enabledModules: [], moduleConfig: {} }; }
}

function setModuleData<K extends keyof ModuleData>(char: Character, key: K, value: ModuleData[K]): Character {
  return { ...char, moduleData: { ...(char.moduleData || {}), [key]: value } };
}

export function CampaignSelector({ char, onCharChange }: { char: Character; onCharChange: (c: Character) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
  useEffect(() => { setCampaigns(getCampaigns()); }, []);
  const current = campaigns.find(c => c.id === char.campaignId);
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>CAMPAIGN</h4>
      <select
        value={char.campaignId || 'default'}
        onChange={(e) => {
          const id = e.target.value;
          const entry = id === 'default' ? null : campaigns.find(c => c.id === id);
          onCharChange({ ...char, campaignId: id, campaignName: entry ? entry.name : '' });
        }}
        style={{ width: '100%', background: '#1a202c', border: `1px solid ${colors.border}`, color: 'white', padding: '6px', borderRadius: radii.sm, fontSize: '0.75rem' }}>
        <option value="default">Default Campaign</option>
        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {current && <div style={{ fontSize: '0.65rem', color: colors.textDim, marginTop: 4 }}>Linked to: {current.name}</div>}
    </div>
  );
}

export function HonorSanityStats({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.honorSanity || { honor: 10, sanity: 10 };
  const mod = (s: number) => Math.floor((s - 10) / 2);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>HONOR & SANITY</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {[{ key: 'honor' as const, label: 'HONOR' }, { key: 'sanity' as const, label: 'SANITY' }].map(s => (
          <div key={s.key} style={{ background: 'rgba(45,55,72,0.3)', borderRadius: radii.sm, padding: '8px 10px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>{s.label}</div>
            <input type="number" min={3} max={18} value={data[s.key]}
              onChange={(e) => onCharChange(setModuleData(char, 'honorSanity', { ...data, [s.key]: +e.target.value }))}
              style={{ ...inputStyle, width: '100%', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginTop: 2 }} />
            <div style={{ fontSize: '0.8rem', color: '#f6e05e', fontWeight: 'bold' }}>{mod(data[s.key]) >= 0 ? '+' : ''}{mod(data[s.key])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PietySection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  const [allDeities, setAllDeities] = useState<any[]>([]);
  const [deityOptions, setDeityOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled || !char.campaignId) return;
    const cfg = loadCampaignConfig(char.campaignId);
    if (!cfg.pantheonSetting) return;
    const preset = CAMPAIGN_PANTHEONS.find(p => p.id === cfg.pantheonSetting);
    if (!preset || preset.pantheons.length === 0) return;
    DataEngine.getDeities().then(data => {
      const filtered = getDeitiesInPantheon(preset.pantheons, data);
      const names = filtered.map((d: any) => d.name);
      const customs = (cfg.customDeities || []).map((d: CustomDeity) => d.name);
      setDeityOptions([...new Set([...names, ...customs])].sort());
    });
  }, [enabled, char.campaignId]);
  if (!enabled) return null;
  const data = char.moduleData?.piety || { deity: '', score: 3 };
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>PIETY (MOoT)</h4>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Deity</span>
          {deityOptions.length > 0 ? (
            <select value={deityOptions.includes(data.deity) ? data.deity : '__other__'} onChange={(e) => onCharChange(setModuleData(char, 'piety', { ...data, deity: e.target.value === '__other__' ? '' : e.target.value }))}
              style={{ ...inputStyle, width: 170, display: 'block', marginTop: 2, cursor: 'pointer', padding: '4px 6px' }}>
              <option value="">— Select —</option>
              {deityOptions.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="__other__">Other (type below)</option>
            </select>
          ) : null}
          {(deityOptions.length === 0 || data.deity && !deityOptions.includes(data.deity)) && (
            <input value={data.deity} onChange={(e) => onCharChange(setModuleData(char, 'piety', { ...data, deity: e.target.value }))}
              style={{ ...inputStyle, width: 150, display: 'block', marginTop: 2 }} placeholder="Unknown" />
          )}
        </div>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Piety Score</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
            <button onClick={() => onCharChange(setModuleData(char, 'piety', { ...data, score: Math.max(0, data.score - 1) }))} style={btnStyle}>−</button>
            <span style={{ fontWeight: 'bold', minWidth: 30, textAlign: 'center' }}>{data.score}</span>
            <button onClick={() => onCharChange(setModuleData(char, 'piety', { ...data, score: Math.min(50, data.score + 1) }))} style={btnStyle}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RenownSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.renown || [];
  const add = () => onCharChange(setModuleData(char, 'renown', [...data, { factionName: '', score: 0 }]));
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>RENOWN (DMG/GGR)</h4>
      {data.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <input value={f.factionName} onChange={(e) => { const d = [...data]; d[i] = { ...f, factionName: e.target.value }; onCharChange(setModuleData(char, 'renown', d)); }}
            style={{ ...inputStyle, flex: 1 }} placeholder="Faction" />
          <input type="number" value={f.score} onChange={(e) => { const d = [...data]; d[i] = { ...f, score: +e.target.value }; onCharChange(setModuleData(char, 'renown', d)); }}
            style={{ ...inputStyle, width: 50 }} />
          <button onClick={() => onCharChange(setModuleData(char, 'renown', data.filter((_, j) => j !== i)))} style={{ ...btnStyle, border: '1px solid #e53e3e', color: '#e53e3e' }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ ...btnStyle, marginTop: 4 }}>+ Add Faction</button>
    </div>
  );
}

export function DarkGiftsSection({ char, onCharChange, enabled, moduleConfig }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean; moduleConfig: any }) {
  if (!enabled) return null;
  const activeNames = new Set(char.moduleData?.darkGifts || []);
  const available: { name: string; description: string }[] = moduleConfig?.darkGifts?.gifts || [];
  if (!available.length) return null;
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>DARK GIFTS (VRGR)</h4>
      {available.map((g) => (
        <label key={g.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.75rem', color: colors.textLight }}>
          <input type="checkbox" checked={activeNames.has(g.name)}
            onChange={() => { const set = new Set(activeNames); set.has(g.name) ? set.delete(g.name) : set.add(g.name); onCharChange(setModuleData(char, 'darkGifts', [...set])); }}
            style={{ marginTop: 2 }} />
          <div><strong>{g.name}</strong><p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: colors.textDim }}>{g.description}</p></div>
        </label>
      ))}
    </div>
  );
}

export function MadnessSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.madness || [];
  const typeColors: Record<string, string> = { short: '#ecc94b', long: '#ed8936', indefinite: '#e53e3e' };
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>MADNESS (DMG)</h4>
      {data.map((m, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: '0.75rem' }}>
          <span style={{ padding: '1px 6px', borderRadius: 3, background: typeColors[m.type] || '#718096', color: '#1a202c', fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{m.type}</span>
          <span style={{ flex: 1, color: colors.textLight }}>{m.effect}</span>
          <select value={m.type} onChange={(e) => { const d = [...data]; d[i] = { ...m, type: e.target.value as any }; onCharChange(setModuleData(char, 'madness', d)); }}
            style={{ ...inputStyle, width: 80, fontSize: '0.65rem' }}>
            <option value="short">Short</option><option value="long">Long</option><option value="indefinite">Indefinite</option>
          </select>
          <button onClick={() => onCharChange(setModuleData(char, 'madness', data.filter((_, j) => j !== i)))} style={{ ...btnStyle, border: '1px solid #e53e3e', color: '#e53e3e' }}>×</button>
        </div>
      ))}
      <button onClick={() => { const effect = prompt('Madness effect:'); if (effect) onCharChange(setModuleData(char, 'madness', [...data, { type: 'short', effect }])); }} style={btnStyle}>+ Add Effect</button>
    </div>
  );
}

export function EpicBoonsSection({ char, onCharChange, enabled, moduleConfig }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean; moduleConfig: any }) {
  if (!enabled) return null;
  const activeNames = new Set(char.moduleData?.epicBoons || []);
  const available: { name: string; description: string }[] = moduleConfig?.epicBoons?.boons || [];
  if (!available.length) return null;
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>EPIC BOONS (DMG)</h4>
      {available.map((b) => (
        <label key={b.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.75rem', color: colors.textLight }}>
          <input type="checkbox" checked={activeNames.has(b.name)}
            onChange={() => { const set = new Set(activeNames); set.has(b.name) ? set.delete(b.name) : set.add(b.name); onCharChange(setModuleData(char, 'epicBoons', [...set])); }}
            style={{ marginTop: 2 }} />
          <div><strong>{b.name}</strong><p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: colors.textDim }}>{b.description}</p></div>
        </label>
      ))}
    </div>
  );
}

export function HeroPointsSection({ char, onCharChange, enabled, moduleConfig }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean; moduleConfig: any }) {
  if (!enabled) return null;
  const cfg = moduleConfig?.heroPoints || { poolSize: 5, maxPool: 10 };
  const data = char.moduleData?.heroPoints || { pool: cfg.poolSize || 5 };
  return (
    <div style={cardPanel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h4 style={{ margin: 0, fontSize: '0.8rem', color: colors.gold }}>HERO POINTS (DMG)</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => { if (data.pool <= 0) return; onCharChange(setModuleData(char, 'heroPoints', { ...data, pool: data.pool - 1 })); }}
            disabled={data.pool <= 0}
            style={{ ...btnStyle, background: data.pool > 0 ? 'rgba(99,102,241,0.3)' : 'transparent', border: `1px solid ${data.pool > 0 ? '#6366f1' : colors.border}` }}>Spend</button>
          <button onClick={() => onCharChange(setModuleData(char, 'heroPoints', { ...data, pool: cfg.poolSize || 5 }))} style={btnStyle}>Reset</button>
        </div>
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{data.pool} / {cfg.maxPool || 10}</div>
      <div style={{ fontSize: '0.65rem', color: colors.textDim, marginTop: 4 }}>Roll a d6 and add to any d20 roll. {cfg.resetPerSession ? 'Resets per session.' : ''}</div>
    </div>
  );
}

export function StressFearSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.stressFear || { stressLevel: 0 };
  const adjust = (delta: number) => onCharChange(setModuleData(char, 'stressFear', { ...data, stressLevel: Math.max(0, Math.min(10, data.stressLevel + delta)) }));
  const severity = data.stressLevel <= 3 ? '#48bb78' : data.stressLevel <= 6 ? '#ecc94b' : '#e53e3e';
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>STRESS & FEAR (VRGR)</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => adjust(-1)} style={btnStyle}>−</button>
        <div style={{ flex: 1, height: 12, background: '#1a202c', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${data.stressLevel * 10}%`, height: '100%', background: severity, borderRadius: 6, transition: 'width 0.3s' }} />
        </div>
        <button onClick={() => adjust(1)} style={btnStyle}>+</button>
        <span style={{ fontWeight: 'bold', minWidth: 24, textAlign: 'center', fontSize: '0.9rem' }}>{data.stressLevel}</span>
      </div>
      <div style={{ fontSize: '0.65rem', color: colors.textDim, marginTop: 4 }}>{data.stressLevel >= 7 ? 'Horrified' : data.stressLevel >= 4 ? 'Frightened' : 'Calm'}</div>
    </div>
  );
}

export function TransformationsSection({ char, onCharChange, enabled, moduleConfig }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean; moduleConfig: any }) {
  const { role } = useRole();
  if (!enabled || role !== 'dm') return null;
  const configTypes: { id: string; name: string }[] = moduleConfig?.transformations?.types || [];
  if (!configTypes.length) return null;
  const charData = char.moduleData?.transformations || [];
  const active = charData[0] || null;
  const select = (typeId: string | null) => {
    if (!typeId) {
      onCharChange(setModuleData(char, 'transformations', []));
    } else {
      onCharChange(setModuleData(char, 'transformations', [{ type: typeId, tier: active?.type === typeId ? active.tier : 1 }]));
    }
  };
  const setTier = (typeId: string, tier: number) => {
    onCharChange(setModuleData(char, 'transformations', [{ type: typeId, tier }]));
  };
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>TRANSFORMATIONS (GHPG)</h4>
      <div style={{ fontSize: '0.65rem', color: colors.textDim, marginBottom: 8 }}>DM only — select one active transformation per character</div>
      {configTypes.map((ct) => (
        <div key={ct.id} style={{ marginBottom: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.75rem', color: colors.textLight }}>
            <input type="radio" name="transformation" checked={active?.type === ct.id} onChange={() => select(ct.id)} />
            <strong>{ct.name}</strong>
          </label>
          {active?.type === ct.id && (
            <div style={{ marginLeft: 24, marginTop: 4, display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.7rem' }}>
              <span style={{ color: colors.textDim }}>Tier:</span>
              {[1, 2, 3, 4].map(tier => (
                <button key={tier} onClick={() => setTier(ct.id, tier)}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: `1px solid ${colors.border}`, background: active?.tier === tier ? colors.accent : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.65rem' }}>
                  {tier}
                </button>
              ))}
              <button onClick={() => select(null)}
                style={{ marginLeft: 8, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${colors.border}`, background: 'transparent', color: '#fc8181', cursor: 'pointer', fontSize: '0.65rem' }}>
                Clear
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function DefilingSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.defiling || { defilerLevel: 0 };
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>DEFILING MAGIC (Dark Sun)</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Defiler Level</span>
        <input type="number" min={0} max={20} value={data.defilerLevel}
          onChange={(e) => onCharChange(setModuleData(char, 'defiling', { ...data, defilerLevel: +e.target.value }))}
          style={{ ...inputStyle, width: 60 }} />
      </div>
    </div>
  );
}

export function GroupPatronsSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.groupPatrons || { patronType: '', rank: 1 };
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>GROUP PATRONS (TCoE)</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Type</span>
          <input value={data.patronType} onChange={(e) => onCharChange(setModuleData(char, 'groupPatrons', { ...data, patronType: e.target.value }))}
            style={{ ...inputStyle, width: 140, display: 'block', marginTop: 2 }} placeholder="Academy, guild, etc." />
        </div>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Rank</span>
          <input type="number" min={1} max={10} value={data.rank}
            onChange={(e) => onCharChange(setModuleData(char, 'groupPatrons', { ...data, rank: +e.target.value }))}
            style={{ ...inputStyle, width: 50, display: 'block', marginTop: 2 }} />
        </div>
      </div>
    </div>
  );
}

export function ShipMoraleSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.shipMorale || { role: '', shipName: '', morale: 10 };
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>SHIP MORALE (GoS)</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Ship</span>
          <input value={data.shipName} onChange={(e) => onCharChange(setModuleData(char, 'shipMorale', { ...data, shipName: e.target.value }))}
            style={{ ...inputStyle, width: 120, display: 'block', marginTop: 2 }} placeholder="Ship name" />
        </div>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Role</span>
          <input value={data.role} onChange={(e) => onCharChange(setModuleData(char, 'shipMorale', { ...data, role: e.target.value }))}
            style={{ ...inputStyle, width: 100, display: 'block', marginTop: 2 }} placeholder="Captain, crew..." />
        </div>
        <div>
          <span style={{ fontSize: '0.65rem', color: colors.textDim }}>Morale</span>
          <input type="number" min={0} max={20} value={data.morale}
            onChange={(e) => onCharChange(setModuleData(char, 'shipMorale', { ...data, morale: +e.target.value }))}
            style={{ ...inputStyle, width: 50, display: 'block', marginTop: 2 }} />
        </div>
      </div>
    </div>
  );
}

export function SidekicksSection({ char, onCharChange, enabled }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean }) {
  if (!enabled) return null;
  const data = char.moduleData?.sidekicks || [];
  const add = () => onCharChange(setModuleData(char, 'sidekicks', [...data, { name: '', statBlockRef: 'Expert', level: 1, hp: 10, maxHp: 10 }]));
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>SIDEKICKS (TCoE)</h4>
      {data.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', fontSize: '0.7rem' }}>
          <input value={s.name} onChange={(e) => { const d = [...data]; d[i] = { ...s, name: e.target.value }; onCharChange(setModuleData(char, 'sidekicks', d)); }}
            style={{ ...inputStyle, width: 100 }} placeholder="Name" />
          <select value={s.statBlockRef} onChange={(e) => { const d = [...data]; d[i] = { ...s, statBlockRef: e.target.value }; onCharChange(setModuleData(char, 'sidekicks', d)); }}
            style={{ ...inputStyle, width: 80 }}>
            <option value="Expert">Expert</option><option value="Spellcaster">Spellcaster</option><option value="Warrior">Warrior</option>
          </select>
          <span style={{ color: colors.textDim }}>Lv</span>
          <input type="number" min={1} max={20} value={s.level} onChange={(e) => { const d = [...data]; d[i] = { ...s, level: +e.target.value }; onCharChange(setModuleData(char, 'sidekicks', d)); }}
            style={{ ...inputStyle, width: 40 }} />
          <span style={{ color: colors.textDim }}>HP</span>
          <input type="number" min={1} value={s.hp} onChange={(e) => { const d = [...data]; d[i] = { ...s, hp: +e.target.value }; onCharChange(setModuleData(char, 'sidekicks', d)); }}
            style={{ ...inputStyle, width: 40 }} />
          <span style={{ color: colors.textDim }}>/</span>
          <input type="number" min={1} value={s.maxHp} onChange={(e) => { const d = [...data]; d[i] = { ...s, maxHp: +e.target.value }; onCharChange(setModuleData(char, 'sidekicks', d)); }}
            style={{ ...inputStyle, width: 40 }} />
          <button onClick={() => onCharChange(setModuleData(char, 'sidekicks', data.filter((_, j) => j !== i)))} style={{ ...btnStyle, border: '1px solid #e53e3e', color: '#e53e3e' }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ ...btnStyle, marginTop: 4 }}>+ Add Sidekick</button>
    </div>
  );
}

export function IsekaiSection({ char, onCharChange, enabled, moduleConfig }: { char: Character; onCharChange: (c: Character) => void; enabled: boolean; moduleConfig: any }) {
  if (!enabled) return null;
  const isekaiData = char.moduleData?.isekai;
  if (!isekaiData) return null;
  const configTypes = moduleConfig?.isekai?.types || [];
  const typeDef = configTypes.find((t: any) => t.id === isekaiData.type);
  const label = typeDef?.label || isekaiData.type.charAt(0).toUpperCase() + isekaiData.type.slice(1);
  const desc = typeDef?.description || '';
  const STAT_ABBREV: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const appliedBonuses: string[] = [];
  if (isekaiData.asi) {
    for (const [s, v] of Object.entries(isekaiData.asi) as [string, number][]) {
      if (v !== 0) appliedBonuses.push(`${STAT_ABBREV[s] || s.toUpperCase()} +${v}`);
    }
  }
  if (isekaiData.skill) appliedBonuses.push(`Skill: ${isekaiData.skill.replace(/([A-Z])/g, ' $1').trim()}`);
  if (isekaiData.language) appliedBonuses.push(`Language: ${isekaiData.language}`);
  if (isekaiData.cantrip) appliedBonuses.push(`Cantrip: ${isekaiData.cantrip}`);
  if (isekaiData.spell1) appliedBonuses.push(`1st-level spell: ${isekaiData.spell1} (1/long rest)`);
  return (
    <div style={cardPanel}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: colors.gold }}>ISEKAI (Another World)</h4>
      <div style={{ fontSize: '0.75rem', color: colors.textLight, marginBottom: 4 }}><strong>Origin:</strong> {label}</div>
      {desc && <p style={{ fontSize: '0.7rem', color: colors.textDim, margin: '0 0 4px', lineHeight: 1.4 }}>{desc}</p>}
      {appliedBonuses.length > 0 && (
        <div style={{ fontSize: '0.7rem', color: '#68d391', margin: 0 }}>
          <strong>Applied Bonuses:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
            {appliedBonuses.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}
      {isekaiData.bonuses && !appliedBonuses.length && <p style={{ fontSize: '0.7rem', color: '#68d391', margin: 0 }}><strong>Bonuses:</strong> {isekaiData.bonuses}</p>}
    </div>
  );
}
