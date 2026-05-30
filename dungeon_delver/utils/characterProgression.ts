import { Character, CharacterFeature, ClassLevel, getClassList } from '../lib/character';
import { computeResources, computeAllResources } from './classResources';
import { buildSpellSlots } from './spellcastingEngine';

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateTotalLevel(classLevels: ClassLevel[]): number {
  return classLevels.reduce((sum, cl) => sum + cl.level, 0) || 1;
}

export function getHitDieFaces(classInfo: { hd?: { faces?: number } }): number {
  return classInfo?.hd?.faces ?? 8;
}

export function rollHitDie(faces: number): number {
  return Math.floor(Math.random() * faces) + 1;
}

export function computeMaxHp(
  classInfo: { hd?: { faces?: number } },
  conMod: number,
  totalLevel: number,
  useAverage = true
): number {
  const faces = getHitDieFaces(classInfo);
  const firstLevel = faces + conMod;
  if (totalLevel <= 1) return Math.max(1, firstLevel);
  const perLevel =
    useAverage ? Math.floor(faces / 2) + 1 + conMod : rollHitDie(faces) + conMod;
  return Math.max(1, firstLevel + perLevel * (totalLevel - 1));
}

export function hpGainOnLevelUp(
  classInfo: { hd?: { faces?: number } },
  conMod: number,
  useAverage = true
): number {
  const faces = getHitDieFaces(classInfo);
  const gain = useAverage ? Math.floor(faces / 2) + 1 + conMod : rollHitDie(faces) + conMod;
  return Math.max(1, gain);
}

const SKILL_NAME_MAP: Record<string, string> = {
  'sleight of hand': 'sleightOfHand',
  'animal handling': 'animalHandling',
};

export function normalizeSkillName(name: string): string {
  const clean = name.toLowerCase().trim();
  return SKILL_NAME_MAP[clean] ?? clean.replace(/\s+/g, '');
}

export function extractSkillChoices(classInfo: any): { from: string[]; count: number } | null {
  const skills = classInfo?.startingProficiencies?.skills;
  if (!skills?.length) return null;
  for (const entry of skills) {
    if (entry.choose) {
      const from = (entry.choose.from || []).map((s: string) => normalizeSkillName(s));
      return { from, count: entry.choose.count || 1 };
    }
  }
  return null;
}

export function extractBackgroundSkills(backgroundData: any): string[] {
  const profs = backgroundData?.skillProficiencies;
  if (!profs?.length) return [];
  const result: string[] = [];
  for (const entry of profs) {
    if (typeof entry === 'string') {
      result.push(normalizeSkillName(entry.replace(/\|\|.*$/, '').replace(/^.*\|/, '')));
    } else if (entry.choose) {
      // fixed choices handled separately
    } else {
      Object.keys(entry).forEach((k) => {
        if (k !== 'choose') result.push(normalizeSkillName(k));
      });
    }
  }
  return result;
}

export function mergeFeatures(
  classFeatures: any[] | undefined,
  subclassFeatures: any[] | undefined,
  className: string,
  subclassName: string | undefined,
  upToLevel: number,
  onlyLevel?: number
): CharacterFeature[] {
  const seen = new Set<string>();
  const out: CharacterFeature[] = [];
  const push = (f: { name: string; level: number; entries?: unknown }, source: string) => {
    if (onlyLevel !== undefined && f.level !== onlyLevel) return;
    if (seen.has(f.name)) return;
    seen.add(f.name);
    out.push({ name: f.name, level: f.level, source, entries: f.entries });
  };
  (classFeatures || [])
    .filter((f) => f.level <= upToLevel && f.className === className)
    .forEach((f) => push(f, className));
  if (subclassName) {
    (subclassFeatures || [])
      .filter((f) => f.level <= upToLevel && f.className === subclassName)
      .forEach((f) => push(f, subclassName));
  }
  return out;
}

export function buildClassLevels(
  className: string,
  subclass: string | undefined,
  targetClassLevel: number,
  existingClassLevels?: ClassLevel[]
): ClassLevel[] {
  const existing = existingClassLevels || [];
  if (existing.length === 0) {
    return [{ className, level: targetClassLevel, subclass }];
  }
  // Check if this class already exists
  const idx = existing.findIndex(cl => cl.className === className);
  if (idx >= 0) {
    // Update existing class entry
    const updated = [...existing];
    updated[idx] = { ...updated[idx], level: targetClassLevel, subclass: subclass ?? updated[idx].subclass };
    return updated;
  } else {
    // Add new class
    return [...existing, { className, level: targetClassLevel, subclass }];
  }
}

export function applyLevelUp(
  existing: Character,
  updates: Partial<Character>
): Character {
  const merged = { ...existing, ...updates };
  merged.totalLevel = calculateTotalLevel(merged.classLevels);
  merged.level = merged.levelingMode === 'milestone' ? merged.level : merged.totalLevel;
  const classList = getClassList(merged);
  merged.class = classList[0] || merged.class || 'Fighter';
  merged.classes = classList;
  return merged;
}

export function finalizeCharacterFromWizard(
  draft: Partial<Character> & {
    baseStats: Character['baseStats'];
    selectedSubclass?: string;
    classSkillPicks?: string[];
    backgroundProficiencies?: string[];
    expertise?: string[];
    hpGainOverride?: number;
  },
  classInfo: any,
  classFeatures: any[],
  subclassFeatures: any[],
  backgroundData: any,
  mode: 'create' | 'levelup',
  existingChar?: Character | null
): Character {
  const className = draft.class || 'Fighter';
  const subclass = draft.selectedSubclass || (draft as { subclass?: string }).subclass;
  const baseStats = draft.baseStats;
  const conMod = getAbilityModifier(baseStats.con);
  const chaMod = getAbilityModifier(baseStats.cha);
  const wisMod = getAbilityModifier(baseStats.wis);

  const prevClassLevels = existingChar?.classLevels || [];

  // Determine the target class's new individual level and the new total level
  const oldTargetClassLevel = prevClassLevels.find(cl => cl.className === className)?.level ?? 0;
  const isNewClass = oldTargetClassLevel === 0;
  const targetClassLevel = isNewClass ? 1 : oldTargetClassLevel + 1;
  const newTotalLevel = mode === 'levelup' && existingChar
    ? (existingChar.totalLevel || existingChar.level) + 1
    : targetClassLevel;

  const classLevels = buildClassLevels(className, subclass, targetClassLevel, prevClassLevels);
  const newFeatures = mergeFeatures(classFeatures, subclassFeatures, className, subclass, targetClassLevel, mode === 'levelup' ? targetClassLevel : undefined);
  const features = mode === 'levelup' && existingChar
    ? [...(existingChar.features || []), ...newFeatures]
    : newFeatures;

  const bgSkills = backgroundData ? extractBackgroundSkills(backgroundData) : [];
  const proficiencies = Array.from(
    new Set([...(draft.proficiencies || []), ...bgSkills, ...(draft.classSkillPicks || [])])
  );
  const existingExpertise = existingChar?.expertise || [];
  const draftExpertise = draft.expertise || [];
  const bgPicks = draft.backgroundProficiencies || bgSkills;
  const computedExpertise = Array.from(new Set(
    [...existingExpertise, ...draftExpertise, ...proficiencies.filter((s) => bgPicks.includes(s))]
  ));

  let hpMax: number;
  let hpCurrent: number;

  if (mode === 'levelup' && existingChar) {
    const gain = draft.hpGainOverride ?? hpGainOnLevelUp(classInfo, conMod);
    hpMax = existingChar.hp.max + gain;
    hpCurrent = Math.min(existingChar.hp.current + gain, hpMax);
  } else {
    hpMax = computeMaxHp(classInfo, conMod, targetClassLevel);
    hpCurrent = hpMax;
  }

  // Merge old feature picks with new ones, namespaced by className
  const oldPicks = existingChar?.classFeaturePicks || {};
  const draftPicks = draft.classFeaturePicks || {};
  const mergedPicks: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(oldPicks)) {
    mergedPicks[k] = [...v];
  }
  for (const [k, v] of Object.entries(draftPicks)) {
    const namespacedKey = k.includes(':') ? k : `${className}:${k}`;
    mergedPicks[namespacedKey] = [...(mergedPicks[namespacedKey] || []), ...v.filter((pick: string) => !(mergedPicks[namespacedKey] || []).includes(pick))];
  }

  const classList = [...new Set([...(existingChar?.classes || []), ...classLevels.map(cl => cl.className)])];

  const base: Character = {
    id: existingChar?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ''),
    name: draft.name || 'Adventurer',
    expertise: computedExpertise,
    race: draft.race || '',
    class: className,
    classes: classList,
    background: draft.background,
    classLevels,
    totalLevel: newTotalLevel,
    level: newTotalLevel,
    xp: mode === 'levelup' && existingChar ? existingChar.xp : 0,
    levelingMode: existingChar?.levelingMode ?? 'individual',
    baseStats,
    hp: { current: hpCurrent, max: hpMax },
    inventory: draft.inventory || existingChar?.inventory || [],
    proficiencies,
    features,
    resources: computeAllResources(classLevels, chaMod, wisMod),
    classFeaturePicks: mergedPicks,
    spells: existingChar?.spells ?? { cantrips: [], known: [], prepared: [] },
    spellSlots: (() => {
      const fresh = buildSpellSlots(classInfo, targetClassLevel);
      // On level-up, preserve used slots, update max values
      if (mode === 'levelup' && existingChar?.spellSlots) {
        for (const [lvl, slot] of Object.entries(fresh)) {
          const old = existingChar.spellSlots[Number(lvl)];
          if (old) fresh[Number(lvl)].used = Math.min(old.used, fresh[Number(lvl)].max);
        }
      }
      return fresh;
    })(),
    concentratingOn: existingChar?.concentratingOn ?? null,
  };

  if (mode === 'levelup' && existingChar) {
    return {
      ...existingChar,
      ...base,
      spells: existingChar.spells ?? base.spells,
      inventory: existingChar.inventory?.length ? existingChar.inventory : base.inventory,
    };
  }

  return base;
}
