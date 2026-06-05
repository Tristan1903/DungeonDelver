'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGES = [
  { href: '/library', label: 'Bookshelf', icon: '📚' },
  { href: '/library/spells', label: 'Spells', icon: '🔮' },
  { href: '/library/items', label: 'Items', icon: '⚔️' },
  { href: '/library/monsters', label: 'Monsters', icon: '🐉' },
  { href: '/library/races', label: 'Races', icon: '🧝' },
  { href: '/library/backgrounds', label: 'Backgrounds', icon: '📜' },
  { href: '/library/classes', label: 'Classes', icon: '📖' },
];

export default function LibrarySidebar() {
  const pathname = usePathname();

  return (
    <div style={{
      width: '200px', minWidth: '200px', background: '#0c0e14',
      borderRight: '1px solid #3d3528', height: '100vh', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 10,
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #3d3528' }}>
        <Link href="/hub" style={{ textDecoration: 'none' }}>
          <span style={{ color: '#5a5248', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>← Back to Hub</span>
        </Link>
        <h2 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', margin: 0, fontSize: '1rem' }}>Library</h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {PAGES.map((p) => {
          const active = pathname === p.href || (p.href !== '/library' && pathname.startsWith(p.href));
          return (
            <Link key={p.href} href={p.href} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                padding: '8px 16px', cursor: 'pointer', fontSize: '0.78rem',
                color: active ? '#c9a84c' : '#8a7e6a',
                background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                borderLeft: active ? '3px solid #c9a84c' : '3px solid transparent',
                fontWeight: active ? 700 : 400,
              }}>
                {p.icon} {p.label}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
