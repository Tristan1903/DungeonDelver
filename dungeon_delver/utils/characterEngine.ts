// =============================================================================
// 📘 FILE: utils/characterEngine.ts
// =============================================================================
// 🎯 PURPOSE: Computes DERIVED/LIVE stats for a character — things that change
//    based on equipment and conditions, like AC, skill bonuses, and load level.
//
// 🧠 REACT CONCEPT: "Computed Properties" Pattern
//    The character's BASE stats (str, dex, con, etc.) are stored in the
//    Character object. But things like "current AC" need to be COMPUTED from
//    base stats + equipped items. This engine is the "computed properties"
//    layer — pure functions that take a character and return derived values.
//
//    💡 This is similar to Vue's computed properties or Redux selectors:
//    the raw data is one thing, but the UI needs to DISPLAY derived values.
//
// 🔧 HOW TO ALTER:
//    - Add a new armor type: add handling in the inventory.forEach loop
//    - Change skill formula: modify the skills object in getLiveStats
//    - Change AC formula: modify the finalAc calculation
//    - Add new computed stat: add a new function (e.g., getInitiative())
// =============================================================================

import { Character, ClassLevel } from '../lib/character';

// 🧠 Proficiency Bonus = ceil(level / 4) + 1
//    At level 1: ceil(1/4)+1 = 1+1 = 2 ✓
//    At level 5: ceil(5/4)+1 = 2+1 = 3 ✓
//    At level 20: ceil(20/4)+1 = 5+1 = 6 ✓
//    This matches D&D 5e progression exactly.
export const getProficiencyBonus = (level: number) => Math.ceil(level / 4) + 1;

// 🧠 getLiveStats — THE core function. Computes ALL active stats for display.
//    Walks through the character's equipped items and applies their effects.
//
//    Parameters:
//    - char: any (the Character object — using `any` for flexibility)
//
//    Returns:
//    - stats: ability scores WITH magic item bonuses applied
//    - modifiers: ability score modifiers (the actual game numbers)
//    - profBonus: proficiency bonus at current level
//    - skills: each skill with total bonus (ability + proficiency + expertise)
//    - ac: final Armor Class
//    - acBreakdown: { base, dex, shield, other } for display
export const getLiveStats = (char: any) => {
    let live = { ...char.baseStats };  // 🧠 Shallow copy — we'll modify this
    let acBase = 10;                    // Base AC (10 unarmored)
    let dexCap: number | null = null;   // Dex cap for armor type (null = no cap)
    let shieldBonus = 0;
    let otherAcBonus = 0;
    let equippedMaterials: string[] = [];
    let setSlots: string[] = [];

    // 🧠 Loop through ALL inventory items, only process equipped ones
    if (!char.inventory) char.inventory = [];
    char.inventory.forEach((item: any) => {
        if (!item.equipped) return;  // Skip unequipped items
        const type = (item.type || '').split('|')[0];  // Handle "LA|studded leather" format
        const ac = item.modifiers?.ac;

        // 🧠 Armor AC logic:
        // Light Armor: base AC + full Dex
        // Medium Armor: base AC + Dex (capped at +2)
        // Heavy Armor: base AC, no Dex
        if (ac) {
            if (type.startsWith('LA')) {
                acBase = ac;
                dexCap = null;    // Full Dex to AC
            } else if (type.startsWith('MA')) {
                acBase = ac;
                dexCap = 2;       // Max +2 from Dex
            } else if (type.startsWith('HA')) {
                acBase = ac;
                dexCap = 0;       // No Dex to AC
            } else if (type.startsWith('S') || type === 'SH') {
                shieldBonus += ac;  // Shield bonus stacks
            } else {
                otherAcBonus += ac; // Ring of Protection, etc.
            }
        }

        // Apply magic item stat bonuses (e.g., Gauntlets of Ogre Power → STR)
        if (item.modifiers) {
            Object.entries(item.modifiers).forEach(([stat, bonus]) => {
                if (stat !== 'ac' && live[stat] !== undefined) live[stat] += (bonus as number);
            });
        }

        // Track materials for set bonus
        if (item.material && item.slot) {
            equippedMaterials.push(item.material.toLowerCase());
            setSlots.push(item.slot);
        }
    });

    // 🧠 Full Set Bonus: If head, torso, hands, and feet all have same material
    const setCheckSlots = ['head', 'torso', 'hands', 'feet'];
    const hasFullSet = setCheckSlots.every(s => setSlots.includes(s));
    const allSameMaterial = hasFullSet && equippedMaterials.length >= 4 &&
        equippedMaterials.every(m => m === equippedMaterials[0]);
    if (allSameMaterial) {
        otherAcBonus += 1;  // +1 AC for wearing a matching armor set
    }

    // 🧠 Compute ability modifiers: (score - 10) / 2, rounded down
    const modifiers: any = {};
    Object.entries(live).forEach(([stat, score]) => {
        modifiers[stat] = Math.floor(((score as number) - 10) / 2);
    });

    const profBonus = getProficiencyBonus(char.totalLevel || char.level || 1);

    // 🧠 Compute each skill: ability mod + proficiency bonus if proficient
    //    If expert (double proficiency), add profBonus × 2
    const skills: any = {};
    Object.entries(SKILL_MAP).forEach(([skill, stat]) => {
        const isProficient = char.proficiencies?.includes(skill);
        const isExpert = char.expertise?.includes(skill);
        skills[skill] = modifiers[stat] + (isProficient ? (isExpert ? profBonus * 2 : profBonus) : 0);
    });

    const dexContrib = dexCap !== null ? Math.min(modifiers.dex, dexCap) : modifiers.dex;
    const finalAc = acBase + dexContrib + shieldBonus + otherAcBonus;

    return {
        stats: live,
        modifiers,
        profBonus,
        skills,
        ac: finalAc,
        level: char.level,
        acBreakdown: { base: acBase, dex: dexContrib, shield: shieldBonus, other: otherAcBonus },
    };
};

// 🧠 computeLoad — Determines weight load level based on equipped items.
//    Affects speed and stealth. Three tiers: light/medium/heavy/overloaded.
export const computeLoad = (char: any): { label: string; speedMod: number; stealthDisadv: boolean; color: string } => {
    const equipped = (char.inventory || []).filter((i: any) => i.equipped);
    const heavyCount = equipped.filter((i: any) => i.weightClass === 'heavy').length;
    const hasMedium = equipped.some((i: any) => i.weightClass === 'medium');
    const allSlotsFilled = ['head', 'face', 'neck', 'shoulders', 'torso', 'back', 'wrists', 'hands', 'ring1', 'ring2', 'waist', 'feet', 'mainHand', 'offHand', 'ranged']
        .every(s => equipped.some((i: any) => i.slot === s));
    const backHasItems = equipped.some((i: any) => i.slot === 'back' && i.weightClass);

    if (allSlotsFilled && backHasItems) {
        return { label: 'Overloaded', speedMod: -10, stealthDisadv: true, color: '#e53e3e' };
    }
    if (heavyCount >= 3) {
        return { label: 'Heavy Load', speedMod: -5, stealthDisadv: true, color: '#e53e3e' };
    }
    if (hasMedium) {
        return { label: 'Medium Load', speedMod: 0, stealthDisadv: false, color: '#ecc94b' };
    }
    return { label: 'Light Load', speedMod: 5, stealthDisadv: false, color: '#48bb78' };
};

// 🧠 SKILL_MAP — Maps each skill name to its associated ability score.
//    This is used by getLiveStats to compute skill bonuses.
export const SKILL_MAP: Record<string, string> = {
    acrobatics: 'dex',
    animalHandling: 'wis',
    arcana: 'int',
    athletics: 'str',
    deception: 'cha',
    history: 'int',
    insight: 'wis',
    intimidation: 'cha',
    investigation: 'int',
    medicine: 'wis',
    nature: 'int',
    perception: 'wis',
    performance: 'cha',
    persuasion: 'cha',
    religion: 'int',
    sleightOfHand: 'dex',
    stealth: 'dex',
    survival: 'wis',
};
