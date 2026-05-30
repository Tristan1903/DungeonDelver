'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UserRole = 'player' | 'dm';

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'dungeon-delver-role';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('player');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
      if (saved === 'player' || saved === 'dm') {
        setRoleState(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setRole = (next: UserRole) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return ctx;
}

