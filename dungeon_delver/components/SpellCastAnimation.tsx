'use client';
import { useEffect, useState, useRef } from 'react';
import { getSpellGifPath } from '../utils/cardEngine';

export default function SpellCastAnimation({ spellName, onClose }: { spellName: string | null; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [gifPath, setGifPath] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (!spellName) {
      setVisible(false);
      setGifPath(null);
      prevRef.current = null;
      return;
    }
    if (spellName === prevRef.current) return;
    prevRef.current = spellName;

    const path = getSpellGifPath(spellName.trim()) || null;
    setGifPath(path);
    if (!path) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onCloseRef.current(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [spellName]);

  if (!spellName || !gifPath) return null;

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        transition: 'background 0.3s ease',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 'min(420px, 85vw)',
          aspectRatio: '3 / 4',
          background: '#0f1419',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: visible
            ? '0 0 40px rgba(184,134,11,0.4), 0 8px 32px rgba(0,0,0,0.6)'
            : '0 0 0 rgba(184,134,11,0)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '2px solid #b8860b',
        }}
      >
        <img src={gifPath} alt={spellName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div
        style={{
          position: 'absolute', bottom: '-32px', left: 0, right: 0,
          color: '#b8860b', fontSize: '1rem', fontWeight: 600, fontFamily: 'serif',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease 0.15s',
          textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}
      >
        {spellName}
      </div>
    </div>
  );
}
