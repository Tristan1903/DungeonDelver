'use client';
import { useState } from 'react';
import DmScreenPanel from '../../components/DmScreenPanel';
import GmOverlayToggle from '../../components/GmOverlayToggle';
import DmAuthGate from '../../components/DmAuthGate';

export default function DmLayout({ children }: { children: React.ReactNode }) {
  const [showScreen, setShowScreen] = useState(false);

  return (
    <>
      <DmAuthGate>{children}</DmAuthGate>

      <GmOverlayToggle />

      {/* Floating toggle button */}
      <button onClick={() => setShowScreen(!showScreen)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 200,
          width: '48px', height: '48px', borderRadius: '50%',
          background: showScreen ? 'var(--dungeon-danger)' : 'var(--dungeon-accent)', border: 'none',
          color: 'white', fontSize: '1.2rem', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title={showScreen ? 'Close DM Screen' : 'Open DM Screen'}>
        {showScreen ? '×' : '?'}
      </button>

      {/* Slide-out panel */}
      {showScreen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 199,
          width: '420px', maxWidth: '90vw',
          background: 'var(--dungeon-bg-dark)', borderLeft: '2px solid var(--dungeon-gold)',
          padding: '20px', overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.2s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: 'var(--dungeon-gold)', fontFamily: 'serif', margin: 0 }}>DM Screen</h2>
            <button onClick={() => setShowScreen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--dungeon-text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
          <DmScreenPanel compact />
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
