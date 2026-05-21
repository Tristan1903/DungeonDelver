'use client';
import Link from 'next/link';

export default function Dashboard() {
  const navButtonStyle = {
    display: 'block',
    padding: '1.5rem',
    margin: '1rem 0',
    backgroundColor: '#2d3748',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    border: '2px solid #4a5568'
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Dungeon Delver Dashboard</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <Link href="/character-sheet" style={navButtonStyle}>
          Character Sheet
        </Link>
        
        <Link href="/combat" style={navButtonStyle}>
          Combat Tracker
        </Link>
      </div>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: '#718096' }}>
        <p>Your local 5e engine is running.</p>
      </footer>
    </main>
  );
}