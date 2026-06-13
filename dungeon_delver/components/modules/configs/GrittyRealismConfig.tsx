'use client';
// ===== 📘 FILE: GrittyRealismConfig.tsx =====
// 🎯 PURPOSE: Configures Gritty Realism rest variant — two number inputs for short rest (hours) and
//   long rest (days) durations.
// 🧠 REACT CONCEPT: Simple Controlled Inputs — the simplest form pattern: scalar values driven by
//   props, each onChange parses the string to number and calls the parent's setter.
// =====
export interface GrittyRealismConfigValue { shortRestHours: number; longRestDays: number; }
export default function GrittyRealismConfig({ value, onChange }: { value: GrittyRealismConfigValue; onChange: (v: GrittyRealismConfigValue) => void }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Short Rest Duration (hours)</label>
        <input type="number" min={1} value={value.shortRestHours}
          onChange={(e) => onChange({ ...value, shortRestHours: +e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Long Rest Duration (days)</label>
        <input type="number" min={1} value={value.longRestDays}
          onChange={(e) => onChange({ ...value, longRestDays: +e.target.value })} style={inputStyle} />
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: 80, marginTop: 4 };
