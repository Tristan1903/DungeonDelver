// =============================================================================
// 📘 FILE: utils/spellcastingEngine.ts
// =============================================================================
// 🎯 PURPOSE: Handles ALL spellcasting math — slot tables for full/half/third/pact
//    casters, multiclass caster level combination, prepared/know spell counts,
//    spell save DC, concentration checks, and slot reset logic.
//
// 🧠 REACT CONCEPT: Pure Functions + Data Tables
//    This is ALL math — no React, no state, no side effects. Pure functions
//    take numbers in, return numbers out. The spell slot tables (2D arrays)
//    encode the D&D 5e rules for what slots each caster type gets at each level.
//
//    💡 This separation of "rule logic" from "UI" is what makes the app
//    maintainable. If Wizards of the Coast changes the slot progression,
//    you only edit the tables here, not the character sheet component.
//
// 🔧 HOW TO ALTER:
//    - Change slot progression: modify FULL_CASTER_SLOTS / HALF_CASTER_SLOTS
//    - Change pact magic: modify PACT_SLOTS
//    - Add new caster type: add handling in getCasterType + getCombinedCasterLevel
//    - Change spell save DC formula: modify getSpellSaveDC
// =============================================================================

import { Character, SpellSlotState } from '../lib/character';
import { getAbilityModifier } from './characterProgression';

// ============================================================
// SPELL SLOT TABLES (D&D 5e 2024 rules)
// ============================================================

// 🧠 FULL_CASTER_SLOTS — Spell slot progression for full casters (Bard, Cleric,
//    Druid, Sorcerer, Wizard). Index = character level, value = array of slots
//    per spell level.
//
//    Example: FULL_CASTER_SLOTS[5] = [4, 3, 2]
//    → At level 5: 4 first-level slots, 3 second-level, 2 third-level
//
//    🧠 This is a "jagged array" (every row has a different length).
//    Row 0 (unused): []
//    Row 3: [4, 2] — 4 slots at level 1, 2 slots at level 2
//    Row 20: [4, 3, 3, 3, 3, 2, 2, 1, 1] — slots for levels 1-9
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

// 🧠 HALF_CASTER_SLOTS — For Paladins and Rangers.
//    Progresses at HALF the speed of full casters (rounded down).
//    First spell slots at level 2. Max level-5 spells at level 18+.
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

// 🧠 PACT_SLOTS — Warlock pact magic. Different from regular slots:
//    - All slots are the SAME level (which increases with Warlock level)
//    - Very few slots (1-4), but recover on SHORT rest
//    - Keys = Warlock level, values = { slots, level }
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

// ============================================================
// CASTER TYPE DETECTION
// ============================================================

// 🧠 getCasterType — Determines what kind of caster a class is.
//    Reads the `casterProgression` field from the class data.
//    Returns null for non-casters (Barbarian, Fighter without EK, etc.).
export function getCasterType(classInfo: any): 'full' | 'half' | 'third' | 'pact' | null {
  if (!classInfo?.casterProgression) return null;
  const prog = classInfo.casterProgression;
  if (prog === 'pact') return 'pact';
  if (prog === 'half' || prog === '1/2') return 'half';
  if (prog === 'third' || prog === '1/3') return 'third';
  return 'full';
}

// ============================================================
// MULTICLASS CASTER LEVEL COMPUTATION
// ============================================================

// 🧠 getCombinedCasterLevel — The key multiclass function.
//    Per D&D 5e 2024 rules:
//    - Full caster levels add 1:1
//    - Half caster levels add 1:2 (round down) — Artificer rounds UP
//    - Third caster levels add 1:3 (round down)
//    - Pact magic is SEPARATE (Warlock slots don't combine)
//
//    The combined level determines your spell slots (from the full caster table).
//    The pact level determines your pact slots (from the pact table).
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
      if (cl.className === 'Artificer') {
        combined += Math.ceil(cl.level / 2);   // Artificer rounds UP
      } else {
        combined += Math.floor(cl.level / 2);  // Others round DOWN
      }
    } else if (type === 'third') {
      combined += Math.floor(cl.level / 3);    // EK/AT: 1/3 of level
    }
  }

  return { combinedLevel: Math.min(combined, 20), pactLevel: Math.min(pactLevel, 20), hasPact };
}

// 🧠 getMaxSpellLevel — What's the highest level spell you can cast?
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

// 🧠 getCantripsKnown — Looks up the cantrip progression for a class.
export function getCantripsKnown(classInfo: any, level: number): number {
  const prog = classInfo?.cantripProgression;
  if (!prog?.length) return 0;
  return prog[Math.min(level, prog.length) - 1] ?? 0;
}

// 🧠 getSpellsKnownAtLevel — For "spells known" casters (Bard, Sorcerer, Ranger).
//    Some classes have a cumulative total (spellsKnownProgression).
//    Some have an incremental table (spellsKnownProgressionFixed).
export function getSpellsKnownAtLevel(classInfo: any, level: number): number | null {
  const prog = classInfo?.spellsKnownProgression;
  if (prog?.length) return prog[Math.min(level, prog.length) - 1] ?? null;
  const fixed = classInfo?.spellsKnownProgressionFixed;
  if (fixed?.length) {
    return fixed.slice(0, level).reduce((a: number, b: number) => a + b, 0);
  }
  return null;
}

// 🧠 getPreparedCount — How many spells can a "prepared" caster prepare?
//    2024 classes use preparedSpellsProgression (array per level).
//    Legacy classes use a formula string like "<$level$> + <$wis_mod$>"
//    which we evaluate at runtime using Function() — a creative approach!
export function getPreparedCount(
  classInfo: any,
  level: number,
  abilityScore: number
): number {
  const prog = classInfo?.preparedSpellsProgression;
  if (prog?.length) return prog[Math.min(level, prog.length) - 1] ?? 0;

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
  return Boolean(classInfo?.spellsKnownProgression);
}

// 🧠 getSpellcastingAbility — Returns which ability score this class uses
//    for spellcasting (INT for Wizard, WIS for Cleric, CHA for Sorcerer).
//    Defaults to INT if not found.
export function getSpellcastingAbility(classInfo: any): keyof Character['baseStats'] {
  const ab = (classInfo?.spellcastingAbility || 'int').toLowerCase();
  if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(ab)) return ab as keyof Character['baseStats'];
  return 'int';
}

// ============================================================
// SPELL SLOT COMPUTATION
// ============================================================

// 🧠 computeMulticlassSpellSlots — Computes ALL spell slots for a multiclass
//    character using the combined caster level. Handles regular + pact slots.
export function computeMulticlassSpellSlots(
  classLevels: { className: string; level: number }[],
  classDataMap: Record<string, any>
): Record<number, SpellSlotState> {
  const { combinedLevel, pactLevel, hasPact } = getCombinedCasterLevel(classLevels, classDataMap);
  const slots: Record<number, SpellSlotState> = {};

  // Regular slots from the full caster table
  if (combinedLevel > 0) {
    const row = FULL_CASTER_SLOTS[Math.min(20, combinedLevel)] || [];
    row.forEach((max, idx) => {
      if (max > 0) slots[idx + 1] = { max, used: 0 };
    });
  }

  // Pact slots are ADDITIVE to regular slots at the same level
  if (hasPact && pactLevel > 0) {
    const pact = PACT_SLOTS[Math.min(20, pactLevel)] || PACT_SLOTS[1];
    if (slots[pact.level]) {
      slots[pact.level] = { max: slots[pact.level].max + pact.slots, used: 0 };
    } else {
      slots[pact.level] = { max: pact.slots, used: 0 };
    }
  }

  return slots;
}

// 🧠 buildSpellSlots — For single-class characters, just looks up the table.
//    Third casters (EK/AT) use the half-caster table -1 at each level.
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

// ============================================================
// COMBAT FORMULAS
// ============================================================

export function getSpellSaveDC(char: Character, classInfo: any): number {
  const ab = getSpellcastingAbility(classInfo);
  const mod = getAbilityModifier(char.baseStats[ab]);
  return 8 + char.level + mod;  // 8 + proficiency + ability mod
}

export function getSpellAttackBonus(char: Character, classInfo: any): number {
  const ab = getSpellcastingAbility(classInfo);
  return getAbilityModifier(char.baseStats[ab]) + char.level;  // proficiency + ability mod
}

export function resetSpellSlots(slots: Record<number, SpellSlotState>): Record<number, SpellSlotState> {
  const next: Record<number, SpellSlotState> = {};
  Object.entries(slots).forEach(([lvl, s]) => {
    next[Number(lvl)] = { max: s.max, used: 0 };
  });
  return next;
}

export function concentrationSaveDC(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));  // DC 10 or half damage, whichever higher
}
