'use client';

export interface VersionedCharacter {
  _version: number;
  _lastSync: string;
  _backups: BackupEntry[];
}

export interface BackupEntry {
  version: number;
  timestamp: string;
  data: any;
  source: 'local' | 'obsidian';
}

export interface DiffResult {
  field: string;
  local: any;
  obsidian: any;
  type: 'changed' | 'added' | 'removed';
}

const BACKUP_KEY = 'dd-char-backups';

export function getCurrentVersion(char: any): number {
  return (char as any)?._version || 1;
}

export function getCurrentSyncTimestamp(char: any): string {
  return (char as any)?._lastSync || '';
}

export function bumpVersion(char: any): number {
  const v = getCurrentVersion(char);
  return v + 1;
}

export function setVersion(char: any, version: number, timestamp?: string): void {
  (char as any)._version = version;
  (char as any)._lastSync = timestamp || new Date().toISOString();
}

export function createBackup(char: any, source: 'local' | 'obsidian'): BackupEntry {
  const entry: BackupEntry = {
    version: getCurrentVersion(char),
    timestamp: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(char)),
    source,
  };
  saveBackup(char.id || char.name, entry);
  return entry;
}

export function saveBackup(charId: string, entry: BackupEntry): void {
  try {
    const key = `${BACKUP_KEY}-${charId}`;
    const existing: BackupEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(entry);
    // Keep last 20 backups
    if (existing.length > 20) existing.splice(0, existing.length - 20);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* noop */ }
}

export function getBackups(charId: string): BackupEntry[] {
  try {
    return JSON.parse(localStorage.getItem(`${BACKUP_KEY}-${charId}`) || '[]');
  } catch { return []; }
}

export function clearBackups(charId: string): void {
  try { localStorage.removeItem(`${BACKUP_KEY}-${charId}`); } catch { /* noop */ }
}

export function computeDiff(local: any, obsidian: any): DiffResult[] {
  const diffs: DiffResult[] = [];

  const FIELDS: string[] = [
    'name', 'level', 'totalLevel', 'campaignName',
    'hp.current', 'hp.max', 'xp',
    'baseStats.str', 'baseStats.dex', 'baseStats.con', 'baseStats.int', 'baseStats.wis', 'baseStats.cha',
    'notes', 'backstory', 'personalityTraits', 'ideals', 'bonds', 'flaws',
  ];

  function getNested(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  }

  for (const field of FIELDS) {
    const lv = getNested(local, field);
    const ov = getNested(obsidian, field);
    if (JSON.stringify(lv) !== JSON.stringify(ov)) {
      diffs.push({ field, local: lv, obsidian: ov, type: lv === undefined ? 'removed' : ov === undefined ? 'added' : 'changed' });
    }
  }

  // Spell changes
  const localSpells = [...new Set([
    ...(local.spells?.cantrips || []),
    ...(local.spells?.known || []),
    ...(local.spells?.prepared || []),
  ])].sort();
  const obsidianSpells = [...new Set([
    ...(obsidian.spells?.cantrips || []),
    ...(obsidian.spells?.known || []),
    ...(obsidian.spells?.prepared || []),
  ])].sort();
  if (JSON.stringify(localSpells) !== JSON.stringify(obsidianSpells)) {
    diffs.push({ field: 'spells', local: localSpells, obsidian: obsidianSpells, type: 'changed' });
  }

  // Feature changes
  const localFeatures = (local.features || []).map((f: any) => f.name).sort();
  const obsidianFeatures = (obsidian.features || []).map((f: any) => f.name).sort();
  if (JSON.stringify(localFeatures) !== JSON.stringify(obsidianFeatures)) {
    diffs.push({ field: 'features', local: localFeatures, obsidian: obsidianFeatures, type: 'changed' });
  }

  return diffs;
}

/** Merge local changes into obsidian version, preferring local for conflicts */
export function mergeLocalWins(local: any, obsidian: any): any {
  const merged = JSON.parse(JSON.stringify(obsidian));
  const version = Math.max(getCurrentVersion(local), getCurrentVersion(obsidian)) + 1;

  // Core fields: local wins
  if (local.hp) merged.hp = { ...merged.hp, ...local.hp };
  if (local.xp !== undefined) merged.xp = local.xp;
  if (local.level !== undefined) merged.level = local.level;
  if (local.totalLevel !== undefined) merged.totalLevel = local.totalLevel;
  if (local.baseStats) merged.baseStats = { ...local.baseStats };
  if (local.campaignName) merged.campaignName = local.campaignName;
  if (local.spells) merged.spells = JSON.parse(JSON.stringify(local.spells));
  if (local.features) merged.features = JSON.parse(JSON.stringify(local.features));
  if (local.inventory) merged.inventory = JSON.parse(JSON.stringify(local.inventory));
  if (local.currency) merged.currency = JSON.parse(JSON.stringify(local.currency));
  if (local.resources) merged.resources = JSON.parse(JSON.stringify(local.resources));

  // Notes: prefer local
  merged.notes = local.notes || obsidian.notes || '';
  merged.backstory = local.backstory || obsidian.backstory || '';
  merged.personalityTraits = local.personalityTraits || obsidian.personalityTraits || '';
  merged.ideals = local.ideals || obsidian.ideals || '';
  merged.bonds = local.bonds || obsidian.bonds || '';
  merged.flaws = local.flaws || obsidian.flaws || '';

  setVersion(merged, version);
  return merged;
}

/** Merge obsidian changes into local, preferring obsidian for RPG stats */
export function mergeObsidianWins(local: any, obsidian: any): any {
  const merged = JSON.parse(JSON.stringify(local));
  const version = Math.max(getCurrentVersion(local), getCurrentVersion(obsidian)) + 1;

  if (obsidian.hp) merged.hp = { ...obsidian.hp, temp: local.hp?.temp || 0 };
  if (obsidian.baseStats) merged.baseStats = { ...obsidian.baseStats };
  if (obsidian.level) merged.level = obsidian.level;
  if (obsidian.totalLevel) merged.totalLevel = obsidian.totalLevel;
  if (obsidian.notes) merged.notes = obsidian.notes;
  if (obsidian.backstory) merged.backstory = obsidian.backstory;
  if (obsidian.personalityTraits) merged.personalityTraits = obsidian.personalityTraits;
  if (obsidian.ideals) merged.ideals = obsidian.ideals;
  if (obsidian.bonds) merged.bonds = obsidian.bonds;
  if (obsidian.flaws) merged.flaws = obsidian.flaws;

  setVersion(merged, version);
  return merged;
}
