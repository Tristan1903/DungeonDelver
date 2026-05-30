'use client';
import { ReactNode } from 'react';

interface InputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  icon?: ReactNode;
  multiline?: boolean;
  type?: 'text' | 'number' | 'search' | 'password';
  min?: number;
  max?: number;
  style?: React.CSSProperties;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const baseStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--dungeon-bg, #1a202c)',
  border: '1px solid var(--dungeon-border, #4a5568)',
  color: 'var(--dungeon-text, #e2e8f0)',
  borderRadius: 'var(--dungeon-radius-sm, 4px)',
  fontSize: '0.85rem', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s',
};

export function Input({ value, onChange, placeholder, label, error, icon, multiline, type = 'text', min, max, style, className, onKeyDown }: InputProps) {
  const borderColor = error ? 'var(--dungeon-danger, #e53e3e)' : 'var(--dungeon-border, #4a5568)';
  const shared = { ...baseStyle, borderColor, ...style };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && <span style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-muted, #a0aec0)' }}>{label}</span>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && <span style={{ position: 'absolute', left: '10px', color: 'var(--dungeon-text-dim)' }}>{icon}</span>}
        {multiline ? (
          <textarea
            value={value as string}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={className}
            onKeyDown={onKeyDown}
            style={{ ...shared, minHeight: '80px', resize: 'vertical', paddingLeft: icon ? '32px' : '10px' }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            className={className}
            onKeyDown={onKeyDown}
            style={{ ...shared, paddingLeft: icon ? '32px' : '10px' }}
          />
        )}
      </div>
      {error && <span style={{ fontSize: '0.7rem', color: 'var(--dungeon-danger, #e53e3e)' }}>{error}</span>}
    </label>
  );
}
