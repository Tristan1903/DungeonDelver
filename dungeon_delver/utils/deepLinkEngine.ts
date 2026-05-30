'use client';

export interface DeepLinkTarget {
  type: 'character' | 'spell' | 'item' | 'monster' | 'feature' | 'page' | 'campaign' | 'library';
  id?: string;
  name?: string;
  path?: string;
  params?: Record<string, string>;
}

const PREFIX = 'dd-app://';

export function parseDeepLink(url: string): DeepLinkTarget | null {
  if (!url.startsWith(PREFIX)) return null;

  const rest = url.slice(PREFIX.length);
  const [type, ...restParts] = rest.split('/');
  const remainder = restParts.join('/');
  const decoded = decodeURIComponent(remainder);

  switch (type) {
    case 'character':
      return { type: 'character', id: decoded || undefined };
    case 'spell':
      return { type: 'spell', name: decoded || undefined };
    case 'item':
      return { type: 'item', name: decoded || undefined };
    case 'monster':
      return { type: 'monster', name: decoded || undefined };
    case 'feature':
      return { type: 'feature', name: decoded || undefined };
    case 'campaign':
      return { type: 'campaign', name: decoded || undefined };
    case 'library':
      return { type: 'library', name: decoded || undefined };
    default:
      return { type: 'page', path: `${type}/${remainder}`.replace(/\/$/, '') };
  }
}

export function buildDeepLink(target: DeepLinkTarget): string {
  switch (target.type) {
    case 'character':
      return `${PREFIX}character/${encodeURIComponent(target.id || '')}`;
    case 'spell':
      return `${PREFIX}spell/${encodeURIComponent(target.name || '')}`;
    case 'item':
      return `${PREFIX}item/${encodeURIComponent(target.name || '')}`;
    case 'monster':
      return `${PREFIX}monster/${encodeURIComponent(target.name || '')}`;
    case 'feature':
      return `${PREFIX}feature/${encodeURIComponent(target.name || '')}`;
    case 'campaign':
      return `${PREFIX}campaign/${encodeURIComponent(target.name || '')}`;
    case 'library':
      return `${PREFIX}library/${encodeURIComponent(target.name || '')}`;
    case 'page':
      return `${PREFIX}${target.path || ''}`;
    default:
      return `${PREFIX}page/home`;
  }
}

/** Resolve a deep link target to an app route */
export function resolveDeepLink(target: DeepLinkTarget): string {
  switch (target.type) {
    case 'character':
      return `/character-sheet?id=${encodeURIComponent(target.id || '')}`;
    case 'spell':
      return `/library?tab=spells&q=${encodeURIComponent(target.name || '')}`;
    case 'item':
      return `/library?tab=items&q=${encodeURIComponent(target.name || '')}`;
    case 'monster':
      return `/library?tab=monsters&q=${encodeURIComponent(target.name || '')}`;
    case 'feature':
      return `/library?tab=features&q=${encodeURIComponent(target.name || '')}`;
    case 'campaign':
      return `/dm/modules?campaign=${encodeURIComponent(target.name || '')}`;
    case 'library':
      return `/library?q=${encodeURIComponent(target.name || '')}`;
    case 'page':
      return `/${target.path || ''}`;
    default:
      return '/';
  }
}

/** Try to extract a deep link from a line of text */
export function extractDeepLinkFromText(text: string): DeepLinkTarget | null {
  const re = /dd-app:\/\/[^\s)]+/g;
  const m = re.exec(text);
  if (!m) return null;
  return parseDeepLink(m[0]);
}
