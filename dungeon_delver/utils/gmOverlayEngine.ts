import { campaignKey } from './campaignStorage';
const STORAGE_KEY = 'gm-overlay';
const EVENT_KEY = 'dd-gm-overlay-change';
function sk(key: string) { return campaignKey(key); }

export interface GmOverlayState {
  enabled: boolean;
  showStats: boolean;
  showNotes: boolean;
  showHidden: boolean;
  notes: string;
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

export function onGmOverlayChange(fn: (state: GmOverlayState) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent).detail);
  window.addEventListener(EVENT_KEY, handler);
  return () => window.removeEventListener(EVENT_KEY, handler);
}
