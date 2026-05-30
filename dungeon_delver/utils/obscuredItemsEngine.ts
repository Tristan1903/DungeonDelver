export interface ObscuredItem {
  id: string;
  trueName: string;
  displayName: string;
  identified: boolean;
  assignedTo: string;
  assignedByName: string;
  assignedAt: string;
  notes: string;
  trueData?: any;
}

const FAKE_PREFIXES = ['Ornate', 'Weathered', 'Ancient', 'Glimmering', 'Dull', 'Pitted', 'Engraved', 'Runed', 'Bone', 'Jade', 'Silvered', 'Dark', 'Polished', 'Rusty', 'Fine', 'Crude', 'Elaborate', 'Simple', 'Heavy', 'Light'];
const FAKE_SUFFIXES = ['of Unknown Origin', 'with Faint Glyphs', 'of Strange Make', 'Covered in Dust', 'Warm to the Touch', 'Humming Faintly', 'of Odd Proportions', 'Marked with a Crest', 'Slightly Chipped', 'of Curious Design'];

import { campaignKey } from './campaignStorage';
const STORAGE_KEY = 'obscured-items';
function sk(key: string) { return campaignKey(key); }

export function generateDisplayName(trueName: string): string {
  const prefix = FAKE_PREFIXES[Math.floor(Math.random() * FAKE_PREFIXES.length)];
  const suffix = FAKE_SUFFIXES[Math.floor(Math.random() * FAKE_SUFFIXES.length)];
  const words = trueName.split(' ');
  const shortName = words.length > 1 ? words[words.length - 1] : trueName;
  return `${prefix} ${shortName} ${suffix}`;
}

export function loadObscuredItems(): ObscuredItem[] {
  try {
    const raw = localStorage.getItem(sk(STORAGE_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveObscuredItems(items: ObscuredItem[]): void {
  localStorage.setItem(sk(STORAGE_KEY), JSON.stringify(items));
}

export function addObscuredItem(item: Omit<ObscuredItem, 'id' | 'assignedAt'>): ObscuredItem {
  const items = loadObscuredItems();
  const newItem: ObscuredItem = {
    ...item,
    id: crypto.randomUUID?.() || `${Date.now()}`,
    assignedAt: new Date().toISOString(),
  };
  items.push(newItem);
  saveObscuredItems(items);
  return newItem;
}

export function identifyItem(id: string): void {
  const items = loadObscuredItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) {
    items[idx].identified = true;
    saveObscuredItems(items);
  }
}

export function deleteObscuredItem(id: string): void {
  saveObscuredItems(loadObscuredItems().filter(i => i.id !== id));
}

export function getObscuredForCharacter(charId: string): ObscuredItem[] {
  return loadObscuredItems().filter(i => i.assignedTo === charId);
}
