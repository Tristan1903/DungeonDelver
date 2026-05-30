export interface PartyFile {
  name: string;
  characterPaths: string[];
  enabledModules: string[];
  createdAt: string;
}

export interface SessionEncounter {
  id: string;
  name: string;
  combatants: unknown[];
  initiativeMode: 'auto' | 'manual';
  preRolledInitiative?: Record<string, number>;
}

export interface SessionEncounterLog extends SessionEncounter {
  xp?: number;
  xpPerPlayer?: number;
  outcome?: 'ongoing' | 'victory' | 'defeat' | 'fled';
  notes?: string;
}

export interface SessionJournalEntry {
  id: string;
  type: 'note' | 'encounter' | 'milestone' | 'loot' | 'rest-short' | 'rest-long' | 'level-up';
  title: string;
  content: string;
  timestamp: string;
}

export interface SessionFile {
  id: string;
  name: string;
  date: string;
  partyPath?: string;
  encounters: SessionEncounterLog[];
  journalPath?: string;
  notes?: string;
  xpTotal?: number;
  entries?: SessionJournalEntry[];
}

export interface SessionLogStore {
  sessions: SessionFile[];
  activeSessionId: string | null;
}

export interface QuestObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  name: string;
  status: 'active' | 'complete' | 'failed';
  description: string;
  objectives: QuestObjective[];
  rewardXp: number;
  rewardItems: string;
  notes: string;
  sessionIds: string[];
  campaignName?: string;
  createdAt: string;
}

export interface CampaignFile {
  name: string;
  partyPath: string;
  sessions: string[];
  homebrewIndexPath?: string;
}
