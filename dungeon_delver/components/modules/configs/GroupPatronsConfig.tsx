'use client';
// ===== 📘 FILE: GroupPatronsConfig.tsx =====
// 🎯 PURPOSE: Configuration panel for group patrons — DMs define patron types with descriptions,
//   benefits (array of strings), and rank progression (array of strings).
// 🧠 REACT CONCEPT: Deeply Nested Array CRUD — manages arrays of objects that themselves contain
//   arrays. Each update requires careful immutable spreading at multiple nesting levels.
// =====
export interface GroupPatronsConfigValue {
  patrons: { type: string; description: string; benefits: string[]; ranks: string[] }[];
}
export default function GroupPatronsConfig({ value, onChange }: { value: GroupPatronsConfigValue; onChange: (v: GroupPatronsConfigValue) => void }) {
  const add = () => onChange({ ...value, patrons: [...value.patrons, { type: '', description: '', benefits: [''], ranks: [''] }] });
  const remove = (i: number) => onChange({ ...value, patrons: value.patrons.filter((_, j) => j !== i) });
  const update = (i: number, p: GroupPatronsConfigValue['patrons'][0]) => {
    const p2 = [...value.patrons]; p2[i] = p; onChange({ ...value, patrons: p2 });
  };
  return (
    <div>
      {value.patrons.map((p, i) => (
        <div key={i} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input value={p.type} onChange={(e) => update(i, { ...p, type: e.target.value })}
              style={inputStyle} placeholder="Patron type" />
            <button onClick={() => remove(i)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          <textarea value={p.description} onChange={(e) => update(i, { ...p, description: e.target.value })}
            style={textAreaStyle} placeholder="Description" rows={2} />
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: '0.8rem', color: '#718096' }}>Benefits</span>
            {p.benefits.map((b, bi) => (
              <div key={bi} style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <input value={b} onChange={(e) => {
                  const b2 = [...p.benefits]; b2[bi] = e.target.value; update(i, { ...p, benefits: b2 });
                }} style={inputStyle} />
                <button onClick={() => update(i, { ...p, benefits: p.benefits.filter((_, bj) => bj !== bi) })}
                  style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' }}>×</button>
              </div>
            ))}
            <button onClick={() => update(i, { ...p, benefits: [...p.benefits, ''] })} style={addBtnStyle}>+ Benefit</button>
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: '0.8rem', color: '#718096' }}>Ranks</span>
            {p.ranks.map((r, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <input value={r} onChange={(e) => {
                  const r2 = [...p.ranks]; r2[ri] = e.target.value; update(i, { ...p, ranks: r2 });
                }} style={inputStyle} />
                <button onClick={() => update(i, { ...p, ranks: p.ranks.filter((_, rj) => rj !== ri) })}
                  style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' }}>×</button>
              </div>
            ))}
            <button onClick={() => update(i, { ...p, ranks: [...p.ranks, ''] })} style={addBtnStyle}>+ Rank</button>
          </div>
        </div>
      ))}
      <button onClick={add} style={addBtnStyle}>+ Add Patron</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', flex: 1 };
const textAreaStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: '100%', marginTop: 4, resize: 'vertical' };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
