'use client';
// ===== 📘 FILE: PietyConfig.tsx =====
// 🎯 PURPOSE: Configures Piety system — deity name + a list of piety score thresholds each with
//   a rank title and benefit description.
// 🧠 REACT CONCEPT: Partial Update Helper — uses a `update(partial)` wrapper that merges a partial
//   object, simplifying scalar field updates while using a separate immutable pattern for arrays.
// =====
export interface PietyConfigValue {
  deityName: string;
  thresholds: { score: number; rank: string; benefit: string }[];
}
export default function PietyConfig({ value, onChange }: { value: PietyConfigValue; onChange: (v: PietyConfigValue) => void }) {
  const update = (partial: Partial<PietyConfigValue>) => onChange({ ...value, ...partial });
  return (
    <div>
      <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Deity Name</label>
      <input value={value.deityName} onChange={(e) => update({ deityName: e.target.value })}
        style={inputStyle} />
      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Piety Thresholds</label>
        {value.thresholds.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <input type="number" value={t.score} onChange={(e) => {
              const t2 = [...value.thresholds]; t2[i] = { ...t, score: +e.target.value }; onChange({ ...value, thresholds: t2 });
            }} style={{ ...inputStyle, width: 60 }} />
            <input value={t.rank} onChange={(e) => {
              const t2 = [...value.thresholds]; t2[i] = { ...t, rank: e.target.value }; onChange({ ...value, thresholds: t2 });
            }} style={{ ...inputStyle, width: 120 }} placeholder="Rank" />
            <input value={t.benefit} onChange={(e) => {
              const t2 = [...value.thresholds]; t2[i] = { ...t, benefit: e.target.value }; onChange({ ...value, thresholds: t2 });
            }} style={{ ...inputStyle, flex: 1 }} placeholder="Benefit" />
            <button onClick={() => onChange({ ...value, thresholds: value.thresholds.filter((_, j) => j !== i) })}
              style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...value, thresholds: [...value.thresholds, { score: 0, rank: '', benefit: '' }] })}
          style={addBtnStyle}>+ Add Threshold</button>
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem' };
const addBtnStyle: React.CSSProperties = { marginTop: 6, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
