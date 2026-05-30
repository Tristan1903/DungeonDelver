'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRole } from '../context/RoleContext';
import { loadCharFromLocal, CHAR_STORAGE_PREFIX } from '../utils/storageEngine';

interface CharacterEntry {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
}

export default function Dashboard() {
  const { role } = useRole();
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);

  function scanAllChars(): CharacterEntry[] {
    const chars: CharacterEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CHAR_STORAGE_PREFIX)) {
        const char = loadCharFromLocal(key);
        if (char) {
          chars.push({
            id: char.id || key.replace(CHAR_STORAGE_PREFIX, ''),
            name: char.name,
            race: char.race || '',
            class: (char.classes?.join('/') || char.class || ''),
            level: char.totalLevel || 1,
          });
        }
      }
    }
    return chars;
  }

  useEffect(() => {
    try {
      const registry = JSON.parse(localStorage.getItem('dungeon-delver-character-registry') || '[]');
      const chars: CharacterEntry[] = [];
      for (const entry of registry) {
        const key = entry.id ? `dd-char-${entry.id}` : `dd-char-${entry.name}`;
        const char = loadCharFromLocal(key);
        if (char) {
          chars.push({
            id: entry.id || char.id,
            name: char.name,
            race: char.race || '',
            class: (char.classes?.join('/') || char.class || ''),
            level: char.totalLevel || 1,
          });
        }
      }
      setCharacters(chars.length > 0 ? chars : scanAllChars());
    } catch { const fallback = scanAllChars(); if (fallback.length > 0) setCharacters(fallback); }
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'var(--dungeon-panel)',
    border: '1px solid var(--dungeon-border)',
    borderRadius: 'var(--dungeon-radius-md)',
    padding: '1.5rem',
    color: 'var(--dungeon-text)',
    textDecoration: 'none',
    display: 'block',
    transition: 'border-color var(--dungeon-transition)',
  };

  const quickActions = role === 'dm'
    ? [
        { href: '/dm', label: 'DM Command Hub', desc: 'Campaign flow, storylines, subsystems' },
        { href: '/character-sheet', label: 'Character Sheet', desc: 'View and manage characters' },
        { href: '/combat', label: 'Combat Tracker', desc: 'Run encounters and track initiative' },
        { href: '/party-stash', label: 'Party Stash', desc: 'Shared item pool' },
      ]
    : [
        { href: '/hub', label: 'Player Hub', desc: 'Campaign overview and objectives' },
        { href: '/character-sheet', label: 'Character Sheet', desc: 'Your character' },
        { href: '/combat', label: 'Combat Tracker', desc: 'Current encounter' },
        { href: '/party-stash', label: 'Party Stash', desc: 'Party inventory' },
      ];

  return (
    <div style={{ padding: '2rem', color: 'var(--dungeon-text)', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: '2rem', color: 'var(--dungeon-gold)', margin: '0 0 4px' }}>
          {role === 'dm' ? 'DM Dashboard' : 'Dungeon Delver'}
        </h1>
        <p style={{ color: 'var(--dungeon-text-dim)', margin: 0, fontSize: '0.9rem' }}>
          {role === 'dm' ? 'Campaign management, encounter tools, and world-building resources.' : 'Your local 5e companion for character management and adventuring.'}
        </p>
      </header>

      {/* Quick Actions */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {quickActions.map(action => (
          <Link key={action.href} href={action.href} style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>{action.label}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--dungeon-text-muted)' }}>{action.desc}</div>
          </Link>
        ))}
      </section>

      {/* Characters */}
      <section>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.2rem', color: 'var(--dungeon-gold)', marginBottom: '12px' }}>
          Characters ({characters.length})
        </h2>
        {characters.length === 0 && (
          <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center' as const }}>
            <p style={{ color: 'var(--dungeon-text-dim)' }}>No characters yet.</p>
            <Link href="/character-sheet" style={{ color: 'var(--dungeon-gold)', textDecoration: 'underline', fontSize: '0.9rem', display: 'inline-block', marginTop: '8px' }}>
              Create your first character
            </Link>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {characters.map(char => (
            <Link key={char.id} href={`/character-sheet?id=${char.id}`} style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--dungeon-gold)' }}>{char.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--dungeon-text-muted)', marginTop: '4px' }}>
                {char.race} {char.class} — Level {char.level}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
