'use client';
import { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'filled';
  style?: React.CSSProperties;
}

export function Tabs({ tabs, activeTab, onChange, variant = 'filled', style }: TabsProps) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', ...style }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', fontSize: '0.82rem', fontFamily: 'inherit',
              background: variant === 'filled'
                ? (isActive ? 'var(--dungeon-accent, #6366f1)' : 'var(--dungeon-surface, #2d3748)')
                : 'transparent',
              border: variant === 'filled'
                ? `1px solid ${isActive ? 'var(--dungeon-accent)' : 'var(--dungeon-border)'}`
                : 'none',
              borderBottom: variant === 'underline'
                ? `2px solid ${isActive ? 'var(--dungeon-gold, #b8860b)' : 'transparent'}`
                : undefined,
              color: isActive ? 'white' : 'var(--dungeon-text-dim, #a0aec0)',
              borderRadius: 'var(--dungeon-radius-sm, 4px)',
              cursor: 'pointer', fontWeight: isActive ? 600 : 400,
              minHeight: '40px', transition: 'background 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span style={{ fontSize: '0.65rem', background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--dungeon-bg, #1a202c)', padding: '1px 6px', borderRadius: '10px' }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
