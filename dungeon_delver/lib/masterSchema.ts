export interface Character {
  name: string;
  race: string;
  class: string;
  level: number;
  // Dynamic Stats
  stats: {
    str: number; dex: number; con: number; int: number; wis: number; cha: number;
  };
  // Resources
  resources: {
    hp: { current: number; max: number };
    hitDice: { current: number; max: number };
  };
  // Inventory (Items act as Modifiers)
  inventory: {
    name: string;
    equipped: boolean;
    modifiers: Record<string, number>;
  }[];
}