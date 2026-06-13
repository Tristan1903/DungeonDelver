'use client';
// =============================================================================
// 📘 FILE: components/DmPasswordPanel.tsx
// =============================================================================
// 🎯 PURPOSE: A password management form for the DM area. Allows setting a new
//    password, changing an existing one, or removing the lock. Stores the
//    password hash in localStorage and clears the authenticated flag on change.
//
// 🧠 REACT CONCEPT: Controlled Form with Validation
//    Three controlled inputs (currentPw, newPw, confirmPw) drive the form
//    state. Validation runs on submit — checking current password match, non-
//    empty new password, and pass confirmation — with inline error/success
//    messages displayed via a msg/msgType state pair.
// =============================================================================
import { useState } from 'react';

export default function DmPasswordPanel() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const hasPassword = (): boolean => {
    try { return !!localStorage.getItem('dd-dm-password'); } catch { return false; }
  };

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem('dd-dm-password') || '';
    if (stored && currentPw !== stored) {
      setMsgType('error'); setMsg('Current password is incorrect'); return;
    }
    if (!newPw) {
      setMsgType('error'); setMsg('New password cannot be empty'); return;
    }
    if (newPw !== confirmPw) {
      setMsgType('error'); setMsg('Passwords do not match'); return;
    }
    try {
      localStorage.setItem('dd-dm-password', newPw);
      localStorage.removeItem('dd-dm-authenticated');
      setMsgType('success'); setMsg('Password changed. You will need to re-enter it on next DM page load.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { setMsgType('error'); setMsg('Failed to save password'); }
  };

  const removePassword = () => {
    if (hasPassword() && !currentPw) {
      setMsgType('error'); setMsg('Enter current password to remove the lock'); return;
    }
    const stored = localStorage.getItem('dd-dm-password') || '';
    if (stored && currentPw !== stored) {
      setMsgType('error'); setMsg('Current password is incorrect'); return;
    }
    try {
      localStorage.removeItem('dd-dm-password');
      localStorage.removeItem('dd-dm-authenticated');
      setMsgType('success'); setMsg('Password removed. DM area is now unlocked.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { setMsgType('error'); setMsg('Failed to remove password'); }
  };

  return (
    <div style={{ color: '#e2e8f0' }}>
      <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: 16 }}>
        Set a password to lock the DM area. You will be prompted for it when accessing any DM page.
      </p>

      <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hasPassword() && (
          <input type="password" placeholder="Current password" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setMsg(''); }}
            style={{ width: '100%', padding: '8px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }} />
        )}
        <input type="password" placeholder="New password" value={newPw} onChange={e => { setNewPw(e.target.value); setMsg(''); }}
          style={{ width: '100%', padding: '8px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }} />
        <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setMsg(''); }}
          style={{ width: '100%', padding: '8px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }} />

        {msg && (
          <p style={{ fontSize: '0.8rem', margin: 0, color: msgType === 'error' ? '#fc8181' : '#68d391' }}>{msg}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="submit" style={{ flex: 1, padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            {hasPassword() ? 'Change Password' : 'Set Password'}
          </button>
          {hasPassword() && (
            <button type="button" onClick={removePassword} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
              Remove
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
