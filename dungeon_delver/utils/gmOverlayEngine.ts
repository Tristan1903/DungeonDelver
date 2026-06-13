// =============================================================================
// 📘 FILE: utils/gmOverlayEngine.ts
// =============================================================================
// 🎯 PURPOSE: Manages the GM (Game Master) Overlay — a floating panel that
//    DMs can toggle to see hidden info (monster stats, secret notes, etc.)
//    normally hidden from players.
//
// 🧠 REACT CONCEPT: State Persistence + Cross-Component Events
//    This engine does TWO things:
//    1. Saves/loads GM overlay state to localStorage (persistence)
//    2. Dispatches CUSTOM EVENTS when state changes (cross-component comms)
//
//    The custom event (`dd-gm-overlay-change`) lets non-React parts of the
//    app (or components far apart in the tree) react to overlay changes
//    without knowing about each other.
//
// 🔧 HOW TO ALTER:
//    - Add new overlay settings: add fields to GmOverlayState
//    - Change event name: modify EVENT_KEY
//    - Change default state: modify the DEFAULT object
// =============================================================================

import { campaignKey } from './campaignStorage';
const STORAGE_KEY = 'gm-overlay';
const EVENT_KEY = 'dd-gm-overlay-change';
function sk(key: string) { return campaignKey(key); }

// 🧠 GmOverlayState — All the toggleable options for the GM overlay.
export interface GmOverlayState {
  enabled: boolean;     // Is the overlay active?
  showStats: boolean;   // Show monster stat blocks?
  showNotes: boolean;   // Show GM notes?
  showHidden: boolean;  // Show hidden/invisible creatures?
  notes: string;        // Quick GM notes
}

const DEFAULT: GmOverlayState = {
  enabled: false,
  showStats: true,
  showNotes: true,
  showHidden: true,
  notes: '',
};

export function loadGmOverlay(): GmOverlayState {
  try {
    const raw = localStorage.getItem(sk(STORAGE_KEY));
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
}

// 🧠 saveGmOverlay — Saves state AND broadcasts a custom event so other
//    components (like the combat tracker) can react immediately.
export function saveGmOverlay(state: GmOverlayState): void {
  localStorage.setItem(sk(STORAGE_KEY), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: state }));
}

export function toggleGmOverlay(): GmOverlayState {
  const current = loadGmOverlay();
  const next = { ...current, enabled: !current.enabled };
  saveGmOverlay(next);
  return next;
}

// 🧠 onGmOverlayChange — Subscribe to overlay changes.
//    Returns an unsubscribe function (same pattern as rollEngine).
export function onGmOverlayChange(fn: (state: GmOverlayState) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent).detail);
  window.addEventListener(EVENT_KEY, handler);
  return () => window.removeEventListener(EVENT_KEY, handler);
}
