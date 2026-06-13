// =============================================================================
// 📘 FILE: context/RollLogContext.tsx
// =============================================================================
// 🎯 PURPOSE: Provides a global dice roll log that any component can read.
//    When dice are rolled anywhere in the app, the result appears in the
//    sidebar dice log panel.
//
// 🧠 REACT CONCEPT: Context + Subscription Pattern
//    This context is a bit different from RoleContext. Instead of just storing
//    a value, it SUBSCRIBES to an external event source (the rollEngine's
//    listener system). When the rollEngine emits a new roll, this context
//    catches it and updates its state, causing the UI to update.
//
//    The key insight: Context doesn't have to be "parent sets value, child
//    reads it." A context can also LISTEN to external events and broadcast
//    the results to all consumers.
//
// 🔧 HOW TO ALTER:
//    - Change max log size: modify the `.slice(0, 100)` number
//    - Add more roll data to the log: modify RollLogEntry in rollEngine.ts
//    - Change the UI: modify the dice log display in AppShell.tsx instead
// =============================================================================

'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RollLogEntry, subscribeRollLog } from '../utils/rollEngine';

// 🧠 createContext with DEFAULT value
//    Instead of `| undefined`, this provides a VALID default: empty log + noop clear.
//    This means components can use the context without a provider (but in practice,
//    RollLogProvider wraps the whole app so the real values are always provided).
//
//    The default value is used ONLY if a component reads the context outside a Provider.
//    Providing a sensible default means you don't NEED the safety check that RoleContext has.
const RollLogContext = createContext<{
  log: RollLogEntry[];
  clearLog: () => void;
}>({ log: [], clearLog: () => {} });

// 🧠 RollLogProvider — Wraps the app and manages the roll log state.
//
//    🧠 Pattern: "State Management via Context + External Subscription"
//    1. useState holds the log array
//    2. useEffect subscribes to rollEngine events (runs once on mount)
//    3. When a new roll happens, the callback runs setLog to append it
//    4. State change triggers re-render of ALL components using useRollLog()
export function RollLogProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState<RollLogEntry[]>([]);

  // 🧠 useEffect(() => { return unsubscribe; }, [])
  //
  //    This is the CLEANUP PATTERN: subscribeRollLog returns an UNSUBSCRIBE
  //    function. useEffect's return value is called when the component
  //    UNMOUNTS (is removed from the screen). This prevents memory leaks.
  //
  //    Without cleanup, if RollLogProvider remounted, we'd have TWO listeners
  //    appending to the log. With cleanup, the old listener is removed.
  //
  //    Inside the subscriber:
  //      setLog((prev) => [entry, ...prev].slice(0, 100))
  //    - Uses the FUNCTIONAL form of setLog (prev => ...), which gets the
  //      CURRENT state. This is safer than `setLog([entry, ...log])` because
  //      it doesn't depend on stale closures.
  //    - Prepends the new entry to the front ([entry, ...prev])
  //    - Keeps only the last 100 entries (.slice(0, 100))
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

// 🧠 useRollLog — Simple hook. No safety check needed because the default
//    context value is valid (empty log, noop clear).
export function useRollLog() {
  return useContext(RollLogContext);
}
