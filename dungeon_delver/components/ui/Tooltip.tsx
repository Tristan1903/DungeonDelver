'use client';
import { ReactNode, useState } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          padding: '4px 8px', fontSize: '0.65rem', background: '#1a202c',
          color: 'var(--dungeon-text)', borderRadius: '4px',
          border: '1px solid var(--dungeon-border)',
          whiteSpace: 'nowrap', zIndex: 1000,
          pointerEvents: 'none', marginBottom: '4px',
        }}>
          {content}
        </span>
      )}
    </span>
  );
}
