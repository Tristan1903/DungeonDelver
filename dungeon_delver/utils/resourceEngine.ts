// =============================================================================
// 📘 FILE: utils/resourceEngine.ts
// =============================================================================
// 🎯 PURPOSE: Pure functions that modify character resources — spell slots,
//    class resources (rage, ki, etc.), hit dice, and rest mechanics. Each
//    function takes a character and returns a NEW character with the resource
//    changed (immutable update pattern).
//
// 🧠 REACT CONCEPT: Immutable Update Pattern
//    In React, you should NOT mutate state directly (char.spellSlots[1].used++).
//    Instead, you create a NEW object with the change applied. These functions
//    all follow this pattern: `{ ...char, spellSlots: { ...char.spellSlots, ... } }`
//
//    💡 The `...` spread operator creates shallow copies at each level of nesting.
//    This ensures the original character object is never mutated — React can
//    detect changes by comparing references (old object !== new object = change!).
//
// 🧠 PATTERN: Generic Type Parameters `<T extends { ... }>`
//    These functions use GENERICS with constraints. `T extends { spellSlots?: ... }`
//    means "T can be any type, as long as it has a spellSlots property with this shape."
//    This makes the functions work with Character or any similar type.
//
// 🔧 HOW TO ALTER:
//    - Add a new resource type: add a new function following the same pattern
//    - Change rest behavior: modify which resources reset on short vs long rest
//    - Change resource max: modify the max computation logic
// =============================================================================

// 🧠 useSpellSlot — Marks one spell slot of a given level as "used."
//    Returns the character unchanged if no slots at that level or all used.
export function useSpellSlot<T extends { spellSlots?: Record<number, { max: number; used: number }> }>(char: T, level: number): T {
  if (!char.spellSlots?.[level]) return char;
  const slot = char.spellSlots[level];
  if (slot.used >= slot.max) return char;
  return {
    ...char,                                       // Copy character
    spellSlots: {
      ...char.spellSlots,                          // Copy spell slots map
      [level]: { ...slot, used: slot.used + 1 },   // Update the specific slot level
    },
  };
}

// 🧠 restoreSpellSlot — Reverses useSpellSlot (marks one as "unused").
//    Guards against going below 0.
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

// 🧠 useClassResource — Consumes X uses of a named class resource (e.g., Rage).
//    Resources are keyed by namespaced key like "Fighter:actionSurge".
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

// 🧠 useHitDie — Tracks which hit dice have been spent during rests.
//    Hit dice are tracked per-class in classLevels[].hdUsed.
export function useHitDie<T extends { classLevels?: Array<{ className: string; level: number; hdUsed?: number }> }>(char: T, className: string): T {
  const levels = char.classLevels;
  if (!levels) return char;
  const idx = levels.findIndex(cl => cl.className === className);
  if (idx === -1) return char;
  const cl = levels[idx];
  if ((cl.hdUsed || 0) >= cl.level) return char;  // All hit dice spent
  const updated = [...levels];
  updated[idx] = { ...cl, hdUsed: (cl.hdUsed || 0) + 1 };
  return { ...char, classLevels: updated };
}

// 🧠 resetAllSpellSlots — Sets all slots' "used" count back to 0.
//    Called on long rest (or short rest for Warlocks).
export function resetAllSpellSlots<T extends { spellSlots?: Record<number, { max: number; used: number }> }>(char: T): T {
  if (!char.spellSlots) return char;
  const next: Record<number, { max: number; used: number }> = {};
  for (const [lvl, s] of Object.entries(char.spellSlots)) {
    next[Number(lvl)] = { max: s.max, used: 0 };
  }
  return { ...char, spellSlots: next };
}
