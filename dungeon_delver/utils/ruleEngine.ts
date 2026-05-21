// utils/ruleEngine.ts

export const calculateModifier = (score: number) => Math.floor((score - 10) / 2);

export const calculateFinalStats = (baseStats: any, items: any[]) => {
  // 1. Start with base stats
  let finalStats = { ...baseStats };

  // 2. Apply item bonuses (if equipped)
  items.forEach(item => {
    if (item.equipped && item.stats_modifier) {
      for (const [stat, bonus] of Object.entries(item.stats_modifier)) {
        finalStats[stat] = (finalStats[stat] || 0) + (bonus as number);
      }
    }
  });

  // 3. Generate the "Display" object
  return {
    ...finalStats,
    modifiers: {
      str: calculateModifier(finalStats.str),
      dex: calculateModifier(finalStats.dex),
      con: calculateModifier(finalStats.con),
      int: calculateModifier(finalStats.int),
      wis: calculateModifier(finalStats.wis),
      cha: calculateModifier(finalStats.cha),
    }
  };
};