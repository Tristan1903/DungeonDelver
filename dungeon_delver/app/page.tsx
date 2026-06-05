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

  const quickActions = role === 'dm'
    ? [
        { href: '/dm', label: 'DM Command Hub', desc: 'Campaign flow, storylines, subsystems', icon: '👑' },
        { href: '/character-sheet', label: 'Character Sheet', desc: 'View and manage characters', icon: '🧙' },
        { href: '/combat', label: 'Combat Tracker', desc: 'Run encounters and track initiative', icon: '⚔' },
        { href: '/party-stash', label: 'Party Stash', desc: 'Shared item pool', icon: '📦' },
      ]
    : [
        { href: '/hub', label: 'Player Hub', desc: 'Campaign overview and objectives', icon: '◎' },
        { href: '/character-sheet', label: 'Character Sheet', desc: 'Your character', icon: '🧙' },
        { href: '/combat', label: 'Combat Tracker', desc: 'Current encounter', icon: '⚔' },
        { href: '/party-stash', label: 'Party Stash', desc: 'Party inventory', icon: '📦' },
      ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}
        >
          {role === 'dm' ? 'DM Dashboard' : 'Dungeon Delver'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {role === 'dm'
            ? 'Campaign management, encounter tools, and world-building resources.'
            : 'Your local 5e companion for character management and adventuring.'}
        </p>
      </header>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {quickActions.map(action => (
          <Link key={action.href} href={action.href}
            className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(201,168,76,0.1)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{action.icon}</span>
              <span className="font-bold text-foreground group-hover:text-primary transition-colors">{action.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{action.desc}</p>
          </Link>
        ))}
      </section>

      {/* Divider */}
      <div className="rpg-divider mb-8" />

      {/* Characters */}
      <section>
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}
        >
          Characters ({characters.length})
        </h2>
        {characters.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground text-sm mb-2">No characters yet.</p>
            <Link href="/character-sheet" className="text-sm underline underline-offset-4 hover:text-primary transition-colors" style={{ color: '#c9a84c' }}>
              Create your first character
            </Link>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {characters.map(char => (
            <Link key={char.id} href={`/character-sheet?id=${char.id}`}
              className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(201,168,76,0.1)] transition-all duration-200 group"
            >
              <div className="font-bold text-base group-hover:text-primary transition-colors" style={{ color: '#c9a84c' }}>
                {char.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {char.race} {char.class} — Level {char.level}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
