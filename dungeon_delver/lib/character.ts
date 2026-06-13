// =============================================================================
// 📘 FILE: lib/character.ts
// =============================================================================
// 🎯 PURPOSE: Defines the core Character type and all related interfaces
//    (inventory, spells, equipment slots, etc.). Also provides helper functions
//    for common character operations.
//
// 🧠 REACT CONCEPT: TypeScript interfaces + type utilities
//    This is the DATA MODEL for the entire app. Every character sheet, every
//    combat tracker, every inventory screen reads/writes data shaped like
//    the `Character` interface. If you want to add a new stat or field to
//    characters, you start here.
//
// 💡 Think of interfaces like a blueprint: "Every Character object MUST have
//    these properties with these types." TypeScript checks your code against
//    these blueprints and catches mistakes before you run the app.
//
// 🔧 HOW TO ALTER:
//    - Add a new field to a character: add it to the `Character` interface,
//      then update DEFAULT_CHARACTER with a default value
//    - Add a new equipment slot: add to `PaperDollSlot` union type, add to
//      `SLOT_LABELS` and `SLOT_ORDER`
//    - Add a new module data field: add to `ModuleData` interface
// =============================================================================

// ============================================================
// INTERFACES — Data Shapes
// ============================================================

// 🧠 `CharacterFeature` — A special ability or trait gained from class, race, etc.
export interface CharacterFeature {
  name: string;           // Feature name (e.g., "Fighting Style: Defense")
  level: number;          // What level it was gained at
  source: string;         // Where it came from (e.g., "Fighter", "Human", "Background")
  entries?: unknown;      // 🧠 `?` means optional. `unknown` means "we know data exists
                          //    but haven't typed it yet" — safer than `any` because you
                          //    can't use it without checking the type first.
}

// 🧠 `CharacterSpells` — Container for a character's known and prepared spells.
export interface CharacterSpells {
  cantrips: string[];     // Array of cantrip names (always known, no slots needed)
  known: string[];        // Spells the character "knows" (for bards, sorcerers, etc.)
  prepared: string[];     // Spells currently prepared today (for clerics, wizards, etc.)
}

// 🧠 `SpellSlotState` — Tracks how many spell slots of a given level are available.
export interface SpellSlotState {
  max: number;            // Maximum slots at this level (e.g., 3 first-level slots)
  used: number;           // How many have been used (spent)
}

// 🧠 `Currency` — Standard D&D coin denominations.
export interface Currency {
  pp: number;  // Platinum pieces
  gp: number;  // Gold pieces
  ep: number;  // Electrum pieces
  sp: number;  // Silver pieces
  cp: number;  // Copper pieces
}

// 🧠 `PaperDollSlot` — A UNION TYPE (using `|`). This is NOT an interface — it's a
//    type alias. A PaperDollSlot can ONLY be one of these 15 specific strings.
//    This is how TypeScript creates "enum-like" behavior.
//    💡 Think of it as: "This variable MUST be one of these exact words, nothing else."
export type PaperDollSlot =
  | 'head' | 'face' | 'neck' | 'shoulders' | 'torso' | 'back'
  | 'wrists' | 'hands' | 'ring1' | 'ring2' | 'waist' | 'feet'
  | 'mainHand' | 'offHand' | 'ranged';

// 🧠 `WeightClass` — Another union type for armor weight categories.
export type WeightClass = 'light' | 'medium' | 'heavy';

// 🧠 `InventoryItem` — A single item in someone's inventory.
//    This interface uses `?` (optional) extensively — most properties may be
//    undefined depending on the item type. A potion doesn't need a `slot`,
//    armor doesn't need `dmg1`.
export interface InventoryItem {
  id: string;                     // Unique identifier for this specific item instance
  name: string;                   // Display name
  equipped: boolean;              // Whether it's currently worn/wielded
  slot?: PaperDollSlot;           // Which equipment slot it goes in (if equipable)
  weightClass?: WeightClass;      // Light/medium/heavy (affects movement penalties)
  material?: string;              // What it's made of (e.g., "steel", "leather")
  modifiers?: Record<string, number>;  // 🧠 `Record<K,V>` — an object where all keys are
                                       //    strings and all values are numbers.
                                       //    E.g., { ac: 1, stealth: -1 }
  entries?: unknown;              // Raw description data from the source JSON
  hiddenFromPlayer?: boolean;     // 🧠 DM feature: items that exist but aren't shown to
                                  //    the player (cursed items, secret loot)
  weight?: number;                // Weight in pounds
  quantity?: number;              // Stack size (for arrows, rations, etc.)
  container?: string;             // If inside another item (e.g., a backpack)
  attuned?: boolean;              // Whether this item requires attunement and is attuned
  cost?: { pp?: number; gp?: number; ep?: number; sp?: number; cp?: number };
                                  // 🧠 NESTED object for cost breakdown
  type?: string;                  // Item type code (e.g., "LA" for light armor, "M" for melee weapon)
  dmg1?: string;                  // Damage dice for weapons (e.g., "1d8")
}

// 🧠 `StashItem` — EXTENDS InventoryItem with tracking info for the party stash.
//    The `extends` keyword copies ALL properties from InventoryItem, then adds more.
export interface StashItem extends InventoryItem {
  addedBy: string;        // Who added this to the stash (character name or player name)
  addedAt: string;        // ISO date string of when it was added
}

// 🧠 `PhysicalDescription` — Optional appearance details for roleplay.
export interface PhysicalDescription {
  age: string;    // Can be "27 years" or "appears middle-aged" (free text)
  height: string; // e.g., "5'10\""
  weight: string; // e.g., "175 lbs"
  hair: string;   // e.g., "Brown, shoulder-length"
  eyes: string;   // e.g., "Hazel"
  skin: string;   // e.g., "Fair with freckles"
}

// 🧠 `ClassResource` — Tracks a class feature that has limited uses per rest.
//    Examples: Rage (Barbarian), Bardic Inspiration (Bard), Ki (Monk)
export interface ClassResource {
  current: number;            // How many uses remain right now
  max: number;                // Maximum uses (typically increases with level)
  label: string;              // Display name (e.g., "Rage")
  shortLabel?: string;        // Optional shorter label for tight UI spaces
  refreshOn: 'short' | 'long'; // 🧠 String literal union — when does this recharge?
                               //    'short' = short rest, 'long' = long rest only
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// 🧠 `getClassList(char)` — Extracts all class names from a character.
//    Accepts an object with EITHER `classLevels` (array of { className, level })
//    OR `classes` (legacy string array). Uses `||` for fallback logic.
//
// 🧠 `...new Set(array)` — `Set` removes duplicates. The `...` spread operator
//    converts it back to an array. This gives us unique class names.
//
// 🧠 The `?.` is "optional chaining" — if `char.classLevels` is undefined,
//    it doesn't crash, just returns undefined. The `|| []` then provides an
//    empty array as fallback.
export function getClassList(char: { classLevels?: ClassLevel[]; classes?: string[] }): string[] {
  return char.classes || [...new Set(char.classLevels?.map(cl => cl.className) || [])];
}

// 🧠 `getPrimaryClass(char)` — Returns the character's "main" class.
//    Uses `||` chaining to try multiple sources: first `char.class` (legacy),
//    then the first element of `getClassList()`, then empty string as fallback.
export function getPrimaryClass(char: { class?: string; classLevels?: ClassLevel[]; classes?: string[] }): string {
  return char.class || getClassList(char)[0] || '';
}

// 🧠 `makeClassKey(className, key)` — Creates a namespaced storage key for
//    class-specific data. E.g., makeClassKey("Fighter", "actionSurge") → "Fighter:actionSurge"
//    This prevents key collisions between classes (Fighter's "ActionSurge" vs Rogue's).
export function makeClassKey(className: string, key: string): string {
  return `${className}:${key}`;
}

// 🧠 `ModuleData` — Container for all optional rule module data on a character.
//    Each field corresponds to a module (Piety, Renown, Madness, etc.).
//    ALL fields are optional (`?`) because a character may not use every module.
//    🧠 This is a LARGE interface with nested types — each module has its own
//    unique data structure. You add a new module here when creating new subsystems.
export interface ModuleData {
  piety?: { deity: string; score: number };                    // Piety score for a specific deity
  renown?: { factionName: string; score: number }[];           // Array of faction standings
  darkGifts?: string[];                                         // List of dark gift names
  madness?: { type: 'short' | 'long' | 'indefinite'; effect: string; duration?: number }[];
                                                                // Array of madness effects
  epicBoons?: string[];                                         // Epic boon names gained
  honorSanity?: { honor: number; sanity: number };              // Optional ability scores
  heroPoints?: { pool: number };                                // Hero Points remaining
  stressFear?: { stressLevel: number };                         // Current stress level
  defiling?: { defilerLevel: number };                          // Defiler magic corruption level
  groupPatrons?: { patronType: string; rank: number };          // Shared patron info
  shipMorale?: { role: string; shipName: string; morale: number }; // Ship crew tracking
  sidekicks?: { name: string; statBlockRef: string; level: number; hp: number; maxHp: number }[];
                                                                // Array of sidekick NPCs
  transformations?: { type: string; tier: number }[];           // Lycanthropy, vampirism, etc.
  isekai?: { type: string; bonuses?: string; skill?: string; language?: string; cantrip?: string; spell1?: string; asi?: Record<string, number> };
                                                                // 🧠 Homebrew isekai module —
                                                                //    tracks alternate-world origin bonuses
}

// ============================================================
// MAIN CHARACTER INTERFACE
// ============================================================

// 🧠 `Character` — THE central data type of the entire application.
//    This is what gets saved to localStorage, displayed on the character sheet,
//    used in combat, modified by level-ups, and synced with Obsidian.
//    Everything revolves around this interface.
//
// 💡 If you're adding a feature, you'll likely add a field here first.
export interface Character {
  id: string;                     // UUID — unique identifier, generated with crypto.randomUUID()
  name: string;                   // Character display name
  race: string;                   // Species/race name (e.g., "Human", "Elf")
  class: string;                  // 🧠 LEGACY: primary class name (use classLevels for new characters)
  classes?: string[];             // 🧠 LEGACY: array of class names (use classLevels)
  background?: string;            // Background name (e.g., "Soldier", "Criminal")
  classLevels: ClassLevel[];      // 🧠 CURRENT: array tracking each class individually
                                  //    [{ className: "Fighter", level: 3, subclass: "Champion" },
                                  //     { className: "Wizard", level: 2 }]
  campaignName?: string;          // Display name of linked campaign
  campaignId?: string;            // UUID of linked campaign
  moduleData?: ModuleData;        // Optional rule module data (piety, madness, etc.)
  totalLevel: number;             // Sum of all class levels (e.g., 5 for 3 Fighter + 2 Wizard)
  hp: { current: number; max: number; temp?: number };
                                  // 🧠 INLINE TYPE — hit points object with current, max, and
                                  //    optional temporary HP. Sometimes types are defined inline
                                  //    instead of as a separate interface.
  baseStats: {                    // The six core ability scores (3-20 range)
    str: number;  dex: number;  con: number;
    int: number;  wis: number;  cha: number;
  };
  xp: number;                     // Total experience points earned
  level: number;                  // 🧠 LEGACY: total level (use totalLevel + classLevels)
  levelingMode: 'milestone' | 'individual' | 'pool';
                                  // How XP/leveling works for this character
  inventory: InventoryItem[];     // Array of all items carried/worn
  proficiencies: string[];        // Skill/tool/weapon/armor proficiencies as strings
  savingThrowProficiencies?: string[];  // Which saves the character is proficient in
  expertise?: string[];           // Skills with double proficiency bonus (expertise)
  features?: CharacterFeature[];  // All features/abilities gained from class/race/background
  resources?: Record<string, ClassResource>;
                                  // 🧠 KEYED OBJECT — maps resource keys (like "Fighter:ActionSurge")
                                  //    to their current/max tracking. Uses namespaced keys via makeClassKey().
  classFeaturePicks?: Record<string, string[]>;
                                  // Stores choices made when picking features
                                  // (e.g., which Fighting Style, which Metamagic options)
  spells?: CharacterSpells;       // Spell knowledge and preparation
  spellSlots?: Record<number, SpellSlotState>;
                                  // 🧠 KEYED BY NUMBER — { 1: { max: 4, used: 2 }, 2: { max: 3, used: 1 } }
                                  //    The keys are spell level numbers (1-9).
  concentratingOn?: string | null;// Name of spell being concentrated on (null = not concentrating)
  currency?: Currency;            // Coin purse
  attunementSlots?: number;       // How many magic items can be attuned (default 3)
  physical?: PhysicalDescription; // Appearance details
  personalityTraits?: string;     // Roleplay trait
  ideals?: string;                // Character ideal
  bonds?: string;                 // Character bond
  flaws?: string;                 // Character flaw
  backstory?: string;             // Backstory text
  organizations?: string[];       // Faction/guild affiliations
  allies?: string[];              // NPC allies
  enemies?: string[];             // NPC enemies
  notes?: string;                 // Free-form player notes
}

// ============================================================
// CONSTANTS & LOOKUP TABLES
// ============================================================

// 🧠 `SLOT_LABELS` — Maps each PaperDollSlot to a user-friendly display name.
//    `Record<PaperDollSlot, string>` means every slot key maps to a string value.
//    TypeScript enforces that ALL slots are present — no typos, no missing ones.
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

// 🧠 `SLOT_ORDER` — Array defining the display order of equipment slots on the
//    paper doll. The order here is the order they appear in the UI.
const SLOT_ORDER: PaperDollSlot[] = [
  'head', 'face', 'neck', 'shoulders', 'torso', 'back',
  'wrists', 'hands', 'ring1', 'ring2', 'waist', 'feet',
  'mainHand', 'offHand', 'ranged',
];

// 🧠 `guessSlot(item)` — Tries to determine which equipment slot an item belongs
//    in based on its type code or name keywords. This is a HEURISTIC — it's not
//    always right, but it saves the user from manually assigning slots.
//
// 🧠 The `.toUpperCase()` / `.toLowerCase()` pattern ensures case-insensitive matching.
// 🧠 `t.startsWith(...)` checks the item's type code (from D&D data):
//    LA=Light Armor, MA=Medium Armor, HA=Heavy Armor, S=Shield,
//    SH=Shield (alt), R=Ranged weapon, M=Melee weapon, A=Ammunition
// 🧠 `n.includes(...)` checks for keywords in the item name for wondrous items
//    that don't have a standard type code.
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

// 🧠 `guessWeightClass(item)` — Determines if armor is light/medium/heavy.
//    Same pattern as guessSlot — type codes first, then name keyword fallback.
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
// 🧠 This re-exports SLOT_ORDER under a different name. Why? So other files can
//    import it without importing the (conventionally private) `SLOT_ORDER` const.
//    In TypeScript, there's no true "private" for module-level exports, but the
//    naming convention of non-exported = internal helps readability.

// 🧠 `ClassLevel` — Tracks a character's level in a specific class.
//    For single-class characters, there's one entry: [{ className: "Fighter", level: 5 }]
//    For multiclass: [{ className: "Fighter", level: 3 }, { className: "Wizard", level: 2 }]
export interface ClassLevel {
  className: string;      // Class name (e.g., "Fighter", "Wizard")
  level: number;          // Levels in this class (1-20 total, but per-class max is also 20)
  subclass?: string;      // Subclass choice (e.g., "Champion", "Evocation")
  hdUsed?: number;        // Hit Dice used (for healing during rests)
}

// ============================================================
// DEFAULT CHARACTER — The "blank slate"
// ============================================================

// 🧠 `DEFAULT_CHARACTER` — A template object with sensible defaults for a new
//    character. When the user clicks "Create Character," this is the starting
//    point. Each field is filled with a reasonable default so the UI never has
//    to check for undefined values.
//
// 💡 Pattern: Having a DEFAULT object means components can safely access
//    `character.name` knowing it will always be a string, even on a fresh
//    character. Without defaults, every access would need `character?.name || ''`.
export const DEFAULT_CHARACTER: Character = {
  id: crypto.randomUUID ? crypto.randomUUID() : '',
  // 🧠 This checks if `crypto.randomUUID()` exists (modern browsers).
  //    If not (old browser), it falls back to empty string (rare edge case).
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
  baseStats: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 }, // Standard Array defaults
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
  attunementSlots: 3,  // Standard 5e default
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
