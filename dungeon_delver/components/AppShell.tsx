'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRollLog } from '../context/RollLogContext';
import { useRole, UserRole } from '../context/RoleContext';
import CommandPalette from './CommandPalette';
import { getActiveCampaign, getCampaigns, setActiveCampaign, createCampaign, type CampaignEntry } from '../utils/campaignStorage';

interface NavItem {
  href: string;
  label: string;
  role: 'both' | 'dm' | 'player';
  section: 'player' | 'dm' | 'content';
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', role: 'both', section: 'player' },
  { href: '/hub', label: 'Hub', role: 'both', section: 'player' },
  { href: '/character-sheet', label: 'Character', role: 'both', section: 'player' },
  { href: '/combat', label: 'Combat', role: 'both', section: 'player' },
  { href: '/dm', label: 'DM Hub', role: 'dm', section: 'dm' },
  { href: '/dm/obsidian', label: 'Obsidian', role: 'dm', section: 'dm' },
  { href: '/library', label: 'Library', role: 'both', section: 'content' },
  { href: '/party-stash', label: 'Stash', role: 'both', section: 'content' },
  { href: '/cards', label: 'Cards', role: 'both', section: 'content' },
  { href: '/handouts', label: 'Handouts', role: 'both', section: 'content' },
  { href: '/qr', label: 'QR Codes', role: 'both', section: 'content' },
  { href: '/notes', label: 'Notes', role: 'both', section: 'content' },
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
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
  const [activeCampaign, setActiveCampaignState] = useState(getActiveCampaign());
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');

  useEffect(() => { setCampaigns(getCampaigns()); }, []);

  const switchCampaign = (id: string) => {
    setActiveCampaign(id);
    setActiveCampaignState(id);
    window.location.reload();
  };

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) return;
    const entry = createCampaign(newCampaignName.trim());
    setCampaigns(getCampaigns());
    switchCampaign(entry.id);
  };

  const campaignLabel = campaigns.find(c => c.id === activeCampaign)?.name || 'Default Campaign';
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

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const filteredNav = NAV_ITEMS.filter(item => item.role === 'both' || item.role === role);
  const sections = ['player', 'dm', 'content'].filter(s => filteredNav.some(i => i.section === s)) as string[];

  const toggleRole = () => setRole(role === 'player' ? 'dm' : 'player');
  const otherRole: UserRole = role === 'player' ? 'dm' : 'player';

  const sidebarContent = (
    <>
      <div style={{ padding: '16px 16px 12px', fontFamily: 'serif', fontSize: '1.1rem', color: 'var(--dungeon-gold)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        {isMobile ? 'DD' : 'Dungeon Delver'}
      </div>

      {sections.map(section => {
        const items = filteredNav.filter(i => i.section === section);
        if (!items.length) return null;
        return (
          <div key={section} style={{ marginBottom: '8px' }}>
            {!isMobile && (
              <div style={{ padding: '4px 16px', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dungeon-text-dim)', fontWeight: 600 }}>
                {SECTION_LABELS[section]}
              </div>
            )}
            {items.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: isMobile ? '10px 16px' : '8px 16px',
                    color: active ? 'var(--dungeon-gold)' : 'var(--dungeon-text-light)',
                    textDecoration: 'none',
                    background: active ? 'rgba(184,134,11,0.15)' : 'transparent',
                    borderLeft: active ? '3px solid var(--dungeon-gold)' : '3px solid transparent',
                    fontSize: isMobile ? '0.95rem' : '0.85rem',
                    transition: 'background var(--dungeon-transition, 0.2s)',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}

      {/* Campaign selector */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--dungeon-border)' }}>
        <button onClick={() => setShowCampaignPicker(!showCampaignPicker)}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--dungeon-radius-sm, 4px)',
            background: 'rgba(99,102,241,0.1)', border: '1px solid var(--dungeon-border, #4a5568)',
            color: 'var(--dungeon-text, #e2e8f0)', cursor: 'pointer', fontSize: '0.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <span>📜 {campaignLabel}</span>
          <span style={{ fontSize: '0.6rem' }}>{showCampaignPicker ? '▲' : '▼'}</span>
        </button>
        {showCampaignPicker && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button onClick={() => switchCampaign('default')}
              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: activeCampaign === 'default' ? 'rgba(99,102,241,0.3)' : 'transparent', color: 'var(--dungeon-text)', cursor: 'pointer', fontSize: '0.7rem', textAlign: 'left' }}>
              📁 Default Campaign
            </button>
            {campaigns.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => switchCampaign(c.id)}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: 'none', background: activeCampaign === c.id ? 'rgba(99,102,241,0.3)' : 'transparent', color: 'var(--dungeon-text)', cursor: 'pointer', fontSize: '0.7rem', textAlign: 'left' }}>
                  📁 {c.name}
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <input value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)}
                placeholder="New campaign..."
                style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--dungeon-border)', background: 'var(--dungeon-bg)', color: 'var(--dungeon-text)', fontSize: '0.7rem' }} />
              <button onClick={handleCreateCampaign}
                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: 'var(--dungeon-accent)', color: 'white', cursor: 'pointer', fontSize: '0.7rem' }}>
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role toggle */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--dungeon-border)' }}>
        <button onClick={toggleRole}
          style={{
            width: '100%', padding: '8px', borderRadius: 'var(--dungeon-radius-sm, 4px)',
            background: role === 'dm' ? 'rgba(99,102,241,0.2)' : 'rgba(72,187,120,0.2)',
            border: `1px solid ${role === 'dm' ? 'var(--dungeon-accent, #6366f1)' : 'var(--dungeon-success, #48bb78)'}`,
            color: role === 'dm' ? 'var(--dungeon-accent, #6366f1)' : 'var(--dungeon-success, #48bb78)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          <span>{role === 'dm' ? '👑' : '🎮'}</span>
          {role === 'dm' ? 'DM Mode' : 'Player Mode'}
          <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>→ {otherRole === 'dm' ? 'DM' : 'Player'}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <CommandPalette />
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dungeon-bg)' }}>

        {/* Mobile hamburger */}
        {isMobile && (
          <>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                position: 'fixed', top: '12px', left: '12px', zIndex: 1001,
                width: '40px', height: '40px', borderRadius: 'var(--dungeon-radius-sm)',
                background: 'var(--dungeon-sidebar)', border: '1px solid var(--dungeon-border)',
                color: 'var(--dungeon-gold)', fontSize: '1.2rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {sidebarOpen ? '×' : '☰'}
            </button>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }}
              />
            )}
            <aside style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1000,
              width: '260px', background: 'var(--dungeon-sidebar)',
              borderRight: '1px solid var(--dungeon-border)',
              display: 'flex', flexDirection: 'column',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.2s ease-out',
              overflowY: 'auto',
            }}>
              {sidebarContent}
            </aside>
            {/* Bottom nav */}
            <nav style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
              background: 'var(--dungeon-sidebar)', borderTop: '1px solid var(--dungeon-border)',
              display: 'flex', justifyContent: 'space-around', padding: '4px 0',
            }}>
              {filteredNav.slice(0, 5).map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '6px 8px', color: active ? 'var(--dungeon-gold)' : 'var(--dungeon-text-dim)',
                      textDecoration: 'none', fontSize: '0.6rem', gap: '2px',
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{getNavIcon(item.href)}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside style={{
            width: isTablet ? '180px' : '200px',
            background: 'var(--dungeon-sidebar)',
            borderRight: '1px solid var(--dungeon-border)',
            display: 'flex', flexDirection: 'column',
            flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
            overflowY: 'auto',
          }}>
            {sidebarContent}
          </aside>
        )}

        {/* Main content */}
        <main style={{
          flex: 1, overflow: 'auto',
          paddingBottom: isMobile ? '56px' : '0',
          paddingTop: isMobile ? '60px' : '0',
        }}>
          {children}
        </main>

        {/* Dice log sidebar */}
        {showDice && !isMobile && (
          <aside style={{
            width: isTablet ? '220px' : '260px',
            background: 'var(--dungeon-sidebar)',
            borderLeft: '1px solid var(--dungeon-border)',
            padding: '16px', overflowY: 'auto', flexShrink: 0,
            display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ color: 'var(--dungeon-gold)', fontSize: '0.85rem' }}>Dice Log</strong>
              <button onClick={clearLog} style={{ fontSize: '0.65rem', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', cursor: 'pointer', padding: '2px 8px', borderRadius: '3px' }}>
                Clear
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {log.length === 0 && <p style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.8rem' }}>No rolls yet.</p>}
              {log.map((entry, i) => (
                <div key={i} style={{ marginBottom: '6px', padding: '6px 8px', background: 'var(--dungeon-panel)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--dungeon-text)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--dungeon-gold)', fontWeight: 600 }}>{entry.label || entry.source}</span>
                    <span style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.6rem' }}>{formatTime(entry.timestamp)}</span>
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    {entry.rolls.length ? `[${entry.rolls.join(', ')}]` : ''}
                    {entry.modifier !== 0 ? ` ${entry.modifier >= 0 ? '+' : ''}${entry.modifier}` : ''}
                    {entry.rolls.length > 0 && (
                      <>{' '}= <strong style={{ color: 'var(--dungeon-gold)' }}>{entry.total}</strong></>
                    )}
                  </div>
                  {entry.formula && <div style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.6rem', marginTop: '1px' }}>{entry.formula}</div>}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </aside>
        )}

        {/* Mobile dice log toggle */}
        {isMobile && (
          <button onClick={() => setShowDice(!showDice)}
            style={{
              position: 'fixed', bottom: '60px', right: '12px', zIndex: 100,
              width: '44px', height: '44px', borderRadius: '50%',
              background: showDice ? 'var(--dungeon-gold)' : 'var(--dungeon-panel)',
              border: '1px solid var(--dungeon-border)',
              color: 'white', fontSize: '1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🎲
          </button>
        )}

        {/* Mobile dice log sheet */}
        {showDice && isMobile && (
          <div style={{
            position: 'fixed', bottom: '56px', left: 0, right: 0, zIndex: 99,
            maxHeight: '40vh', background: 'var(--dungeon-sidebar)',
            borderTop: '1px solid var(--dungeon-border)',
            padding: '12px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ color: 'var(--dungeon-gold)', fontSize: '0.85rem' }}>Dice Log</strong>
              <button onClick={clearLog} style={{ fontSize: '0.65rem', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', cursor: 'pointer', padding: '2px 8px', borderRadius: '3px' }}>
                Clear
              </button>
            </div>
            {log.length === 0 && <p style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.8rem' }}>No rolls yet.</p>}
            {log.map((entry, i) => (
              <div key={i} style={{ marginBottom: '4px', padding: '6px 8px', background: 'var(--dungeon-panel)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--dungeon-text)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--dungeon-gold)', fontWeight: 600 }}>{entry.label || entry.source}</span>
                  <span style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.6rem' }}>{formatTime(entry.timestamp)}</span>
                </div>
                <div style={{ marginTop: '2px' }}>
                  {entry.rolls.length ? `[${entry.rolls.join(', ')}]` : ''}
                  {entry.modifier !== 0 ? ` ${entry.modifier >= 0 ? '+' : ''}${entry.modifier}` : ''}
                  {entry.rolls.length > 0 && <>{' '}= <strong style={{ color: 'var(--dungeon-gold)' }}>{entry.total}</strong></>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function getNavIcon(href: string): string {
  const icons: Record<string, string> = {
    '/': '⌂',
    '/hub': '◎',
    '/character-sheet': '🧙',
    '/combat': '⚔',
    '/dm': '👑',
    '/library': '📚',
    '/party-stash': '📦',
    '/cards': '🃏',
    '/handouts': '📝',
    '/qr': '📱',
    '/notes': '✎',
    '/dm/obsidian': '🔗',
  };
  return icons[href] || '•';
}
