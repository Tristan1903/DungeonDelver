// =============================================================================
// 📘 FILE: utils/actionRoller.ts
// =============================================================================
// 🎯 PURPOSE: Parses monster action entries (from JSON stat blocks) to extract
//    dice formulas, then rolls attack and damage for those actions.
//
// 🧠 REACT CONCEPT: Data Parsing + Wrapping
//    Monster stat blocks store actions as JSON entries (arrays of strings).
//    This engine extracts dice formulas (like "2d6+3") from those text entries,
//    then uses rollEngine to generate actual rolls.
//
//    This is a "wrapper" layer — it sits between raw monster data and the
//    rollEngine, transforming the data format into something rollable.
//
// 🔧 HOW TO ALTER:
//    - Change formula extraction: modify the regex in parseActionDice
//    - Add damage type parsing: extract damage types from entries
//    - Change action format: modify parseAction to handle new data shapes
// =============================================================================

import { rollDice, rollD20, RollResult } from './rollEngine';

export interface ParsedAction {
  name: string;
  entries?: unknown[];
  diceFormulas: string[];
  hasDamage: boolean;
}

// 🧠 parseActionDice — Scans action description text for dice formulas.
//    Uses a regex to find patterns like "3d6", "2d8+4", "1d20+5".
//    The regex /(\d+d\d+(?:\s*\+\s*\d+)?)/gi matches:
//    - \d+d\d+  = number + "d" + number (e.g., "2d6")
//    - (?:\s*\+\s*\d+)? = optional: spaces, +, spaces, number (e.g., " + 3")
//
//    💡 The regex approach works because monster stat blocks use consistent
//    formatting for damage expressions: "Hit: 7 (2d6 + 3) piercing damage."
export function parseActionDice(entries: unknown[]): string[] {
  const text = JSON.stringify(entries || []);
  const formulas: string[] = [];
  const regex = /(\d+d\d+(?:\s*\+\s*\d+)?)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    formulas.push(match[1].replace(/\s/g, ''));  // Remove spaces so "2d6 + 3" → "2d6+3"
  }
  return formulas;
}

export function parseAction(action: { name: string; entries?: unknown[] }): ParsedAction {
  const diceFormulas = parseActionDice(action.entries || []);
  return { name: action.name, entries: action.entries, diceFormulas, hasDamage: diceFormulas.length > 0 };
}

// 🧠 rollActionDamage — Rolls attack + damage for a monster action.
//    If attackBonus is provided, also rolls a d20 attack.
//    Returns attack roll, damage roll, and total damage.
export function rollActionDamage(
  action: { name: string; entries?: unknown[] },
  attackBonus?: number
): { attackRoll?: RollResult; damageRoll?: RollResult; totalDamage?: number } {
  const parsed = parseAction(action);
  if (parsed.diceFormulas.length === 0) {
    const attackRoll = rollD20(attackBonus ?? 0, `${action.name} attack`, 'combat-action');
    return { attackRoll };
  }
  const attackRoll = attackBonus !== undefined
    ? rollD20(attackBonus, `${action.name} attack`, 'combat-action')
    : undefined;
  const damageRoll = rollDice(parsed.diceFormulas[0], `${action.name} damage`, 'combat-action');
  return { attackRoll, damageRoll, totalDamage: damageRoll.total };
}

// 🧠 rollActionSimple — Simplified version that rolls the action and returns
//    a formatted string for display in the combat tracker.
export function rollActionSimple(action: { name: string; entries?: unknown[] }): {
  rollResult: string;
  total: number;
  attackRoll?: number;
} {
  const parsed = parseAction(action);
  if (parsed.diceFormulas.length === 0) {
    const atk = rollD20(0, `${action.name} attack`, 'combat-action');
    return { rollResult: `Attack ${atk.total}`, total: atk.total, attackRoll: atk.total };
  }
  const result = rollDice(parsed.diceFormulas[0], action.name, 'combat-action');
  const display = `[${result.rolls.join(', ')}]${result.modifier ? ` + ${result.modifier}` : ''} = ${result.total}`;
  return { rollResult: display, total: result.total };
}
