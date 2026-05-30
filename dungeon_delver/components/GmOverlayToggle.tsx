'use client';
import { useState, useEffect, useRef } from 'react';
import { loadGmOverlay, saveGmOverlay, toggleGmOverlay, onGmOverlayChange, GmOverlayState } from '../utils/gmOverlayEngine';

export default function GmOverlayToggle() {
  const [state, setState] = useState<GmOverlayState>({ enabled: false, showStats: true, showNotes: true, showHidden: true, notes: '' });
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState(loadGmOverlay());
    return onGmOverlayChange(setState);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  const toggle = () => {
    const next = toggleGmOverlay();
    setState(next);
  };

  const update = (partial: Partial<GmOverlayState>) => {
    const next = { ...state, ...partial };
    saveGmOverlay(next);
    setState(next);
  };

  if (!state.enabled && !expanded) {
    return (
      <button onClick={toggle}
        style={{
          position: 'fixed', bottom: '80px', right: '20px', zIndex: 300,
          width: '40px', height: '40px', borderRadius: '50%',
          background: '#805ad5', border: '2px solid #b794f4',
          color: 'white', fontSize: '1rem', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.5, transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.target as HTMLElement).style.opacity = '1'}
        onMouseLeave={e => (e.target as HTMLElement).style.opacity = '0.5'}
        title="Enable GM Overlay">
        👁
      </button>
    );
  }

  return (
    <div ref={panelRef} style={{
      position: 'fixed', bottom: '80px', right: '20px', zIndex: 300,
      background: '#1a202c', border: `2px solid ${state.enabled ? '#b794f4' : '#4a5568'}`,
      borderRadius: '12px', padding: '12px', width: '280px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: '#b794f4', fontWeight: 'bold', fontSize: '0.8rem' }}>GM Overlay</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={toggle}
            style={{ padding: '3px 10px', background: state.enabled ? '#48bb78' : '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}>
            {state.enabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={state.showStats} onChange={e => update({ showStats: e.target.checked })} />
          Show monster stats (HP, AC, abilities)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={state.showHidden} onChange={e => update({ showHidden: e.target.checked })} />
          Show hidden monster names
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={state.showNotes} onChange={e => update({ showNotes: e.target.checked })} />
          Show GM notes panel
        </label>
      </div>

      {expanded && (
        <textarea value={state.notes} onChange={e => update({ notes: e.target.value })}
          placeholder="GM notes (visible to you only)..."
          style={{
            width: '100%', minHeight: '80px', marginTop: '8px', padding: '6px',
            background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px',
            color: 'white', fontSize: '0.7rem', outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', fontFamily: 'monospace',
          }} />
      )}
    </div>
  );
}
