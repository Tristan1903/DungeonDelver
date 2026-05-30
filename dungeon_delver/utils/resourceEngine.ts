export function useSpellSlot<T extends { spellSlots?: Record<number, { max: number; used: number }> }>(char: T, level: number): T {
  if (!char.spellSlots?.[level]) return char;
  const slot = char.spellSlots[level];
  if (slot.used >= slot.max) return char;
  return {
    ...char,
    spellSlots: {
      ...char.spellSlots,
      [level]: { ...slot, used: slot.used + 1 },
    },
  };
}

export function restoreSpellSlot<T extends { spellSlots?: Record<number, { max: number; used: number }> }>(char: T, level: number): T {
  if (!char.spellSlots?.[level]) return char;
  const slot = char.spellSlots[level];
  if (slot.used <= 0) return char;
  return {
    ...char,
    spellSlots: {
      ...char.spellSlots,
      [level]: { ...slot, used: slot.used - 1 },
    },
  };
}

export function useClassResource<T extends { resources?: Record<string, { current: number; max: number }> }>(char: T, key: string, amount = 1): T {
  if (!char.resources?.[key]) return char;
  const res = char.resources[key];
  if (res.current <= 0) return char;
  return {
    ...char,
    resources: {
      ...char.resources,
      [key]: { ...res, current: Math.max(0, res.current - amount) },
    },
  };
}

export function restoreClassResource<T extends { resources?: Record<string, { current: number; max: number }> }>(char: T, key: string, amount = 1): T {
  if (!char.resources?.[key]) return char;
  const res = char.resources[key];
  return {
    ...char,
    resources: {
      ...char.resources,
      [key]: { ...res, current: Math.min(res.max, res.current + amount) },
    },
  };
}

export function useHitDie<T extends { classLevels?: Array<{ className: string; level: number; hdUsed?: number }> }>(char: T, className: string): T {
  const levels = char.classLevels;
  if (!levels) return char;
  const idx = levels.findIndex(cl => cl.className === className);
  if (idx === -1) return char;
  const cl = levels[idx];
  if ((cl.hdUsed || 0) >= cl.level) return char;
  const updated = [...levels];
  updated[idx] = { ...cl, hdUsed: (cl.hdUsed || 0) + 1 };
  return { ...char, classLevels: updated };
}

export function resetAllSpellSlots<T extends { spellSlots?: Record<number, { max: number; used: number }> }>(char: T): T {
  if (!char.spellSlots) return char;
  const next: Record<number, { max: number; used: number }> = {};
  for (const [lvl, s] of Object.entries(char.spellSlots)) {
    next[Number(lvl)] = { max: s.max, used: 0 };
  }
  return { ...char, spellSlots: next };
}
