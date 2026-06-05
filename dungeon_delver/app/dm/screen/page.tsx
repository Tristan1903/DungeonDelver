'use client';
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
