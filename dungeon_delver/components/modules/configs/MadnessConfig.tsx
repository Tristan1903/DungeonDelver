'use client';
// ===== 📘 FILE: MadnessConfig.tsx =====
// 🎯 PURPOSE: Configures Madness variant tables — three separate string arrays for short-term,
//   long-term, and indefinite madness effects, each with add/remove/update capabilities.
// 🧠 REACT CONCEPT: Reusable Section Function — uses a closure-based helper function to avoid
//   repeating the same array CRUD pattern for three tables, demonstrating DRY functional composition.
// =====
export interface MadnessConfigValue { shortTermTable: string[]; longTermTable: string[]; indefiniteTable: string[]; }
export default function MadnessConfig({ value, onChange }: { value: MadnessConfigValue; onChange: (v: MadnessConfigValue) => void }) {
  const section = (label: string, items: string[], key: 'shortTermTable' | 'longTermTable' | 'indefiniteTable') => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>{label}</label>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <textarea value={item} onChange={(e) => {
            const next = [...items]; next[i] = e.target.value; onChange({ ...value, [key]: next });
          }} style={textAreaStyle} rows={2} />
          <button onClick={() => onChange({ ...value, [key]: items.filter((_, j) => j !== i) })}
            style={{ background: '#e53e3e', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer', padding: '2px 8px', alignSelf: 'flex-start' }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange({ ...value, [key]: [...items, ''] })} style={addBtnStyle}>+ Add</button>
    </div>
  );
  return (
    <div>
      {section('Short-Term Madness (1d10 minutes)', value.shortTermTable, 'shortTermTable')}
      {section('Long-Term Madness (1d10 × 10 hours)', value.longTermTable, 'longTermTable')}
      {section('Indefinite Madness', value.indefiniteTable, 'indefiniteTable')}
    </div>
  );
}
const textAreaStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', flex: 1, resize: 'vertical' };
const addBtnStyle: React.CSSProperties = { marginTop: 4, padding: '4px 12px', background: '#4a5568', border: 'none', color: '#cbd5e0', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' };
