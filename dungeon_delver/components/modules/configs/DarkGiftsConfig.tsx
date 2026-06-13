'use client';
// ===== 📘 FILE: DarkGiftsConfig.tsx =====
// 🎯 PURPOSE: Configuration panel for Dark Gifts — allows DMs to define custom dark gifts with
//   name, description, and mechanical effect. Supports dynamic add/remove of gifts.
// 🧠 REACT CONCEPT: Array CRUD with Controlled Components — manages a dynamic list of objects using
//   immutable update patterns (map/filter spread) to add, edit, and remove items while preserving state.
// =====
export interface DarkGiftsConfigValue {
  gifts: { name: string; description: string; mechanicalEffect: string }[];
}
export default function DarkGiftsConfig({ value, onChange }: { value: DarkGiftsConfigValue; onChange: (v: DarkGiftsConfigValue) => void }) {
  const add = () => onChange({ ...value, gifts: [...value.gifts, { name: '', description: '', mechanicalEffect: '' }] });
  const remove = (i: number) => onChange({ ...value, gifts: value.gifts.filter((_, j) => j !== i) });
  const update = (i: number, g: DarkGiftsConfigValue['gifts'][0]) => {
    const g2 = [...value.gifts]; g2[i] = g; onChange({ ...value, gifts: g2 });
  };
  return (
    <div>
      {value.gifts.map((g, i) => (
        <div key={i} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input value={g.name} onChange={(e) => update(i, { ...g, name: e.target.value })}
              style={inputStyle} placeholder="Gift name" />
            <button onClick={() => remove(i)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          <textarea value={g.description} onChange={(e) => update(i, { ...g, description: e.target.value })}
            style={textAreaStyle} placeholder="Description" rows={2} />
          <textarea value={g.mechanicalEffect} onChange={(e) => update(i, { ...g, mechanicalEffect: e.target.value })}
            style={textAreaStyle} placeholder="Mechanical effect" rows={2} />
        </div>
      ))}
      <button onClick={add} style={addBtnStyle}>+ Add Dark Gift</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', flex: 1 };
const textAreaStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: '100%', marginTop: 4, resize: 'vertical' };
const addBtnStyle: React.CSSProperties = { padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
