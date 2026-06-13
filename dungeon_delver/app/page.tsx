// =============================================================================
// 📘 FILE: app/page.tsx
// =============================================================================
// 🎯 PURPOSE: The dashboard/home page — shows quick action cards (role-aware),
//    a list of saved characters, and a list of campaigns.
//
// 🧠 REACT CONCEPT: Client Component Page
//    In Next.js App Router, `page.tsx` is a SPECIAL filename. It defines the
//    content for the route `/`. This page uses 'use client' because it needs
//    hooks (useState, useEffect, useRole).
//
// 🧠 KEY PATTERNS demonstrated here:
//    1. Conditional rendering (role === 'dm' ? ... : ...)
//    2. useEffect for data loading on mount
//    3. Mapping over arrays to render lists (characters.map, campaigns.map)
//    4. Empty state handling (characters.length === 0 → "No characters yet.")
//    5. Reading from Context (useRole)
//    6. Reading from localStorage (character registry)
//
// 🔧 HOW TO ALTER:
//    - Change quick actions: modify the quickActions arrays for each role
//    - Change card styling: modify the className on the Link elements
//    - Add a new section: add it between the existing sections in the JSX
//    - Change what info shows for each character: modify the CharacterEntry interface
//      and where it's displayed
// =============================================================================

'use client';
import { useEffect, useState } from 'react';
// 🧠 useEffect — Runs side effects (like loading data) after the component renders.
//    Always specify a dependency array to control when it runs.
//
// 🧠 useState — Stores values that, when changed, cause the component to re-render.
//    The initial value is set ONCE on the first render.

import Link from 'next/link';
// Note: Link prefetches the page in the background for instant navigation.

import { useRole } from '../context/RoleContext';
import { loadCharFromLocal, CHAR_STORAGE_PREFIX } from '../utils/storageEngine';
import { scanAllCampaigns, CampaignOverview } from '../utils/campaignEngine';

// 🧠 Local interface just for the dashboard display — not the full Character type.
//    We extract only the fields we need for the list.
interface CharacterEntry {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
}

export default function Dashboard() {
  // 🧠 Using Context: gets the current user role (player or dm).
  //    The component re-renders when role changes.
  const { role } = useRole();

  // 🧠 useState with EMPTY ARRAY initial value.
  //    This means "start with no characters, then load them."
  //    The TypeScript type <CharacterEntry[]> tells TS this will be an array
  //    of CharacterEntry objects.
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOverview[]>([]);

  // 🧠 scanAllChars() — Fallback function that iterates ALL localStorage keys
  //    and picks out ones starting with the character prefix.
  //    This is used as a fallback if the registry approach fails.
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

  // 🧠 useEffect with [] — runs ONCE on mount.
  //    It reads the character registry from localStorage and loads each character.
  //    Registry is an array of { id, name } entries — faster than scanning all keys.
  //
  //    🧠 Pattern: try/catch around localStorage operations.
  //    localStorage can throw (private browsing, storage full, etc.).
  //    Always wrap in try/catch for robustness.
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

  // 🧠 Separate useEffect for campaigns — also runs once on mount.
  useEffect(() => {
    try { setCampaigns(scanAllCampaigns()); } catch { /* noop */ }
  }, []);

  // 🧠 CONDITIONAL RENDERING: Different quick actions for DM vs Player.
  //    The ternary operator (condition ? A : B) is used extensively in React
  //    to show different UI based on conditions.
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

  // ============================================================
  // RENDER (what the user sees)
  // ============================================================

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* 🧠 HEADER — Simple page header with title and subtitle.
           Uses `role === 'dm' ? ... : ...` to show different titles. */}
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

      {/* 🧠 QUICK ACTIONS — Grid of clickable cards.
           Uses .map() to loop over the quickActions array and render each as a Link.
           The `key` prop is on the Link (not shown here since action.href is unique).
           
           🧠 Pattern: Responsive grid with Tailwind:
           grid-cols-1 (mobile) → sm:grid-cols-2 (tablet) → lg:grid-cols-4 (desktop) */}
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

      {/* RPG-themed divider */}
      <div className="rpg-divider mb-8" />

      {/* 🧠 CHARACTERS SECTION — Shows saved characters or "empty state."
           Empty state pattern: characters.length === 0 → prompt to create one.
           Otherwise, render a grid of character cards.
           
           🧠 Benefit of early return: The empty state uses if/return pattern
           to show a centered message when no characters exist. */}
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
          {/* 🧠 .map() — loops through the characters array and renders a card for each.
               The `key` prop is CRITICAL for React's diffing algorithm (reconciliation).
               It MUST be a unique, stable identifier. Using char.id is perfect.
               WITHOUT a proper key, React will re-render ALL items when one changes,
               causing performance issues and bugs with state. */}
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

      {/* 🧠 CAMPAIGNS SECTION — Same pattern as characters. */}
      <section className="mt-8">
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}
        >
          Campaigns ({campaigns.length})
        </h2>
        {campaigns.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground text-sm mb-2">No campaigns yet.</p>
            <Link href="/dm/campaigns" className="text-sm underline underline-offset-4 hover:text-primary transition-colors" style={{ color: '#c9a84c' }}>
              Create your first campaign
            </Link>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaigns.map(campaign => (
            <Link key={campaign.id} href="/dm/campaigns"
              className={`block bg-card border rounded-lg p-4 transition-all duration-200 group relative ${campaign.isActive ? 'border-primary/60' : 'border-border hover:border-primary/40 hover:shadow-[0_0_12px_rgba(201,168,76,0.1)]'}`}
            >
              {campaign.isActive && (
                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-primary font-semibold">Active</span>
              )}
              <div className="font-bold text-base group-hover:text-primary transition-colors" style={{ color: '#c9a84c' }}>
                {campaign.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {campaign.toneTheme && <div>Tone: {campaign.toneTheme}</div>}
                <div>{campaign.enabledModuleCount} module{campaign.enabledModuleCount !== 1 ? 's' : ''} · {campaign.characterCount} character{campaign.characterCount !== 1 ? 's' : ''}</div>
                <div>Starting level {campaign.startingLevel} · {campaign.restVariant}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
