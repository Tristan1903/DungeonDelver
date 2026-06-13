'use client';
// ===== 📘 FILE: StressFearConfig.tsx =====
// 🎯 PURPOSE: Configures Stress/Fear system — two DC thresholds: Frightened and Horrified.
// 🧠 REACT CONCEPT: Simple Scalar Controlled Inputs — two number inputs with min/max constraints,
//   each parsing string→number before calling the parent's onChange handler.
// =====
export interface StressFearConfigValue { stressFrightenedDC: number; stressHorrifiedDC: number; }
export default function StressFearConfig({ value, onChange }: { value: StressFearConfigValue; onChange: (v: StressFearConfigValue) => void }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Frightened DC</label>
        <input type="number" value={value.stressFrightenedDC} onChange={(e) => onChange({ ...value, stressFrightenedDC: +e.target.value })}
          min={1} max={30} style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Horrified DC</label>
        <input type="number" value={value.stressHorrifiedDC} onChange={(e) => onChange({ ...value, stressHorrifiedDC: +e.target.value })}
          min={1} max={30} style={inputStyle} />
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: 80, marginTop: 4 };
