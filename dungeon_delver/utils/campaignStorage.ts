const ACTIVE_KEY = 'dd-active-campaign';
const REGISTRY_KEY = 'dd-campaign-registry';

export interface CampaignEntry {
  id: string;
  name: string;
  createdAt: string;
}

export function getActiveCampaign(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) || 'default';
  } catch {
    return 'default';
  }
}

export function setActiveCampaign(id: string): void {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* noop */ }
}

export function campaignKey(base: string, overrideId?: string): string {
  const campaignId = overrideId || getActiveCampaign();
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
  if (id === 'default') return;
  const list = getCampaigns().filter(c => c.id !== id);
  saveCampaigns(list);
  if (getActiveCampaign() === id) setActiveCampaign('default');
}
