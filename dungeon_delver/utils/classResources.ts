import { ClassResource } from '../lib/character';

export interface ResourceDef {
  key: string;
  label: string;
  shortLabel?: string;
  refreshOn: 'short' | 'long';
  maxAtLevel: (level: number, chaMod?: number, wisMod?: number) => number;
}

export interface FeaturePickDef {
  key: string;
  label: string;
  maxAtLevel: (level: number) => number;
  options?: string[];
  source: string;
}

export interface ClassResourceSet {
  resources: ResourceDef[];
  picks: FeaturePickDef[];
}

const buildRage = (): ResourceDef[] => [
  {
    key: 'rage',
    label: 'Rage',
    shortLabel: 'Rage',
    refreshOn: 'long',
    maxAtLevel: (lvl) => lvl >= 20 ? Infinity : [2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6][lvl - 1] || 2,
  },
];

const buildBardicInspiration = (): ResourceDef[] => [
  {
    key: 'bardicInspiration',
    label: 'Bardic Inspiration',
    shortLabel: 'BI',
    refreshOn: 'long',
    maxAtLevel: (lvl) => lvl >= 5 && lvl < 10 ? lvl + 1 : lvl >= 10 ? lvl + 2 : lvl + 1,
  },
];

const buildChannelDivinity = (): ResourceDef[] => [
  {
    key: 'channelDivinity',
    label: 'Channel Divinity',
    shortLabel: 'CD',
    refreshOn: 'short',
    maxAtLevel: (lvl) => lvl >= 18 ? 3 : lvl >= 6 ? 2 : 1,
  },
];

const buildWildShape = (): ResourceDef[] => [
  {
    key: 'wildShape',
    label: 'Wild Shape',
    shortLabel: 'Wild',
    refreshOn: 'short',
    maxAtLevel: (lvl) => lvl >= 20 ? Infinity : [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2][lvl - 1] || 2,
  },
];

const buildSecondWind = (): ResourceDef[] => [
  {
    key: 'secondWind',
    label: 'Second Wind',
    shortLabel: 'SW',
    refreshOn: 'short',
    maxAtLevel: () => 1,
  },
];

const buildActionSurge = (): ResourceDef[] => [
  {
    key: 'actionSurge',
    label: 'Action Surge',
    shortLabel: 'AS',
    refreshOn: 'short',
    maxAtLevel: (lvl) => lvl >= 17 ? 2 : 1,
  },
];

const buildKi = (): ResourceDef[] => [
  {
    key: 'ki',
    label: 'Ki Points',
    shortLabel: 'Ki',
    refreshOn: 'short',
    maxAtLevel: (lvl) => lvl,
  },
];

const buildLayOnHands = (): ResourceDef[] => [
  {
    key: 'layOnHands',
    label: 'Lay on Hands',
    shortLabel: 'LoH',
    refreshOn: 'long',
    maxAtLevel: (lvl) => lvl * 5,
  },
];

const buildSorceryPoints = (): ResourceDef[] => [
  {
    key: 'sorceryPoints',
    label: 'Sorcery Points',
    shortLabel: 'SP',
    refreshOn: 'long',
    maxAtLevel: (lvl) => lvl,
  },
];

const buildPactMagicSlots = (): ResourceDef[] => [
  {
    key: 'pactSlots',
    label: 'Pact Magic Slots',
    shortLabel: 'Pact',
    refreshOn: 'short',
    maxAtLevel: (lvl) => lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 2 ? 2 : 1,
  },
];

const buildArcaneRecovery = (): ResourceDef[] => [
  {
    key: 'arcaneRecovery',
    label: 'Arcane Recovery',
    shortLabel: 'AR',
    refreshOn: 'long',
    maxAtLevel: () => 1,
  },
];

export const CLASS_RESOURCES: Record<string, ClassResourceSet> = {
  Barbarian: { resources: buildRage(), picks: [] },
  Bard: { resources: buildBardicInspiration(), picks: [] },
  Cleric: { resources: buildChannelDivinity(), picks: [] },
  Druid: { resources: buildWildShape(), picks: [] },
  Fighter: { resources: [...buildSecondWind(), ...buildActionSurge()], picks: [
    {
      key: 'fightingStyle',
      label: 'Fighting Style',
      maxAtLevel: () => 1,
      options: [
        'Archery', 'Defense', 'Dueling', 'Great Weapon Fighting',
        'Protection', 'Two-Weapon Fighting', 'Blind Fighting', 'Interception',
        'Superior Technique', 'Thrown Weapon Fighting', 'Unarmed Fighting',
      ],
      source: 'Fighter',
    },
  ]},
  Monk: { resources: buildKi(), picks: [] },
  Paladin: { resources: [...buildLayOnHands(), ...buildChannelDivinity()], picks: [
    {
      key: 'fightingStyle',
      label: 'Fighting Style',
      maxAtLevel: () => 1,
      options: [
        'Archery', 'Defense', 'Dueling', 'Great Weapon Fighting',
        'Protection', 'Two-Weapon Fighting', 'Blind Fighting', 'Interception',
        'Superior Technique', 'Thrown Weapon Fighting', 'Unarmed Fighting',
      ],
      source: 'Paladin',
    },
  ]},
  Ranger: { resources: [], picks: [
    {
      key: 'fightingStyle',
      label: 'Fighting Style',
      maxAtLevel: () => 1,
      options: [
        'Archery', 'Defense', 'Dueling', 'Great Weapon Fighting',
        'Protection', 'Two-Weapon Fighting', 'Blind Fighting', 'Interception',
        'Superior Technique', 'Thrown Weapon Fighting', 'Unarmed Fighting',
      ],
      source: 'Ranger',
    },
  ]},
  Rogue: { resources: [], picks: [] },
  Sorcerer: { resources: buildSorceryPoints(), picks: [
    {
      key: 'metamagic',
      label: 'Metamagic',
      maxAtLevel: (lvl) => lvl >= 17 ? 4 : lvl >= 10 ? 3 : lvl >= 3 ? 2 : 0,
      options: [
        'Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell',
        'Heightened Spell', 'Quickened Spell', 'Seeking Spell', 'Subtle Spell',
        'Transmuted Spell', 'Twinned Spell',
      ],
      source: 'Sorcerer',
    },
  ]},
  Warlock: { resources: buildPactMagicSlots(), picks: [
    {
      key: 'invocations',
      label: 'Eldritch Invocations',
      maxAtLevel: (lvl) => lvl >= 12 ? 5 : lvl >= 7 ? 4 : lvl >= 5 ? 3 : lvl >= 2 ? 2 : 0,
      options: [
        'Agonizing Blast', 'Armor of Shadows', 'Ascendant Step', 'Beast Speech',
        'Beguiling Influence', 'Bewitching Whispers', 'Bond of the Talisman',
        'Chilling Blast', 'Cloak of Flies', 'Counteractive Channeling',
        'Death Ward', 'Devil\'s Sight', 'Discerning Gaze', 'Dreadful Word',
        'Eldritch Mind', 'Eldritch Sight', 'Eldritch Spear', 'Eldritch Smite',
        'Far Scribe', 'Fiendish Vigor', 'Gaze of Two Minds', 'Ghastly Blast',
        'Gift of the Depths', 'Gift of the Ever-Living Ones', 'Gift of the Protectors',
        'Grasp of Hadar', 'Improved Pact Weapon', 'Investment of the Chain Master',
        'Investment of the Stone', 'Lance of Lethargy', 'Lifedrinker',
        'Maddening Hex', 'Mask of Many Faces', 'Master of Myriad Forms',
        'Minions of Chaos', 'Mire the Mind', 'Misty Visions', 'One with Shadows',
        'Otherworldly Leap', 'Patient Hex', 'Pestilent Hex', 'Protector of the Talisman',
        'Rebuke of the Talisman', 'Relentless Hex', 'Repelling Blast', 'Sculptor of Flesh',
        'Sea Twin', 'Shroud of Shadow', 'Sign of Ill Omen', 'Thief of Five Fates',
        'Thirsting Blade', 'Touch of Death', 'Tomb of Levistus', 'Trickster\'s Escape',
        'Undying Servitude', 'Visions of Distant Realms', 'Voice of the Chain Master',
        'Whispers of the Grave', 'Witch Sight',
      ],
      source: 'Warlock',
    },
    {
      key: 'pactBoon',
      label: 'Pact Boon',
      maxAtLevel: (lvl) => lvl >= 3 ? 1 : 0,
      options: ['Pact of the Blade', 'Pact of the Chain', 'Pact of the Talisman', 'Pact of the Tome'],
      source: 'Warlock',
    },
  ]},
  Wizard: { resources: buildArcaneRecovery(), picks: [] },
  Artificer: { resources: [], picks: [
    {
      key: 'infusions',
      label: 'Infusions Known',
      maxAtLevel: (lvl) => lvl >= 18 ? 6 : lvl >= 14 ? 5 : lvl >= 10 ? 4 : lvl >= 6 ? 3 : lvl >= 2 ? 2 : 0,
      options: [
        'Enhanced Arcane Focus', 'Enhanced Armor', 'Enhanced Defense',
        'Enhanced Weapon', 'Bag of Holding', 'Boots of Elvenkind',
        'Boots of the Winding Path', 'Cloak of Elvenkind', 'Cloak of Protection',
        'Goggles of Night', 'Gloves of Swimming and Climbing', 'Gloves of Thievery',
        'Helm of Awareness', 'Lantern of Revealing', 'Mind Sharpener',
        'Radiant Weapon', 'Repeating Shot', 'Repulsion Shield',
        'Resistant Armor', 'Sending Stones', 'Spell-Refueling Ring',
        'Winged Boots', 'Arcane Propulsion Armor', 'Armor of Magical Strength',
        'Belt of Hill Giant Strength', 'Boots of Flying',
      ],
      source: 'Artificer',
    },
  ]},
};

export function getResourcesForClass(className: string): ResourceDef[] {
  return CLASS_RESOURCES[className]?.resources || [];
}

export function getPicksForClass(className: string): FeaturePickDef[] {
  return CLASS_RESOURCES[className]?.picks || [];
}

export function computeResources(className: string, level: number, chaMod = 0, wisMod = 0, prefixKey = true): Record<string, ClassResource> {
  const defs = getResourcesForClass(className);
  const result: Record<string, ClassResource> = {};
  const makeKey = (key: string) => prefixKey ? `${className}:${key}` : key;
  for (const d of defs) {
    const max = d.maxAtLevel(level, chaMod, wisMod);
    result[makeKey(d.key)] = { current: max, max, label: d.label, shortLabel: d.shortLabel, refreshOn: d.refreshOn };
  }
  return result;
}

export function computeAllResources(
  classLevels: { className: string; level: number }[],
  chaMod = 0,
  wisMod = 0
): Record<string, ClassResource> {
  const merged: Record<string, ClassResource> = {};
  for (const cl of classLevels) {
    const res = computeResources(cl.className, cl.level, chaMod, wisMod, true);
    Object.assign(merged, res);
  }
  return merged;
}

export function getAvailablePicks(className: string, level: number, existingPicks: string[]): FeaturePickDef[] {
  return getPicksForClass(className)
    .filter((p) => p.maxAtLevel(level) > 0)
    .map((p) => ({
      ...p,
      options: p.options?.filter((o) => !existingPicks.includes(o)),
    } as FeaturePickDef));
}
