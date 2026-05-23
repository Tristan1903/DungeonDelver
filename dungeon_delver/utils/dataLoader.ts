import { readTextFile } from '@tauri-apps/plugin-fs';
import { BaseDirectory } from '@tauri-apps/api/path';
import { join, appDataDir } from '@tauri-apps/api/path';

// utils/dataLoader.ts

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
    // Load both the base items (mundane) and the main item list (magic)
    const baseData = await DataEngine.loadLocalJson('data/items-base.json');
    const magicData = await DataEngine.loadLocalJson('data/items.json');

    const baseItems = baseData?.baseitem || [];
    const magicItems = magicData?.item || [];

    // Tag base items as mundane so our filter can find them easily
    const processedBase = baseItems.map((i: any) => ({ ...i, rarity: 'none' }));

    return [...processedBase, ...magicItems];
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
    return {
      info: data?.class?.[0],
      features: data?.classFeature,
      subclasses: data?.subclass || [] // Added this
    };
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

    const races = raceData?.race || [];
    const fluff = fluffData?.raceFluff || [];

    return races.map((r: any) => {
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

    const backgrounds = bgData?.background || [];
    const fluff = fluffData?.backgroundFluff || [];

    return backgrounds.map((b: any) => {
      // Find lore by name and source
      const match = fluff.find((f: any) => f.name === b.name && f.source === b.source);
      return {
        ...b,
        description: match?.entries || b.entries || [] // Fallback to mechanics if no fluff
      };
    });
  }
};

