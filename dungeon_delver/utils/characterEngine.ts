import { Character, ClassLevel } from '../lib/character';

export const getProficiencyBonus = (level: number) => Math.ceil(level / 4) + 1;

export const getLiveStats = (char: any) => {
    let live = { ...char.baseStats };
    let acBase = 10;
    let dexCap: number | null = null;
    let shieldBonus = 0;
    let otherAcBonus = 0;
    let equippedMaterials: string[] = [];
    let setSlots: string[] = [];

    char.inventory.forEach((item: any) => {
        if (!item.equipped) return;
        const type = (item.type || '').split('|')[0];
        const ac = item.modifiers?.ac;

        if (ac) {
            if (type.startsWith('LA')) {
                acBase = ac;
                dexCap = null;
            } else if (type.startsWith('MA')) {
                acBase = ac;
                dexCap = 2;
            } else if (type.startsWith('HA')) {
                acBase = ac;
                dexCap = 0;
            } else if (type.startsWith('S') || type === 'SH') {
                shieldBonus += ac;
            } else {
                otherAcBonus += ac;
            }
        }

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

    // Full Set Bonus: all head/torso/hands/feet equipped with matching material
    const setCheckSlots = ['head', 'torso', 'hands', 'feet'];
    const hasFullSet = setCheckSlots.every(s => setSlots.includes(s));
    const allSameMaterial = hasFullSet && equippedMaterials.length >= 4 &&
        equippedMaterials.every(m => m === equippedMaterials[0]);
    if (allSameMaterial) {
        otherAcBonus += 1;
    }

    const modifiers: any = {};
    Object.entries(live).forEach(([stat, score]) => {
        modifiers[stat] = Math.floor(((score as number) - 10) / 2);
    });

    const profBonus = getProficiencyBonus(char.totalLevel || char.level || 1);

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

/** Compute load level for speed/stealth penalties */
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
