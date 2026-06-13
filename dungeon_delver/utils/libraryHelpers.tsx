// =============================================================================
// 📘 FILE: utils/libraryHelpers.tsx
// =============================================================================
// 🎯 PURPOSE: Formatting and rendering helpers for the Library browser pages
//    (items, spells, monsters, features). Contains school name lookups,
//    monster type labels, CR/Speed/AC formatters, component/duration display,
//    item type classification, monster type colors/emojis, and a recursive
//    entry renderer for 5eTools data structures.
//
// 🧠 REACT CONCEPT: Utility Functions + JSX Renderers
//    This file mixes pure formatting functions (getSchoolName, formatCR) with
//    a JSX component (renderEntries). The renderEntries function is a RECURSIVE
//    component — it calls itself to render nested data structures (lists within
//    lists, tables, etc.).
//
//    The ITEM_TYPE_LABELS and MONSTER_TYPE_COLORS are CONSTANT maps used by
//    components for display — they're "configuration as data" just like
//    campaignEngine.ts.
//
// 🔧 HOW TO ALTER:
//    - Add school codes: modify SCHOOL_NAMES
//    - Add item types: modify ITEM_TYPE_LABELS
//    - Add monster type colors: modify MONSTER_TYPE_COLORS
//    - Change entry rendering: modify renderEntries
//    - Change display formats: modify formatSpeed, formatAC, etc.
// =============================================================================

import { cleanString } from './formatters';

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// 🧠 SCHOOL_NAMES: maps short spell school codes to full names.
//    5eTools data uses single-letter codes (A, C, D, E, etc.) for schools.
//    Note: there are multiple codes that map to the same school
//    (e.g. 'V' and 'Evo' both mean Evocation).
export const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  Evo: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation',
  V: 'Evocation', En: 'Enchantment', Ab: 'Abjuration', Con: 'Conjuration',
  Div: 'Divination', Ill: 'Illusion', Nec: 'Necromancy',
};

export function getSchoolName(code: string): string {
  if (!code) return '—';
  const upper = code.toUpperCase();
  if (upper === 'V') return 'Evocation';
  return SCHOOL_NAMES[upper] || upper;
}

// 🧠 Monster formatting helpers — handle the varied data shapes from 5eTools.
//    Monster `type` can be a string, an object, or an object with `choose`.
export function getTypeLabel(monster: any): string {
  const t = monster.type;
  if (typeof t === 'string') return t;
  if (!t) return 'unknown';
  const typeVal = t.type;
  if (typeof typeVal === 'string') return typeVal;
  if (typeVal && typeof typeVal === 'object' && typeVal.choose) {
    return typeVal.choose[0] || 'unknown';
  }
  return 'unknown';
}

export function formatCR(cr: any): string {
  if (typeof cr === 'string') return cr;
  if (cr?.cr) return cr.cr;
  return '—';
}

// 🧠 formatSpeed: monster speed can be a string ("30 ft.") or an object
//    ({ walk: 30, fly: 60, choose: { from: [...], amount: 30 } }).
export function formatSpeed(speed: any): string {
  if (!speed) return '—';
  if (typeof speed === 'string') return speed;
  const parts: string[] = [];
  Object.entries(speed).forEach(([k, v]) => {
    if (k === 'choose' && typeof v === 'object' && v) {
      const vObj = v as { from?: string[]; amount?: number };
      const from = Array.isArray(vObj.from) ? vObj.from.join(' or ') : '';
      parts.push(`${from} ${vObj.amount || ''}`.trim());
    } else {
      parts.push(`${k} ${v}`);
    }
  });
  return parts.join(', ');
}

export function formatAC(ac: any): string {
  if (!ac || !ac[0]) return '—';
  const first = ac[0];
  const val = typeof first === 'number' ? first : (first.ac ?? first.value);
  if (val === undefined) return '—';
  return first.from ? `${val} (${first.from.join(', ')})` : `${val}`;
}

// 🧠 Spell formatting helpers — handle varied data shapes for time, range,
//    components, and duration.
export function formatTime(time: any): string {
  if (!time) return '—';
  if (typeof time === 'string') return time;
  if (Array.isArray(time)) {
    return time.map((t: any) => {
      if (typeof t === 'string') return t;
      return t.number && t.unit ? `${t.number} ${t.unit}${t.number > 1 ? 's' : ''}` : '—';
    }).join(', ');
  }
  if (time.number && time.unit) return `${time.number} ${time.unit}${time.number > 1 ? 's' : ''}`;
  return '—';
}

export function formatRange(range: any): string {
  if (!range) return '—';
  if (typeof range === 'string') return range;
  if (range.type === 'point' && range.distance) {
    const d = range.distance;
    if (d.type === 'feet') return `${d.amount} ft`;
    return d.amount ? `${d.amount} ${d.type || ''}` : '—';
  }
  if (range.distance) {
    const d = range.distance;
    return d.amount ? `${d.amount} ${d.type || ''}${range.type ? ` (${range.type})` : ''}` : '—';
  }
  return '—';
}

export function componentLabel(components: any): string {
  if (!components) return '—';
  if (typeof components === 'string') return components;
  const parts: string[] = [];
  if (components.v) parts.push('V');
  if (components.s) parts.push('S');
  if (components.m) parts.push(`M (${components.m})`);
  return parts.join(', ');
}

export function formatDuration(duration: any): string {
  if (!duration) return '—';
  if (typeof duration === 'string') return duration;
  if (Array.isArray(duration)) {
    return duration.map((d: any) => {
      if (typeof d === 'string') return d;
      if (d.concentration) return `Concentration, up to ${d.type || ''}`;
      if (d.type === 'timed' && d.duration) {
        return `${d.duration.amount || ''} ${d.duration.type || ''}`;
      }
      return d.type || '—';
    }).join(', ');
  }
  if (duration.concentration) return `Concentration, up to ${duration.type || ''}`;
  return duration.type || '—';
}

// 🧠 Item type labels and ranking — used for sorting and display in the item library.
//    The base type is extracted from strings like "LA|XPHB" → "LA".
export const ITEM_TYPE_LABELS: Record<string, string> = {
  'M': 'Melee Weapons', 'R': 'Ranged Weapons', 'A': 'Ammunition',
  'LA': 'Light Armor', 'MA': 'Medium Armor', 'HA': 'Heavy Armor', 'S': 'Shields',
  'P': 'Potions', 'SC': 'Scrolls', 'RD': 'Rods', 'W': 'Wands', 'RG': 'Rings',
  'ST': 'Staffs', 'WD': 'Wondrous Items', 'SCF': 'Spellcasting Foci',
  'AT': 'Tools', 'INS': 'Instruments', 'G': 'Adventuring Gear',
  'T': 'Tools', 'EXP': 'Explosives', 'MNT': 'Mounts', 'VEH': 'Vehicles',
  'TG': 'Trade Goods', 'SM': 'Siege Weapons', 'GV': 'Gaming Sets',
  'AF': 'Arcane Foci', 'AL': 'Alchemical Items',
};

export function getItemTypeLabel(typeStr: string | undefined): string {
  if (!typeStr) return 'Other';
  const base = typeStr.split('|')[0];
  return ITEM_TYPE_LABELS[base] || base;
}

export function getItemTypeRank(typeStr: string | undefined): number {
  if (!typeStr) return 999;
  const order = ['M', 'R', 'A', 'LA', 'MA', 'HA', 'S', 'P', 'SC', 'RD', 'W', 'RG', 'ST', 'WD', 'SCF', 'AT', 'INS', 'G', 'T', 'EXP', 'MNT', 'VEH', 'TG', 'SM', 'GV', 'AF', 'AL'];
  const base = typeStr.split('|')[0];
  const idx = order.indexOf(base);
  return idx >= 0 ? idx : 999;
}

// 🧠 Monster type colors and emojis — used for colored badges in the UI.
export const MONSTER_TYPE_COLORS: Record<string, string> = {
  aberration: '#9b59b6', beast: '#8b6914', celestial: '#f1c40f', construct: '#7f8c8d',
  dragon: '#e74c3c', elemental: '#3498db', fey: '#e91e8f', fiend: '#c0392b',
  giant: '#e67e22', humanoid: '#d4a574', monstrosity: '#2ecc71', ooze: '#27ae60',
  plant: '#1abc9c', undead: '#2c3e50', swarm: '#95a5a6',
};

export function getMonsterTypeColor(type: string): string {
  return MONSTER_TYPE_COLORS[type.toLowerCase()] || '#7f8c8d';
}

export const LEVEL_NAMES = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

export const MONSTER_TYPE_EMOJI: Record<string, string> = {
  humanoid: '🧝', dragon: '🐉', beast: '🐻', undead: '💀', fiend: '👿',
  fey: '🧚', elemental: '🌀', giant: '🦣', aberration: '👁️', construct: '⚙️',
  ooze: '🟢', plant: '🌿', celestial: '✨', monstrosity: '👹',
};

export function getMonsterTypeEmoji(type: string): string {
  return MONSTER_TYPE_EMOJI[type.toLowerCase()] || '❓';
}

// 🧠 renderEntries: a recursive React component that renders 5eTools entry
//    data structures. Entries can be:
//    - A plain string (rendered as paragraph)
//    - An array (each element rendered recursively)
//    - An object with items (rendered as <ul>)
//    - An object with entries (rendered as nested divs, optionally with a name header)
//    - An object with type 'list' (rendered as <ul>)
//    - An object with type 'table' (rendered as <table>)
//    - Anything else (rendered as JSON string)
//
//    This pattern is called a "recursive renderer" — the component calls
//    itself to handle arbitrarily nested data.
export function renderEntries(entries: any): React.ReactNode {
  if (!entries) return null;
  if (typeof entries === 'string') return <p style={{ margin: '4px 0' }}>{cleanString(entries)}</p>;
  if (Array.isArray(entries)) return entries.map((e, i) => <div key={i}>{renderEntries(e)}</div>);
  if (typeof entries === 'object') {
    if (entries.items) {
      return <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>{entries.items.map((it: any, i: number) => <li key={i} style={{ marginBottom: '2px' }}>{renderEntries(it)}</li>)}</ul>;
    }
    if (entries.entries) {
      const inner = (
        <div style={{ margin: '4px 0' }}>
          {Array.isArray(entries.entries) ? entries.entries.map((e: any, i: number) => <div key={i}>{renderEntries(e)}</div>) : renderEntries(entries.entries)}
        </div>
      );
      if (entries.name) {
        return (
          <div style={{ margin: '8px 0' }}>
            <div style={{ fontWeight: 'bold', color: '#c9a84c', fontSize: '0.85rem', marginBottom: '2px' }}>{cleanString(entries.name)}</div>
            {inner}
          </div>
        );
      }
      return inner;
    }
    if (entries.type === 'list' && entries.items) {
      return <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>{entries.items.map((it: any, i: number) => <li key={i} style={{ marginBottom: '2px' }}>{renderEntries(it)}</li>)}</ul>;
    }
    if (entries.type === 'table' && entries.rows) {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: '0.75rem' }}>
          {entries.colLabels && (
            <thead><tr>{entries.colLabels.map((l: string, i: number) => <th key={i} style={{ border: '1px solid #3d3528', padding: '4px 6px', color: '#c9a84c' }}>{l}</th>)}</tr></thead>
          )}
          <tbody>{entries.rows.map((row: any[], ri: number) => (
            <tr key={ri}>{row.map((cell: any, ci: number) => <td key={ci} style={{ border: '1px solid #3d3528', padding: '4px 6px' }}>{renderEntries(cell)}</td>)}</tr>
          ))}</tbody>
        </table>
      );
    }
    return <span style={{ fontSize: '0.75rem', color: '#5a5248' }}>{JSON.stringify(entries)}</span>;
  }
  return <span style={{ fontSize: '0.75rem', color: '#5a5248' }}>{JSON.stringify(entries)}</span>;
}

export const CLASS_LIST = ['Artificer', 'Barbarian', 'Bard', 'Blood Hunter', 'Cleric', 'Druid', 'Fighter', 'Illrigger', 'Monk', 'Monster Hunter', 'Mystic', 'Paladin', 'Pugilist', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
