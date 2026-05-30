'use client';

interface HPBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const heights = { sm: 6, md: 10, lg: 18 };
const fontSizes = { sm: '0.6rem', md: '0.7rem', lg: '0.85rem' };

function hpColor(pct: number): string {
  if (pct > 0.6) return 'var(--dungeon-success, #48bb78)';
  if (pct > 0.3) return 'var(--dungeon-warning, #ecc94b)';
  return 'var(--dungeon-danger, #e53e3e)';
}

export function HPBar({ current, max, showLabel, size = 'md', style }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div style={style}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes[size], marginBottom: '4px' }}>
          <span style={{ color: 'var(--dungeon-text-dim, #718096)' }}>HP</span>
          <span style={{ fontWeight: 'bold', color: 'var(--dungeon-text, #e2e8f0)' }}>{current} / {max}</span>
        </div>
      )}
      <div style={{
        width: '100%', height: heights[size],
        background: 'rgba(0,0,0,0.3)', borderRadius: `${heights[size] / 2}px`,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: hpColor(pct / 100),
          borderRadius: `${heights[size] / 2}px`,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}
