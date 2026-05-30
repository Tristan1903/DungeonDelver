export interface RollResult {
  rolls: number[];
  modifier: number;
  total: number;
  formula: string;
  label?: string;
}

export type RollLogEntry = RollResult & { timestamp: number; source: string };

const rollListeners: Array<(entry: RollLogEntry) => void> = [];

export function subscribeRollLog(fn: (entry: RollLogEntry) => void): () => void {
  rollListeners.push(fn);
  return () => {
    const i = rollListeners.indexOf(fn);
    if (i >= 0) rollListeners.splice(i, 1);
  };
}

function emitRoll(entry: RollLogEntry) {
  rollListeners.forEach((fn) => fn(entry));
}

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

export function rollDice(formula: string, label?: string, source = 'general'): RollResult {
  const parsed = parseDiceFormula(formula);
  if (!parsed) {
    const mod = parseInt(formula, 10) || 0;
    return { rolls: [], modifier: mod, total: mod, formula, label };
  }
  const rolls: number[] = [];
  for (let i = 0; i < parsed.count; i++) {
    rolls.push(Math.floor(Math.random() * parsed.sides) + 1);
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + parsed.modifier;
  const result: RollResult = {
    rolls,
    modifier: parsed.modifier,
    total,
    formula,
    label,
  };
  emitRoll({ ...result, timestamp: Date.now(), source });
  return result;
}

export const rollD20 = (modifier = 0, label?: string, source = 'd20') => {
  const roll = Math.floor(Math.random() * 20) + 1;
  const result: RollResult = {
    rolls: [roll],
    modifier,
    total: roll + modifier,
    formula: '1d20',
    label,
  };
  emitRoll({ ...result, timestamp: Date.now(), source });
  return result;
};

export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';

export const rollD20WithAdvantage = (mode: AdvantageMode, modifier = 0, label?: string, source = 'd20') => {
  if (mode === 'normal') return rollD20(modifier, label, source);
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  const roll = mode === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
  const result: RollResult = {
    rolls: [roll1, roll2],
    modifier,
    total: roll + modifier,
    formula: mode === 'advantage' ? '1d20 adv' : '1d20 dis',
    label,
  };
  emitRoll({ ...result, timestamp: Date.now(), source });
  return result;
};

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
    const result: RollResult = {
      rolls: [manualValue],
      modifier,
      total,
      formula: '1d20',
      label: actionName,
    };
    emitRoll({ ...result, timestamp: Date.now(), source: 'manual' });
    return result;
  }
  return rollDice(dice, actionName, 'action');
};

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

export function parseMonsterDamageTypes(monster: any): {
  resist: string[];
  immune: string[];
  vuln: string[];
} {
  const resist: string[] = [];
  const immune: string[] = [];
  const vuln: string[] = [];
  const trait = monster.resist || monster.immune || monster.vulnerable;
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
