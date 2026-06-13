// =============================================================================
// 📘 FILE: utils/stashEngine.ts
// =============================================================================
// 🎯 PURPOSE: Manages the party's shared item stash — add, remove, transfer
//    items to characters, and a "Mule Nearby" toggle for inventory access.
//
// 🧠 REACT CONCEPT: CRUD Operations (Create, Read, Update, Delete)
//    This is a classic CRUD pattern implemented with localStorage.
//    - Create: addToStash
//    - Read: loadStash
//    - Update: addToStash (update quantity), removeFromStash
//    - Delete: removeFromStash (when quantity reaches 0)
//
//    Each function returns the new/updated stash array so React components
//    can call `setStash(removeFromStash(id))` to update state.
//
// 🔧 HOW TO ALTER:
//    - Change stash key: modify STASH_KEY
//    - Add item validation: add checks before push in addToStash
//    - Add transfer history: add a log entry when items are transferred
//    - Change transfer behavior: modify transferToCharacter
// =============================================================================

import { StashItem, Character, InventoryItem } from '../lib/character';
import { saveCharToLocal } from './storageEngine';
import { campaignKey } from './campaignStorage';

const STASH_KEY = 'party-stash';
const MULE_KEY = 'party-stash-mule-nearby';

// 🧠 Shortcut: campaignKey is used to scope stash data to the active campaign.
function sk(key: string) { return campaignKey(key); }

// 🧠 loadStash — Reads the full stash from localStorage.
//    Returns empty array if nothing stored or if called during SSR (window undefined).
export function loadStash(): StashItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(sk(STASH_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveStash(items: StashItem[]): void {
  try { localStorage.setItem(sk(STASH_KEY), JSON.stringify(items)); } catch { /* noop */ }
}

// 🧠 addToStash — Adds an item (or increases quantity of existing item).
//    Tracks who added it and when for audit purposes.
export function addToStash(
  item: { name: string; quantity?: number; weight?: number; type?: string; dmg1?: string },
  quantity: number,
  addedBy: string
): StashItem[] {
  const stash = loadStash();
  const existing = stash.find(s => s.name === item.name);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + quantity;  // Stack quantity
  } else {
    stash.push({
      id: `stash-${item.name}-${Date.now()}`,   // Simple unique ID
      name: item.name,
      equipped: false,
      quantity: quantity || 1,
      weight: item.weight,
      type: item.type,
      dmg1: item.dmg1,
      addedBy,
      addedAt: new Date().toISOString(),
    });
  }
  saveStash(stash);
  return stash;
}

// 🧠 removeFromStash — Removes a quantity of an item. If quantity reaches 0,
//    removes the entire entry from the stash array.
export function removeFromStash(itemId: string, quantity: number = 1): StashItem[] {
  const stash = loadStash();
  const idx = stash.findIndex(s => s.id === itemId);
  if (idx === -1) return stash;
  const existing = stash[idx];
  if ((existing.quantity || 1) > quantity) {
    existing.quantity = (existing.quantity || 1) - quantity;
  } else {
    stash.splice(idx, 1);  // Remove the entry entirely
  }
  saveStash(stash);
  return stash;
}

// 🧠 transferToCharacter — The key operation: moves items from stash to a
//    character's inventory. Updates both the stash AND saves the character.
//    Returns both updated arrays so the UI can update both views.
export function transferToCharacter(
  itemId: string,
  quantity: number,
  char: Character
): { stash: StashItem[]; updatedChar: Character } {
  const stash = loadStash();
  const idx = stash.findIndex(s => s.id === itemId);
  if (idx === -1) return { stash, updatedChar: char };
  const item = stash[idx];
  const takeQty = Math.min(quantity, item.quantity || 1);

  // Create a new inventory item (different ID, no tracking metadata)
  const newItem: InventoryItem = {
    id: `transfer-${item.name}-${Date.now()}`,
    name: item.name,
    equipped: false,
    quantity: takeQty,
    weight: item.weight,
    type: item.type,
    dmg1: item.dmg1,
  };

  // 🧠 Immutable update to character: create new object with item added
  const updatedChar: Character = {
    ...char,
    inventory: [...(char.inventory || []), newItem],
  };

  // Remove from stash (same quantity logic as removeFromStash)
  if ((item.quantity || 1) > takeQty) {
    item.quantity = (item.quantity || 1) - takeQty;
  } else {
    stash.splice(idx, 1);
  }
  saveStash(stash);

  // Save the character back to localStorage
  saveCharToLocal(updatedChar);

  return { stash, updatedChar };
}

// 🧠 Mule Nearby — A simple toggle that controls whether the party stash is
//    accessible during encounters. Purely a flavor mechanic.
export function isMuleNearby(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(sk(MULE_KEY)) === 'true';
  } catch { return false; }
}

export function setMuleNearby(value: boolean): void {
  try { localStorage.setItem(sk(MULE_KEY), value ? 'true' : 'false'); } catch { /* noop */ }
}

export function getAllStashItemNames(): string[] {
  const stash = loadStash();
  return stash.map(s => s.name);
}
