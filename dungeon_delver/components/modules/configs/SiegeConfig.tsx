'use client';
export interface SiegeConfigValue {
  weapons: { name: string; ac: number; hp: number; dmg: string; crew: number; range: string }[];
}
export default function SiegeConfig({ value, onChange }: { value: SiegeConfigValue; onChange: (v: SiegeConfigValue) => void }) {
  const add = () => onChange({ ...value, weapons: [...value.weapons, { name: '', ac: 10, hp: 50, dmg: '2d10', crew: 1, range: '50/200' }] });
  const remove = (i: number) => onChange({ ...value, weapons: value.weapons.filter((_, j) => j !== i) });
  const update = (i: number, w: SiegeConfigValue['weapons'][0]) => {
    const w2 = [...value.weapons]; w2[i] = w; onChange({ ...value, weapons: w2 });
  };
  return (
    <div>
      {value.weapons.map((w, i) => (
        <div key={i} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input value={w.name} onChange={(e) => update(i, { ...w, name: e.target.value })}
              style={inputStyle} placeholder="Weapon name" />
            <button onClick={() => remove(i)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>AC</span><input type="number" value={w.ac} onChange={(e) => update(i, { ...w, ac: +e.target.value })} min={0} max={30} style={smallInput} /></div>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>HP</span><input type="number" value={w.hp} onChange={(e) => update(i, { ...w, hp: +e.target.value })} min={1} style={smallInput} /></div>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>Damage</span><input value={w.dmg} onChange={(e) => update(i, { ...w, dmg: e.target.value })} style={smallInput} /></div>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>Crew</span><input type="number" value={w.crew} onChange={(e) => update(i, { ...w, crew: +e.target.value })} min={1} style={smallInput} /></div>
            <div><span style={{ fontSize: '0.75rem', color: '#718096' }}>Range</span><input value={w.range} onChange={(e) => update(i, { ...w, range: e.target.value })} style={smallInput} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} style={addBtnStyle}>+ Add Weapon</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', flex: 1 };
const smallInput: React.CSSProperties = { padding: '4px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.8rem', width: 60, marginTop: 2 };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
