'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRollLog } from '../context/RollLogContext';
import { useRole, UserRole } from '../context/RoleContext';
import CommandPalette from './CommandPalette';
import { getActiveCampaign, getCampaigns } from '../utils/campaignStorage';
import { cn } from '../lib/utils';

interface NavItem {
  href: string;
  label: string;
  role: 'both' | 'dm' | 'player';
  section: 'player' | 'dm' | 'content';
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', role: 'both', section: 'player', icon: '⌂' },
  { href: '/hub', label: 'Hub', role: 'both', section: 'player', icon: '◎' },
  { href: '/character-sheet', label: 'Character', role: 'both', section: 'player', icon: '🧙' },
  { href: '/combat', label: 'Combat', role: 'both', section: 'player', icon: '⚔' },
  { href: '/dm', label: 'DM Hub', role: 'dm', section: 'dm', icon: '👑' },
  { href: '/dm/obsidian', label: 'Obsidian', role: 'dm', section: 'dm', icon: '🔗' },
  { href: '/dm/campaigns', label: 'Campaigns', role: 'dm', section: 'dm', icon: '📜' },
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

function useBreakpoint(breakpoint: number): boolean {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const check = () => setIsSmall(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isSmall;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { log, clearLog } = useRollLog();
  const { role, setRole } = useRole();
  const [_campaigns, _setCampaigns] = useState(getCampaigns());
  const activeId = getActiveCampaign();
  const activeName = activeId ? _campaigns.find(c => c.id === activeId)?.name : null;
  const [showDice, setShowDice] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useBreakpoint(768);
  const isTablet = useBreakpoint(1024);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dd-show-dice-log');
      if (saved === 'false') setShowDice(false);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('dd-show-dice-log', showDice ? 'true' : 'false'); } catch { /* noop */ }
  }, [showDice]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const filteredNav = NAV_ITEMS.filter(item => item.role === 'both' || item.role === role);
  const sections = ['player', 'dm', 'content'].filter(s => filteredNav.some(i => i.section === s)) as string[];

  const toggleRole = () => setRole(role === 'player' ? 'dm' : 'player');
  const otherRole: UserRole = role === 'player' ? 'dm' : 'player';

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

      {/* Campaign indicator + Role toggle */}
      <div className="px-3 pb-4 border-t border-border pt-3 flex flex-col gap-2">
        {activeName && (
          <div style={{ fontSize: '0.65rem', color: '#5a5248', textAlign: 'center', padding: '2px 0' }}>
            📜 {activeName}
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
      <CommandPalette />
      <div className="flex min-h-screen bg-background">

        {/* Mobile hamburger */}
        {isMobile && (
          <>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="fixed top-3 left-3 z-[1001] w-10 h-10 rounded-md bg-sidebar border border-border text-primary flex items-center justify-center hover:bg-muted transition-colors">
              {sidebarOpen ? '×' : '☰'}
            </button>
            {sidebarOpen && (
              <div onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-[999]" />
            )}
            <aside className={cn(
              "fixed top-0 left-0 bottom-0 z-[1000] w-64 bg-sidebar border-r border-border flex flex-col overflow-y-auto transition-transform duration-200",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
              {sidebarContent}
            </aside>
            {/* Bottom nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-100 bg-sidebar border-t border-border flex justify-around py-1 px-2">
              {filteredNav.slice(0, 5).map(item => {
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

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className={cn(
            "bg-sidebar border-r border-border flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto",
            isTablet ? "w-[180px]" : "w-[200px]"
          )}>
            {sidebarContent}
          </aside>
        )}

        {/* Main content */}
        <main className={cn(
          "flex-1 overflow-auto",
          isMobile ? "pb-14 pt-14" : "pb-0 pt-0"
        )}>
          {children}
        </main>

        {/* Dice log sidebar */}
        {showDice && !isMobile && (
          <aside className={cn(
            "bg-sidebar border-l border-border p-4 overflow-y-auto flex-shrink-0 flex flex-col h-screen sticky top-0",
            isTablet ? "w-[220px]" : "w-[260px]"
          )}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold" style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c' }}>
                Dice Log
              </h3>
              <button onClick={clearLog}
                className="text-[0.65rem] bg-transparent border border-border text-muted-foreground px-2 py-0.5 rounded hover:text-foreground transition-colors">
                Clear
              </button>
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

        {/* Mobile dice log toggle */}
        {isMobile && (
          <button onClick={() => setShowDice(!showDice)}
            className={cn(
              "fixed bottom-16 right-3 z-100 w-11 h-11 rounded-full flex items-center justify-center border border-border transition-all shadow-lg",
              showDice ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
            )}>
            🎲
          </button>
        )}

        {/* Mobile dice log sheet */}
        {showDice && isMobile && (
          <div className="fixed bottom-14 left-0 right-0 z-[99] max-h-[40vh] bg-sidebar border-t border-border p-3 overflow-y-auto flex flex-col">
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
