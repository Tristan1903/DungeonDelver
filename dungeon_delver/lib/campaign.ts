// =============================================================================
// 📘 FILE: lib/campaign.ts
// =============================================================================
// 🎯 PURPOSE: Defines the TypeScript types (shapes) for campaign-related data:
//    campaigns, sessions, encounters, quests, and journal entries.
//
// 🧠 REACT CONCEPT: TypeScript interfaces
//    This file has NO React code — it's pure TypeScript. Interfaces define the
//    "shape" of objects used throughout the app. When a component says
//    `campaign: CampaignFile`, TypeScript knows exactly what properties that
//    object has and will warn you if you try to access something that doesn't
//    exist (e.g., `campaign.nonExistent`).
//
// 💡 Why types matter in React: When you have 15 components all using the same
//    "campaign" object, you need them all to agree on the shape. If one expects
//    `campaign.name` and another expects `campaign.title`, things break.
//    Interfaces prevent these bugs at compile time (before the app even runs).
//
// 🔧 HOW TO ALTER:
//    - Add new fields to an interface: e.g., add `playerCount?: number` to
//      SessionFile to track how many players attended
//    - Add new interfaces for new data types
//    - Use `extends` to build on existing types (see SessionEncounterLog)
// =============================================================================

// 🧠 `export interface` — Makes the type available to other files via import.
//    Without `export`, it would only be usable within this file.
// 🧠 `PartyFile` — Represents a saved party/group of characters.
export interface PartyFile {
  name: string;               // The party's display name (e.g., "The Heroes of Phandalin")
  characterPaths: string[];   // Array of character IDs or file paths in the party
  enabledModules: string[];   // Which optional rule modules are active for this party
  createdAt: string;          // ISO date string of when the party was created
}

// 🧠 `SessionEncounter` — A planned or active combat encounter within a session.
export interface SessionEncounter {
  id: string;                 // Unique identifier for this encounter
  name: string;               // Display name (e.g., "Goblin Ambush")
  combatants: unknown[];      // 🧠 `unknown[]` — Array of combatants, type not yet specified
                              //    `unknown` is safer than `any` — you MUST check the type
                              //    before using it. This is a TODO waiting for a proper type.
  initiativeMode: 'auto' | 'manual';  // String literal type — ONLY these two values allowed
  preRolledInitiative?: Record<string, number>;  // Optional (`?`): pre-rolled initiative values
                                                  // mapped by combatant name
}

// 🧠 `SessionEncounterLog` — EXTENDS SessionEncounter, adding log/report fields.
//    The `extends` keyword means it has ALL properties from SessionEncounter
//    PLUS the ones defined here. This is called "interface inheritance."
export interface SessionEncounterLog extends SessionEncounter {
  xp?: number;                // XP earned from this encounter
  xpPerPlayer?: number;       // XP divided among party members
  outcome?: 'ongoing' | 'victory' | 'defeat' | 'fled';  // String literal union type
  notes?: string;             // GM notes about how it went
}

// 🧠 `SessionJournalEntry` — A single entry in a session's journal/log.
export interface SessionJournalEntry {
  id: string;                 // Unique ID for this journal entry
  type: 'note' | 'encounter' | 'milestone' | 'loot' | 'rest-short' | 'rest-long' | 'level-up';
                              // 🧠 UNION TYPE — the `type` field can only be ONE of these
                              //    string values. TypeScript autocomplete shows you the options.
                              //    This is great for switch/case statements.
  title: string;              // Entry title (e.g., "Defeated the Dragon")
  content: string;            // Full text content
  timestamp: string;          // ISO date string when it was written
}

// 🧠 `SessionFile` — Represents a full game session, with encounters and journal entries.
export interface SessionFile {
  id: string;                 // Unique session ID
  name: string;               // Session name (e.g., "Session 3: The Dark Forest")
  date: string;               // Real-world date of the session
  partyPath?: string;         // Optional reference to the party file
  encounters: SessionEncounterLog[];  // Array of encounters that happened
  journalPath?: string;       // Optional path to an external journal file
  notes?: string;             // Free-form DM notes
  xpTotal?: number;           // Total XP for this session
  entries?: SessionJournalEntry[];  // Array of journal entries (newschool format)
}

// 🧠 `SessionLogStore` — A container that holds all sessions and tracks which
//    one is currently active. This is what gets saved to localStorage.
export interface SessionLogStore {
  sessions: SessionFile[];        // All sessions ever created
  activeSessionId: string | null; // 🧠 UNION with `null` — either a string ID or null
                                  //    (meaning no session is active). Very common pattern
                                  //    for "optional but tracked" values.
}

// 🧠 `QuestObjective` — A single step within a quest.
export interface QuestObjective {
  id: string;             // Unique ID (needed for React lists — more on that later)
  text: string;           // What the party needs to do
  completed: boolean;     // True/false checkbox state
}

// 🧠 `Quest` — A full quest with multiple objectives.
export interface Quest {
  id: string;             // Unique identifier
  name: string;           // Quest title
  status: 'active' | 'complete' | 'failed';  // String literal union — only 3 possible states
  description: string;    // What the quest is about
  objectives: QuestObjective[];  // Array of sub-tasks
  rewardXp: number;       // XP reward on completion
  rewardItems: string;    // Item rewards (text description)
  notes: string;          // GM notes
  sessionIds: string[];   // Links to sessions where this quest was relevant
  campaignName?: string;  // Optional: which campaign this belongs to
  createdAt: string;      // ISO date string
}

// 🧠 `CampaignFile` — The overall campaign container. Links to a party and sessions.
export interface CampaignFile {
  name: string;           // Campaign name (e.g., "Curse of Strahd")
  partyPath: string;      // Path to the party file in storage
  sessions: string[];     // Array of session IDs or file paths
  homebrewIndexPath?: string;  // Optional: path to homebrew content
}
