// =============================================================================
// 📘 FILE: utils/markdownEngine.ts
// =============================================================================
// 🎯 PURPOSE: Converts characters between the app's JSON format and
//    Obsidian-compatible Markdown with YAML frontmatter. Handles stats,
//    spells (as [[wiki-links]]), features, and narrative fields.
//    Also supports parsing Markdown back into character data, extracting
//    wiki links, and converting between wiki-link and deep-link formats.
//
// 🧠 REACT CONCEPT: Serialization / Deserialization
//    charToMarkdown "serializes" a Character → Markdown (export).
//    parseCharacterMarkdown "deserializes" Markdown → ParsedCharacterMd (import).
//    These are pure functions that transform data between formats — no side effects.
//
//    The wiki-link ↔ deep-link conversion (wikiLinksToDeepLinks / deepLinksToWikiLinks)
//    is a "data transformation pipeline" — pass data through one function
//    to get display format, through the reverse to get storage format.
//
// 🔧 HOW TO ALTER:
//    - Change Markdown output format: modify charToMarkdown
//    - Change parsing logic: modify parseCharacterMarkdown or parseMarkdownToChar
//    - Change frontmatter fields: modify FRONTMATTER_KEYS and FrontmatterFields
//    - Change link format: modify wikiLinksToDeepLinks / deepLinksToWikiLinks
// =============================================================================

'use client';

import type { Character } from '../lib/character';

const FRONTMATTER_KEYS: (keyof FrontmatterFields)[] = [
  'name', 'class', 'level', 'hp_current', 'hp_max', 'ac',
  'campaign', 'status', 'version', 'last_sync',
];

export interface FrontmatterFields {
  name: string;
  class?: string;
  level: number;
  hp_current: number;
  hp_max: number;
  ac: number;
  campaign: string;
  status: 'alive' | 'dead' | 'retired';
  version: number;
  last_sync: string;
}

export interface ParsedCharacterMd {
  frontmatter: FrontmatterFields;
  stats: Record<string, number>;
  spells: string[];
  features: string[];
  notesSections: { heading: string; body: string }[];
  rawBody: string;
  wikiLinks: string[];
  rawFrontmatter: Record<string, string>;
}

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

function extractAc(char: Character): number {
  const base = 10 + Math.floor((char.baseStats?.dex || 10) / 2 - 5);
  if (!char.inventory) return base;
  const armor = char.inventory.find(i => i.equipped && (i.type || '').startsWith('LA') || (i.type || '').startsWith('MA') || (i.type || '').startsWith('HA'));
  if (armor) {
    const acMatch = armor.type?.match(/(\d+)/);
    if (acMatch) return parseInt(acMatch[1], 10) + Math.min(Math.floor((char.baseStats?.dex || 10) / 2 - 5), 2);
  }
  return base;
}

function statLabel(s: string): string {
  const map: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  return map[s] || s.toUpperCase();
}

function fmVal(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

// 🧠 charToMarkdown: converts a Character to Obsidian Markdown with YAML
//    frontmatter. The output includes stats table, spells as [[wiki-links]],
//    features list, and narrative fields (personality, ideals, etc.).
export function charToMarkdown(char: Character, vaultPath?: string): string {
  const ac = extractAc(char);
  const stats = char.baseStats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const frontmatter: Record<string, any> = {
    name: char.name || 'Unnamed',
    class: char.classes?.join('/') || char.class || '',
    level: char.totalLevel || 1,
    hp_current: char.hp?.current ?? char.hp?.max ?? 10,
    hp_max: char.hp?.max ?? 10,
    ac,
    campaign: char.campaignName || '',
    status: 'alive',
    version: (char as any)._version || 1,
    last_sync: new Date().toISOString(),
  };

  if (char.race) frontmatter.race = char.race;
  if (char.background) frontmatter.background = char.background;
  if (char.xp) frontmatter.xp = char.xp;
  for (const [k, v] of Object.entries(stats)) frontmatter[k] = v;

  if (char.classLevels?.length) frontmatter.class_levels = char.classLevels;
  if (char.inventory?.length) frontmatter.inventory = char.inventory;
  if (char.currency) frontmatter.currency = char.currency;
  if (char.proficiencies?.length) frontmatter.proficiencies = char.proficiencies;
  if (char.expertise?.length) frontmatter.expertise = char.expertise;
  if (char.savingThrowProficiencies?.length) frontmatter.saving_throws = char.savingThrowProficiencies;
  if (char.attunementSlots !== undefined) frontmatter.attunement_slots = char.attunementSlots;
  if (char.physical) frontmatter.physical = char.physical;
  if (char.organizations?.length) frontmatter.organizations = char.organizations;
  if (char.allies?.length) frontmatter.allies = char.allies;
  if (char.enemies?.length) frontmatter.enemies = char.enemies;
  if (char.resources && Object.keys(char.resources).length) frontmatter.resources = char.resources;
  if (char.spellSlots && Object.keys(char.spellSlots).length) frontmatter.spell_slots = char.spellSlots;
  if (char.levelingMode) frontmatter.leveling_mode = char.levelingMode;

  const fmLines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${fmVal(v)}`);
  const fm = `---\n${fmLines.join('\n')}\n---`;

  const classLine = char.classes?.length ? char.classes.join('/') : char.class || '';
  const bgLine = char.background || '';
  const raceLine = char.race || '';

  const statsTable = [
    `| ${Object.keys(stats).map(statLabel).join(' | ')} |`,
    `|${Object.keys(stats).map(() => '-----').join('|')}|`,
    `| ${Object.values(stats).join(' | ')} |`,
  ].join('\n');

  const sections: string[] = [];

  sections.push(`# ${char.name}`);
  sections.push('');
  sections.push(`**Class:** ${classLine || '—'} | **Level:** ${char.totalLevel} | **Race:** ${raceLine} | **Background:** ${bgLine}`);
  sections.push('');

  sections.push('## Stats');
  sections.push(statsTable);
  sections.push('');

  sections.push('## Combat');
  sections.push(`- **HP:** ${char.hp?.current ?? '?'}/${char.hp?.max ?? '?'}`);
  sections.push(`- **AC:** ${ac}`);
  sections.push('');

  if (char.spells) {
    sections.push('## Spells');
    const allSpells = [...(char.spells.cantrips || []), ...(char.spells.known || []), ...(char.spells.prepared || [])];
    const unique = [...new Set(allSpells)].sort();
    for (const s of unique) {
      sections.push(`- [[${s}]]`);
    }
    sections.push('');
  }

  if (char.features?.length) {
    sections.push('## Features');
    for (const f of char.features) {
      sections.push(`- ${f.name}`);
    }
    sections.push('');
  }

  const noteFields = ['personalityTraits', 'ideals', 'bonds', 'flaws', 'backstory', 'notes'] as const;
  const fieldLabels: Record<string, string> = {
    personalityTraits: 'Personality Traits',
    ideals: 'Ideals',
    bonds: 'Bonds',
    flaws: 'Flaws',
    backstory: 'Backstory',
    notes: 'Adventure Notes',
  };

  for (const field of noteFields) {
    const val = (char as any)[field];
    if (val && typeof val === 'string' && val.trim()) {
      sections.push(`## ${fieldLabels[field]}`);
      sections.push(val);
      sections.push('');
    }
  }

  return `${fm}\n\n${sections.join('\n')}`;
}

// 🧠 parseCharacterMarkdown: the reverse of charToMarkdown. Parses YAML
//    frontmatter, extracts stats table, wiki-link spells, features, and
//    narrative sections from the Markdown body. Returns a structured object.
export function parseCharacterMarkdown(md: string): ParsedCharacterMd {
  const result: ParsedCharacterMd = {
    frontmatter: { name: '', class: '', level: 1, hp_current: 10, hp_max: 10, ac: 10, campaign: '', status: 'alive', version: 1, last_sync: '' },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    spells: [],
    features: [],
    notesSections: [],
    rawBody: md,
    wikiLinks: [],
    rawFrontmatter: {},
  };

  let body = md.trim();

  // Parse frontmatter (YAML between --- delimiters)
  if (body.startsWith('---')) {
    const endIdx = body.indexOf('---', 3);
    if (endIdx !== -1) {
      const fmBlock = body.slice(3, endIdx).trim();
      body = body.slice(endIdx + 3).trim();
      for (const line of fmBlock.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        result.rawFrontmatter[key] = val;

        // Standard DungeonDelver frontmatter keys
        if (key === 'level' || key === 'hp_current' || key === 'hp_max' || key === 'ac' || key === 'version') {
          (result.frontmatter as any)[key] = parseInt(val, 10) || 0;
        } else if (key === 'last_sync') {
          result.frontmatter.last_sync = val;
        } else if (FRONTMATTER_KEYS.includes(key as any)) {
          (result.frontmatter as any)[key] = val;
        }

        // Obsidian vault frontmatter aliases
        if (key === 'character_name') {
          result.frontmatter.name = val;
        }
        if (key === 'hp') {
          result.frontmatter.hp_current = parseInt(val, 10) || 10;
        }
        if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(key)) {
          result.stats[key as keyof typeof result.stats] = parseInt(val, 10) || 10;
        }
      }
    }
  }

  // Extract wiki links ([[link]])
  const wl: string[] = [];
  let m: RegExpExecArray | null;
  const wlRe = new RegExp(WIKI_LINK_RE.source, 'g');
  while ((m = wlRe.exec(body)) !== null) {
    wl.push(m[1].trim());
  }
  result.wikiLinks = wl;

  // Extract spells (lines starting with "- [[")
  const spellLines = body.split('\n').filter(l => l.trim().startsWith('- [['));
  result.spells = spellLines.map(l => l.replace(WIKI_LINK_RE, '$1').replace(/^-\s*/, '').trim());

  // Extract features (lines starting with "- " under ## Features)
  const featureSection = body.match(/## Features\s*\n([\s\S]*?)(?=\n## |$)/);
  if (featureSection) {
    result.features = featureSection[1].split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean);
  }

  // Extract stats table (regex matches the markdown table with 6 columns)
  const statMatch = body.match(/\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|[\s\S]*?\n\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
  if (statMatch) {
    result.stats = { str: parseInt(statMatch[7], 10), dex: parseInt(statMatch[8], 10), con: parseInt(statMatch[9], 10), int: parseInt(statMatch[10], 10), wis: parseInt(statMatch[11], 10), cha: parseInt(statMatch[12], 10) };
  }

  // Capture note sections by heading
  const headings = ['Personality Traits', 'Ideals', 'Bonds', 'Flaws', 'Backstory', 'Adventure Notes'];
  for (const h of headings) {
    const re = new RegExp(`## ${h}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, '');
    const match = body.match(re);
    if (match && match[1].trim()) {
      result.notesSections.push({ heading: h, body: match[1].trim() });
    }
  }

  result.rawBody = body;
  return result;
}

export function extractWikiLinks(md: string): string[] {
  const links: string[] = [];
  const re = new RegExp(WIKI_LINK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    links.push(m[1].trim());
  }
  return links;
}

// 🧠 wikiLinksToDeepLinks: converts [[wiki-links]] to dd-app:// URLs
//    for display in the app's rich text viewer.
export function wikiLinksToDeepLinks(md: string): string {
  return md.replace(WIKI_LINK_RE, (_m, name: string) => {
    const encoded = encodeURIComponent(name.trim());
    return `[${name.trim()}](dd-app://spell/${encoded})`;
  });
}

// 🧠 deepLinksToWikiLinks: the reverse — converts dd-app:// URLs back
//    to [[wiki-links]] for export to Obsidian.
export function deepLinksToWikiLinks(md: string): string {
  return md.replace(/\[([^\]]+)\]\(dd-app:\/\/[^)]+\)/g, '[[$1]]');
}

// 🧠 parseMarkdownToChar: full parse → Partial<Character> conversion.
//    Takes raw Markdown and produces a character object that can be
//    loaded into the app. Preserves existing character fields via spread.
export function parseMarkdownToChar(md: string, existingChar?: Partial<Character>): Partial<Character> {
  const parsed = parseCharacterMarkdown(md);
  const fm = parsed.frontmatter;

  const rf = parsed.rawFrontmatter;

  function tryJson<T>(val: string | undefined, fallback: T): T {
    if (!val) return fallback;
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }

  const char: Partial<Character> = {
    ...existingChar,
    name: fm.name || existingChar?.name || 'Imported',
    race: rf.race || existingChar?.race || '',
    class: (rf.class || '').replace(/ \[2024\]/g, ''),
    background: rf.background || existingChar?.background || '',
    campaignName: fm.campaign || existingChar?.campaignName,
    totalLevel: fm.level || existingChar?.totalLevel || 1,
    level: fm.level || existingChar?.level || 1,
    xp: parseInt(rf.xp, 10) || existingChar?.xp || 0,
    hp: { current: fm.hp_current, max: fm.hp_max, temp: existingChar?.hp?.temp || 0 },
    baseStats: { str: parsed.stats.str || 10, dex: parsed.stats.dex || 10, con: parsed.stats.con || 10, int: parsed.stats.int || 10, wis: parsed.stats.wis || 10, cha: parsed.stats.cha || 10 },
    classLevels: tryJson<any[]>(rf.class_levels, existingChar?.classLevels || [{ className: fm.class || 'Fighter', level: fm.level || 1 }]),
    inventory: tryJson(rf.inventory, existingChar?.inventory || []),
    currency: tryJson(rf.currency, existingChar?.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }),
    proficiencies: tryJson(rf.proficiencies, existingChar?.proficiencies || []),
    expertise: tryJson(rf.expertise, existingChar?.expertise || []),
    savingThrowProficiencies: tryJson(rf.saving_throws, existingChar?.savingThrowProficiencies || []),
    attunementSlots: rf.attunement_slots ? parseInt(rf.attunement_slots, 10) : existingChar?.attunementSlots,
    physical: tryJson(rf.physical, existingChar?.physical),
    organizations: tryJson(rf.organizations, existingChar?.organizations || []),
    allies: tryJson(rf.allies, existingChar?.allies || []),
    enemies: tryJson(rf.enemies, existingChar?.enemies || []),
    resources: tryJson(rf.resources, existingChar?.resources),
    spellSlots: tryJson(rf.spell_slots, existingChar?.spellSlots),
    levelingMode: (rf.leveling_mode as any) || existingChar?.levelingMode || 'milestone',
    spells: { cantrips: [], known: [], prepared: [] },
    features: [],
    notes: '',
    backstory: '',
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
  };

  (char as any)._version = fm.version;
  (char as any)._lastSync = fm.last_sync;

  // Refine spells into prepared/known
  if (parsed.spells.length) {
    const cantripNames = (existingChar?.spells?.cantrips || []);
    const knownNames = (existingChar?.spells?.known || []);
    const preparedNames = (existingChar?.spells?.prepared || []);
    const allKnown = [...new Set([...knownNames, ...preparedNames, ...cantripNames])];

    char.spells = {
      cantrips: parsed.spells.filter(s => cantripNames.includes(s)),
      known: parsed.spells.filter(s => !cantripNames.includes(s)),
      prepared: parsed.spells.filter(s => !cantripNames.includes(s)),
    };
  }

  if (parsed.features.length) {
    char.features = parsed.features.map(f => ({ name: f, level: char.totalLevel || 1, source: 'imported' }));
  }

  for (const sec of parsed.notesSections) {
    const fieldMap: Record<string, string> = {
      'Personality Traits': 'personalityTraits',
      'Ideals': 'ideals',
      'Bonds': 'bonds',
      'Flaws': 'flaws',
      'Backstory': 'backstory',
      'Adventure Notes': 'notes',
    };
    const field = fieldMap[sec.heading];
    if (field) (char as any)[field] = sec.body;
  }

  return char;
}
