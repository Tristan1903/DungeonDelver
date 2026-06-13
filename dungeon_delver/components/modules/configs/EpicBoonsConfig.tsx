'use client';
// ===== 📘 FILE: EpicBoonsConfig.tsx =====
// 🎯 PURPOSE: Configuration panel for epic boons — DMs define custom boons with name, description,
//   and prerequisites. Supports dynamic add/remove of boon entries.
// 🧠 REACT CONCEPT: Array CRUD Pattern — identical structure to DarkGiftsConfig, reinforcing the
//   reusable pattern of mapping over an array and emitting immutable updates upward.
// =====
export interface EpicBoonsConfigValue { boons: { name: string; description: string; prerequisites: string }[]; }
export default function EpicBoonsConfig({ value, onChange }: { value: EpicBoonsConfigValue; onChange: (v: EpicBoonsConfigValue) => void }) {
  const add = () => onChange({ ...value, boons: [...value.boons, { name: '', description: '', prerequisites: '' }] });
  const remove = (i: number) => onChange({ ...value, boons: value.boons.filter((_, j) => j !== i) });
  const update = (i: number, b: EpicBoonsConfigValue['boons'][0]) => {
    const b2 = [...value.boons]; b2[i] = b; onChange({ ...value, boons: b2 });
  };
  return (
    <div>
      {value.boons.map((b, i) => (
        <div key={i} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input value={b.name} onChange={(e) => update(i, { ...b, name: e.target.value })}
              style={inputStyle} placeholder="Boon name" />
            <button onClick={() => remove(i)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          <textarea value={b.description} onChange={(e) => update(i, { ...b, description: e.target.value })}
            style={tArea} placeholder="Description" rows={2} />
          <input value={b.prerequisites} onChange={(e) => update(i, { ...b, prerequisites: e.target.value })}
            style={{ ...inputStyle, marginTop: 4 }} placeholder="Prerequisites (optional)" />
        </div>
      ))}
      <button onClick={add} style={addBtnStyle}>+ Add Boon</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', flex: 1 };
const tArea: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: '100%', marginTop: 4, resize: 'vertical' };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
