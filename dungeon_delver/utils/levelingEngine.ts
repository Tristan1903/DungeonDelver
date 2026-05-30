import { FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, PACT_SLOTS, getPreparedCount } from './spellcastingEngine';

export const XP_THRESHOLDS = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

export const getLevelFromXP = (xp: number): number => {
    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= XP_THRESHOLDS[i]) return i + 1;
    }
    return 1;
};

export const getNextLevelXP = (level: number): number => {
    return XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
};

const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

export function isASLevel(level: number): boolean {
  return ASI_LEVELS.has(level);
}

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

export function getNewFeaturesAtLevel(
  classFeatures: any[] | undefined,
  className: string,
  level: number
): any[] {
  return (classFeatures || []).filter(
    (f) => f.level === level && f.className === className
  );
}

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

export interface HPGainDisplay {
  average: number;
  rolledMin: number;
  rolledMax: number;
  hitDieFaces: number;
}

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
