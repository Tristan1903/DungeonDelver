// =============================================================================
// 📘 FILE: components/AppShell.tsx
// =============================================================================
// 🎯 PURPOSE: The main application shell — provides sidebar navigation, campaign
//    selector, role toggle (Player/DM), dice roll log panel, and responsive
//    layouts (mobile hamburger, tablet condensed, desktop full).
//
// 🧠 REACT CONCEPT: Layout Composition (the "Shell" Pattern)
//    AppShell is the PERMANENT frame around all page content. It:
//    1. Reads contexts (useRole, useRollLog) to control what to show
//    2. Manages UI state (sidebar open/closed, dice log visible)
//    3. Provides navigation links
//    4. Renders the dice roll log panel
//
//    The key insight: AppShell wraps `{children}` which is the page content.
//    Navigation changes children, but AppShell stays mounted. This means
//    the sidebar doesn't re-render when you navigate — only the page content
//    changes.
//
// 🧠 REACT CONCEPT: Responsive Design with useState + useEffect
//    React doesn't have built-in responsive breakpoints. This file uses a
//    custom `useBreakpoint` hook that listens to window resize events and
//    updates state. The component re-renders at different widths to show
//    different layouts (hamburger menu vs sidebar).
//
// 🔧 HOW TO ALTER:
//    - Add/remove nav items: edit the NAV_ITEMS array
//    - Change sidebar width: modify the w-[200px] / w-[180px] classes
//    - Change dice log max entries: edit the .slice(0, 100) in RollLogContext
//    - Change breakpoints: modify the 768/1024 numbers in useBreakpoint calls
//    - Restyle the sidebar: modify the className objects
// =============================================================================

'use client';
import { useState, useEffect, useRef } from 'react';
// 🧠 useRef — Creates a MUTABLE reference that persists across renders.
//    Unlike state, changing a ref does NOT cause a re-render.
//    Used here to reference the dice log scroll container so we can
//    auto-scroll to the bottom when new rolls come in.

import Link from 'next/link';
// 🧠 Link — Next.js optimized navigation component.
//    Unlike <a href="...">, Link prefetches the linked page in the background
//    and does client-side navigation without a full page reload.

import { usePathname } from 'next/navigation';
// 🧠 usePathname — A hook that returns the current URL path.
//    Used here to highlight the active nav item.
//    When the pathname changes (user navigates), this hook triggers a
//    re-render of just the nav items (not the whole app).

import { useRollLog } from '../context/RollLogContext';
import { useRole, UserRole } from '../context/RoleContext';
import { useLanSync } from '../context/LanSyncContext';
import CommandPalette from './CommandPalette';
import { getActiveCampaign, getCampaigns, type CampaignEntry } from '../utils/campaignStorage';
import { cn } from '../lib/utils';

// 🧠 NavItem — Type for navigation link entries.
interface NavItem {
  href: string;       // URL path (e.g., '/hub')
  label: string;      // Display name (e.g., 'Hub')
  role: 'both' | 'dm' | 'player';  // Who can see this link
  section: 'player' | 'dm' | 'content';  // Section grouping in sidebar
  icon: string;       // Emoji icon
}

// 🧠 NAV_ITEMS — Array of navigation links. This is the SOURCE OF TRUTH for
//    the sidebar navigation. Add a new page here and it appears in the nav.
//
//    The `section` property groups links visually in the sidebar:
//    - 'player' = Player Tools (Home, Hub, Character, Combat)
//    - 'dm' = DM Tools (DM Hub, Obsidian, Campaigns)
//    - 'content' = Content (Library, Stash, Cards, etc.)
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', role: 'both', section: 'player', icon: '⌂' },
  { href: '/hub', label: 'Hub', role: 'both', section: 'player', icon: '◎' },
  { href: '/character-sheet', label: 'Character', role: 'both', section: 'player', icon: '🧙' },
  { href: '/combat', label: 'Combat', role: 'both', section: 'player', icon: '⚔' },
  { href: '/join', label: 'Join', role: 'both', section: 'player', icon: '🔌' },
  { href: '/play', label: 'Play', role: 'both', section: 'player', icon: '🎮' },
  { href: '/dm', label: 'DM Hub', role: 'dm', section: 'dm', icon: '👑' },
  { href: '/dm/obsidian', label: 'Obsidian', role: 'dm', section: 'dm', icon: '🔗' },
  { href: '/dm/campaigns', label: 'Campaigns', role: 'dm', section: 'dm', icon: '📜' },
  { href: '/lan', label: 'LAN Session', role: 'both', section: 'dm', icon: '🌐' },
  { href: '/library', label: 'Library', role: 'both', section: 'content', icon: '📚' },
  { href: '/party-stash', label: 'Stash', role: 'both', section: 'content', icon: '📦' },
  { href: '/cards', label: 'Cards', role: 'both', section: 'content', icon: '🃏' },
  { href: '/handouts', label: 'Handouts', role: 'both', section: 'content', icon: '📝' },
  { href: '/qr', label: 'QR Codes', role: 'both', section: 'content', icon: '📱' },
  { href: '/notes', label: 'Notes', role: 'both', section: 'content', icon: '✎' },
];

const SECTION_LABELS: Record<string, string> = {
  player: 'Player Tools',
  dm: 'DM Tools',
  content: 'Content',
};

// 🧠 CUSTOM HOOK: useBreakpoint(breakpoint)
//    Tracks whether the window is narrower than a given width.
//    - Initializes state with false
//    - On mount, checks actual window width
//    - Adds a resize listener that checks on every resize
//    - Cleans up the listener on unmount
//
//    💡 Pattern: Every custom hook that uses useEffect for browser APIs
//    should clean up after itself. Otherwise, listeners accumulate and
//    cause memory leaks or stale behavior.
function useBreakpoint(breakpoint: number): boolean {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const check = () => setIsSmall(window.innerWidth < breakpoint);
    check();  // Run immediately on mount
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isSmall;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// 🧠 AppShell — The main layout component.
//    It receives `children` (the current page) and renders the sidebar,
//    main content area, and dice log panel.
export default function AppShell({ children }: { children: React.ReactNode }) {
  // 🧠 usePathname() — Current URL path. Updates on navigation.
  const pathname = usePathname();
  // 🧠 useRollLog() — Dice roll log from context (latest 100 rolls).
  const { log, clearLog } = useRollLog();
  // 🧠 useRole() — Current role and setter.
  const { role, setRole } = useRole();
  // 🧠 useLanSync() — LAN session connection status.
  const lan = useLanSync();

  // 🧠 Local UI state:
  const [_campaigns, _setCampaigns] = useState<CampaignEntry[]>([]);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [showDice, setShowDice] = useState(true);       // Dice log visibility
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const logEndRef = useRef<HTMLDivElement>(null);        // Scroll anchor for dice log
  const isMobile = useBreakpoint(768);                    // < 768px = mobile
  const isTablet = useBreakpoint(1024);                   // < 1024px = tablet
  const isVerySmall = useBreakpoint(400);                 // < 400px = very small                   // < 1024px = tablet

  // 🧠 useEffect: Restore dice log visibility + campaign data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dd-show-dice-log');
      if (saved === 'false') setShowDice(false);
    } catch { /* noop */ }
    const campaigns = getCampaigns();
    _setCampaigns(campaigns);
    const id = getActiveCampaign();
    const name = id ? (campaigns.find(c => c.id === id)?.name ?? null) : null;
    setActiveName(name);
  }, []);

  // 🧠 useEffect: Save dice log visibility to localStorage when it changes
  useEffect(() => {
    try { localStorage.setItem('dd-show-dice-log', showDice ? 'true' : 'false'); } catch { /* noop */ }
  }, [showDice]);

  // 🧠 useEffect: Auto-scroll dice log to bottom when new entries arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // 🧠 useEffect: Close sidebar when navigating (on mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // 🧠 Derived data — computed on every render:
  const filteredNav = NAV_ITEMS.filter(item => item.role === 'both' || item.role === role);
  const sections = ['player', 'dm', 'content'].filter(s => filteredNav.some(i => i.section === s)) as string[];

  const toggleRole = () => setRole(role === 'player' ? 'dm' : 'player');
  const otherRole: UserRole = role === 'player' ? 'dm' : 'player';

  // 🧠 sidebarContent — Extracted so it can be used in BOTH mobile drawer
  //    AND desktop sidebar without duplicating code. This is the "DRY"
  //    (Don't Repeat Yourself) principle.
  const sidebarContent = (
    <>
      {/* Branding */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-wide" style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}>
          {isMobile ? 'DD' : 'Dungeon Delver'}
        </h1>
        {!isMobile && (
          <p className="text-[0.6rem] text-muted-foreground mt-0.5 tracking-widest uppercase">
            D&D 5e Companion
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map(section => {
          const items = filteredNav.filter(i => i.section === section);
          if (!items.length) return null;
          return (
            <div key={section} className="mb-3">
              {!isMobile && (
                <div className="px-3 py-1 text-[0.6rem] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  {SECTION_LABELS[section]}
                </div>
              )}
              {items.map(item => {
                // 🧠 Active link detection:
                //    - Exact match for '/' (home)
                //    - Starts-with match for other paths (e.g., '/dm' matches '/dm/campaigns')
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150",
                      active
                        ? "bg-primary/15 text-primary border-l-2 border-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-2 border-transparent"
                    )}
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Campaign indicator + Auth status + Role toggle */}
      <div className="px-3 pb-4 border-t border-border pt-3 flex flex-col gap-2">
        {activeName && (
          <div style={{ fontSize: '0.65rem', color: '#5a5248', textAlign: 'center', padding: '2px 0' }}>
            📜 {activeName}
          </div>
        )}
        {lan.isActive && (
          <div style={{ fontSize: '0.65rem', color: '#16a34a', textAlign: 'center', padding: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            LAN: {lan.room} ({lan.role})
          </div>
        )}
        <button onClick={toggleRole}
          className={cn(
            "w-full py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 border transition-all",
            role === 'dm'
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
          )}>
          <span>{role === 'dm' ? '👑' : '🎮'}</span>
          {role === 'dm' ? 'DM Mode' : 'Player Mode'}
          <span className="text-[0.6rem] opacity-60">→ {otherRole === 'dm' ? 'DM' : 'Player'}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 🧠 CommandPalette — Always rendered, shows/hides via keyboard shortcut (Ctrl+K).
           It's positioned fixed, so it overlays everything. */}
      <CommandPalette />
      <div className="flex min-h-screen bg-background">

        {/* ─── MOBILE: Hamburger menu ─── */}
        {isMobile && (
          <>
            {/* Hamburger button (fixed top-left) */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="safe-area-top fixed top-3 left-3 z-[1001] w-10 h-10 rounded-md bg-sidebar border border-border text-primary flex items-center justify-center hover:bg-muted transition-colors">
              {sidebarOpen ? '×' : '☰'}
            </button>

            {/* 🧠 Overlay backdrop — clicking it closes the sidebar.
                `fixed inset-0` covers the entire screen.
                `z-[999]` is below the sidebar (z-[1000]). */}
            {sidebarOpen && (
              <div onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-[999]" />
            )}

            {/* 🧠 Slide-out drawer — transitions from left (-translate-x-full).
                Uses `transition-transform duration-200` for smooth animation. */}
            <aside className={cn(
              "fixed top-0 left-0 bottom-0 z-[1000] w-64 bg-sidebar border-r border-border flex flex-col overflow-y-auto transition-transform duration-200",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
              {sidebarContent}
            </aside>

            {/* Mobile bottom navigation — shows first 5 items */}
            <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-[100] bg-sidebar border-t border-border flex justify-around py-1 px-2">
              {filteredNav.slice(0, isVerySmall ? 4 : 5).map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      "flex flex-col items-center px-2 py-1.5 text-[0.6rem] gap-0.5 transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}>
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* ─── DESKTOP: Persistent sidebar ─── */}
        {!isMobile && (
          <aside className={cn(
            "bg-sidebar border-r border-border flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto",
            isTablet ? "w-[180px]" : "w-[200px]"
          )}>
            {sidebarContent}
          </aside>
        )}

        {/* ─── MAIN CONTENT AREA ─── */}
        {/* 🧠 The `flex-1` makes this fill all remaining horizontal space.
            `overflow-auto` enables scrolling within the main area.
            Mobile gets padding-top (for hamburger) and padding-bottom (for bottom nav). */}
        <main className={cn(
          "flex-1 overflow-auto",
          isMobile ? "pb-14 pt-14" : "pb-0 pt-0"
        )}>
          {children}
        </main>

        {/* ─── DESKTOP: Dice log panel ─── */}
        {showDice && !isMobile && (
          <aside className={cn(
            "bg-sidebar border-l border-border p-4 overflow-y-auto flex-shrink-0 flex flex-col h-screen sticky top-0",
            isTablet ? "w-[220px]" : "w-[260px]"
          )}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold" style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}>
                Dice Log
              </h3>
              <div className="flex gap-1.5">
                <button onClick={clearLog}
                  className="text-[0.65rem] bg-transparent border border-border text-muted-foreground px-2 py-0.5 rounded hover:text-foreground transition-colors">
                  Clear
                </button>
                <button onClick={() => setShowDice(false)}
                  className="text-[0.65rem] bg-transparent border border-border text-muted-foreground px-2 py-0.5 rounded hover:text-foreground transition-colors">
                  Hide
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {log.length === 0 && (
                <p className="text-muted-foreground text-xs italic">No rolls yet.</p>
              )}
              {log.map((entry, i) => (
                <div key={i} className="mb-1.5 p-2 bg-card rounded-md text-xs border border-border">
                  <div className="flex justify-between items-start">
                    <span className="font-bold" style={{ color: '#c9a84c' }}>{entry.label || entry.source}</span>
                    <span className="text-muted-foreground text-[0.6rem]">{formatTime(entry.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-foreground">
                    {entry.rolls.length ? `[${entry.rolls.join(', ')}]` : ''}
                    {entry.modifier !== 0 ? ` ${entry.modifier >= 0 ? '+' : ''}${entry.modifier}` : ''}
                    {entry.rolls.length > 0 && (
                      <>{' '}= <strong style={{ color: '#c9a84c' }}>{entry.total}</strong></>
                    )}
                  </div>
                  {entry.formula && (
                    <div className="text-muted-foreground text-[0.6rem] mt-0.5">{entry.formula}</div>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </aside>
        )}

        {/* ─── MOBILE: Dice log toggle button + sheet ─── */}
        {isMobile && (
          <button onClick={() => setShowDice(!showDice)}
            className={cn(
              "fixed bottom-16 right-3 z-[102] w-11 h-11 rounded-full flex items-center justify-center border border-border transition-all shadow-lg",
              showDice ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
            )}>
            🎲
          </button>
        )}

        {showDice && isMobile && (
          <div className="fixed bottom-14 left-0 right-0 z-[101] max-h-[40vh] bg-sidebar border-t border-border p-3 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold" style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}>
                Dice Log
              </h3>
              <button onClick={clearLog}
                className="text-[0.65rem] bg-transparent border border-border text-muted-foreground px-2 py-0.5 rounded hover:text-foreground transition-colors">
                Clear
              </button>
            </div>
            {log.length === 0 && (
              <p className="text-muted-foreground text-xs italic">No rolls yet.</p>
            )}
            {log.map((entry, i) => (
              <div key={i} className="mb-1 p-2 bg-card rounded-md text-xs border border-border">
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: '#c9a84c' }}>{entry.label || entry.source}</span>
                  <span className="text-muted-foreground text-[0.6rem]">{formatTime(entry.timestamp)}</span>
                </div>
                <div className="mt-1">
                  {entry.rolls.length ? `[${entry.rolls.join(', ')}]` : ''}
                  {entry.modifier !== 0 ? ` ${entry.modifier >= 0 ? '+' : ''}${entry.modifier}` : ''}
                  {entry.rolls.length > 0 && <>{' '}= <strong style={{ color: '#c9a84c' }}>{entry.total}</strong></>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
