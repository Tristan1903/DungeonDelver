// =============================================================================
// 📘 FILE: utils/deepLinkEngine.ts
// =============================================================================
// 🎯 PURPOSE: Deep linking system that allows cross-referencing content
//    within the app via `dd-app://` protocol URLs. Supports targets:
//    character, spell, item, monster, feature, campaign, library, or
//    arbitrary page paths. Used by the Obsidian vault integration to
//    create clickable links back to app content.
//
// 🧠 REACT CONCEPT: URL Routing Abstraction
//    Instead of hard-coding routes everywhere, this file provides a
//    "routing language" (dd-app:// URLs) that gets parsed and resolved
//    to actual app routes. This is similar to how React Router uses
//    path matching — the link target is abstract, and resolveDeepLink
//    converts it to a concrete URL.
//
//    If you change the app's routing structure, you only need to update
//    resolveDeepLink() — all existing deep links still work.
//
// 🔧 HOW TO ALTER:
//    - Add a new link type: add a case to parseDeepLink, buildDeepLink,
//      and resolveDeepLink
//    - Change the URL prefix: modify PREFIX constant
//    - Change route patterns: modify resolveDeepLink
// =============================================================================

'use client';

export interface DeepLinkTarget {
  type: 'character' | 'spell' | 'item' | 'monster' | 'feature' | 'page' | 'campaign' | 'library';
  id?: string;
  name?: string;
  path?: string;
  params?: Record<string, string>;
}

const PREFIX = 'dd-app://';

// 🧠 parseDeepLink: converts a string like `dd-app://spell/Fireball`
//    into a structured DeepLinkTarget object. This is "deserialization."
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

// 🧠 buildDeepLink: the reverse — converts a DeepLinkTarget back to a
//    `dd-app://` URL string. This is "serialization."
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

// 🧠 resolveDeepLink: converts a DeepLinkTarget to an actual app route.
//    This is where you map each type to a Next.js App Router path.
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

// 🧠 extractDeepLinkFromText: scans a line of text for any dd-app:// URL
//    and returns the first match as a parsed DeepLinkTarget. Used when
//    rendering note content that may contain inline deep links.
export function extractDeepLinkFromText(text: string): DeepLinkTarget | null {
  const re = /dd-app:\/\/[^\s)]+/g;
  const m = re.exec(text);
  if (!m) return null;
  return parseDeepLink(m[0]);
}
