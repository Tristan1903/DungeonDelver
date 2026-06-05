const ACTIVE_KEY = 'dd-active-campaign';
const REGISTRY_KEY = 'dd-campaign-registry';

export interface CampaignEntry {
  id: string;
  name: string;
  createdAt: string;
}

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

export function ensureActiveCampaign(): string {
  const id = getActiveCampaign();
  if (id) return id;
  const campaigns = getCampaigns();
  if (campaigns.length > 0) {
    setActiveCampaign(campaigns[0].id);
    return campaigns[0].id;
  }
  return 'default';
}

export function campaignKey(base: string, overrideId?: string): string {
  const campaignId = overrideId || ensureActiveCampaign();
  return `dd-${campaignId}-${base}`;
}

export function getCampaigns(): CampaignEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCampaigns(list: CampaignEntry[]): void {
  try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

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

export function deleteCampaign(id: string): void {
  const list = getCampaigns().filter(c => c.id !== id);
  saveCampaigns(list);
  if (getActiveCampaign() === id) {
    setActiveCampaign(list.length > 0 ? list[0].id : 'default');
  }
}
