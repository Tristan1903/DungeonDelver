// utils/dataLoader.ts

function generateItemFallback(item: any): string[] {
  const parts: string[] = [];
  if (item.weapon) {
    const cat = item.weaponCategory || 'weapon';
    parts.push(`${cat.charAt(0).toUpperCase() + cat.slice(1)} weapon.`);
    if (item.dmg1) parts.push(`Damage: ${item.dmg1} ${item.dmgType || ''} ${item.range ? `(${item.range} ft)` : ''}.`.trim());
    if (item.property?.length) {
      const props = item.property.map((p: string) => p.split('|')[0]).join(', ');
      parts.push(`Properties: ${props}.`);
    }
    if (item.mastery?.length) {
      const mast = item.mastery.map((p: string) => p.split('|')[0]).join(', ');
      parts.push(`Mastery: ${mast}.`);
    }
    if (item.weight) parts.push(`Weight: ${item.weight} lb.`);
    if (item.value) parts.push(`Value: ${(item.value / 100).toFixed(0)} gp.`);
  } else if (item.armor || item.type?.startsWith('LA') || item.type?.startsWith('MA') || item.type?.startsWith('HA')) {
    const armorNames: Record<string, string> = { LA: 'Light armor', MA: 'Medium armor', HA: 'Heavy armor' };
    const armorKind = item.type?.split('|')[0];
    parts.push(armorNames[armorKind] || 'Armor.');
    if (item.ac) parts.push(`Base AC: ${typeof item.ac === 'number' ? item.ac : item.ac.ac || '?'}.`);
    if (item.weight) parts.push(`Weight: ${item.weight} lb.`);
    if (item.value) parts.push(`Value: ${(item.value / 100).toFixed(0)} gp.`);
    if (item.type?.startsWith('MA')) parts.push('Adds up to +2 Dex modifier to AC.');
    if (item.type?.startsWith('HA')) parts.push('Dexterity modifier does not affect AC.');
  }
  return parts.length ? parts : [`${item.name || 'Item'}.`];
}

const spellCache: Record<string, any[]> = {};
let allSpellsCache: any[] | null = null;

export const DataEngine = {
  // Use this to fetch ANY JSON file from your 'data' folder
  loadLocalJson: async (relativePath: string) => {
    try {
      // In Tauri, relative paths often start from the project root
      // We use the fetch API for the dev server, which is much faster than FS
      const response = await fetch(`/${relativePath}`);
      if (!response.ok) throw new Error("Could not find file");
      return await response.json();
    } catch (error) {
      console.error(`Error loading ${relativePath}:`, error);
      return null;
    }
  },

  getBestiary: async () => {
    const data = await DataEngine.loadLocalJson('data/bestiary/bestiary-mm.json');
    return data?.monster || [];
  },

  getItems: async () => {
    const baseData = await DataEngine.loadLocalJson('data/items-base.json');
    const magicData = await DataEngine.loadLocalJson('data/items.json');
    const ghpgData = await DataEngine.loadLocalJson('data/book/book-ghpg.json');
    const ghmgData = await DataEngine.loadLocalJson('data/book/book-ghmg.json');
    const ghcgData = await DataEngine.loadLocalJson('data/book/book-ghcg.json');

    const baseItems = baseData?.baseitem || [];
    const magicItems = magicData?.item || [];
    const ghpgItems = ghpgData?.item || [];
    const ghmgItems = ghmgData?.item || [];
    const ghcgItems = ghcgData?.item || [];

    const processedBase = baseItems.map((i: any) => ({ ...i, rarity: 'none' }));

    // Deduplicate by name, preferring XPHB source
    const allItems = [...processedBase, ...magicItems, ...ghpgItems, ...ghmgItems, ...ghcgItems];
    const seen = new Map<string, any>();
    for (const item of allItems) {
      const key = item.name.toLowerCase();
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, item);
      } else if (item.source === 'XPHB' && existing.source !== 'XPHB') {
        // XPHB wins, but carry over entries from the old version if XPHB has none
        const mergedEntries = item.entries?.length ? item.entries : (existing.entries || []);
        seen.set(key, {
          ...existing,
          ...item,
          entries: mergedEntries.length ? mergedEntries : generateItemFallback(item),
        });
      }
    }
    return Array.from(seen.values());
  },

  getRacesData: async () => {
    const data = await DataEngine.loadLocalJson('data/races.json');
    return {
      races: data?.race || [],
      subraces: data?.subrace || [] // This is what was missing!
    };
  },

  getClassFullData: async (className: string) => {
    const filename = `data/class/class-${className.toLowerCase()}.json`;
    const data = await DataEngine.loadLocalJson(filename);
    const ghpgData = await DataEngine.loadLocalJson('data/book/book-ghpg.json');
    const ghpgSubclasses = (ghpgData?.subclass || []).filter((s: any) => s.className === className);
    const ghpgSubclassFeatures = (ghpgData?.subclassFeature || []).filter((f: any) => f.className === className);
    return {
      info: data?.class?.find((c: any) => c.source === 'XPHB') || data?.class?.[0],
      features: data?.classFeature,
      subclasses: [...(data?.subclass || []), ...ghpgSubclasses],
      subclassFeatures: [...(data?.subclassFeature || []), ...ghpgSubclassFeatures],
      raw: data,
    };
  },

  getSpellsIndex: async () => {
    return (await DataEngine.loadLocalJson('data/spells/index.json')) as Record<string, string> | null;
  },

  getSpellsBySource: async (source: string) => {
    if (spellCache[source]) return spellCache[source];
    const index = await DataEngine.getSpellsIndex();
    const file = index?.[source];
    if (!file) return [];
    const data = await DataEngine.loadLocalJson(`data/spells/${file}`);
    const spells = data?.spell || [];
    spellCache[source] = spells;
    return spells;
  },

  getSpells: async (sources: string[] = ['PHB', 'XPHB']) => {
    if (allSpellsCache) return allSpellsCache;
    const merged: Map<string, any> = new Map();
    // Load from spell index sources
    for (const src of sources) {
      const spells = await DataEngine.getSpellsBySource(src);
      for (const s of spells) {
        const key = s.name.toLowerCase();
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, s);
        } else if (src === 'XPHB' && existing.source !== 'XPHB') {
          merged.set(key, s);
        }
      }
    }
    // Also load GHPG spells from the book file
    try {
      const ghpgData = await DataEngine.loadLocalJson('data/book/book-ghpg.json');
      const ghpgSpells = ghpgData?.spell || [];
      for (const s of ghpgSpells) {
        if (!merged.has(s.name.toLowerCase())) {
          merged.set(s.name.toLowerCase(), { ...s, source: s.source || 'GHPG' });
        }
      }
    } catch { /* ignore */ }
    allSpellsCache = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
    return allSpellsCache;
  },

  getSpellByName: async (name: string) => {
    const spells = await DataEngine.getSpells();
    return spells.find((s) => s.name.toLowerCase() === name.toLowerCase());
  },

  getSpellsByNames: async (names: string[]) => {
    const spells = await DataEngine.getSpells();
    const lower = names.map(n => n.toLowerCase());
    const map: Record<string, any> = {};
    for (const s of spells) {
      if (lower.includes(s.name.toLowerCase())) {
        map[s.name] = s;
      }
    }
    return map;
  },

  getConditions: async () => {
    const data = await DataEngine.loadLocalJson('data/conditionsdiseases.json');
    return data?.condition || data?.disease || [];
  },

  getAdventures: async () => {
    const data = await DataEngine.loadLocalJson('data/adventures.json');
    return data?.adventure || [];
  },

  getFeats: async () => {
    const data = await DataEngine.loadLocalJson('data/feats.json');
    return data?.feat || [];
  },

  getHomebrewItems: async () => {
    const data = await DataEngine.loadLocalJson('data/homebrew/index.json');
    return data || { items: [], monsters: [], spells: [] };
  },

  searchHomebrew: async (query: string) => {
    const index = await DataEngine.getHomebrewItems();
    const q = query.toLowerCase();
    const items = (index.items || []).filter((i: any) => i.name?.toLowerCase().includes(q));
    return items;
  },

  getActions: async () => {
    const data = await DataEngine.loadLocalJson('data/actions.json');
    return data?.action || data?.actions || [];
  },

  getBooks: async () => {
    const data = await DataEngine.loadLocalJson('data/books.json');
    return data?.book || [];
  },

  getBestiaryBySource: async (source: string) => {
    const data = await DataEngine.loadLocalJson(`data/bestiary/bestiary-${source.toLowerCase()}.json`);
    return data?.monster || [];
  },

  getAllBestiary: async () => {
    const index = await DataEngine.getBooks();
    const sourceFiles: Record<string, string> = {};
    // Map book sources to bestiary file names
    for (const book of index) {
      if (book.source) sourceFiles[book.source] = book.source.toLowerCase();
    }
    // Load core sources first, then the rest
    const coreSources = ['MM', 'VGM', 'MTF', 'MPMM', 'XPHB', 'TCE', 'XGE'];
    const allSources = [...coreSources, ...Object.keys(sourceFiles).filter(s => !coreSources.includes(s))];
    const allMonsters: any[] = [];
    for (const src of allSources) {
      try {
        const data = await DataEngine.loadLocalJson(`data/bestiary/bestiary-${src.toLowerCase()}.json`);
        if (data?.monster) allMonsters.push(...data.monster.map((m: any) => ({ ...m, source: m.source || src })));
      } catch { /* skip missing files */ }
    }
    // Also load Grim Hollow monsters from book files
    try {
      const ghpgData = await DataEngine.loadLocalJson('data/book/book-ghpg.json');
      if (ghpgData?.monster) allMonsters.push(...ghpgData.monster.map((m: any) => ({ ...m, source: m.source || 'GHPG' })));
    } catch { /* skip */ }
    try {
      const ghmgData = await DataEngine.loadLocalJson('data/book/book-ghmg.json');
      if (ghmgData?.monster) allMonsters.push(...ghmgData.monster.map((m: any) => ({ ...m, source: m.source || 'GrimHollowMG24' })));
    } catch { /* skip */ }
    try {
      const ghcgData = await DataEngine.loadLocalJson('data/book/book-ghcg.json');
      if (ghcgData?.monster) allMonsters.push(...ghcgData.monster.map((m: any) => ({ ...m, source: m.source || 'GrimHollowCG24' })));
    } catch { /* skip */ }
    return allMonsters;
  },

  getClassesList: () => {
    // Standard 5e classes based on your file list
    return [
      "Artificer",
      "Barbarian",
      "Bard",
      "Blood Hunter",
      "Cleric",
      "Druid",
      "Fighter",
      "Illrigger",
      "Monk",
      "Monster Hunter",
      "Mystic",
      "Paladin",
      "Pugilist",
      "Ranger",
      "Rogue",
      "Sorcerer",
      "Warlock",
      "Wizard"
    ];
  },

  getMergedRaces: async () => {
    const raceData = await DataEngine.loadLocalJson('data/races.json');
    const fluffData = await DataEngine.loadLocalJson('data/fluff-races.json');
    const ghpgData = await DataEngine.loadLocalJson('data/book/book-ghpg.json');

    const races = raceData?.race || [];
    const fluff = fluffData?.raceFluff || [];
    // Include GHPG races if present
    const ghpgRaces = ghpgData?.race || [];

    const allRaces = [...races, ...ghpgRaces];

    return allRaces.map((r: any) => {
      const cleanName = r.name.trim();

      // 1. Try exact match (e.g. "Astral Elf")
      let match = fluff.find((f: any) => f.name === cleanName);

      // 2. Try stripping parentheses (e.g. "Human (Zendikar)" -> "Human")
      if (!match && cleanName.includes('(')) {
        const baseName = cleanName.split(' (')[0];
        match = fluff.find((f: any) => f.name === baseName);
      }

      // 3. Try matching the end of the name (e.g. "Sea Elf" matches "Elf")
      if (!match && cleanName.includes(' ')) {
        const parts = cleanName.split(' ');
        const lastPart = parts[parts.length - 1];
        match = fluff.find((f: any) => f.name === lastPart);
      }

      return {
        ...r,
        // Fallback to mechanical entries if lore is missing
        description: match?.entries || r.entries || []
      };
    });
  },

  // Add or Update in utils/dataLoader.ts
  getMergedBackgrounds: async () => {
    const bgData = await DataEngine.loadLocalJson('data/backgrounds.json');
    const fluffData = await DataEngine.loadLocalJson('data/fluff-backgrounds.json');
    const ghpgData = await DataEngine.loadLocalJson('data/book/book-ghpg.json');

    const backgrounds = bgData?.background || [];
    const fluff = fluffData?.backgroundFluff || [];
    // Include GHPG backgrounds if present
    const ghpgBgs = ghpgData?.background || [];

    const allBgs = [...backgrounds, ...ghpgBgs];

    return allBgs.map((b: any) => {
      // Find lore by name and source
      const match = fluff.find((f: any) => f.name === b.name && f.source === b.source);
      return {
        ...b,
        description: match?.entries || b.entries || [] // Fallback to mechanics if no fluff
      };
    });
  },

  getDeities: async () => {
    const data = await DataEngine.loadLocalJson('data/deities.json');
    return data?.deity || [];
  },
};

