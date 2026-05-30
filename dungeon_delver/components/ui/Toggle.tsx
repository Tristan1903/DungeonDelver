'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => { if (!disabled) onChange(!checked); }}
        style={{
          position: 'relative', width: '36px', height: '20px',
          background: checked ? 'var(--dungeon-accent, #6366f1)' : 'var(--dungeon-border, #4a5568)',
          borderRadius: '10px', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: '2px', left: checked ? '18px' : '2px',
          width: '16px', height: '16px', background: 'white', borderRadius: '50%',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
      {label && <span style={{ fontSize: '0.8rem', color: 'var(--dungeon-text, #e2e8f0)' }}>{label}</span>}
    </label>
  );
}
