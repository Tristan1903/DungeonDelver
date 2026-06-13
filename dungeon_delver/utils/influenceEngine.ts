// =============================================================================
// 📘 FILE: utils/influenceEngine.ts
// =============================================================================
// 🎯 PURPOSE: Social interaction system for the DM. Tracks NPC dispositions
//    (hostile → helpful), calculates influence DCs for persuasion/deception/
//    intimidation checks, provides reaction rolls (2d6), and manages social
//    NPC + group records in campaign-scoped localStorage.
//
// 🧠 REACT CONCEPT: State Machines + Pure Functions
//    Dispositions form a linear state machine (hostile → unfriendly →
//    indifferent → friendly → helpful). Functions like adjustDisposition
//    and getInfluenceDC are pure — they take a state and return a new one
//    without side effects.
//
//    The localStorage CRUD follows the same pattern as other engines
//    (homebrewEngine, npcGenerator, tableEngine).
//
// 🔧 HOW TO ALTER:
//    - Change disposition order: modify DISPOSITION_ORDER
//    - Change influence DCs: modify getInfluenceDC
//    - Change reaction roll: modify reactionRoll
//    - Add fields to NPCs: update SocialNPC interface + save/load
// =============================================================================

export type Disposition = 'hostile' | 'unfriendly' | 'indifferent' | 'friendly' | 'helpful';

export const DISPOSITION_ORDER: Disposition[] = ['hostile', 'unfriendly', 'indifferent', 'friendly', 'helpful'];

export interface SocialNPC {
  id: string;
  name: string;
  disposition: Disposition;
  notes: string;
  tags: string[];
  lastInteraction: string;
  persuasionMod?: number;
  deceptionMod?: number;
  intimidationMod?: number;
}

export interface SocialGroup {
  id: string;
  name: string;
  memberIds: string[];
  notes: string;
}

import { campaignKey } from './campaignStorage';
const STORAGE_NPCS = 'social-npcs';
const STORAGE_GROUPS = 'social-groups';
function sk(key: string) { return campaignKey(key); }

// 🧠 getInfluenceDC: returns the DC for a social check based on the NPC's
//    current disposition. Helpful NPCs auto-succeed (no roll needed).
//    Major concessions (asking for something big) have a higher DC.
export function getInfluenceDC(disposition: Disposition, majorConcession = false): number | null {
  switch (disposition) {
    case 'helpful': return null;
    case 'friendly': return 15;
    case 'indifferent': return 20;
    case 'unfriendly': return 25;
    case 'hostile': return majorConcession ? 30 : 25;
  }
}

export function getDCDescription(dc: number | null): string {
  if (dc === null) return 'Auto-success';
  if (dc === 15) return 'Easy (DC 15)';
  if (dc === 20) return 'Moderate (DC 20)';
  if (dc === 25) return 'Hard (DC 25)';
  if (dc === 30) return 'Very Hard (DC 30)';
  return `DC ${dc}`;
}

// 🧠 adjustDisposition: moves disposition up or down the order.
//    Uses Math.max/Math.min to clamp to valid range — no index out of bounds.
//    This is the "state transition" function for the disposition state machine.
export function adjustDisposition(current: Disposition, steps: number): Disposition {
  const idx = DISPOSITION_ORDER.indexOf(current);
  const next = Math.max(0, Math.min(DISPOSITION_ORDER.length - 1, idx + steps));
  return DISPOSITION_ORDER[next];
}

// 🧠 reactionRoll: simulates a 2d6 reaction check (DMG rule).
//    Returns the total, the resulting disposition, and the individual die rolls
//    (useful for displaying in the UI).
export function reactionRoll(modifier = 0): { total: number; disposition: Disposition; rolls: number[] } {
  const rolls = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  const total = rolls[0] + rolls[1] + modifier;
  let disposition: Disposition;
  if (total <= 6) disposition = 'hostile';
  else if (total <= 9) disposition = 'unfriendly';
  else if (total <= 12) disposition = 'indifferent';
  else if (total <= 15) disposition = 'friendly';
  else disposition = 'helpful';
  return { total, disposition, rolls };
}

// 🧠 Social NPC CRUD — same localStorage pattern as other engines.
export function loadSocialNPCs(): SocialNPC[] {
  try {
    const raw = localStorage.getItem(sk(STORAGE_NPCS));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSocialNPC(npc: SocialNPC): void {
  const list = loadSocialNPCs();
  const idx = list.findIndex(n => n.id === npc.id);
  if (idx >= 0) list[idx] = npc;
  else list.push(npc);
  localStorage.setItem(sk(STORAGE_NPCS), JSON.stringify(list));
}

export function deleteSocialNPC(id: string): void {
  const list = loadSocialNPCs().filter(n => n.id !== id);
  localStorage.setItem(sk(STORAGE_NPCS), JSON.stringify(list));
}

// 🧠 Social Group CRUD — groups contain references to NPCs by ID.
export function loadSocialGroups(): SocialGroup[] {
  try {
    const raw = localStorage.getItem(sk(STORAGE_GROUPS));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSocialGroup(group: SocialGroup): void {
  const list = loadSocialGroups();
  const idx = list.findIndex(g => g.id === group.id);
  if (idx >= 0) list[idx] = group;
  else list.push(group);
  localStorage.setItem(sk(STORAGE_GROUPS), JSON.stringify(list));
}

export function deleteSocialGroup(id: string): void {
  const list = loadSocialGroups().filter(g => g.id !== id);
  localStorage.setItem(sk(STORAGE_GROUPS), JSON.stringify(list));
}
