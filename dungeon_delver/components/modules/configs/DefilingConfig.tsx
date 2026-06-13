'use client';
// ===== 📘 FILE: DefilingConfig.tsx =====
// 🎯 PURPOSE: Configures the Dark Sun defiling magic mechanic — damage per spell level, radius per
//   level, and a list of preserve options (name + HP cost) that mitigate defiling damage.
// 🧠 REACT CONCEPT: Controlled Forms with Nested Arrays — demonstrates managing a top-level config
//   object containing both scalar values and an array of sub-objects, all updated immutably.
// =====
export interface DefilingConfigValue {
  damagePerSpellLevel: number; radiusPerLevel: number;
  preserveOptions: { name: string; cost: number }[];
}
export default function DefilingConfig({ value, onChange }: { value: DefilingConfigValue; onChange: (v: DefilingConfigValue) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Damage/Level</label>
          <input type="number" value={value.damagePerSpellLevel} onChange={(e) => onChange({ ...value, damagePerSpellLevel: +e.target.value })} min={1} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Radius/Level (ft)</label>
          <input type="number" value={value.radiusPerLevel} onChange={(e) => onChange({ ...value, radiusPerLevel: +e.target.value })} min={1} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Preserve Options</label>
        {value.preserveOptions.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
            <input value={o.name} onChange={(e) => {
              const p = [...value.preserveOptions]; p[i] = { ...o, name: e.target.value }; onChange({ ...value, preserveOptions: p });
            }} style={inputStyle} placeholder="Name" />
            <input type="number" value={o.cost} onChange={(e) => {
              const p = [...value.preserveOptions]; p[i] = { ...o, cost: +e.target.value }; onChange({ ...value, preserveOptions: p });
            }} style={{ ...inputStyle, width: 80 }} placeholder="Cost (hp)" />
            <button onClick={() => onChange({ ...value, preserveOptions: value.preserveOptions.filter((_, j) => j !== i) })}
              style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...value, preserveOptions: [...value.preserveOptions, { name: '', cost: 0 }] })}
          style={addBtnStyle}>+ Option</button>
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', marginTop: 4 };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
