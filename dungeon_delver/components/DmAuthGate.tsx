'use client';
import { useState, useEffect, ReactNode } from 'react';

const AUTH_KEY = 'dd-dm-authenticated';

interface DmAuthGateProps {
  children: ReactNode;
}

export function useDmAuth() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    try { setAuthed(localStorage.getItem(AUTH_KEY) === 'true'); } catch { setAuthed(false); }
  }, []);

  const authenticate = (password: string) => {
    const stored = localStorage.getItem('dd-dm-password') || '';
    if (stored && password !== stored) return false;
    try { localStorage.setItem(AUTH_KEY, 'true'); } catch { /* ignore */ }
    setAuthed(true);
    return true;
  };

  const lock = () => {
    try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
    setAuthed(false);
  };

  const setPassword = (pw: string) => {
    try {
      if (pw) localStorage.setItem('dd-dm-password', pw);
      else localStorage.removeItem('dd-dm-password');
      localStorage.removeItem(AUTH_KEY);
    } catch { /* ignore */ }
    setAuthed(false);
  };

  return { authed, authenticate, lock, setPassword };
}

export default function DmAuthGate({ children }: DmAuthGateProps) {
  const { authed, authenticate, setPassword } = useDmAuth();
  const [mounted, setMounted] = useState(false);
  const [hasPw, setHasPw] = useState(false);
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [lanRole, setLanRole] = useState<'dm' | 'player' | 'local'>('local');

  useEffect(() => {
    setMounted(true);
    try {
      const role = localStorage.getItem('dd-lan-role');
      if (role === 'player') setLanRole('player');
      else if (role === 'dm') setLanRole('dm');
    } catch {}
    try { setHasPw(!!localStorage.getItem('dd-dm-password')); } catch { setHasPw(false); }
  }, []);

  if (!mounted) return null;

  if (lanRole === 'player') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
        <div style={{ background: 'var(--dungeon-panel)', border: '1px solid var(--dungeon-border)', borderRadius: 'var(--dungeon-radius-md)', padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--dungeon-gold)', margin: '0 0 12px', fontSize: '1.2rem' }}>DM Area Locked</h2>
          <p style={{ color: 'var(--dungeon-text-dim)', margin: '0 0 16px', fontSize: '0.9rem' }}>
            You are connected as a player. The Dungeon Master area is not available in player mode.
          </p>
          <p style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.8rem' }}>
            Join again as the DM to access this area.
          </p>
        </div>
      </div>
    );
  }

  if (authed || lanRole === 'dm') return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) return;
    if (authenticate(pw)) {
      setPw('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!hasPw) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
        <div style={{ background: 'var(--dungeon-panel)', border: '1px solid var(--dungeon-border)', borderRadius: 'var(--dungeon-radius-md)', padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--dungeon-gold)', margin: '0 0 12px' }}>DM Area</h2>
          {!showSetup ? (
            <>
              <p style={{ color: 'var(--dungeon-text-dim)', margin: '0 0 20px', fontSize: '0.9rem' }}>
                No DM password is set. Set one now to lock the DM area, or enter without a password.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => { try { localStorage.setItem(AUTH_KEY, 'true'); window.location.reload(); } catch {} }}
                  style={{ padding: '10px 24px', background: 'var(--dungeon-accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Enter Without Password
                </button>
                <button onClick={() => setShowSetup(true)}
                  style={{ padding: '10px 24px', background: 'transparent', color: 'var(--dungeon-text)', border: '1px solid var(--dungeon-border)', borderRadius: '6px', cursor: 'pointer' }}>
                  Set Password
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!newPw) return; if (newPw !== confirmPw) { setError('Passwords do not match'); return; } try { localStorage.setItem('dd-dm-password', newPw); localStorage.setItem(AUTH_KEY, 'true'); window.location.reload(); } catch {} }}>
              <input type="password" placeholder="New password" value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '10px', marginBottom: 8, background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', borderRadius: '6px', color: 'white' }} />
              <input type="password" placeholder="Confirm password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '10px', marginBottom: 12, background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', borderRadius: '6px', color: 'white' }} />
              {error && <p style={{ color: 'var(--dungeon-danger)', margin: '0 0 8px', fontSize: '0.8rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--dungeon-accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Set & Enter</button>
                <button type="button" onClick={() => { setShowSetup(false); setNewPw(''); setConfirmPw(''); setError(''); }}
                  style={{ padding: '10px 16px', background: 'transparent', color: 'var(--dungeon-text)', border: '1px solid var(--dungeon-border)', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--dungeon-panel)', border: '1px solid var(--dungeon-border)', borderRadius: 'var(--dungeon-radius-md)', padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--dungeon-gold)', margin: '0 0 12px' }}>DM Area</h2>
        <p style={{ color: 'var(--dungeon-text-dim)', margin: '0 0 16px', fontSize: '0.85rem' }}>Enter the DM password to continue</p>
        <input type="password" placeholder="Password" value={pw} onChange={e => { setPw(e.target.value); setError(''); }}
          autoFocus style={{ width: '100%', padding: '10px', marginBottom: 12, background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', borderRadius: '6px', color: 'white' }} />
        {error && <p style={{ color: 'var(--dungeon-danger)', margin: '0 0 8px', fontSize: '0.8rem' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: '10px', background: 'var(--dungeon-accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Unlock
        </button>
      </form>
    </div>
  );
}
