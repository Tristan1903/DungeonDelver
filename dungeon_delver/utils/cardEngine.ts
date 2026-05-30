export interface CardEntry {
  id: string;
  name: string;
  type: 'spell' | 'deck-of-many-things';
  level?: number;
  gifPath?: string;
  pdfPaths: { path: string; label: string }[];
  spellName?: string;
}

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

function pascalToName(filename: string): string {
  if (FILENAME_OVERRIDES[filename]) return FILENAME_OVERRIDES[filename];
  const words = filename.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);
  const lower = new Set(['of', 'the', 'and', 'or', 'with', 'in', 'to', 'from', 'by', 'into', 'without']);
  return words.map((w, i) => i > 0 && lower.has(w.toLowerCase()) ? w.toLowerCase() : w).join(' ');
}

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
