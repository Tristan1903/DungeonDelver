// =============================================================================
// 📘 FILE: utils/activeEffects.ts
// =============================================================================
// 🎯 PURPOSE: Defines the mechanical game effects of conditions (Blinded,
//    Paralyzed, Stunned, etc.) and provides functions to combine them.
//    Used by the combat tracker to compute effective combat stats.
//
// 🧠 REACT CONCEPT: Static Data + Pure Computation
//    CONDITION_EFFECTS is a static lookup table — it defines "what does
//    'Blinded' do?" in machine-readable form. The functions then combine
//    multiple conditions into a single set of modifiers for the UI.
//
//    💡 Instead of hard-coding "if blinded then disadvantage," this data-driven
//    approach means adding a new condition is just adding an entry to the table.
//
// 🔧 HOW TO ALTER:
//    - Add a new condition: add an entry to CONDITION_EFFECTS
//    - Change how modifiers combine: modify getCombinedModifiers (e.g., speed
//      uses Math.min for stacking, which is the most restrictive)
//    - Add new modifier types: add fields to ActiveEffectModifiers interface
// =============================================================================

// 🧠 ActiveEffectModifiers — All the combat-relevant stats that conditions
//    can affect. Each boolean represents "this bad thing is happening."
export interface ActiveEffectModifiers {
  speed?: number;                      // Speed reduction (0 = immobilized)
  ac?: number;                         // AC change (+/-)
  attackBonus?: number;                // Attack roll modifier
  saveBonus?: number;                  // Saving throw modifier
  stealthDisadvantage?: boolean;       // Can't hide
  attackDisadvantage?: boolean;        // Attacks have disadvantage
  grantAdvantageToAttackers?: boolean; // Attackers have advantage against you
  autoFailStrDexSaves?: boolean;       // Auto-fail STR and DEX saves
  autoCritWithin5ft?: boolean;         // Attacks within 5ft auto-crit
  canTakeActions?: boolean;            // Can the creature take actions?
  canMove?: boolean;                   // Can the creature move?
}

export interface ActiveEffect {
  name: string;
  source: 'condition' | 'spell' | 'mastery' | 'item';
  modifiers: ActiveEffectModifiers;
}

// 🧠 CONDITION_EFFECTS — A record/map of condition names to their effects.
//    This is the GAME RULES encoded as data. Each condition has a set of
//    modifier overrides. Conditions not listed (like Deafened) have no
//    combat mechanics in 5e (but have roleplay effects).
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
  Invisible: { grantAdvantageToAttackers: false }, // Note: gives advantage to attacker actually
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

// 🧠 getConditionEffect — Case-insensitive lookup of a condition's effects.
export function getConditionEffect(conditionName: string): ActiveEffectModifiers | null {
  const key = Object.keys(CONDITION_EFFECTS).find(
    (k) => k.toLowerCase() === conditionName.toLowerCase()
  );
  return key ? CONDITION_EFFECTS[key] : null;
}

// 🧠 getEffectsFromConditions — Converts an array of condition names into
//    an array of ActiveEffect objects (for use with getCombinedModifiers).
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

// 🧠 getCombinedModifiers — Takes MULTIPLE effects and merges them into one.
//    Rules for combining:
//    - Speed: the LOWEST (most restrictive) wins (Math.min)
//    - Numeric bonuses: ADDITIVE (ac, attackBonus, saveBonus stack)
//    - Booleans: if ANY effect says true, the combined is true (OR logic)
//    - "canTakeActions: false" and "canMove: false" are special — if ANY
//      effect sets them to false, the combined is false (most restrictive).
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

// 🧠 computeEffectiveSpeed — Applies speed modifiers to a base speed.
//    If modifiers set speed to 0, returns 0 (immobilized).
//    Otherwise: baseSpeed + modifier, minimum 0.
export function computeEffectiveSpeed(baseSpeed: number | string | undefined, effects: ActiveEffect[]): number | string {
  const mods = getCombinedModifiers(effects);
  if (mods.speed !== undefined) {
    if (mods.speed === 0) return 0;
    return Math.max(0, (typeof baseSpeed === 'number' ? baseSpeed : 30) + mods.speed);
  }
  return baseSpeed ?? 30;
}
