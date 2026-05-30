export const CHAR_STORAGE_PREFIX = 'dd-char-';

export function getStorageKey(c: { id?: string; name: string }): string {
  return c.id ? `${CHAR_STORAGE_PREFIX}${c.id}` : `${CHAR_STORAGE_PREFIX}${c.name}`;
}

export function isValidCharacter(obj: any): obj is { id?: string; name: string; race: string; baseStats: Record<string, number>; classLevels: Array<{ className: string; level: number }> } {
  return obj && typeof obj === 'object' && typeof obj.name === 'string'
    && typeof obj.race === 'string'
    && obj.baseStats && typeof obj.baseStats === 'object'
    && typeof obj.baseStats.str === 'number'
    && typeof obj.baseStats.dex === 'number'
    && obj.classLevels && Array.isArray(obj.classLevels)
    && obj.classLevels.length > 0
    && typeof obj.classLevels[0].className === 'string'
    && typeof obj.classLevels[0].level === 'number';
}

export function saveCharToLocal(c: { id?: string; name: string }): string {
  const key = getStorageKey(c);
  localStorage.setItem(key, JSON.stringify(c));
  if (c.id) {
    const oldKey = `${CHAR_STORAGE_PREFIX}${c.name}`;
    if (oldKey !== key) {
      try { localStorage.removeItem(oldKey); } catch { /* noop */ }
    }
  }
  return key;
}

export function loadCharFromLocal(key: string): any {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidCharacter(parsed)) return null;
    return parsed;
  } catch { return null; }
}
