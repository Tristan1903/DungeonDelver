'use client';
// ===== 📘 FILE: app/dm/screen/page.tsx =====
// 🎯 PURPOSE: DM Screen — standalone page that renders the DmScreenPanel component with
//   a back link to the DM hub.
// 🧠 REACT CONCEPT: Thin Wrapper Page — a minimal page component that delegates all rendering
//   to a shared component (DmScreenPanel), which can also be used as a slide-out panel in
//   the dm/layout. This demonstrates component reusability across layouts and standalone pages.
// =====
import Link from 'next/link';
import DmScreenPanel from '../../../components/DmScreenPanel';

export default function DmScreenPage() {
  return (
    <div style={{ padding: '2rem', color: '#e8dcc8' }}>
      <Link href="/dm" style={{ color: '#8a7e6a', display: 'block', marginBottom: '16px' }}>← DM Hub</Link>
      <DmScreenPanel />
    </div>
  );
}
