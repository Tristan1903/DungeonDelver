export const calculateModifier = (score: number) => Math.floor((score - 10) / 2);
export const getProficiencyBonus = (level: number) => Math.ceil(level / 4) + 1;

import { Character, ClassLevel } from '../lib/character';

export const getLiveStats = (char: any) => {
    let live = { ...char.baseStats };
    let acBase = 10;
    let bonusAc = 0;

    char.inventory.forEach((item: any) => {
        if (item.equipped && item.modifiers) {
            Object.entries(item.modifiers).forEach(([stat, bonus]) => {
                if (stat === 'ac') bonusAc += (bonus as number);
                else if (live[stat] !== undefined) live[stat] += (bonus as number);
            });
        }
    });

    const modifiers: any = {};
    Object.entries(live).forEach(([stat, score]) => {
        modifiers[stat] = Math.floor(((score as number) - 10) / 2);
    });

    const profBonus = getProficiencyBonus(char.level || 1);

    // Calculate Skills
    const skills: any = {};
    Object.entries(SKILL_MAP).forEach(([skill, stat]) => {
        const isProficient = char.proficiencies?.includes(skill);
        skills[skill] = modifiers[stat] + (isProficient ? profBonus : 0);
    });

    // Simple AC calculation: 10 + Dex + Items
    const finalAc = acBase + modifiers.dex + bonusAc;

    return {
        stats: live,
        modifiers,
        profBonus,
        skills,
        ac: 10 + modifiers.dex + bonusAc,
        level: char.level
    };
};

export const SKILL_MAP: Record<string, string> = {
    athletics: 'str',
    acrobatics: 'dex', sleightOfHand: 'dex', stealth: 'dex',
    arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
    animalHandling: 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
    deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha'
};

export const getMulticlassPrereqs = (className: string) => {
    const requirements: Record<string, any> = {
        'Barbarian': { str: 13 },
        'Bard': { cha: 13 },
        'Cleric': { wis: 13 },
        'Druid': { wis: 13 },
        'Fighter': { str: 13, dex: 13 },
        'Monk': { dex: 13, wis: 13 },
        'Paladin': { str: 13, cha: 13 },
        'Ranger': { dex: 13, wis: 13 },
        'Rogue': { dex: 13 },
        'Sorcerer': { cha: 13 },
        'Warlock': { cha: 13 },
        'Wizard': { int: 13 }
    };
    return requirements[className];
};

export const calculateTotalLevel = (classes: ClassLevel[]) => {
    return classes.reduce((sum, c) => sum + c.level, 0);
};