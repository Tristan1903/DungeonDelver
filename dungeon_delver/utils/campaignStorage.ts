// =============================================================================
// 📘 FILE: utils/campaignStorage.ts
// =============================================================================
// 🎯 PURPOSE: Manages campaign registry and scoped localStorage keys. ALL
//    campaign-scoped data goes through `campaignKey()` to ensure proper
//    namespacing (each campaign's data is stored under a unique prefix).
//
// 🧠 REACT CONCEPT: Scoped Storage Pattern
//    In a multi-campaign app, you can't just use plain keys like `quests`
//    in localStorage — every campaign would overwrite each other's data.
//
//    The solution: `campaignKey(base)` generates `dd-{campaignId}-{base}`.
//    So Campaign A's quests are at `dd-camp-A-quests` and Campaign B's are
//    at `dd-camp-B-quests`. They never collide.
//
// 🧠 PATTERN: Pure functions (no state, no classes)
//    Everything here is a plain function — no React hooks, no component state.
//    These are "engine" functions: they read/write localStorage directly.
//    Components call these functions inside event handlers or useEffect.
//
// 🔧 HOW TO ALTER:
//    - Change the storage prefix: modify 'dd-' in campaignKey
//    - Add campaign metadata: add fields to CampaignEntry interface
//    - Change default campaign: modify the return 'default' fallback in
//      ensureActiveCampaign
// =============================================================================

const ACTIVE_KEY = 'dd-active-campaign';     // Stores the active campaign's ID
const REGISTRY_KEY = 'dd-campaign-registry';  // Stores the list of ALL campaigns

// 🧠 CampaignEntry — What we store in the registry for each campaign.
//    NOTE: This is just a REFERENCE (id + name). The actual campaign config
//    (modules, rules, etc.) is stored at `campaignKey('campaign-config')`.
export interface CampaignEntry {
  id: string;
  name: string;
  createdAt: string;
}

// 🧠 Reads which campaign is currently active (selected in sidebar).
export function getActiveCampaign(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveCampaign(id: string): void {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* noop */ }
}

// 🧠 ensureActiveCampaign — Returns the active campaign ID, or auto-selects
//    the first one if none is active, or returns 'default' if none exist.
//    This prevents "no active campaign" bugs throughout the app.
export function ensureActiveCampaign(): string {
  const id = getActiveCampaign();
  if (id) return id;
  const campaigns = getCampaigns();
  if (campaigns.length > 0) {
    setActiveCampaign(campaigns[0].id);
    return campaigns[0].id;
  }
  return 'default';  // 🧠 Fallback when no campaigns exist at all
}

// 🧠 campaignKey() — THE KEY FUNCTION of this file.
//    Every campaign-scoped data access MUST use this function.
//
//    Usage: campaignKey('quests') → 'dd-camp-123-quests'
//    Usage in other files:
//      localStorage.getItem(campaignKey('journal-entries'))
//      localStorage.setItem(campaignKey('homebrew-items'), JSON.stringify(items))
//
//    This ensures each campaign's data is completely isolated.
export function campaignKey(base: string, overrideId?: string): string {
  const campaignId = overrideId || ensureActiveCampaign();
  return `dd-${campaignId}-${base}`;
}

// 🧠 getCampaigns — Reads the full list of campaigns from the registry.
export function getCampaigns(): CampaignEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCampaigns(list: CampaignEntry[]): void {
  try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

// 🧠 createCampaign — Adds a new campaign to the registry.
//    ID is generated from `camp-{timestamp}` (simple, unique enough for local-only).
export function createCampaign(name: string): CampaignEntry {
  const list = getCampaigns();
  const entry: CampaignEntry = {
    id: `camp-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  saveCampaigns(list);
  return entry;
}

export function renameCampaign(id: string, name: string): void {
  const list = getCampaigns();
  const found = list.find(c => c.id === id);
  if (found) { found.name = name; saveCampaigns(list); }
}

// 🧠 deleteCampaign — Removes a campaign from the registry.
//    NOTE: This only removes the REGISTRY ENTRY. The campaign's actual
//    data (quests, notes, etc.) stays in localStorage — it's orphaned.
//    A cleanup function would be needed to fully delete a campaign.
export function deleteCampaign(id: string): void {
  const list = getCampaigns().filter(c => c.id !== id);
  saveCampaigns(list);
  if (getActiveCampaign() === id) {
    setActiveCampaign(list.length > 0 ? list[0].id : 'default');
  }
}
