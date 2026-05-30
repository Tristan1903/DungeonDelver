'use client';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  style?: React.CSSProperties;
}

export function Select({ options, value, onChange, label, style }: SelectProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }}>
      {label && <span style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-muted, #a0aec0)' }}>{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px',
          background: 'var(--dungeon-bg, #1a202c)',
          border: '1px solid var(--dungeon-border, #4a5568)',
          color: 'var(--dungeon-text, #e2e8f0)',
          borderRadius: 'var(--dungeon-radius-sm, 4px)',
          fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
