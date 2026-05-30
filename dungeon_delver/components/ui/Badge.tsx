'use client';
import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gold';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
}

const colors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'var(--dungeon-bg, #1a202c)', text: 'var(--dungeon-text-dim, #718096)' },
  success: { bg: 'rgba(72,187,120,0.15)', text: '#48bb78' },
  danger: { bg: 'rgba(229,62,62,0.15)', text: '#e53e3e' },
  warning: { bg: 'rgba(236,201,75,0.15)', text: '#ecc94b' },
  info: { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
  gold: { bg: 'rgba(184,134,11,0.15)', text: 'var(--dungeon-gold, #b8860b)' },
};

export function Badge({ children, variant = 'default', style, onClick, title }: BadgeProps) {
  const c = colors[variant];
  return (
    <span
      title={title}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600,
        background: c.bg, color: c.text,
        borderRadius: 'var(--dungeon-radius-sm, 4px)',
        border: '1px solid transparent',
        cursor: onClick ? 'pointer' : undefined,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
