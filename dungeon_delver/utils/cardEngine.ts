// =============================================================================
// 📘 FILE: utils/cardEngine.ts
// =============================================================================
// 🎯 PURPOSE: Spell card and Deck of Many Things card system. Maps animated
//    GIF files and printable PDFs to spell/deck entries. Provides fuzzy
//    name matching (pascalCase → readable names), filtering, and GIF path
//    lookup with caching.
//
// 🧠 REACT CONCEPT: Derived Data with Caching
//    getAllCards() builds the full card list from hardcoded file lists —
//    this is "derived data" computed once. getSpellGifPath uses an
//    in-memory cache (`_gifCache`) so repeated lookups don't rebuild the
//    entire card list. This is a manual caching pattern similar to
//    useMemo in React — compute once, reuse until dependencies change.
//
//    getFilteredCards is a "selector" — it takes raw data + filters and
//    returns a subset. In React terms: const visible = useMemo(
//      () => getFilteredCards(cards, filters), [cards, filters]
//    );
//
// 🔧 HOW TO ALTER:
//    - Add new spell GIFs: add file names to SPELL_GIFS arrays
//    - Add new card PDFs: add paths to the PDF lists in getAllCards
//    - Add name overrides: add entries to FILENAME_OVERRIDES
//    - Add Deck of Many Things cards: add names to THINGS_GIFS
//    - Change pascal case conversion: modify pascalToName
// =============================================================================

export interface CardEntry {
  id: string;
  name: string;
  type: 'spell' | 'deck-of-many-things';
  level?: number;
  gifPath?: string;
  pdfPaths: { path: string; label: string }[];
  spellName?: string;
}

// 🧠 FILENAME_OVERRIDES: fixes names that don't convert well from PascalCase.
//    "AcidArrow" → "Melf's Acid Arrow", "FloatingDisk" → "Tenser's Floating Disk"
const FILENAME_OVERRIDES: Record<string, string> = {
  'AcidArrow': "Melf's Acid Arrow",
  'AnimalMessenger': 'Animal Messenger',
  'ArcanistMagicAura': "Arcanist's Magic Aura",
  'BeaconofHope': 'Beacon of Hope',
  'BestowCurse': 'Bestow Curse',
  'BlindenessDeafness': 'Blindness/Deafness',
  'BrandingSmite': 'Branding Smite',
  'CalmEmotions': 'Calm Emotions',
  'CallLightning': 'Call Lightning',
  'Chilltouch': 'Chill Touch',
  'Clairvoyance': 'Clairvoyance',
  'ConjureAnimals': 'Conjure Animals',
  'ContinualFlame': 'Continual Flame',
  'CreateFoodandWater': 'Create Food and Water',
  'CreateOrDestroyWater': 'Create or Destroy Water',
  'DispelMagic': 'Dispel Magic',
  'Eldritchblast': 'Eldritch Blast',
  'EnhanceAbility': 'Enhance Ability',
  'EnlargeReduce': 'Enlarge/Reduce',
  'Enthrall': 'Enthrall',
  'FindSteed': 'Find Steed',
  'FlamingSphere': 'Flaming Sphere',
  'FloatingDisk': "Tenser's Floating Disk",
  'GaseousForm': 'Gaseous Form',
  'GoodBerry': 'Goodberry',
  'GlyphofWarding1': 'Glyph of Warding',
  'GlyphofWarding2': 'Glyph of Warding',
  'GuidingBolt': 'Guiding Bolt',
  'GustofWind': 'Gust of Wind',
  'HeatMetal': 'Heat Metal',
  'HellishRebuke': 'Hellish Rebuke',
  'HideousLaughter': "Tasha's Hideous Laughter",
  'HoldPerson': 'Hold Person',
  'HunterMark': "Hunter's Mark",
  'HypnoticPattern': 'Hypnotic Pattern',
  'LesserRestoration': 'Lesser Restoration',
  'LightningBolt': 'Lightning Bolt',
  'LongStrider': 'Longstrider',
  'LocateAnimalsOrPlants': 'Locate Animals or Plants',
  'LocateObject': 'Locate Object',
  'MagicCircle': 'Magic Circle',
  'MagicMouth': 'Magic Mouth',
  'MajorImage': 'Major Image',
  'MassHealingWord': 'Mass Healing Word',
  'MeldIntoStone': 'Meld into Stone',
  'MirrorImage': 'Mirror Image',
  'MistyStep': 'Misty Step',
  'Moonbeam': 'Moonbeam',
  'NonDetection': 'Nondetection',
  'PassWithoutTrace': 'Pass without Trace',
  'PhantomSteed': 'Phantom Steed',
  'PlantGrowth': 'Plant Growth',
  'PrayerofHealing': 'Prayer of Healing',
  'ProtectionFromEnergy': 'Protection from Energy',
  'ProtectionFromEvilandGood': 'Protection from Evil and Good',
  'ProtectionFromPosion': 'Protection from Poison',
  'PurifyFoodandDrink': 'Purify Food and Drink',
  'RayofEnfeeblement': 'Ray of Enfeeblement',
  'RayofFrost': 'Ray of Frost',
  'RemoveCurse': 'Remove Curse',
  'Revivfy': 'Revivify',
  'RopeTrick': 'Rope Trick',
  'ScaredFlame': 'Sacred Flame',
  'ScorchingRay': 'Scorching Ray',
  'SeeInvisibility': 'See Invisibility',
  'ShieldofFaith': 'Shield of Faith',
  'SleetStorm': 'Sleet Storm',
  'Sparethedying': 'Spare the Dying',
  'SpeakwithAnimals': 'Speak with Animals',
  'SpeakwithDead': 'Speak with Dead',
  'SpeakwithPlants': 'Speak with Plants',
  'SpiderClimb': 'Spider Climb',
  'SpikeGrowth': 'Spike Growth',
  'SpiritGuardians': 'Spirit Guardians',
  'SpiritualWeapon': 'Spiritual Weapon',
  'StinkingCloud': 'Stinking Cloud',
  'TinyHut': "Leomund's Tiny Hut",
  'VampiricTouch': 'Vampiric Touch',
  'WardingBond': 'Warding Bond',
  'WaterBreathing': 'Water Breathing',
  'WaterWalk': 'Water Walk',
  'WindWall': 'Wind Wall',
  'ZoneofTruth': 'Zone of Truth',
};

const BASE = '/data/cards';

const SPELL_LEVELS: { dir: string; level: number; gifSubdir: string }[] = [
  { dir: 'Animated Spells - Cantrips', level: 0, gifSubdir: 'Cantrips Gifs' },
  { dir: 'Animated Spells - Level 1', level: 1, gifSubdir: 'Level 1 Gifs' },
  { dir: 'Animated Spells - Level 2', level: 2, gifSubdir: 'Level 2 Spells' },
  { dir: 'Animated Spells - Level 3', level: 3, gifSubdir: 'Level 3 Gifs' },
];

interface GifFile { name: string; path: string; }

// 🧠 SPELL_GIFS: the actual lists of spell names with their GIF file paths.
//    Organized by level directory for easy maintenance.
const SPELL_GIFS: Record<string, GifFile[]> = {
  'Animated Spells - Cantrips': [
    'AcidSplash', 'Chilltouch', 'DancingLights', 'Druidcraft', 'Eldritchblast',
    'FireBolt', 'Guidance', 'Light', 'MageHand', 'Mending', 'Message',
    'MinorIllusion', 'PoisonSpray', 'Prestidigitation', 'ProduceFlame', 'RayofFrost',
    'Resistance', 'ScaredFlame', 'Shillelagh', 'ShockingGrasp', 'Sparethedying',
    'Thaumaturgy', 'TrueStrike', 'ViciousMockery',
  ].map(n => ({ name: n, path: `${BASE}/Animated Spells - Cantrips/Cantrips Gifs/${n}.gif` })),
  'Animated Spells - Level 1': [
    'Alarm', 'AnimalFriendship', 'Bane', 'Bless', 'BurningHands', 'CharmPerson',
    'ColorSpray', 'Command', 'ComprehendLanguages', 'CreateOrDestroyWater', 'CureWounds',
    'DetectEvilAndGood', 'DetectMagic', 'DisguiseSelf', 'FindFamiliar', 'FloatingDisk',
    'FogCloud', 'GoodBerry', 'Grease', 'GuidingBolt', 'HealingWord', 'HellishRebuke',
    'Heroism', 'HideousLaughter', 'HunterMark', 'Identify', 'IllusoryScript',
    'InflictWounds', 'Jump', 'LongStrider', 'MageArmor', 'MagicMissile',
    'ProtectionFromEvilandGood', 'PurifyFoodandDrink', 'Sanctuary', 'Shield',
    'ShieldofFaith', 'SilentImage', 'Sleep', 'SpeakwithAnimals', 'Thunderwave',
    'UnseenServant',
  ].map(n => ({ name: n, path: `${BASE}/Animated Spells - Level 1/Level 1 Gifs/${n}.gif` })),
  'Animated Spells - Level 2': [
    'AcidArrow', 'Aid', 'AlterSelf', 'AnimalMessenger', 'ArcaneLock',
    'ArcanistMagicAura', 'Augury', 'Barkskin', 'BlindenessDeafness', 'Blur',
    'BrandingSmite', 'CalmEmotions', 'ContinualFlame', 'Darkness', 'Darkvision',
    'DetectThoughts', 'EnhanceAbility', 'EnlargeReduce', 'Enthrall', 'FindSteed',
    'FindTraps', 'FlameBlade', 'FlamingSphere', 'GentleRepose', 'GustofWind',
    'HeatMetal', 'HoldPerson', 'Invisibility', 'Knock', 'LesserRestoration',
    'Levitate', 'LocateAnimalsOrPlants', 'LocateObject', 'MagicMouth', 'MagicWeapon',
    'MirrorImage', 'MistyStep', 'Moonbeam', 'PassWithoutTrace', 'PrayerofHealing',
    'ProtectionFromPosion', 'RayofEnfeeblement', 'RopeTrick', 'ScorchingRay',
    'SeeInvisibility', 'Shatter', 'Silence', 'SpiderClimb', 'SpikeGrowth',
    'SpiritualWeapon', 'Suggestion', 'WardingBond', 'Web', 'ZoneofTruth',
  ].map(n => ({ name: n, path: `${BASE}/Animated Spells - Level 2/Level 2 Spells/${n}.gif` })),
  'Animated Spells - Level 3': [
    'AnimateDead', 'BeaconofHope', 'BestowCurse', 'Blink', 'CallLightning',
    'Clairvoyance', 'ConjureAnimals', 'Counterspell', 'CreateFoodandWater', 'Daylight',
    'DispelMagic', 'Fear', 'Fireball', 'Fly', 'GaseousForm', 'GlyphofWarding1',
    'GlyphofWarding2', 'Haste', 'HypnoticPattern', 'LightningBolt', 'MagicCircle',
    'MajorImage', 'MassHealingWord', 'MeldIntoStone', 'NonDetection', 'PhantomSteed',
    'PlantGrowth', 'ProtectionFromEnergy', 'RemoveCurse', 'Revivfy', 'Sending',
    'SleetStorm', 'Slow', 'SpeakwithDead', 'SpeakwithPlants', 'SpiritGuardians',
    'StinkingCloud', 'TinyHut', 'Tongues', 'VampiricTouch', 'WaterBreathing',
    'WaterWalk', 'WindWall',
  ].map(n => ({ name: n, path: `${BASE}/Animated Spells - Level 3/Level 3 Gifs/${n}.gif` })),
};

const THINGS_GIFS: GifFile[] = [
  'Balance', 'Comet', 'Death', 'Donjon', 'Euryale', 'Fates', 'Flames', 'Fool',
  'Gem', 'Idiot', 'Jester', 'Key', 'Knight', 'Moon', 'Rogue', 'Ruin', 'Skull',
  'Star', 'Sun', 'Talons', 'Throne', 'Vizier', 'Void',
].map(n => ({
  name: n,
  path: `${BASE}/Animated Cards- Deck of Many Things/TheDeckofManyAnimatedThings/Things Gifs/${n}.gif`,
}));

// 🧠 pascalToName: converts a PascalCase filename to a human-readable name.
//    "AcidArrow" → "Acid Arrow", "GlyphofWarding1" → "Glyph of Warding"
//    Uses regex lookahead/lookbehind to split at case boundaries,
//    then lowercases known short words (of, the, and, etc.).
function pascalToName(filename: string): string {
  if (FILENAME_OVERRIDES[filename]) return FILENAME_OVERRIDES[filename];
  const words = filename.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);
  const lower = new Set(['of', 'the', 'and', 'or', 'with', 'in', 'to', 'from', 'by', 'into', 'without']);
  return words.map((w, i) => i > 0 && lower.has(w.toLowerCase()) ? w.toLowerCase() : w).join(' ');
}

// 🧠 getAllCards: builds the complete card list from all GIFs + PDFs.
//    Called once on mount or when the card browser opens.
//    Returns flat array of CardEntry objects.
export function getAllCards(): CardEntry[] {
  const cards: CardEntry[] = [];

  for (const level of SPELL_LEVELS) {
    const gifs = SPELL_GIFS[level.dir] || [];
    const pdfs: { path: string; label: string }[] = [];

    if (level.dir === 'Animated Spells - Cantrips') {
      pdfs.push({ path: `${BASE}/${level.dir}/tdomAnimatedSpells-Cantrips-PNPV0.2.pdf`, label: 'All Cantrips' });
    } else if (level.dir === 'Animated Spells - Level 1') {
      pdfs.push({ path: `${BASE}/${level.dir}/Level 1 Printables/tdomAnimatedSpells-level1vol1-PNP.pdf`, label: 'Vol 1' });
      pdfs.push({ path: `${BASE}/${level.dir}/Level 1 Printables/tdomAnimatedSpells-level1vol2-PNP.pdf`, label: 'Vol 2' });
    } else if (level.dir === 'Animated Spells - Level 2') {
      pdfs.push({ path: `${BASE}/${level.dir}/tdomAnimatedSpells-level2vol1-PNP.pdf`, label: 'Vol 1' });
      pdfs.push({ path: `${BASE}/${level.dir}/tdomAnimatedSpells-level2vol2-PNP.pdf`, label: 'Vol 2' });
    } else if (level.dir === 'Animated Spells - Level 3') {
      pdfs.push({ path: `${BASE}/${level.dir}/tdomAnimatedSpells-level3vol1-PNP.pdf`, label: 'Vol 1' });
      pdfs.push({ path: `${BASE}/${level.dir}/tdomAnimatedSpells-level3vol2-PNP.pdf`, label: 'Vol 2' });
    }

    for (const gif of gifs) {
      const displayName = pascalToName(gif.name);
      cards.push({
        id: `spell-${level.level}-${gif.name}`,
        name: displayName,
        type: 'spell',
        level: level.level,
        gifPath: gif.path,
        pdfPaths: pdfs,
        spellName: displayName,
      });
    }
  }

  const thingPdfs = [
    { path: `${BASE}/Animated Cards- Deck of Many Things/TheDeckofManyAnimatedThings/RuleBooklet-PNP.pdf`, label: 'Rule Booklet' },
    { path: `${BASE}/Animated Cards- Deck of Many Things/TheDeckofManyAnimatedThings/tdomAnimatedSpells-Things-PNP.pdf`, label: 'Deck Cards' },
  ];

  for (const gif of THINGS_GIFS) {
    cards.push({
      id: `deck-${gif.name}`,
      name: gif.name,
      type: 'deck-of-many-things',
      gifPath: gif.path,
      pdfPaths: thingPdfs,
    });
  }

  return cards;
}

let _gifCache: Map<string, string> | null = null;

// 🧠 getSpellGifPath: looks up a GIF path by spell name (case-insensitive).
//    Uses a lazy-built cache — built on first call, reused thereafter.
//    Returns undefined if no GIF exists for the given spell name.
export function getSpellGifPath(spellName: string): string | undefined {
  if (!_gifCache) {
    _gifCache = new Map();
    for (const card of getAllCards()) {
      if (card.gifPath) {
        _gifCache.set(card.name.toLowerCase(), card.gifPath);
      }
    }
  }
  return _gifCache.get(spellName.toLowerCase());
}

// 🧠 getFilteredCards: a "selector" function that filters cards by type,
//    level, and text query. Returns a new array (doesn't mutate the original).
export function getFilteredCards(
  cards: CardEntry[],
  filters: { type?: 'spell' | 'deck-of-many-things'; level?: number; query?: string }
): CardEntry[] {
  let filtered = cards;
  if (filters.type) {
    filtered = filtered.filter(c => c.type === filters.type);
  }
  if (filters.level !== undefined) {
    filtered = filtered.filter(c => c.level === filters.level);
  }
  if (filters.query?.trim()) {
    const q = filters.query.toLowerCase();
    filtered = filtered.filter(c => c.name.toLowerCase().includes(q));
  }
  return filtered;
}
