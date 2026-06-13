// =============================================================================
// 📘 FILE: utils/obscuredItemsEngine.ts
// =============================================================================
// 🎯 PURPOSE: Manages "obscured" magic items — items the DM gives to players
//    with hidden identities. Players see a fake name ("Ornate Ring of Unknown
//    Origin") until the item is identified, revealing the true name and data.
//    Supports Identify and Detect Magic workflows.
//
// 🧠 REACT CONCEPT: Derived Display State
//    Each ObscuredItem has an `identified` boolean. The UI conditionally
//    renders either the `displayName` (fake) or the `trueName` (real).
//    This is a classic example of "conditional rendering" based on state:
//
//    ```tsx
//    {item.identified ? <TrueName /> : <FakeName />}
//    ```
//
//    The `generateDisplayName()` function creates a thematic fake name
//    from randomized prefix + item short name + suffix.
//
// 🔧 HOW TO ALTER:
//    - Change fake name generation: modify generateDisplayName
//    - Add more fake prefixes/suffixes: edit FAKE_PREFIXES / FAKE_SUFFIXES
//    - Change item identification logic: modify identifyItem
//    - Change storage scope: modify the campaignKey usage
// =============================================================================

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

// 🧠 generateDisplayName: creates a randomized fake item name.
//    Uses the last word of the true name (e.g. "Ring" from "Ring of Protection").
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

// 🧠 identifyItem: flips the identified flag to true.
//    The DM calls this when a player casts Identify or uses Detect Magic.
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
