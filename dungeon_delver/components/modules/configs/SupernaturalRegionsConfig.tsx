'use client';
export interface SupernaturalRegionsConfigValue {
  regions: { name: string; type: string; effects: string }[];
}
export default function SupernaturalRegionsConfig({ value, onChange }: { value: SupernaturalRegionsConfigValue; onChange: (v: SupernaturalRegionsConfigValue) => void }) {
  const add = () => onChange({ ...value, regions: [...value.regions, { name: '', type: 'magical', effects: '' }] });
  const remove = (i: number) => onChange({ ...value, regions: value.regions.filter((_, j) => j !== i) });
  const update = (i: number, r: SupernaturalRegionsConfigValue['regions'][0]) => {
    const r2 = [...value.regions]; r2[i] = r; onChange({ ...value, regions: r2 });
  };
  return (
    <div>
      {value.regions.map((r, i) => (
        <div key={i} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input value={r.name} onChange={(e) => update(i, { ...r, name: e.target.value })}
              style={inputStyle} placeholder="Region name" />
            <select value={r.type} onChange={(e) => update(i, { ...r, type: e.target.value })}
              style={selectStyle}>
              <option value="magical">Magical</option>
              <option value="cursed">Cursed</option>
              <option value="hallowed">Hallowed</option>
            </select>
            <button onClick={() => remove(i)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          <textarea value={r.effects} onChange={(e) => update(i, { ...r, effects: e.target.value })}
            style={textAreaStyle} placeholder="Effects description" rows={3} />
        </div>
      ))}
      <button onClick={add} style={addBtnStyle}>+ Add Region</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', flex: 1 };
const selectStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem' };
const textAreaStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: '100%', marginTop: 4, resize: 'vertical' };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
