import { StashItem, Character, InventoryItem } from '../lib/character';
import { saveCharToLocal } from './storageEngine';
import { campaignKey } from './campaignStorage';

const STASH_KEY = 'party-stash';
const MULE_KEY = 'party-stash-mule-nearby';

function sk(key: string) { return campaignKey(key); }

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

export function addToStash(
  item: { name: string; quantity?: number; weight?: number; type?: string; dmg1?: string },
  quantity: number,
  addedBy: string
): StashItem[] {
  const stash = loadStash();
  const existing = stash.find(s => s.name === item.name);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + quantity;
  } else {
    stash.push({
      id: `stash-${item.name}-${Date.now()}`,
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

export function removeFromStash(itemId: string, quantity: number = 1): StashItem[] {
  const stash = loadStash();
  const idx = stash.findIndex(s => s.id === itemId);
  if (idx === -1) return stash;
  const existing = stash[idx];
  if ((existing.quantity || 1) > quantity) {
    existing.quantity = (existing.quantity || 1) - quantity;
  } else {
    stash.splice(idx, 1);
  }
  saveStash(stash);
  return stash;
}

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

  const newItem: InventoryItem = {
    id: `transfer-${item.name}-${Date.now()}`,
    name: item.name,
    equipped: false,
    quantity: takeQty,
    weight: item.weight,
    type: item.type,
    dmg1: item.dmg1,
  };

  const updatedChar: Character = {
    ...char,
    inventory: [...(char.inventory || []), newItem],
  };

  // Remove from stash
  if ((item.quantity || 1) > takeQty) {
    item.quantity = (item.quantity || 1) - takeQty;
  } else {
    stash.splice(idx, 1);
  }
  saveStash(stash);

  // Save updated character
  saveCharToLocal(updatedChar);

  return { stash, updatedChar };
}

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