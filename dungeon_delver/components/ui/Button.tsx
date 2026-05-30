'use client';
import { ReactNode } from 'react';

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
type BtnSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
}

const variantStyles: Record<BtnVariant, { bg: string; border: string; color: string; hover: string }> = {
  primary: { bg: 'var(--dungeon-accent, #6366f1)', border: 'none', color: 'white', hover: 'rgba(99,102,241,0.8)' },
  secondary: { bg: 'var(--dungeon-surface, #2d3748)', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text)', hover: 'var(--dungeon-panel, #1a202c)' },
  danger: { bg: 'var(--dungeon-danger, #e53e3e)', border: 'none', color: 'white', hover: 'rgba(229,62,62,0.8)' },
  ghost: { bg: 'transparent', border: 'none', color: 'var(--dungeon-text-dim)', hover: 'rgba(255,255,255,0.05)' },
  gold: { bg: 'var(--dungeon-gold, #b8860b)', border: 'none', color: '#000', hover: 'rgba(184,134,11,0.8)' },
};

const sizeStyles: Record<BtnSize, { padding: string; fontSize: string; minHeight: string }> = {
  sm: { padding: '4px 10px', fontSize: '0.7rem', minHeight: '32px' },
  md: { padding: '8px 16px', fontSize: '0.8rem', minHeight: '40px' },
  lg: { padding: '12px 24px', fontSize: '0.95rem', minHeight: '48px' },
};

export function Button({ children, variant = 'primary', size = 'md', loading, disabled, icon, onClick, style, className, title, type = 'button' }: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: s.padding, fontSize: s.fontSize, minHeight: s.minHeight,
        background: v.bg, border: v.border, color: v.color,
        borderRadius: 'var(--dungeon-radius-sm, 4px)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontWeight: 600, fontFamily: 'inherit',
        transition: 'background 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled && !loading) (e.target as HTMLElement).style.background = v.hover; }}
      onMouseLeave={e => { if (!disabled) (e.target as HTMLElement).style.background = v.bg; }}
    >
      {loading ? <span style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}
