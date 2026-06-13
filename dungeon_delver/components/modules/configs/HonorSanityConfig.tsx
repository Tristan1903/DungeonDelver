'use client';
// ===== 📘 FILE: HonorSanityConfig.tsx =====
// 🎯 PURPOSE: Sets default Honor and Sanity ability scores (3–18) for characters when this variant
//   rule is enabled.
// 🧠 REACT CONCEPT: Scalar Controlled Inputs — two number inputs with min/max constraints, each
//   parsing the string value to a number before calling the parent's onChange.
// =====
export interface HonorSanityConfigValue { defaultHonor: number; defaultSanity: number; }
export default function HonorSanityConfig({ value, onChange }: { value: HonorSanityConfigValue; onChange: (v: HonorSanityConfigValue) => void }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Default Honor Score</label>
        <input type="number" min={3} max={18} value={value.defaultHonor}
          onChange={(e) => onChange({ ...value, defaultHonor: +e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Default Sanity Score</label>
        <input type="number" min={3} max={18} value={value.defaultSanity}
          onChange={(e) => onChange({ ...value, defaultSanity: +e.target.value })} style={inputStyle} />
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: 80, marginTop: 4 };
