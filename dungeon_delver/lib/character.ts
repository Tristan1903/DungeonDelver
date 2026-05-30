export interface CharacterFeature {
  name: string;
  level: number;
  source: string;
  entries?: unknown;
}

export interface CharacterSpells {
  cantrips: string[];
  known: string[];
  prepared: string[];
}

export interface SpellSlotState {
  max: number;
  used: number;
}

export interface Currency {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export type PaperDollSlot =
  | 'head' | 'face' | 'neck' | 'shoulders' | 'torso' | 'back'
  | 'wrists' | 'hands' | 'ring1' | 'ring2' | 'waist' | 'feet'
  | 'mainHand' | 'offHand' | 'ranged';

export type WeightClass = 'light' | 'medium' | 'heavy';

export interface InventoryItem {
  id: string;
  name: string;
  equipped: boolean;
  slot?: PaperDollSlot;
  weightClass?: WeightClass;
  material?: string;
  modifiers?: Record<string, number>;
  entries?: unknown;
  hiddenFromPlayer?: boolean;
  weight?: number;
  quantity?: number;
  container?: string;
  attuned?: boolean;
  cost?: { pp?: number; gp?: number; ep?: number; sp?: number; cp?: number };
  type?: string;
  dmg1?: string;
}

export interface StashItem extends InventoryItem {
  addedBy: string;
  addedAt: string;
}

export interface PhysicalDescription {
  age: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  skin: string;
}

export interface ClassResource {
  current: number;
  max: number;
  label: string;
  shortLabel?: string;
  refreshOn: 'short' | 'long';
}

export function getClassList(char: { classLevels?: ClassLevel[]; classes?: string[] }): string[] {
  return char.classes || [...new Set(char.classLevels?.map(cl => cl.className) || [])];
}

export function getPrimaryClass(char: { class?: string; classLevels?: ClassLevel[]; classes?: string[] }): string {
  return char.class || getClassList(char)[0] || '';
}

export function makeClassKey(className: string, key: string): string {
  return `${className}:${key}`;
}

export interface ModuleData {
  piety?: { deity: string; score: number };
  renown?: { factionName: string; score: number }[];
  darkGifts?: string[];
  madness?: { type: 'short' | 'long' | 'indefinite'; effect: string; duration?: number }[];
  epicBoons?: string[];
  honorSanity?: { honor: number; sanity: number };
  heroPoints?: { pool: number };
  stressFear?: { stressLevel: number };
  defiling?: { defilerLevel: number };
  groupPatrons?: { patronType: string; rank: number };
  shipMorale?: { role: string; shipName: string; morale: number };
  sidekicks?: { name: string; statBlockRef: string; level: number; hp: number; maxHp: number }[];
  transformations?: { type: string; tier: number }[];
}

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  classes?: string[];
  background?: string;
  classLevels: ClassLevel[];
  campaignName?: string;
  campaignId?: string;
  moduleData?: ModuleData;
  totalLevel: number;
  hp: { current: number; max: number; temp?: number };
  baseStats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  xp: number;
  level: number;
  levelingMode: 'milestone' | 'individual' | 'pool';
  inventory: InventoryItem[];
  proficiencies: string[];
  savingThrowProficiencies?: string[];
  expertise?: string[];
  features?: CharacterFeature[];
  resources?: Record<string, ClassResource>;
  classFeaturePicks?: Record<string, string[]>;
  spells?: CharacterSpells;
  spellSlots?: Record<number, SpellSlotState>;
  concentratingOn?: string | null;
  currency?: Currency;
  attunementSlots?: number;
  physical?: PhysicalDescription;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  organizations?: string[];
  allies?: string[];
  enemies?: string[];
  notes?: string;
}

export const SLOT_LABELS: Record<PaperDollSlot, string> = {
  head: 'Head',
  face: 'Face/Eyes',
  neck: 'Neck',
  shoulders: 'Shoulders',
  torso: 'Torso',
  back: 'Back',
  wrists: 'Wrists',
  hands: 'Hands',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  waist: 'Waist',
  feet: 'Feet',
  mainHand: 'Main Hand',
  offHand: 'Off-Hand',
  ranged: 'Ranged',
};

const SLOT_ORDER: PaperDollSlot[] = [
  'head', 'face', 'neck', 'shoulders', 'torso', 'back',
  'wrists', 'hands', 'ring1', 'ring2', 'waist', 'feet',
  'mainHand', 'offHand', 'ranged',
];

/** Guess the paper doll slot for an item based on its type/name */
export function guessSlot(item: { type?: string; name: string }): PaperDollSlot | undefined {
  const t = (item.type || '').toUpperCase();
  const n = item.name.toLowerCase();
  if (t.startsWith('LA') || t.startsWith('MA') || t.startsWith('HA')) return 'torso';
  if (t.startsWith('S') || t === 'SH') return 'offHand';
  if (t.startsWith('R')) return 'ranged';
  if (t.startsWith('M') || t.startsWith('A')) return 'mainHand';
  // Keyword-based guessing for wondrous items
  if (n.includes('helm') || n.includes('crown') || n.includes('circlet') || n.includes('headband')) return 'head';
  if (n.includes('goggle') || n.includes('mask') || n.includes('lens') || n.includes('monocle')) return 'face';
  if (n.includes('amulet') || n.includes('necklace') || n.includes('pendant') || n.includes('medal') || n.includes('periapt')) return 'neck';
  if (n.includes('cloak') || n.includes('cape') || n.includes('mantle')) return 'shoulders';
  if (n.includes('bracer') || n.includes('manacle')) return 'wrists';
  if (n.includes('glove') || n.includes('gauntlet')) return 'hands';
  if (n.includes('ring')) return 'ring1';
  if (n.includes('belt') || n.includes('sash')) return 'waist';
  if (n.includes('boot') || n.includes('slipper') || n.includes('shoe')) return 'feet';
  if (n.includes('quiver') || n.includes('backpack') || n.includes('satchel')) return 'back';
  if (n.includes('shield')) return 'offHand';
  if (n.includes('bow') || n.includes('crossbow') || n.includes('sling')) return 'ranged';
  return undefined;
}

/** Guess weight class from item type */
export function guessWeightClass(item: { type?: string; name: string }): WeightClass {
  const t = (item.type || '').toUpperCase();
  if (t.startsWith('HA')) return 'heavy';
  if (t.startsWith('MA')) return 'medium';
  if (t.startsWith('LA')) return 'light';
  const n = item.name.toLowerCase();
  if (n.includes('plate') || n.includes('splint') || n.includes('chain mail') || n.includes('greave') || n.includes('gauntlet') || n.includes('full helm')) return 'heavy';
  if (n.includes('scale') || n.includes('chain shirt') || n.includes('hide') || n.includes('studded')) return 'medium';
  return 'light';
}

export const SLOT_ORDER_LIST: PaperDollSlot[] = SLOT_ORDER;

export interface ClassLevel {
  className: string;
  level: number;
  subclass?: string;
  hdUsed?: number;
}

export const DEFAULT_CHARACTER: Character = {
  id: crypto.randomUUID ? crypto.randomUUID() : '',
  name: 'Adventurer',
  race: 'Human',
  class: 'Fighter',
  classLevels: [{ className: 'Fighter', level: 1 }],
  campaignName: '',
  campaignId: '',
  moduleData: {},
  totalLevel: 1,
  hp: { current: 10, max: 10 },
  xp: 0,
  level: 1,
  levelingMode: 'individual',
  baseStats: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 },
  inventory: [],
  proficiencies: [],
  expertise: [],
  features: [],
  resources: {},
  classFeaturePicks: {},
  spells: { cantrips: [], known: [], prepared: [] },
  spellSlots: {},
  concentratingOn: null,
  currency: { pp: 0, gp: 10, ep: 0, sp: 0, cp: 0 },
  attunementSlots: 3,
  physical: { age: '', height: '', weight: '', hair: '', eyes: '', skin: '' },
  personalityTraits: '',
  ideals: '',
  bonds: '',
  flaws: '',
  backstory: '',
  organizations: [],
  allies: [],
  enemies: [],
  notes: '',
};
