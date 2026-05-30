'use client';
import { ReactNode, useEffect, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  variant?: 'default' | 'gold' | 'accent' | 'danger';
  footer?: ReactNode;
}

const sizeMap: Record<string, string> = {
  sm: '360px', md: '500px', lg: '720px', full: '95vw',
};

export function Modal({ open, onClose, title, children, size = 'md', variant = 'gold', footer }: ModalProps) {
  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    if (open) { document.addEventListener('keydown', handleKey); return () => document.removeEventListener('keydown', handleKey); }
  }, [open, handleKey]);

  if (!open) return null;

  const borderVar = variant === 'gold' ? 'var(--dungeon-gold, #b8860b)'
    : variant === 'accent' ? 'var(--dungeon-accent, #6366f1)'
    : variant === 'danger' ? 'var(--dungeon-danger, #e53e3e)'
    : 'var(--dungeon-border, #4a5568)';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
      }}
    >
      <div style={{
        background: 'var(--dungeon-surface, #2d3748)', borderRadius: 'var(--dungeon-radius-md, 12px)',
        width: sizeMap[size], maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto',
        border: `2px solid ${borderVar}`, padding: '24px',
      }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontFamily: 'serif', color: borderVar, fontSize: '1.2rem' }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dungeon-text-dim)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>×</button>
          </div>
        )}
        <div>{children}</div>
        {footer && <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--dungeon-border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}
