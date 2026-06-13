export interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'list' | 'blockquote' | 'code' | 'hr' | 'statblock';
  level?: number;
  items?: string[];
  content?: string;
  stat?: StatBlockData;
}

export interface StatBlockData {
  name: string;
  ac: number;
  hp: number;
  hit?: string;
}

export interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'link' | 'image' | 'code' | 'dice' | 'stat';
  text?: string;
  href?: string;
  alt?: string;
  formula?: string;
  stat?: StatBlockData;
}

const IMG_EXT = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i;
const STAT_BLOCK = /^([A-Z][a-zA-Z\s'-]+)\s*\(AC\s*(\d+),\s*HP\s*(\d+)(?:,\s*\+?(\d+)\s*[tT][oO]\s*[hH][iI][tT])?\)/;
const DICE_FORMULA = /^(\d*)d(\d+)([+-]\d+)?$/;
const URL = /^https?:\/\/\S+$/i;

export function parseBlock(text: string): ParsedBlock {
  const trimmed = text.trim();
  if (!trimmed) return { type: 'paragraph', content: '' };

  // Stat block
  const st = trimmed.match(STAT_BLOCK);
  if (st) {
    return {
      type: 'statblock',
      stat: { name: st[1].trim(), ac: parseInt(st[2]), hp: parseInt(st[3]), hit: st[4] ? `+${st[4]}` : undefined },
    };
  }

  // Heading
  const h = trimmed.match(/^(#{1,6})\s+(.+)/);
  if (h) return { type: 'heading', level: h[1].length, content: h[2] };

  // Blockquote
  if (trimmed.startsWith('> ')) return { type: 'blockquote', content: trimmed.slice(2) };

  // Horizontal rule
  if (/^[-*_]{3,}$/.test(trimmed)) return { type: 'hr' };

  // Code block
  if (trimmed.startsWith('```') && trimmed.endsWith('```') && trimmed.length > 6) {
    return { type: 'code', content: trimmed.slice(3, -3).trim() };
  }

  // List items will be grouped at a higher level
  return { type: 'paragraph', content: trimmed };
}

export function isListItem(text: string): boolean {
  return /^[-*]\s/.test(text) || /^\d+[.)]\s/.test(text);
}

export function parseListItems(lines: string[]): string[] {
  return lines.map(l => l.replace(/^[-*]\s/, '').replace(/^\d+[.)]\s/, ''));
}

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Dice [[formula]]
    const diceMatch = remaining.match(/^\[\[([^\]]+)\]\]/);
    if (diceMatch) {
      tokens.push({ type: 'dice', formula: diceMatch[1] });
      remaining = remaining.slice(diceMatch[0].length);
      continue;
    }

    // Image ![alt](url)
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      tokens.push({ type: 'image', alt: imgMatch[1] || 'image', href: imgMatch[2] });
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push({ type: 'link', text: linkMatch[1], href: linkMatch[2] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push({ type: 'bold', text: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push({ type: 'italic', text: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: 'code', text: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Auto-detect image URL
    const urlMatch = remaining.match(/^(https?:\/\/\S+?)([.,!?;:]?\s|$)/);
    if (urlMatch && IMG_EXT.test(urlMatch[1])) {
      tokens.push({ type: 'image', alt: '', href: urlMatch[1] });
      remaining = remaining.slice(urlMatch[1].length);
      continue;
    }

    // Auto-detect stat block inline
    const statInline = remaining.match(STAT_BLOCK);
    if (statInline && statInline.index === 0) {
      tokens.push({
        type: 'stat',
        stat: { name: statInline[1].trim(), ac: parseInt(statInline[2]), hp: parseInt(statInline[3]), hit: statInline[4] ? `+${statInline[4]}` : undefined },
      });
      remaining = remaining.slice(statInline[0].length);
      continue;
    }

    // Plain text — consume up to next special char or whole remaining
    const next = remaining.match(/^[^*\[`!]+/);
    if (next) {
      tokens.push({ type: 'text', text: next[0] });
      remaining = remaining.slice(next[0].length);
    } else {
      tokens.push({ type: 'text', text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export function rollFormula(formula: string): { total: number; rolls: number[] } | null {
  const m = formula.match(DICE_FORMULA);
  if (!m) return null;
  const count = parseInt(m[1] || '1');
  const sides = parseInt(m[2]);
  const mod = parseInt(m[3] || '0');
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  return { total: rolls.reduce((a, b) => a + b, 0) + mod, rolls };
}
