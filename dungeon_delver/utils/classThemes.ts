// =============================================================================
// 📘 FILE: utils/classThemes.ts
// =============================================================================
// 🎯 PURPOSE: Defines visual themes for each class — colors, taglines, flavor
//    text, recommended gear, and pill labels. Used throughout the UI to give
//    each class a distinct visual identity.
//
// 🧠 REACT CONCEPT: Static Configuration Data
//    This is PURE DATA — no functions, no logic, no React. It's an object
//    (CLASS_THEMES) that maps class names to their visual config.
//
//    Components import CLASS_THEMES and use it like:
//      const theme = CLASS_THEMES[character.class];
//      <div style={{ borderColor: theme.color }}>...content</div>
//
// 💡 By separating theme data from component code, you can:
//    - Change the color scheme for a class in ONE place
//    - Add new classes just by adding an entry
//    - Let designers edit this file without touching component code
//
// 🔧 HOW TO ALTER:
//    - Change a class color: modify the `color` value (the hex)
//    - Change tagline: modify the `tagline` string
//    - Add a new class: add a new entry to CLASS_THEMES
//    - Change pills: modify the `pills` array
// =============================================================================

// 🧠 ClassTheme — Describes the visual identity of a class.
export interface ClassTheme {
  color: string;              // Main accent color (with transparency for backgrounds)
  tagline_color: string;      // Solid version for text
  tagline: string;            // One-line flavor description
  highlights: string[];       // Three key selling points
  gear: string[];             // Three recommended items
  pills: { short: string; full: string }[];  // Key stat/role labels (short + full versions)
}

// 🧠 CLASS_THEMES — The master theme registry.
//    Every supported class has an entry. Each entry is a complete visual theme.
//
//    🧠 The #XXXXXX7c hex codes include ALPHA (transparency).
//    7c in hex = 124 decimal = ~48% opacity.
//    This allows `color: theme.color` to give a semi-transparent background
//    and `borderColor: theme.tagline_color` for solid borders.
export const CLASS_THEMES: Record<string, ClassTheme> = {
  Artificer: {
    color: '#00a8967c',
    tagline_color: '#00dec7',
    tagline: 'A Master of Magical Invention and Artifice',
    highlights: ['Infuse mundane items with powerful magical properties.', 'Engineer incredible gadgets to aid in and out of combat.', 'Utilize specialized tools to craft a solution for any problem.'],
    gear: ["Tinker's Tools and a Smith's Hammer", 'Reinforced leather or scale armor', 'All-Purpose Tool'],
    pills: [{ short: 'Magical Inventor', full: 'Magical Inventor' }, { short: 'INT', full: 'Intelligence' }]
  },
  Barbarian: {
    color: '#eca6037c',
    tagline_color: '#eca603',
    tagline: 'A Fierce Warrior of Primal Rage',
    highlights: ['Storm with Rage and charge headlong into danger.', 'Channel primal forces to fuel uncanny reflexes.', 'Fight with reckless abandon.'],
    gear: ['A Greataxe, Greatsword, or Maul', 'Bare, lightweight clothing', 'Belt of Giant Strength'],
    pills: [{ short: 'Raging Warrior', full: 'Raging Warrior' }, { short: 'STR', full: 'Strength' }]
  },
  Bard: {
    color: '#c200c54d',
    tagline_color: '#c200c5',
    tagline: 'An Inspiring Performer of Music, Dance, and Magic',
    highlights: ['Weave magic and wonder through the arts.', 'Become a jack of all trades.', 'Perform spells that inspire and heal allies.'],
    gear: ['A Lute or other Musical Instrument', 'Stylish, often theatrical outfits', 'Instrument of the Bards'],
    pills: [{ short: 'Inspiring Performer', full: 'Inspiring Performer' }, { short: 'CHA', full: 'Charisma' }]
  },
  Cleric: {
    color: '#ffd12b79',
    tagline_color: '#ffd12b',
    tagline: 'A Miraculous Priest of Divine Power',
    highlights: ['Invoke divine magic to bolster people.', 'Channel divine energy to sear enemies.', 'Martial the power of gods to ward off Undead.'],
    gear: ['A Holy Symbol borne prominently', 'Cloth vestments worn over a Chain shirt', 'Necklace of Prayer Beads'],
    pills: [{ short: 'Divine Priest', full: 'Divine Priest' }, { short: 'WIS', full: 'Wisdom' }]
  },
  Druid: {
    color: '#abce2e6e',
    tagline_color: '#abce2e',
    tagline: 'A Nature Priest of Primal Power',
    highlights: ['Call on the forces of nature to heal allies.', 'Embody the wilds by shape-shifting.', 'Combat threats to the natural world.'],
    gear: ['A Druidic Focus and a Sickle', 'Organic clothing adorned with nature', 'Staff of the Woodlands'],
    pills: [{ short: 'WEAPONS MASTER', full: 'WEAPONS MASTER' }, { short: 'STR • DEX', full: 'STRENGTH • DEXTERITY' }]
  },
  Fighter: {
    color: '#c9750046',
    tagline_color: '#c97500',
    tagline: 'A Master of All Arms and Armor',
    highlights: ['Master weapons to be prepared for anything.', 'Push yourself beyond normal limits.', 'Rule the battlefield.'],
    gear: ['Weapons of all descriptions', 'Every type of armor and shield', 'Vorpal Sword'],
    pills: [{ short: 'Weapon Master', full: 'Weapon Master' }, { short: 'STR • DEX', full: 'Strength • Dexterity' }]
  },
  Monk: {
    color: '#00d1d188',
    tagline_color: '#00ffff',
    tagline: 'A Martial Artist of Supernatural Focus',
    highlights: ['Focus potential to create supernatural effects.', 'Channel uncanny speed to sidestep danger.', 'Turn yourself into a living weapon.'],
    gear: ['Shortswords, Spears, or Quarterstaffs', 'Loose, simple clothes', 'Wraps of Unarmed Power'],
    pills: [{ short: 'Martial Artist', full: 'Martial Artist' }, { short: 'DEX • WIS', full: 'Dexterity • Wisdom' }]
  },
  Paladin: {
    color: '#6d88889a',
    tagline_color: '#999999',
    tagline: 'A Devout Warrior of Sacred Oaths',
    highlights: ['Combine martial prowess and divine might.', 'Swear a sacred oath and abide by its tenets.', 'Wield divine power to heal the injured.'],
    gear: ['A Longsword and a Shield with a Holy Symbol', 'A suit of polished Plate Armor', 'Holy Avenger'],
    pills: [{ short: 'Devout Warrior', full: 'Devout Warrior' }, { short: 'STR • CHA', full: 'Strength • Charisma' }]
  },
  Ranger: {
    color: '#a0e95b71',
    tagline_color: '#a4ff50',
    tagline: 'A Wandering Warrior Imbued with Primal Magic',
    highlights: ['Weave together martial prowess and nature magic.', 'Deepen your connection to nature.', 'Track and slay your quarry like a predator.'],
    gear: ['A Scimitar, Shortsword, and a Longbow', 'A cloak camouflaged for the wilds', 'Bracers of Archery'],
    pills: [{ short: 'Primal Warrior', full: 'Primal Warrior' }, { short: 'DEX • WIS', full: 'Dexterity • Wisdom' }]
  },
  Rogue: {
    color: '#0c3ad35d',
    tagline_color: '#6b8dfd',
    tagline: 'A Dexterous Expert in Stealth and Subterfuge',
    highlights: ['Launch deadly Sneak Attacks.', 'Escape notice, disarm traps, and pick locks.', 'Manipulate strikes to inflict debilitating effects.'],
    gear: ['Daggers and Shortswords', 'A dark, hooded cloak', 'Ring of Invisibility'],
    pills: [{ short: 'Master Thief', full: 'Master Thief' }, { short: 'DEX', full: 'Dexterity' }]
  },
  Sorcerer: {
    color: '#fcc35375',
    tagline_color: '#ddab47',
    tagline: 'A Dazzling Mage Filled with Innate Magic',
    highlights: ['Alter your spells to suit your needs.', 'Attune to the origin of your innate magic.', 'Harness and channel raw, roiling power.'],
    gear: ["A Sorcerer's shard as a focus", 'Robe of the Archmagi', 'Staff of Power'],
    pills: [{ short: 'Innate Magic', full: 'Innate Magic' }, { short: 'CHA', full: 'Charisma' }]
  },
  Warlock: {
    color: '#fc2f1962',
    tagline_color: '#a71504',
    tagline: 'An Occultist Empowered by Otherworldly Pacts',
    highlights: ['Form a pact with a mysterious entity.', 'Uncover eldritch truths for supernatural abilities.', 'Deepen your occult connection for greater power.'],
    gear: ['Leather Armor and a Sickle', 'Occult attire and tomes', 'Rod of the Pact Keeper'],
    pills: [{ short: 'Otherworldly Patron', full: 'Otherworldly Patron' }, { short: 'CHA', full: 'Charisma' }]
  },
  Wizard: {
    color: '#8228e96e',
    tagline_color: '#8431e4',
    tagline: 'A Scholarly Magic-User of Arcane Power',
    highlights: ['Pursue arcane magic with scholastic fervor.', 'Cast spells of explosive fire and lightning.', 'Become capable of manipulating reality.'],
    gear: ['Their personal spellbook & Spell Scrolls', 'An ornate, arcane Robe', 'Ring of Spell Storing'],
    pills: [{ short: 'Arcane Scholar', full: 'Arcane Scholar' }, { short: 'INT', full: 'Intelligence' }]
  },
  BloodHunter: {
    color: '#8a03037c',
    tagline_color: '#af0404',
    tagline: 'A Grim Hunter Bound by Blood Magic',
    highlights: ['Sacrifice your own vitality to empower your blades.', 'Wield hemocraft to manipulate the life force of foes.', 'Track and slay the most terrifying monsters.'],
    gear: ['A set of Alchemist\'s Supplies', 'Dark, blood-stained leather armor', 'Order of the Ghostslayer Medallion'],
    pills: [{ short: 'Hemocraft Warrior', full: 'Hemocraft Warrior' }, { short: 'DEX • INT', full: 'Dexterity • Intelligence' }]
  },
  MonsterHunter: {
    color: '#4b53207c',
    tagline_color: '#6b8e23',
    tagline: 'A Calculated Tracker of Extraordinary Beasts',
    highlights: ['Study your prey to exploit their hidden weaknesses.', 'Utilize specialized tools and traps for every encounter.', 'Survive the most hostile environments.'],
    gear: ['A Heavy Crossbow or Hunting Trap', 'A cloak made of monster hide', 'Hunter\'s Toolkit'],
    pills: [{ short: 'Slayer Expert', full: 'Slayer Expert' }, { short: 'STR • WIS', full: 'Strength • Wisdom' }]
  },
  Illrigger: {
    color: '#3d01019d',
    tagline_color: '#ff4500',
    tagline: 'A Diabolical Knight of the Hells',
    highlights: ['Place Infernal Seals to curse your enemies.', 'Command the battlefield with tactical authority.', 'Invoke the dark power of the Archdukes.'],
    gear: ['A Forked Blade or Greatsword', 'Plate armor etched with infernal runes', 'Cape of the Mountebank'],
    pills: [{ short: 'Infernal Knight', full: 'Infernal Knight' }, { short: 'STR • CHA', full: 'Strength • Charisma' }]
  },
  Mystic: {
    color: '#e1a6ff6e',
    tagline_color: '#df87ff',
    tagline: 'A Psionic Savant of Mind and Matter',
    highlights: ['Manifest psionic disciplines to alter reality.', 'Transcend physical limits through mental focus.', 'Wield the power of the ego as a weapon.'],
    gear: ['A simple crystal or psychic focus', 'Unassuming, scholar-like robes', 'Ring of Mind Shielding'],
    pills: [{ short: 'Psionic Master', full: 'Psionic Master' }, { short: 'INT', full: 'Intelligence' }]
  },
  Pugilist: {
    color: '#8b45137c',
    tagline_color: '#cd853f',
    tagline: 'A Hard-Hitting Scrapper with Pure Grit',
    highlights: ['Absorb punishing blows using Moxie.', 'Unleash a flurry of haymakers and headbutts.', 'Fight dirty to gain the upper hand.'],
    gear: ['Leather Handwraps', 'A sturdy, travel-worn duster', 'A flask of "Liquid Courage"'],
    pills: [{ short: 'Grit Brawler', full: 'Grit Brawler' }, { short: 'STR • CON', full: 'Strength • Constitution' }]
  }
};
