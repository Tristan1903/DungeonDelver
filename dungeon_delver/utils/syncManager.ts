'use client';
import { saveCharToLocal, getStorageKey, loadCharFromLocal, CHAR_STORAGE_PREFIX } from './storageEngine';
import { campaignKey, getCampaigns, type CampaignEntry } from './campaignStorage';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type SyncCallback = (status: SyncStatus, message?: string) => void;

function apiUrl(serverUrl: string, path: string): string {
  try {
    const u = new URL(serverUrl);
    return `${u.protocol}//${u.host}/api/${path}`;
  } catch {
    const base = serverUrl.replace(/\/+$/, '');
    return `${base}/api/${path}`;
  }
}

function httpGet(url: string): Promise<any> {
  return fetch(url).then(async r => {
    if (!r.ok) {
      let errMsg = `HTTP ${r.status}`;
      try { const e = await r.json(); errMsg = e.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    return r.json();
  });
}

function httpPost(url: string, body: any): Promise<any> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async r => {
    if (!r.ok) {
      let errMsg = `HTTP ${r.status}`;
      try { const e = await r.json(); errMsg = e.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    return r.json();
  });
}

function httpDelete(url: string): Promise<any> {
  return fetch(url, { method: 'DELETE' }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.error || `HTTP ${r.status}`); });
    return r.json();
  });
}

export async function checkServerHealth(serverUrl: string): Promise<boolean> {
  try {
    const res = await httpGet(apiUrl(serverUrl, 'health'));
    return res.status === 'ok';
  } catch { return false; }
}

export async function pushCharacter(serverUrl: string, room: string, character: any, onStatus?: SyncCallback): Promise<boolean> {
  try {
    onStatus?.('syncing', `Pushing ${character.name}...`);
    const url = apiUrl(serverUrl, 'sync/characters');
    console.log('[Push] POST', url, { room, characterId: character.id, characterName: character.name });
    await httpPost(url, { room, character });
    onStatus?.('success', `${character.name} synced`);
    return true;
  } catch (err: any) {
    console.error('[Push] Error:', err);
    onStatus?.('error', err.message);
    return false;
  }
}

export async function pullCharacter(serverUrl: string, room: string, characterId: string, onStatus?: SyncCallback): Promise<any> {
  try {
    onStatus?.('syncing', 'Downloading character...');
    const data = await httpGet(apiUrl(serverUrl, `sync/characters/${encodeURIComponent(characterId)}?room=${encodeURIComponent(room)}`));
    if (!data || !data.id) { onStatus?.('error', 'Invalid character data from server'); return null; }
    const key = saveCharToLocal(data);
    onStatus?.('success', `${data.name} downloaded`);
    return data;
  } catch (err: any) {
    onStatus?.('error', err.message);
    return null;
  }
}

export async function listCloudCharacters(serverUrl: string, room: string, onStatus?: SyncCallback): Promise<any[]> {
  try {
    onStatus?.('syncing', 'Fetching character list...');
    const data = await httpGet(apiUrl(serverUrl, `sync/characters?room=${encodeURIComponent(room)}`));
    onStatus?.('success', `${data.characters.length} character(s) on server`);
    return data.characters || [];
  } catch (err: any) {
    onStatus?.('error', err.message);
    return [];
  }
}

export async function deleteCloudCharacter(serverUrl: string, room: string, characterId: string, onStatus?: SyncCallback): Promise<boolean> {
  try {
    onStatus?.('syncing', 'Deleting character...');
    await httpDelete(apiUrl(serverUrl, `sync/characters/${encodeURIComponent(characterId)}?room=${encodeURIComponent(room)}`));
    onStatus?.('success', 'Character deleted from server');
    return true;
  } catch (err: any) {
    onStatus?.('error', err.message);
    return false;
  }
}

export async function pushAllCharacters(serverUrl: string, room: string, onStatus?: SyncCallback): Promise<number> {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CHAR_STORAGE_PREFIX)) keys.push(key);
  }

  let successCount = 0;
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const char = JSON.parse(raw);
      if (char && char.id) {
        const ok = await pushCharacter(serverUrl, room, char);
        if (ok) successCount++;
      }
    } catch {}
  }

  onStatus?.('success', `Pushed ${successCount}/${keys.length} characters`);
  return successCount;
}

export async function pullAllCharacters(serverUrl: string, room: string, onStatus?: SyncCallback): Promise<number> {
  const cloud = await listCloudCharacters(serverUrl, room, onStatus);
  let successCount = 0;
  for (const entry of cloud) {
    const char = await pullCharacter(serverUrl, room, entry.id);
    if (char) successCount++;
  }
  onStatus?.('success', `Downloaded ${successCount}/${cloud.length} characters`);
  return successCount;
}

export async function pushCampaign(serverUrl: string, room: string, campaignId: string, onStatus?: SyncCallback): Promise<boolean> {
  try {
    const configKey = campaignKey('campaign-config', campaignId);
    const configRaw = localStorage.getItem(configKey) || '{}';
    const registry = getCampaigns();
    const entry = registry.find(c => c.id === campaignId);
    if (!entry) { onStatus?.('error', 'Campaign not found locally'); return false; }

    const campaign = {
      id: campaignId,
      name: entry.name,
      config: configRaw,
      createdAt: entry.createdAt,
    };

    onStatus?.('syncing', `Pushing campaign "${entry.name}"...`);
    await httpPost(apiUrl(serverUrl, 'sync/campaigns'), { room, campaign });
    onStatus?.('success', `Campaign "${entry.name}" synced`);
    return true;
  } catch (err: any) {
    onStatus?.('error', err.message);
    return false;
  }
}

export async function pullCampaign(serverUrl: string, room: string, campaignId: string, onStatus?: SyncCallback): Promise<boolean> {
  try {
    onStatus?.('syncing', 'Downloading campaign...');
    const data = await httpGet(apiUrl(serverUrl, `sync/campaigns/${encodeURIComponent(campaignId)}?room=${encodeURIComponent(room)}`));
    if (!data) { onStatus?.('error', 'Campaign not found on server'); return false; }

    const configKey = campaignKey('campaign-config', campaignId);
    localStorage.setItem(configKey, data.config || '{}');

    const registry = getCampaigns();
    if (!registry.find(c => c.id === campaignId)) {
      registry.push({ id: campaignId, name: data.name, createdAt: data.createdAt || new Date().toISOString() });
      localStorage.setItem('dd-campaign-registry', JSON.stringify(registry));
    }

    onStatus?.('success', `Campaign "${data.name}" downloaded`);
    return true;
  } catch (err: any) {
    onStatus?.('error', err.message);
    return false;
  }
}

export async function listCloudCampaigns(serverUrl: string, room: string, onStatus?: SyncCallback): Promise<any[]> {
  try {
    onStatus?.('syncing', 'Fetching campaign list...');
    const data = await httpGet(apiUrl(serverUrl, `sync/campaigns?room=${encodeURIComponent(room)}`));
    onStatus?.('success', `${data.campaigns.length} campaign(s) on server`);
    return data.campaigns || [];
  } catch (err: any) {
    onStatus?.('error', err.message);
    return [];
  }
}

export async function pushAllCampaigns(serverUrl: string, room: string, onStatus?: SyncCallback): Promise<number> {
  const registry = getCampaigns();
  let successCount = 0;
  for (const entry of registry) {
    const ok = await pushCampaign(serverUrl, room, entry.id);
    if (ok) successCount++;
  }
  onStatus?.('success', `Pushed ${successCount}/${registry.length} campaigns`);
  return successCount;
}

export async function pullAllCampaigns(serverUrl: string, room: string, onStatus?: SyncCallback): Promise<number> {
  const cloud = await listCloudCampaigns(serverUrl, room, onStatus);
  let successCount = 0;
  for (const entry of cloud) {
    const ok = await pullCampaign(serverUrl, room, entry.id);
    if (ok) successCount++;
  }
  onStatus?.('success', `Downloaded ${successCount}/${cloud.length} campaigns`);
  return successCount;
}
