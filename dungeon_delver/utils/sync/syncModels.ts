export interface SyncableCharacter {
  id: string;
  name: string;
  data: string;
  version: number;
  last_sync: string;
  updated_at: string;
  campaign_name?: string;
}

export interface SyncableSession {
  id: string;
  name: string;
  campaign_name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface SyncableEncounter {
  id: string;
  name: string;
  session_id: string;
  combatants: string;
  created_at: string;
}

export interface SyncableStoryline {
  id: string;
  name: string;
  campaign_name: string;
  quest_ids: string[];
  created_at: string;
}

export interface SyncableNote {
  id: string;
  campaign_name: string;
  content: string;
  type: 'session' | 'personal' | 'message';
  author: string;
  created_at: string;
}

export const SYNC_TABLES = {
  characters: 'dd_characters',
  sessions: 'dd_sessions',
  encounters: 'dd_encounters',
  storylines: 'dd_storylines',
  notes: 'dd_notes',
} as const;

export type SyncEntity = keyof typeof SYNC_TABLES;
