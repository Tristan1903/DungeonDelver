'use client';
export interface RenownConfigValue {
  factions: { name: string; ranks: { score: number; title: string }[] }[];
}
export default function RenownConfig({ value, onChange }: { value: RenownConfigValue; onChange: (v: RenownConfigValue) => void }) {
  const addFaction = () => onChange({ ...value, factions: [...value.factions, { name: '', ranks: [{ score: 1, title: 'Member' }] }] });
  const removeFaction = (i: number) => onChange({ ...value, factions: value.factions.filter((_, j) => j !== i) });
  const updateFaction = (i: number, f: RenownConfigValue['factions'][0]) => {
    const f2 = [...value.factions]; f2[i] = f; onChange({ ...value, factions: f2 });
  };
  return (
    <div>
      {value.factions.map((fac, fi) => (
        <div key={fi} style={{ background: '#1a202c', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <input value={fac.name} onChange={(e) => updateFaction(fi, { ...fac, name: e.target.value })}
              style={inputStyle} placeholder="Faction name" />
            <button onClick={() => removeFaction(fi)} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
          {fac.ranks.map((r, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: '0.75rem', color: '#718096' }}>Score: </span>
              <input type="number" value={r.score} onChange={(e) => {
                const r2 = [...fac.ranks]; r2[ri] = { ...r, score: +e.target.value }; updateFaction(fi, { ...fac, ranks: r2 });
              }} style={{ ...inputStyle, width: 60 }} />
              <input value={r.title} onChange={(e) => {
                const r2 = [...fac.ranks]; r2[ri] = { ...r, title: e.target.value }; updateFaction(fi, { ...fac, ranks: r2 });
              }} style={{ ...inputStyle, flex: 1 }} placeholder="Title" />
              <button onClick={() => {
                const r2 = fac.ranks.filter((_, j) => j !== ri); updateFaction(fi, { ...fac, ranks: r2 });
              }} style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' }}>×</button>
            </div>
          ))}
          <button onClick={() => updateFaction(fi, { ...fac, ranks: [...fac.ranks, { score: 1, title: '' }] })}
            style={addBtnStyle}>+ Rank</button>
        </div>
      ))}
      <button onClick={addFaction} style={addBtnStyle}>+ Add Faction</button>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem' };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
