// =============================================================================
// 📘 FILE: utils/zoneCombatEngine.ts
// =============================================================================
// 🎯 PURPOSE: Zone-based combat positioning system. Instead of a grid map,
//    combatants are placed in abstract zones (Melee, Near, Far). Provides
//    zone presets for different encounter types and loads pending encounters
//    from sessionStorage.
//
// 🧠 REACT CONCEPT: Abstract State Modeling
//    Zone combat simplifies positioning into discrete buckets rather than
//    exact coordinates. Each ZoneCombatant has a `zoneId` that determines
//    relative positioning. This is a form of "state normalization" —
//    instead of storing positions as x/y coordinates, we store a zone
//    reference and derive distance relationships from zone definitions.
//
//    sessionStorage is used here (not localStorage) because encounter
//    data is temporary — it should clear when the tab closes.
//
// 🔧 HOW TO ALTER:
//    - Add zone presets: add entries to ZONE_PRESETS
//    - Change encounter loading: modify loadPendingCombatants
//    - Change encounter clearing: modify clearPendingEncounter
// =============================================================================

export interface Zone {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface ZoneCombatant {
  id: string;
  name: string;
  isPc: boolean;
  zoneId: string;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: string[];
  initBonus: number;
  monsterData?: any;
}

// 🧠 ZONE_PRESETS: a record of named zone layouts for different encounter types.
//    Each preset defines a set of zones with names, descriptions, colors, and icons.
//    Components use these to render zone labels and allow drag-between-zones.
export const ZONE_PRESETS: Record<string, Zone[]> = {
  'melee-near-far': [
    { id: 'melee', name: 'Melee', description: 'Engaged in close combat', color: '#e53e3e', icon: '⚔' },
    { id: 'near', name: 'Near', description: 'Within 30-60 ft', color: '#dd6b20', icon: '→' },
    { id: 'far', name: 'Far', description: '60+ ft away', color: '#3182ce', icon: '↗' },
  ],
  'close-distant': [
    { id: 'close', name: 'Close', description: 'Adjacent or nearby', color: '#e53e3e', icon: '◉' },
    { id: 'distant', name: 'Distant', description: 'Far away', color: '#3182ce', icon: '◎' },
  ],
  'front-back': [
    { id: 'front', name: 'Front Line', description: 'At the front', color: '#c05621', icon: '🛡' },
    { id: 'middle', name: 'Middle', description: 'Mid ranks', color: '#d69e2e', icon: '▪' },
    { id: 'back', name: 'Back Line', description: 'Ranged / support', color: '#38a169', icon: '🏹' },
  ],
  'siege': [
    { id: 'walls', name: 'Walls', description: 'On the walls', color: '#718096', icon: '🏰' },
    { id: 'courtyard', name: 'Courtyard', description: 'Inside the fortification', color: '#a0aec0', icon: '⛺' },
    { id: 'gate', name: 'Gate', description: 'At the gate / breach', color: '#e53e3e', icon: '🚪' },
    { id: 'outside', name: 'Outside', description: 'Outside the walls', color: '#38a169', icon: '🌲' },
  ],
};

// 🧠 loadPendingCombatants: reads sessionStorage for a pending encounter
//    (pushed from the encounter builder page) and formats them as ZoneCombatants.
//    sessionStorage persists across page navigation but clears on tab close.
export function loadPendingCombatants(): { monsters: ZoneCombatant[]; pcs: ZoneCombatant[] } {
  const monsters: ZoneCombatant[] = [];
  const pcs: ZoneCombatant[] = [];

  try {
    const pending = sessionStorage.getItem('pendingEncounter');
    if (pending) {
      const parsed = JSON.parse(pending);
      const defaultZone = 'melee';
      (parsed.monsters || []).forEach((m: any) => {
        for (let i = 0; i < (m.count || 1); i++) {
          monsters.push({
            id: `${m.name?.replace(/\s+/g, '-')}-${Date.now()}-${i}`,
            name: m.count > 1 ? `${m.name} ${i + 1}` : m.name,
            isPc: false,
            zoneId: defaultZone,
            hp: m.hp || 10,
            maxHp: m.hp || 10,
            ac: m.ac || 10,
            conditions: [],
            initBonus: (m.dex ? Math.floor((m.dex - 10) / 2) : 0),
            monsterData: m,
          });
        }
      });
    }
  } catch {}

  try {
    const pendingPcs = sessionStorage.getItem('pendingPcCombatants');
    if (pendingPcs) {
      const parsed = JSON.parse(pendingPcs);
      (parsed || []).forEach((pc: any) => {
        pcs.push({
          id: pc.id || `pc-${Date.now()}-${Math.random()}`,
          name: pc.name || 'Unknown PC',
          isPc: true,
          zoneId: 'melee',
          hp: pc.hp?.current || pc.hp || 10,
          maxHp: pc.hp?.max || pc.hp || 10,
          ac: pc.ac || 10,
          conditions: [],
          initBonus: pc.initBonus || 0,
          monsterData: pc,
        });
      });
    }
  } catch {}

  return { monsters, pcs };
}

export function clearPendingEncounter(): void {
  sessionStorage.removeItem('pendingEncounter');
  sessionStorage.removeItem('pendingPcCombatants');
}
