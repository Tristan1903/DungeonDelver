export interface PaletteEntry {
  id: string;
  label: string;
  description?: string;
  category: 'page' | 'character' | 'spell' | 'item' | 'monster';
  route: string;
  keywords: string[];
}

const STATIC_PAGES: PaletteEntry[] = [
  { id: '/', label: 'Home', description: 'Dashboard', category: 'page', route: '/', keywords: ['home', 'dashboard', 'index'] },
  { id: '/hub', label: 'Campaign Hub', description: 'Quest overview and campaign progress', category: 'page', route: '/hub', keywords: ['hub', 'campaign', 'quest'] },
  { id: '/combat', label: 'Combat Tracker', description: 'Manage combat encounters', category: 'page', route: '/combat', keywords: ['combat', 'fight', 'encounter', 'battle'] },
  { id: '/character-sheet', label: 'Character Sheet', description: 'View and edit characters', category: 'page', route: '/character-sheet', keywords: ['character', 'sheet', 'stats', 'pc'] },
  { id: '/library', label: 'Content Library', description: 'Browse spells, items, monsters', category: 'page', route: '/library', keywords: ['library', 'content', 'browse', 'spells', 'items', 'monsters'] },
  { id: '/party-stash', label: 'Party Stash', description: 'Shared item pool', category: 'page', route: '/party-stash', keywords: ['stash', 'party', 'items', 'pool'] },
  { id: '/notes', label: 'Notes', description: 'Player messages and notes', category: 'page', route: '/notes', keywords: ['notes', 'messages'] },
  { id: '/dm', label: 'DM Hub', description: 'All DM tools', category: 'page', route: '/dm', keywords: ['dm', 'hub', 'dungeon master', 'gm'] },
  { id: '/dm/party', label: 'Party Management', description: 'Manage player characters', category: 'page', route: '/dm/party', keywords: ['dm party', 'party management', 'pc'] },
  { id: '/dm/npcs', label: 'NPC Generator', description: 'Procedural NPC creation', category: 'page', route: '/dm/npcs', keywords: ['npc', 'generator', 'character'] },
  { id: '/dm/influence', label: 'Influence & Social', description: 'Social interaction tracker', category: 'page', route: '/dm/influence', keywords: ['influence', 'social', 'disposition', 'reaction'] },
  { id: '/dm/tables', label: 'Random Tables', description: 'Roll on random tables', category: 'page', route: '/dm/tables', keywords: ['table', 'random', 'roll'] },
  { id: '/dm/monsters', label: 'Monster Manager', description: 'Browse and manage monsters', category: 'page', route: '/dm/monsters', keywords: ['monster', 'bestiary', 'creature'] },
  { id: '/dm/screen', label: 'DM Screen', description: 'Quick reference and rules', category: 'page', route: '/dm/screen', keywords: ['dm screen', 'reference', 'rules'] },
  { id: '/dm/session', label: 'Session Prep', description: 'Prepare encounters and sessions', category: 'page', route: '/dm/session', keywords: ['session', 'prep', 'encounter'] },
  { id: '/dm/zone-combat', label: 'Zone Combat', description: 'Zone-based combat tracker', category: 'page', route: '/dm/zone-combat', keywords: ['zone', 'combat', 'area'] },
  { id: '/dm/quests', label: 'Quest Tracker', description: 'Quest and storyline management', category: 'page', route: '/dm/quests', keywords: ['quest', 'storyline', 'journal'] },
  { id: '/dm/journal', label: 'Lore & Journal', description: 'Campaign lore and notes', category: 'page', route: '/dm/journal', keywords: ['journal', 'lore', 'notes'] },
  { id: '/dm/items', label: 'Magic Items', description: 'Assign and obscure magic items', category: 'page', route: '/dm/items', keywords: ['magic items', 'obscure', 'identify'] },
  { id: '/dm/homebrew', label: 'Homebrew Editor', description: 'Create custom content', category: 'page', route: '/dm/homebrew', keywords: ['homebrew', 'custom', 'editor'] },
  { id: '/dm/calendar', label: 'World Calendar', description: 'Track in-game time and events', category: 'page', route: '/dm/calendar', keywords: ['calendar', 'time', 'events', 'date'] },
  { id: '/dm/sync', label: 'Multi-User Sync', description: 'Synchronize game state', category: 'page', route: '/dm/sync', keywords: ['sync', 'multiplayer', 'websocket'] },
  { id: '/dm/modules', label: 'Campaign Modules', description: 'Optional subsystem config', category: 'page', route: '/dm/modules', keywords: ['modules', 'campaign', 'subsystem'] },
];

const RECENT_KEY = 'dd-palette-recent';
const MAX_RECENT = 10;

export function getStaticPages(): PaletteEntry[] {
  return STATIC_PAGES;
}

export function getCharacters(): PaletteEntry[] {
  const chars: PaletteEntry[] = [];
  try {
    const registryRaw = localStorage.getItem('dungeon-delver-character-registry');
    if (registryRaw) {
      const registry = JSON.parse(registryRaw);
      if (Array.isArray(registry)) {
        for (const entry of registry) {
          chars.push({
            id: `char-${entry.path || entry.name}`,
            label: entry.name,
            description: `${entry.class || '?'} ${entry.race || '?'} — Level ${entry.level || 1}`,
            category: 'character',
            route: `/character-sheet?id=${entry.id || entry.name}`,
            keywords: [entry.name, entry.class || '', entry.race || ''].filter(Boolean),
          });
        }
      }
    }
  } catch { /* noop */ }
  return chars;
}

export async function buildSpellEntries(): Promise<PaletteEntry[]> {
  const { DataEngine } = await import('./dataLoader');
  try {
    const spells = await DataEngine.getSpells();
    return spells.map((s: any) => ({
      id: `spell-${s.name}`,
      label: s.name,
      description: `${s.level === 0 ? 'Cantrip' : `Level ${s.level}`} ${s.school || ''}`.trim(),
      category: 'spell' as const,
      route: `/library?tab=spells&q=${encodeURIComponent(s.name)}`,
      keywords: [s.name, s.school || '', `${s.level}`, ...(s.tags || [])],
    }));
  } catch {
    return [];
  }
}

export async function buildItemEntries(): Promise<PaletteEntry[]> {
  const { DataEngine } = await import('./dataLoader');
  try {
    const items = await DataEngine.getItems();
    return items.map((item: any) => ({
      id: `item-${item.name}`,
      label: item.name,
      description: item.type || item.rarity || 'Item',
      category: 'item' as const,
      route: `/library?tab=items&q=${encodeURIComponent(item.name)}`,
      keywords: [item.name, item.type || '', item.rarity || '', item.source || ''],
    }));
  } catch {
    return [];
  }
}

export async function buildMonsterEntries(): Promise<PaletteEntry[]> {
  const { DataEngine } = await import('./dataLoader');
  try {
    const monsters = await DataEngine.getBestiary();
    return (monsters || []).slice(0, 500).map((m: any) => ({
      id: `monster-${m.name}`,
      label: m.name,
      description: `${m.type || ''} ${m.cr ? `CR ${m.cr}` : ''}`.trim(),
      category: 'monster' as const,
      route: `/library?tab=monsters&q=${encodeURIComponent(m.name)}`,
      keywords: [m.name, m.type || '', `${m.cr || ''}`, ...(Array.isArray(m.type) ? m.type : [])],
    }));
  } catch {
    return [];
  }
}

export function searchEntries(query: string, entries: PaletteEntry[]): PaletteEntry[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter(e =>
    e.label.toLowerCase().includes(q) ||
    e.keywords.some(k => k.toLowerCase().includes(q))
  );
}

export function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveRecentId(id: string): void {
  try {
    const recent = loadRecentIds().filter(r => r !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* noop */ }
}
