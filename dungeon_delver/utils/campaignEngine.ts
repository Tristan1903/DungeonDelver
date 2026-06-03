'use client';
import { campaignKey } from './campaignStorage';

export const OPTIONAL_MODULES = [
  { id: 'piety', name: 'Piety (MOoT)', description: 'Devotion to gods unlocks supernatural gifts.' },
  { id: 'renown', name: 'Renown (DMG/GGR)', description: 'Faction standing earns ranks and perks.' },
  { id: 'darkGifts', name: 'Dark Gifts (VRGR)', description: 'Cursed templates from dark bargains.' },
  { id: 'stressFear', name: 'Stress & Fear (VRGR)', description: 'Mental strain imposes check penalties.' },
  { id: 'shipMorale', name: 'Ship Morale (GoS)', description: 'Crew loyalty and officer roles.' },
  { id: 'defiling', name: 'Defiling Magic (Dark Sun)', description: 'Drain the land or cast safely.' },
  { id: 'groupPatrons', name: 'Group Patrons (TCoE)', description: 'Shared benefactor perks.' },
  { id: 'sidekicks', name: 'Sidekicks (TCoE)', description: 'NPC companions that level with party.' },
  { id: 'supernaturalRegions', name: 'Supernatural Regions (TCoE)', description: 'Localized magical anomalies.' },
  { id: 'siege', name: 'Siege Warfare (DMG)', description: 'Ballistas, mangonels, battering rams.' },
  { id: 'madness', name: 'Madness (DMG)', description: 'Short, long, and indefinite afflictions.' },
  { id: 'epicBoons', name: 'Epic Boons (DMG)', description: 'Post-level-20 mythic rewards.' },
  { id: 'honorSanity', name: 'Honor & Sanity (DMG)', description: 'Optional 8th/9th ability scores.' },
  { id: 'grittyRealism', name: 'Gritty Realism (DMG)', description: '8-hour short rests, 7-day long rests.' },
  { id: 'heroPoints', name: 'Hero Points (DMG)', description: 'Pool of d6s to modify d20 rolls.' },
  { id: 'transformations', name: 'Transformations (GHPG)', description: 'Dark transformations: Vampire, Lycanthrope, Lich, Seraph, Fiend, Aberrant Horror, Fey, Primordial, Specter.' },
  { id: 'isekai', name: 'Isekai (Another World)', description: 'Characters transported from another world bypass race restrictions and gain an origin bonus.' },
] as const;

export type ModuleId = (typeof OPTIONAL_MODULES)[number]['id'];

export interface PietyConfig {
  deityName: string;
  thresholds: { score: number; rank: string; benefit: string }[];
}
export interface RenownConfig {
  factions: { name: string; ranks: { score: number; title: string }[] }[];
}
export interface DarkGiftsConfig {
  gifts: { name: string; description: string; mechanicalEffect: string }[];
}
export interface StressFearConfig {
  stressFrightenedDC: number;
  stressHorrifiedDC: number;
}
export interface ShipMoraleConfig {
  baseMorale: number;
  officerRoles: string[];
  moraleModifiers: { situation: string; mod: number }[];
}
export interface DefilingConfig {
  damagePerSpellLevel: number;
  radiusPerLevel: number;
  preserveOptions: { name: string; cost: number }[];
}
export interface GroupPatronsConfig {
  patrons: { type: string; description: string; benefits: string[]; ranks: string[] }[];
}
export interface SidekicksConfig {
  statBlocks: { name: string; type: string; hpBonus: number; attackBonus: number; saveBonus: number }[];
}
export interface SupernaturalRegionsConfig {
  regions: { name: string; type: string; effects: string }[];
}
export interface SiegeConfig {
  weapons: { name: string; ac: number; hp: number; dmg: string; crew: number; range: string }[];
}
export interface MadnessConfig {
  shortTermTable: string[];
  longTermTable: string[];
  indefiniteTable: string[];
}
export interface EpicBoonsConfig {
  boons: { name: string; description: string; prerequisites: string }[];
}
export interface HonorSanityConfig {
  defaultHonor: number;
  defaultSanity: number;
}
export interface GrittyRealismConfig {
  shortRestHours: number;
  longRestDays: number;
}
export interface HeroPointsConfig {
  poolSize: number;
  maxPool: number;
  resetPerSession: boolean;
}

export interface TransformationTier {
  level: number;
  boons: { name: string; description: string }[];
  flaws: { name: string; description: string }[];
  features: { name: string; description: string }[];
}

export interface TransformationType {
  id: string;
  name: string;
  description: string;
  tiers: TransformationTier[];
}

export interface TransformationsConfig {
  types: TransformationType[];
  activeTransformations: Record<string, { boons: string[]; flaws: string[]; features: string[] }>;
}

export interface IsekaiTypeConfig {
  id: string;
  label: string;
  description: string;
  bonuses: string;
}

export interface IsekaiConfig {
  types: IsekaiTypeConfig[];
}

export type ModuleConfigMap = {
  piety: PietyConfig;
  renown: RenownConfig;
  darkGifts: DarkGiftsConfig;
  stressFear: StressFearConfig;
  shipMorale: ShipMoraleConfig;
  defiling: DefilingConfig;
  groupPatrons: GroupPatronsConfig;
  sidekicks: SidekicksConfig;
  supernaturalRegions: SupernaturalRegionsConfig;
  siege: SiegeConfig;
  madness: MadnessConfig;
  epicBoons: EpicBoonsConfig;
  honorSanity: HonorSanityConfig;
  grittyRealism: GrittyRealismConfig;
  heroPoints: HeroPointsConfig;
  transformations: TransformationsConfig;
  isekai: IsekaiConfig;
};

export type RacePresetId =
  | 'standard'
  | 'phb'
  | 'greyhawk'
  | 'grimHollow'
  | 'ravenloft'
  | 'eberron'
  | 'exandria'
  | 'theros'
  | 'ravnica'
  | 'spelljammer'
  | 'dragonlance'
  | 'strixhaven'
  | 'darkSun';

export interface RacePresetDef {
  id: RacePresetId;
  label: string;
  description: string;
  /** Only raw entries with these source IDs are kept */
  sources?: string[];
  /** Race names to always include even if source doesn't match */
  includeRaces?: string[];
  /** Race names to always exclude even if source matches */
  excludeRaces?: string[];
  /** If true, include races whose raw entry has lineage: "VRGR" or lineage: true */
  includeLineages?: boolean;
}

export const CAMPAIGN_RACE_PRESETS: RacePresetDef[] = [
  { id: 'standard', label: 'Standard', description: 'All available races — no restrictions. (Forgotten Realms, Planescape)' },
  { id: 'phb', label: 'PHB Only', description: 'Only races published in the Player\'s Handbook (2014 + 2024).', sources: ['XPHB', 'PHB'] },
  { id: 'greyhawk', label: 'Greyhawk', description: 'Standard PHB races. High-magic races (Dragonborn, Tiefling) are extremely rare but may appear.', sources: ['XPHB', 'PHB'] },
  { id: 'grimHollow', label: 'Grim Hollow', description: 'Core + Grim Hollow Player\'s Guide races (Accursed, Arisen, Dhampir, Disembodied, Downcast, Dreamer, Grudgel, Laneshi, Ogresh, Wechselkind, Wulven).', sources: ['XPHB', 'PHB', 'GrimHollowPG24'] },
  { id: 'ravenloft', label: 'Ravenloft', description: 'Core races + Van Richten\'s exclusive lineages (Dhampir, Hexblood, Reborn).', sources: ['XPHB', 'PHB'], includeRaces: ['Dhampir', 'Hexblood', 'Reborn'] },
  { id: 'eberron', label: 'Eberron', description: 'Core + Eberron races (Warforged, Shifter, Changeling, Kalashtar, Bugbear, Goblin, Hobgoblin, Orc, Khoravar).', sources: ['XPHB', 'PHB', 'ERLW', 'EFA'] },
  { id: 'exandria', label: 'Exandria (Wildemount)', description: 'Core + Explorer\'s Guide to Wildemount (Pallid Elves, Lotusden Halflings, Draconblood/Ravenite Dragonborn).', sources: ['XPHB', 'PHB', 'EGW'] },
  { id: 'theros', label: 'Theros', description: 'Theros-native races only: Humans, Centaurs, Leonin, Minotaurs, Satyrs, Tritons.', sources: ['MOT'], includeRaces: ['Human'] },
  { id: 'ravnica', label: 'Ravnica', description: 'Ravnica-native races: Humans, Elves, Half-Elves, Centaurs, Goblins, Loxodons, Minotaurs, Simic Hybrids, Vedalken.', sources: ['GGR'], includeRaces: ['Human', 'Elf', 'Half-Elf'] },
  { id: 'spelljammer', label: 'Spelljammer', description: 'Core + Astral Adventurer\'s Guide races (Astral Elf, Autognome, Giff, Hadozee, Plasmoid, Thri-kreen).', sources: ['XPHB', 'PHB', 'AAG'] },
  { id: 'dragonlance', label: 'Dragonlance', description: 'Core races + Kender. No Orcs, Half-Orcs, or Halflings. Minotaurs are playable.', sources: ['XPHB', 'PHB', 'DSotDQ'], excludeRaces: ['Orc', 'Half-Orc', 'Halfling'] },
  { id: 'strixhaven', label: 'Strixhaven', description: 'Core + Strixhaven races (Owlin).', sources: ['XPHB', 'PHB', 'SCC'] },
  { id: 'darkSun', label: 'Dark Sun', description: 'Dark Sun-native races only: Humans, Dwarves, Half-Elves, Halflings, Elves. No data loaded for Half-Giants, Muls, Pterrans, or Thri-kreen.', includeRaces: ['Human', 'Dwarf', 'Half-Elf', 'Halfling', 'Elf'] },
];

export function filterRacesByPreset(allSpecies: any[], rawSpecies: any[], presetId: RacePresetId): any[] {
  if (presetId === 'standard') return allSpecies;
  const preset = CAMPAIGN_RACE_PRESETS.find(p => p.id === presetId);
  if (!preset) return allSpecies;

  const allowedNames = new Set<string>();

  for (const entry of rawSpecies) {
    let allowed = false;

    if (preset.sources?.includes(entry.source)) allowed = true;
    if (preset.includeRaces?.includes(entry.name)) allowed = true;
    if (preset.includeLineages && (entry.lineage === 'VRGR' || entry.lineage === true)) allowed = true;

    if (preset.excludeRaces?.includes(entry.name)) allowed = false;

    if (allowed) allowedNames.add(entry.name);
  }

  return allSpecies.filter(s => allowedNames.has(s.name));
}

export interface CampaignConfig {
  name: string;
  enabledModules: string[];
  moduleConfig: Partial<ModuleConfigMap>;
  racePreset?: RacePresetId;
  updatedAt: string;
}

export const MODULE_CONFIG_DEFAULTS: ModuleConfigMap = {
  piety: {
    deityName: 'Unknown Deity',
    thresholds: [
      { score: 3, rank: 'Favored', benefit: 'Minor divine blessing' },
      { score: 10, rank: 'Devoted', benefit: 'Access to commune spell' },
      { score: 25, rank: 'Exalted', benefit: 'Divine intervention once per week' },
      { score: 50, rank: 'Champion', benefit: 'Permanent divine boon' },
    ],
  },
  renown: {
    factions: [
      {
        name: 'Example Faction',
        ranks: [
          { score: 1, title: 'Initiate' },
          { score: 5, title: 'Member' },
          { score: 15, title: 'Agent' },
          { score: 25, title: 'Champion' },
        ],
      },
    ],
  },
  darkGifts: {
    gifts: [
      { name: 'Dark Gift of X', description: 'A terrible bargain with dark powers.', mechanicalEffect: 'Gain darkvision 60ft and vulnerability to radiant damage.' },
    ],
  },
  stressFear: {
    stressFrightenedDC: 15,
    stressHorrifiedDC: 20,
  },
  shipMorale: {
    baseMorale: 10,
    officerRoles: ['Captain', 'First Mate', 'Navigator', 'Quartermaster'],
    moraleModifiers: [
      { situation: 'Victory in combat', mod: 2 },
      { situation: 'Lost crew member', mod: -2 },
      { situation: 'Found treasure', mod: 1 },
    ],
  },
  defiling: {
    damagePerSpellLevel: 1,
    radiusPerLevel: 10,
    preserveOptions: [
      { name: 'Use component pouch', cost: 25 },
      { name: 'Blood sacrifice', cost: 5 },
    ],
  },
  groupPatrons: {
    patrons: [
      {
        type: 'Example Patron',
        description: 'A powerful organization that aids the party.',
        benefits: ['Free lodging', 'Access to restricted areas'],
        ranks: ['Associate', 'Ally', 'Trusted Agent'],
      },
    ],
  },
  sidekicks: {
    statBlocks: [
      { name: 'Warrior Sidekick', type: 'warrior', hpBonus: 5, attackBonus: 3, saveBonus: 2 },
      { name: 'Spellcaster Sidekick', type: 'spellcaster', hpBonus: 3, attackBonus: 2, saveBonus: 3 },
    ],
  },
  supernaturalRegions: {
    regions: [
      { name: 'Example Region', type: 'magical', effects: 'All spellcasters regain 1 spell slot on short rest.' },
    ],
  },
  siege: {
    weapons: [
      { name: 'Ballista', ac: 15, hp: 50, dmg: '3d10', crew: 3, range: '120/480' },
      { name: 'Mangonel', ac: 15, hp: 100, dmg: '5d10', crew: 5, range: '200/800' },
      { name: 'Ram', ac: 20, hp: 200, dmg: '8d10', crew: 10, range: 'Melee' },
    ],
  },
  madness: {
    shortTermTable: [
      'You are stunned for 1 minute.',
      'You drop everything and flee for 1 minute.',
      'You are incapacitated for 1 minute.',
      'You scream uncontrollably for 1 minute.',
    ],
    longTermTable: [
      'You suffer one level of exhaustion for 24 hours.',
      'You gain a new phobia for 1d4 days.',
      'You become paranoid for 1d10 days.',
      'You lose the ability to speak for 24 hours.',
    ],
    indefiniteTable: [
      'You develop a nervous tic.',
      'You are convinced someone is plotting against you.',
      'You have vivid nightmares every night.',
      'You cannot speak truthfully.',
    ],
  },
  epicBoons: {
    boons: [
      { name: 'Boon of Fortitude', description: 'Your Constitution score increases by 2, and your maximum increases by 40.', prerequisites: 'Level 20' },
      { name: 'Boon of High Magic', description: 'You gain one 9th-level spell slot.', prerequisites: 'Level 20, Spellcasting feature' },
    ],
  },
  honorSanity: {
    defaultHonor: 10,
    defaultSanity: 10,
  },
  grittyRealism: {
    shortRestHours: 8,
    longRestDays: 7,
  },
  heroPoints: {
    poolSize: 5,
    maxPool: 10,
    resetPerSession: true,
  },
  transformations: {
    types: [
      {
        id: 'aberrantHorror', name: 'Aberrant Horror', description: 'Transform into a twisted aberration.',
        tiers: [
          { level: 3, boons: [{ name: 'Aberrant Resilience', description: 'Resistance to psychic damage.' }, { name: 'Tentacle Lash', description: 'Bonus action melee attack with 10ft reach.' }], flaws: [{ name: 'Unsettling Presence', description: 'Creatures that see you must make a Wisdom save or be frightened.' }], features: [{ name: 'Aberrant Transformation', description: 'Your body warps and shifts. Gain darkvision 60ft.' }] },
          { level: 6, boons: [{ name: 'Mind Blast', description: '30ft cone, 4d6 psychic damage, DC 15 Int save or stunned.' }], flaws: [{ name: 'Alien Thoughts', description: 'Advantage on Int checks but disadvantage on Cha checks.' }], features: [{ name: 'Eldritch Form', description: 'Natural armor AC 13 + Dex.' }] },
          { level: 10, boons: [{ name: 'Void Gaze', description: 'Targets within 30ft have disadvantage on saves against your spells.' }], flaws: [{ name: 'Lost Identity', description: 'You forget your backstory. DM may impose roleplay effects.' }], features: [{ name: 'Aberrant Mastery', description: 'Telepathy 60ft.' }] },
          { level: 14, boons: [{ name: 'Reality Warp', description: 'Cast Modify Memory once per long rest.' }], flaws: [{ name: 'Cosmic Horror', description: 'Your form is deeply disturbing. NPCs start hostile.' }], features: [{ name: 'Eldritch Ascension', description: 'Fly speed equal to walk speed.' }] },
        ],
      },
      {
        id: 'fiend', name: 'The Fiend', description: 'Pact with infernal powers transforms you.',
        tiers: [
          { level: 3, boons: [{ name: 'Infernal Resilience', description: 'Resistance to fire damage.' }, { name: 'Fiendish Strike', description: 'Melee attacks deal extra 1d6 fire damage.' }], flaws: [{ name: 'Hellish Temptation', description: 'Disadvantage on saves against charm effects.' }], features: [{ name: 'Fiendish Transformation', description: 'Your eyes glow red. Darkvision 60ft.' }] },
          { level: 6, boons: [{ name: 'Fireball', description: 'Cast Fireball once per long rest (DC = spell save DC).' }], flaws: [{ name: 'Vulnerability to Radiant', description: 'You gain vulnerability to radiant damage.' }], features: [{ name: 'Infernal Constitution', description: 'Immunity to fire damage.' }] },
          { level: 10, boons: [{ name: 'Hellish Rebuke', description: 'Reaction when damaged: 3d10 fire damage, DC 15 Dex save for half.' }], flaws: [{ name: 'Soul Debt', description: 'If you die, your soul is claimed. No resurrection except True Resurrection or Wish.' }], features: [{ name: 'Infernal Form', description: 'Gain horns, tail, and claws. Natural weapons deal 1d6 + Str slashing.' }] },
          { level: 14, boons: [{ name: 'Infernal Command', description: 'Cast Command at will.' }], flaws: [{ name: 'Devil\'s Mark', description: 'You are marked. Devils always know your location.' }], features: [{ name: 'Fiendish Ascension', description: 'Fly speed 60ft, immunity to fire.' }] },
        ],
      },
      {
        id: 'lich', name: 'The Lich', description: 'Dark necromantic ritual binds your soul.',
        tiers: [
          { level: 3, boons: [{ name: 'Undead Resilience', description: 'Resistance to necrotic damage.' }, { name: 'Chill Touch', description: 'At will. 1d8 necrotic, target can\'t regain HP.' }], flaws: [{ name: 'Dead Stillness', description: 'Disadvantage on Persuasion checks.' }], features: [{ name: 'Lich\'s Transformation', description: 'You appear undead. Advantage on Intimidation.' }] },
          { level: 6, boons: [{ name: 'Life Drain', description: 'Melee spell attack: 2d8 + Cha necrotic. Reduce max HP by amount dealt.' }], flaws: [{ name: 'Hunger for Life', description: 'Must succeed on DC 14 Wis save or attack the nearest living creature when below half HP.' }], features: [{ name: 'Soul Cage', description: 'When you drop to 0 HP, make a DC 10 Con save. On success, drop to 1 HP instead.' }] },
          { level: 10, boons: [{ name: 'Paralyzing Touch', description: 'Melee: DC 15 Con save or paralyzed for 1 minute.' }], flaws: [{ name: 'Reckless Decay', description: 'Your body decays. Disadvantage on all Cha checks.' }], features: [{ name: 'Negative Energy Field', description: 'Creatures within 10ft can\'t regain HP.' }] },
          { level: 14, boons: [{ name: 'Finger of Death', description: 'Cast once per long rest. Target becomes your zombie servant on death.' }], flaws: [{ name: 'Phylactery Required', description: 'You must create a phylactery within 1 year or become an undead NPC.' }], features: [{ name: 'Undying Patron', description: 'You no longer need to eat, drink, or breathe.' }] },
        ],
      },
      {
        id: 'lycanthrope', name: 'The Lycanthrope', description: 'The beast within awakens.',
        tiers: [
          { level: 3, boons: [{ name: 'Beast\'s Instinct', description: 'Advantage on Perception and Survival checks.' }, { name: 'Bite/Claw', description: 'Natural weapons: 1d6+Str piercing/slashing.' }], flaws: [{ name: 'Blood Rage', description: 'When reduced below half HP, must make DC 13 Wis save or attack nearest creature.' }], features: [{ name: 'Lycanthropic Transformation', description: 'You can shift into hybrid form. +1 Str while shifted.' }] },
          { level: 6, boons: [{ name: 'Pack Tactics', description: 'Advantage on attacks if an ally is within 5ft of target.' }], flaws: [{ name: 'Silver Vulnerability', description: 'Silver weapons deal maximum damage to you.' }], features: [{ name: 'Primal Fury', description: 'While shifted, resistance to nonmagical bludgeoning/piercing/slashing.' }] },
          { level: 10, boons: [{ name: 'Keen Senses', description: 'Blindsense 30ft while shifted.' }], flaws: [{ name: 'Feral Instinct', description: 'Disadvantage on Charisma checks outside combat.' }], features: [{ name: 'Beast\'s Endurance', description: 'While shifted, temp HP equal to your level at the start of each turn.' }] },
          { level: 14, boons: [{ name: 'Alpha\'s Presence', description: 'Allies within 30ft gain +1 to attack rolls.' }], flaws: [{ name: 'Losing Control', description: 'Each long rest, DC 15 Wis save or shift involuntarily for 1 minute.' }], features: [{ name: 'Apex Predator', description: 'Critical hits deal an extra die of damage while shifted.' }] },
        ],
      },
      {
        id: 'seraph', name: 'The Seraph', description: 'Celestial power transforms your being.',
        tiers: [
          { level: 3, boons: [{ name: 'Celestial Resilience', description: 'Resistance to radiant damage.' }, { name: 'Healing Touch', description: 'Touch: heal 2d8 + Cha. Twice per long rest.' }], flaws: [{ name: 'Blinding Light', description: 'You emit bright light in 10ft. No hiding in darkness.' }], features: [{ name: 'Seraphic Transformation', description: 'Gain faintly glowing wings (cosmetic). Charisma +1.' }] },
          { level: 6, boons: [{ name: 'Radiant Bolt', description: 'Ranged spell attack: 3d8 radiant, 120ft.' }], flaws: [{ name: 'Fiendish Disgust', description: 'Disadvantage on Charisma checks with fiends and undead.' }], features: [{ name: 'Wings of Light', description: 'Fly speed 30ft while not wearing heavy armor.' }] },
          { level: 10, boons: [{ name: 'Divine Ward', description: 'Reaction: impose disadvantage on an attack roll against an ally within 30ft.' }], flaws: [{ name: 'Celestial Pride', description: 'Disadvantage on checks when interacting with mortals of lower status.' }], features: [{ name: 'Seraph\'s Aegis', description: 'Once per short rest, when reduced to 0 HP, drop to 1 HP instead.' }] },
          { level: 14, boons: [{ name: 'Meteor Swarm', description: 'Cast once per long rest.' }], flaws: [{ name: 'Heaven\'s Demand', description: 'You receive visions and quests from your patron. Refusal imposes disadvantage on all rolls for 24 hours.' }], features: [{ name: 'Celestial Ascension', description: 'Fly speed 60ft. Immunity to radiant damage.' }] },
        ],
      },
      {
        id: 'vampire', name: 'Vampire', description: 'The vampire\'s curse takes hold.',
        tiers: [
          { level: 3, boons: [{ name: 'Vampiric Bite', description: '1d6+Con piercing + 1d6 necrotic. Regain HP equal to necrotic dealt.' }, { name: 'Spider Climb', description: 'Climb speed equal to walk speed.' }], flaws: [{ name: 'Sunlight Sensitivity', description: 'Disadvantage on attacks and Perception in direct sunlight.' }], features: [{ name: 'Vampiric Transformation', description: 'Fangs, pale skin, red eyes. Darkvision 60ft.' }] },
          { level: 6, boons: [{ name: 'Charm Gaze', description: 'DC 15 Wis save or charmed for 1 hour.' }], flaws: [{ name: 'Blood Hunger', description: 'Must feed on a creature\'s blood or gain 1 level of exhaustion each day.' }], features: [{ name: 'Misty Escape', description: 'When reduced to 0 HP, transform into bat form and fly 30ft. Once per long rest.' }] },
          { level: 10, boons: [{ name: 'Create Spawn', description: 'A creature slain by your bite rises as a vampire spawn under your control after 24 hours.' }], flaws: [{ name: 'Vulnerability to Running Water', description: 'Cannot cross running water willingly. Takes 5 acid damage per round in contact.' }], features: [{ name: 'Legendary Resistance', description: 'Once per long rest, automatically succeed on a failed save.' }] },
          { level: 14, boons: [{ name: 'Dominate Monster', description: 'Cast once per long rest. Target must be a humanoid you can see.' }], flaws: [{ name: 'Undeath\'s Grip', description: 'You no longer age but cannot benefit from benefits of youth or age-based features.' }], features: [{ name: 'Vampire Lord', description: 'Resistance to nonmagical bludgeoning/piercing/slashing. Shapechange into wolf or mist at will.' }] },
        ],
      },
      {
        id: 'fey', name: 'Fey', description: 'The Feywild\'s essence corrupts your mortal form.',
        tiers: [
          { level: 3, boons: [{ name: 'Fey Presence', description: '10ft aura: DC 13 Wis save or charmed/frightened for 1 round. Once per short rest.' }, { name: 'Minor Illusion', description: 'At will.' }], flaws: [{ name: 'Fey Whispers', description: 'You must tell the truth when asked a direct question.' }], features: [{ name: 'Fey Transformation', description: 'Ears become pointed, flowers grow in your hair. Gain proficiency in Deception or Persuasion.' }] },
          { level: 6, boons: [{ name: 'Misty Step', description: 'At will, 30ft.' }], flaws: [{ name: 'Unseelie Contract', description: 'If you break a promise, you take 3d6 psychic damage and gain disadvantage on all rolls for 24 hours.' }], features: [{ name: 'Fey Step', description: 'When you take the Dash action, you can teleport 10ft after each move.' }] },
          { level: 10, boons: [{ name: 'Compulsion', description: 'As the spell, 30ft radius, once per long rest.' }], flaws: [{ name: 'Lost in the Mist', description: 'Once per month, you are pulled into the Feywild for 1d4 hours.' }], features: [{ name: 'Fey Mastery', description: 'Invisible in natural settings (not magical darkness).' }] },
          { level: 14, boons: [{ name: 'Fey Lord\'s Banquet', description: 'Cast Mass Suggestion once per long rest.' }], flaws: [{ name: 'Seelie Debt', description: 'A fey lord considers you their property. They may call in favors at any time.' }], features: [{ name: 'Archfey Ascension', description: 'Fly speed 30ft. Cast Faerie Fire at will.' }] },
        ],
      },
      {
        id: 'primordial', name: 'Primordial', description: 'Elemental forces rewrite your being.',
        tiers: [
          { level: 3, boons: [{ name: 'Elemental Attunement', description: 'Choose one element: acid, cold, fire, or lightning. Resistance to that type.' }, { name: 'Elemental Strike', description: 'Unarmed strikes deal 1d6 of your chosen element.' }], flaws: [{ name: 'Elemental Instability', description: 'Disadvantage on Concentration checks.' }], features: [{ name: 'Primordial Transformation', description: 'Skin takes on elemental qualities (scales, bark, frost, etc.).' }] },
          { level: 6, boons: [{ name: 'Elemental Blast', description: '60ft line or 20ft sphere, 3d8 of your element, DC 15 save for half. Once per short rest.' }], flaws: [{ name: 'Opposing Element', description: 'You gain vulnerability to the element opposite yours (fire↔cold, acid↔lightning).' }], features: [{ name: 'Elemental Form', description: 'Bonus action: become immune to your element for 1 minute. Once per short rest.' }] },
          { level: 10, boons: [{ name: 'Elemental Wall', description: 'Create a wall of your element, 60ft long, 10ft high, 5ft thick. Once per long rest.' }], flaws: [{ name: 'Elemental Hunger', description: 'You must consume raw materials of your element daily or take 1d6 damage.' }], features: [{ name: 'Elemental Mastery', description: 'Your attacks count as magical for overcoming resistance.' }] },
          { level: 14, boons: [{ name: 'Elemental Storm', description: '120ft radius, 8d8 damage of your element, DC 17 save for half. Once per long rest.' }], flaws: [{ name: 'Primordial Bond', description: 'You are permanently attuned to your element. Extremes of the opposite element cause 1d4 damage per round.' }], features: [{ name: 'Elemental Ascension', description: 'Fly speed 60ft. Immune to your element type. Damage aura: 2d6 of your element to adjacent creatures at start of your turn.' }] },
        ],
      },
      {
        id: 'specter', name: 'Specter', description: 'The veil between life and death thins around you.',
        tiers: [
          { level: 3, boons: [{ name: 'Incorporeal Movement', description: 'Move through solid objects for 5ft per turn. 1 force damage if you end inside.' }, { name: 'Life Drain', description: 'Touch: 2d6 necrotic, regain HP equal to damage dealt.' }], flaws: [{ name: 'Ethereal Hunger', description: 'You must consume 1 soul per month or gain 1 level of exhaustion.' }], features: [{ name: 'Spectral Transformation', description: 'You appear ghostly pale. Darkvision 60ft, see invisible creatures within 10ft.' }] },
          { level: 6, boons: [{ name: 'Spectral Form', description: 'Bonus action: become invisible and gain fly speed equal to walk speed for 1 minute. Once per short rest.' }], flaws: [{ name: 'Unwelcome in Life', description: 'Living creatures are uneasy around you. Disadvantage on Persuasion.' }], features: [{ name: 'Ghostly Resilience', description: 'Resistance to necrotic and poison damage.' }] },
          { level: 10, boons: [{ name: 'Possession', description: 'Touch a humanoid: DC 15 Wis save or you possess them for 1 minute. Once per long rest.' }], flaws: [{ name: 'Fading Grip', description: 'You have disadvantage on Strength checks and saving throws.' }], features: [{ name: 'Astral Sight', description: 'See into the Ethereal Plane within 60ft at will.' }] },
          { level: 14, boons: [{ name: 'Soul Rend', description: 'Melee: 4d8 + Cha necrotic. Target must make DC 17 Con save or lose 1 max HP per level.' }], flaws: [{ name: 'Spirit\'s Price', description: 'Each use of your most powerful ability costs 1 point of exhaustion.' }], features: [{ name: 'Spectral Ascension', description: 'Permanently incorporeal. Fly 60ft. Immune to nonmagical damage.' }] },
        ],
      },
    ],
    activeTransformations: {},
  },
  isekai: {
    types: [
      { id: 'teleport', label: 'Teleported', description: 'You were physically transported from your original world. Your body and mind remain unchanged, but the transition has left you slightly altered.', bonuses: '+1 to any ability score, one skill proficiency of your choice' },
      { id: 'summoned', label: 'Summoned', description: 'A powerful being called you here as a servant, champion, or pawn. Some of their magic lingers in your soul.', bonuses: 'One cantrip from any class spell list, one 1st-level spell you can cast once per long rest' },
      { id: 'reincarnation', label: 'Reincarnated', description: 'Your soul was reborn into a new body in this world. You retain faint echoes of your past life.', bonuses: '+1 to any ability score, one additional language of your choice' },
      { id: 'divineDeal', label: "Divine Deal", description: 'A deity or cosmic force plucked you from your world for a purpose. Their blessing empowers you.', bonuses: '+1 Charisma, you can cast Bless once per long rest without a spell slot' },
    ],
  },
};

const STORAGE_KEY = 'campaign-config';

function storageKey(campaignId?: string) { return campaignKey(STORAGE_KEY, campaignId); }

export function loadCampaignConfig(campaignId?: string): CampaignConfig {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed as CampaignConfig;
    }
  } catch { }
  return {
    name: 'Default Campaign',
    enabledModules: [],
    moduleConfig: {},
    updatedAt: new Date().toISOString(),
  };
}

export function saveCampaignConfig(config: CampaignConfig, campaignId?: string): void {
  config.updatedAt = new Date().toISOString();
  localStorage.setItem(storageKey(campaignId), JSON.stringify(config));
}

export function clearCampaignConfig(campaignId?: string): void {
  localStorage.removeItem(storageKey(campaignId));
}

export function getModuleConfig<K extends ModuleId>(config: CampaignConfig, moduleId: K): ModuleConfigMap[K] {
  const defaults = MODULE_CONFIG_DEFAULTS[moduleId];
  const stored = config.moduleConfig[moduleId];
  if (!stored) return defaults;
  return { ...defaults, ...(stored as any) } as ModuleConfigMap[K];
}

export function updateModuleConfig<K extends ModuleId>(config: CampaignConfig, moduleId: K, partial: Partial<ModuleConfigMap[K]>): CampaignConfig {
  const defaults = MODULE_CONFIG_DEFAULTS[moduleId];
  const existing = config.moduleConfig[moduleId] || {};
  return {
    ...config,
    moduleConfig: {
      ...config.moduleConfig,
      [moduleId]: { ...defaults, ...existing, ...partial } as ModuleConfigMap[K],
    },
  };
}

export function getCampaignLinkCandidate(campaignName: string): { matched: boolean; config: CampaignConfig } {
  const config = loadCampaignConfig();
  return { matched: config.name === campaignName, config };
}
