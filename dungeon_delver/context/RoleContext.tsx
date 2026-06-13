// =============================================================================
// 📘 FILE: context/RoleContext.tsx
// =============================================================================
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UserRole = 'player' | 'dm';

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  locked: boolean;
  setLocked: (locked: boolean) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'dungeon-delver-role';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('player');
  const [locked, setLockedState] = useState(false);

  useEffect(() => {
    try {
      // Clear any stale lock from previous sessions
      localStorage.removeItem('dd-lan-role-locked');
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
      if (saved === 'player' || saved === 'dm') {
        setRoleState(saved);
      }
    } catch { /* ignore */ }
  }, []);

  const setRole = (next: UserRole) => {
    setRoleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  };

  // locked is session-only (never persisted), so it resets on page load
  const setLocked = (next: boolean) => {
    setLockedState(next);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, locked, setLocked }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
