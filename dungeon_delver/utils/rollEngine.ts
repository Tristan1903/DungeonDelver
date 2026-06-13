// =============================================================================
// 📘 FILE: utils/rollEngine.ts
// =============================================================================
// 🎯 PURPOSE: The core dice engine. Handles ALL dice rolling in the app:
//    - rollD20 (single d20)
//    - rollD20WithAdvantage (advantage/disadvantage/normal)
//    - rollDice (arbitrary formulas like "2d6+3")
//    - performAction (monster attack/damage rolls)
//    - applyDamageModifier (resistance/immunity/vulnerability)
//
//    Also provides the ROLL LOG subscription system — when any dice is rolled,
//    an entry is emitted to all listeners (used by RollLogContext).
//
// 🧠 REACT CONCEPT: Event Emitter / Subscription Pattern
//    rollEngine doesn't know about React at all. It's a plain TypeScript
//    module with a listener array. React components (via RollLogContext)
//    subscribe to receive roll events.
//
//    This is a KEY architectural pattern: the ENGINE (pure logic) is separate
//    from the UI (React components). The engine works in any context — React,
//    Node.js, or unit tests.
//
// 🔧 HOW TO ALTER:
//    - Add a new dice type: add a new exported function (e.g., rollPercentile())
//    - Change the roll log format: add fields to RollResult interface
//    - Add advantage variants: modify rollD20WithAdvantage
//    - Change damage modifier behavior: modify applyDamageModifier
// =============================================================================

// 🧠 RollResult — The shape of every dice roll's outcome.
export interface RollResult {
  rolls: number[];      // Individual dice results (e.g., [4, 6] for 2d6)
  modifier: number;     // Flat modifier (e.g., +3 from ability score)
  total: number;        // Sum of rolls + modifier (final result)
  formula: string;      // The original dice formula (e.g., "1d20", "2d6+3")
  label?: string;       // Optional name (e.g., "Strength Check", "Fireball Damage")
}

// 🧠 RollLogEntry — Extends RollResult with metadata for the log.
//    Uses TypeScript's INTERSECTION TYPE (`&`) — combines two types into one.
export type RollLogEntry = RollResult & { timestamp: number; source: string };

// 🧠 Listener system (custom event emitter — no library needed!)
const rollListeners: Array<(entry: RollLogEntry) => void> = [];
// This array holds ALL the subscriber functions. When a roll happens,
// every function in this array gets called with the roll result.

// 🧠 subscribeRollLog — Adds a listener and returns an UNSUBSCRIBE function.
//    This is the same pattern as useEffect's cleanup: call subscribe,
//    store the returned function, call it later to unsubscribe.
//
//    💡 This is exactly how Redux, Zustand, and other state managers work
//    under the hood — a simple array of listener functions.
export function subscribeRollLog(fn: (entry: RollLogEntry) => void): () => void {
  rollListeners.push(fn);
  return () => {
    const i = rollListeners.indexOf(fn);
    if (i >= 0) rollListeners.splice(i, 1);  // Remove from array
  };
}

// 🧠 emitRoll — Internal function. Calls ALL subscribers with the new entry.
function emitRoll(entry: RollLogEntry) {
  rollListeners.forEach((fn) => fn(entry));
}

// ============================================================
// DICE ROLLING FUNCTIONS
// ============================================================

// 🧠 parseDiceFormula — Parses "3d6+2" into { count: 3, sides: 6, modifier: 2 }
//    Uses a REGEX: ^(\d+)d(\d+)([+-]\d+)?$
//    - ^(\d+)  = one or more digits at the start
//    - d       = literal 'd'
//    - (\d+)   = one or more digits (sides)
//    - ([+-]\d+)? = optional: + or - followed by digits
//
//    Returns null if the formula doesn't match (e.g., "hello" or "d6" without count)
export function parseDiceFormula(formula: string): { count: number; sides: number; modifier: number } | null {
  const trimmed = formula.trim().toLowerCase().replace(/\s/g, '');
  const match = trimmed.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

// 🧠 rollDice — Rolls ANY dice formula and emits to the log.
//    If the formula can't be parsed, it tries to interpret it as a plain modifier.
export function rollDice(formula: string, label?: string, source = 'general'): RollResult {
  const parsed = parseDiceFormula(formula);
  if (!parsed) {
    // Not a dice formula — maybe it's just a number (pure modifier roll)?
    const mod = parseInt(formula, 10) || 0;
    return { rolls: [], modifier: mod, total: mod, formula, label };
  }
  // Roll each die individually
  const rolls: number[] = [];
  for (let i = 0; i < parsed.count; i++) {
    rolls.push(Math.floor(Math.random() * parsed.sides) + 1);  // 1 to sides
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + parsed.modifier;
  const result: RollResult = { rolls, modifier: parsed.modifier, total, formula, label };
  emitRoll({ ...result, timestamp: Date.now(), source });  // 🧠 Spread + add fields
  return result;
}

// 🧠 rollD20 — Simple d20 roll with modifier.
export const rollD20 = (modifier = 0, label?: string, source = 'd20') => {
  const roll = Math.floor(Math.random() * 20) + 1;
  const result: RollResult = { rolls: [roll], modifier, total: roll + modifier, formula: '1d20', label };
  emitRoll({ ...result, timestamp: Date.now(), source });
  return result;
};

export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';

// 🧠 rollD20WithAdvantage — Rolls 2d20, keeps higher (advantage) or lower (disadvantage).
//    For 'normal', delegates to rollD20 (only one roll needed).
export const rollD20WithAdvantage = (mode: AdvantageMode, modifier = 0, label?: string, source = 'd20') => {
  if (mode === 'normal') return rollD20(modifier, label, source);
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  const roll = mode === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
  const result: RollResult = { rolls: [roll1, roll2], modifier, total: roll + modifier, formula: mode === 'advantage' ? '1d20 adv' : '1d20 dis', label };
  emitRoll({ ...result, timestamp: Date.now(), source });
  return result;
};

// 🧠 performAction — For monster attacks: supports both auto-roll and manual entry.
export const performAction = (
  actionName: string,
  dice: string,
  modifier: number,
  mode: 'auto' | 'manual',
  manualValue?: number
): RollResult | string => {
  if (mode === 'manual') {
    if (manualValue === undefined) return 'Waiting for roll...';
    const total = manualValue + modifier;
    const result: RollResult = { rolls: [manualValue], modifier, total, formula: '1d20', label: actionName };
    emitRoll({ ...result, timestamp: Date.now(), source: 'manual' });
    return result;
  }
  return rollDice(dice, actionName, 'action');
};

// 🧠 applyDamageModifier — Applies resistance, immunity, and vulnerability.
//    Uses partial string matching (e.g., "fire" matches "fire damage").
export function applyDamageModifier(
  baseDamage: number,
  damageType: string,
  resist?: string[],
  immune?: string[],
  vuln?: string[]
): { damage: number; note: string } {
  const type = damageType.toLowerCase();
  const resistList = (resist || []).map((r) => r.toLowerCase());
  const immuneList = (immune || []).map((r) => r.toLowerCase());
  const vulnList = (vuln || []).map((r) => r.toLowerCase());

  if (immuneList.some((r) => type.includes(r) || r.includes(type))) {
    return { damage: 0, note: 'Immune — no damage' };
  }
  if (resistList.some((r) => type.includes(r) || r.includes(type))) {
    return { damage: Math.floor(baseDamage / 2), note: 'Resistant — halved' };
  }
  if (vulnList.some((r) => type.includes(r) || r.includes(type))) {
    return { damage: baseDamage * 2, note: 'Vulnerable — doubled' };
  }
  return { damage: baseDamage, note: '' };
}

// 🧠 parseMonsterDamageTypes — Extracts resistance/immunity/vulnerability from
//    monster stat block data. Handles both string arrays and object arrays
//    (the 5e JSON format varies).
export function parseMonsterDamageTypes(monster: any): {
  resist: string[];
  immune: string[];
  vuln: string[];
} {
  const resist: string[] = [];
  const immune: string[] = [];
  const vuln: string[] = [];
  const addFrom = (arr: unknown, target: string[]) => {
    if (!arr) return;
    if (Array.isArray(arr)) {
      arr.forEach((item) => {
        if (typeof item === 'string') target.push(item);
        else if (item && typeof item === 'object') {
          Object.keys(item).forEach((k) => {
            if (k !== 'special') target.push(k);
          });
        }
      });
    }
  };
  addFrom(monster.resist, resist);
  addFrom(monster.immune, immune);
  addFrom(monster.vulnerable, vuln);
  return { resist, immune, vuln };
}
