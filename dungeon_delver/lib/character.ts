export interface Character {
  name: string;
  race: string;
  class: string; // The primary display class (e.g., "Fighter")
  classLevels: ClassLevel[]; // This stores the multiclassing data
  totalLevel: number;       // The sum of all levels
  hp: { current: number; max: number };
  baseStats: {
    str: number; dex: number; con: number;
    int: number; wis: number; cha: number
  };
  xp: number;
  level: number; // Current level based on XP or Milestone
  levelingMode: 'milestone' | 'individual' | 'pool';
  inventory: Array<{
    id: string;
    name: string;
    equipped: boolean;
    modifiers?: Record<string, number>;
  }>;
  proficiencies: string[];

}

export interface ClassLevel {
  className: string;
  level: number;
  subclass?: string;
}