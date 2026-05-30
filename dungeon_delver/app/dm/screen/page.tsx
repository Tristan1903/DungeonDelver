'use client';
import Link from 'next/link';
import DmScreenPanel from '../../../components/DmScreenPanel';

export default function DmScreenPage() {
  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <Link href="/dm" style={{ color: '#a0aec0', display: 'block', marginBottom: '16px' }}>← DM Hub</Link>
      <DmScreenPanel />
    </div>
  );
}
