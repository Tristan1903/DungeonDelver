import { Character, SpellSlotState } from '../lib/character';
import { getAbilityModifier } from './characterProgression';

export const FULL_CASTER_SLOTS: number[][] = [
  [], // 0
  [2], // 1
  [3], // 2
  [4, 2], // 3
  [4, 3], // 4
  [4, 3, 2], // 5
  [4, 3, 3], // 6
  [4, 3, 3, 1], // 7
  [4, 3, 3, 2], // 8
  [4, 3, 3, 3, 1], // 9
  [4, 3, 3, 3, 2], // 10
  [4, 3, 3, 3, 2, 1], // 11
  [4, 3, 3, 3, 2, 1], // 12
  [4, 3, 3, 3, 2, 1, 1], // 13
  [4, 3, 3, 3, 2, 1, 1], // 14
  [4, 3, 3, 3, 2, 1, 1, 1], // 15
  [4, 3, 3, 3, 2, 1, 1, 1], // 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // 20
];

export const HALF_CASTER_SLOTS: number[][] = [
  [],
  [],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

export const PACT_SLOTS: Record<number, { slots: number; level: number }> = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  4: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  6: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  8: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

/**
 * Get the caster progression type for a class.
 * - 'full': Bard, Cleric, Druid, Sorcerer, Wizard
 * - 'half': Paladin, Ranger
 * - 'third': Eldritch Knight, Arcane Trickster
 * - 'pact': Warlock
 * - null: non-caster
 */
export function getCasterType(classInfo: any): 'full' | 'half' | 'third' | 'pact' | null {
  if (!classInfo?.casterProgression) return null;
  const prog = classInfo.casterProgression;
  if (prog === 'pact') return 'pact';
  if (prog === 'half' || prog === '1/2') return 'half';
  if (prog === 'third' || prog === '1/3') return 'third';
  return 'full';
}

/**
 * Compute the combined caster level for a multiclass character.
 * - Full casters contribute 1:1
 * - Half casters (Paladin, Ranger) contribute 1:2 (round down)
 * - Third casters (EK, AT) contribute 1:3 (round down)
 * - Artificers contribute 1:2 (round UP)
 * - Pact magic (Warlock) does NOT combine, returns separately
 */
export function getCombinedCasterLevel(
  classLevels: { className: string; level: number }[],
  classDataMap: Record<string, any>
): { combinedLevel: number; pactLevel: number; hasPact: boolean } {
  let combined = 0;
  let pactLevel = 0;
  let hasPact = false;

  for (const cl of classLevels) {
    const info = classDataMap[cl.className]?.info;
    const type = getCasterType(info);
    if (type === 'pact') {
      hasPact = true;
      pactLevel = cl.level;
    } else if (type === 'full') {
      combined += cl.level;
    } else if (type === 'half') {
      // Artificer rounds up; other half-casters round down
      if (cl.className === 'Artificer') {
        combined += Math.ceil(cl.level / 2);
      } else {
        combined += Math.floor(cl.level / 2);
      }
    } else if (type === 'third') {
      combined += Math.floor(cl.level / 3);
    }
  }

  return { combinedLevel: Math.min(combined, 20), pactLevel: Math.min(pactLevel, 20), hasPact };
}

export function getMaxSpellLevel(classInfo: any, level: number): number {
  if (!classInfo) return 0;
  const prog = classInfo.casterProgression;
  if (prog === 'pact') return PACT_SLOTS[Math.min(level, 20)]?.level || 0;
  if (prog === 'half' || prog === '1/2') return Math.min(level, 20) < 2 ? 0 : HALF_CASTER_SLOTS[Math.min(level, 20)].length;
  if (prog === 'third' || prog === '1/3') return Math.min(level, 20) < 3 ? 0 : Math.max(0, HALF_CASTER_SLOTS[Math.min(level, 20)].length - 1);
  return FULL_CASTER_SLOTS[Math.min(level, 20)]?.length || 0;
}

export function isSpellcaster(classInfo: any): boolean {
  if (!classInfo) return false;
  return Boolean(
    classInfo.casterProgression ||
      classInfo.cantripProgression ||
      classInfo.spellsKnownProgression ||
      classInfo.spellsKnownProgressionFixed ||
      classInfo.preparedSpellsProgression
  );
}

export function getCantripsKnown(classInfo: any, level: number): number {
  const prog = classInfo?.cantripProgression;
  if (!prog?.length) return 0;
  return prog[Math.min(level, prog.length) - 1] ?? 0;
}

export function getSpellsKnownAtLevel(classInfo: any, level: number): number | null {
  const prog = classInfo?.spellsKnownProgression;
  if (prog?.length) return prog[Math.min(level, prog.length) - 1] ?? null;
  const fixed = classInfo?.spellsKnownProgressionFixed;
  if (fixed?.length) {
    return fixed.slice(0, level).reduce((a: number, b: number) => a + b, 0);
  }
  return null;
}

export function getPreparedCount(
  classInfo: any,
  level: number,
  abilityScore: number
): number {
  // XPHB-style flat per-level progression array
  const prog = classInfo?.preparedSpellsProgression;
  if (prog?.length) return prog[Math.min(level, prog.length) - 1] ?? 0;

  // PHB-style formula like "<$level$> + <$wis_mod$>"
  const formula: string = classInfo?.preparedSpells || '';
  if (!formula) return 0;
  const mod = getAbilityModifier(abilityScore);
  let expr = formula
    .replace(/<\$level\$>|level/g, String(level))
    .replace(/<\$int_mod\$>|<\$wis_mod\$>|<\$cha_mod\$>|\bmod\b/g, String(mod))
    .replace(/<\$([^>]+)\$>/g, '$1');
  try {
    const result = Function(`"use strict"; return Math.max(1, Math.floor(${expr}));`)();
    return result;
  } catch {
    return Math.max(1, level + mod);
  }
}

export function usesPreparedSpells(classInfo: any): boolean {
  if (classInfo?.preparedSpells || classInfo?.preparedSpellsProgression) return true;
  return false;
}

export function usesKnownSpells(classInfo: any): boolean {
  return Boolean(
    classInfo?.spellsKnownProgression
  );
}

export function getSpellcastingAbility(classInfo: any): keyof Character['baseStats'] {
  const ab = (classInfo?.spellcastingAbility || 'int').toLowerCase();
  if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(ab)) return ab as keyof Character['baseStats'];
  return 'int';
}

/**
 * Compute spell slots for a multiclass character by combining all caster levels.
 * Returns slots for both regular casting and pact magic (if any).
 */
export function computeMulticlassSpellSlots(
  classLevels: { className: string; level: number }[],
  classDataMap: Record<string, any>
): Record<number, SpellSlotState> {
  const { combinedLevel, pactLevel, hasPact } = getCombinedCasterLevel(classLevels, classDataMap);
  const slots: Record<number, SpellSlotState> = {};

  // Regular slots from combined caster level (full caster table)
  if (combinedLevel > 0) {
    const row = FULL_CASTER_SLOTS[Math.min(20, combinedLevel)] || [];
    row.forEach((max, idx) => {
      if (max > 0) slots[idx + 1] = { max, used: 0 };
    });
  }

  // Pact magic slots (separate)
  if (hasPact && pactLevel > 0) {
    const pact = PACT_SLOTS[Math.min(20, pactLevel)] || PACT_SLOTS[1];
    // Pact slots go into a special key "pact{level}" or reuse the slot level key
    // Standard approach: put pact slots at their slot level (e.g., level 2 pact slots → key 2)
    if (slots[pact.level]) {
      // If regular slots already exist at this level, add pact slots (they're separate resources)
      slots[pact.level] = { max: slots[pact.level].max + pact.slots, used: 0 };
    } else {
      slots[pact.level] = { max: pact.slots, used: 0 };
    }
  }

  return slots;
}

export function buildSpellSlots(classInfo: any, level: number): Record<number, SpellSlotState> {
  const progression = classInfo?.casterProgression;
  const slots: Record<number, SpellSlotState> = {};

  if (progression === 'pact') {
    const pact = PACT_SLOTS[Math.min(20, level)] || PACT_SLOTS[1];
    slots[pact.level] = { max: pact.slots, used: 0 };
    return slots;
  }

  const table =
    progression === 'half' || progression === '1/2'
      ? HALF_CASTER_SLOTS
      : progression === 'third' || progression === '1/3'
        ? HALF_CASTER_SLOTS.map((row) => row.map((n) => (n ? Math.max(0, n - 1) : 0)))
        : FULL_CASTER_SLOTS;

  const row = table[Math.min(20, level)] || [];
  row.forEach((max, idx) => {
    if (max > 0) slots[idx + 1] = { max, used: 0 };
  });
  return slots;
}

export function getSpellSaveDC(char: Character, classInfo: any): number {
  const ab = getSpellcastingAbility(classInfo);
  const mod = getAbilityModifier(char.baseStats[ab]);
  return 8 + char.level + mod;
}

export function getSpellAttackBonus(char: Character, classInfo: any): number {
  const ab = getSpellcastingAbility(classInfo);
  return getAbilityModifier(char.baseStats[ab]) + char.level;
}

export function resetSpellSlots(slots: Record<number, SpellSlotState>): Record<number, SpellSlotState> {
  const next: Record<number, SpellSlotState> = {};
  Object.entries(slots).forEach(([lvl, s]) => {
    next[Number(lvl)] = { max: s.max, used: 0 };
  });
  return next;
}

export function concentrationSaveDC(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));
}
