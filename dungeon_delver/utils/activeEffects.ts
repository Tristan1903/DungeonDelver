export interface ActiveEffectModifiers {
  speed?: number;
  ac?: number;
  attackBonus?: number;
  saveBonus?: number;
  stealthDisadvantage?: boolean;
  attackDisadvantage?: boolean;
  grantAdvantageToAttackers?: boolean;
  autoFailStrDexSaves?: boolean;
  autoCritWithin5ft?: boolean;
  canTakeActions?: boolean;
  canMove?: boolean;
}

export interface ActiveEffect {
  name: string;
  source: 'condition' | 'spell' | 'mastery' | 'item';
  modifiers: ActiveEffectModifiers;
}

const CONDITION_EFFECTS: Record<string, ActiveEffectModifiers> = {
  Blinded: {
    attackDisadvantage: true,
    grantAdvantageToAttackers: true,
    stealthDisadvantage: true,
  },
  Charmed: {},
  Deafened: {},
  Frightened: { attackDisadvantage: true },
  Grappled: { speed: 0 },
  Incapacitated: { canTakeActions: false },
  Invisible: { grantAdvantageToAttackers: false },
  Paralyzed: {
    speed: 0,
    autoFailStrDexSaves: true,
    autoCritWithin5ft: true,
    canTakeActions: false,
    canMove: false,
  },
  Petrified: {
    speed: 0,
    grantAdvantageToAttackers: true,
    canTakeActions: false,
    canMove: false,
  },
  Poisoned: { attackDisadvantage: true, stealthDisadvantage: true },
  Prone: {
    speed: 0,
    attackDisadvantage: true,
    grantAdvantageToAttackers: true,
  },
  Restrained: {
    speed: 0,
    attackDisadvantage: true,
    grantAdvantageToAttackers: true,
    stealthDisadvantage: true,
  },
  Stunned: {
    speed: 0,
    autoFailStrDexSaves: true,
    grantAdvantageToAttackers: true,
    canTakeActions: false,
    canMove: false,
  },
  Unconscious: {
    speed: 0,
    autoFailStrDexSaves: true,
    autoCritWithin5ft: true,
    canTakeActions: false,
    canMove: false,
    grantAdvantageToAttackers: true,
  },
};

export function getConditionEffect(conditionName: string): ActiveEffectModifiers | null {
  const key = Object.keys(CONDITION_EFFECTS).find(
    (k) => k.toLowerCase() === conditionName.toLowerCase()
  );
  return key ? CONDITION_EFFECTS[key] : null;
}

export function getEffectsFromConditions(conditions: string[]): ActiveEffect[] {
  const effects: ActiveEffect[] = [];
  for (const cond of conditions) {
    const mods = getConditionEffect(cond);
    if (mods) {
      effects.push({ name: cond, source: 'condition', modifiers: mods });
    }
  }
  return effects;
}

export function getCombinedModifiers(effects: ActiveEffect[]): ActiveEffectModifiers {
  const combined: ActiveEffectModifiers = {};
  for (const effect of effects) {
    const m = effect.modifiers;
    if (m.speed !== undefined) combined.speed = Math.min(combined.speed ?? Infinity, m.speed);
    if (m.ac !== undefined) combined.ac = (combined.ac ?? 0) + m.ac;
    if (m.attackBonus !== undefined) combined.attackBonus = (combined.attackBonus ?? 0) + m.attackBonus;
    if (m.saveBonus !== undefined) combined.saveBonus = (combined.saveBonus ?? 0) + m.saveBonus;
    if (m.stealthDisadvantage) combined.stealthDisadvantage = true;
    if (m.attackDisadvantage) combined.attackDisadvantage = true;
    if (m.grantAdvantageToAttackers) combined.grantAdvantageToAttackers = true;
    if (m.autoFailStrDexSaves) combined.autoFailStrDexSaves = true;
    if (m.autoCritWithin5ft) combined.autoCritWithin5ft = true;
    if (m.canTakeActions === false) combined.canTakeActions = false;
    if (m.canMove === false) combined.canMove = false;
  }
  return combined;
}

export interface EffectiveStats {
  speed: number | string;
  ac: number;
  attackDisadvantage: boolean;
  grantAdvantageToAttackers: boolean;
}

export function computeEffectiveSpeed(baseSpeed: number | string | undefined, effects: ActiveEffect[]): number | string {
  const mods = getCombinedModifiers(effects);
  if (mods.speed !== undefined) {
    if (mods.speed === 0) return 0;
    return Math.max(0, (typeof baseSpeed === 'number' ? baseSpeed : 30) + mods.speed);
  }
  return baseSpeed ?? 30;
}
