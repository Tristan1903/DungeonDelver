'use client';
// ===== 📘 FILE: ShipMoraleConfig.tsx =====
// 🎯 PURPOSE: Configures ship morale system — base morale score, officer role names, and
//   situational morale modifiers (situation + numeric modifier).
// 🧠 REACT CONCEPT: Heterogeneous Array Forms — same component manages three different array types:
//   simple string arrays (roles) and object arrays (modifiers), showcasing flexible CRUD patterns.
// =====
export interface ShipMoraleConfigValue { baseMorale: number; officerRoles: string[]; moraleModifiers: { situation: string; mod: number }[]; }
export default function ShipMoraleConfig({ value, onChange }: { value: ShipMoraleConfigValue; onChange: (v: ShipMoraleConfigValue) => void }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Base Morale</label>
        <input type="number" value={value.baseMorale} onChange={(e) => onChange({ ...value, baseMorale: +e.target.value })} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Officer Roles</label>
        {value.officerRoles.map((role, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={role} onChange={(e) => {
              const r = [...value.officerRoles]; r[i] = e.target.value; onChange({ ...value, officerRoles: r });
            }} style={inputStyle} />
            <button onClick={() => onChange({ ...value, officerRoles: value.officerRoles.filter((_, j) => j !== i) })}
              style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...value, officerRoles: [...value.officerRoles, ''] })} style={addBtnStyle}>+ Role</button>
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Morale Modifiers</label>
        {value.moraleModifiers.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
            <input value={m.situation} onChange={(e) => {
              const mods = [...value.moraleModifiers]; mods[i] = { ...m, situation: e.target.value }; onChange({ ...value, moraleModifiers: mods });
            }} style={{ ...inputStyle, flex: 1 }} placeholder="Situation" />
            <input type="number" value={m.mod} onChange={(e) => {
              const mods = [...value.moraleModifiers]; mods[i] = { ...m, mod: +e.target.value }; onChange({ ...value, moraleModifiers: mods });
            }} style={{ ...inputStyle, width: 60 }} />
            <button onClick={() => onChange({ ...value, moraleModifiers: value.moraleModifiers.filter((_, j) => j !== i) })}
              style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...value, moraleModifiers: [...value.moraleModifiers, { situation: '', mod: 0 }] })}
          style={addBtnStyle}>+ Modifier</button>
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', marginTop: 4 };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
