// =============================================================================
// 📘 FILE: utils/levelingEngine.ts
// =============================================================================
// 🎯 PURPOSE: Handles all level-up math — XP thresholds, ASI (Ability Score
//    Improvement) detection, subclass level detection, feature extraction at
//    each level, HP gain computation, and new spells/cantrips/slots per level.
//
// 🧠 REACT CONCEPT: Lookup Tables + Pure Computation
//    No React here — just arrays and functions. XP_THRESHOLDS is an array
//    where index = level-1, value = XP needed. Functions compute "what do
//    you get at this level?" by comparing newLevel vs oldLevel.
//
// 🧠 PATTERN: Deriving Change (newLevel - oldLevel)
//    Instead of saying "at level 5 you get these features," these functions
//    compute the DIFFERENCE between old and new. This is essential for the
//    Level-Up Wizard UI, which shows "here's what you GAIN."
//
// 🔧 HOW TO ALTER:
//    - Change XP progression: modify XP_THRESHOLDS array
//    - Change ASI levels: modify ASI_LEVELS Set
//    - Change subclass levels: modify getSubclassLevel logic
//    - Change HP calculation: modify getHPGainDisplay
// =============================================================================

import { FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, PACT_SLOTS, getPreparedCount } from './spellcastingEngine';

// 🧠 XP_THRESHOLDS[level-1] = XP needed to reach that level.
//    Standard D&D 5e progression. Level 2 = 300 XP, Level 3 = 900, etc.
//    Level 1 starts at 0 (index 0 = 0 XP).
export const XP_THRESHOLDS = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

// 🧠 Iterates backwards through the thresholds to find the highest level
//    the character's XP qualifies for. More efficient than forward iteration.
export const getLevelFromXP = (xp: number): number => {
    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= XP_THRESHOLDS[i]) return i + 1;
    }
    return 1;
};

export const getNextLevelXP = (level: number): number => {
    return XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
};

// 🧠 ASI_LEVELS — Levels at which characters get Ability Score Improvements.
//    Standard 5e: levels 4, 8, 12, 16, 19.
//    (Fighters and Rogues get extra ASIs at other levels — handled per-class.)
const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

export function isASLevel(level: number): boolean {
  return ASI_LEVELS.has(level);
}

// 🧠 getSubclassLevel — When does each class get their subclass?
//    Most classes get it at level 3, but some (Cleric, Sorcerer) get it at 1,
//    Wizard at 2, Artificer at 3. Reads from class data or falls back to defaults.
export function getSubclassLevel(classInfo: any): number {
  const subclassLevels = classInfo?.subclassLevels?.[0]?.level;
  if (subclassLevels) return subclassLevels;
  const subclassTitle = classInfo?.subclassTitle;
  if (subclassTitle?.includes('3')) return 3;
  if (subclassTitle?.includes('1')) return 1;
  if (classInfo?.name === 'Cleric') return 1;
  if (classInfo?.name === 'Sorcerer') return 1;
  if (classInfo?.name === 'Warlock') return 1;
  if (classInfo?.name === 'Wizard') return 2;
  if (classInfo?.name === 'Artificer') return 3;
  return 3;
}

// 🧠 getNewFeaturesAtLevel — Filters class features to find what's gained
//    at a specific level. Used by the level-up wizard to show new abilities.
export function getNewFeaturesAtLevel(
  classFeatures: any[] | undefined,
  className: string,
  level: number
): any[] {
  return (classFeatures || []).filter(
    (f) => f.level === level && f.className === className
  );
}

// 🧠 Same as above but for SUBCLASS features.
export function getNewSubclassFeaturesAtLevel(
  subclassFeatures: any[] | undefined,
  subclassName: string | undefined,
  level: number
): any[] {
  if (!subclassName) return [];
  return (subclassFeatures || []).filter(
    (f) => f.level === level && f.className === subclassName
  );
}

// 🧠 HP computation helpers
export interface HPGainDisplay {
  average: number;     // HP if player chooses "average" (rounded up)
  rolledMin: number;   // Minimum possible rolled HP (1 + con mod)
  rolledMax: number;   // Maximum possible rolled HP (hit die faces + con mod)
  hitDieFaces: number; // e.g., 8 for Fighter (d8 hit die)
}

// 🧠 getHPGainDisplay — Computes HP gain options for a level-up.
//    Average = (hitDieFaces / 2) + 1 + conMod (rounded up).
//    For a Fighter (d10): average = 5 + 1 + conMod = 6 + conMod.
export function getHPGainDisplay(classInfo: any, conMod: number): HPGainDisplay {
  const faces = classInfo?.hd?.faces ?? 8;
  const avg = Math.floor(faces / 2) + 1 + conMod;
  return {
    average: Math.max(1, avg),
    rolledMin: Math.max(1, 1 + conMod),
    rolledMax: Math.max(1, faces + conMod),
    hitDieFaces: faces,
  };
}

// 🧠 The following functions compute what CHANGES between old and new levels.
//    Used by LevelUpWizard to display "you gained these new spells/slots."

export function getNewCantripsKnown(classInfo: any, newLevel: number, oldLevel: number): number {
  const prog = classInfo?.cantripProgression;
  if (!prog?.length) return 0;
  const newCount = prog[Math.min(newLevel, prog.length) - 1] ?? 0;
  const oldCount = prog[Math.min(oldLevel, prog.length) - 1] ?? 0;
  return Math.max(0, newCount - oldCount);
}

export function getNewSpellsKnown(classInfo: any, newLevel: number, oldLevel: number): number {
  const prog = classInfo?.spellsKnownProgression;
  if (prog?.length) {
    return (prog[Math.min(newLevel, prog.length) - 1] ?? 0) -
           (prog[Math.min(oldLevel, prog.length) - 1] ?? 0);
  }
  return 0;
}

export function getNewPreparedCount(classInfo: any, newLevel: number, oldLevel: number, abilityScore: number): number {
  const newCount = getPreparedCount(classInfo, newLevel, abilityScore);
  const oldCount = getPreparedCount(classInfo, oldLevel, abilityScore);
  return newCount - oldCount;
}

// 🧠 getNewSpellSlots — Compares spell slot tables at old vs new level.
//    Returns an array of changes, e.g., [{ level: 3, newMax: 2, oldMax: 0 }]
//    meaning "you unlocked 2 third-level slots."
export function getNewSpellSlots(
  classInfo: any,
  newLevel: number,
  oldLevel: number
): { level: number; newMax: number; oldMax: number }[] {
  const progression = classInfo?.casterProgression;
  if (progression === 'pact') {
    const newPact = PACT_SLOTS[Math.min(20, newLevel)] || PACT_SLOTS[1];
    const oldPact = PACT_SLOTS[Math.min(20, oldLevel)] || PACT_SLOTS[1];
    if (newPact.slots !== oldPact.slots || newPact.level !== oldPact.level) {
      return [{ level: newPact.level, newMax: newPact.slots, oldMax: oldPact.slots }];
    }
    return [];
  }

  const table = progression === 'half' || progression === '1/2'
    ? HALF_CASTER_SLOTS
    : progression === 'third' || progression === '1/3'
      ? HALF_CASTER_SLOTS.map((row) => row.map((n) => (n ? Math.max(0, n - 1) : 0)))
      : FULL_CASTER_SLOTS;

  const newRow = table[Math.min(20, newLevel)] || [];
  const oldRow = table[Math.min(20, oldLevel)] || [];
  const changes: { level: number; newMax: number; oldMax: number }[] = [];

  for (let i = 0; i < Math.max(newRow.length, oldRow.length); i++) {
    const newVal = newRow[i] || 0;
    const oldVal = oldRow[i] || 0;
    if (newVal !== oldVal) {
      changes.push({ level: i + 1, newMax: newVal, oldMax: oldVal });
    }
  }
  return changes;
}
