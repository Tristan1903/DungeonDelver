export interface HomebrewItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  value: number;
  weight: number;
  description: string;
  ac?: number;
  dmg1?: string;
  dmgType?: string;
  property?: string[];
  weaponCategory?: string;
  source: 'homebrew';
  entries?: string[];
}

export interface HomebrewMonster {
  id: string;
  name: string;
  cr: string;
  type: string;
  ac: number;
  hp: number;
  speed: string;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  description: string;
  actions: { name: string; description: string }[];
  source: 'homebrew';
}

export interface HomebrewSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  source: 'homebrew';
}

import { campaignKey } from './campaignStorage';

const STORAGE_ITEMS = 'homebrew-items';
const STORAGE_MONSTERS = 'homebrew-monsters';
const STORAGE_SPELLS = 'homebrew-spells';

function sk(key: string) { return campaignKey(key); }

function loadFromStorage<T>(key: string): T[] {
  try { const raw = localStorage.getItem(sk(key)); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(sk(key), JSON.stringify(data));
}

export function loadHBItems(): HomebrewItem[] { return loadFromStorage(STORAGE_ITEMS); }
export function saveHBItem(item: HomebrewItem): void {
  const list = loadHBItems();
  const idx = list.findIndex(i => i.id === item.id);
  if (idx >= 0) list[idx] = item; else list.push(item);
  saveToStorage(STORAGE_ITEMS, list);
}
export function deleteHBItem(id: string): void {
  saveToStorage(STORAGE_ITEMS, loadHBItems().filter(i => i.id !== id));
}

export function loadHBMonsters(): HomebrewMonster[] { return loadFromStorage(STORAGE_MONSTERS); }
export function saveHBMonster(m: HomebrewMonster): void {
  const list = loadHBMonsters();
  const idx = list.findIndex(i => i.id === m.id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  saveToStorage(STORAGE_MONSTERS, list);
}
export function deleteHBMonster(id: string): void {
  saveToStorage(STORAGE_MONSTERS, loadHBMonsters().filter(m => m.id !== id));
}

export function loadHBSpells(): HomebrewSpell[] { return loadFromStorage(STORAGE_SPELLS); }
export function saveHBSpell(s: HomebrewSpell): void {
  const list = loadHBSpells();
  const idx = list.findIndex(i => i.id === s.id);
  if (idx >= 0) list[idx] = s; else list.push(s);
  saveToStorage(STORAGE_SPELLS, list);
}
export function deleteHBSpell(id: string): void {
  saveToStorage(STORAGE_SPELLS, loadHBSpells().filter(s => s.id !== id));
}

export function exportAllHomebrew(): string {
  return JSON.stringify({ items: loadHBItems(), monsters: loadHBMonsters(), spells: loadHBSpells() }, null, 2);
}

export function importAllHomebrew(json: string): { items: number; monsters: number; spells: number } {
  const data = JSON.parse(json);
  if (data.items) saveToStorage(STORAGE_ITEMS, data.items);
  if (data.monsters) saveToStorage(STORAGE_MONSTERS, data.monsters);
  if (data.spells) saveToStorage(STORAGE_SPELLS, data.spells);
  return { items: data.items?.length || 0, monsters: data.monsters?.length || 0, spells: data.spells?.length || 0 };
}

export const RARITIES = ['none', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
export const ITEM_TYPES = ['LA', 'MA', 'HA', 'S', 'W', 'R', 'A', 'P', 'SC', 'RD', 'Wondrous', 'Other'];
export const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
export const MONSTER_TYPES = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];
