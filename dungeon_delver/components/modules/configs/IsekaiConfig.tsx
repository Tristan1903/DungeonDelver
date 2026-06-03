'use client';
import { IsekaiConfig as IsekaiConfigType, IsekaiTypeConfig } from '../../../utils/campaignEngine';

interface Props {
  value: IsekaiConfigType;
  onChange: (config: IsekaiConfigType) => void;
}

export default function IsekaiConfig({ value, onChange }: Props) {
  const types = value?.types || [];
  const updateType = (index: number, partial: Partial<IsekaiTypeConfig>) => {
    const next = [...types];
    next[index] = { ...next[index], ...partial };
    onChange({ types: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      {types.map((t, i) => (
        <div key={t.id} style={{ background: '#1a202c', borderRadius: '6px', padding: '10px', border: '1px solid #4a5568' }}>
          <div style={{ color: '#f6e05e', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>{t.label}</div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: '#a0aec0', fontSize: '0.75rem', display: 'block', marginBottom: 2 }}>Description</label>
            <textarea value={t.description} onChange={e => updateType(i, { description: e.target.value })}
              rows={2} style={{ width: '100%', padding: '6px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }} />
          </div>
          <div>
            <label style={{ color: '#a0aec0', fontSize: '0.75rem', display: 'block', marginBottom: 2 }}>Bonuses</label>
            <input value={t.bonuses} onChange={e => updateType(i, { bonuses: e.target.value })}
              style={{ width: '100%', padding: '6px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
