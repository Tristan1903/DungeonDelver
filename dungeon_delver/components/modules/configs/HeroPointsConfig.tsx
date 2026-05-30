'use client';
export interface HeroPointsConfigValue { poolSize: number; maxPool: number; resetPerSession: boolean; }
export default function HeroPointsConfig({ value, onChange }: { value: HeroPointsConfigValue; onChange: (v: HeroPointsConfigValue) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Pool Size</label>
          <input type="number" min={1} max={20} value={value.poolSize}
            onChange={(e) => onChange({ ...value, poolSize: +e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Max Pool</label>
          <input type="number" min={1} max={20} value={value.maxPool}
            onChange={(e) => onChange({ ...value, maxPool: +e.target.value })} style={inputStyle} />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e0', fontSize: '0.85rem' }}>
        <input type="checkbox" checked={value.resetPerSession}
          onChange={(e) => onChange({ ...value, resetPerSession: e.target.checked })} />
        Reset per session
      </label>
    </div>
  );
}
const inputStyle: React.CSSProperties = { padding: '6px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: 4, fontSize: '0.85rem', width: 80, marginTop: 4 };
