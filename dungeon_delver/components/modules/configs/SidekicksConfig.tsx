'use client';
// ===== 📘 FILE: SidekicksConfig.tsx =====
// 🎯 PURPOSE: Configures sidekick stat blocks — each has name, type (warrior/spellcaster/expert),
//   and numeric bonuses (HP, attack, save).
// 🧠 REACT CONCEPT: Select + Number Inputs in Array — demonstrates a controlled <select> dropdown
//   alongside numeric inputs within a dynamic list, all emitting immutable updates.
// =====
export interface SidekicksConfigValue {
  statBlocks: { name: string; type: string; hpBonus: number; attackBonus: number; saveBonus: number }[];
}
export default function SidekicksConfig({ value, onChange }: { value: SidekicksConfigValue; onChange: (v: SidekicksConfigValue) => void }) {
  const add = () => onChange({ ...value, statBlocks: [...value.statBlocks, { name: '', type: 'warrior', hpBonus: 0, attackBonus: 0, saveBonus: 0 }] });
  const remove = (i: number) => onChange({ ...value, statBlocks: value.statBlocks.filter((_, j) => j !== i) });
  const update = (i: number, s: SidekicksConfigValue['statBlocks'][0]) => {
    const s2 = [...value.statBlocks]; s2[i] = s; onChange({ ...value, statBlocks: s2 });
  };
  return (
    <div>
      {value.statBlocks.map((s, i) => (
        <div key={i} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input value={s.name} onChange={(e) => update(i, { ...s, name: e.target.value })}
              style={inputStyle} placeholder="Stat block name" />
            <select value={s.type} onChange={(e) => update(i, { ...s, type: e.target.value })}
              style={selectStyle}>
              <option value="warrior">Warrior</option>
              <option value="spellcaster">Spellcaster</option>
              <option value="expert">Expert</option>
            </select>
            <button onClick={() => remove(i)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>HP Bonus</span><input type="number" value={s.hpBonus} onChange={(e) => update(i, { ...s, hpBonus: +e.target.value })} style={{ ...inputStyle, width: 60 }} /></div>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>Attack Bonus</span><input type="number" value={s.attackBonus} onChange={(e) => update(i, { ...s, attackBonus: +e.target.value })} style={{ ...inputStyle, width: 60 }} /></div>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>Save Bonus</span><input type="number" value={s.saveBonus} onChange={(e) => update(i, { ...s, saveBonus: +e.target.value })} style={{ ...inputStyle, width: 60 }} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} style={addBtnStyle}>+ Add Stat Block</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', marginTop: 2 };
const selectStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem' };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
