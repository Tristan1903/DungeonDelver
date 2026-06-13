// =============================================================================
// 📘 FILE: utils/sync/syncModels.ts
// =============================================================================
// 🎯 PURPOSE: Type definitions for Supabase sync entities — characters,
//    sessions, encounters, storylines, and notes. Maps logical entity names
//    to actual Supabase table names via SYNC_TABLES.
//
// 🧠 REACT CONCEPT: Data Contracts
//    These interfaces define the "contract" between the app and the remote
//    database. Every syncable entity has an id, timestamps, and a `data`
//    field (JSON string) for the actual payload. This is a generic pattern —
//    the sync engine doesn't care what's inside `data`, it just moves it.
//
//    The `data` field stores JSON strings (not objects) because Supabase
//    handles text columns more reliably than JSONB for our use case.
//
// 🔧 HOW TO ALTER:
//    - Add a new sync entity: create the interface and add to SYNC_TABLES
//    - Change table names: modify SYNC_TABLES values
//    - Add fields to entities: add to the corresponding interface
// =============================================================================

export interface SyncableCharacter {
  id: string;
  name: string;
  data: string;  // JSON-stringified Character object
  version: number;
  last_sync: string;
  updated_at: string;
  campaign_name?: string;
}

export interface SyncableSession {
  id: string;
  name: string;
  campaign_name: string;
  data: string;  // JSON-stringified session object
  created_at: string;
  updated_at: string;
}

export interface SyncableEncounter {
  id: string;
  name: string;
  session_id: string;
  combatants: string;  // JSON-stringified combatant array
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

// 🧠 SYNC_TABLES: maps logical entity names to actual Supabase table names.
//    `as const` makes the values literal types (not just `string`),
//    so TypeScript can validate table names at compile time.
export const SYNC_TABLES = {
  characters: 'dd_characters',
  sessions: 'dd_sessions',
  encounters: 'dd_encounters',
  storylines: 'dd_storylines',
  notes: 'dd_notes',
} as const;

export type SyncEntity = keyof typeof SYNC_TABLES;
