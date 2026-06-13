// =============================================================================
// 📘 FILE: utils/storageEngine.ts
// =============================================================================
// 🎯 PURPOSE: Handles saving and loading characters from the browser's
//    localStorage. Characters are stored globally (not per-campaign) with
//    a special key prefix.
//
// 🧠 REACT CONCEPT: Abstraction Layer (hiding complexity)
//    Components don't call localStorage.getItem() directly. They call
//    saveCharToLocal() / loadCharFromLocal() — clean functions that handle
//    key generation, JSON serialization, validation, and error handling.
//
//    If you wanted to switch to IndexedDB or a backend API, you'd only need
//    to change THIS file. The components calling these functions wouldn't
//    need any changes.
//
// 🔧 HOW TO ALTER:
//    - Change the storage prefix: modify CHAR_STORAGE_PREFIX
//    - Add character migration logic: add a migration function called in
//      loadCharFromLocal when old data format is detected
//    - Switch to a different storage: change implementation inside each function
// =============================================================================

// 🧠 This prefix is used for ALL character records in localStorage.
//    Example key: `dd-char-abc123` where `abc123` is the character's UUID.
export const CHAR_STORAGE_PREFIX = 'dd-char-';

// 🧠 Generates the localStorage key for a character.
//    Prefers UUID-based keys (`dd-char-{id}`) over name-based keys (`dd-char-{name}`)
//    because names can change (renaming a character shouldn't lose their data).
export function getStorageKey(c: { id?: string; name: string }): string {
  return c.id ? `${CHAR_STORAGE_PREFIX}${c.id}` : `${CHAR_STORAGE_PREFIX}${c.name}`;
}

// 🧠 Validates that a parsed JSON object is actually a valid character.
//    This is a TYPE GUARD — it returns `obj is {...}` (a type predicate).
//    When this returns true, TypeScript knows the object has those properties.
//
//    Why validate? localStorage stores ANYTHING as a string. When we parse it,
//    we could get null, an array, a number, or a malformed object. We need to
//    check the structure before treating it as a character.
export function isValidCharacter(obj: any): obj is { id?: string; name: string; race: string; baseStats: Record<string, number>; classLevels: Array<{ className: string; level: number }> } {
  return obj && typeof obj === 'object' && typeof obj.name === 'string'
    && typeof obj.race === 'string'
    && obj.baseStats && typeof obj.baseStats === 'object'
    && typeof obj.baseStats.str === 'number'   // Must have at least STR in baseStats
    && obj.classLevels && Array.isArray(obj.classLevels)
    && obj.classLevels.length > 0              // Must have at least one class level
    && typeof obj.classLevels[0].className === 'string'
    && typeof obj.classLevels[0].level === 'number';
}

// 🧠 Saves a character object to localStorage.
//    - Serializes to JSON (localStorage only stores strings)
//    - Cleans up old name-based key if character has an ID-based key now
//      (handles migration from old name-based storage)
//    - Returns the key so the caller knows where it was saved
export function saveCharToLocal(c: { id?: string; name: string }): string {
  const key = getStorageKey(c);
  localStorage.setItem(key, JSON.stringify(c));  // Serialize + save
  if (c.id) {
    const oldKey = `${CHAR_STORAGE_PREFIX}${c.name}`;
    if (oldKey !== key) {
      try { localStorage.removeItem(oldKey); } catch { /* noop */ }
    }
  }
  return key;
}

// 🧠 Loads a character from localStorage by key.
//    - Reads the string from localStorage
//    - Parses JSON back into an object
//    - Validates the structure with isValidCharacter
//    - Returns null for any failure (no crash, just "not found")
export function loadCharFromLocal(key: string): any {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;              // No data at this key
    const parsed = JSON.parse(raw);     // Deserialize
    if (!isValidCharacter(parsed)) return null;  // Not a valid character
    return parsed;
  } catch { return null; }
}
