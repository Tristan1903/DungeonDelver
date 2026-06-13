// =============================================================================
// 📘 FILE: components/Providers.tsx
// =============================================================================
// 🎯 PURPOSE: Composes all context providers into a single wrapper component.
//    This avoids nesting them all in the layout file.
//
// 🧠 REACT CONCEPT: Provider Composition
//    Context providers must be NESTED because each one wraps its children.
//    The ORDER matters — a component can only access contexts that wrap it.
//
//    Raw nesting (ugly):
//      <RollLogProvider>
//        <RoleProvider>
//          <AppShell>
//            {children}
//          </AppShell>
//        </RoleProvider>
//      </RollLogProvider>
//
//    Providers.tsx cleans this up into a single import:
//      <Providers>{children}</Providers>
//
// 🧠 The nesting order MATTERS because of the component hierarchy:
//    1. RollLogProvider (outermost) — dice log context available everywhere
//    2. RoleProvider — role (player/dm) available everywhere inside
//    3. AppShell — renders the sidebar nav and dice log panel
//
//    AppShell is nested INSIDE the providers so it can use useRole() and
//    useRollLog(). The page content is inside AppShell.
//
// 🔧 HOW TO ALTER:
//    - Add a new context provider: wrap it around the others in the nesting
//      order that makes sense for your feature
//    - Remove a provider: delete the line
// =============================================================================

'use client';
import { RollLogProvider } from '../context/RollLogContext';
import { RoleProvider } from '../context/RoleContext';
import { LanSyncProvider } from '../context/LanSyncContext';
import AppShell from './AppShell';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RollLogProvider>
      <RoleProvider>
        <LanSyncProvider>
          <AppShell>
            {children}
          </AppShell>
        </LanSyncProvider>
      </RoleProvider>
    </RollLogProvider>
  );
}
