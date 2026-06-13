// =============================================================================
// 📘 FILE: utils/weaponMasteries.ts
// =============================================================================
// 🎯 PURPOSE: Defines the Weapon Mastery system from the 2024 D&D 5e rules.
//    Each mastery (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex, Flex)
//    has a description and mechanical effect type.
//
// 🧠 REACT CONCEPT: Static Data Definitions
//    Like classThemes.ts, this is purely data — a lookup table mapping mastery
//    names to their game rules. Functions provide lookup and resolution from
//    weapon data (which may include `|source` suffixes in mastery names).
//
// 🔧 HOW TO ALTER:
//    - Change mastery rules: modify the description text
//    - Add a new mastery: add an entry to MASTERY_DEFINITIONS
//    - Change how masteries are extracted from weapons: modify getMasteriesFromWeapon
// =============================================================================

export interface WeaponMastery {
  name: string;
  label: string;
  description: string;
  type: 'save' | 'auto';          // Does this require a saving throw or auto-apply?
  saveAbility?: 'str' | 'dex' | 'con';  // Which save if type === 'save'
}

// 🧠 MASTERY_DEFINITIONS — All 9 weapon masteries from the 2024 PHB.
export const MASTERY_DEFINITIONS: Record<string, WeaponMastery> = {
  Cleave: { name: 'Cleave', label: 'Cleave', description: 'If you hit a target, you can deal damage equal to your ability modifier to another creature within 5 ft.', type: 'auto' },
  Graze: { name: 'Graze', label: 'Graze', description: 'If your attack roll misses, you still deal damage equal to your ability modifier.', type: 'auto' },
  Nick: { name: 'Nick', label: 'Nick', description: 'When you make the extra attack of the Light property, you can make it as part of the Attack action instead of a Bonus Action.', type: 'auto' },
  Push: { name: 'Push', label: 'Push', description: 'On hit, push the target up to 15 ft. away from you.', type: 'save', saveAbility: 'str' },
  Sap: { name: 'Sap', label: 'Sap', description: 'On hit, the target has disadvantage on its next attack roll before the start of your next turn.', type: 'auto' },
  Slow: { name: 'Slow', label: 'Slow', description: "On hit, the target's Speed is reduced by 10 ft. until the start of your next turn.", type: 'auto' },
  Topple: { name: 'Topple', label: 'Topple', description: 'On hit, force the target to make a Constitution saving throw (DC 8 + prof + Str mod) or be knocked Prone.', type: 'save', saveAbility: 'con' },
  Vex: { name: 'Vex', label: 'Vex', description: 'On hit, you have advantage on your next attack roll against that target before the end of your next turn.', type: 'auto' },
  Flex: { name: 'Flex', label: 'Flex', description: 'When you hit with a weapon, you can choose to deal maximum damage instead of rolling.', type: 'auto' },
};

export function getMastery(name: string): WeaponMastery | undefined {
  const key = Object.keys(MASTERY_DEFINITIONS).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? MASTERY_DEFINITIONS[key] : undefined;
}

// 🧠 getMasteriesFromWeapon — Extracts mastery definitions from a weapon item.
//    Weapon mastery data may include `|XPHB` suffixes (e.g., "Cleave|XPHB").
//    We split on `|` and take the first part.
export function getMasteriesFromWeapon(weapon: { mastery?: string[] }): WeaponMastery[] {
  if (!weapon.mastery) return [];
  const masteries: WeaponMastery[] = [];
  for (const m of weapon.mastery) {
    const clean = m.split('|')[0];
    const def = getMastery(clean);
    if (def) masteries.push(def);
  }
  return masteries;
}

export function getMasterySaveDC(profBonus: number, strMod: number): number {
  return 8 + profBonus + strMod;
}
