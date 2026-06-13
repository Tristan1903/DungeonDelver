'use client';
// ===== 📘 FILE: app/dm/layout.tsx =====
// 🎯 PURPOSE: DM section layout — wraps all /dm/* pages with an auth gate, a GM overlay toggle,
//   and a floating DM Screen button that opens a slide-out DmScreenPanel.
// 🧠 REACT CONCEPT: Layout Component + Portal-like Overlay — demonstrates a client-component layout
//   that provides persistent UI (auth gate, screen toggle) across all sub-routes via `children`.
//   The DM Screen panel is conditionally rendered at the layout level, not inside the page.
// =====
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
        className="fixed bottom-5 right-5 z-[200] w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg transition-all hover:scale-105"
        style={{
          background: showScreen ? '#a83232' : '#c9a84c',
          border: '2px solid rgba(201, 168, 76, 0.3)',
        }}
        title={showScreen ? 'Close DM Screen' : 'Open DM Screen'}>
        {showScreen ? '×' : '?'}
      </button>

      {/* Slide-out panel */}
      {showScreen && (
        <div className="fixed top-0 right-0 bottom-0 z-[199] w-[420px] max-w-[90vw] bg-background border-l-2 overflow-y-auto shadow-[-4px_0_20px_rgba(0,0,0,0.5)] animate-slide-in"
          style={{ borderColor: '#c9a84c' }}>
          <div className="flex justify-between items-center p-5 border-b border-border">
            <h2 className="text-lg font-bold" style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}>
              DM Screen
            </h2>
            <button onClick={() => setShowScreen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors text-xl">
              ×
            </button>
          </div>
          <div className="p-5">
            <DmScreenPanel compact />
          </div>
        </div>
      )}
    </>
  );
}
