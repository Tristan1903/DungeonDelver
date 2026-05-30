'use client';
import { RollLogProvider } from '../context/RollLogContext';
import { RoleProvider } from '../context/RoleContext';
import AppShell from './AppShell';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RollLogProvider>
      <RoleProvider>
        <AppShell>{children}</AppShell>
      </RoleProvider>
    </RollLogProvider>
  );
}
