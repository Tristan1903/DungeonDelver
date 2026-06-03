'use client';
import { useState, useEffect, useCallback } from 'react';
import { getLiveStats, SKILL_MAP, computeLoad } from '../../utils/characterEngine';
import { cleanString } from '../../utils/formatters';
import { colors, radii, spacing, cardPanel, formInput, sectionLabel, primaryButton, secondaryButton, ghostButton, flexBetween, flexCenter, goldBadge, statBonusBadge, modalOverlay, detailOverlay } from '../../utils/styles';
import { getLevelFromXP, getNextLevelXP } from '../../utils/levelingEngine';
import { Character, DEFAULT_CHARACTER, InventoryItem, PaperDollSlot, SLOT_LABELS, SLOT_ORDER_LIST, guessSlot, guessWeightClass, StashItem, getClassList, getPrimaryClass } from '../../lib/character';
import CharacterWizard from '../../components/CharacterWizard';
import { rollD20, rollD20WithAdvantage, rollDice, AdvantageMode } from '../../utils/rollEngine';
import { resetSpellSlots, getSpellSaveDC, concentrationSaveDC, getSpellcastingAbility, getPreparedCount, computeMulticlassSpellSlots } from '../../utils/spellcastingEngine';
import { DataEngine } from '../../utils/dataLoader';
import { SpellDetailModal } from '../../components/SpellSelectionView';
import { isMuleNearby, loadStash } from '../../utils/stashEngine';
import { HonorSanityStats, PietySection, RenownSection, DarkGiftsSection, MadnessSection, EpicBoonsSection, HeroPointsSection, StressFearSection, CampaignSelector, getActiveModules, TransformationsSection, DefilingSection, GroupPatronsSection, ShipMoraleSection, SidekicksSection, IsekaiSection } from '../../components/CampaignModulesCharacterSheet';
import { saveCharToLocal, getStorageKey, loadCharFromLocal, isValidCharacter, CHAR_STORAGE_PREFIX } from '../../utils/storageEngine';
import { useSpellSlot as useSpellSlotEngine, useClassResource } from '../../utils/resourceEngine';
import { getMastery } from '../../utils/weaponMasteries';
import { getObscuredForCharacter } from '../../utils/obscuredItemsEngine';
import ErrorBoundary from '../../components/ErrorBoundary';
import SpellCastAnimation from '../../components/SpellCastAnimation';

interface CharRegistryEntry {
    path: string;
    name: string;
    class: string;
    race: string;
    level: number;
    lastOpened: string;
}

const STORAGE_KEY = 'dungeon-delver-character-registry';

function loadRegistry(): CharRegistryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveRegistry(entries: CharRegistryEntry[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* noop */ }
}

/** Migrate old name-based keys (dd-char-{name}) to id-based keys. Returns updated registry entries. */
function migrateLocalChars(): void {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(CHAR_STORAGE_PREFIX)) continue;
        const c = loadCharFromLocal(key);
        if (!c) continue;
        // If it has an id but is stored under the wrong key, re-save
        if (c.id) {
            const correctKey = getStorageKey(c);
            if (correctKey !== key) {
                localStorage.setItem(correctKey, JSON.stringify(c));
                try { localStorage.removeItem(key); } catch { /* noop */ }
            }
        }
        // If it has no id, assign one and re-save
        if (!c.id && typeof crypto !== 'undefined' && crypto.randomUUID) {
            c.id = crypto.randomUUID();
            const correctKey = getStorageKey(c);
            localStorage.setItem(correctKey, JSON.stringify(c));
            if (correctKey !== key) {
                try { localStorage.removeItem(key); } catch { /* noop */ }
            }
        }
    }
}

function listLocalCharKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CHAR_STORAGE_PREFIX)) {
            keys.push(key);
        }
    }
    return keys;
}

function deleteCharFromLocal(key: string) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
}

function loadRegistryFromLocal(): CharRegistryEntry[] {
    migrateLocalChars();
    const keys = listLocalCharKeys();
    return keys.map(key => {
        const c = loadCharFromLocal(key);
        if (!c) return null;
        return {
            path: getStorageKey(c),
            name: c.name,
            class: c.class || (c.classLevels?.[0]?.className || 'Unknown'),
            race: c.race || 'Unknown',
            level: c.totalLevel || c.level || 1,
            lastOpened: new Date().toISOString(),
        };
    }).filter(Boolean) as CharRegistryEntry[];
}

export default function CharacterSheet() {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardMode, setWizardMode] = useState<'create' | 'levelup'>('create');
    const [showSelect, setShowSelect] = useState(true);
    const [registry, setRegistry] = useState<CharRegistryEntry[]>([]);

    const handleWizardComplete = (finalDraft: Character) => {
        setChar(finalDraft);
        saveChar(false, finalDraft);
        setIsWizardOpen(false);
        setShowSelect(false);
    };

    const addToRegistry = useCallback(async (charPath: string, c: Character) => {
        const entry: CharRegistryEntry = {
            path: charPath,
            name: c.name,
            class: c.class || (c.classLevels?.[0]?.className || ''),
            race: c.race,
            level: c.level || c.totalLevel || 1,
            lastOpened: new Date().toISOString(),
        };
        setRegistry((prev) => {
            const filtered = prev.filter((e) => e.path !== charPath);
            const updated = [entry, ...filtered].slice(0, 20);
            saveRegistry(updated);
            return updated;
        });
    }, []);

    const removeFromRegistry = useCallback((charPath: string) => {
        deleteCharFromLocal(charPath);
        setRegistry((prev) => {
            const updated = prev.filter((e) => e.path !== charPath);
            saveRegistry(updated);
            return updated;
        });
    }, []);

    useEffect(() => {
        const fileRegistry = loadRegistry();
        const localEntries = loadRegistryFromLocal();
        // Merge: local entries override stale file-only entries, dedup by path
        const merged = [...localEntries];
        for (const fe of fileRegistry) {
            if (!merged.find(m => m.path === fe.path)) {
                merged.push(fe);
            }
        }
        setRegistry(merged);
    }, []);

    // --- STATE ---
    const [char, setChar] = useState<Character>({
        ...DEFAULT_CHARACTER,
        proficiencies: ['athletics', 'perception'],
    });
    const [charPath, setCharPath] = useState<string | null>(null);
    const [classInfo, setClassInfo] = useState<any>(null);
    const [classDataMap, setClassDataMap] = useState<Record<string, any>>({});
    const [raceData, setRaceData] = useState<any>(null);
    const [bgData, setBgData] = useState<any>(null);
    // ... spell data
    const [spellData, setSpellData] = useState<Record<string, any>>({});
    const [spellDataLoading, setSpellDataLoading] = useState(false);
    const [upcastState, setUpcastState] = useState<{ spellName: string; levels: number[]; spell: any } | null>(null);
    const [optionalFeatureLookup, setOptionalFeatureLookup] = useState<Record<string, any>>({});
    const [classFeatureData, setClassFeatureData] = useState<any[]>([]);
    const [spellDcInfo, setSpellDcInfo] = useState<string | null>(null);

    // Load class data for ALL classes (support multiclassing)
    useEffect(() => {
        const classNames = getClassList(char);
        if (classNames.length > 0) {
            // Load primary class data into legacy state
            DataEngine.getClassFullData(classNames[0]).then((d) => {
                setClassInfo(d.info);
                setClassFeatureData(d.features || []);
            });
            // Load all classes into map
            const loadAll = async () => {
                const map: Record<string, any> = {};
                for (const name of classNames) {
                    try {
                        const d = await DataEngine.getClassFullData(name);
                        map[name] = d;
                    } catch (e) { /* ignore */ }
                }
        setClassDataMap(map);
    };
    loadAll();
    } else {
    setClassDataMap({});
    }
}, [char.class, JSON.stringify(char.classLevels?.map(cl => cl.className))]);

const [activeModules, setActiveModules] = useState<string[]>([]);
const [campaignModuleConfig, setCampaignModuleConfig] = useState<any>({});
useEffect(() => {
    const result = getActiveModules(char);
    setActiveModules(result.enabledModules);
    setCampaignModuleConfig(result.moduleConfig);
}, [char.campaignId, char.campaignName]);

// Recompute spell slots when class data loads (supports multiclass spellcasting)
useEffect(() => {
    const keys = Object.keys(classDataMap);
    if (keys.length === 0 || !char.classLevels?.length) return;
    const combined = computeMulticlassSpellSlots(char.classLevels, classDataMap);
    if (Object.keys(combined).length > 0) {
        setChar((prev) => {
            // Preserve used counts from existing slots
            for (const [lvl, slot] of Object.entries(combined)) {
                const old = prev.spellSlots?.[Number(lvl)];
                if (old) combined[Number(lvl)].used = Math.min(old.used, slot.max);
            }
            return { ...prev, spellSlots: combined };
        });
    }
}, [classDataMap, JSON.stringify(char.classLevels?.map(cl => `${cl.className}:${cl.level}`))]);

    useEffect(() => {
        DataEngine.loadLocalJson('data/optionalfeatures.json').then((data: any) => {
            if (data?.optionalfeature) {
                const lookup: Record<string, any> = {};
                for (const f of data.optionalfeature) lookup[f.name] = f;
                setOptionalFeatureLookup(lookup);
            }
        });
    }, []);

    useEffect(() => {
        if (char.race) {
            DataEngine.getMergedRaces().then((races) => {
                const match = races.find((r: any) => r.name.toLowerCase() === char.race.toLowerCase());
                setRaceData(match || null);
            });
        } else {
            setRaceData(null);
        }
    }, [char.race]);

    useEffect(() => {
        if (char.background) {
            DataEngine.getMergedBackgrounds().then((bgs) => {
                const match = bgs.find((b: any) => char.background && b.name.toLowerCase() === char.background.toLowerCase());
                setBgData(match || null);
            });
        } else {
            setBgData(null);
        }
    }, [char.background]);

    useEffect(() => {
        const fetchSpellData = async () => {
            const names = new Set<string>();
            if (char.spells) {
                char.spells.cantrips?.forEach(n => names.add(n));
                (char.spells.known || []).forEach(n => names.add(n));
                (char.spells.prepared || []).forEach(n => names.add(n));
            }
            if (names.size === 0) { setSpellData({}); setSpellDataLoading(false); return; }
            setSpellDataLoading(true);
            const map = await DataEngine.getSpellsByNames([...names]);
            setSpellData(map);
            setSpellDataLoading(false);
        };
        fetchSpellData();
    }, [JSON.stringify(char.spells?.cantrips), JSON.stringify(char.spells?.known), JSON.stringify(char.spells?.prepared)]);

    const [allLibraryItems, setAllLibraryItems] = useState<any[]>([]);

    // Preload item library on mount
    useEffect(() => {
        DataEngine.getItems().then(setAllLibraryItems);
    }, []);

    // Enrich stale inventory items when library loads
    useEffect(() => {
        if (allLibraryItems.length === 0) return;
        setChar((prev) => {
            if (!prev.inventory?.length) return prev;
            const enriched = enrichInventory(prev.inventory);
            const changed = enriched.some((item, i) => item !== prev.inventory[i]);
            return changed ? { ...prev, inventory: enriched } : prev;
        });
    }, [allLibraryItems]);

    // Auto-save notes to localStorage when they change
    useEffect(() => {
        if (!char.name) return;
        const timer = setTimeout(() => {
            const key = getStorageKey(char);
            try {
                const existing = localStorage.getItem(key);
                if (existing) {
                    const parsed = JSON.parse(existing);
                    parsed.backstory = char.backstory || '';
                    parsed.organizations = char.organizations || [];
                    parsed.allies = char.allies || [];
                    parsed.enemies = char.enemies || [];
                    parsed.notes = char.notes || '';
                    localStorage.setItem(key, JSON.stringify(parsed));
                }
            } catch (e) { /* ignore */ }
        }, 500);
        return () => clearTimeout(timer);
    }, [char.backstory, char.organizations, char.allies, char.enemies, char.notes]);

    const [xpToAdd, setXpToAdd] = useState(0);
    const [spellLevelFilter, setSpellLevelFilter] = useState<string | number>('all');
    const [showPreparedOnly, setShowPreparedOnly] = useState(false);
    const [viewingItem, setViewingItem] = useState<any | null>(null);
    const [viewingFeature, setViewingFeature] = useState<any | null>(null);
    const [viewingSpell, setViewingSpell] = useState<any | null>(null);
    const [showManageSpells, setShowManageSpells] = useState(false);
    const [viewingSpellInManage, setViewingSpellInManage] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [rollResult, setRollResult] = useState<string | null>(null);
    const [castingSpell, setCastingSpell] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'actions' | 'spells' | 'inventory' | 'features' | 'background' | 'notes'>('actions');
    const [tabSub, setTabSub] = useState<'equipped' | 'backpack' | 'attunement' | 'other'>('equipped');
    const [equippingItemId, setEquippingItemId] = useState<string | null>(null);
    const [hpAmount, setHpAmount] = useState(1);
    const [rollMode, setRollMode] = useState<AdvantageMode>('normal');
    const [showRollPicker, setShowRollPicker] = useState<{ label: string; mod: number; onRoll: (mode: AdvantageMode) => void } | null>(null);
    const [expandedSpell, setExpandedSpell] = useState<string | null>(null);

    useEffect(() => {
        if (!rollResult) return;
        const timer = setTimeout(() => setRollResult(null), 4000);
        return () => clearTimeout(timer);
    }, [rollResult]);

    const live = getLiveStats(char);

    // --- LOGIC ---
    const takeDamage = (amount: number) => {
        setChar(prev => {
            let dmg = amount;
            let temp = prev.hp.temp || 0;
            if (temp > 0) {
                const absorbed = Math.min(temp, dmg);
                temp -= absorbed;
                dmg -= absorbed;
            }
            if (prev.concentratingOn && dmg > 0 && (prev.hp.current - dmg) > 0) {
                setTimeout(() => promptConcentrationSave(dmg), 50);
            }
            return {
                ...prev,
                hp: { ...prev.hp, current: Math.max(0, prev.hp.current - dmg), temp: temp || undefined }
            };
        });
    };
    const healDamage = (amount: number) => {
        setChar(prev => ({ ...prev, hp: { ...prev.hp, current: Math.min(prev.hp.max, prev.hp.current + amount) } }));
    };
    const setTempHp = (amount: number) => {
        setChar(prev => ({ ...prev, hp: { ...prev.hp, temp: amount > 0 ? amount : undefined } }));
    };
    const handleAddXp = () => {
        const newXp = char.xp + xpToAdd;
        const newLevel = char.levelingMode !== 'milestone' ? getLevelFromXP(newXp) : char.level;
        setChar({ ...char, xp: newXp, level: newLevel });
        setXpToAdd(0);
    };

    const handleManualLevel = (newLevel: number) => {
        const clamped = Math.max(1, Math.min(20, newLevel));
        const classList = getClassList(char);
        const classLevels = char.classLevels?.length
            ? char.classLevels.map(cl => {
                if (cl.className === classList[0]) return { ...cl, level: clamped };
                return cl;
              })
            : [{ className: char.class, level: clamped }];
        setChar({ ...char, level: clamped, totalLevel: classLevels.reduce((sum: number, cl: any) => sum + cl.level, 0), classLevels, classes: classList });
    };

    const saveChar = async (exportFile?: boolean, overrideChar?: Character) => {
        const toSave = overrideChar || char;
        try {
            const localKey = saveCharToLocal(toSave);
            setCharPath(localKey);
            addToRegistry(localKey, toSave);
            if (exportFile) {
                const { save } = await import('@tauri-apps/plugin-dialog');
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                const path = await save({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    defaultPath: `${toSave.name}.json`
                });
                if (path) {
                    await writeTextFile(path, JSON.stringify(toSave, null, 2));
                }
            }
        } catch (err) { console.error(err); }
    };

    const generateItemFallbackDescription = (item: any, libItem?: any): string[] => {
        const src = libItem || item;
        const parts: string[] = [];
        if (src.weapon) {
            const cat = src.weaponCategory || 'weapon';
            parts.push(`${cat?.charAt(0).toUpperCase() + cat?.slice(1)} weapon.`);
            if (src.dmg1) parts.push(`Damage: ${src.dmg1} ${src.dmgType || ''} ${src.range ? `(${src.range} ft)` : ''}.`.trim());
            if (src.property?.length) {
                const props = src.property.map((p: string) => p.split('|')[0]).join(', ');
                parts.push(`Properties: ${props}.`);
            }
            if (src.mastery?.length) {
                const mast = src.mastery.map((p: string) => p.split('|')[0]).join(', ');
                parts.push(`Mastery: ${mast}.`);
            }
            if (src.weight) parts.push(`Weight: ${src.weight} lb.`);
            if (src.value) parts.push(`Value: ${(src.value / 100).toFixed(0)} gp.`);
        } else if (src.armor || src.type?.startsWith('LA') || src.type?.startsWith('MA') || src.type?.startsWith('HA')) {
            const armorNames: Record<string, string> = { LA: 'Light armor', MA: 'Medium armor', HA: 'Heavy armor' };
            const armorKind = src.type?.split('|')[0];
            parts.push(armorNames[armorKind] || 'Armor.');
            if (src.ac) parts.push(`Base AC: ${typeof src.ac === 'number' ? src.ac : src.ac.ac || '?'}.`);
            if (src.weight) parts.push(`Weight: ${src.weight} lb.`);
            if (src.value) parts.push(`Value: ${(src.value / 100).toFixed(0)} gp.`);
            if (src.type?.startsWith('MA')) parts.push('Adds up to +2 Dex modifier to AC.');
            if (src.type?.startsWith('HA')) parts.push('Dexterity modifier does not affect AC.');
        }
        return parts.length ? parts : [`${src.name}.`];
    };

    const enrichInventory = useCallback((inventory: any[]): any[] => {
        if (!allLibraryItems.length) return inventory;
        return inventory.map((item) => {
            const baseName = item.name.split('|')[0].trim().toLowerCase();
            const libItem = allLibraryItems.find(
                (i: any) => i.name.toLowerCase() === baseName
            );
            if (!libItem) return item;
            const updates: any = {};
            const hasEntries = item.entries && (!Array.isArray(item.entries) || item.entries.length > 0);
            if (!hasEntries) {
                updates.entries = libItem.entries?.length ? libItem.entries : generateItemFallbackDescription(item, libItem);
            }
            if (!item.modifiers?.ac && libItem.ac) {
                const acBonus = typeof libItem.ac === 'number' ? libItem.ac : (libItem.ac.ac || 0);
                if (acBonus) {
                    updates.modifiers = { ...(item.modifiers || {}), ac: acBonus };
                }
            }
            if (!item.type && libItem.type) {
                updates.type = libItem.type;
            }
            return Object.keys(updates).length > 0 ? { ...item, ...updates } : item;
        });
    }, [allLibraryItems]);

    const loadCharByPath = async (path: string) => {
        try {
            // Try localStorage first
            const local = loadCharFromLocal(path);
            if (local) {
                if (local.inventory?.length) {
                    local.inventory = enrichInventory(local.inventory);
                }
                setChar(local);
                setCharPath(path);
                setShowSelect(false);
                return;
            }
            // Fall back to file
            const { readTextFile } = await import('@tauri-apps/plugin-fs');
            const content = await readTextFile(path);
            const c: Character = JSON.parse(content);
            if (c.inventory?.length) {
                c.inventory = enrichInventory(c.inventory);
            }
            // Assign UUID if missing
            if (!c.id && typeof crypto !== 'undefined' && crypto.randomUUID) {
                c.id = crypto.randomUUID();
            }
            // Auto-import into localStorage
            const key = saveCharToLocal(c);
            setChar(c);
            setCharPath(key);
            setShowSelect(false);
        } catch (err) { console.error(err); alert('Could not load character file.'); }
    };

    const loadChar = async () => {
        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
            if (selected && !Array.isArray(selected)) {
                await loadCharByPath(selected);
            }
        } catch (err) { console.error(err); }
    };

    const findFeatureByName = (name: string): any => {
        if (optionalFeatureLookup[name]) return optionalFeatureLookup[name];
        const fromClassData = classFeatureData.find((f: any) => f.name === name);
        if (fromClassData) return fromClassData;
        const fromCharFeatures = (char.features || []).find((f: any) => f.name === name);
        if (fromCharFeatures) return fromCharFeatures;
        return null;
    };

    const getValidSlots = (item: any): PaperDollSlot[] => {
        const t = (item.type || '').toUpperCase();
        const n = item.name.toLowerCase();
        if (t.startsWith('LA') || t.startsWith('MA') || t.startsWith('HA')) return ['torso'];
        if (t.startsWith('S') || t === 'SH') return ['offHand'];
        if (t.startsWith('R')) return ['ranged'];
        if (t.startsWith('M') || t.startsWith('A')) return ['mainHand', 'offHand'];
        if (n.includes('ring')) return ['ring1', 'ring2'];
        const guessed = guessSlot(item);
        return guessed ? [guessed] : ['mainHand', 'offHand'];
    };

    const toggleItem = (id: string, targetSlot?: PaperDollSlot) => {
        setChar((prev) => {
            const item = prev.inventory.find(i => i.id === id);
            if (!item) return prev;
            const willEquip = !item.equipped;
            let inv = [...prev.inventory];
            // If equipping to a specific slot, unequip any item already in that slot
            if (willEquip && targetSlot) {
                const existing = inv.find(i => i.equipped && i.slot === targetSlot && i.id !== id);
                if (existing) {
                    inv = inv.map(i => i.id === existing.id ? { ...i, equipped: false, slot: undefined } : i);
                }
            }
            // If unequipping, clear the slot
            inv = inv.map(i =>
                i.id === id ? {
                    ...i,
                    equipped: willEquip,
                    slot: willEquip ? (targetSlot || guessSlot(item) || undefined) : undefined,
                } : i
            );
            return { ...prev, inventory: inv };
        });
    };

    const rollCheck = (statName: string, mod: number, mode: AdvantageMode = 'normal') => {
        const result = rollD20WithAdvantage(mode, mod, `${statName} check`, 'character-sheet');
        const modeLabel = mode === 'advantage' ? ' (Adv)' : mode === 'disadvantage' ? ' (Dis)' : '';
        setRollResult(`${statName.toUpperCase()}${modeLabel}: ${result.rolls.join(', ')} + ${mod} = ${result.total}`);
    };

    const resetResources = (prev: Character, refreshOn: 'short' | 'long'): Character['resources'] => {
        if (!prev.resources) return prev.resources || {};
        const next: Character['resources'] = {};
        for (const [key, res] of Object.entries(prev.resources)) {
            next[key] = res.refreshOn === refreshOn ? { ...res, current: res.max } : res;
        }
        return next;
    };

    const handleLongRest = () => {
        const isGritty = activeModules.includes('grittyRealism');
        const days = campaignModuleConfig?.grittyRealism?.longRestDays || 7;
        if (isGritty && !confirm(`Gritty Realism active: Long rest takes ${days} days. Continue?`)) return;
        setChar((prev) => ({
            ...prev,
            hp: { ...prev.hp, current: prev.hp.max },
            spellSlots: prev.spellSlots ? resetSpellSlots(prev.spellSlots) : prev.spellSlots,
            resources: resetResources(prev, 'long'),
            classLevels: (prev.classLevels || []).map(cl => ({ ...cl, hdUsed: 0 })),
        }));
    };

    const handleShortRest = () => {
        const isGritty = activeModules.includes('grittyRealism');
        const hours = campaignModuleConfig?.grittyRealism?.shortRestHours || 8;
        if (isGritty && !confirm(`Gritty Realism active: Short rest takes ${hours} hours. Continue?`)) return;
        const isPact = classInfo?.casterProgression === 'pact';
        setChar((prev) => ({
            ...prev,
            resources: resetResources(prev, 'short'),
            spellSlots: isPact && prev.spellSlots ? resetSpellSlots(prev.spellSlots) : prev.spellSlots,
        }));
    };

    const spendHitDie = (className: string, hitDie: number) => {
        const result = rollDice(`1d${hitDie}`, `Hit Die (${className})`, 'character-sheet');
        const healAmount = result.total + (live.modifiers.con || 0);
        setChar(prev => ({
            ...prev,
            hp: { ...prev.hp, current: Math.min(prev.hp.max, prev.hp.current + Math.max(1, healAmount)) },
            classLevels: (prev.classLevels || []).map(cl =>
                cl.className === className ? { ...cl, hdUsed: (cl.hdUsed || 0) + 1 } : cl
            ),
        }));
    };

    const useSlot = (level: number) => {
        setChar((prev) => useSpellSlotEngine(prev, level));
    };

    const promptConcentrationSave = (damage: number) => {
        const dc = concentrationSaveDC(damage);
        const mod = Math.max(live.modifiers.con, 0);
        const result = rollD20WithAdvantage('normal', mod, 'Concentration save', 'concentration');
        const success = result.total >= dc;
        setSpellDcInfo(`Concentration DC ${dc}: rolled ${result.total} (mod ${mod}) — ${success ? 'Maintained' : 'Lost!'}`);
        if (!success) setChar((prev) => ({ ...prev, concentratingOn: null }));
    };

    const extractCost = (entries: any): { pp?: number; gp?: number; ep?: number; sp?: number; cp?: number } | undefined => {
        if (!entries) return undefined;
        const str = JSON.stringify(entries);
        const match = str.match(/(\d+)\s*(pp|gp|ep|sp|cp)/i);
        if (!match) return undefined;
        return { [match[2].toLowerCase()]: parseInt(match[1], 10) } as any;
    };

    const findItemInLibrary = (name: string): any | undefined => {
        const baseName = name.split('|')[0].trim().toLowerCase();
        const xphb = allLibraryItems.find(
            i => i.name.toLowerCase() === baseName && i.source === 'XPHB'
        );
        const anySource = allLibraryItems.find(
            i => i.name.toLowerCase() === baseName
        );
        // Prefer XPHB but fall back to any source for missing fields like entries
        if (xphb && anySource && xphb !== anySource) {
            return {
                ...anySource,
                ...xphb,
                entries: xphb.entries?.length ? xphb.entries : (anySource.entries || []),
            };
        }
        return xphb || anySource;
    };

    const addItemFromLibrary = (libItem: any) => {
        // If this is a pack, expand it into individual items
        if (libItem.packContents && Array.isArray(libItem.packContents)) {
            const itemsToAdd: any[] = [];
            libItem.packContents.forEach((entry: any) => {
                if (typeof entry === 'string') {
                    const found = findItemInLibrary(entry);
                    if (found) {
                        const acB = found.ac ? (typeof found.ac === 'number' ? found.ac : (found.ac.ac || 0)) : 0;
                        itemsToAdd.push({ ...found, modifiers: acB ? { ac: acB } : undefined, quantity: 1 });
                    }
                } else if (typeof entry === 'object') {
                    if (entry.item) {
                        const found = findItemInLibrary(entry.item);
                        if (found) {
                            const acBonus2 = found.ac ? (typeof found.ac === 'number' ? found.ac : (found.ac.ac || 0)) : 0;
                            itemsToAdd.push({ ...found, modifiers: acBonus2 ? { ac: acBonus2 } : undefined, quantity: entry.quantity || 1 });
                        }
                    } else if (entry.special) {
                        itemsToAdd.push({
                            id: `special-${entry.special}-${Date.now()}`,
                            name: entry.special,
                            equipped: false,
                            entries: [],
                            weight: 0,
                            quantity: 1,
                        } as InventoryItem);
                    }
                }
            });
            if (itemsToAdd.length > 0) {
                setChar(prev => ({
                    ...prev,
                    inventory: [...prev.inventory, ...itemsToAdd.map((it, idx) => {
                        const acBonus = it.ac ? (typeof it.ac === 'number' ? it.ac : (it.ac.ac || 0)) : 0;
                        return {
                            id: `${it.name}-${Date.now()}-${idx}`,
                            name: it.name,
                            equipped: false,
                            slot: guessSlot(it),
                            weightClass: guessWeightClass(it),
                            modifiers: acBonus ? { ac: acBonus } : undefined,
                            entries: it.entries,
                            weight: it.weight ? Number(it.weight) : undefined,
                            quantity: it.quantity || 1,
                            cost: it.cost || extractCost(it.entries),
                            type: it.type,
                            dmg1: it.dmg1,
                        } as InventoryItem;
                    })],
                }));
                setIsSearching(false);
                return;
            }
        }

        // Enrich item: prefer XPHB but fall back to any source for entries/description
        const enriched = (() => {
            const baseName = libItem.name.split('|')[0].trim().toLowerCase();
            const anySource = allLibraryItems.find(
                (i: any) => i.name.toLowerCase() === baseName && i !== libItem
            );
            const src = libItem.entries?.length ? libItem : (anySource?.entries?.length ? anySource : null);
            if (src) return src;
            // Generate fallback description from stats if no source has entries
            const fallback = generateItemFallbackDescription(libItem, libItem);
            return { ...libItem, entries: fallback };
        })();

        let bonus = 0;
        if (enriched.ac) {
            bonus = typeof enriched.ac === 'number' ? enriched.ac : (enriched.ac.ac || 0);
        }
        const newItem: InventoryItem = {
            id: `${enriched.name}-${Date.now()}`,
            name: enriched.name,
            equipped: false,
            slot: guessSlot(enriched),
            weightClass: guessWeightClass(enriched),
            modifiers: bonus ? { ac: bonus } : undefined,
            entries: enriched.entries,
            weight: enriched.weight ? Number(enriched.weight) : undefined,
            quantity: 1,
            cost: enriched.cost || extractCost(enriched.entries),
            type: enriched.type,
            dmg1: enriched.dmg1,
        };
        setChar(prev => ({ ...prev, inventory: [...prev.inventory, newItem] }));
        setIsSearching(false);
    };

    const openSearch = async () => {
        const items = await DataEngine.getItems();
        setAllLibraryItems(items);
        setIsSearching(true);
    };

    const formatEntries = (entries: any): React.ReactNode => {
        if (!entries) return null;
        if (typeof entries === 'string') return <p style={{ margin: '4px 0' }}>{cleanString(entries)}</p>;
        if (Array.isArray(entries)) return entries.map((e, i) => <div key={i}>{formatEntries(e)}</div>);
        if (typeof entries === 'object') {
            if (entries.items) {
                return <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>{entries.items.map((it: any, i: number) => <li key={i} style={{ marginBottom: '2px' }}>{formatEntries(it)}</li>)}</ul>;
            }
            if (entries.entries) {
                const inner = (
                    <div style={{ margin: '4px 0' }}>
                        {Array.isArray(entries.entries) ? entries.entries.map((e: any, i: number) => <div key={i}>{formatEntries(e)}</div>) : formatEntries(entries.entries)}
                    </div>
                );
                if (entries.name) {
                    return (
                        <div style={{ margin: '8px 0' }}>
                            <div style={{ fontWeight: 'bold', color: colors.gold, fontSize: '0.85rem', marginBottom: '2px' }}>{cleanString(entries.name)}</div>
                            {inner}
                        </div>
                    );
                }
                return inner;
            }
            if (entries.type === 'table' && entries.rows) {
                return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: '0.75rem' }}>
                        {entries.colLabels && (
                            <thead><tr>{entries.colLabels.map((l: string, i: number) => <th key={i} style={{ border: `1px solid ${colors.border}`, padding: '4px 6px', color: colors.gold }}>{l}</th>)}</tr></thead>
                        )}
                        <tbody>{entries.rows.map((row: any[], ri: number) => (
                            <tr key={ri}>{row.map((cell: any, ci: number) => <td key={ci} style={{ border: `1px solid ${colors.border}`, padding: '4px 6px' }}>{formatEntries(cell)}</td>)}</tr>
                        ))}</tbody>
                    </table>
                );
            }
            return <code style={{ fontSize: '0.75rem', color: colors.textDim }}>{JSON.stringify(entries)}</code>;
        }
        return <code style={{ fontSize: '0.75rem', color: colors.textDim }}>{JSON.stringify(entries)}</code>;
    };

    // --- HELPERS ---
    const getClassIconUrl = (cls: string) => {
        const normalized = cls.charAt(0).toUpperCase() + cls.slice(1).toLowerCase();
        return `/img/classes/Icons/${normalized}.png`;
    };

    const groupSkillsByStat = () => {
        const groups: Record<string, { skill: string; bonus: number; isProf: boolean; isExpert: boolean; breakdown: string }[]> = {};
        Object.entries(SKILL_MAP).forEach(([skill, stat]) => {
            if (!groups[stat]) groups[stat] = [];
            const isProf = char.proficiencies?.includes(skill) ?? false;
            const isExpert = char.expertise?.includes(skill) ?? false;
            const bonus = live.skills[skill];
            const statMod = live.modifiers[stat];
            const profBonus = live.profBonus;
            const breakdown = isExpert
                ? `${statMod >= 0 ? '+' : ''}${statMod} (${stat.toUpperCase()}) + ${profBonus * 2} (Expertise ×2)`
                : isProf
                    ? `${statMod >= 0 ? '+' : ''}${statMod} (${stat.toUpperCase()}) + ${profBonus} (Proficiency)`
                    : `${statMod >= 0 ? '+' : ''}${statMod} (${stat.toUpperCase()})`;
            groups[stat].push({ skill, bonus, isProf, isExpert, breakdown });
        });
        return groups;
    };
    const groupedSkills = groupSkillsByStat();
    const statDisplay = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const statNames: Record<string, string> = { str: 'STRENGTH', dex: 'DEXTERITY', con: 'CONSTITUTION', int: 'INTELLIGENCE', wis: 'WISDOM', cha: 'CHARISMA' };

    const getHpBarColor = () => {
        const pct = char.hp.max > 0 ? char.hp.current / char.hp.max : 1;
        if (pct > 0.6) return '#48bb78';
        if (pct > 0.3) return '#ecc94b';
        return '#e53e3e';
    };

    const localInput: React.CSSProperties = {
        ...formInput,
        padding: '5px',
        borderRadius: radii.sm,
        fontSize: '1rem',
    };

    // --- GRIMOIRE HELPERS ---
    const ordinalSuffix = (n: number): string => {
        if (n === 0) return '';
        if (n === 1) return 'st';
        if (n === 2) return 'nd';
        if (n === 3) return 'rd';
        return 'th';
    };
    const schoolLabel = (code: string): string => {
        const map: Record<string, string> = { A: 'Abjuration', C: 'Conjuration', V: 'Evocation', T: 'Transmutation', I: 'Illusion', N: 'Necromancy', D: 'Divination', EN: 'Enchantment' };
        return map[code] || code;
    };
    const componentLabel = (c: any): string => {
        const parts: string[] = [];
        if (c?.v) parts.push('V');
        if (c?.s) parts.push('S');
        if (c?.m) parts.push(`M (${cleanString(c.m)})`);
        return parts.join(', ') || '—';
    };
    const formatTime = (time: any): string => {
        if (!time || !time.length) return '—';
        return time.map((t: any) => t.number === 1 ? t.unit : `${t.number} ${t.unit}s`).join(', ');
    };
    const formatRange = (r: any): string => {
        if (!r) return '—';
        if (r.type === 'self') return 'Self';
        if (r.type === 'touch') return 'Touch';
        if (r.type === 'sight') return 'Sight';
        if (r.type === 'unlimited') return 'Unlimited';
        if (r.type === 'special') return 'Special';
        if (r.distance?.amount) return `${r.distance.amount} ${r.distance.type || 'ft'}`;
        return r.type || '—';
    };
    const formatDuration = (dur: any): string => {
        if (!dur || !dur.length) return '—';
        return dur.map((d: any) => {
            if (d.type === 'instant') return 'Instantaneous';
            if (d.type === 'permanent') return 'Until dispelled';
            if (d.type === 'special') return 'Special';
            if (d.duration) {
                const amt = d.duration.amount;
                const unit = d.duration.type;
                const label = amt === 1 ? unit : `${amt} ${unit}s`;
                return d.concentration ? `Concentration, up to ${label}` : label;
            }
            return '—';
        }).join(', ');
    };
    const groupSpellsByLevel = (data: Record<string, any>): Record<number, any[]> => {
        const groups: Record<number, any[]> = {};
        Object.values(data).forEach(s => {
            if (!s) return;
            const lvl = s.level ?? 0;
            if (!groups[lvl]) groups[lvl] = [];
            groups[lvl].push(s);
        });
        Object.keys(groups).forEach(k => groups[Number(k)].sort((a, b) => a.name.localeCompare(b.name)));
        return groups;
    };
    const isPreparedCaster = classInfo ? !!(classInfo.preparedSpells && !classInfo.spellsKnownProgression) : false;
    const spellAbility = classInfo ? getSpellcastingAbility(classInfo) : 'int';
    const maxPrepared = isPreparedCaster && classInfo
        ? getPreparedCount(classInfo, char.totalLevel || 1, char.baseStats?.[spellAbility] || 10)
        : 0;
    const isLevelExpended = (lvl: number): boolean => {
        if (lvl === 0) return false;
        const slot = char.spellSlots?.[lvl];
        return !!slot && slot.used >= slot.max;
    };
    const getAvailableSlotLevels = (spellLevel: number): number[] => {
        if (spellLevel === 0) return [];
        const levels: number[] = [];
        for (const [lvl, slot] of Object.entries(char.spellSlots || {})) {
            const n = Number(lvl);
            if (n >= spellLevel && slot.max - slot.used > 0) levels.push(n);
        }
        return levels.sort((a, b) => a - b);
    };
    const castSpellAtLevel = (s: any, slotLevel: number) => {
        useSlot(slotLevel);
        setCastingSpell(s.name);
        const dmgMatch = JSON.stringify(s.entries || '').match(/(\d+d\d+)/);
        const isConcentration = s.duration?.some((d: any) => d.concentration);
        if (dmgMatch) {
            const result = rollDice(dmgMatch[1], s.name + ' damage', 'spell');
            setRollResult(s.name + ': ' + result.rolls.join(', ') + ' = ' + result.total + ' (Lv' + slotLevel + ')');
        } else if (isConcentration) {
            setChar((prev) => ({ ...prev, concentratingOn: s.name }));
            setRollResult(s.name + ' — concentrating (Lv' + slotLevel + ')');
        } else {
            setRollResult(s.name + ' cast (Lv' + slotLevel + ' slot)');
        }
    };
    const castSpell = (s: any) => {
        const lvl = s.level ?? 0;
        const levels = getAvailableSlotLevels(lvl);
        if (levels.length <= 1) {
            if (lvl > 0) castSpellAtLevel(s, lvl);
            else castSpellAtLevel(s, 0);
        } else {
            setUpcastState({ spellName: s.name, levels, spell: s });
        }
    };
    const togglePrepare = (spellName: string) => {
        setChar(prev => {
            const prepared = [...(prev.spells?.prepared || [])];
            const idx = prepared.indexOf(spellName);
            if (idx >= 0) prepared.splice(idx, 1);
            else if (prepared.length < maxPrepared) prepared.push(spellName);
            else setSpellDcInfo('Already at max prepared spells (' + maxPrepared + ')!');
            return { ...prev, spells: { ...prev.spells!, prepared } };
        });
    };

    return (
        <>
            {/* CHARACTER SELECT SCREEN */}
            {showSelect && (
                <div style={{ padding: spacing.xl, background: colors.bgPanel, color: 'white', minHeight: '100vh', fontFamily: 'serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ maxWidth: '800px', width: '100%' }}>
                        <h1 style={{ fontFamily: 'serif', color: colors.gold, fontSize: '2.5rem', marginBottom: '8px' }}>
                            Character Select
                        </h1>
                        <p style={{ color: colors.textMuted, marginBottom: spacing.lg }}>
                            Choose a character to view or create a new one.
                        </p>

                        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg }}>
                            <button
                                onClick={() => { setWizardMode('create'); setIsWizardOpen(true); }}
                                style={primaryButton}
                            >
                                + New Character
                            </button>
                            <button
                                onClick={loadChar}
                                style={secondaryButton}
                            >
                                Open File...
                            </button>
                        </div>

                        {registry.length === 0 && (
                            <div style={{ padding: spacing.xl, background: colors.bgCard, borderRadius: radii.lg, textAlign: 'center', border: `1px dashed ${colors.border}` }}>
                                <p style={{ color: colors.textDim, fontSize: '1.1rem' }}>No saved characters yet.</p>
                                <p style={{ color: colors.textDim, fontSize: '0.85rem' }}>Create a new character or load an existing .json file to get started.</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                            {registry.map((entry) => (
                                <div
                                    key={entry.path}
                                    onClick={() => loadCharByPath(entry.path)}
                                    style={{
                                        ...cardPanel,
                                        padding: spacing.md,
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s, transform 0.1s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none'; }}
                                >
                                    <div style={{ fontSize: '0.65rem', color: colors.gold, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>LV {entry.level}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{entry.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: colors.textMuted }}>{entry.race} · {entry.class}</div>
                                    <div style={{ fontSize: '0.7rem', color: colors.textDim, marginTop: spacing.xs }}>Opened: {new Date(entry.lastOpened).toLocaleDateString()}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFromRegistry(entry.path); }}
                                        style={{ ...ghostButton, position: 'absolute', top: '8px', right: '8px', fontSize: '0.8rem', padding: '4px 8px' }}
                                        title="Remove from list"
                                    >
                                        X
                                    </button>
                                </div>
                            ))}
                        </div>
                </div>
                </div>
            )}
            {!showSelect && (<>
                {/* HERO BANNER — enhanced with class color dominance */}
                {(() => {
                    const classList = getClassList(char);
                    const primaryClass = classList[0] || char.class || '';
                    const classColors: Record<string, string> = {
                        barbarian: '#c0392b', bard: '#e67e22', cleric: '#2980b9', druid: '#27ae60',
                        fighter: '#7f8c8d', monk: '#f1c40f', paladin: '#e74c3c', ranger: '#1abc9c',
                        rogue: '#2c3e50', sorcerer: '#8e44ad', warlock: '#6c3483', wizard: '#3498db',
                        artificer: '#d35400', bloodHunter: '#922b21', illrigger: '#1a1a2e',
                    };
                    const accent = classColors[primaryClass.toLowerCase()] || '#b8860b';
                    const gradientFrom = `#0a0d12`;
                    const gradientTo = accent + '40';
                    return (
                    <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`, padding: '24px 32px', borderBottom: `3px solid var(--dungeon-gold, ${accent})`, color: 'white' }}>
                        {/* Ghost class icon backgrounds — all classes for multiclass */}
                        {classList.length > 1 ? classList.map((cls, i) => (
                            <img key={cls} src={getClassIconUrl(cls)} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                style={{ position: 'absolute', right: `${-20 + i * 60}px`, top: `${-20 + i * 30}px`, width: '180px', height: '180px', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />
                        )) : (
                            <img src={getClassIconUrl(primaryClass)} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                style={{ position: 'absolute', right: '-20px', top: '-20px', width: '180px', height: '180px', opacity: 0.12, zIndex: 0, pointerEvents: 'none' }} />
                        )}
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {getClassList(char).map(cls => {
                                    const clsAccent = classColors[cls.toLowerCase()] || '#b8860b';
                                    return (
                                    <img key={cls} src={getClassIconUrl(cls)} style={{ width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0, border: `2px solid ${clsAccent}`, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                );})}
                                {getClassList(char).length === 0 && char.class && (
                                    <img src={getClassIconUrl(char.class)} style={{ width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0, border: `2px solid var(--dungeon-gold, ${accent})`, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{char.name || 'Unnamed Hero'}</div>
                                <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
                                    {[char.race, ...getClassList(char).map(cls => {
                                        const cl = char.classLevels?.find(c => c.className === cls);
                                        return cl ? `${cls} ${cl.level}` : cls;
                                    }), `Level ${char.totalLevel || char.level || 1}`].filter(Boolean).join(' · ')}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--dungeon-gold, #b8860b)', fontSize: '1.1rem' }}>LV {char.totalLevel || char.level || 1}</div>
                                {char.xp !== undefined && <div style={{ fontSize: '0.8rem', color: 'var(--dungeon-text-dim)' }}>{char.xp} XP</div>}
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    <button onClick={() => saveChar(false)} style={{ background: 'var(--dungeon-accent, #6366f1)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: 'var(--dungeon-radius-sm, 4px)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                                    <button onClick={() => saveChar(true)} style={{ background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-muted)', padding: '4px 12px', borderRadius: 'var(--dungeon-radius-sm, 4px)', fontSize: '0.7rem', cursor: 'pointer' }}>Export</button>
                                    <button onClick={() => { window.location.href = `/character-sheet/level-up?id=${char.id || ''}`; }} style={{ background: 'var(--dungeon-gold, #b8860b)', border: 'none', color: 'black', padding: '4px 12px', borderRadius: 'var(--dungeon-radius-sm, 4px)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>Level Up</button>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '280px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', letterSpacing: '1px' }}>HIT POINTS</span>
                                    <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>{char.hp?.current || 0} / {char.hp?.max || 0}</span>
                                </div>
                                <div style={{ width: '100%', height: '18px', background: 'rgba(0,0,0,0.4)', borderRadius: '9px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    <div style={{ width: `${Math.max(0, Math.min(100, ((char.hp?.current || 0) / (char.hp?.max || 1)) * 100))}%`, height: '100%', background: getHpBarColor(), borderRadius: '9px', transition: 'width 0.3s', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                                    <button onClick={() => takeDamage(hpAmount)} style={{ background: 'var(--dungeon-danger, #e53e3e)', border: 'none', color: 'white', padding: '3px 12px', borderRadius: 'var(--dungeon-radius-sm)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>− Damage</button>
                                    <select value={hpAmount} onChange={e => setHpAmount(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--dungeon-border)', color: 'white', padding: '3px 6px', borderRadius: 'var(--dungeon-radius-sm)', fontSize: '0.7rem', outline: 'none' }}>
                                        {[1, 2, 3, 4, 5, 10, 15, 20, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                    <button onClick={() => healDamage(hpAmount)} style={{ background: 'var(--dungeon-success, #48bb78)', border: 'none', color: 'white', padding: '3px 12px', borderRadius: 'var(--dungeon-radius-sm)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>+ Heal</button>
                                    <div style={{ width: '1px', height: '20px', background: 'var(--dungeon-border)', margin: '0 8px' }} />
                                    <button onClick={handleShortRest} style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid var(--dungeon-accent, #6366f1)', color: 'var(--dungeon-accent, #6366f1)', padding: '3px 12px', borderRadius: 'var(--dungeon-radius-sm)', fontSize: '0.7rem', cursor: 'pointer' }}>Short Rest</button>
                                    <button onClick={handleLongRest} style={{ background: 'rgba(72,187,120,0.2)', border: '1px solid var(--dungeon-success, #48bb78)', color: 'var(--dungeon-success, #48bb78)', padding: '3px 12px', borderRadius: 'var(--dungeon-radius-sm)', fontSize: '0.7rem', cursor: 'pointer' }}>Long Rest</button>
                                    <div style={{ flex: 1 }} />
                                    {char.hp.temp ? (
                                        <span style={{ fontSize: '0.65rem', color: '#ecc94b', cursor: 'pointer' }} onClick={() => setTempHp(0)} title="Click to clear temp HP">❤️‍🔥 Temp {char.hp.temp}</span>
                                    ) : (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--dungeon-text-dim)', cursor: 'pointer' }} onClick={() => { const t = prompt('Temp HP?'); if (t) setTempHp(parseInt(t) || 0); }}>+ Temp HP</span>
                                    )}
                                </div>
                            </div>
                            {/* HIT DICE */}
                            {char.classLevels && classInfo && (
                                <div style={{ flexShrink: 0, minWidth: '180px', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--dungeon-radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>HIT DICE</div>
                                {char.classLevels.map((cl: any, idx: number) => {
                                    const classData = classDataMap[cl.className];
                                    const hdSize = classData?.info?.hd?.faces || 8;
                                    const used = cl.hdUsed || 0;
                                    const remaining = cl.level - used;
                                    return (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.8rem' }}>
                                            <span style={{ color: colors.textMuted }}>{cl.className}: d{hdSize}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    {Array.from({ length: cl.level }).map((_, i) => (
                                                        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i < used ? colors.textDim : colors.success, border: `1px solid ${i < used ? colors.textDim : colors.success}` }} />
                                                    ))}
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: colors.textMuted, minWidth: '30px', textAlign: 'right' }}>{remaining}/{cl.level}</span>
                                                {remaining > 0 && (
                                                    <button onClick={() => spendHitDie(cl.className, hdSize)}
                                                        style={{ background: 'rgba(72,187,120,0.2)', border: `1px solid #48bb78`, color: '#48bb78', padding: '1px 8px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>
                                                        Spend
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}
            <div style={{ display: 'flex', padding: spacing.md, gap: spacing.md, background: colors.bgPanel, color: 'white', minHeight: '100vh', fontFamily: 'serif' }}>
                    <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>

                    {/* ABILITY SCORES */}
                    <div style={{ marginBottom: spacing.md }}>
                        <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>ABILITY SCORES</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {statDisplay.map(stat => (
                                <div key={stat} onClick={() => setShowRollPicker({ label: statNames[stat], mod: live.modifiers[stat], onRoll: (mode) => rollCheck(statNames[stat], live.modifiers[stat], mode) })}
                                    style={{ background: 'rgba(45,55,72,0.3)', borderRadius: radii.sm, padding: '8px 10px', cursor: 'pointer', border: `1px solid ${colors.borderLight}`, textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>{stat.toUpperCase()}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{live.stats[stat]}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#f6e05e', fontWeight: 'bold' }}>{live.modifiers[stat] >= 0 ? '+' : ''}{live.modifiers[stat]}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Honor & Sanity (campaign module) */}
                    <HonorSanityStats char={char} onCharChange={setChar} enabled={activeModules.includes('honorSanity')} />

                    {/* SAVING THROWS */}
                    <div style={{ marginBottom: spacing.md }}>
                        <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>SAVING THROWS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => {
                                const mod = live.modifiers[stat];
                                const isProficient = (char.savingThrowProficiencies || []).includes(stat);
                                const bonus = mod + (isProficient ? live.profBonus : 0);
                                return (
                                    <div key={stat} onClick={() => setShowRollPicker({ label: `${statNames[stat]} Save`, mod: bonus, onRoll: (mode) => rollCheck(`${statNames[stat]} Save`, bonus, mode) })}
                                        style={{ background: 'rgba(45,55,72,0.3)', borderRadius: radii.sm, padding: '6px 10px', cursor: 'pointer', border: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
                                            {isProficient && <span style={{ color: colors.accent, marginRight: '4px' }}>●</span>}
                                            {stat.toUpperCase()}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f6e05e' }}>{bonus >= 0 ? '+' : ''}{bonus}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SKILLS GROUPED BY STAT */}
                    <div style={{ marginBottom: spacing.md }}>
                        <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>SKILLS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {statDisplay.map(stat => {
                                const skills = groupedSkills[stat];
                                if (!skills || skills.length === 0) return null;
                                const statMod = live.modifiers[stat];
                                return (
                                    <div key={stat} style={{ background: 'rgba(45,55,72,0.2)', borderRadius: radii.md, padding: '8px 10px', border: `1px solid ${colors.borderLight}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: colors.textDim, marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{stat.toUpperCase()}</span>
                                            <span>{statMod >= 0 ? '+' : ''}{statMod}</span>
                                        </div>
                                        {skills.map(s => (
                                            <div key={s.skill} onClick={() => setShowRollPicker({ label: s.skill.replace(/([A-Z])/g, ' $1').replace(/^./, x => x.toUpperCase()), mod: s.bonus, onRoll: (mode) => rollCheck(s.skill, s.bonus, mode) })}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px', cursor: 'pointer', borderRadius: radii.sm, background: s.isProf ? 'rgba(99,102,241,0.12)' : 'transparent' }}
                                                title={`${s.skill.replace(/([A-Z])/g, ' $1').replace(/^./, x => x.toUpperCase())}: ${s.bonus >= 0 ? '+' : ''}${s.bonus} = ${s.breakdown}`}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.isProf ? (s.isExpert ? '#f6e05e' : colors.accent) : 'transparent', border: s.isProf ? 'none' : `1px solid ${colors.textDim}` }} />
                                                    <span style={{ fontSize: '0.75rem', color: s.isProf ? '#fff' : colors.textLight }}>{s.skill.replace(/([A-Z])/g, ' $1').replace(/^./, x => x.toUpperCase())}</span>
                                                    {s.isExpert && <span style={{ fontSize: '0.55rem', color: '#f6e05e' }}>★</span>}
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: s.isProf ? '#f6e05e' : colors.textDim }}>{s.bonus >= 0 ? '+' : ''}{s.bonus}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PASSIVE SKILLS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: spacing.md, padding: '8px 12px', background: 'rgba(45,55,72,0.2)', borderRadius: radii.md, border: `1px solid ${colors.borderLight}` }}>
                        <span style={{ fontSize: '0.65rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>PASSIVE</span>
                        {[
                            { label: 'Perception', value: 10 + (live.skills.perception || 0) },
                            { label: 'Investigation', value: 10 + (live.skills.investigation || 0) },
                            { label: 'Insight', value: 10 + (live.skills.insight || 0) },
                        ].map(p => (
                            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: colors.textDim }}>{p.label}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f6e05e' }}>{p.value}</span>
                            </div>
                        ))}
                    </div>
                    </div>

                    {/* ─────── RIGHT COLUMN (tabbed) ─────── */}
                    <div style={{ flex: 1, padding: '16px 24px 16px 12px', display: 'flex', flexDirection: 'column', gap: spacing.sm }}>

                {/* TAB BAR */}
                <div style={{ display: 'flex', gap: '4px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '2px' }}>
                    {(['actions', 'spells', 'inventory', 'features', 'background', 'notes'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            style={{
                                background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'transparent',
                                border: 'none', color: activeTab === tab ? colors.gold : colors.textMuted,
                                padding: '6px 12px', borderRadius: `${radii.sm} ${radii.sm} 0 0`,
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                fontSize: '0.72rem', cursor: 'pointer',
                                borderBottom: activeTab === tab ? `2px solid ${colors.gold}` : '2px solid transparent',
                                marginBottom: '-2px', textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ─────── ACTIONS TAB ─────── */}
                {activeTab === 'actions' && (
                    <ErrorBoundary tabName="Actions">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ ...cardPanel, flex: 1, textAlign: 'center', padding: '10px' }}>
                                <div style={{ fontSize: '0.6rem', color: colors.textMuted, letterSpacing: '1px' }}>ATTACKS</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: colors.gold }}>1</div>
                            </div>
                            <div style={{ ...cardPanel, flex: 1, textAlign: 'center', padding: '10px' }}>
                                <div style={{ fontSize: '0.6rem', color: colors.textMuted, letterSpacing: '1px' }}>PROFICIENCY</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+{live.profBonus}</div>
                            </div>
                            <div style={{ ...cardPanel, flex: 1, textAlign: 'center', padding: '10px' }}>
                                <div style={{ fontSize: '0.6rem', color: colors.textMuted, letterSpacing: '1px' }}>INITIATIVE</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{live.modifiers.dex >= 0 ? '+' : ''}{live.modifiers.dex}</div>
                            </div>
                        </div>
                        {/* Weapon attacks from equipped items */}
                        {(() => {
                            const weaponTypes = ['M', 'R'];
                            const equippedItems = char.inventory.filter((i: any) => i.equipped);
                            const weapons = equippedItems.filter((i: any) => {
                                const type = (i.type || '').split('|')[0];
                                if (weaponTypes.includes(type)) return true;
                                const entriesStr = JSON.stringify(i.entries || '');
                                if (entriesStr.match(/\d+d\d+/)) return true;
                                return false;
                            });
                            const gear = equippedItems.filter((i: any) => !weapons.includes(i));
                            // Get full weapon info from library
                            const getWeaponLib = (item: any): any => {
                                const lib = findItemInLibrary(item.name);
                                return lib || item;
                            };
                            // Property label map
                            const PROP_LABELS: Record<string, string> = {
                                'F': 'Finesse', 'L': 'Light', 'H': 'Heavy', '2H': 'Two-Handed',
                                'V': 'Versatile', 'T': 'Thrown', 'Rch': 'Reach', 'A': 'Ammunition',
                                'LD': 'Loading', 'S': 'Special',
                            };
                            // Strip source suffix from property strings
                            const cleanProp = (p: string) => p.split('|')[0];
                            return (
                                <>
                                    {weapons.length > 0 && (
                                        <div style={cardPanel}>
                                            <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>EQUIPPED WEAPONS</div>
                                            {weapons.map((item: any) => {
                                                const lib = getWeaponLib(item);
                                                const props = (lib.property || []).map(cleanProp);
                                                const dmg = item.dmg1 || lib.dmg1 || '';
                                                const dmg2 = lib.dmg2 || '';
                                                const bonusWeaponStr = lib.bonusWeapon || '';
                                                const bonusWeapon = bonusWeaponStr ? parseInt(bonusWeaponStr) || 0 : 0;
                                                const range = lib.range || '';
                                                const dmgType = lib.dmgType || '';
                                                const weaponCat = lib.weaponCategory || '';
                                                const isFinesse = props.includes('F');
                                                const isRanged = (item.type || '').split('|')[0] === 'R';
                                                const isThrown = props.includes('T');
                                                // Determine attack ability
                                                let atkAbility: string;
                                                if (isRanged && !isThrown) {
                                                    atkAbility = 'dex';
                                                } else if (isFinesse) {
                                                    atkAbility = live.modifiers.str >= live.modifiers.dex ? 'str' : 'dex';
                                                } else {
                                                    atkAbility = 'str';
                                                }
                                                const atkMod = live.modifiers[atkAbility] || 0;
                                                const proficient = char.proficiencies?.some((p: string) =>
                                                    weaponCat && p.toLowerCase().includes(weaponCat.toLowerCase())
                                                ) || char.proficiencies?.some((p: string) => p.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])) || false;
                                                const profBonus = proficient ? live.profBonus : 0;
                                                const totalAtkBonus = atkMod + profBonus + bonusWeapon;
                                                // Two-weapon fighting: off-hand doesn't get ability mod to damage
                                                const isOffHand = item.slot === 'offHand';
                                                const dmgMod = isOffHand ? 0 : atkMod;
                                                const damageLabel = dmg + (dmgMod >= 0 ? `+${dmgMod}` : dmgMod);
                                                return (
                                                    <div key={item.id} style={{ padding: '8px 10px', background: colors.border, borderRadius: radii.sm, marginBottom: '4px' }}>
                                                        {/* Weapon name + properties */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <div>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: colors.gold }}>{item.name}</span>
                                                                {item.slot && <span style={{ fontSize: '0.6rem', color: colors.textDim, marginLeft: '6px', background: colors.bg, padding: '1px 5px', borderRadius: '3px' }}>{SLOT_LABELS[item.slot as PaperDollSlot]}</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                {props.map((p: string) => PROP_LABELS[p] && (
                                                                    <span key={p} style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(99,102,241,0.15)', borderRadius: '3px', color: colors.textMuted }}>{PROP_LABELS[p]}</span>
                                                                ))}
                                                                {bonusWeapon > 0 && <span style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(246,224,94,0.15)', borderRadius: '3px', color: colors.gold }}>+{bonusWeapon}</span>}
                                                                {(lib.mastery || []).map((m: string) => {
                                                                    const name = m.split('|')[0];
                                                                    const def = getMastery(name);
                                                                    return def ? (
                                                                        <span key={m} style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(239,68,68,0.15)', borderRadius: '3px', color: '#ef4444', cursor: 'default' }} title={def.description}>
                                                                            {def.name}
                                                                        </span>
                                                                    ) : (
                                                                        <span key={m} style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(239,68,68,0.15)', borderRadius: '3px', color: '#ef4444' }}>{name}</span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        {/* Stats row */}
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                                            {/* Attack roll */}
                                                            <button onClick={() => setShowRollPicker({ label: `${item.name} Attack`, mod: totalAtkBonus, onRoll: (mode) => { const r = rollD20WithAdvantage(mode, totalAtkBonus, `${item.name} attack`, 'weapon'); const ml = mode === 'advantage' ? ' (Adv)' : mode === 'disadvantage' ? ' (Dis)' : ''; setRollResult(`${item.name} Attack${ml}: ${r.rolls.join(', ')} + ${totalAtkBonus} = ${r.total}`); } })}
                                                                style={{ background: colors.accent, border: 'none', color: 'white', padding: '3px 10px', borderRadius: radii.sm, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                                                Atk +{totalAtkBonus}
                                                            </button>
                                                            {/* Damage roll (includes ability mod) */}
                                                            {dmg && <button onClick={() => {
                                                                const diceOnly = dmg.replace(/\+\d+/g, '');
                                                                const result = rollDice(diceOnly, `${item.name} damage`, 'weapon');
                                                                const total = result.total + dmgMod;
                                                                const parts = result.rolls.join(', ');
                                                                setRollResult(`${item.name} Damage: ${parts}${dmgMod >= 0 ? '+' : ''}${dmgMod} = ${total}`);
                                                            }} style={{ background: colors.gold, border: 'none', color: 'black', padding: '3px 10px', borderRadius: radii.sm, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                                                {dmg}{dmgMod >= 0 ? `+${dmgMod}` : dmgMod}
                                                            </button>}
                                                            {/* Versatile damage option */}
                                                            {dmg2 && (
                                                                <button onClick={() => {
                                                                    const result = rollDice(dmg2, `${item.name} (2H) damage`, 'weapon');
                                                                    const total = result.total + dmgMod;
                                                                    const parts = result.rolls.join(', ');
                                                                    setRollResult(`${item.name} (2H) Damage: ${parts}${dmgMod >= 0 ? '+' : ''}${dmgMod} = ${total}`);
                                                                }} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '3px 8px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>
                                                                    2H {dmg2}
                                                                </button>
                                                            )}
                                                            {/* Range info */}
                                                            {range && <span style={{ fontSize: '0.6rem', color: colors.textDim }}>{range} ft</span>}
                                                            <div style={{ flex: 1 }} />
                                                            <span style={{ fontSize: '0.6rem', color: colors.textMuted }}>
                                                                {isFinesse ? 'Finesse' : atkAbility.toUpperCase()} {proficient ? '' : '(unproficient)'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {gear.length > 0 && (
                                        <div style={cardPanel}>
                                            <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>EQUIPPED GEAR</div>
                                            {gear.map((item: any) => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: colors.border, borderRadius: radii.sm, marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.8rem' }}>{item.name}</span>
                                                    <button onClick={() => toggleItem(item.id)} style={{ background: colors.textDim, border: 'none', color: 'white', padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.65rem', cursor: 'pointer' }}>Unequip</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* SPELLS IN ACTIONS (prepared or known) */}
                                    {(() => {
                                        const spellNames = isPreparedCaster
                                            ? (char.spells?.prepared || [])
                                            : [...(char.spells?.known || []), ...(char.spells?.cantrips || [])];
                                        if (!spellNames.length) return null;
                                        if (spellDataLoading) {
                                            return <div style={cardPanel}><div style={{ fontSize: '0.7rem', color: colors.textMuted, fontStyle: 'italic' }}>Loading spells...</div></div>;
                                        }
                                        const actionSpells = spellNames.map(n => spellData[n]).filter(Boolean);
                                        if (!actionSpells.length) return null;
                                        const label = isPreparedCaster ? 'PREPARED SPELLS' : 'KNOWN SPELLS';
                                        return (
                                            <div style={cardPanel}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>{label}</div>
                                                    {isPreparedCaster && <span style={{ fontSize: '0.6rem', color: colors.textDim }}>{spellNames.length} / {maxPrepared}</span>}
                                                    {!isPreparedCaster && <span style={{ fontSize: '0.6rem', color: colors.textDim }}>{spellNames.length} known</span>}
                                                </div>
                                                {actionSpells.map(s => {
                                                    const lvl = s.level ?? 0;
                                                    const expended = isLevelExpended(lvl);
                                                    return (
                                                        <div key={s.name} style={{ background: 'rgba(45,55,72,0.25)', borderRadius: radii.sm, border: `1px solid ${colors.borderLight}`, borderLeft: `3px solid ${colors.accent}`, padding: '6px 10px', marginBottom: '4px', opacity: expended ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: colors.gold }}>{s.name}</span>
                                                                    <span style={{ fontSize: '0.6rem', color: colors.textDim, marginLeft: '6px' }}>
                                                                        {lvl === 0 ? 'Cantrip' : `Lv${lvl}`} {schoolLabel(s.school)}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    {s.duration?.some((d: any) => d.concentration) && <span style={{ fontSize: '0.55rem', color: '#f6e05e', border: '1px solid #f6e05e', borderRadius: '3px', padding: '1px 4px' }}>C</span>}
                                                                    <button onClick={() => setViewingSpell(s)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '2px 6px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>View</button>
                                                                    {(() => {
                                                                        if (lvl === 0 && !JSON.stringify(s.entries || '').match(/\d+d\d+/)) return null;
                                                                        if (upcastState !== null && upcastState.spellName === s.name) {
                                                                            return <>
                                                                                {upcastState.levels.map(l => (
                                                                                    <button key={l} onClick={() => { castSpellAtLevel(s, l); setUpcastState(null); }} style={{ background: colors.accent, border: 'none', color: 'white', padding: '2px 7px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer', fontWeight: 'bold' }}>L{l}</button>
                                                                                ))}
                                                                                <button onClick={() => setUpcastState(null)} style={{ background: 'transparent', border: `1px solid ${colors.textDim}`, color: colors.textMuted, padding: '2px 5px', borderRadius: radii.sm, fontSize: '0.55rem', cursor: 'pointer' }}>✕</button>
                                                                            </>;
                                                                        }
                                                                        return <button onClick={() => castSpell(s)} style={{ background: colors.gold, border: 'none', color: 'black', padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>Cast</button>;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: '0.6rem', color: colors.textDim, marginTop: '2px', display: 'flex', gap: '8px' }}>
                                                                <span>{formatTime(s.time)}</span>
                                                                <span>{formatRange(s.range)}</span>
                                                                <span>{componentLabel(s.components)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </>
                            );
                        })()}
                        {/* Bonus actions section */}
                        <div style={cardPanel}>
                            <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>BONUS ACTIONS</div>
                            <p style={{ fontSize: '0.75rem', color: colors.textDim, fontStyle: 'italic' }}>Uses determined by active features and spells.</p>
                        </div>
                        {/* Reactions */}
                        <div style={cardPanel}>
                            <div style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>REACTIONS</div>
                            <p style={{ fontSize: '0.75rem', color: colors.textDim, fontStyle: 'italic' }}>Reactions available per round.</p>
                        </div>
                    </div>
                    </ErrorBoundary>
                )}

                {/* ─────── SPELLS TAB (GRIMOIRE) ─────── */}
                {activeTab === 'spells' && (
                    <ErrorBoundary tabName="Spells">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                        {/* Spell Slots & Concentration (compact) */}
                        {char.spellSlots && Object.keys(char.spellSlots).length > 0 && (
                            <div style={{ ...cardPanel, padding: '10px 12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                                    <span style={{ fontWeight: 'bold' }}>SPELL SLOTS</span>
                                    {classInfo && (
                                        <span style={{ color: colors.textMuted }}>DC {getSpellSaveDC(char, classInfo)} · Atk +{live.modifiers[getSpellcastingAbility(classInfo)] + live.profBonus}</span>
                                    )}
                                </div>
                                {char.concentratingOn && (
                                    <div style={{ margin: '6px 0', padding: '4px 8px', background: 'rgba(99,102,241,0.2)', borderRadius: radii.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                        <span><strong style={{ color: '#f6e05e' }}>C</strong> {char.concentratingOn}</span>
                                        <span style={{ fontSize: '0.6rem', color: colors.textDim }}>Concentration active</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                    {Object.entries(char.spellSlots).map(([lvl, slot]) => {
                                        const s = slot as { max: number; used: number };
                                        const available = s.max - s.used;
                                        return (
                                            <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '0.65rem', color: colors.textMuted }}>Lv{lvl}{classInfo?.casterProgression === 'pact' ? ' (Pact)' : ''}</span>
                                                <div style={{ display: 'flex', gap: '3px' }} onClick={() => useSlot(Number(lvl))} title="Click to use slot">
                                                    {Array.from({ length: s.max }).map((_, i) => (
                                                        <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: i < s.used ? colors.textDim : colors.accent, border: `2px solid ${i < s.used ? colors.textDim : colors.accent}`, cursor: 'pointer', transition: '0.15s' }} />
                                                    ))}
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: colors.textDim }}>{available}/{s.max}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Defiling (campaign module) */}
                        {activeModules.includes('defiling') && (
                            <div style={{ ...cardPanel, border: '1px solid #e53e3e' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#e53e3e' }}>DEFILING MAGIC (Dark Sun)</h4>
                                <p style={{ fontSize: '0.75rem', color: '#cbd5e0', margin: 0 }}>
                                    You may defile the land when casting. Each spell level deals {campaignModuleConfig?.defiling?.damagePerSpellLevel || 1} damage per level to plants and creatures within {campaignModuleConfig?.defiling?.radiusPerLevel || 10} ft/level.
                                </p>
                            </div>
                        )}

                        {/* GRIMOIRE */}
                        <div style={cardPanel}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem' }}>GRIMOIRE</h4>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {isPreparedCaster && (
                                        <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
                                            {(char.spells?.prepared || []).length}/{maxPrepared} prepared
                                        </span>
                                    )}
                                    <button onClick={() => setShowManageSpells(true)} style={{ background: colors.accent, border: 'none', color: 'white', padding: '3px 10px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Manage Spells
                                    </button>
                                </div>
                            </div>
                            {/* Level filter pills */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <button onClick={() => setSpellLevelFilter('all')} style={{
                                    background: spellLevelFilter === 'all' ? colors.accent : 'transparent',
                                    border: `1px solid ${spellLevelFilter === 'all' ? colors.accent : colors.border}`,
                                    color: spellLevelFilter === 'all' ? 'white' : colors.textMuted,
                                    padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer', fontWeight: spellLevelFilter === 'all' ? 'bold' : 'normal',
                                }}>ALL</button>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
                                    const hasSpells = Object.values(spellData).some(s => s && s.level === lvl);
                                    if (!hasSpells) return null;
                                    return (
                                        <button key={lvl} onClick={() => setSpellLevelFilter(lvl)} style={{
                                            background: spellLevelFilter === lvl ? colors.accent : 'transparent',
                                            border: `1px solid ${spellLevelFilter === lvl ? colors.accent : colors.border}`,
                                            color: spellLevelFilter === lvl ? 'white' : colors.textMuted,
                                            padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer', fontWeight: spellLevelFilter === lvl ? 'bold' : 'normal',
                                        }}>{lvl === 0 ? 'C' : `${lvl}${ordinalSuffix(lvl)}`}</button>
                                    );
                                })}
                                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: colors.textMuted, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={showPreparedOnly} onChange={e => setShowPreparedOnly(e.target.checked)} style={{ accentColor: colors.accent }} />
                                    Prepared only
                                </label>
                            </div>
                            {/* Spell cards grouped by level */}
                            {(() => {
                                const grouped = groupSpellsByLevel(spellData);
                                const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b);
                                const isPreparedView = isPreparedCaster;
                                const spellNames = new Set([
                                    ...(char.spells?.cantrips || []),
                                    ...(char.spells?.known || []),
                                    ...(char.spells?.prepared || []),
                                ]);
                                const preparedSet = new Set(char.spells?.prepared || []);
                                const knownSet = new Set(char.spells?.known || []);

                                return levels.map(lvl => {
                                    if (spellLevelFilter !== 'all' && spellLevelFilter !== lvl) return null;
                                    const spells = grouped[lvl];
                                    const filtered = showPreparedOnly && isPreparedView
                                        ? spells.filter(s => preparedSet.has(s.name))
                                        : spells;

                                    if (filtered.length === 0) return null;
                                    return (
                                        <div key={lvl} style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '0.65rem', color: colors.gold, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '4px' }}>
                                                {lvl === 0 ? 'CANTRIPS' : `${lvl}${ordinalSuffix(lvl)} LEVEL`}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {filtered.map(s => {
                                                    const isPrepared = preparedSet.has(s.name);
                                                    const isKnown = knownSet.has(s.name) || isPrepared;
                                                    const isExpanded = expandedSpell === s.name;
                                                    return (
                                                        <div key={s.name} style={{
                                                            background: 'rgba(45,55,72,0.25)',
                                                            borderRadius: radii.md,
                                                            border: `1px solid ${isPrepared ? colors.accent : colors.borderLight}`,
                                                            borderLeft: `3px solid ${isPrepared ? colors.accent : 'transparent'}`,
                                                            overflow: 'hidden', transition: '0.15s',
                                                            opacity: isLevelExpended(lvl) ? 0.4 : 1,
                                                        }}>
                                                            {/* Card header */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', cursor: 'pointer' }}
                                                                onClick={() => setExpandedSpell(isExpanded ? null : s.name)}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {isPreparedCaster && (
                                                                        <div onClick={(e) => { e.stopPropagation(); togglePrepare(s.name); }}
                                                                            style={{ width: '16px', height: '16px', borderRadius: '3px', background: isPrepared ? colors.accent : 'transparent', border: `2px solid ${isPrepared ? colors.accent : colors.textDim}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', flexShrink: 0 }}>
                                                                            {isPrepared ? '✓' : ''}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: colors.gold }}>{s.name}</span>
                                                                        <span style={{ fontSize: '0.6rem', color: colors.textDim, marginLeft: '6px' }}>
                                                                            {lvl === 0 ? 'Cantrip' : `${lvl}${ordinalSuffix(lvl)}-level`} {schoolLabel(s.school)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    {s.duration?.some((d: any) => d.concentration) && <span style={{ fontSize: '0.55rem', color: '#f6e05e', border: '1px solid #f6e05e', borderRadius: '3px', padding: '1px 4px' }}>C</span>}
                                                                    {s.meta?.ritual && <span style={{ fontSize: '0.55rem', color: colors.textMuted, border: `1px solid ${colors.textDim}`, borderRadius: '3px', padding: '1px 4px' }}>R</span>}
                                                                    {(() => {
                                                                        if (lvl === 0 && !JSON.stringify(s.entries || '').match(/\d+d\d+/)) return null;
                                                                        if (upcastState !== null && upcastState.spellName === s.name) {
                                                                            return <>
                                                                                {upcastState.levels.map(l => (
                                                                                    <button key={l} onClick={(e) => { e.stopPropagation(); castSpellAtLevel(s, l); setUpcastState(null); }} style={{ background: colors.accent, border: 'none', color: 'white', padding: '2px 7px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer', fontWeight: 'bold' }}>L{l}</button>
                                                                                ))}
                                                                                <button onClick={(e) => { e.stopPropagation(); setUpcastState(null); }} style={{ background: 'transparent', border: `1px solid ${colors.textDim}`, color: colors.textMuted, padding: '2px 5px', borderRadius: radii.sm, fontSize: '0.55rem', cursor: 'pointer' }}>✕</button>
                                                                            </>;
                                                                        }
                                                                        return <button onClick={(e) => { e.stopPropagation(); castSpell(s); }} style={{ background: colors.gold, border: 'none', color: 'black', padding: '2px 7px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer', fontWeight: 'bold' }}>Cast</button>;
                                                                    })()}
                                                                    <span style={{ fontSize: '0.65rem', color: colors.textDim }}>{isExpanded ? '▾' : '▸'}</span>
                                                                </div>
                                                            </div>
                                                            {/* Metadata row */}
                                                            <div style={{ padding: '0 10px 6px 10px', fontSize: '0.65rem', color: colors.textDim, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                                <span>{formatTime(s.time)}</span>
                                                                <span>{formatRange(s.range)}</span>
                                                                <span style={{ color: s.components?.m ? colors.textLight : colors.textDim }}>{componentLabel(s.components)}</span>
                                                                <span>{formatDuration(s.duration)}</span>
                                                            </div>
                                                            {/* Expanded description */}
                                                            {isExpanded && (
                                                                <div style={{ padding: '0 10px 10px 10px', borderTop: `1px solid ${colors.borderLight}`, marginTop: '2px', paddingTop: '8px', fontSize: '0.75rem', lineHeight: 1.5, color: colors.textLight }}>
                                                                    {s.entries ? formatEntries(s.entries) : <span style={{ fontStyle: 'italic', color: colors.textDim }}>No description available.</span>}
                                                                    {s.entriesHigherLevel && (
                                                                        <div style={{ marginTop: '8px', borderTop: `1px solid ${colors.borderLight}`, paddingTop: '6px' }}>
                                                                            {formatEntries(s.entriesHigherLevel)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            {Object.keys(spellData).length === 0 && !spellDataLoading && (
                                <div style={{ fontSize: '0.75rem', color: colors.textDim, fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                                    No spells known. Visit the Level Up wizard to learn spells.
                                </div>
                            )}
                            {spellDataLoading && (
                                <div style={{ fontSize: '0.75rem', color: colors.textDim, textAlign: 'center', padding: '20px' }}>
                                    Loading spell data...
                                </div>
                            )}
                        </div>

                        {spellDcInfo && (
                            <div style={{ background: colors.accent, padding: '8px 12px', borderRadius: radii.sm, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{spellDcInfo}</span>
                                <button onClick={() => setSpellDcInfo(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
                            </div>
                        )}
                    </div>
                    </ErrorBoundary>
                )}

                {/* ─────── INVENTORY TAB ─────── */}
                {activeTab === 'inventory' && (
                    <ErrorBoundary tabName="Inventory">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                        {/* Weight & Load */}
                        {(() => {
                            const totalWeight = char.inventory.reduce((sum: number, i: any) => sum + ((i.weight || 0) * (i.quantity || 1)), 0);
                            const load = computeLoad(char);
                            const strScore = char.baseStats.str;
                            const encThresholds = { light: strScore * 5, medium: strScore * 10, heavy: strScore * 15 };
                            const pct = encThresholds.heavy > 0 ? (totalWeight / encThresholds.heavy) * 100 : 0;
                            return (
                                <div style={cardPanel}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', color: colors.textMuted, fontWeight: 'bold' }}>{load.label}</span>
                                        <span style={{ fontSize: '0.7rem', color: load.color }}>{totalWeight.toFixed(1)} / {encThresholds.heavy} lbs</span>
                                    </div>
                                    <div style={{ height: '6px', background: colors.bg, borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: load.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', color: colors.textDim }}>
                                        <span>Speed: {load.speedMod >= 0 ? '+' : ''}{load.speedMod}ft</span>
                                        <span>Stealth: {load.stealthDisadv ? 'Disadvantage' : 'Normal'}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Currency */}
                        {char.currency && (
                            <div style={{ ...cardPanel, display: 'flex', justifyContent: 'space-around', padding: '8px 10px' }}>
                                {Object.entries(char.currency).map(([coin, amount]) => (
                                    <div key={coin} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: colors.gold }}>{amount}</div>
                                        <div style={{ fontSize: '0.55rem', color: colors.textMuted }}>{coin.toUpperCase()}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Main layout: Paper Doll + Backpack */}
                        <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
                            {/* Paper Doll */}
                            <div style={{ ...cardPanel, flex: '0 0 340px' }}>
                                <div style={flexBetween}>
                                    <h4 style={{ margin: 0, fontSize: '0.8rem' }}>EQUIPPED</h4>
                                    <button onClick={openSearch} style={{ background: colors.gold, border: 'none', color: 'black', padding: '3px 10px', borderRadius: radii.sm, fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
                                </div>
                                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                    {/* Hotbar row - spans full width */}
                                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid ' + colors.border }}>
                                        {(['mainHand', 'offHand', 'ranged'] as PaperDollSlot[]).map(slot => {
                                            const item = char.inventory.find((i: any) => i.equipped && i.slot === slot);
                                            return (
                                                <div key={slot} onClick={() => item && toggleItem(item.id)}
                                                    style={{ padding: '8px', background: item ? 'rgba(99,102,241,0.15)' : colors.bg, border: `1px dashed ${item ? colors.accent : colors.border}`, borderRadius: radii.sm, cursor: item ? 'pointer' : 'default', minHeight: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) toggleItem(id, slot); }}
                                                >
                                                    <div style={{ fontSize: '0.55rem', color: colors.textDim, marginBottom: '2px' }}>{SLOT_LABELS[slot]}</div>
                                                    {item ? (
                                                        <span style={{ fontSize: '0.7rem', color: colors.gold }}>{item.name}</span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.6rem', color: colors.textDim }}>Empty</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Body slots - 3 columns */}
                                    {(['head', 'face', 'neck', 'shoulders', 'torso', 'back', 'wrists', 'hands', 'ring1', 'ring2', 'waist', 'feet'] as PaperDollSlot[]).map(slot => {
                                        const item = char.inventory.find((i: any) => i.equipped && i.slot === slot);
                                        return (
                                            <div key={slot} onClick={() => item && toggleItem(item.id)}
                                                style={{ padding: '8px', background: item ? 'rgba(99,102,241,0.1)' : colors.bg, border: `1px dashed ${item ? colors.accent : colors.border}`, borderRadius: radii.sm, cursor: item ? 'pointer' : 'default', minHeight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) toggleItem(id, slot); }}
                                            >
                                                <div style={{ fontSize: '0.55rem', color: colors.textDim, marginBottom: '2px' }}>{SLOT_LABELS[slot]}</div>
                                                {item ? (
                                                    <span style={{ fontSize: '0.65rem', color: colors.gold }}>{item.name}</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.55rem', color: colors.textDim }}>—</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Backpack Grid */}
                            <div style={{ ...cardPanel, flex: 1 }}>
                                <div style={flexBetween}>
                                    <h4 style={{ margin: 0, fontSize: '0.8rem' }}>BACKPACK</h4>
                                    <button onClick={openSearch} style={{ background: colors.gold, border: 'none', color: 'black', padding: '3px 10px', borderRadius: radii.sm, fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
                                </div>
                                {char.inventory.filter((i: any) => !i.equipped).length === 0 && (
                                    <div style={{ fontSize: '0.7rem', color: colors.textDim, fontStyle: 'italic', marginTop: '6px' }}>Backpack is empty.</div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                                    {char.inventory.filter((i: any) => !i.equipped).map((item: any, idx: number) => (
                                        <div key={item.id}
                                            draggable
                                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); }}
                                            style={{ background: colors.border, padding: '6px 10px', borderRadius: radii.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'grab' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                <span style={{ color: colors.textDim, fontSize: '0.6rem', cursor: 'grab' }}>⠿</span>
                                                <span onClick={() => setViewingItem(item)} style={{ cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                                {(item.quantity && item.quantity > 1) && <span style={{ fontSize: '0.6rem', color: colors.textMuted, flexShrink: 0 }}>×{item.quantity}</span>}
                                                {item.slot && <span style={{ fontSize: '0.55rem', color: colors.textDim, flexShrink: 0, background: colors.bg, padding: '1px 5px', borderRadius: '3px' }}>{SLOT_LABELS[item.slot as PaperDollSlot]}</span>}
                                            </div>
                                            {equippingItemId === item.id ? (
                                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                                    {getValidSlots(item).map(slot => (
                                                        <button key={slot} onClick={() => { toggleItem(item.id, slot); setEquippingItemId(null); }}
                                                            style={{ background: colors.accent, border: 'none', color: 'white', padding: '3px 6px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>
                                                            {SLOT_LABELS[slot]}
                                                        </button>
                                                    ))}
                                                    <button onClick={() => setEquippingItemId(null)} style={{ background: colors.textDim, border: 'none', color: 'white', padding: '3px 6px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>×</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setEquippingItemId(item.id)} style={{ background: colors.success, border: 'none', color: 'white', padding: '3px 10px', borderRadius: radii.sm, fontSize: '0.65rem', cursor: 'pointer', flexShrink: 0 }}>
                                                    Equip
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {/* Mule Nearby: show stash items */}
                                    {isMuleNearby() && (() => {
                                        const stash = loadStash();
                                        return stash.map((stashItem: any) => (
                                            <div key={stashItem.id}
                                                style={{ background: 'rgba(99,102,241,0.1)', padding: '6px 10px', borderRadius: radii.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #6366f1' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                    <span style={{ color: '#6366f1', fontSize: '0.6rem' }}>📦</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>{stashItem.name}</span>
                                                    {(stashItem.quantity && stashItem.quantity > 1) && <span style={{ fontSize: '0.6rem', color: colors.textMuted, flexShrink: 0 }}>×{stashItem.quantity}</span>}
                                                    <span style={{ fontSize: '0.55rem', color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '1px 5px', borderRadius: '3px', flexShrink: 0 }}>Stash</span>
                                                </div>
                                                <span style={{ fontSize: '0.55rem', color: '#4a5568' }}>{stashItem.weight ? `${stashItem.weight} lb` : ''}</span>
                                            </div>
                                        ));
                                    })()}
                                    {/* Obscured (hidden) items from DM */}
                                    {char.id && getObscuredForCharacter(char.id).length > 0 && (() => {
                                        const obscured = getObscuredForCharacter(char.id);
                                        return (
                                            <>
                                                <div style={{ fontSize: '0.65rem', color: '#e53e3e', fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>
                                                    UNCERTAIN ITEMS ({obscured.filter(i => !i.identified).length})
                                                </div>
                                                {obscured.filter(i => !i.identified).map(item => (
                                                    <div key={item.id}
                                                        style={{ background: 'rgba(229,62,62,0.08)', padding: '6px 10px', borderRadius: radii.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #e53e3e' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                            <span style={{ color: '#e53e3e', fontSize: '0.7rem' }}>?</span>
                                                            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#fc8181' }}>{item.displayName}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.55rem', color: '#718096' }}>Unidentified</span>
                                                    </div>
                                                ))}
                                                {obscured.filter(i => i.identified).map(item => (
                                                    <div key={item.id}
                                                        style={{ background: 'rgba(72,187,120,0.08)', padding: '6px 10px', borderRadius: radii.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #48bb78' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                            <span style={{ color: '#48bb78', fontSize: '0.7rem' }}>✓</span>
                                                            <span style={{ fontSize: '0.75rem', color: '#68d391' }}>{item.trueName}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.55rem', color: '#48bb78' }}>Identified</span>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Attunement */}
                        <div style={cardPanel}>
                            <div style={flexBetween}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem' }}>ATTUNEMENT</h4>
                                <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>{(char.inventory as any[]).filter(i => i.attuned).length} / {char.attunementSlots || 3}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
                                {Array.from({ length: char.attunementSlots || 3 }).map((_, i) => (
                                    <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: i < (char.inventory as any[]).filter(it => it.attuned).length ? colors.accent : 'transparent', border: `2px solid ${colors.border}` }} />
                                ))}
                            </div>
                            {(char.inventory as any[]).filter(i => i.attuned).length === 0 && (
                                <div style={{ fontSize: '0.7rem', color: colors.textDim, fontStyle: 'italic' }}>No attuned items.</div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(char.inventory as any[]).filter(i => i.attuned).map((item: any) => (
                                    <div key={item.id} style={{ background: colors.border, padding: '6px 10px', borderRadius: radii.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem' }}>{item.name}</span>
                                        <button onClick={() => setChar((prev: any) => ({ ...prev, inventory: prev.inventory.map((it: any) => it.id === item.id ? { ...it, attuned: false } : it) }))} style={{ background: colors.textDim, border: 'none', color: 'white', padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.65rem', cursor: 'pointer' }}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </ErrorBoundary>
                )}

                {/* ─────── FEATURES TAB ─────── */}
                {activeTab === 'features' && (
                    <ErrorBoundary tabName="Features">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                        {/* Class Resources */}
                        {char.resources && Object.keys(char.resources).length > 0 && (
                            <div style={cardPanel}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem' }}>CLASS RESOURCES</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Object.entries(char.resources).map(([key, res]) => {
                                        // Parse namespaced key: "ClassName:resourceKey"
                                        const colonIdx = key.indexOf(':');
                                        const sourceClass = colonIdx > 0 ? key.slice(0, colonIdx) : null;
                                        return (
                                        <div key={key} style={{
                                            background: 'rgba(99,102,241,0.1)',
                                            border: '1px solid rgba(99,102,241,0.3)',
                                            borderRadius: radii.sm,
                                            padding: '8px 12px',
                                            minWidth: '100px',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '0.65rem', color: colors.textDim, marginBottom: '2px' }}>{res.shortLabel || res.label}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <button
                                                    onClick={() => setChar(prev => ({
                                                        ...prev,
                                                        resources: {
                                                            ...prev.resources,
                                                            [key]: { ...res, current: Math.max(0, res.current - 1) }
                                                        }
                                                    }))}
                                                    style={{ background: 'none', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '50%', width: '24px', height: '24px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                >−</button>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
                                                    {res.current}/{res.max}
                                                </span>
                                                <button
                                                    onClick={() => setChar(prev => ({
                                                        ...prev,
                                                        resources: {
                                                            ...prev.resources,
                                                            [key]: { ...res, current: Math.min(res.max, res.current + 1) }
                                                        }
                                                    }))}
                                                    style={{ background: 'none', border: '1px solid #48bb78', color: '#48bb78', borderRadius: '50%', width: '24px', height: '24px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                >+</button>
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: colors.textDim, marginTop: '2px' }}>{sourceClass ? `${sourceClass} · ` : ''}{res.refreshOn === 'short' ? 'Short Rest' : 'Long Rest'}</div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* Class Feature Picks */}
                        {char.classFeaturePicks && Object.keys(char.classFeaturePicks).length > 0 && (
                            <div style={cardPanel}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>FEATURE CHOICES</h4>
                                {Object.entries(char.classFeaturePicks).map(([key, picks]) => {
                                    // Parse namespaced key: "ClassName:pickKey"
                                    const colonIdx = key.indexOf(':');
                                    const displayKey = colonIdx > 0 ? key.slice(colonIdx + 1) : key;
                                    const sourceClass = colonIdx > 0 ? key.slice(0, colonIdx) : null;
                                    return (
                                    <div key={key} style={{ marginBottom: '6px' }}>
                                        <div style={{ fontSize: '0.65rem', color: colors.textDim, textTransform: 'capitalize', marginBottom: '2px' }}>
                                            {displayKey.replace(/([A-Z])/g, ' $1').trim()}{sourceClass ? <span style={{ color: colors.textMuted, fontSize: '0.6rem', textTransform: 'none' }}> ({sourceClass})</span> : null}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {(picks as string[]).map(p => {
                                                const feat = findFeatureByName(p);
                                                return (
                                                <span key={p} onClick={() => feat ? setViewingFeature(feat) : setViewingFeature({ name: p, level: 0, source: 'Feature', entries: null })}
                                                    style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(246,224,94,0.1)', border: '1px solid rgba(246,224,94,0.3)', borderRadius: radii.sm, color: colors.gold, cursor: 'pointer' }}>{p}</span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Race traits */}
                        {raceData && raceData.entries && raceData.entries.length > 0 && (
                            <div style={cardPanel}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: colors.gold }}>RACIAL TRAITS ({raceData.name})</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {raceData.entries.filter((e: any) => typeof e === 'object' && e.name).map((trait: any, i: number) => (
                                        <div key={i} onClick={() => setViewingFeature({ name: trait.name, level: 1, source: raceData.name, entries: trait.entries || trait.entry })}
                                            style={{ fontSize: '0.78rem', padding: '6px 8px', borderRadius: radii.sm, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                            <span style={{ color: colors.gold }}>{trait.name}</span>
                                            <span style={{ fontSize: '0.6rem', color: colors.textDim }}>Racial</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Class features */}
                        {char.features && char.features.length > 0 && (
                            <div style={cardPanel}>
                                <div style={flexBetween}>
                                    <h4 style={{ margin: 0, fontSize: '0.85rem' }}>CLASS FEATURES</h4>
                                    <span style={{ fontSize: '0.65rem', color: colors.textDim }}>{char.features.length}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                                    {char.features.map((f: any, i: number) => (
                                        <div key={i} onClick={() => setViewingFeature(f)}
                                            style={{ fontSize: '0.78rem', padding: '6px 8px', borderRadius: radii.sm, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                                            title="Click for details">
                                            <div>
                                                <span style={{ color: colors.gold }}>{f.name}</span>
                                                <span style={{ fontSize: '0.6rem', color: colors.textDim, marginLeft: '8px' }}>{f.source}</span>
                                            </div>
                                            <span style={{ fontSize: '0.6rem', color: colors.textDim }}>Lv{f.level}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Campaign Module Sections */}
                        <PietySection char={char} onCharChange={setChar} enabled={activeModules.includes('piety')} />
                        <RenownSection char={char} onCharChange={setChar} enabled={activeModules.includes('renown')} />
                        <DarkGiftsSection char={char} onCharChange={setChar} enabled={activeModules.includes('darkGifts')} moduleConfig={campaignModuleConfig} />
                        <EpicBoonsSection char={char} onCharChange={setChar} enabled={activeModules.includes('epicBoons')} moduleConfig={campaignModuleConfig} />
                        <HeroPointsSection char={char} onCharChange={setChar} enabled={activeModules.includes('heroPoints')} moduleConfig={campaignModuleConfig} />
                        <StressFearSection char={char} onCharChange={setChar} enabled={activeModules.includes('stressFear')} />
                         <MadnessSection char={char} onCharChange={setChar} enabled={activeModules.includes('madness')} />
                         <TransformationsSection char={char} onCharChange={setChar} enabled={activeModules.includes('transformations')} moduleConfig={campaignModuleConfig} />
                         <DefilingSection char={char} onCharChange={setChar} enabled={activeModules.includes('defiling')} />
                         <GroupPatronsSection char={char} onCharChange={setChar} enabled={activeModules.includes('groupPatrons')} />
                         <ShipMoraleSection char={char} onCharChange={setChar} enabled={activeModules.includes('shipMorale')} />
                          <SidekicksSection char={char} onCharChange={setChar} enabled={activeModules.includes('sidekicks')} />
                          <IsekaiSection char={char} onCharChange={setChar} enabled={activeModules.includes('isekai')} moduleConfig={campaignModuleConfig} />

                          {/* Proficiencies summary */}
                        {char.proficiencies && char.proficiencies.length > 0 && (
                            <div style={cardPanel}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>PROFICIENCIES</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {char.proficiencies.map(p => (
                                        <span key={p} style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(99,102,241,0.15)', borderRadius: radii.sm, color: colors.textLight }}>{p.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {char.expertise && char.expertise.length > 0 && (
                            <div style={cardPanel}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>EXPERTISE</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {char.expertise.map(p => (
                                        <span key={p} style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(246,224,94,0.15)', borderRadius: radii.sm, color: '#f6e05e' }}>{p.replace(/([A-Z])/g, ' $1').trim()} ★</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    </ErrorBoundary>
                )}

                {/* ─────── BACKGROUND TAB ─────── */}
                {activeTab === 'background' && (
                    <ErrorBoundary tabName="Background">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                        {char.background && (
                            <div style={cardPanel}>
                                <h4 style={{ margin: 0, fontSize: '0.8rem' }}>BACKGROUND</h4>
                                <p style={{ fontSize: '0.8rem', color: colors.textLight, margin: '6px 0 0 0' }}>{char.background}</p>
                            </div>
                        )}
                        {/* Background feature/description */}
                        {bgData && bgData.entries && (
                            <div style={cardPanel}>
                                <div style={{ fontSize: '0.75rem', lineHeight: 1.5, color: colors.textLight }}>
                                    {bgData.entries.filter((e: any) => typeof e === 'object' && e.name).map((entry: any, i: number) => (
                                        <div key={i} style={{ marginBottom: '8px' }}>
                                            {formatEntries(entry)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Campaign selector */}
                        <CampaignSelector char={char} onCharChange={setChar} />

                        {/* Physical description */}
                        <div style={cardPanel}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem' }}>PHYSICAL DESCRIPTION</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                {(['age', 'height', 'weight', 'hair', 'eyes', 'skin'] as const).map(field => (
                                    <div key={field}>
                                        <div style={{ fontSize: '0.6rem', color: colors.textMuted, marginBottom: '2px' }}>{field.toUpperCase()}</div>
                                        <input value={char.physical?.[field] || ''} onChange={e => setChar(prev => ({ ...prev, physical: { ...(prev.physical || {} as any), [field]: e.target.value } }))}
                                            style={{ width: '100%', background: colors.bgPanel, border: `1px solid ${colors.border}`, color: 'white', padding: '4px 6px', borderRadius: radii.sm, fontSize: '0.75rem' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Personality */}
                        {(['personalityTraits', 'ideals', 'bonds', 'flaws'] as const).map(field => (
                            <div key={field} style={cardPanel}>
                                <div style={{ fontSize: '0.6rem', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                                <textarea value={(char as any)[field] || ''} onChange={e => setChar(prev => ({ ...prev, [field]: e.target.value }))}
                                    style={{ width: '100%', minHeight: '50px', background: colors.bgPanel, border: `1px solid ${colors.border}`, color: 'white', padding: '6px', borderRadius: radii.sm, fontSize: '0.75rem', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                        ))}
                    </div>
                    </ErrorBoundary>
                )}

                {/* ─────── NOTES TAB ─────── */}
                {activeTab === 'notes' && (
                    <ErrorBoundary tabName="Notes">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                        <div style={cardPanel}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>BACKSTORY</h4>
                            <textarea value={char.backstory || ''} onChange={e => setChar(prev => ({ ...prev, backstory: e.target.value }))}
                                placeholder="Write your character's backstory..."
                                style={{ width: '100%', minHeight: '100px', background: colors.bgPanel, border: `1px solid ${colors.border}`, color: 'white', padding: '8px', borderRadius: radii.sm, fontSize: '0.75rem', resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        {(['organizations', 'allies', 'enemies'] as const).map(listName => (
                            <div key={listName} style={cardPanel}>
                                <div style={flexBetween}>
                                    <h4 style={{ margin: 0, fontSize: '0.8rem' }}>{listName.toUpperCase()}</h4>
                                    <button onClick={() => {
                                        const current = [...((char as any)[listName] || [])];
                                        current.push('');
                                        setChar(prev => ({ ...prev, [listName]: current }));
                                    }} style={{ background: colors.accent, border: 'none', color: 'white', padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.65rem', cursor: 'pointer' }}>+ Add</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                    {((char as any)[listName] || []).map((entry: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: '4px' }}>
                                            <input value={entry} onChange={e => {
                                                const updated = [...((char as any)[listName] || [])];
                                                updated[i] = e.target.value;
                                                setChar(prev => ({ ...prev, [listName]: updated }));
                                            }} style={{ flex: 1, background: colors.bgPanel, border: `1px solid ${colors.border}`, color: 'white', padding: '4px 6px', borderRadius: radii.sm, fontSize: '0.75rem' }} placeholder="Name..." />
                                            <button onClick={() => {
                                                const updated = [...((char as any)[listName] || [])];
                                                updated.splice(i, 1);
                                                setChar(prev => ({ ...prev, [listName]: updated }));
                                            }} style={{ background: 'transparent', border: `1px solid ${colors.danger}`, color: colors.danger, borderRadius: radii.sm, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem' }}>×</button>
                                        </div>
                                    ))}
                                    {((char as any)[listName] || []).length === 0 && (
                                        <div style={{ fontSize: '0.7rem', color: colors.textDim, fontStyle: 'italic' }}>No entries yet.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div style={cardPanel}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}>NOTES</h4>
                            <textarea value={char.notes || ''} onChange={e => setChar(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Any additional notes..."
                                style={{ width: '100%', minHeight: '80px', background: colors.bgPanel, border: `1px solid ${colors.border}`, color: 'white', padding: '8px', borderRadius: radii.sm, fontSize: '0.75rem', resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                    </div>
                    </ErrorBoundary>
                )}
                    </div>
                </div>
            </> )}

            {/* MODALS (Search & View) */}
            {isSearching && (
                <div style={modalOverlay}>
                    <div style={{ background: colors.bgCard, padding: spacing.md, borderRadius: radii.md, width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <h3>Item Library</h3>
                        <input placeholder="Search..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} style={{ ...localInput, width: '100%', marginBottom: spacing.sm }} />
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {allLibraryItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 20).map((i, idx) => (
                                <div key={`${i.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>
                                    <span style={{ fontSize: '0.85rem' }}>{i.name}</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => setViewingItem(i)} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>View</button>
                                        <button onClick={() => addItemFromLibrary(i)} style={{ padding: '2px 6px', fontSize: '0.7rem', background: colors.success }}>Add</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setIsSearching(false)} style={{ marginTop: spacing.sm, background: colors.danger }}>Close</button>
                    </div>
                </div>
            )}

            <SpellDetailModal spell={viewingSpell} onClose={() => setViewingSpell(null)} />

            {viewingFeature && (
                <div style={modalOverlay}>
                    <div style={{ background: '#1a1a1a', padding: spacing.lg, borderRadius: radii.md, width: '500px', maxHeight: '80vh', overflowY: 'auto', border: `2px solid ${colors.gold}` }}>
                        <h2 style={{ color: colors.gold, borderBottom: `1px solid ${colors.gold}`, paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{viewingFeature.name}</span>
                            <span style={{ fontSize: '0.8rem', color: colors.textDim, fontWeight: 'normal' }}>Lv{viewingFeature.level} · {viewingFeature.source}</span>
                        </h2>
                        <div style={{ margin: '20px 0', fontSize: '0.9rem', lineHeight: '1.5', color: colors.textLight }}>
                            {viewingFeature.entries ? formatEntries(viewingFeature.entries) : <p style={{ color: colors.textDim, fontStyle: 'italic' }}>No description available.</p>}
                        </div>
                        <button onClick={() => setViewingFeature(null)} style={{ width: '100%', background: colors.gold, border: 'none', color: 'white', padding: '10px', borderRadius: radii.sm, cursor: 'pointer' }}>CLOSE</button>
                    </div>
                </div>
            )}

            {viewingItem && (
                <div style={modalOverlay}>
                    <div style={{ background: '#1a1a1a', padding: spacing.lg, borderRadius: radii.md, width: '450px', maxHeight: '80vh', overflowY: 'auto', border: `2px solid ${colors.gold}` }}>
                        <h2 style={{ color: colors.gold, borderBottom: `1px solid ${colors.gold}`, paddingBottom: '10px' }}>{viewingItem.name}</h2>
                        <div style={{ margin: '20px 0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {formatEntries(viewingItem.entries || ["No description."])}
                        </div>
                        <button onClick={() => setViewingItem(null)} style={{ width: '100%', background: colors.gold }}>CLOSE</button>
                    </div>
                </div>
            )}

            {/* ROLL MODE PICKER */}
            {showRollPicker && (
                <div style={modalOverlay}>
                    <div style={{ background: '#1a1a1a', padding: spacing.lg, borderRadius: radii.md, width: '300px', border: `2px solid ${colors.gold}`, textAlign: 'center' }}>
                        <h3 style={{ color: colors.gold, margin: '0 0 12px 0', fontSize: '1rem' }}>{showRollPicker.label}</h3>
                        <p style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '16px' }}>Select roll type</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(['normal', 'advantage', 'disadvantage'] as AdvantageMode[]).map(mode => (
                                <button key={mode} onClick={() => { showRollPicker.onRoll(mode); setShowRollPicker(null); }}
                                    style={{ background: mode === 'normal' ? colors.accent : mode === 'advantage' ? '#48bb78' : '#e53e3e', border: 'none', color: 'white', padding: '10px', borderRadius: radii.sm, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Advantage (roll twice, take higher)' : 'Disadvantage (roll twice, take lower)'}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowRollPicker(null)} style={{ marginTop: '12px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '6px 16px', borderRadius: radii.sm, fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* MANAGE SPELLS MODAL */}
            {showManageSpells && (
                <div style={modalOverlay}>
                    <div style={{ background: '#1a1a1a', padding: spacing.lg, borderRadius: radii.md, width: viewingSpellInManage ? '800px' : '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: `2px solid ${colors.gold}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.gold}`, paddingBottom: '10px', marginBottom: '12px' }}>
                            <h2 style={{ margin: 0, color: colors.gold, fontSize: '1.2rem' }}>
                                {viewingSpellInManage ? viewingSpellInManage.name : 'Manage Spells'}
                            </h2>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {!viewingSpellInManage && isPreparedCaster && (
                                    <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                                        {(char.spells?.prepared || []).length}/{maxPrepared} prepared
                                    </span>
                                )}
                                {viewingSpellInManage ? (
                                    <button onClick={() => setViewingSpellInManage(null)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: radii.sm, padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>Back</button>
                                ) : (
                                    <button onClick={() => { setShowManageSpells(false); setViewingSpellInManage(null); }} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: radii.sm, padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>Close</button>
                                )}
                            </div>
                        </div>

                        {viewingSpellInManage ? (
                            <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.85rem', lineHeight: 1.6 }}>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.7rem', color: colors.textDim }}>
                                    <span>{viewingSpellInManage.level === 0 ? 'Cantrip' : `${viewingSpellInManage.level}${ordinalSuffix(viewingSpellInManage.level)}-level`} {schoolLabel(viewingSpellInManage.school)}</span>
                                    <span>Casting Time: {formatTime(viewingSpellInManage.time)}</span>
                                    <span>Range: {formatRange(viewingSpellInManage.range)}</span>
                                    <span>Components: {componentLabel(viewingSpellInManage.components)}</span>
                                    <span>Duration: {formatDuration(viewingSpellInManage.duration)}</span>
                                </div>
                                <div style={{ color: colors.textLight }}>
                                    {viewingSpellInManage.entries ? formatEntries(viewingSpellInManage.entries) : <span style={{ fontStyle: 'italic', color: colors.textDim }}>No description available.</span>}
                                </div>
                                {viewingSpellInManage.entriesHigherLevel && (
                                    <div style={{ marginTop: '12px', borderTop: `1px solid ${colors.borderLight}`, paddingTop: '10px' }}>
                                        <div style={{ fontSize: '0.7rem', color: colors.gold, fontWeight: 'bold', marginBottom: '4px' }}>AT HIGHER LEVELS</div>
                                        {formatEntries(viewingSpellInManage.entriesHigherLevel)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {!isPreparedCaster && (
                                    <div style={{ padding: '8px 10px', marginBottom: '12px', background: 'rgba(99,102,241,0.1)', borderRadius: radii.sm, border: `1px solid ${colors.accent}`, fontSize: '0.7rem', color: colors.textMuted }}>
                                        You are a known caster — all known spells are always available. No preparation needed.
                                    </div>
                                )}
                                {(() => {
                                    const preparedSet = new Set(char.spells?.prepared || []);
                                    const knownSet = new Set(char.spells?.known || []);
                                    const cantrips = char.spells?.cantrips || [];
                                    const spellNames = [...new Set([...cantrips, ...Array.from(knownSet), ...Array.from(preparedSet)])];
                                    if (spellNames.length === 0) {
                                        return (
                                            <div style={{ padding: '40px', textAlign: 'center', color: colors.textDim, fontStyle: 'italic' }}>
                                                No spells known. Visit the Level Up wizard to learn spells.
                                            </div>
                                        );
                                    }
                                    const grouped = groupSpellsByLevel(spellData);
                                    const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b);
                                    return levels.map(lvl => {
                                        const spells = grouped[lvl];
                                        const filtered = spells.filter(s => spellNames.includes(s.name));
                                        if (filtered.length === 0) return null;
                                        return (
                                            <div key={lvl} style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '0.7rem', color: colors.gold, fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '4px' }}>
                                                    {lvl === 0 ? 'CANTRIPS' : `${lvl}${ordinalSuffix(lvl)} LEVEL`}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {filtered.map(s => {
                                                        const isPrepared = preparedSet.has(s.name);
                                                        const isCantrip = lvl === 0;
                                                        return (
                                                            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: isPrepared ? 'rgba(99,102,241,0.1)' : 'rgba(45,55,72,0.2)', borderRadius: radii.sm, border: `1px solid ${isPrepared ? colors.accent : colors.borderLight}`, borderLeft: `3px solid ${isPrepared ? colors.accent : 'transparent'}` }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    {isPreparedCaster && !isCantrip && (
                                                                        <div onClick={() => togglePrepare(s.name)}
                                                                            style={{ width: '18px', height: '18px', borderRadius: '3px', background: isPrepared ? colors.accent : 'transparent', border: `2px solid ${isPrepared ? colors.accent : colors.textDim}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white', flexShrink: 0 }}>
                                                                            {isPrepared ? '✓' : ''}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: colors.gold }}>{s.name}</span>
                                                                        <span style={{ fontSize: '0.6rem', color: colors.textDim, marginLeft: '6px' }}>
                                                                            {lvl === 0 ? 'Cantrip' : `${lvl}${ordinalSuffix(lvl)}-level`} {schoolLabel(s.school)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                    {s.duration?.some((d: any) => d.concentration) && <span style={{ fontSize: '0.55rem', color: '#f6e05e', border: '1px solid #f6e05e', borderRadius: '3px', padding: '1px 4px' }}>C</span>}
                                                                    <button onClick={() => setViewingSpellInManage(s)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '2px 8px', borderRadius: radii.sm, fontSize: '0.6rem', cursor: 'pointer' }}>View</button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CharacterWizard
                key={isWizardOpen ? wizardMode : 'closed'}
                isOpen={isWizardOpen}
                mode={wizardMode}
                existingChar={wizardMode === 'levelup' ? char : null}
                onClose={() => setIsWizardOpen(false)}
                onComplete={handleWizardComplete}
            />

            {/* SPELL CAST ANIMATION */}
            <SpellCastAnimation spellName={castingSpell} onClose={() => setCastingSpell(null)} />

            {/* ROLL RESULT TOAST */}
            {rollResult && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#1a1a1a', border: `2px solid ${colors.gold}`, borderRadius: radii.md, padding: '12px 16px', maxWidth: '350px', zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.gold, fontSize: '1.2rem' }}>🎲</span>
                    <span style={{ color: 'white', fontSize: '0.8rem', flex: 1 }}>{rollResult}</span>
                    <button onClick={() => setRollResult(null)} style={{ background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer', fontSize: '0.8rem', padding: '0' }}>×</button>
                </div>
            )}
        </>
    );
}