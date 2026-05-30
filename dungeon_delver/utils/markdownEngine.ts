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

export function charToMarkdown(char: Character, vaultPath?: string): string {
  const ac = extractAc(char);
  const frontmatter: FrontmatterFields = {
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

  const fmLines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`);
  const fm = `---\n${fmLines.join('\n')}\n---`;

  const classLine = char.classes?.length ? char.classes.join('/') : char.class || '';
  const bgLine = char.background || '';
  const raceLine = char.race || '';

  const stats = char.baseStats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

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

export function parseCharacterMarkdown(md: string): ParsedCharacterMd {
  const result: ParsedCharacterMd = {
    frontmatter: { name: '', class: '', level: 1, hp_current: 10, hp_max: 10, ac: 10, campaign: '', status: 'alive', version: 1, last_sync: '' },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    spells: [],
    features: [],
    notesSections: [],
    rawBody: md,
    wikiLinks: [],
  };

  let body = md.trim();

  // Parse frontmatter
  if (body.startsWith('---')) {
    const endIdx = body.indexOf('---', 3);
    if (endIdx !== -1) {
      const fmBlock = body.slice(3, endIdx).trim();
      body = body.slice(endIdx + 3).trim();
      for (const line of fmBlock.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim() as keyof FrontmatterFields;
        const val = line.slice(colonIdx + 1).trim();
        if (key === 'level' || key === 'hp_current' || key === 'hp_max' || key === 'ac' || key === 'version') {
          (result.frontmatter as any)[key] = parseInt(val, 10) || 0;
        } else if (key === 'last_sync') {
          result.frontmatter.last_sync = val;
        } else if (FRONTMATTER_KEYS.includes(key)) {
          (result.frontmatter as any)[key] = val;
        }
      }
    }
  }

  // Extract wiki links
  const wl: string[] = [];
  let m: RegExpExecArray | null;
  const wlRe = new RegExp(WIKI_LINK_RE.source, 'g');
  while ((m = wlRe.exec(body)) !== null) {
    wl.push(m[1].trim());
  }
  result.wikiLinks = wl;

  // Extract spells
  const spellLines = body.split('\n').filter(l => l.trim().startsWith('- [['));
  result.spells = spellLines.map(l => l.replace(WIKI_LINK_RE, '$1').replace(/^-\s*/, '').trim());

  // Extract features (lines starting with "- " under ## Features)
  const featureSection = body.match(/## Features\s*\n([\s\S]*?)(?=\n## |$)/);
  if (featureSection) {
    result.features = featureSection[1].split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean);
  }

  // Extract stats table
  const statMatch = body.match(/\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|[\s\S]*?\n\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
  if (statMatch) {
    result.stats = { str: parseInt(statMatch[7], 10), dex: parseInt(statMatch[8], 10), con: parseInt(statMatch[9], 10), int: parseInt(statMatch[10], 10), wis: parseInt(statMatch[11], 10), cha: parseInt(statMatch[12], 10) };
  }

  // Capture note sections
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

/** Convert [[wiki-links]] to dd-app:// URLs in markdown text */
export function wikiLinksToDeepLinks(md: string): string {
  return md.replace(WIKI_LINK_RE, (_m, name: string) => {
    const encoded = encodeURIComponent(name.trim());
    return `[${name.trim()}](dd-app://spell/${encoded})`;
  });
}

/** Convert dd-app:// URLs back to [[wiki-links]] */
export function deepLinksToWikiLinks(md: string): string {
  return md.replace(/\[([^\]]+)\]\(dd-app:\/\/[^)]+\)/g, '[[$1]]');
}

export function parseMarkdownToChar(md: string, existingChar?: Partial<Character>): Partial<Character> {
  const parsed = parseCharacterMarkdown(md);
  const fm = parsed.frontmatter;

  const char: Partial<Character> = {
    ...existingChar,
    name: fm.name || existingChar?.name || 'Imported',
    campaignName: fm.campaign || existingChar?.campaignName,
    totalLevel: fm.level || existingChar?.totalLevel || 1,
    level: fm.level || existingChar?.level || 1,
    hp: { current: fm.hp_current, max: fm.hp_max, temp: existingChar?.hp?.temp || 0 },
    baseStats: { str: parsed.stats.str || 10, dex: parsed.stats.dex || 10, con: parsed.stats.con || 10, int: parsed.stats.int || 10, wis: parsed.stats.wis || 10, cha: parsed.stats.cha || 10 },
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

  // Features from markdown
  if (parsed.features.length) {
    char.features = parsed.features.map(f => ({ name: f, level: char.totalLevel || 1, source: 'imported' }));
  }

  // Note fields from sections
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
