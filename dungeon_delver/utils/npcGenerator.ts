// =============================================================================
// 📘 FILE: utils/npcGenerator.ts
// =============================================================================
// 🎯 PURPOSE: Generates random NPCs (non-player characters) for the DM.
//    Provides name tables by species, stat templates (Commoner, Guard, Mage,
//    etc.), personality traits, ideals, bonds, flaws, and physical appearance
//    descriptions. Also includes CRUD for saving/loading generated NPCs.
//
// 🧠 REACT CONCEPT: Data + Pure Functions
//    This file is mostly DATA (name arrays, template objects, trait lists)
//    and PURE FUNCTIONS (generateNPC, pick, rollHp) that take input and
//    return output without side effects. The only side-effect functions
//    (loadSavedNPCs, saveNPC, deleteSavedNPC) touch localStorage.
//
//    Separating data from side effects makes the pure parts easy to test
//    and reuse. The save/load functions are only called by components
//    when the user explicitly requests persistence.
//
// 🔧 HOW TO ALTER:
//    - Add a new species: add an entry to NAMES with male/female/surnames
//    - Add a stat template: add to STAT_TEMPLATES
//    - Add traits: add strings to PERSONALITY_TRAITS, IDEALS, BONDS, FLAWS
//    - Change generation logic: modify generateNPC
// =============================================================================

export interface GeneratedNPC {
  id: string;
  name: string;
  species: string;
  gender: string;
  template: string;
  age: string;
  stats: Record<string, number>;
  ac: number;
  hp: number;
  maxHp: number;
  speed: number;
  personality: string[];
  ideal: string;
  bond: string;
  flaw: string;
  notes: string;
  appearance: string;
  profession: string;
}

export interface StatTemplate {
  name: string;
  stats: Record<string, number>;
  ac: number;
  hp: string;
  speed: number;
  profBonus: number;
  skills: string[];
  attacks: string[];
  notes?: string;
}

// 🧠 NAMES: a big lookup table keyed by species. Each entry has male names,
//    female names, and surnames. Used by generateNPC to pick random names.
//    This is "static data" — it never changes at runtime.
const NAMES: Record<string, { male: string[]; female: string[]; surnames: string[] }> = {
  human: {
    male: ['Aldric','Bael','Cedric','Doran','Edric','Finn','Gareth','Hale','Ivar','Jace','Kael','Leoric','Merek','Nash','Orin','Peregrin','Quinn','Roderic','Soren','Theron','Ulric','Vance','Willem','Xander','Yorick','Zane'],
    female: ['Anya','Briar','Celeste','Dahlia','Elara','Fiona','Gwen','Hazel','Iris','Jessamine','Kara','Liana','Mira','Nadia','Olwen','Petra','Rose','Seraphina','Tessa','Una','Violet','Wren','Xanthe','Yvaine','Zara'],
    surnames: ['Ashford','Blackwood','Crowley','Draven','Eldridge','Fairchild','Grey','Hawthorne','Irons','Kingsley','Lancaster','Morrow','Nightingale','Oakley','Pendleton','Ravenscroft','Sterling','Thornwood','Underwood','Vane','Wainwright','Westbrook'],
  },
  elf: {
    male: ['Aelar','Caeldrim','Elrohir','Faelan','Gaelen','Ithil','Kaelen','Laeron','Mithros','Nimlos','Orophin','Rivinar','Saeldir','Thalandir','Valandil'],
    female: ['Adrie','Bethrynna','Caelynn','Elara','Faeryl','Ilyana','Laeroniel','Mirabelle','Nimue','Ondrielle','Riel','Selena','Thalia','Viviel','Ysolde'],
    surnames: ['Amakiir','Caerdonel','Dalanthan','Holimion','Ilphelkiir','Liadon','Meliamne','Naïlo','Siannodel','Xiloscient'],
  },
  dwarf: {
    male: ['Adrik','Baern','Dain','Eberk','Fargrim','Gimli','Harbek','Kildrak','Morgran','Orsik','Osk','Rurik','Taklinn','Thoradin','Ulfgar'],
    female: ['Amber','Bardryn','Dagnal','Elde','Falka','Gunnloda','Helja','Kathra','Kristryd','Mardred','Riswynn','Torbera','Vistra'],
    surnames: ['Balderk','Battlehammer','Copperhearth','Deepforge','Fireforge','Frostbeard','Gorunn','Holderhek','Ironfist','Loderr','Strakeln','Torunn','Ungart'],
  },
  halfling: {
    male: ['Alton','Ander','Cade','Corrin','Eldon','Finnan','Garret','Lyle','Milo','Osborn','Perrin','Reed','Roscoe','Wellby'],
    female: ['Andry','Bree','Callie','Cora','Euphemia','Jillian','Kithri','Lavinia','Lidda','Merla','Nedda','Paela','Seraphina','Verna'],
    surnames: ['Brushgather','Goodbarrel','Greenbottle','High-hill','Hilltopple','Leagallow','Tealeaf','Thorngage','Tosscobble','Underbough'],
  },
  orc: {
    male: ['Dench','Feng','Gell','Henk','Holg','Imsh','Keth','Krusk','Mhurren','Ront','Shump','Thokk','Urth'],
    female: ['Baggi','Emen','Engong','Kansif','Myev','Neega','Ovak','Ownka','Shautha','Sutha','Vola','Volen','Yevelda'],
    surnames: ['Brokenbone','Gutstab','Redfang','Rottingeye','Skullcleaver','War-hammer'],
  },
  tiefling: {
    male: ['Akmenos','Amnon','Barakas','Damakos','Ekemon','Iados','Kairon','Leucis','Melech','Morthos','Pelaios','Skamos','Therai'],
    female: ['Akta','Anakis','Bryseis','Damaia','Ea','Kallista','Lerissa','Makaria','Nemeia','Orianna','Phelaia','Rieta'],
    surnames: ['Artorius','Cassiander','Donovan','Esris','Gargauth','Hawthorn','Kryx','Lansblood','Mormegil','Némesis','Nox','Vrago'],
  },
  dragonborn: {
    male: ['Arjhan','Balasar','Bharash','Donaar','Ghesh','Heskan','Kriv','Medrash','Mehen','Nadarr','Pandjed','Patrin','Rhogar','Shamash','Shedinn','Torinn'],
    female: ['Akra','Biri','Daar','Farideh','Harann','Jheri','Kava','Korinn','Mishann','Nala','Perra','Raiann','Sora','Surina','Thava','Uadjit'],
    surnames: ['Clethtinthiallor','Daardendrian','Delmirev','Drachedandion','Fenkenkabradon','Kepeshkmolik','Kerrhylon','Kimbatuul','Linxakasendalor','Myastan','Nemmonis','Norixius','Ophinshtalajiir','Prexijandilin','Shestendeliath','Turnuroth','Verthisathurgiesh','Yarjerit'],
  },
  gnome: {
    male: ['Alston','Alvyn','Boddynock','Brocc','Eldon','Erky','Fonkin','Frug','Geri','Glim','Jebeddo','Kellen','Namfoodle','Orryn','Roondar','Seebo','Sindri','Warryn','Wrenn','Zook'],
    female: ['Bimpnottin','Breena','Caramip','Carlin','Donella','Duvamil','Ella','Ellyjobell','Ellywick','Lilli','Loopmottin','Lorilla','Mardnab','Nissa','Nyx','Oda','Orla','Roywyn','Shamil','Waywocket'],
    surnames: ['Beren','Daergel','Folkor','Garrick','Nackle','Murnig','Ningel','Raulnor','Scheppen','Turen'],
  },
};

const PERSONALITY_TRAITS = [
  'I am always calm, no matter what the situation.',
  'I am haunted by memories of war.',
  'I am a hopeless romantic, always searching for my true love.',
  'I judge people by their actions, not their words.',
  'I am incredibly slow to trust.',
  'I fall in and out of love frequently.',
  'I have a crude sense of humor.',
  'I am working on a grand artistic project.',
  'I am obsessed with keeping a daily journal.',
  'I speak loudly and bluntly, with little regard for social graces.',
  'I am gracious and compliment everyone I meet.',
  'I am horribly, painfully awkward in social situations.',
  'I have a strong sense of duty and honor.',
  'I am cynical and assume the worst in people.',
  'I love a good drink and a good story.',
  'I am always polite and well-spoken.',
  'I mispronounce or forget common words.',
  'I am fiercely independent.',
  'I am a collector of oddities and trinkets.',
  'I am deeply superstitious.',
];

const IDEALS = [
  'Community. It is our duty to protect and provide for our community. (Lawful)',
  'Fairness. No one should be above the law. (Lawful)',
  'Freedom. People should be free to live as they choose. (Chaotic)',
  'Greed. I will do whatever it takes to get what I want. (Evil)',
  'Honor. My word is my bond. (Lawful)',
  'Justice. The innocent shall not suffer for the guilty. (Good)',
  'Knowledge. The truth is worth any price. (Neutral)',
  'Might. The strong rule, the weak serve. (Evil)',
  'Nation. My country is all that matters. (Lawful)',
  'People. I serve the common folk. (Good)',
  'Power. I seek to increase my own power. (Evil)',
  'Redemption. Everyone deserves a second chance. (Good)',
  'Self-Improvement. I am always trying to be better. (Neutral)',
  'Tradition. The old ways must be preserved. (Lawful)',
  'Creativity. Art and music are what make life worth living. (Chaotic)',
];

const BONDS = [
  'I would die for my family.',
  'My mentor means everything to me.',
  'I owe a debt I can never fully repay.',
  'I will protect my hometown at any cost.',
  'I am searching for my long-lost sibling.',
  'A companion saved my life — I will never abandon them.',
  'I carry a keepsake from someone I lost.',
  'My faith is the most important thing in my life.',
  'I belong to a guild or order that I am loyal to.',
  'I have a rival I must prove myself against.',
  'I am trying to clear my family\'s tarnished name.',
  'I am the last of my line — I must honor my ancestors.',
];

const FLAWS = [
  'I am quick to anger.',
  'I have a weakness for gambling.',
  'I am easily intimidated.',
  'I drink to forget my troubles.',
  'I am a terrible liar.',
  'I am secretly a coward.',
  'I hold grudges forever.',
  'I am easily distracted by flashy things.',
  'I am hopelessly naive.',
  'I refuse to back down from any challenge.',
  'I am deeply suspicious of magic.',
  'I am overly competitive.',
  'I cannot resist a pretty face.',
  'I am terrified of failure.',
  'I am always late.',
];

// 🧠 STAT_TEMPLATES: predefined NPC stat blocks. Each template has fixed
//    ability scores, AC, HP formula, and attacks. Components use these
//    to quickly generate a stat block without full character creation.
export const STAT_TEMPLATES: StatTemplate[] = [
  { name: 'Commoner', stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, ac: 10, hp: '1d8+0', speed: 30, profBonus: 2, skills: [], attacks: ['Club. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 1d4 bludgeoning damage.'] },
  { name: 'Guard', stats: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 }, ac: 16, hp: '2d8+4', speed: 30, profBonus: 2, skills: ['Perception +2'], attacks: ['Spear. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 1d6+2 piercing damage.'] },
  { name: 'Noble', stats: { str: 10, dex: 12, con: 10, int: 14, wis: 12, cha: 16 }, ac: 13, hp: '2d8+0', speed: 30, profBonus: 2, skills: ['Deception +5', 'Insight +3', 'Persuasion +5'], attacks: ['Dagger. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 1d4+1 piercing damage.'] },
  { name: 'Mage', stats: { str: 8, dex: 12, con: 12, int: 16, wis: 14, cha: 10 }, ac: 12, hp: '5d8+5', speed: 30, profBonus: 3, skills: ['Arcana +5', 'Investigation +5'], attacks: ['Arcane Bolt. Ranged Spell Attack: +5 to hit, range 120 ft., one target. Hit: 2d8 force damage.'], notes: 'Spellcasting. The mage is a 5th-level spellcaster. Spell save DC 13, +5 to hit with spell attacks.' },
  { name: 'Scout', stats: { str: 10, dex: 16, con: 12, int: 12, wis: 14, cha: 10 }, ac: 14, hp: '3d8+3', speed: 30, profBonus: 2, skills: ['Nature +3', 'Perception +4', 'Stealth +5', 'Survival +4'], attacks: ['Shortsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1d6+3 piercing damage.', 'Longbow. Ranged Weapon Attack: +5 to hit, range 150/600 ft., one target. Hit: 1d8+3 piercing damage.'] },
  { name: 'Priest', stats: { str: 10, dex: 10, con: 12, int: 12, wis: 16, cha: 14 }, ac: 14, hp: '4d8+4', speed: 30, profBonus: 2, skills: ['Medicine +5', 'Persuasion +4', 'Religion +3'], attacks: ['Mace. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 1d6 bludgeoning damage.'], notes: 'Spellcasting. The priest is a 3rd-level spellcaster. Spell save DC 13, +5 to hit with spell attacks.' },
  { name: 'Thug', stats: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 }, ac: 14, hp: '5d8+10', speed: 30, profBonus: 2, skills: ['Intimidation +2'], attacks: ['Heavy Club. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1d8+3 bludgeoning damage.'] },
  { name: 'Bandit', stats: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 }, ac: 13, hp: '2d8+2', speed: 30, profBonus: 2, skills: ['Deception +2', 'Stealth +4'], attacks: ['Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1d6+2 slashing damage.', 'Light Crossbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 1d8+2 piercing damage.'] },
  { name: 'Cultist', stats: { str: 10, dex: 12, con: 12, int: 12, wis: 12, cha: 14 }, ac: 12, hp: '2d8+2', speed: 30, profBonus: 2, skills: ['Deception +4', 'Religion +3'], attacks: ['Dagger. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 1d4+1 piercing damage.'] },
  { name: 'Knight', stats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 14 }, ac: 18, hp: '8d8+16', speed: 30, profBonus: 3, skills: ['Athletics +5', 'History +2', 'Persuasion +4'], attacks: ['Longsword. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 1d8+3 slashing damage.', 'Javelin. Ranged Weapon Attack: +5 to hit, range 30/120 ft., one target. Hit: 1d6+3 piercing damage.'], notes: 'Brave. The knight has advantage on saving throws against being frightened.' },
  { name: 'Apprentice', stats: { str: 8, dex: 12, con: 10, int: 14, wis: 12, cha: 12 }, ac: 11, hp: '2d8+0', speed: 30, profBonus: 2, skills: ['Arcana +4', 'History +4'], attacks: ['Arcane Bolt. Ranged Spell Attack: +4 to hit, range 60 ft., one target. Hit: 1d8 force damage.'], notes: 'Spellcasting. The apprentice is a 1st-level spellcaster. Spell save DC 12, +4 to hit with spell attacks.' },
  { name: 'Veteran', stats: { str: 16, dex: 14, con: 16, int: 10, wis: 12, cha: 10 }, ac: 17, hp: '10d8+30', speed: 30, profBonus: 3, skills: ['Athletics +6', 'Perception +3'], attacks: ['Longsword. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 1d8+3 slashing damage.', 'Shortbow. Ranged Weapon Attack: +5 to hit, range 80/320 ft., one target. Hit: 1d6+2 piercing damage.'], notes: 'Second Wind (1/Short Rest). The veteran can use a bonus action to regain 1d10+3 hit points.' },
];

const PROFESSIONS = [
  'Baker', 'Blacksmith', 'Brewer', 'Butcher', 'Carpenter', 'Cartographer', 'Cook', 'Cooper',
  'Farmer', 'Fisher', 'Fletcher', 'Gardener', 'Glassblower', 'Herbalist', 'Innkeeper', 'Jeweler',
  'Leatherworker', 'Locksmith', 'Mason', 'Merchant', 'Miller', 'Miner', 'Painter', 'Potter',
  'Rancher', 'Roper', 'Saddler', 'Sailor', 'Scribe', 'Shoemaker', 'Smith', 'Stonemason',
  'Tanner', 'Tavernkeeper', 'Thatcher', 'Tinker', 'Vintner', 'Wainwright', 'Weaver', 'Woodcarver',
];

const APPEARANCES = [
  'A weathered face with kind eyes and calloused hands.',
  'Tall and lanky with a nervous smile and darting eyes.',
  'Stocky build, broad shoulders, and a thick beard streaked with grey.',
  'Youthful face with freckles and an infectious laugh.',
  'Regal bearing, neatly trimmed hair, and fine but practical clothes.',
  'Hunched posture, missing several teeth, and a raspy voice.',
  'Athletic build, close-cropped hair, and a confident stride.',
  'Plain features, nondescript clothing — easy to forget.',
  'Distinguishing scar across the left cheek and a wary gaze.',
  'Elegant hands, immaculate dress, and a slight, knowing smile.',
  'Rough-hewn features, broken nose, and a booming laugh.',
  'Slender frame, delicate features, and a soft-spoken manner.',
  'Muscular arms covered in tattoos, shaved head, piercing stare.',
  'Rosy cheeks, round belly, and an ever-present pipe.',
  'Sharp angular features, severe bun, and precise movements.',
];

const AGE_RANGES = ['Young adult', 'Adult', 'Middle-aged', 'Elderly', 'Ancient'];

// 🧠 Utility helpers: pick (random element), pickN (random subset), rollHp (dice formula).
//    These are pure functions — same input always gives same kind of output.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function rollHp(hpFormula: string): number {
  const match = hpFormula.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return 4;
  const count = parseInt(match[1]);
  const die = parseInt(match[2]);
  const mod = parseInt(match[3] || '0');
  let total = mod;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * die) + 1;
  }
  return Math.max(1, total);
}

// 🧠 generateNPC: the main generator function. Picks random name, species,
//    template, personality traits, and appearance. Accepts overrides for
//    any field — a common React pattern (defaults + overrides via spread).
export function generateNPC(overrides?: Partial<GeneratedNPC>): GeneratedNPC {
  const species = overrides?.species || pick(Object.keys(NAMES));
  const nameData = NAMES[species] || NAMES.human;
  const gender = overrides?.gender || pick(['male', 'female']);
  const firstName = gender === 'male' ? pick(nameData.male) : pick(nameData.female);
  const surname = pick(nameData.surnames || NAMES.human.surnames);
  const template = overrides?.template || pick(STAT_TEMPLATES).name;
  const tmpl = STAT_TEMPLATES.find(t => t.name === template) || STAT_TEMPLATES[0];
  const baseStats = { ...tmpl.stats };

  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name: `${firstName} ${surname}`,
    species,
    gender,
    template,
    age: pick(AGE_RANGES),
    stats: baseStats,
    ac: tmpl.ac,
    hp: rollHp(tmpl.hp),
    maxHp: rollHp(tmpl.hp),
    speed: tmpl.speed,
    personality: pickN(PERSONALITY_TRAITS, 2),
    ideal: pick(IDEALS),
    bond: pick(BONDS),
    flaw: pick(FLAWS),
    notes: tmpl.notes || '',
    appearance: pick(APPEARANCES),
    profession: pick(PROFESSIONS),
    ...overrides,
  };
}

export function generateNPCMultiple(count: number, species?: string): GeneratedNPC[] {
  return Array.from({ length: count }, () => generateNPC(species ? { species } : undefined));
}

// 🧠 Storage helpers: save/load NPCs to localStorage scoped to the campaign.
//    These are the only side-effect functions in this file.
import { campaignKey } from './campaignStorage';
const STORAGE_KEY = 'saved-npcs';
function sk(key: string) { return campaignKey(key); }

export function loadSavedNPCs(): GeneratedNPC[] {
  try {
    const raw = localStorage.getItem(sk(STORAGE_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveNPC(npc: GeneratedNPC): void {
  const list = loadSavedNPCs();
  const idx = list.findIndex(n => n.id === npc.id);
  if (idx >= 0) list[idx] = npc;
  else list.push(npc);
  localStorage.setItem(sk(STORAGE_KEY), JSON.stringify(list));
}

export function deleteSavedNPC(id: string): void {
  const list = loadSavedNPCs().filter(n => n.id !== id);
  localStorage.setItem(sk(STORAGE_KEY), JSON.stringify(list));
}
