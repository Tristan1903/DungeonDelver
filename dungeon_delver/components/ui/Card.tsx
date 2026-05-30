'use client';
import { ReactNode, useState } from 'react';

type CardVariant = 'default' | 'gold' | 'accent' | 'danger' | 'success';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}

const borderColors: Record<CardVariant, string> = {
  default: 'var(--dungeon-border, #4a5568)',
  gold: 'var(--dungeon-gold, #b8860b)',
  accent: 'var(--dungeon-accent, #6366f1)',
  danger: 'var(--dungeon-danger, #e53e3e)',
  success: 'var(--dungeon-success, #48bb78)',
};

export function Card({ children, variant = 'default', style, onClick, className, hoverable }: CardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      style={{
        background: 'var(--dungeon-surface, #2d3748)',
        border: `1px solid ${hoverable && hovered ? 'var(--dungeon-accent, #6366f1)' : borderColors[variant]}`,
        borderRadius: 'var(--dungeon-radius-md, 8px)',
        padding: '16px',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...(hoverable && hovered ? { boxShadow: '0 0 8px rgba(99,102,241,0.2)' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginBottom: '12px', ...style }}>{children}</div>;
}

export function CardBody({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}

export function CardFooter({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--dungeon-border, #4a5568)', ...style }}>{children}</div>;
}
