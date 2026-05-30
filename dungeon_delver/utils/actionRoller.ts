import { rollDice, rollD20, RollResult } from './rollEngine';

export interface ParsedAction {
  name: string;
  entries?: unknown[];
  diceFormulas: string[];
  hasDamage: boolean;
}

export function parseActionDice(entries: unknown[]): string[] {
  const text = JSON.stringify(entries || []);
  const formulas: string[] = [];
  const regex = /(\d+d\d+(?:\s*\+\s*\d+)?)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    formulas.push(match[1].replace(/\s/g, ''));
  }
  return formulas;
}

export function parseAction(action: { name: string; entries?: unknown[] }): ParsedAction {
  const diceFormulas = parseActionDice(action.entries || []);
  return {
    name: action.name,
    entries: action.entries,
    diceFormulas,
    hasDamage: diceFormulas.length > 0,
  };
}

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
