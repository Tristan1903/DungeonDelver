'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RollLogEntry, subscribeRollLog } from '../utils/rollEngine';

const RollLogContext = createContext<{
  log: RollLogEntry[];
  clearLog: () => void;
}>({ log: [], clearLog: () => {} });

export function RollLogProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState<RollLogEntry[]>([]);

  useEffect(() => {
    return subscribeRollLog((entry) => {
      setLog((prev) => [entry, ...prev].slice(0, 100));
    });
  }, []);

  return (
    <RollLogContext.Provider value={{ log, clearLog: () => setLog([]) }}>
      {children}
    </RollLogContext.Provider>
  );
}

export function useRollLog() {
  return useContext(RollLogContext);
}
