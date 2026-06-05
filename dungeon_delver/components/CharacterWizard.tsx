'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import { DataEngine } from '../utils/dataLoader';
import { cleanString, formatEntries } from '../utils/formatters';
import { colors, spacing, radii, transitions } from '../utils/styles';
import { Character, CharacterFeature } from '../lib/character';
import { finalizeCharacterFromWizard, getAbilityModifier } from '../utils/characterProgression';
import { isSpellcaster, buildSpellSlots, getPreparedCount, getSpellcastingAbility, computeMulticlassSpellSlots } from '../utils/spellcastingEngine';
import { getNewFeaturesAtLevel, getNewSubclassFeaturesAtLevel, getHPGainDisplay, isASLevel, getSubclassLevel, getNewCantripsKnown, getNewSpellsKnown, getNewPreparedCount, getNewSpellSlots } from '../utils/levelingEngine';
import { getAvailablePicks } from '../utils/classResources';
import { rollDice } from '../utils/rollEngine';
import { loadCampaignConfig, filterRacesByPreset, type RacePresetId, CAMPAIGN_RACE_PRESETS } from '../utils/campaignEngine';
import { CLASS_THEMES, type ClassTheme } from '../utils/classThemes';

// Multiclass prerequisites per 2024 rules (min ability score of 13)
const MULTICLASS_PREREQS: Record<string, Record<string, number>> = {
  Barbarian: { str: 13 },
  Bard: { cha: 13 },
  Cleric: { wis: 13 },
  Druid: { wis: 13 },
  Fighter: { str: 13, dex: 13 },
  Monk: { dex: 13, wis: 13 },
  Paladin: { str: 13, cha: 13 },
  Ranger: { dex: 13, wis: 13 },
  Rogue: { dex: 13 },
  Sorcerer: { cha: 13 },
  Warlock: { cha: 13 },
  Wizard: { int: 13 },
  Artificer: { int: 13 },
};

function meetsMulticlassPrereqs(className: string, baseStats: Record<string, number>): { ok: boolean; missing: string[] } {
  const prereqs = MULTICLASS_PREREQS[className];
  if (!prereqs) return { ok: true, missing: [] };
  const missing: string[] = [];
  for (const [stat, min] of Object.entries(prereqs)) {
    if ((baseStats[stat] || 10) < min) missing.push(`${stat.toUpperCase()} ${min}`);
  }
  return { ok: missing.length === 0, missing };
}
import SpellSelectionView from './SpellSelectionView';
import ShopModal from './ShopModal';
import LevelUpWizard from './LevelUpWizard';

interface CharacterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (char: Character) => void;
  mode?: 'create' | 'levelup';
  existingChar?: Character | null;
}

export default function CharacterWizard({
  isOpen,
  onClose,
  onComplete,
  mode = 'create',
  existingChar = null,
}: CharacterWizardProps) {

  const hexToRGBA = (hex: string, opacity: number) => {
    // Remove the # if it exists
    const cleanHex = hex.replace('#', '');

    // Convert to RGB
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const [baseScores, setBaseScores] = useState<Record<string, number>>({
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
  });


  const renderRacialBonuses = (abilityArr: any[]) => {
    if (!abilityArr || abilityArr.length === 0) return <span>None</span>;

    // We get the first (and only) object in our merged array
    const statsObject = abilityArr[0];

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(statsObject).map(([stat, val]) => {
          // Ignore technical keys like 'choose' for this specific loop
          if (stat === 'choose' || typeof val !== 'number') return null;

          return (
            <span key={stat} style={statBonusBadgeStyle}>
              +{val} {stat.toUpperCase()}
            </span>
          );
        })}

        {/* Handle the 'Choose 1' case separately if it exists */}
        {statsObject.choose && (
          <span style={{ ...statBonusBadgeStyle, borderColor: '#48bb78' }}>
            +{statsObject.choose.count || statsObject.choose.amount} TO ANY
          </span>
        )}
      </div>
    );
  };

  // Inside CharacterWizard component

  const getFinalRacialBonus = (stat: string) => {
    // 1. Find the active selection (handling subrace vs base race)
    const activeRace = rawSpecies.find(s => s.name === draft.race) ||
      allSubraces.find(s => `${s.raceName} (${s.name})` === draft.race);

    if (!activeRace) return 0;

    let totalBonus = 0;
    // Add bonus from the current selection
    totalBonus += activeRace.ability?.[0]?.[stat.toLowerCase()] || 0;

    // If it's a subrace, add the parent's bonus too
    if (activeRace.raceName) {
      const parent = rawSpecies.find(p => p.name === activeRace.raceName && p.source === activeRace.raceSource);
      totalBonus += parent?.ability?.[0]?.[stat.toLowerCase()] || 0;
    }

    return totalBonus;
  };


  // CLASS_THEMES imported from utils/classThemes.ts

  // --- 1. STATE ---

  const [statMethod, setStatMethod] = useState<'array' | 'pointbuy' | 'manual'>('array');
  const [equipmentMode, setEquipmentMode] = useState<'gear' | 'gold'>('gear');
  const [rolledGold, setRolledGold] = useState(0);
  const [quickChoiceTask, setQuickChoiceTask] = useState<{ type: string, group: any[] } | null>(null);
  const [selectedClassData, setSelectedClassData] = useState<any>(null);
  const [rawSpecies, setRawSpecies] = useState<any[]>([]);
  const [allSubraces, setAllSubraces] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [allBackgrounds, setAllBackgrounds] = useState<any[]>([]);
  const [inspectingBackground, setInspectingBackground] = useState<any | null>(null);
  const [inspectingClass, setInspectingClass] = useState<any | null>(null);
  const [allSpecies, setAllSpecies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingSpecies, setInspectingSpecies] = useState<any | null>(null);
  const [subracePickerFor, setSubracePickerFor] = useState<any | null>(null);
  const [draft, setDraft] = useState<any>({
    name: '', race: '', class: '', classLevels: [],
    hp: { current: 10, max: 10 },
    baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: [],
    backgroundProficiencies: [],
    inventory: [] // MUST be an empty array
  });
  const [creationStage, setCreationStage] = useState<'hub' | 'equipment' | 'spells' | 'levelup'>('hub');
  const [selectedSubclass, setSelectedSubclass] = useState<string | undefined>(undefined);
  const [showCreateSubclassPicker, setShowCreateSubclassPicker] = useState(false);
  const [subclassOptions, setSubclassOptions] = useState<any[]>([]);
  const [pendingSpells, setPendingSpells] = useState<Character['spells']>({ cantrips: [], known: [], prepared: [] });
  const [equipmentChoices, setEquipmentChoices] = useState<any[]>([]);
  const [allLibraryItems, setAllLibraryItems] = useState<any[]>([]);
  const [activeEquipmentPicker, setActiveEquipmentPicker] = useState<{
    groupIndex: number,
    choiceKey: string,
    filter: string
  } | null>(null);

  const [pickedSkills, setPickedSkills] = useState<{ class: string[]; species: string[] }>({ class: [], species: [] });
  const [hpRollMode, setHpRollMode] = useState<'average' | 'rolled'>('average');
  const [rolledHpGain, setRolledHpGain] = useState<number>(0);
  const [selectedASIStat, setSelectedASIStat] = useState<string | null>(null);
  const [asiPicks, setAsiPicks] = useState<{ stat: string; boost: number }[]>([]);
  const [asiMode, setAsiMode] = useState<'one' | 'two' | 'feat'>('one');
  const [asiConfirmed, setAsiConfirmed] = useState(false);
  const [pendingHpGain, setPendingHpGain] = useState<number>(0);
  const [levelUpPhase, setLevelUpPhase] = useState<'picker' | 'intro' | 'choices' | 'confirm'>('picker');
  const [levelingClass, setLevelingClass] = useState<string | null>(null);
  const [featurePicks, setFeaturePicks] = useState<Record<string, string[]>>(existingChar?.classFeaturePicks || {});
  const [featurePicksConfirmed, setFeaturePicksConfirmed] = useState(false);
  const [optionalFeatureLookup, setOptionalFeatureLookup] = useState<Record<string, any>>({});
  const [allFeats, setAllFeats] = useState<any[]>([]);
  const [featSearch, setFeatSearch] = useState('');
  const [isekaiEnabled, setIsekaiEnabled] = useState(false);
  const [isekaiConfig, setIsekaiConfig] = useState<any[]>([]);
  const [showIsekaiPicker, setShowIsekaiPicker] = useState(false);
  const [isekaiSpeciesMode, setIsekaiSpeciesMode] = useState(false);
  const [allSpeciesUnfiltered, setAllSpeciesUnfiltered] = useState<any[]>([]);
  const [selectedFeat, setSelectedFeat] = useState<any | null>(null);
  const [viewingFeatureDetail, setViewingFeatureDetail] = useState<any | null>(null);

  // Background traits & language states
  const [showBackgroundTraits, setShowBackgroundTraits] = useState<any | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [pendingLanguageChoices, setPendingLanguageChoices] = useState<{ from: string[]; count: number; label: string }[]>([]);
  const [languagePicks, setLanguagePicks] = useState<Record<number, string[]>>({});

  const ALL_SKILLS = [
    'athletics', 'acrobatics', 'sleightOfHand', 'stealth', 'arcana',
    'history', 'investigation', 'nature', 'religion', 'animalHandling',
    'insight', 'medicine', 'perception', 'survival', 'deception',
    'intimidation', 'performance', 'persuasion'
  ];

  const normalizeSkillName = (name: string) => {
    const clean = name.toLowerCase().trim();
    if (clean === 'sleight of hand') return 'sleightOfHand';
    if (clean === 'animal handling') return 'animalHandling';
    return clean;
  };

  // --- 2. DATA LOADING & MERGING ---
  const getCharClassList = (char: any): string[] => {
    if (char.classes && char.classes.length > 0) return char.classes as string[];
    return [...new Set((char.classLevels || []).map((cl: any) => cl.className))] as string[];
  };

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'levelup' && existingChar) {
      const classList = getCharClassList(existingChar);
      const primaryClass = classList[0] || existingChar.class;
      setDraft({
        ...existingChar,
        name: existingChar.name,
        race: existingChar.race,
        class: primaryClass,
        background: existingChar.background,
        classLevels: existingChar.classLevels,
        proficiencies: existingChar.proficiencies || [],
        expertise: existingChar.expertise || [],
        inventory: existingChar.inventory || [],
        hp: existingChar.hp,
      });
      setBaseScores(existingChar.baseStats);
      setSelectedSubclass(existingChar.classLevels?.[0]?.subclass);
      setPendingSpells(existingChar.spells || { cantrips: [], known: [], prepared: [] });
      // Always show class picker so user can multiclass (add a new class)
      setLevelUpPhase('picker');
      setLevelingClass(null);
      setFeaturePicksConfirmed(false);
      setPickedSkills({ class: [], species: [] });
      setCreationStage('levelup');
    } else if (mode === 'create') {
      setPickedSkills({ class: [], species: [] });
      setDraft({
        name: '', race: '', class: '', classLevels: [],
        hp: { current: 10, max: 10 },
        baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        proficiencies: [],
        backgroundProficiencies: [],
        inventory: [],
      });
      setBaseScores({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
      setSelectedSubclass(undefined);
      setPendingSpells({ cantrips: [], known: [], prepared: [] });
      setCreationStage('hub');
      setSelectedClassData(null);
    }
  }, [isOpen, mode, existingChar]);

  useEffect(() => {
    if (isOpen) {
      setIsekaiSpeciesMode(false);
      setShowIsekaiPicker(false);
      DataEngine.getMergedRaces().then(mergedData => {
        // 1. Save EVERY SINGLE race into rawSpecies for lookup purposes
        setRawSpecies(mergedData);

        // 2. Group them for the gallery display as usual
        const grouped = mergedData.reduce((acc: any, r: any) => {
          if (!acc[r.name]) acc[r.name] = r;
          if (r.source === 'XPHB' || r.source === 'PHB') acc[r.name] = r;
          return acc;
        }, {});
        let species = Object.values(grouped);

        // 3. Load campaign config for race preset and isekai module
        try {
          const campaignId = existingChar?.campaignId || localStorage.getItem('dd-active-campaign') || undefined;
          const campaignConfig = loadCampaignConfig(campaignId || undefined);
          const isekaiOn = campaignConfig?.enabledModules?.includes('isekai');
          setIsekaiEnabled(!!isekaiOn);
          if (campaignConfig?.moduleConfig?.isekai) {
            const cfg = campaignConfig.moduleConfig.isekai as any;
            setIsekaiConfig(cfg.types || []);
          }

          if (campaignConfig?.racePreset && campaignConfig.racePreset !== 'standard') {
            species = filterRacesByPreset(species, mergedData, campaignConfig.racePreset as RacePresetId);
          }
        } catch { /* noop */ }

        setAllSpecies(species);
        // Save unfiltered list for isekai species browsing
        setAllSpeciesUnfiltered(Object.values(grouped));
      });
      DataEngine.getRacesData().then(data => setAllSubraces(data.subraces || []));
      DataEngine.getMergedBackgrounds().then(mergedData => {
        const grouped = mergedData.reduce((acc: any, bg: any) => {
          const name = bg.name.trim();
          if (!acc[name]) acc[name] = bg;
          // Priority for official sources
          if (['PHB', 'XPHB', 'SCAG'].includes(bg.source)) acc[name] = bg;
          return acc;
        }, {});
        setAllBackgrounds(Object.values(grouped));
      });
      DataEngine.getItems().then(setAllLibraryItems);
      DataEngine.loadLocalJson('data/optionalfeatures.json').then((data: any) => {
        if (data?.optionalfeature) {
          const lookup: Record<string, any> = {};
          for (const f of data.optionalfeature) lookup[f.name] = f;
          setOptionalFeatureLookup(lookup);
        }
      });
      DataEngine.getFeats().then(setAllFeats);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // When mode is levelup, delegate to the standalone LevelUpWizard
  if (mode === 'levelup' && existingChar) {
    return <LevelUpWizard existingChar={existingChar} onComplete={onComplete} onClose={onClose} />;
  }

  // --- 3. HELPERS ---
  const getRacePreview = (entries: any) => {
    if (!entries || entries.length === 0) return "No description available.";
    const findString = (item: any): string | null => {
      if (typeof item === 'string') return item;
      if (Array.isArray(item)) {
        for (const sub of item) {
          const res = findString(sub);
          if (res) return res;
        }
      }
      if (typeof item === 'object' && item !== null) {
        return findString(item.entries || item.items || item.entry || null);
      }
      return null;
    };
    const rawText = findString(entries);
    const clean = rawText ? cleanString(rawText) : "No description available.";
    return clean.length > 140 ? clean.substring(0, 140) + "..." : clean;
  };

  const handleSelection = async (type: string, data: any) => {
    if (type === 'class') {
      const fullData = await DataEngine.getClassFullData(data.name);
      setSelectedClassData(fullData);
      setDraft({ ...draft, class: data.name });
      // Show subclass picker in create mode if subclass is selected at level 1
      if (mode === 'create' && fullData?.info) {
        const subLvl = getSubclassLevel(fullData.info);
        if (subLvl <= 1 && fullData.subclasses?.length) {
          // Deduplicate by name, preferring XPHB source
          const seen = new Map<string, any>();
          for (const sub of fullData.subclasses) {
            const key = sub.name.toLowerCase();
            if (!seen.has(key) || sub.source === 'XPHB') seen.set(key, sub);
          }
          setSubclassOptions(Array.from(seen.values()));
          setShowCreateSubclassPicker(true);
        }
      }
    }
    else if (type === 'species') {
      // If it's a subrace, format the name nicely
      const fullName = data.raceName ? `${data.raceName} (${data.name})` : data.name;

      // Find the stats from your merged logic
      const statData = rawSpecies.find(rs => rs.name === data.name && rs.source === data.source);

      setDraft({
        ...draft,
        race: fullName,
        // Pre-load the racial ability bonuses into the draft if they exist
        baseStats: { ...draft.baseStats, ...(statData?.ability?.[0] || {}) }
      });

    }
    else if (type === 'background') {
      const bgSkills = (data.skillProficiencies || []).flatMap((entry: unknown) => {
        if (typeof entry === 'string') return [normalizeSkillName(entry)];
        if (entry && typeof entry === 'object' && !('choose' in (entry as object))) {
          return Object.keys(entry as object).filter((k) => k !== 'choose').map(normalizeSkillName);
        }
        return [];
      });
      const expertiseFromOverlap = bgSkills.filter((s: string) => (draft.proficiencies || []).includes(s));
      setDraft({
        ...draft,
        background: data.name,
        backgroundProficiencies: bgSkills,
        proficiencies: Array.from(new Set([...(draft.proficiencies || []), ...bgSkills])),
        expertise: Array.from(new Set([...(draft.expertise || []), ...expertiseFromOverlap])),
      });
      // Show background traits picker after selection
      setInspectingBackground(null);
      setInspectingSpecies(null);
      setSubracePickerFor(null);
      setActiveSection(null);
      setShowBackgroundTraits(data);
      return;
    }

    // Close all overlays and go back to Hub
    setInspectingClass(null);
    setInspectingSpecies(null);
    setInspectingBackground(null);
    setSubracePickerFor(null);
    setActiveSection(null);
  };

  const handleCreateSubclassSelect = (subName: string) => {
    setShowCreateSubclassPicker(false);
    setDraft({ ...draft, subclass: subName });
  };

  // --- Background Suggested Characteristics parsing ---
  const parseBackgroundTraits = (bg: any) => {
    const found: { personalityTrait: string[]; ideal: string[]; bond: string[]; flaw: string[] } = { personalityTrait: [], ideal: [], bond: [], flaw: [] };
    const suggested = (bg.entries || []).find((e: any) => e.name === 'Suggested Characteristics');
    if (!suggested?.entries) return found;
    for (const entry of suggested.entries) {
      if (entry.type === 'table' && entry.rows) {
        const label = entry.colLabels?.[1] || '';
        const options = entry.rows.map((r: string[]) => r[1]);
        if (label.includes('Personality')) found.personalityTrait = options;
        else if (label.includes('Ideal')) found.ideal = options;
        else if (label.includes('Bond')) found.bond = options;
        else if (label.includes('Flaw')) found.flaw = options;
      }
    }
    return found;
  };

  // --- Language proficiency parsing ---
  const LANGUAGE_STANDARD = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'];
  const LANGUAGE_EXOTIC = ['Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];
  const ALL_LANGS = [...LANGUAGE_STANDARD, ...LANGUAGE_EXOTIC, 'Telepathy'];

  const parseLanguageProficiencies = (source: any): { auto: string[]; choices: { from: string[]; count: number; label: string }[] } => {
    const auto: string[] = [];
    const choices: { from: string[]; count: number; label: string }[] = [];
    const profs = source?.languageProficiencies || [];
    for (const entry of profs) {
      if (typeof entry !== 'object') continue;
      // Boolean entries like { common: true }
      for (const [key, val] of Object.entries(entry)) {
        if (val === true && key !== 'choose' && !['any', 'anyStandard', 'anyExotic'].includes(key)) {
          auto.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
      }
      if (entry.anyStandard) {
        choices.push({ from: LANGUAGE_STANDARD, count: entry.anyStandard, label: 'Standard Language' });
      }
      if (entry.any) {
        choices.push({ from: ALL_LANGS, count: entry.any, label: 'Any Language' });
      }
      if (entry.anyExotic) {
        choices.push({ from: LANGUAGE_EXOTIC, count: entry.anyExotic, label: 'Exotic Language' });
      }
      if (entry.choose?.from) {
        const from = entry.choose.from.map((l: string) => l === 'other' ? 'Common' : l.charAt(0).toUpperCase() + l.slice(1));
        choices.push({ from, count: entry.choose.count || 1, label: 'Language' });
      }
    }
    return { auto, choices };
  };

  const getLanguageChoicesForCharacter = () => {
    const bg = allBackgrounds.find((b: any) => b.name === draft.background);
    const raceData = rawSpecies.find((s: any) => s.name === draft.race) ||
      allSubraces.find((s: any) => `${s.raceName} (${s.name})` === draft.race);
    const bgLang = bg ? parseLanguageProficiencies(bg) : { auto: [], choices: [] };
    const raceLang = raceData ? parseLanguageProficiencies(raceData) : { auto: [], choices: [] };
    const combined: { from: string[]; count: number; label: string }[] = [];
    for (const c of [...bgLang.choices, ...raceLang.choices]) {
      const existing = combined.find(x => JSON.stringify(x.from) === JSON.stringify(c.from));
      if (existing) existing.count += c.count;
      else combined.push({ ...c });
    }
    return { auto: [...bgLang.auto, ...raceLang.auto], choices: combined };
  };

  // --- Background Traits Picker ---
  const BackgroundTraitsView = ({ bgData }: { bgData: any }) => {
    const traits = parseBackgroundTraits(bgData);
    const [pt, setPt] = useState('');
    const [id, setId] = useState('');
    const [bd, setBd] = useState('');
    const [fl, setFl] = useState('');
    const [bs, setBs] = useState('');
    const roll = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a202c', padding: '28px', borderRadius: '12px', border: '2px solid #b8860b', width: '580px', maxHeight: '85vh', overflowY: 'auto' }}>
          <h2 style={{ fontFamily: 'serif', margin: '0 0 4px 0' }}>Suggested Characteristics</h2>
          <p style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: 16 }}>Choose or roll for each trait. These help define your character's personality.</p>

          {traits.personalityTrait.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#f6e05e', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Personality Trait <button onClick={() => setPt(roll(traits.personalityTrait))} style={rollBtnStyle}>🎲</button></label>
              {traits.personalityTrait.map((t, i) => (
                <button key={i} onClick={() => setPt(t)} style={traitOptionStyle(pt === t)}><span style={{ color: '#718096', marginRight: 8 }}>{i + 1}.</span>{t}</button>
              ))}
            </div>
          )}

          {traits.ideal.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#f6e05e', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Ideal <button onClick={() => setId(roll(traits.ideal))} style={rollBtnStyle}>🎲</button></label>
              {traits.ideal.map((t, i) => (
                <button key={i} onClick={() => setId(t)} style={traitOptionStyle(id === t)}><span style={{ color: '#718096', marginRight: 8 }}>{i + 1}.</span>{t}</button>
              ))}
            </div>
          )}

          {traits.bond.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#f6e05e', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Bond <button onClick={() => setBd(roll(traits.bond))} style={rollBtnStyle}>🎲</button></label>
              {traits.bond.map((t, i) => (
                <button key={i} onClick={() => setBd(t)} style={traitOptionStyle(bd === t)}><span style={{ color: '#718096', marginRight: 8 }}>{i + 1}.</span>{t}</button>
              ))}
            </div>
          )}

          {traits.flaw.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#f6e05e', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Flaw <button onClick={() => setFl(roll(traits.flaw))} style={rollBtnStyle}>🎲</button></label>
              {traits.flaw.map((t, i) => (
                <button key={i} onClick={() => setFl(t)} style={traitOptionStyle(fl === t)}><span style={{ color: '#718096', marginRight: 8 }}>{i + 1}.</span>{t}</button>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#f6e05e', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Backstory <span style={{ color: '#718096', fontWeight: 'normal' }}>(optional)</span></label>
            <textarea value={bs} onChange={e => setBs(e.target.value)} placeholder="Write a short backstory for your character..."
              style={{ width: '100%', minHeight: '70px', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.8rem', resize: 'vertical' }} />
          </div>

          <button onClick={() => {
            setDraft({ ...draft, personalityTraits: pt, ideals: id, bonds: bd, flaws: fl, backstory: bs });
            setShowBackgroundTraits(null);
            // Check if there are language choices to make
            const langInfo = getLanguageChoicesForCharacter();
            if (langInfo.choices.length > 0) {
              setPendingLanguageChoices(langInfo.choices);
              setShowLanguagePicker(true);
            }
          }}
            style={{ width: '100%', padding: '12px', background: '#b8860b', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Save & Continue
          </button>
        </div>
      </div>
    );
  };

  const traitOptionStyle = (active: boolean) => ({
    display: 'block', width: '100%', padding: '8px 10px', marginBottom: 4, background: active ? '#3a4a5e' : '#1a202c',
    border: active ? '1px solid #f6e05e' : '1px solid #2d3748', borderRadius: '4px', color: active ? '#f6e05e' : '#cbd5e0',
    cursor: 'pointer', textAlign: 'left' as const, fontSize: '0.78rem', lineHeight: 1.35, transition: '0.1s'
  });

  const rollBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0, marginLeft: 6, verticalAlign: 'middle' as const };

  // --- Language Picker ---
  const LanguagePickerView = () => {
    const [picks, setPicks] = useState<Record<number, string[]>>({});
    const totalSlots = pendingLanguageChoices.reduce((s, c) => s + c.count, 0);
    const usedSlots = Object.values(picks).flat().length;
    const allPicked = usedSlots === totalSlots;

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a202c', padding: '28px', borderRadius: '12px', border: '2px solid #b8860b', width: '480px' }}>
          <h2 style={{ fontFamily: 'serif', margin: '0 0 4px 0' }}>Choose Languages</h2>
          <p style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: 16 }}>Your race and background grant language proficiencies. Pick {totalSlots} language{totalSlots > 1 ? 's' : ''} ({usedSlots}/{totalSlots} chosen).</p>
          {pendingLanguageChoices.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 12 }}>
              <label style={{ color: '#f6e05e', fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>{group.label} (choose {group.count})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.from.map(lang => {
                  const cur = picks[gi] || [];
                  const selected = cur.includes(lang);
                  const atLimit = cur.length >= group.count;
                  const dim = !selected && atLimit;
                  return (
                    <button key={lang} onClick={() => {
                      if (selected) setPicks({ ...picks, [gi]: cur.filter((x: string) => x !== lang) });
                      else if (!atLimit) setPicks({ ...picks, [gi]: [...cur, lang] });
                    }}
                      style={{ padding: '6px 12px', background: selected ? '#6366f1' : atLimit ? '#1a202c' : '#2d3748', border: selected ? '2px solid #818cf8' : '1px solid #4a5568', borderRadius: '6px', color: dim ? '#4a5568' : 'white', cursor: dim ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button disabled={!allPicked} onClick={() => {
            setLanguagePicks(picks);
            setShowLanguagePicker(false);
          }}
            style={{ width: '100%', padding: '12px', background: allPicked ? '#b8860b' : '#4a5568', border: 'none', color: 'white', borderRadius: '6px', cursor: allPicked ? 'pointer' : 'not-allowed', fontSize: '0.9rem', fontWeight: 'bold' }}>
            {allPicked ? `Done (${usedSlots} language${usedSlots > 1 ? 's' : ''})` : `Choose ${totalSlots - usedSlots} more...`}
          </button>
        </div>
      </div>
    );
  };

  const finishWizard = async (spells?: Character['spells'], hpGainOverride?: number) => {
    const className = draft.class;
    if (!className) return;
    const fullData = selectedClassData || (await DataEngine.getClassFullData(className));
    const bgData = allBackgrounds.find((b: { name: string }) => b.name === draft.background);

    // Compute derived proficiencies & expertise from per-section picks
    const bgProfs = draft.backgroundProficiencies || [];
    const raceData = rawSpecies.find((s: any) => s.name === draft.race) ||
      allSubraces.find((s: any) => `${s.raceName} (${s.name})` === draft.race);
    const raceAuto: string[] = [];
    const racePicks = pickedSkills.species || [];
    const classPicks = pickedSkills.class || [];
    (raceData?.skillProficiencies || []).forEach((obj: any) => {
      if (!obj.choose) raceAuto.push(...Object.keys(obj).map(normalizeSkillName));
    });
    const allProfs = Array.from(new Set([...bgProfs, ...raceAuto, ...racePicks, ...classPicks]));
    const getSrcCount = (s: string) => [bgProfs, raceAuto, racePicks, classPicks].filter(arr => arr.includes(s)).length;
    const expertise = allProfs.filter(s => getSrcCount(s) >= 2);

    const draftWithPicks = { ...draft, classFeaturePicks: featurePicks };
    const finalChar = finalizeCharacterFromWizard(
      {
        ...draftWithPicks,
        baseStats: baseScores as Character['baseStats'],
        selectedSubclass: selectedSubclass || draft.subclass,
        proficiencies: allProfs,
        expertise,
        classSkillPicks: [],
        hpGainOverride,
      },
      fullData.info,
      fullData.features,
      fullData.subclassFeatures,
      bgData,
      mode,
      existingChar
    );
    // Handle spells and spell slots (support multiclass)
    if (spells) {
      finalChar.spells = spells;
    } else if (existingChar?.spells) {
      finalChar.spells = existingChar.spells;
    }
    // Compute combined multiclass spell slots
    if (finalChar.classLevels && finalChar.classLevels.length > 1) {
      const classDataMap: Record<string, any> = {};
      for (const cl of finalChar.classLevels) {
        try {
          const data = await DataEngine.getClassFullData(cl.className);
          classDataMap[cl.className] = data;
        } catch (e) { /* ignore */ }
      }
      finalChar.spellSlots = computeMulticlassSpellSlots(finalChar.classLevels, classDataMap);
    } else {
      finalChar.spellSlots = buildSpellSlots(fullData.info, finalChar.totalLevel);
    }
    // Register feat if one was taken instead of ASI
    if (asiConfirmed && asiMode === 'feat' && selectedFeat) {
      const featEntry: CharacterFeature = {
        name: selectedFeat.name,
        level: mode === 'levelup' && existingChar ? (existingChar.totalLevel || 1) : 1,
        source: 'Feat',
        entries: selectedFeat.entries,
      };
      finalChar.features = [...(finalChar.features || []), featEntry];
    }
    // Merge isekai bonus spells into final character
    const isekai = draft.moduleData?.isekai || finalChar.moduleData?.isekai;
    if (isekai?.cantrip || isekai?.spell1) {
      const curSpells = finalChar.spells || { cantrips: [], known: [], prepared: [] };
      finalChar.spells = {
        cantrips: isekai.cantrip ? [...(curSpells.cantrips || []), isekai.cantrip] : (curSpells.cantrips || []),
        known: isekai.spell1 ? [...(curSpells.known || []), isekai.spell1] : (curSpells.known || []),
        prepared: curSpells.prepared || [],
      };
    }
    // Pass through background personality traits and backstory
    if (draft.personalityTraits) finalChar.personalityTraits = draft.personalityTraits;
    if (draft.ideals) finalChar.ideals = draft.ideals;
    if (draft.bonds) finalChar.bonds = draft.bonds;
    if (draft.flaws) finalChar.flaws = draft.flaws;
    if (draft.backstory) finalChar.backstory = draft.backstory;
    // Auto-fill campaign info from active campaign
    try {
      const activeId = localStorage.getItem('dd-active-campaign');
      if (activeId && activeId !== 'default') {
        finalChar.campaignId = activeId;
        const registry = JSON.parse(localStorage.getItem('dd-campaign-registry') || '[]');
        const entry = registry.find((c: any) => c.id === activeId);
        if (entry) finalChar.campaignName = entry.name;
      }
    } catch { /* localStorage may not be available */ }
    // Merge language picks
    if (Object.keys(languagePicks).length > 0) {
      const allLangPicks: string[] = [];
      for (const arr of Object.values(languagePicks)) allLangPicks.push(...arr);
      const autoLangs = getLanguageChoicesForCharacter().auto;
      const langList = [...new Set([...autoLangs, ...allLangPicks])];
      if (langList.length > 0) (finalChar as any).languages = langList;
    }
    onComplete(finalChar);
  };

  const LevelUpIntroView = () => {
    const oldTotalLevel = existingChar?.totalLevel || existingChar?.level || 1;
    const newTotalLevel = oldTotalLevel + 1;
    const targetClass = levelingClass || draft.class;
    const classLevels = existingChar?.classLevels || [];
    const existingClassLevel = classLevels.find(cl => cl.className === targetClass)?.level ?? 0;
    const isNewClass = existingClassLevel === 0;
    const newClassLevel = isNewClass ? 1 : existingClassLevel + 1;
    const oldClassLevel = existingClassLevel > 0 ? existingClassLevel : 0;

    const classInfo = selectedClassData?.info;
    const classFeatures = selectedClassData?.features || [];
    const subclassFeatures = selectedClassData?.subclassFeatures || [];
    const theme = CLASS_THEMES[targetClass.replace(/ /g, '')] || { color: '#b8860b', tagline_color: '#b8860b' };
    const conMod = getAbilityModifier(baseScores.con);
    const hpDisplay = getHPGainDisplay(classInfo, conMod);
    const newFeatures = getNewFeaturesAtLevel(classFeatures, targetClass, newClassLevel);
    const newSubclassFeatures = isNewClass ? [] : getNewSubclassFeaturesAtLevel(subclassFeatures, selectedSubclass || draft.subclass, newClassLevel);
    const subLevel = classInfo ? getSubclassLevel(classInfo) : 3;
    const needsSubclass = !isNewClass && newClassLevel >= subLevel && !selectedSubclass && !draft.subclass;
    const asiAvailable = isASLevel(newClassLevel) && !isNewClass;
    const newCantrips = classInfo && !isNewClass ? getNewCantripsKnown(classInfo, newClassLevel, oldClassLevel) : (classInfo ? getNewCantripsKnown(classInfo, newClassLevel, 0) : 0);
    const newSpellsKnown = classInfo && !isNewClass ? getNewSpellsKnown(classInfo, newClassLevel, oldClassLevel) : (classInfo ? getNewSpellsKnown(classInfo, newClassLevel, 0) : 0);
    const spellAbility = classInfo ? getSpellcastingAbility(classInfo) : 'int';
    const newPrepared = classInfo ? getNewPreparedCount(classInfo, newClassLevel, oldClassLevel, baseScores[spellAbility]) : 0;
    const slotChanges = classInfo && !isNewClass ? getNewSpellSlots(classInfo, newClassLevel, oldClassLevel) : (classInfo ? getNewSpellSlots(classInfo, newClassLevel, 0) : []);
    const hpGainValue = hpDisplay.average;

    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
        <div style={{ maxWidth: '680px', width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
              <img src={`/img/classes/Icons/${draft.class}.png`} style={{ width: '80px', height: '80px', borderRadius: '10px', border: `2px solid ${theme.tagline_color}` }} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {isNewClass && <span style={{ fontSize: '0.8rem', color: '#48bb78', padding: '4px 12px', background: 'rgba(72,187,120,0.15)', borderRadius: '6px', fontWeight: 'bold' }}>NEW CLASS</span>}
            </div>
            <h1 style={{ fontFamily: 'serif', color: theme.tagline_color, margin: '0 0 8px 0', fontSize: '2.5rem' }}>Level Up</h1>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', fontSize: '1.6rem' }}>
              {isNewClass ? (
                <>
                  <span style={{ color: '#48bb78', fontWeight: 'bold' }}>{draft.class} {newClassLevel}</span>
                  <span style={{ color: '#718096', fontSize: '1rem' }}>added at total level {newTotalLevel}</span>
                </>
              ) : (
                <>
                  <span style={{ color: '#a0aec0' }}>{draft.class} {oldClassLevel}</span>
                  <span style={{ color: '#718096', fontSize: '1.2rem' }}>→</span>
                  <span style={{ color: '#48bb78', fontWeight: 'bold' }}>{draft.class} {newClassLevel}</span>
                </>
              )}
            </div>
          </div>

          {/* What you gain */}
          <div style={{ background: '#1a202c', borderRadius: '16px', border: `2px solid ${theme.tagline_color}33`, padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'serif', margin: '0 0 24px 0', fontSize: '1.3rem', color: '#f6e05e' }}>What you'll gain</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Hit Points */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>❤️</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#48bb78' }}>+{hpGainValue} Hit Points</div>
                  <div style={{ fontSize: '0.8rem', color: '#718096' }}>d{hpDisplay.hitDieFaces} + {conMod >= 0 ? `${conMod} CON` : `${conMod} CON`}</div>
                </div>
              </div>

              {/* New Features */}
              {newFeatures.map((f: any) => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.3rem', marginTop: '2px' }}>⚔️</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#b8860b' }}>{f.name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0', marginTop: '4px', lineHeight: 1.5 }}>
                      {f.entries ? (Array.isArray(f.entries) ? cleanString(f.entries[0]) : typeof f.entries === 'string' ? cleanString(f.entries) : '') : ''}
                    </div>
                  </div>
                </div>
              ))}

              {/* Subclass Features */}
              {newSubclassFeatures.map((f: any) => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px', borderLeft: `4px solid ${theme.tagline_color}` }}>
                  <span style={{ fontSize: '1.3rem', marginTop: '2px' }}>🌟</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: theme.tagline_color }}>{f.name} <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: 'normal' }}>({selectedSubclass || draft.subclass} feature)</span></div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0', marginTop: '4px', lineHeight: 1.5 }}>
                      {f.entries ? (Array.isArray(f.entries) ? cleanString(f.entries[0]) : typeof f.entries === 'string' ? cleanString(f.entries) : '') : ''}
                    </div>
                  </div>
                </div>
              ))}

              {/* Subclass Choice */}
              {needsSubclass && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px', borderLeft: `4px solid ${theme.tagline_color}` }}>
                  <span style={{ fontSize: '1.3rem' }}>🔮</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: theme.tagline_color }}>Choose a Subclass</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>Select your path at level {subLevel}</div>
                  </div>
                </div>
              )}

              {/* ASI */}
              {asiAvailable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>📈</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#f6e05e' }}>Ability Score Improvement</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>Increase one ability by 2, or two by 1</div>
                  </div>
                </div>
              )}

              {/* Spellcasting Changes */}
              {slotChanges.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔮</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#6366f1' }}>Spellcasting Growth</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>
                      {slotChanges.filter(s => s.newMax > 0).map(s => `Level ${s.level}: ${s.newMax} slot${s.newMax > 1 ? 's' : ''}`).join(', ')}
                      {newCantrips > 0 && ` · +${newCantrips} cantrip${newCantrips > 1 ? 's' : ''}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Proficiency Bonus */}
              {(newTotalLevel % 4 === 0 || newTotalLevel === 5 || newTotalLevel === 9 || newTotalLevel === 13 || newTotalLevel === 17) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>⭐</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#f6e05e' }}>Proficiency Bonus +{Math.ceil(newTotalLevel / 4) + 1}</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>Was +{Math.ceil(oldTotalLevel / 4) + 1}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Begin button */}
          <button onClick={() => setLevelUpPhase('choices')}
            style={{ display: 'block', width: '100%', padding: '18px', background: theme.tagline_color, border: 'none', color: 'black', fontWeight: 'bold', fontSize: '1.2rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'serif', letterSpacing: '1px' }}
          >
            BEGIN LEVEL UP
          </button>
        </div>
      </div>
    );
  };

  const LevelUpView = () => {
    const targetClass = levelingClass || draft.class;
    const classLevels = existingChar?.classLevels || [];
    const existingClassLevel = classLevels.find(cl => cl.className === targetClass)?.level ?? 0;
    const isNewClass = existingClassLevel === 0;
    const newClassLevel = isNewClass ? 1 : existingClassLevel + 1;
    const oldClassLevel = existingClassLevel > 0 ? existingClassLevel : 0;

    const classInfo = selectedClassData?.info;
    const classFeatures = selectedClassData?.features || [];
    const subclassFeatures = selectedClassData?.subclassFeatures || [];
    const theme = CLASS_THEMES[targetClass.replace(/ /g, '')] || { color: '#b8860b', tagline_color: '#b8860b' };
    const conMod = getAbilityModifier(baseScores.con);
    const hpDisplay = getHPGainDisplay(classInfo, conMod);
    const newFeatures = getNewFeaturesAtLevel(classFeatures, targetClass, newClassLevel);
    const newSubclassFeatures = isNewClass ? [] : getNewSubclassFeaturesAtLevel(subclassFeatures, selectedSubclass || draft.subclass, newClassLevel);
    const subLevel = classInfo ? getSubclassLevel(classInfo) : 3;
    const needsSubclass = !isNewClass && newClassLevel >= subLevel && !selectedSubclass && !draft.subclass;
    const asiAvailable = isASLevel(newClassLevel) && !isNewClass;
    const newCantrips = classInfo && !isNewClass ? getNewCantripsKnown(classInfo, newClassLevel, oldClassLevel) : (classInfo ? getNewCantripsKnown(classInfo, newClassLevel, 0) : 0);
    const newSpellsKnown = classInfo && !isNewClass ? getNewSpellsKnown(classInfo, newClassLevel, oldClassLevel) : (classInfo ? getNewSpellsKnown(classInfo, newClassLevel, 0) : 0);
    const spellAbility = classInfo ? getSpellcastingAbility(classInfo) : 'int';
    const newPrepared = classInfo ? getNewPreparedCount(classInfo, newClassLevel, oldClassLevel, baseScores[spellAbility]) : 0;
    const slotChanges = classInfo && !isNewClass ? getNewSpellSlots(classInfo, newClassLevel, oldClassLevel) : (classInfo ? getNewSpellSlots(classInfo, newClassLevel, 0) : []);

    const subclasses = (selectedClassData?.subclasses || []).reduce((acc: any[], current: any) => {
      if (!acc.find((item: any) => item.name.trim() === current.name.trim())) acc.push(current);
      return acc;
    }, []);

    const allPickedOptions = Object.values(featurePicksConfirmed ? featurePicks : (existingChar?.classFeaturePicks || {})).flat();
    const availablePicks = selectedClassData ? getAvailablePicks(targetClass || draft.class, newClassLevel, allPickedOptions) : [];

    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'serif', color: theme.tagline_color, fontSize: '2rem', marginBottom: '24px', textAlign: 'center' }}>
            {isNewClass ? `Starting ${draft.class}` : `${draft.class} Level ${newClassLevel}`}
          </h1>

          {/* HP Section */}
          <div style={{ background: '#1a202c', borderRadius: '12px', border: `1px solid #2d3748`, padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f6e05e', margin: '0 0 12px 0', fontSize: '1rem' }}>Hit Points</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button onClick={() => setHpRollMode('average')}
                style={{ padding: '8px 20px', borderRadius: '8px', border: `2px solid ${hpRollMode === 'average' ? theme.tagline_color : '#4a5568'}`, background: hpRollMode === 'average' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontWeight: hpRollMode === 'average' ? 'bold' : 'normal' }}>
                Average: {hpDisplay.average}
              </button>
              <button onClick={() => { setHpRollMode('rolled'); setRolledHpGain(hpDisplay.rolledMin); }}
                style={{ padding: '8px 20px', borderRadius: '8px', border: `2px solid ${hpRollMode === 'rolled' ? theme.tagline_color : '#4a5568'}`, background: hpRollMode === 'rolled' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontWeight: hpRollMode === 'rolled' ? 'bold' : 'normal' }}>
                Roll: {hpRollMode === 'rolled' ? rolledHpGain || hpDisplay.rolledMin : `d${hpDisplay.hitDieFaces}`}
              </button>
              {hpRollMode === 'rolled' && (
                <button onClick={() => setRolledHpGain(rollDice(`1d${hpDisplay.hitDieFaces}`, 'HP roll', 'character-creation').rolls[0] + Math.max(0, conMod))}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', cursor: 'pointer' }}>
                  Roll
                </button>
              )}
            </div>
          </div>

          {/* Subclass Selection */}
          {needsSubclass && subclasses.length > 0 && (
            <div style={{ background: '#1a202c', borderRadius: '12px', border: `1px solid ${theme.tagline_color}44`, padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ color: theme.tagline_color, margin: '0 0 12px 0', fontSize: '1rem' }}>Choose Subclass</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subclasses.map((sub: any) => (
                  <button key={sub.name} onClick={() => setSelectedSubclass(sub.name)}
                    style={{ padding: '12px 16px', borderRadius: '8px', border: `2px solid ${selectedSubclass === sub.name ? theme.tagline_color : '#4a5568'}`, background: selectedSubclass === sub.name ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold' }}>{sub.name}</div>
                    {sub.shortDescription && <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{sub.shortDescription}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feature Picks */}
          {availablePicks.length > 0 && (
            <div style={{ background: '#1a202c', borderRadius: '12px', border: `1px solid #2d3748`, padding: '20px', marginBottom: '16px' }}>
              {availablePicks.map((pickGroup: any, gi: number) => (
                <div key={pickGroup.key} style={{ marginBottom: gi === availablePicks.length - 1 ? 0 : '12px' }}>
                  <h4 style={{ color: '#a0aec0', margin: '0 0 8px 0', fontSize: '0.85rem' }}>{pickGroup.label}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pickGroup.options.map((opt: any) => {
                      const optKey = opt.name || opt;
                      const isPicked = featurePicks[pickGroup.key]?.includes(optKey);
                      return (
                        <button key={optKey} onClick={() => {
                          const current = featurePicks[pickGroup.key] || [];
                          if (current.includes(optKey)) {
                            setFeaturePicks({ ...featurePicks, [pickGroup.key]: current.filter((p: string) => p !== optKey) });
                          } else {
                            setFeaturePicks({ ...featurePicks, [pickGroup.key]: [...current, optKey] });
                          }
                        }}
                          style={{ padding: '8px 14px', borderRadius: '6px', border: `2px solid ${isPicked ? theme.tagline_color : '#4a5568'}`, background: isPicked ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: isPicked ? 'bold' : 'normal' }}>{optKey} {isPicked ? '✓' : ''}</div>
                          {(opt.description || optionalFeatureLookup[optKey]?.entries) && <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '3px', lineHeight: '1.3' }}>{opt.description || optionalFeatureLookup[optKey]?.entries?.map((e: any) => typeof e === 'string' ? e.replace(/\{@\w+ ([^|}]+)(\|[^}]*)?\}/g, '$1').trim() : e?.caption || e?.entry || '').filter(Boolean).join(' ')}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ASI */}
          {asiAvailable && (
            <div style={{ background: '#1a202c', borderRadius: '12px', border: `1px solid ${asiConfirmed ? '#48bb78' : '#2d3748'}`, padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ color: '#f6e05e', margin: 0, fontSize: '1rem' }}>Ability Score Improvement</h3>
                {asiConfirmed && <span style={{ color: '#48bb78', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Applied</span>}
              </div>
              {/* Mode toggle */}
              {!asiConfirmed && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => { setAsiMode('one'); setAsiPicks([]); setSelectedASIStat(null); setSelectedFeat(null); }}
                    style={{ padding: '6px 16px', borderRadius: '6px', border: `2px solid ${asiMode === 'one' ? theme.tagline_color : '#4a5568'}`, background: asiMode === 'one' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: asiMode === 'one' ? 'bold' : 'normal' }}>
                    +2 to one
                  </button>
                  <button onClick={() => { setAsiMode('two'); setAsiPicks([]); setSelectedASIStat(null); setSelectedFeat(null); }}
                    style={{ padding: '6px 16px', borderRadius: '6px', border: `2px solid ${asiMode === 'two' ? theme.tagline_color : '#4a5568'}`, background: asiMode === 'two' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: asiMode === 'two' ? 'bold' : 'normal' }}>
                    +1 to two
                  </button>
                  <button onClick={() => { setAsiMode('feat'); setAsiPicks([]); setSelectedASIStat(null); setSelectedFeat(null); setFeatSearch(''); }}
                    style={{ padding: '6px 16px', borderRadius: '6px', border: `2px solid ${asiMode === 'feat' ? theme.tagline_color : '#4a5568'}`, background: asiMode === 'feat' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: asiMode === 'feat' ? 'bold' : 'normal' }}>
                    Take a Feat
                  </button>
                </div>
              )}
              {/* Feat browser */}
              {!asiConfirmed && asiMode === 'feat' && (
                <div>
                  <input value={featSearch} onChange={(e) => setFeatSearch(e.target.value)}
                    placeholder="Search feats..."
                    style={{ width: '100%', padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '10px', boxSizing: 'border-box' }} />
                  <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {allFeats
                      .filter((f: any) => {
                        if (f.category !== 'G' && f.category !== 'O') return false;
                        if (featSearch && !f.name.toLowerCase().includes(featSearch.toLowerCase())) return false;
                        return true;
                      })
                      .sort((a: any, b: any) => a.name.localeCompare(b.name))
                      .map((f: any) => {
                        const isSelected = selectedFeat?.name === f.name;
                        const abilityStr = f.ability ? Object.entries(f.ability[0] || {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ') : '';
                        return (
                          <div key={f.name} onClick={() => setSelectedFeat(isSelected ? null : f)}
                            style={{ padding: '10px', borderRadius: '8px', border: `2px solid ${isSelected ? theme.tagline_color : '#2d3748'}`, background: isSelected ? `${theme.tagline_color}22` : '#1a202c', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', color: isSelected ? theme.tagline_color : 'white', fontSize: '0.85rem' }}>{f.name}</span>
                              {abilityStr && <span style={{ fontSize: '0.7rem', color: '#48bb78' }}>{abilityStr}</span>}
                            </div>
                            {f.entries && f.entries[0] && (
                              <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: 4, lineHeight: 1.4 }}>
                                {typeof f.entries[0] === 'string' ? f.entries[0] : f.entries[0]?.caption || f.entries[0]?.name || ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {allFeats.filter((f: any) => f.category === 'G' || f.category === 'O').length === 0 && (
                      <div style={{ color: '#718096', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>Loading feats...</div>
                    )}
                  </div>
                  {selectedFeat && (
                    <button onClick={() => {
                      const newScores = { ...baseScores };
                      const asiFromFeat = selectedFeat.ability?.[0];
                      const boosts: { stat: string; boost: number }[] = [];
                      if (asiFromFeat) {
                        for (const [stat, boost] of Object.entries(asiFromFeat)) {
                          newScores[stat] = (newScores[stat] || 10) + (boost as number);
                          boosts.push({ stat, boost: boost as number });
                        }
                      }
                      setBaseScores(newScores);
                      setAsiPicks([{ stat: 'feat', boost: 0 }, ...boosts]);
                      setAsiConfirmed(true);
                    }}
                      style={{ marginTop: '10px', padding: '8px 16px', borderRadius: '8px', background: theme.tagline_color, border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                      Take {selectedFeat.name}
                    </button>
                  )}
                </div>
              )}
              {/* Stat grid for +2/+1+1 modes */}
              {(!asiConfirmed && asiMode !== 'feat') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => {
                    const isPicked = asiPicks.find(p => p.stat === stat);
                    const isSelected = selectedASIStat === stat;
                    return (
                      <button key={stat} onClick={() => {
                        if (asiConfirmed) return;
                        if (asiMode === 'one') {
                          setSelectedASIStat(isSelected ? null : stat);
                        } else {
                          const currentPicks = [...asiPicks];
                          const existing = currentPicks.find(p => p.stat === stat);
                          if (existing) {
                            setAsiPicks(currentPicks.filter(p => p.stat !== stat));
                          } else if (currentPicks.length < 2) {
                            currentPicks.push({ stat, boost: 1 });
                            setAsiPicks(currentPicks);
                          }
                        }
                      }}
                        style={{ padding: '10px', borderRadius: '8px', border: `2px solid ${isPicked || isSelected ? theme.tagline_color : '#4a5568'}`, background: isPicked || isSelected ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: asiConfirmed ? 'default' : 'pointer', textAlign: 'center', opacity: asiConfirmed ? 0.6 : 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{stat.toUpperCase()}</div>
                        <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{baseScores[stat] || 10}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {!asiConfirmed && asiMode !== 'feat' && (
                <div style={{ marginTop: '12px' }}>
                  {asiMode === 'one' && selectedASIStat && (
                    <button onClick={() => {
                      const newScores = { ...baseScores };
                      newScores[selectedASIStat] = (newScores[selectedASIStat] || 10) + 2;
                      setBaseScores(newScores);
                      setAsiPicks([{ stat: selectedASIStat, boost: 2 }]);
                      setSelectedASIStat(null);
                      setAsiConfirmed(true);
                    }}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: theme.tagline_color, border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>
                      +2 {selectedASIStat.toUpperCase()}
                    </button>
                  )}
                  {asiMode === 'two' && asiPicks.length === 2 && (
                    <button onClick={() => {
                      const newScores = { ...baseScores };
                      for (const p of asiPicks) {
                        newScores[p.stat] = (newScores[p.stat] || 10) + 1;
                      }
                      setBaseScores(newScores);
                      setAsiConfirmed(true);
                    }}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: theme.tagline_color, border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>
                      +1 {asiPicks[0].stat.toUpperCase()} & +1 {asiPicks[1].stat.toUpperCase()}
                    </button>
                  )}
                  {asiMode === 'two' && asiPicks.length === 1 && (
                    <div style={{ fontSize: '0.8rem', color: '#718096' }}>Pick one more stat</div>
                  )}
                </div>
              )}
              {asiConfirmed && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#718096' }}>
                  Applied: {asiPicks.filter(p => p.stat !== 'feat').map(p => `+${p.boost} ${p.stat.toUpperCase()}`).join(', ') || 'Feat selected'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const LevelUpConfirmView = () => {
    const targetClass = levelingClass || draft.class;
    const classLevels = existingChar?.classLevels || [];
    const existingClassLevel = classLevels.find(cl => cl.className === targetClass)?.level ?? 0;
    const isNewClass = existingClassLevel === 0;
    const newClassLevel = isNewClass ? 1 : existingClassLevel + 1;
    const classInfo = selectedClassData?.info;
    const classFeatures = selectedClassData?.features || [];
    const subclassFeatures = selectedClassData?.subclassFeatures || [];
    const theme = CLASS_THEMES[targetClass.replace(/ /g, '')] || { color: '#b8860b', tagline_color: '#b8860b' };
    const conMod = getAbilityModifier(baseScores.con);
    const hpDisplay = getHPGainDisplay(classInfo, conMod);
    const hpGain = hpRollMode === 'average' ? hpDisplay.average : (rolledHpGain || hpDisplay.average);
    const newFeatures = getNewFeaturesAtLevel(classFeatures, targetClass, newClassLevel);
    const newSubclassFeatures = isNewClass ? [] : getNewSubclassFeaturesAtLevel(subclassFeatures, selectedSubclass || draft.subclass, newClassLevel);
    const subLevel = classInfo ? getSubclassLevel(classInfo) : 3;
    const needsSubclass = !isNewClass && newClassLevel >= subLevel && selectedSubclass && !draft.subclass;
    const asiChanges = asiConfirmed && asiPicks.length > 0 ? asiPicks.map(p => `${p.stat.toUpperCase()} +${p.boost}`).join(', ') : null;
    const newProfBonus = isASLevel(newClassLevel) && !isNewClass ? Math.ceil((existingChar?.totalLevel || 1) / 4) + 1 : null;
    // Spellcasting changes
    const newCantrips = classInfo && !isNewClass ? getNewCantripsKnown(classInfo, newClassLevel, existingClassLevel) : (classInfo ? getNewCantripsKnown(classInfo, newClassLevel, 0) : 0);
    const newSpellsKnown = classInfo && !isNewClass ? getNewSpellsKnown(classInfo, newClassLevel, existingClassLevel) : (classInfo ? getNewSpellsKnown(classInfo, newClassLevel, 0) : 0);
    const spellAbility = classInfo ? getSpellcastingAbility(classInfo) : 'int';
    const newPrepared = classInfo ? getNewPreparedCount(classInfo, newClassLevel, existingClassLevel, baseScores[spellAbility]) : 0;
    const slotChanges = classInfo && !isNewClass ? getNewSpellSlots(classInfo, newClassLevel, existingClassLevel) : (classInfo ? getNewSpellSlots(classInfo, newClassLevel, 0) : []);
    const featurePickLabels = Object.entries(featurePicks).map(([key, picks]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      return picks.length > 0 ? `${label}: ${picks.join(', ')}` : null;
    }).filter(Boolean);

    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ maxWidth: '620px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ color: theme.tagline_color, margin: '0 0 4px 0', fontSize: '1.3rem' }}>
            Confirm Level Up
          </h2>
          <p style={{ color: '#a0aec0', margin: '0 0 24px 0', fontSize: '0.85rem' }}>
            {targetClass} {isNewClass ? `1` : `${existingClassLevel} → ${newClassLevel}`} · Total Level {existingChar?.totalLevel || 1} → {(existingChar?.totalLevel || 1) + 1}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* HP */}
            <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Hit Points</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>+{hpGain}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: 4 }}>
                {hpRollMode === 'average' ? 'Average' : `Rolled (${rolledHpGain || '?'})`} · CON {conMod >= 0 ? `+${conMod}` : conMod}
              </div>
            </div>

            {/* Subclass */}
            {needsSubclass && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Subclass</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedSubclass}</span>
                </div>
              </div>
            )}

            {/* New Features */}
            {newFeatures.length > 0 && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>New Features</div>
                {newFeatures.map((f: any, i: number) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem', padding: '4px 0' }}>{f.name}</div>
                ))}
              </div>
            )}

            {/* Subclass Features */}
            {newSubclassFeatures.length > 0 && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>Subclass Features ({selectedSubclass || draft.subclass})</div>
                {newSubclassFeatures.map((f: any, i: number) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem', padding: '4px 0' }}>{f.name}</div>
                ))}
              </div>
            )}

            {/* ASI */}
            {asiChanges && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Ability Score Improvement</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{asiChanges}</span>
                </div>
              </div>
            )}

            {/* Feature Picks */}
            {featurePickLabels.length > 0 && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>Feature Choices</div>
                {featurePickLabels.map((label, i) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem', padding: '2px 0' }}>{label}</div>
                ))}
              </div>
            )}

            {/* Spellcasting */}
            {(newCantrips > 0 || newSpellsKnown > 0 || newPrepared > 0 || slotChanges.length > 0) && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>Spellcasting Growth</div>
                {newCantrips > 0 && <div style={{ color: '#cbd5e0', fontSize: '0.85rem' }}>+{newCantrips} new cantrip{newCantrips > 1 ? 's' : ''}</div>}
                {newSpellsKnown > 0 && <div style={{ color: '#cbd5e0', fontSize: '0.85rem' }}>+{newSpellsKnown} new known spell{newSpellsKnown > 1 ? 's' : ''}</div>}
                {newPrepared > 0 && <div style={{ color: '#cbd5e0', fontSize: '0.85rem' }}>+{newPrepared} prepared spells</div>}
                {slotChanges.map((change: any, i: number) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem' }}>
                    Level {change.level}: {change.existing || 0} → {change.new} slot{change.new > 1 ? 's' : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Proficiency Bonus */}
            {newProfBonus !== null && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Proficiency Bonus</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>+{newProfBonus}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const LevelUpClassPicker = () => {
    const classList = getCharClassList(existingChar);
    const classLevels = existingChar?.classLevels || [];
    const newTotalLevel = (existingChar?.totalLevel || 1) + 1;
    const [loadingData, setLoadingData] = useState(false);

    const handlePickClass = async (cls: string) => {
      setLoadingData(true);
      // Set the class to level
      setLevelingClass(cls);
      // Update draft.class to the selected class
      setDraft((prev: any) => ({ ...prev, class: cls }));
      // Load class data
      const data = await DataEngine.getClassFullData(cls);
      setSelectedClassData(data);
      // Normalize feature picks for this class
      const rawPicks = existingChar?.classFeaturePicks || {};
      const normalizedPicks: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(rawPicks)) {
        const colonIdx = k.indexOf(':');
        if (colonIdx > 0 && k.slice(0, colonIdx) === cls) {
          normalizedPicks[k.slice(colonIdx + 1)] = [...v];
        } else if (!k.includes(':')) {
          normalizedPicks[k] = [...v];
        }
      }
      setFeaturePicks(normalizedPicks);
      setLoadingData(false);
      // Move to intro
      setLevelUpPhase('intro');
    };

    const handleAddNewClass = async (cls: string) => {
      const prereqs = meetsMulticlassPrereqs(cls, existingChar?.baseStats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
      if (!prereqs.ok) {
        alert(`Cannot add ${cls}: requires ${prereqs.missing.join(', ')}`);
        return;
      }
      await handlePickClass(cls);
    };

    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
        <div style={{ maxWidth: '720px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'serif', color: '#f6e05e', margin: '0 0 8px 0', fontSize: '2.5rem' }}>Level Up</h1>
            <p style={{ color: '#a0aec0', fontSize: '1.1rem' }}>Total: Level {newTotalLevel - 1} → <span style={{ color: '#48bb78' }}>Level {newTotalLevel}</span></p>
          </div>

          {/* Existing classes */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>
              {classList.length === 1 ? 'YOUR CLASS' : 'ADVANCE AN EXISTING CLASS'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {classList.map(cls => {
                const cl = classLevels.find((c: any) => c.className === cls);
                const oldLevel = cl?.level || 1;
                const theme = CLASS_THEMES[cls.replace(/ /g, '')] || { color: '#b8860b', tagline_color: '#b8860b' };
                return (
                  <button key={cls} onClick={() => handlePickClass(cls)} disabled={loadingData}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px',
                      background: '#1a202c', border: `2px solid ${theme.tagline_color}44`, borderRadius: '12px',
                      color: 'white', cursor: loadingData ? 'wait' : 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      fontSize: '1rem', opacity: loadingData ? 0.6 : 1,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <img src={`/img/classes/Icons/${cls}.png`} style={{ width: '56px', height: '56px', borderRadius: '8px', border: `2px solid ${theme.tagline_color}` }} alt=""
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f6e05e', fontSize: '1.3rem' }}>{cls}</div>
                        <div style={{ fontSize: '0.85rem', color: '#718096' }}>Level {oldLevel} → <span style={{ color: '#48bb78', fontWeight: 'bold' }}>Level {oldLevel + 1}</span></div>
                        {classList.length === 1 && <div style={{ fontSize: '0.75rem', color: '#48bb78', marginTop: '2px' }}>Continue leveling your {cls}</div>}
                      </div>
                    </div>
                    <span style={{ color: '#48bb78', fontSize: '1.5rem', fontWeight: 'bold' }}>→</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add new class */}
          <div>
            <h3 style={{ color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>OR ADD A NEW CLASS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {DataEngine.getClassesList()
                .filter((cls: string) => !classList.includes(cls))
                .map(cls => {
                  const prereqs = meetsMulticlassPrereqs(cls, existingChar?.baseStats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
                  const theme = CLASS_THEMES[cls.replace(/ /g, '')] || { color: '#b8860b', tagline_color: '#b8860b' };
                  return (
                    <button key={cls} onClick={() => handleAddNewClass(cls)} disabled={loadingData || !prereqs.ok}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        padding: '14px 10px', background: '#1a202c', border: `2px solid ${prereqs.ok ? '#4a5568' : '#e53e3e44'}`,
                        borderRadius: '10px', color: 'white', cursor: (prereqs.ok && !loadingData) ? 'pointer' : 'not-allowed',
                        textAlign: 'center', opacity: prereqs.ok ? (loadingData ? 0.6 : 1) : 0.5, transition: '0.15s',
                      }}>
                      <img src={`/img/classes/Icons/${cls}.png`} style={{ width: '36px', height: '36px', borderRadius: '6px' }} alt=""
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f6e05e', fontSize: '0.8rem' }}>{cls}</div>
                        <div style={{ fontSize: '0.65rem', color: '#718096' }}>Lv 1</div>
                        {!prereqs.ok && (
                          <div style={{ fontSize: '0.6rem', color: '#fc8181', marginTop: '2px' }}>
                            Needs {prereqs.missing.join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AbilitiesView = () => {

    const classTheme = CLASS_THEMES[draft.class.replace(/ /g, '')] || { color: '#b8860b' };
    // --- 1. SEARCHING THE JSON TREE (CRAWLER) ---
    const getCategorizedSkills = () => {
      const raceData = rawSpecies.find(s => s.name === draft.race) ||
        allSubraces.find(s => `${s.raceName} (${s.name})` === draft.race);
      const classData = selectedClassData?.info;
      const bgData = allBackgrounds.find(b => b.name === draft.background);

      // A. BACKGROUND SKILLS
      const bgSkills = bgData?.skillProficiencies?.flatMap((obj: any) =>
        Object.keys(obj).map(normalizeSkillName)
      ) || [];

      // B. SPECIES SKILLS
      let raceAuto: string[] = [];
      let raceChoice = { from: [] as string[], count: 0 };
      raceData?.skillProficiencies?.forEach((obj: any) => {
        if (obj.choose) {
          raceChoice = {
            from: obj.choose.from.map(normalizeSkillName),
            count: obj.choose.count || obj.choose.amount
          };
        } else {
          raceAuto.push(...Object.keys(obj).map(normalizeSkillName));
        }
      });

      // C. CLASS SKILLS (Bard & Rogue Fix)
      let classChoice = { from: [] as string[], count: 0 };
      const classSkillObj = classData?.startingProficiencies?.skills?.[0];

      if (classSkillObj) {
        // Look for "any" (Bard/Rogue style) or "choose.from" (Fighter style)
        if (classSkillObj.any) {
          classChoice.from = ALL_SKILLS;
          classChoice.count = classSkillObj.any;
        } else if (classSkillObj.choose) {
          classChoice.count = classSkillObj.choose.count || classSkillObj.choose.amount || 0;
          // Handle if 'from' is just the word 'all'
          if (classSkillObj.choose.from === 'all') {
            classChoice.from = ALL_SKILLS;
          } else {
            classChoice.from = classSkillObj.choose.from.map(normalizeSkillName);
          }
        }
      }

      return { bgSkills, raceAuto, raceChoice, classChoice };
    };

    const MethodToggle = () => (
      <div style={pillToggleContainer}>
        {['array', 'pointbuy', 'manual'].map((m) => (
          <button
            key={m}
            onClick={() => {
              setStatMethod(m as any);
              setBaseScores({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }); // Reset scores on switch
            }}
            style={{
              ...pillToggleBtn,
              background: statMethod === m ? '#b8860b' : 'transparent',
              color: statMethod === m ? 'black' : 'white',
            }}
          >
            {m === 'pointbuy' ? 'Point Buy' : m === 'array' ? 'Standard Array' : 'Manual'}
          </button>
        ))}
      </div>
    );


    const POINT_BUY_COST: Record<string, number> = {
      '8': 0, '9': 1, '10': 2, '11': 3, '12': 4, '13': 5, '14': 7, '15': 9,
    };

    const computePointsRemaining = () => {
      const spent = Object.values(baseScores)
        .filter((v): v is number => v > 0)
        .reduce((sum, v) => sum + (POINT_BUY_COST[String(v)] ?? 0), 0);
      return 27 - spent;
    };

    const { bgSkills, raceAuto, raceChoice, classChoice } = getCategorizedSkills();
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const standardArray = [15, 14, 13, 12, 10, 8];
    const usedNumbers = Object.values(baseScores).filter(n => n > 0);
    const pointsRemaining = computePointsRemaining();

    // --- 2. PER-SECTION SKILL PICKING ---
    const bgProfs = draft.backgroundProficiencies || [];

    // Compute derived proficiencies (union of all sections)
    const allProficiencies = Array.from(new Set([
      ...bgProfs,
      ...raceAuto,
      ...pickedSkills.species,
      ...pickedSkills.class,
    ]));

    // Compute derived expertise: any skill appearing in 2+ sources
    const getSourceCount = (skill: string) => {
      let count = 0;
      if (bgProfs.includes(skill)) count++;
      if (raceAuto.includes(skill)) count++;
      if (pickedSkills.species.includes(skill)) count++;
      if (pickedSkills.class.includes(skill)) count++;
      return count;
    };
    const derivedExpertise = allProficiencies.filter(s => getSourceCount(s) >= 2);

    const handleSkillToggle = (section: 'class' | 'species', skill: string, limit: number) => {
      const sectionPicks = pickedSkills[section];
      const isPicked = sectionPicks.includes(skill);
      if (isPicked) {
        setPickedSkills({
          ...pickedSkills,
          [section]: sectionPicks.filter((s: string) => s !== skill),
        });
      } else if (sectionPicks.length < limit) {
        setPickedSkills({
          ...pickedSkills,
          [section]: [...sectionPicks, skill],
        });
      }
    };

    // --- 3. UI BUILDER ---
    const SkillBlock = ({ title, skills, limit, isFixed, color, section }: any) => {
      const sectionPicks = isFixed ? skills : pickedSkills[section as 'class' | 'species'] || [];
      const currentPicks = sectionPicks.filter((s: string) => skills.includes(s)).length;
      const isComplete = isFixed || currentPicks === limit;

      return (
        <div style={{ background: '#2d3748', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: `1px solid ${isComplete ? color : '#4a5568'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: color }}>{title.toUpperCase()}</span>
            {!isFixed && (
              <span style={{ fontSize: '0.7rem', color: isComplete ? '#48bb78' : '#f6e05e' }}>
                {currentPicks} / {limit} SELECTED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {skills.map((s: string) => {
              const isPickedHere = sectionPicks.includes(s) || isFixed;
              const sourceCount = getSourceCount(s);
              const isExpert = sourceCount >= 2;
              return (
                <button
                  key={s}
                  onClick={() => !isFixed && handleSkillToggle(section, s, limit)}
                  style={{
                    padding: '6px 14px', fontSize: '0.7rem', borderRadius: '4px', cursor: isFixed ? 'default' : 'pointer',
                    border: `1px solid ${isExpert ? '#f6e05e' : isPickedHere ? color : '#4a5568'}`,
                    background: isExpert ? '#f6e05e33' : isPickedHere ? `${color}33` : 'transparent',
                    color: isPickedHere ? 'white' : '#cbd5e0',
                    fontWeight: 'bold', transition: '0.2s',
                    opacity: isFixed ? 0.8 : 1,
                  }}
                  title={isExpert ? `${s.replace(/([A-Z])/g, ' $1')} — Expertise (picked from ${sourceCount} sources)` : ''}
                >
                  {s.replace(/([A-Z])/g, ' $1').toUpperCase()}
                  {isExpert && <span style={{ marginLeft: '4px', fontSize: '0.55rem', color: '#f6e05e', fontWeight: '900' }}>★</span>}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div style={subOverlayStyle}>
        <button onClick={() => setActiveSection(null)} style={backButtonStyle}>← BACK TO HUB</button>
        <h1 style={{ fontSize: '3rem', margin: '10px 0', fontFamily: 'serif' }}>Power & Skills</h1>
        <MethodToggle />

        <div style={{ display: 'flex', gap: '40px', marginTop: '30px' }}>
          <div style={{ flex: 1 }}>
            {statMethod === 'array' && (
              <div>
                <div style={sectionLabelStyle}>STANDARD ARRAY</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {standardArray.map(num => (
                    <div key={num} style={{
                      ...arrayNumStyle,
                      background: usedNumbers.includes(num) ? '#2d3748' : '#b8860b',
                      opacity: usedNumbers.includes(num) ? 0.3 : 1
                    }}>{num}</div>
                  ))}
                </div>
              </div>
            )}

            {statMethod === 'pointbuy' && (
              <div style={{ background: '#2d3748', padding: '15px', borderRadius: '8px', border: '1px solid #b8860b' }}>
                <div style={sectionLabelStyle}>POINTS REMAINING</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f6e05e' }}>{pointsRemaining} / 27</div>
                <div style={{ width: '100%', height: '6px', background: '#1a202c', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ width: `${(pointsRemaining / 27) * 100}%`, height: '100%', background: pointsRemaining >= 0 ? '#6366f1' : '#e53e3e', transition: 'width 0.2s' }} />
                </div>
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', fontSize: '0.65rem', color: '#718096' }}>
                  <span>8→9</span><span>9→10</span><span>10→11</span><span>11→12</span><span>12→13</span><span>13→14</span><span>14→15</span>
                  <span style={{ color: '#b8860b', fontWeight: 'bold' }}>Cost: 1</span><span style={{ color: '#b8860b', fontWeight: 'bold' }}>1</span><span style={{ color: '#b8860b', fontWeight: 'bold' }}>1</span><span style={{ color: '#b8860b', fontWeight: 'bold' }}>1</span><span style={{ color: '#b8860b', fontWeight: 'bold' }}>1</span><span style={{ color: '#b8860b', fontWeight: 'bold' }}>2</span><span style={{ color: '#b8860b', fontWeight: 'bold' }}>2</span>
                  <span></span>
                </div>
                <p style={{ fontSize: '0.75rem', color: pointsRemaining < 0 ? '#fc8181' : '#48bb78', marginTop: '8px' }}>
                  {pointsRemaining < 0 ? `Over budget by ${-pointsRemaining} point${-pointsRemaining !== 1 ? 's' : ''}!` : pointsRemaining === 0 ? 'Points fully allocated.' : `${pointsRemaining} point${pointsRemaining !== 1 ? 's' : ''} remaining.`}
                </p>
              </div>
            )}


            {/* LEFT: THE SOURCE-DRIVEN LISTS */}
            <div style={{ flex: 1 }}>
              <div style={sectionLabelStyle}>PROFICIENCIES BY SOURCE</div>

              {bgSkills.length > 0 && <SkillBlock title={`Background: ${draft.background}`} skills={bgSkills} isFixed color="#a0aec0" section="background" />}
              {raceAuto.length > 0 && <SkillBlock title="Species Traits" skills={raceAuto} isFixed color="#b8860b" section="species" />}
              {raceChoice.count > 0 && <SkillBlock title="Species Choices" skills={raceChoice.from} limit={raceChoice.count} color="#b8860b" section="species" />}
              {classChoice.count > 0 && <SkillBlock title={`Class: ${draft.class}`} skills={classChoice.from} limit={classChoice.count} color={classTheme.tagline_color} section="class" />}

              {!draft.class && <p style={{ color: '#718096', fontSize: '0.8rem' }}>Please select a Class and Background to see skill options.</p>}
            </div>
          </div>

          {/* RIGHT: ABILITY SCORES (Same as before) */}
          <div style={{ flex: 1.2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {stats.map(stat => {
              const base = baseScores[stat] || 0;
              const racial = getFinalRacialBonus(stat);
              const total = base > 0 ? base + racial : '-';

              return (
                <div key={stat} style={abilityCardStyle}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b8860b' }}>{stat.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>

                    {statMethod === 'array' ? (
                      <select
                        value={base || ""}
                        onChange={(e) => setBaseScores({ ...baseScores, [stat]: Number(e.target.value) })}
                        style={abilitySelectStyle}
                      >
                        <option value="">--</option>
                        {[...standardArray.filter(n => !usedNumbers.includes(n) || n === base)].sort((a, b) => b - a).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    ) : statMethod === 'pointbuy' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => {
                            const current = base || 8;
                            if (current <= 8) return;
                            const newVal = current - 1;
                            const prevCost = POINT_BUY_COST[String(current)] ?? 99;
                            const newCost = POINT_BUY_COST[String(newVal)] ?? 0;
                            const refund = prevCost - newCost;
                            if (pointsRemaining + refund <= 27) {
                              setBaseScores({ ...baseScores, [stat]: newVal <= 8 ? 0 : newVal });
                            }
                          }}
                          style={{ padding: '4px 10px', background: (base || 8) <= 8 ? '#2d3748' : '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: (base || 8) <= 8 ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
                          disabled={(base || 8) <= 8}
                        >
                          −
                        </button>
                        <span style={{ ...abilitySelectStyle, padding: '8px 12px', minWidth: '30px', textAlign: 'center' }}>{base || 8}</span>
                        <button
                          onClick={() => {
                            const current = base || 8;
                            if (current >= 15) return;
                            const newVal = current + 1;
                            const cost = (POINT_BUY_COST[String(newVal)] ?? 99) - (POINT_BUY_COST[String(current)] ?? 0);
                            if (pointsRemaining >= cost) {
                              setBaseScores({ ...baseScores, [stat]: newVal });
                            }
                          }}
                          style={{ padding: '4px 10px', background: (base || 8) >= 15 || pointsRemaining <= 0 ? '#2d3748' : '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: (base || 8) >= 15 || pointsRemaining <= 0 ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
                          disabled={(base || 8) >= 15 || pointsRemaining <= 0}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0" max="20"
                        value={base || ""}
                        onChange={(e) => setBaseScores({ ...baseScores, [stat]: Number(e.target.value) })}
                        style={{ ...abilitySelectStyle, width: '60px' }}
                      />
                    )}

                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.6rem', color: '#718096' }}>RACIAL</div><div style={{ color: '#48bb78', fontWeight: 'bold' }}>+{racial}</div></div>
                    <div style={{ flex: 1, textAlign: 'right' }}><div style={{ fontSize: '0.6rem', color: '#718096' }}>TOTAL</div><div style={{ fontSize: '2.5rem', fontWeight: '900', color: base > 0 ? 'white' : '#2d3748' }}>{total}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setActiveSection(null)}
          style={{ ...detailSelectButtonStyle, position: 'fixed', bottom: '40px', right: '40px', background: '#b8860b' }}
        >
          SAVE & RETURN
        </button>
      </div>
    );
  };

  // --- SUB-VIEW: BACKGROUND SELECTOR ---
  const DetailedBackgroundView = ({ data }: { data: any }) => {
    // 1. Fix the Back Button: It must clear inspectingBackground
    const closeView = () => setInspectingBackground(null);

    return (
      <div style={detailOverlayStyle}>
        {/* TOP NAVIGATION */}
        <div style={detailNavStyle}>
          <button onClick={closeView} style={detailBackButtonStyle}>← BACK</button>
          <button
            onClick={() => {
              setDraft({ ...draft, background: data.name });
              setInspectingBackground(null);
              setActiveSection(null);
            }}
            style={{ ...detailSelectButtonStyle, background: '#b8860b', color: 'white' }}
          >
            SELECT {data.name.toUpperCase()}
          </button>
        </div>

        {/* HERO SECTION - Fixed Image Path for Backgrounds */}
        <div style={{
          ...heroSectionStyle,
          // We use the helper we built earlier to handle the spaces in "Zhentarim Mercenary"
          backgroundImage: `url("${getBackgroundImg(data.name)}")`,
          backgroundColor: '#0a0d12'
        }}>
          <div style={heroGradientStyle} />
          <div style={heroContentStyle}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#cbd5e0', letterSpacing: '2px' }}>CHARACTER BACKGROUND</div>
            <h1 style={{ fontSize: '5rem', margin: '0 0 10px 0', fontFamily: 'serif' }}>{data.name}</h1>
            <div style={badgeStyle}>{data.source} SOURCE</div>
          </div>
        </div>

        <div style={infoGridContainerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '60px' }}>
            {/* LORE */}
            <div>
              <div style={sectionLabelStyle}>LORE & ORIGIN</div>
              <h2 style={sectionTitleStyle}>Your story so far</h2>
              <div style={loreTextStyle}>{formatEntries(data.description)}</div>
            </div>

            {/* MECHANICS */}
            <div>
              <div style={sectionLabelStyle}>BACKGROUND FEATURES</div>
              <h2 style={sectionTitleStyle}>What did you learn?</h2>

              {/* Display Skill Proficiencies if they exist */}
              {data.skillProficiencies && (
                <div style={featureItemStyle}>
                  <strong style={{ color: '#f6e05e' }}>Skill Proficiencies:</strong>
                  <p style={{ color: '#cbd5e0', marginTop: '5px' }}>
                    {data.skillProficiencies.map((p: any) => Object.keys(p).join(', ')).join(', ')}
                  </p>
                </div>
              )}

              {/* Map Background Traits/Features */}
              {data.entries?.filter((e: any) => e.name).map((feat: any, i: number) => (
                <div key={i} style={featureItemStyle}>
                  <strong style={{ color: '#f6e05e' }}>{cleanString(feat.name)}:</strong>
                  <div style={{ marginTop: '5px', color: '#cbd5e0' }}>{formatEntries(feat.entries || [feat.entry])}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-VIEW: BACKGROUND GRID ---
  const BackgroundView = () => (
    <div style={subOverlayStyle}>
      <button onClick={() => setActiveSection(null)} style={backButtonStyle}>← BACK TO HUB</button>
      <h1 style={{ fontSize: '3rem', margin: '10px 0', fontFamily: 'serif' }}>What's your story?</h1>

      {/* We use a wrapper div for the grid to ensure it doesn't break the parent scroll */}
      <div style={{ ...speciesGridStyle, paddingBottom: '100px' }}>
        {allBackgrounds.map(bg => {
          const bgImg = getBackgroundImg(bg.name);

          return (
            <div key={`${bg.name}-${bg.source}`} style={speciesCardStyle}>
              {/* Background Image */}
              <div style={{
                ...cardArtStyle,
                backgroundImage: `url("${bgImg}")`, // Notice the double quotes inside the url("")
                backgroundColor: '#1a202c',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />

              <div style={cardGradientOverlay} />

              <div style={cardContentStyle}>
                <h2 style={{ fontSize: '2.2rem', margin: 0 }}>{bg.name}</h2>
                <p style={cardDescriptionStyle}>{getRacePreview(bg.description)}</p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                  <button onClick={() => setInspectingBackground(bg)} style={detailsLinkStyle}>DETAILS ↗</button>
                  <button
                    onClick={() => handleSelection('background', bg)}
                    style={selectButtonStyle}
                  >
                    SELECT
                  </button>
                </div>
              </div>
              <div style={goldCornerTL} /><div style={goldCornerBR} />
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- SUB-VIEW: DETAILED CLASS LOOK ---
  const DetailedClassView = ({ data }: { data: any }) => {
    const info = data.info;
    const features = data.features || [];
    const subclassFeatures = data.subclassFeatures || [];
    const theme = CLASS_THEMES[info.name.replace(/ /g, '')] || CLASS_THEMES.Barbarian;
    const [expandedSub, setExpandedSub] = useState<string | null>(null);

    const getFeaturesForSubclass = (shortName: string) => {
      return subclassFeatures
        .filter((f: any) => f.subclassShortName === shortName)
        .sort((a: any, b: any) => a.level - b.level);
    };

    const cycleClass = async (newClassName: string) => {
      const newData = await DataEngine.getClassFullData(newClassName);
      setInspectingClass(newData);
    };

    // Strict Unique logic for subclasses
    const subclasses = (data.subclasses || []).reduce((acc: any[], current: any) => {
      if (!acc.find(item => item.name.trim() === current.name.trim())) {
        acc.push(current);
      }
      return acc;
    }, []);

    return (

      <div style={{
        ...detailOverlayStyle,
        background: '#0a0d12', // Solid background to hide the Hub
        zIndex: 2000 // Ensure it's above everything
      }}>
        <div style={sideRailStyle}>
          {DataEngine.getClassesList().map(clsName => {
            const isActive = clsName === info.name;
            return (
              <div
                key={clsName}
                onClick={() => cycleClass(clsName)}
                title={clsName}
                style={{
                  ...sideRailIconContainer,
                  borderLeft: isActive ? `4px solid ${theme.color}` : '4px solid transparent',
                  background: isActive ? `${theme.color}` : 'transparent'
                }}
              >
                <img
                  src={`/img/classes/Icons/${clsName}.png`}
                  style={{
                    width: '32px',
                    height: '32px',
                    filter: isActive ? 'none' : 'grayscale(100%) opacity(0.5)',
                    transition: '0.2s'
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ marginLeft: '70px' }}>
          {/* TOP NAVIGATION (Sticky) */}
          <div style={{ ...detailNavStyle, borderBottom: `1px solid ${theme.color}66` }}>
            <button onClick={() => setInspectingClass(null)} style={detailBackButtonStyle}>← BACK</button>
            <div style={{ fontWeight: 'bold', color: theme.color }}>{info.name.toUpperCase()}</div>
            <button
              onClick={() => {
                setDraft({ ...draft, class: info.name }); // Sets the name (e.g., "Barbarian")
                setSelectedClassData(data);
                setInspectingClass(null);
                setActiveSection(null);
              }}
              style={{ ...detailSelectButtonStyle, background: theme.color }}
            >
              SELECT
            </button>
          </div>

          {/* HERO SECTION */}
          <div style={{
            ...heroSectionStyle,
            backgroundImage: `url("/img/classes/landscapes/${info.name}.webp")`,
            // FALLBACK if image is missing:
            backgroundColor: '#1a202c'
          }}>
            <div style={heroGradientStyle} />
            <div style={heroContentStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                {/* Class Banner Icon */}
                <div style={{ ...classBannerContainer, position: 'relative', left: 0, top: 0 }}>
                  <img src={`/img/classes/Icons/${info.name}.png`} style={classIconOnBannerStyle} />
                </div>
                <div>
                  <h1 style={{ fontSize: '5rem', margin: '0 0 10px 0', fontFamily: 'serif', lineHeight: 1 }}>{info.name}</h1>
                  <h3 style={{ fontSize: '1.2rem', color: theme.tagline_color, textTransform: 'uppercase', fontWeight: 'bold' }}>{theme.tagline}</h3>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '20px' }}>
                    {theme.pills?.map((pill: any) => (
                      <div
                        key={pill.full}
                        style={{
                          ...pillBadgeStyle,
                          borderColor: theme.tagline_color,      // Full brightness pink
                          background: `${hexToRGBA(theme.color, 0.25)}`, // 25% transparent pink
                          boxShadow: `0 0 10px ${hexToRGBA(theme.color, 0.1)}`, // Subtle glow
                        }}
                      >
                        {pill.full}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div style={{ ...infoGridContainerStyle, background: `${theme.color}`, paddingTop: '60px', paddingBottom: '100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginBottom: '80px' }}>
              <div>
                <div style={{ ...sectionLabelStyle, color: theme.tagline_color }}>CLASS HIGHLIGHTS</div>
                <h2 style={sectionTitleStyle}>How it feels to play</h2>
                <ul style={loreListStyle}>
                  {theme.highlights.map((h: string, i: number) => <li key={i} style={{ marginBottom: '10px' }}>{h}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ ...sectionLabelStyle, color: theme.tagline_color }}>STARTING CLASS FEATURES</div>
                <h2 style={sectionTitleStyle}>What are their abilities?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {features.filter((f: any) => f.level === 1).slice(0, 3).map((f: any, i: number) => (
                    <div key={i} style={{ color: '#cbd5e0', fontSize: '1.1rem' }}>
                      <strong style={{ color: 'white', borderBottom: `2px solid ${theme.tagline_color}` }}>{cleanString(f.name)}:</strong>
                      <span style={{ marginLeft: '10px' }}>{getRacePreview([f])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* GEAR BOX */}
            <div style={{ ...gearBoxStyle, borderColor: theme.color, background: 'rgba(0,0,0,0.4)' }}>
              <img src={`/img/classes/gear/${info.name}_gear.png`} style={{ width: '300px' }} onError={e => e.currentTarget.style.display = 'none'} />
              <div>
                <div style={{ ...sectionLabelStyle, color: theme.tagline_color }}>ICONIC GEAR</div>
                <h2 style={{ ...sectionTitleStyle, fontSize: '2rem' }}>What equipment do they carry?</h2>
                <ul style={loreListStyle}>
                  {theme.gear.map((g: string, i: number) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            </div>

            {/* SUBCLASSES */}
            <div style={{ marginTop: '100px' }}>
              <div style={{ ...sectionLabelStyle, color: theme.tagline_color }}>{info.name.toUpperCase()} PATHS</div>
              <h2 style={sectionTitleStyle}>What type of {info.name} will you be?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
                {subclasses.map((sub: any) => {
                  const parentClass = info.name;
                  const subName = sub.name;
                  const folderPath = encodeURIComponent(parentClass);
                  const fileName = encodeURIComponent(`${subName} ${parentClass}.webp`);
                  const imagePath = `/img/classes/subclasses/${folderPath}/${fileName}`;
                  const isExpanded = expandedSub === sub.name;
                  const features = getFeaturesForSubclass(sub.shortName);

                  return (
                    <div
                      key={`${sub.name}-${sub.source}`}
                      onClick={() => setExpandedSub(isExpanded ? null : sub.name)}
                      style={{
                      ...subclassCardStyle,
                      height: isExpanded ? 'auto' : '200px',
                      gridColumn: isExpanded ? '1 / -1' : undefined,
                      borderColor: isExpanded ? theme.tagline_color : `${theme.color}aa`,
                      background: '#12161d',
                      boxShadow: isExpanded ? `0 0 20px ${theme.color}` : '0 4px 15px rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        ...cardArtStyle,
                        backgroundImage: `url("${imagePath}")`,
                        opacity: isExpanded ? 0.15 : 0.8,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center top',
                        transition: 'opacity 0.3s',
                      }} />

                      <div style={{
                        ...cardGradientOverlay,
                        background: isExpanded
                          ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 100%)'
                          : 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%)'
                      }} />

                      <div style={{ position: 'relative', zIndex: 3, padding: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: theme.tagline_color, fontWeight: 'bold', letterSpacing: '1px' }}>PATH OF THE</div>
                            <h3 style={{ fontSize: '1.8rem', margin: '5px 0', fontFamily: 'serif', color: 'white' }}>{sub.name}</h3>
                            <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>{sub.source}</div>
                          </div>
                          <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: '16px', borderTop: '1px solid #4a5568', paddingTop: '12px' }}>
                            {features.length === 0 && (
                              <p style={{ color: '#718096', fontSize: '0.8rem' }}>No feature details available.</p>
                            )}
                            {features.map((f: any) => (
                              <div key={`${f.name}-${f.level}`} style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '0.7rem', color: theme.tagline_color, marginBottom: '2px' }}>Level {f.level}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '3px', color: 'white' }}>{f.name}</div>
                                {f.entries && (
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0', lineHeight: '1.5' }}>
                                    {formatEntries(f.entries)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ ...goldCornerTL, borderColor: theme.color }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-VIEW: CLASS GALLERY ---
  const ClassView = () => (
    <div style={subOverlayStyle}>
      <button onClick={() => setActiveSection(null)} style={backButtonStyle}>← BACK TO HUB</button>
      <h1 style={{ fontSize: '3rem', margin: '10px 0', fontFamily: 'serif' }}>What's your vocation?</h1>

      <div style={speciesGridStyle}>
        {DataEngine.getClassesList().map(clsName => (
          <div key={clsName} style={classCardStyle}>
            {/* 1. Cinematic Landscape Background */}
            <div style={{
              ...cardArtStyle,
              backgroundImage: `url("/img/classes/landscapes/${clsName}.webp")`,
              backgroundColor: '#1a202c'
            }} />
            <div style={classCardGradient} />

            {/* 2. The Unique Class Banner */}
            <div style={{
              ...classBannerContainer,
              backgroundImage: `url("/img/classes/banner/${clsName}.png")`,
            }}>
              <img src={`/img/classes/Icons/${clsName}.png`} alt="" style={classIconOnBannerStyle} />
            </div>

            {/* 3. Card Content */}
            <div style={classCardContentStyle}>
              <h2 style={{ fontSize: '2.8rem', margin: 0, fontFamily: 'serif' }}>{clsName}</h2>

              {/* --- THE UPDATED PILLS SECTION (Uses the .short text) --- */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                {CLASS_THEMES[clsName.replace(/ /g, '')] ? (
                  CLASS_THEMES[clsName.replace(/ /g, '')].pills.map((pill: any) => (
                    <div
                      key={pill.short}
                      style={{
                        ...pillBadgeStyle,
                        borderColor: CLASS_THEMES[clsName.replace(/ /g, '')].tagline_color,
                        background: hexToRGBA(CLASS_THEMES[clsName.replace(/ /g, '')].color, 0.1),
                        padding: '2px 10px',
                        fontSize: '0.6rem'
                      }}
                    >
                      {pill.short.toUpperCase()}
                    </div>
                  ))
                ) : (
                  /* Fallback if theme is missing */
                  <div style={{ ...pillBadgeStyle, borderColor: '#4a5568' }}>ADVENTURER</div>
                )}
              </div>

              <p style={classDescriptionStyle}>
                {CLASS_THEMES[clsName.replace(/ /g, '')]?.tagline || `Masters of their craft, the ${clsName} brings unique skills to the party.`}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
                <button
                  onClick={async () => {
                    const data = await DataEngine.getClassFullData(clsName);
                    setInspectingClass(data);
                  }}
                  style={learnMoreButtonStyle}
                >
                  LEARN MORE
                </button>
                <button
                  onClick={() => handleSelection('class', { name: clsName })}
                  style={classSelectButtonStyle}
                >
                  SELECT
                </button>
              </div>
            </div>
            {/* Gold Accents */}
            <div style={goldCornerTL} /><div style={goldCornerBR} />
          </div>
        ))}
      </div>
    </div>
  );

  // Helper for Image URLs - Handles spaces and parentheses
  const getImagePath = (name: string) => {
    const noParens = name.replace(/\s\(.*\)/, '');
    // If your files use spaces, leave this as is. 
    // If your files use underscores, use: .replace(/\s/g, '_')
    const encoded = encodeURIComponent(noParens);
    return `/img/races/${encoded}.webp`;
  };

  // --- 4. SUBRACE PICKER MODAL ---
  const SubracePickerModal = ({ parentSpecies }: { parentSpecies: any }) => {
    const subraces = allSubraces.filter(s => s.raceName === parentSpecies.name);

    const getSubraceStats = (sub: any) => {
      let finalStats: Record<string, number> = {};
      const parent = rawSpecies.find(s => s.name === sub.raceName && s.source === sub.raceSource);
      const parentAbility = parent?.ability?.[0] || {};
      Object.entries(parentAbility).forEach(([stat, val]) => {
        if (typeof val === 'number') finalStats[stat] = val;
      });
      const subAbility = sub.ability?.[0] || {};
      Object.entries(subAbility).forEach(([stat, val]) => {
        if (typeof val === 'number') finalStats[stat] = (finalStats[stat] || 0) + val;
      });
      return Object.keys(finalStats).length > 0 ? [finalStats] : null;
    };

    const handleSelectSubrace = (sub: any) => {
      const fullName = `${sub.raceName} (${sub.name})`;
      const stats = getSubraceStats(sub);
      setDraft({
        ...draft,
        race: fullName,
        baseStats: { ...draft.baseStats, ...(stats?.[0] || {}) },
      });
      setSubracePickerFor(null);
      setActiveSection(null);
    };

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
      }}>
        <div style={{
          background: '#1a202c', borderRadius: '12px', border: '2px solid #b8860b',
          width: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '24px 30px', borderBottom: '1px solid #2d3748',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={sectionLabelStyle}>CHOOSE SUBRACE</div>
              <h2 style={{ margin: '4px 0 0 0', fontFamily: 'serif' }}>{parentSpecies.name}</h2>
            </div>
            <button onClick={() => setSubracePickerFor(null)} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 30px' }}>
            <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              This species has subraces. Pick one to customize your lineage.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subraces.map((sub) => {
                const stats = getSubraceStats(sub);
                const traits = (sub.entries || []).filter((e: any) => e.name).slice(0, 2);
                return (
                  <div
                    key={`${sub.source}-${sub.name}`}
                    style={{
                      background: '#2d3748', borderRadius: '10px',
                      border: '1px solid #4a5568', padding: '20px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      gap: '16px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontFamily: 'serif' }}>{sub.name}</h3>
                      {stats && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {renderRacialBonuses(stats)}
                        </div>
                      )}
                      {traits.map((t: any, i: number) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: '4px' }}>
                          <strong style={{ color: '#cbd5e0' }}>{cleanString(t.name)}</strong>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleSelectSubrace(sub)}
                      style={{
                        background: '#b8860b', border: 'none', color: 'black',
                        padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold',
                        cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem',
                      }}
                    >
                      SELECT
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: '16px 30px', borderTop: '1px solid #2d3748', textAlign: 'right' }}>
            <button
              onClick={() => { setSubracePickerFor(null); setInspectingSpecies(parentSpecies); }}
              style={detailsLinkStyle}
            >
              View full species details ↗
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- 5. SUB-VIEW: DETAILED LOOK ---
  const DetailedSpeciesView = ({ data }: { data: any }) => {
    const baseName = data.raceName || data.name;
    const relatedVersions = allSpecies.filter(s => s.name === baseName);
    const subraces = allSubraces.filter(s => s.raceName === baseName);

    const [activeSub, setActiveSub] = useState(data);

    // --- BULLETPROOF MERGE LOGIC ---
    const getFinalStats = () => {
      let finalStats: Record<string, number> = {};

      // 1. If it's a subrace, find the parent stats first
      if (activeSub.raceName) {
        const parent = rawSpecies.find(s =>
          s.name === activeSub.raceName &&
          s.source === activeSub.raceSource
        );

        // Extract stats from parent (e.g., Cha +2)
        const parentAbilityObj = parent?.ability?.[0] || {};
        Object.entries(parentAbilityObj).forEach(([stat, val]) => {
          if (typeof val === 'number') finalStats[stat] = val;
        });
      }

      // 2. Add stats from the current selection (the subrace, e.g., Str +1)
      const subAbilityObj = activeSub.ability?.[0] || {};
      Object.entries(subAbilityObj).forEach(([stat, val]) => {
        if (typeof val === 'number') {
          // If the parent already had it, we take the higher/latest one 
          // (usually they don't overlap in 5e)
          finalStats[stat] = (finalStats[stat] || 0) + val;
        }
      });

      return Object.keys(finalStats).length > 0 ? [finalStats] : null;
    };

    const combinedAbilities = getFinalStats();

    return (
      <div style={detailOverlayStyle}>
        {/* NAVIGATION BAR */}
        <div style={detailNavStyle}>
          <button onClick={() => setInspectingSpecies(null)} style={detailBackButtonStyle}>← BACK</button>
          <div style={{ fontWeight: 'bold', color: '#b8860b' }}>SPECIES BROWSER</div>
          <button
            onClick={() => {
              // We save the Name. If it's a subrace, we format it like "Aasimar (Fallen)"
              const fullName = activeSub.raceName ? `${activeSub.raceName} (${activeSub.name})` : activeSub.name;
              setDraft({ ...draft, race: fullName, baseStats: { ...draft.baseStats, ...combinedAbilities?.[0] } });
              setInspectingSpecies(null);
              setActiveSection(null);
            }}
            style={detailSelectButtonStyle}
          >
            SELECT {activeSub.name.toUpperCase()}
          </button>
        </div>

        {/* HERO SECTION */}
        <div style={{ ...heroSectionStyle, backgroundImage: `url("${getImagePath(activeSub.raceName || activeSub.name)}")` }}>
          <div style={heroGradientStyle} />
          <div style={heroContentStyle}>
            <h1 style={{ fontSize: '4.5rem', margin: '0 0 10px 0', fontFamily: 'serif' }}>{activeSub.name}</h1>

            {/* VERSION SWITCHER TABS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
              {relatedVersions.map(v => (
                <button
                  key={v.source + v.name}
                  onClick={() => setActiveSub(v)}
                  style={{
                    ...versionTabStyle,
                    background: activeSub.source === v.source && !activeSub.raceName ? '#b8860b' : 'rgba(255,255,255,0.1)',
                    color: activeSub.source === v.source && !activeSub.raceName ? 'black' : 'white'
                  }}
                >
                  {v.source} CORE
                </button>
              ))}
              {subraces.map(s => (
                <button
                  key={s.source + s.name}
                  onClick={() => setActiveSub(s)}
                  style={{
                    ...versionTabStyle,
                    background: activeSub.name === s.name && activeSub.source === s.source ? '#48bb78' : 'rgba(255,255,255,0.1)',
                    borderColor: activeSub.name === s.name && activeSub.source === s.source ? '#48bb78' : 'rgba(255,255,255,0.2)'
                  }}
                >
                  {s.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div style={infoGridContainerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '60px' }}>

            {/* Left Column: Lore */}
            <div>
              <div style={sectionLabelStyle}>DESCRIPTION</div>
              <div style={loreTextStyle}>
                {formatEntries(activeSub.description || activeSub.entries)}
              </div>
            </div>

            {/* Right Column: Mechanics */}
            <div>
              <div style={sectionLabelStyle}>RACIAL TRAITS</div>

              {/* Ability Score Box */}
              <div style={{ ...featureItemStyle, borderLeft: '4px solid #b8860b', paddingLeft: '20px' }}>
                <strong style={{ color: '#f6e05e', fontSize: '1.1rem' }}>Ability Score Increase:</strong>
                <div style={{ marginTop: '10px' }}>
                  {combinedAbilities ? renderRacialBonuses(combinedAbilities) : <i>No stat bonuses for this version (2024 Rules).</i>}
                </div>
              </div>

              {/* Mapping other traits */}
              {(activeSub.entries || []).filter((e: any) => e.name).map((feat: any, i: number) => (
                <div key={i} style={featureItemStyle}>
                  <strong style={{ color: 'white', textDecoration: 'underline' }}>{cleanString(feat.name)}:</strong>
                  <div style={{ marginTop: '8px', fontSize: '0.95rem', color: '#cbd5e0' }}>{formatEntries([feat])}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: '100px' }} />
      </div>
    );
  };

  // --- Isekai picker ---
  const STAT_ABBREV: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const ALL_LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon', 'Telepathy'];
  const DEFAULT_ISEKAI_TYPES = [
    { id: 'teleport', label: 'Teleported', description: 'You were physically transported from your original world. Your body and mind remain unchanged, but the transition has left you slightly altered.', bonuses: '+1 to any ability score, one skill proficiency of your choice' },
    { id: 'summoned', label: 'Summoned', description: 'A powerful being called you here as a servant, champion, or pawn. Some of their magic lingers in your soul.', bonuses: 'One cantrip from any class spell list, one 1st-level spell you can cast once per long rest' },
    { id: 'reincarnation', label: 'Reincarnated', description: 'Your soul was reborn into a new body in this world. You retain faint echoes of your past life.', bonuses: '+1 to any ability score, one additional language of your choice' },
    { id: 'divineDeal', label: "Divine Deal", description: 'A deity or cosmic force plucked you from your world for a purpose. Their blessing empowers you.', bonuses: '+1 Charisma, you can cast Bless once per long rest without a spell slot' },
  ];

  const IsekaiPicker = () => {
    const types = isekaiConfig.length > 0 ? isekaiConfig : DEFAULT_ISEKAI_TYPES;
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [pok, setPok] = useState<'type' | 'bonus'>('type');
    const [asiStat, setAsiStat] = useState<string | null>(null);
    const [skill, setSkill] = useState('');
    const [language, setLanguage] = useState('');
    const [cantrip, setCantrip] = useState('');
    const [spell1, setSpell1] = useState('');

    const pick = selectedTypeId ? types.find(t => t.id === selectedTypeId) : null;
    const apply = () => {
      if (!selectedTypeId) return;
      const bonusData: Record<string, any> = {};
      const tid = selectedTypeId;
      if (tid === 'teleport' && asiStat) bonusData.asi = { [asiStat]: 1 };
      if (tid === 'reincarnation' && asiStat) bonusData.asi = { [asiStat]: 1 };
      if (tid === 'divineDeal') bonusData.asi = { cha: 1 };
      if (skill) bonusData.skill = skill;
      if (language) bonusData.language = language;
      if (cantrip) bonusData.cantrip = cantrip;
      if (spell1) bonusData.spell1 = spell1;

      const pk = types.find(t => t.id === tid);
      const isekaiData = { type: tid, bonuses: pk?.bonuses || '', ...bonusData };
      const newDraft = { ...draft, moduleData: { ...draft.moduleData, isekai: isekaiData } };
      if (bonusData.asi) {
        for (const [s, v] of Object.entries(bonusData.asi) as [string, number][]) {
          newDraft.baseStats[s] = (newDraft.baseStats[s] || 10) + v;
        }
      }
      if (bonusData.skill) {
        newDraft.proficiencies = [...(newDraft.proficiencies || []), bonusData.skill];
      }
      if (bonusData.cantrip) {
        const ex = newDraft.spells || { cantrips: [], known: [], prepared: [] };
        newDraft.spells = { ...ex, cantrips: [...(ex.cantrips || []), bonusData.cantrip] };
      }
      if (bonusData.spell1) {
        const ex = newDraft.spells || { cantrips: [], known: [], prepared: [] };
        newDraft.spells = { ...ex, known: [...(ex.known || []), bonusData.spell1] };
      }
      setDraft(newDraft);
      setShowIsekaiPicker(false);
      setIsekaiSpeciesMode(true);
      setActiveSection('species');
      setSearchTerm('');
    };

    const canConfirmBonus = () => {
      if (!selectedTypeId) return false;
      if (selectedTypeId === 'teleport') return !!asiStat && !!skill;
      if (selectedTypeId === 'summoned') return !!cantrip && !!spell1;
      if (selectedTypeId === 'reincarnation') return !!asiStat && !!language;
      if (selectedTypeId === 'divineDeal') return true;
      return false;
    };

    // Bonus config step
    if (pok === 'bonus' && pick) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a202c', padding: '30px', borderRadius: '12px', border: '2px solid #b8860b', width: '540px' }}>
            <button onClick={() => setPok('type')} style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 12, padding: 0 }}>← Back to origin types</button>
            <h2 style={{ fontFamily: 'serif', margin: '0 0 4px 0' }}>{pick.label}</h2>
            <p style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.4 }}>{pick.description}</p>

            {(selectedTypeId === 'teleport' || selectedTypeId === 'reincarnation') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#f6e05e', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Choose an ability score to increase by 1:</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(STAT_ABBREV).map(([key, l]) => (
                    <button key={key} onClick={() => setAsiStat(key)}
                      style={{ padding: '8px 14px', background: asiStat === key ? '#6366f1' : '#2d3748', border: asiStat === key ? '2px solid #818cf8' : '1px solid #4a5568', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            {selectedTypeId === 'divineDeal' && (
              <div style={{ marginBottom: 16, padding: '12px', background: '#1a202c', borderRadius: '6px' }}>
                <p style={{ color: '#68d391', fontSize: '0.85rem', margin: 0 }}>Charisma +1 (applied automatically)</p>
              </div>
            )}

            {selectedTypeId === 'teleport' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#f6e05e', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Choose a skill proficiency:</label>
                <select value={skill} onChange={e => setSkill(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}>
                  <option value="">Select a skill...</option>
                  {ALL_SKILLS.map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g, ' $1').trim()}</option>)}
                </select>
              </div>
            )}

            {selectedTypeId === 'reincarnation' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#f6e05e', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Choose an additional language:</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}>
                  <option value="">Select a language...</option>
                  {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}

            {selectedTypeId === 'summoned' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#f6e05e', fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Cantrip gained (from any class list):</label>
                <input value={cantrip} onChange={e => setCantrip(e.target.value)} placeholder="e.g. Fire Bolt, Minor Illusion..."
                  style={{ width: '100%', padding: '8px', marginBottom: 12, background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }} />
                <label style={{ color: '#f6e05e', fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>1st-level spell (once per long rest):</label>
                <input value={spell1} onChange={e => setSpell1(e.target.value)} placeholder="e.g. Shield, Cure Wounds..."
                  style={{ width: '100%', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setPok('type')} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Back</button>
              <button disabled={!canConfirmBonus()} onClick={apply}
                style={{ flex: 1, padding: '10px', background: canConfirmBonus() ? '#b8860b' : '#4a5568', border: 'none', color: 'white', borderRadius: '6px', cursor: canConfirmBonus() ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Apply Bonuses &amp; Pick Race
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Type picker step
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a202c', padding: '30px', borderRadius: '12px', border: '2px solid #b8860b', width: '540px', maxHeight: '85vh', overflowY: 'auto' }}>
          <h2 style={{ fontFamily: 'serif', margin: '0 0 4px 0' }}>How did you arrive?</h2>
          <p style={{ color: '#a0aec0', fontSize: '0.85rem', marginBottom: '20px' }}>Your character is from another world. Choose how you got here. This grants bonuses.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {types.map((t: any) => (
              <button key={t.id} onClick={() => setSelectedTypeId(t.id)}
                style={{ padding: '14px 18px', background: selectedTypeId === t.id ? '#3a4a5e' : '#2d3748', border: selectedTypeId === t.id ? '2px solid #f6e05e' : '1px solid #4a5568', borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left', transition: '0.15s' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#a0aec0', lineHeight: 1.4 }}>{t.description}</div>
                <div style={{ fontSize: '0.75rem', color: '#68d391', marginTop: 6 }}>Bonus: {t.bonuses}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => { setShowIsekaiPicker(false); }}
              style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
              Skip (not from another world)
            </button>
            <button disabled={!selectedTypeId} onClick={() => { setPok('bonus'); }}
              style={{ flex: 1, padding: '10px', background: selectedTypeId ? '#b8860b' : '#4a5568', border: 'none', color: 'white', borderRadius: '6px', cursor: selectedTypeId ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Next: Configure Bonuses
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- 6. SUB-VIEW: SPECIES SELECTOR ---
  const SpeciesView = () => {
    const speciesList = isekaiSpeciesMode ? allSpeciesUnfiltered : allSpecies;
    return (
    <div style={subOverlayStyle}>
      <button onClick={() => { if (isekaiSpeciesMode) { setIsekaiSpeciesMode(false); setSearchTerm(''); } setActiveSection(null); }} style={backButtonStyle}>← BACK TO HUB</button>
      <h1 style={{ fontSize: '2.5rem', margin: '10px 0' }}>{isekaiSpeciesMode ? 'Choose your new-world race' : "What's your lineage?"}</h1>
      {isekaiSpeciesMode && (
        <p style={{ color: '#68d391', fontSize: '0.85rem', marginBottom: '8px' }}>
          Your character is from another world. All races are available regardless of campaign restrictions.
        </p>
      )}
      <input
        placeholder="Search species..."
        style={searchFieldStyle}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div style={speciesGridStyle}>
        {!isekaiSpeciesMode && isekaiEnabled && (
          <div key="__isekai" style={{ ...speciesCardStyle, border: '2px solid #f6e05e' }}>
            <div style={{ ...cardArtStyle, background: 'linear-gradient(135deg, #6b46c1, #d53f8c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '3rem' }}>🌌</span>
            </div>
            <div style={cardGradientOverlay} />
            <div style={cardContentStyle}>
              <h2 style={{ fontSize: '2.2rem', margin: 0 }}>Isekai</h2>
              <p style={cardDescriptionStyle}>A character transported from another world. Bypass all race restrictions.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                <button onClick={() => { setShowIsekaiPicker(true); }}
                  style={{ ...selectButtonStyle, background: '#6b46c1' }}>
                  FROM ANOTHER WORLD
                </button>
              </div>
            </div>
            <div style={goldCornerTL} /><div style={goldCornerBR} />
          </div>
        )}
        {speciesList
          .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(s => (
            <div key={s.name} style={speciesCardStyle}>
              <div style={{
                ...cardArtStyle,
                backgroundImage: `url("${getImagePath(s.name)}")`,
                backgroundColor: '#1a202c'
              }} />
              <div style={cardGradientOverlay} />
              <div style={cardContentStyle}>
                <h2 style={{ fontSize: '2.2rem', margin: 0 }}>{s.name}</h2>
                <p style={cardDescriptionStyle}>{getRacePreview(s.description)}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                  <button onClick={() => setInspectingSpecies(s)} style={detailsLinkStyle}>DETAILS ↗</button>
                  <button
                    onClick={() => {
                      const hasSubraces = allSubraces.filter(sub => sub.raceName === s.name).length > 0;
                      const hasMultipleVersions = rawSpecies.filter(rs => rs.name === s.name).length > 1;
                      if (hasSubraces) {
                        setSubracePickerFor(s);
                      } else if (hasMultipleVersions) {
                        setInspectingSpecies(s);
                      } else {
                        handleSelection('species', s);
                      }
                    }}
                    style={selectButtonStyle}
                  >
                    SELECT
                  </button>
                </div>
              </div>
              <div style={goldCornerTL} /><div style={goldCornerBR} />
            </div>
          ))}
      </div>
    </div>
  );
  };

  const EquipmentSelectionView = () => {
    const startingGear = selectedClassData?.info?.startingEquipment;
    const choices = startingGear?.defaultData || [];
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [purchasedItems, setPurchasedItems] = useState<{ name: string; quantity: number }[]>([]);
    const [mandatoryAdded, setMandatoryAdded] = useState(false);

    // --- AUTO-GRANT MANDATORY (_) ITEMS ---
    useEffect(() => {
      if (mandatoryAdded || !choices.length) return;
      const autoGear: { name: string; quantity: number }[] = [];
      choices.forEach((group: any) => {
        const mandatory = group._;
        if (!mandatory) return;
        const itemsArray = Array.isArray(mandatory) ? mandatory : [mandatory];
        itemsArray.forEach((i: any) => {
          if (i.equipmentType) return;
          if (i.value) return;
          const itemName = typeof i === 'string' ? cleanString(i) : cleanString(i.item || i.name);
          if (!itemName) return;
          const packItems = expandPack(itemName);
          if (packItems) {
            packItems.forEach((p) => autoGear.push(p));
          } else {
            autoGear.push({
              name: itemName,
              quantity: typeof i === 'object' && i.quantity ? i.quantity : 1,
            });
          }
        });
      });
      if (autoGear.length === 0) { setMandatoryAdded(true); return; }
      const enrichItem = (name: string) => {
        const lower = name.toLowerCase();
        return allLibraryItems.find((lib: any) => lib.name.toLowerCase() === lower && lib.source === 'XPHB')
          || allLibraryItems.find((lib: any) => lib.name.toLowerCase() === lower);
      };
      setDraft((prev: any) => {
        const existingNames = new Set((prev.inventory || []).map((i: any) => i.name.toLowerCase()));
        const toAdd = autoGear
          .filter((g) => !existingNames.has(g.name.toLowerCase()))
          .map((g, idx) => {
            const libItem = enrichItem(g.name);
            const acBonus = libItem?.ac ? (typeof libItem.ac === 'number' ? libItem.ac : (libItem.ac.ac || 0)) : 0;
            return {
              id: `auto-${idx}-${g.name}`,
              name: g.name,
              equipped: false,
              quantity: g.quantity || 1,
              entries: libItem?.entries || [],
              weight: libItem?.weight ? Number(libItem.weight) : undefined,
              type: libItem?.type || undefined,
              dmg1: libItem?.dmg1 || undefined,
              modifiers: acBonus ? { ac: acBonus } : undefined,
            };
          });
        return { ...prev, inventory: [...(prev.inventory || []), ...toAdd] };
      });
      setMandatoryAdded(true);
    }, [choices, mandatoryAdded]);

    // --- 1. ROBUST LABEL GENERATOR ---
    const generateGearLabel = (items: any[]) => {
      if (!items || items.length === 0) return "Standard Gear";

      const itemArray = Array.isArray(items) ? items : [items];

      return itemArray.map(item => {
        if (typeof item === 'string') return cleanString(item);

        if (item.value) {
          const gp = Math.floor(item.value / 100);
          return gp > 0 ? `${gp} GP` : `${item.value} CP`;
        }

        // Handle "any martial/simple weapon" from class JSON
        if (item.equipmentType) {
          const isMartial = item.equipmentType.toLowerCase().includes('martial');
          return `Any ${isMartial ? 'Martial' : 'Simple'} Weapon`;
        }

        // Handle specific item objects
        if (item.item) {
          const name = cleanString(item.item);
          return item.quantity && item.quantity > 1 ? `${item.quantity} ${name}s` : name;
        }

        if (item.contains) return cleanString(item.name || "Pack");

        return "Special Item";
      }).join(", ");
    };

    const expandPack = (itemName: string): { name: string; quantity: number }[] | null => {
      const lowerName = itemName.toLowerCase();
      const libItem = allLibraryItems.find(
        (lib: any) => lib.name.toLowerCase() === lowerName && lib.packContents && lib.source === 'XPHB'
      ) || allLibraryItems.find(
        (lib: any) => lib.name.toLowerCase() === lowerName && lib.packContents
      );
      if (!libItem || !libItem.packContents) return null;
      const results: { name: string; quantity: number }[] = [];
      libItem.packContents.forEach((entry: any) => {
        if (typeof entry === 'string') {
          results.push({ name: cleanString(entry), quantity: 1 });
        } else if (entry.item) {
          results.push({ name: cleanString(entry.item), quantity: entry.quantity || 1 });
        } else if (entry.special) {
          results.push({ name: entry.special, quantity: 1 });
        }
      });
      return results;
    };

    const handleChoiceClick = (index: number, key: string, items: any) => {
      if (!items) return;
      const itemsArray = Array.isArray(items) ? items : [items];

      const genericItem = itemsArray.find((i: any) => i.equipmentType);

      const newChoices = [...equipmentChoices];
      newChoices[index] = key;
      setEquipmentChoices(newChoices);

      const gearToAdd: { name: string; quantity: number }[] = [];
      let totalCopper = 0;

      itemsArray.forEach((i: any) => {
        if (i.equipmentType) return;
        if (i.value) {
          totalCopper += i.value;
          return;
        }
        const itemName = typeof i === 'string' ? cleanString(i) : cleanString(i.item || i.name);
        if (!itemName) return;

        const packItems = expandPack(itemName);
        if (packItems) {
          packItems.forEach((p) => gearToAdd.push(p));
        } else {
          gearToAdd.push({
            name: itemName,
            quantity: typeof i === 'object' && i.quantity ? i.quantity : 1
          });
        }
      });

      const enrichItem = (name: string) => {
        const lower = name.toLowerCase();
        return allLibraryItems.find(
          (lib: any) => lib.name.toLowerCase() === lower && lib.source === 'XPHB'
        ) || allLibraryItems.find(
          (lib: any) => lib.name.toLowerCase() === lower
        );
      };

      setDraft((prev: any) => {
        const otherGear = (prev.inventory || []).filter(
          (invItem: any) => !invItem.id.startsWith(`row-${index}`)
        );
        const taggedGear = gearToAdd.map((g, idx) => {
          const libItem = enrichItem(g.name);
          const acBonus = libItem?.ac ? (typeof libItem.ac === 'number' ? libItem.ac : (libItem.ac.ac || 0)) : 0;
          return {
            id: `row-${index}-${g.name}-${idx}`,
            name: g.name,
            equipped: false,
            quantity: g.quantity || 1,
            entries: libItem?.entries || [],
            weight: libItem?.weight ? Number(libItem.weight) : undefined,
            type: libItem?.type || undefined,
            dmg1: libItem?.dmg1 || undefined,
            modifiers: acBonus ? { ac: acBonus } : undefined,
          };
        });
        const extraGold = totalCopper > 0
          ? { gp: (prev.currency?.gp || 0) + Math.floor(totalCopper / 100) }
          : {};
        return {
          ...prev,
          inventory: [...otherGear, ...taggedGear],
          currency: totalCopper > 0
            ? { ...(prev.currency || { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }), ...extraGold }
            : prev.currency
        };
      });

      if (genericItem) {
        setActiveEquipmentPicker({
          groupIndex: index,
          choiceKey: key,
          filter: genericItem.equipmentType
        });
      }
    };

    const goldFormula = startingGear?.goldAlternative || "4d4 x 10"; // Fallback

    // HELPER: Handle Gold Rolling
    const handleRollGold = () => {
      // Simple parser for 5e.tools format: "5d4 x 10"
      const cleanFormula = cleanString(goldFormula); // Strips {@dice ...}
      const [dice, multiplier] = cleanFormula.toLowerCase().split('x');
      const [count, sides] = dice.trim().split('d').map(Number);
      const mult = Number(multiplier?.trim()) || 1;

      let total = 0;
      for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      setRolledGold(total * mult);
    };

    return (
      <div style={subOverlayStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div>
            <div style={sectionLabelStyle}>PHASE 2: GEAR & INVENTORY</div>
            <h1 style={{ fontSize: '3rem', margin: '10px 0', fontFamily: 'serif' }}>Equip your hero</h1>
          </div>

          {/* --- THE MODE TOGGLE --- */}
          <div style={{ display: 'flex', background: '#1a202c', padding: '5px', borderRadius: '30px', border: '1px solid #4a5568' }}>
            <button
              onClick={() => setEquipmentMode('gear')}
              style={{
                ...pillBadgeStyle,
                border: 'none',
                background: equipmentMode === 'gear' ? '#b8860b' : 'transparent',
                color: equipmentMode === 'gear' ? 'black' : 'white'
              }}
            >
              CLASS GEAR
            </button>
            <button
              onClick={() => setEquipmentMode('gold')}
              style={{
                ...pillBadgeStyle,
                border: 'none',
                background: equipmentMode === 'gold' ? '#b8860b' : 'transparent',
                color: equipmentMode === 'gold' ? 'black' : 'white'
              }}
            >
              STARTING GOLD
            </button>
          </div>
        </div>

        {equipmentMode === 'gear' ? (
          /* --- EXISTING GEAR GRID --- */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {choices.map((group: any, index: number) => {
              const mandatory = group._;
              const choiceKeys = Object.keys(group).filter((k) => k !== '_' && k !== '');

              // Group with only mandatory items (no choices)
              if (mandatory && choiceKeys.length === 0) {
                return (
                  <div key={index} style={{ ...equipmentRowStyle, padding: '14px 16px', background: 'rgba(72, 187, 120, 0.08)', borderRadius: '8px', border: '1px solid rgba(72, 187, 120, 0.3)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#48bb78', fontSize: '1rem', marginTop: '2px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#48bb78', letterSpacing: '1px', marginBottom: '4px' }}>
                        AUTO-GRANTED EQUIPMENT
                      </div>
                      <div style={{ fontSize: '1rem', color: '#e2e8f0' }}>
                        {generateGearLabel(mandatory)}
                      </div>
                    </div>
                  </div>
                );
              }

              // Group with choice options (a, b, c...)
              return (
                <div key={index} style={equipmentRowStyle}>
                  {choiceKeys.sort().map((key, ki) => {
                    const items = group[key];
                    const labelLetter = key.toUpperCase();
                    const isSelected = equipmentChoices[index] === key;
                    return (
                      <div key={key} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ki > 0 && <div style={orDividerStyle}>OR</div>}
                        <div
                          onClick={() => handleChoiceClick(index, key, items)}
                          style={{ ...gearOptionStyle, border: `2px solid ${isSelected ? '#b8860b' : 'transparent'}`, flex: 1 }}
                        >
                          <div style={optionLabelStyle}>OPTION {labelLetter}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{generateGearLabel(items)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          /* --- GOLD ALTERNATIVE VIEW --- */
          <div style={{ background: '#2d3748', padding: '40px', borderRadius: '12px', border: '2px solid #b8860b', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: '#b8860b' }}>Wealthy Origins</h2>
            <p style={{ color: '#cbd5e0' }}>You forgo your class gear for a pouch of gold coins.</p>

            <div style={{ margin: '40px 0' }}>
              <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: '10px' }}>CLASS GOLD FORMULA: {cleanString(goldFormula)}</div>
              <div style={{ fontSize: '4rem', fontWeight: '900', color: '#f6e05e' }}>{rolledGold} <span style={{ fontSize: '1.5rem' }}>GP</span></div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={handleRollGold}
                style={{ ...detailSelectButtonStyle, background: '#b8860b', color: 'black' }}>
                🎲 {rolledGold > 0 ? 'RE-ROLL GOLD' : 'ROLL FOR GOLD'}
              </button>
              {rolledGold > 0 && (
                <button onClick={() => setIsShopOpen(true)}
                  style={{ ...detailSelectButtonStyle, background: '#48bb78', color: 'black' }}>
                  🛒 OPEN SHOP
                </button>
              )}
            </div>

            {purchasedItems.length > 0 && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#1a202c', borderRadius: '8px', textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', color: '#48bb78', fontWeight: 'bold', marginBottom: '8px' }}>Purchased Items</div>
                {purchasedItems.map((p, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#e2e8f0', padding: '2px 0' }}>
                    {p.name} {p.quantity > 1 ? `×${p.quantity}` : ''}
                  </div>
                ))}
              </div>
            )}

            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#718096' }}>
              Select "Open Shop" to spend your gold on equipment.
            </p>
          </div>
        )}

        {isShopOpen && (
          <ShopModal
            isOpen={isShopOpen}
            onClose={() => setIsShopOpen(false)}
            goldAvailable={rolledGold}
            allItems={allLibraryItems}
            onPurchase={(items, totalCost) => {
              setDraft((prev: any) => ({
                ...prev,
                inventory: [...(prev.inventory || []), ...items.map((it: any) => ({
                  id: it.id,
                  name: it.name,
                  equipped: false,
                  quantity: it.quantity || 1,
                }))],
                currency: { ...(prev.currency || { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }), gp: (prev.currency?.gp || 0) + (rolledGold - totalCost) },
              }));
              setRolledGold(0);
              setPurchasedItems(items.map((it: any) => ({ name: it.name, quantity: it.quantity })));
            }}
          />
        )}

        {/* THE SUB-MENU PICKER MODAL */}
        {activeEquipmentPicker && (
          <div style={modalOverlayStyle}>
            <div style={pickerContentStyle}>
              <h2 style={{ color: '#b8860b', marginBottom: '15px' }}>
                Select {activeEquipmentPicker.filter.toLowerCase().includes('martial') ? 'Martial' : 'Simple'} Weapon
              </h2>

              <div style={scrollableListStyle}>
                {allLibraryItems
                  .filter(item => {
                    // 1. MUST BE MUNDANE
                    const isMundane = !item.rarity || item.rarity === 'none';
                    if (!isMundane) return false;

                    // 2. CATEGORY FILTER (Fixing the Simple/Martial list issue)
                    const isMartialSearch = activeEquipmentPicker.filter.toLowerCase().includes('martial');

                    // Check against all possible 5e.tools keys for category
                    const category = (item.weaponCategory || item.type || "").toLowerCase();

                    if (isMartialSearch) {
                      return category === 'martial' || category === 'm';
                    } else {
                      return category === 'simple' || category === 's';
                    }
                  })
                  .reduce((acc: any[], current: any) => {
                    if (!acc.find(i => i.name === current.name)) acc.push(current);
                    return acc;
                  }, [])
                  .map((item, idx) => (
                    <button
                      key={`${item.name}-${idx}`}
                      onClick={() => {
                        const newChoices = [...equipmentChoices];
                        newChoices[activeEquipmentPicker.groupIndex] = activeEquipmentPicker.choiceKey;
                        setEquipmentChoices(newChoices);

                        const libItem = allLibraryItems.find(
                          (lib: any) => lib.name.toLowerCase() === item.name.toLowerCase() && lib.source === 'XPHB'
                        ) || allLibraryItems.find(
                          (lib: any) => lib.name.toLowerCase() === item.name.toLowerCase()
                        );

                        const acBonus = libItem?.ac ? (typeof libItem.ac === 'number' ? libItem.ac : (libItem.ac.ac || 0)) : 0;
                        setDraft((prev: any) => ({
                          ...prev,
                          inventory: [...(prev.inventory || []), {
                            id: `${item.name}-${Date.now()}`,
                            name: item.name,
                            equipped: false,
                            entries: libItem?.entries || [],
                            weight: libItem?.weight ? Number(libItem.weight) : undefined,
                            type: libItem?.type || undefined,
                            dmg1: libItem?.dmg1 || undefined,
                            modifiers: acBonus ? { ac: acBonus } : undefined,
                          }]
                        }));
                        setActiveEquipmentPicker(null);
                      }}
                      style={pickerItemButtonStyle}
                    >
                      {item.name}
                    </button>
                  ))
                }
              </div>
              <button onClick={() => setActiveEquipmentPicker(null)} style={closeButtonStyle}>CANCEL</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 6. MAIN HUB VIEW ---
  const HubView = () => (
    <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
      <h1 style={{ fontSize: '3.5rem', margin: '0 0 30px 0' }}>Start your story...</h1>
      <div style={hubGridStyle}>
        {/* Provide paths to your default silhouette/background images */}
        <SelectionCard
          title="Class"
          type="class"
          subtitle="Choose your vocations"
          defaultImage="/img/hub/class_default.png"
        />
        <SelectionCard
          title="Species"
          type="species"
          subtitle="Who are your ancestors?"
          defaultImage="/img/hub/species_default.png"
        />
        <SelectionCard
          title="Background"
          type="background"
          subtitle="Your life before adventure"
          isFullWidth
          defaultImage="/img/hub/background_default.png"
        />
        <SelectionCard
          title="Abilities"
          type="abilities"
          subtitle="Determine your raw potential"
          defaultImage="/img/hub/abilities_default.webp"
        />
      </div>
    </div>
  );

  const abilityCardStyle: any = {
    background: '#1a202c',
    border: '1px solid #2d3748',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
  };

  const abilitySelectStyle: any = {
    background: '#2d3748',
    color: 'white',
    border: '1px solid #b8860b',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    outline: 'none',
    cursor: 'pointer'
  };

  const SelectionCard = ({ title, type, subtitle, isFullWidth, defaultImage }: any) => {
    const hasRaceSelection = type === 'species' && draft.race;
    const hasClassSelection = type === 'class' && draft.class;
    const hasSelection = hasRaceSelection || hasClassSelection;
    let backgroundImage = `url("${defaultImage}")`;

    if (type === 'species' && draft.race) {
      backgroundImage = `url("${getImagePath(draft.race)}")`;
    } else if (type === 'class' && draft.class) {
      backgroundImage = `url("/img/classes/landscapes/${draft.class}.webp")`;
    } else if (type === 'background' && draft.background) {
      // Use the background art
      backgroundImage = `url("/img/backgrounds/${draft.background}.webp")`;
    }

    return (
      <div style={{
        ...hubCardStyle,
        gridColumn: isFullWidth ? 'span 2' : 'span 1',
        backgroundImage: backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        position: 'relative',
        transition: 'background-image 0.4s ease-in-out' // Smooth swap
      }}>
        <div style={hubCardGradient} />

        <div style={{ zIndex: 2, position: 'relative', flex: 1 }}>
          <h2 style={{ fontSize: '2rem', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{title}</h2>
          <p style={{ color: '#cbd5e0', margin: '5px 0', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{subtitle}</p>

          {/* DYNAMIC BADGES */}
          {type === 'species' && draft.race && (
            <div style={selectionBadgeStyle}>{draft.race.toUpperCase()}</div>
          )}
          {type === 'class' && draft.class && CLASS_THEMES[draft.class.replace(/ /g, '')] && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {draft.subclass && <div style={{ ...selectionBadgeStyle, background: `${hexToRGBA(CLASS_THEMES[draft.class.replace(/ /g, '')].color, 0.3)}`, borderColor: CLASS_THEMES[draft.class.replace(/ /g, '')].tagline_color }}>{draft.subclass.toUpperCase()}</div>}
              {CLASS_THEMES[draft.class.replace(/ /g, '')].pills.map((pill: any) => (
                <div
                  key={pill.short}
                  style={{
                    ...pillBadgeStyle,
                    borderColor: CLASS_THEMES[draft.class.replace(/ /g, '')].tagline_color,
                    background: `${hexToRGBA(CLASS_THEMES[draft.class.replace(/ /g, '')].color, 0.1)}`, // Match the transparency
                    fontSize: '0.6rem',
                    padding: '1px 10px'
                  }}
                >
                  {pill.short}
                </div>
              ))}
            </div>
          )}
          {type === 'background' && draft.background && (
            <div style={selectionBadgeStyle}>{draft.background.toUpperCase()}</div>
          )}
          {type === 'abilities' && Object.values(baseScores).every(v => v > 0) && (
            <div style={selectionBadgeStyle}>SCORES ASSIGNED</div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveSection(type);
          }}
          style={seeOptionsButtonStyle}
        >
          {hasSelection ? 'CHANGE' : 'SEE OPTIONS'}
        </button>
      </div>
    );
  };

  const getBackgroundImg = (name: string) => {
    if (!name) return '';
    // encodeURIComponent turns "Zhentarim Mercenary" into "Zhentarim%20Mercenary"
    // which the browser needs to find the file.
    const encodedName = encodeURIComponent(name);
    // Ensure your extension (.jpg or .webp) matches your files!
    return `/img/backgrounds/${encodedName}.webp`;
  };


  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>

        {creationStage === 'levelup' && levelUpPhase === 'picker' && <LevelUpClassPicker />}
        {creationStage === 'levelup' && levelUpPhase === 'choices' && <LevelUpView />}
        {creationStage === 'levelup' && levelUpPhase === 'intro' && <LevelUpIntroView />}
        {creationStage === 'levelup' && levelUpPhase === 'confirm' && <LevelUpConfirmView />}

        {/* STAGE 1: THE HUB AND CHOICES */}
        {creationStage === 'hub' && (
          <>
            {activeSection === 'species' ? <SpeciesView /> :
              activeSection === 'class' ? <ClassView /> :
                activeSection === 'background' ? <BackgroundView /> :
                  activeSection === 'abilities' ? <AbilitiesView /> :
                    <HubView />}
          </>
        )}

        {/* STAGE 2: EQUIPMENT */}
        {creationStage === 'equipment' && (
          <EquipmentSelectionView />
        )}

        {creationStage === 'spells' && selectedClassData?.info && (
          <SpellSelectionView
            classInfo={selectedClassData.info}
            level={mode === 'levelup' && existingChar ? (existingChar.totalLevel || existingChar.level) + 1 : 1}
            baseStats={baseScores as Character['baseStats']}
            initialSpells={pendingSpells}
            onConfirm={(spells) => {
              setPendingSpells(spells);
              finishWizard(spells, mode === 'levelup' ? pendingHpGain : undefined);
            }}
            onBack={() => setCreationStage(mode === 'levelup' ? 'levelup' : 'equipment')}
          />
        )}
        {/* SIDEBAR ... */}
        <div style={sidebarStyle}>
          <button
            style={{
              ...createButtonStyle,
              background: (
                creationStage === 'levelup' ||
                (draft.name && draft.race && draft.class && Object.values(baseScores).every(v => v > 0))
              ) ? '#b8860b' : '#2d3748',
              color: 'white',
              cursor: 'pointer',
              opacity: creationStage === 'levelup' && (levelUpPhase === 'intro' || levelUpPhase === 'picker') ? 0.4 : creationStage === 'levelup' && levelUpPhase === 'confirm' ? 1 : (creationStage === 'levelup' || (draft.name && draft.race && draft.class)) ? 1 : 0.5
            }}
            onClick={() => {
              if (creationStage === 'levelup' && (levelUpPhase === 'intro' || levelUpPhase === 'picker')) return;
              if (creationStage === 'levelup' && levelUpPhase === 'confirm') {
                const classInfo = selectedClassData?.info;
                if (classInfo && isSpellcaster(classInfo)) {
                  setCreationStage('spells');
                } else {
                  finishWizard(undefined, pendingHpGain);
                }
                return;
              }
              if (creationStage === 'levelup') {
                // Validate required choices
                const targetClass = levelingClass || draft.class;
                const classLevelsList = existingChar?.classLevels || [];
                const existingCl = classLevelsList.find(cl => cl.className === targetClass)?.level ?? 0;
                const isNewCl = existingCl === 0;
                const newClLvl = isNewCl ? 1 : existingCl + 1;
                const clInfo = selectedClassData?.info;
                const clSubLevel = clInfo ? getSubclassLevel(clInfo) : 3;
                const needsSub = !isNewCl && newClLvl >= clSubLevel && !selectedSubclass && !draft.subclass;
                if (needsSub) { alert('Please choose a subclass before confirming.'); return; }
                if (isASLevel(newClLvl) && !isNewCl && !asiConfirmed) {
                  const asiPicksDone = asiPicks.length > 0;
                  if (!asiPicksDone) { alert('Please complete your Ability Score Improvement before confirming.'); return; }
                }

                const classInfo = selectedClassData?.info;
                const conMod = getAbilityModifier(baseScores.con);
                const hpDisplay = getHPGainDisplay(classInfo, conMod);
                const hpGain = hpRollMode === 'average' ? hpDisplay.average : (rolledHpGain || hpDisplay.average);

                setPendingHpGain(hpGain);
                setLevelUpPhase('confirm');
              } else if (creationStage === 'hub') {
                const isIdentityValid = draft.name && draft.race && draft.class;
                const areStatsValid = Object.values(baseScores).every(v => v > 0);
                if (isIdentityValid && areStatsValid) {
                  setCreationStage('equipment');
                  window.scrollTo(0, 0);
                } else {
                  alert(`Missing Info: ${!draft.name ? 'Name, ' : ''}${!draft.race ? 'Race, ' : ''}${!draft.class ? 'Class, ' : ''}${!areStatsValid ? 'Ability Scores' : ''}`);
                }
              } else if (creationStage === 'equipment') {
                const classInfo = selectedClassData?.info;
                if (classInfo && isSpellcaster(classInfo)) {
                  setCreationStage('spells');
                } else {
                  finishWizard();
                }
              }
            }}
          >
            {creationStage === 'levelup' && levelUpPhase === 'intro'
              ? 'REVIEWING CHANGES...'
              : creationStage === 'levelup' && levelUpPhase === 'picker'
                ? 'SELECT A CLASS TO LEVEL'
              : creationStage === 'levelup' && levelUpPhase === 'confirm'
                ? 'CONFIRM LEVEL UP'
              : creationStage === 'levelup'
                ? `LEVEL UP TO ${(existingChar?.totalLevel || existingChar?.level || 0) + 1}`
              : creationStage === 'hub'
                ? 'CONFIRM CORE IDENTITY'
                : creationStage === 'equipment'
                  ? 'CONTINUE TO REVIEW'
                  : creationStage === 'spells' && mode === 'levelup'
                    ? 'FINISH LEVEL UP'
                    : 'FINISH CHARACTER'}
          </button>
          {creationStage !== 'levelup' && (
            <input placeholder="Name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={nameInputStyle} />
          )}
          {creationStage === 'levelup' && existingChar && (
            <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>
              <div style={{ fontSize: '0.8rem' }}>{existingChar.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#4a5568' }}>{existingChar.class} · Level {existingChar.totalLevel || existingChar.level}</div>
            </div>
          )}
        </div>
        {creationStage === 'hub' && (
          <>
            {inspectingSpecies && <DetailedSpeciesView data={inspectingSpecies} />}
            {inspectingClass && <DetailedClassView data={inspectingClass} />}
            {inspectingBackground && <DetailedBackgroundView data={inspectingBackground} />}
            {subracePickerFor && <SubracePickerModal parentSpecies={subracePickerFor} />}
            {showCreateSubclassPicker && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1a202c', padding: '30px', borderRadius: '12px', border: '2px solid #b8860b', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                  <h2 style={{ fontFamily: 'serif', margin: '0 0 8px 0' }}>Choose your subclass</h2>
                  <p style={{ color: '#a0aec0', fontSize: '0.85rem', marginBottom: '20px' }}>
                    {draft.class === 'Warlock' ? 'Choose your Otherworldly Patron' : `Choose your path for ${draft.class}`}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {subclassOptions.map((sub: any) => (
                      <button key={sub.name} onClick={() => handleCreateSubclassSelect(sub.name)}
                        style={{ padding: '14px 18px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', fontWeight: 'bold', fontFamily: 'serif', transition: '0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#b8860b'; e.currentTarget.style.background = '#3a4a5e'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#4a5568'; e.currentTarget.style.background = '#2d3748'; }}
                      >
                        {sub.name}
                        {sub.source && <span style={{ fontSize: '0.7rem', color: '#718096', marginLeft: '8px', fontWeight: 'normal' }}>({sub.source})</span>}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowCreateSubclassPicker(false)} style={{ marginTop: '16px', background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', width: '100%', fontSize: '0.85rem' }}>
                    Skip (choose later)
                  </button>
                </div>
              </div>
            )}

            {/* Isekai picker overlay */}
            {showIsekaiPicker && (
              <IsekaiPicker />
            )}

            {/* Background traits picker overlay */}
            {showBackgroundTraits && (
              <BackgroundTraitsView bgData={showBackgroundTraits} />
            )}

            {/* Language picker overlay */}
            {showLanguagePicker && (
              <LanguagePickerView />
            )}
          </>
        )}
      </div>
      <button onClick={onClose} style={cancelButtonStyle}>✕ CANCEL</button>
      {quickChoiceTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a202c', padding: '30px', borderRadius: '12px', border: '2px solid #b8860b', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Select Version for {quickChoiceTask.group[0].name}</h3>
            <p style={{ color: '#a0aec0', fontSize: '0.8rem' }}>Multiple versions or sources were found. Please choose one:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {/* Logic here would map through all versions/subraces of the chosen item */}
              {/* For now, we'll prompt them to use the Details view for complex choices */}
              <button
                onClick={() => {
                  if (quickChoiceTask.type === 'species') setInspectingSpecies(quickChoiceTask.group[0]);
                  if (quickChoiceTask.type === 'background') setInspectingBackground(quickChoiceTask.group[0]);
                  setQuickChoiceTask(null);
                }}
                style={{ ...detailSelectButtonStyle, width: '100%' }}
              >
                OPEN DETAILS TO CHOOSE
              </button>
              <button onClick={() => setQuickChoiceTask(null)} style={{ background: 'transparent', border: 'none', color: '#718096', marginTop: '10px', cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
      {viewingFeatureDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#1a202c', padding: '28px', borderRadius: '12px', width: '500px', maxHeight: '70vh', overflowY: 'auto', border: '2px solid #b8860b', color: 'white' }}>
            <h2 style={{ color: '#f6e05e', margin: '0 0 4px 0', fontFamily: 'serif' }}>{viewingFeatureDetail.name}</h2>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '16px' }}>
              {viewingFeatureDetail.featureType?.join(', ') || 'Feature'} · {viewingFeatureDetail.source || ''}
              {viewingFeatureDetail.prerequisite?.length > 0 && (
                <span style={{ marginLeft: '8px', color: '#f6e05e' }}>
                  Prerequisite: {viewingFeatureDetail.prerequisite.map((p: any) => {
                    if (p.level) return `Level ${p.level}`;
                    if (p.spell) return `Spell: ${p.spell.join(', ')}`;
                    if (p.pact) return `Pact: ${p.pact}`;
                    if (p.feature) return `Feature: ${p.feature.join(', ')}`;
                    return '';
                  }).filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#cbd5e0' }}>
              {(viewingFeatureDetail.entries || []).map((e: any, i: number) => (
                <p key={i} style={{ margin: '0 0 8px 0' }}>{typeof e === 'string' ? cleanString(e) : ''}</p>
              ))}
            </div>
            <button onClick={() => setViewingFeatureDetail(null)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#b8860b', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 7. STYLES (Shared Constants) ---
const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: colors.bg, zIndex: 1000, display: 'flex', color: 'white' };

const containerStyle: CSSProperties = { display: 'flex', width: '100%', maxWidth: '1400px', margin: '0 auto' };

const sidebarStyle: CSSProperties = { width: '350px', background: colors.bgPanel, padding: `${spacing.xl} ${spacing.md}`, borderLeft: `1px solid ${colors.borderLight}`, display: 'flex', flexDirection: 'column' };

const hubGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md };

const hubCardGradient: CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18, 22, 29, 0.9) 0%, rgba(18, 22, 29, 0.4) 100%)', zIndex: 1, pointerEvents: 'none' };

const sectionTitleStyle: CSSProperties = { fontSize: '2.5rem', margin: '10px 0 30px 0', fontFamily: 'serif' };

const hubCardStyle: CSSProperties = { height: '240px', background: colors.bgCard, borderRadius: radii.lg, padding: spacing.lg, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', border: `1px solid ${colors.border}`, position: 'relative' };

const speciesGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: spacing.lg, paddingBottom: '50px' };

const speciesCardStyle: CSSProperties = { height: '320px', position: 'relative', borderRadius: radii.xl, overflow: 'hidden', border: `1px solid ${colors.border}` };

const cardArtStyle: CSSProperties = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 };

const cardGradientOverlay: CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)', zIndex: 2 };

const cardContentStyle: CSSProperties = { position: 'relative', zIndex: 3, padding: spacing.lg, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const cardDescriptionStyle: CSSProperties = { fontSize: '0.85rem', color: colors.textLight, margin: `${spacing.sm} 0`, maxWidth: '70%', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' };

const selectButtonStyle: CSSProperties = { background: colors.bgCard, border: '1px solid white', color: 'white', padding: '8px 20px', borderRadius: radii.sm, fontWeight: 'bold', cursor: 'pointer' };

const detailsLinkStyle: CSSProperties = { background: 'none', border: 'none', color: '#f6e05e', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' };

const goldCornerBR: CSSProperties = { position: 'absolute', bottom: 0, right: 0, width: spacing.xl, height: spacing.xl, borderBottom: `3px solid ${colors.gold}`, borderRight: `3px solid ${colors.gold}`, borderBottomRightRadius: radii.xl };

const goldBorderBottom: CSSProperties = { position: 'absolute', bottom: 0, right: 0, width: spacing.xl, height: spacing.xl, borderBottom: `3px solid ${colors.gold}`, borderRight: `3px solid ${colors.gold}`, borderBottomRightRadius: radii.xl };

const searchFieldStyle: CSSProperties = { width: '100%', padding: spacing.sm, background: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: radii.md, color: 'white', marginTop: spacing.md };

const backButtonStyle: CSSProperties = { background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer', marginBottom: spacing.xs };

const detailBackButtonStyle: CSSProperties = { background: 'none', border: `1px solid ${colors.border}`, color: 'white', padding: '8px 20px', borderRadius: radii.round, cursor: 'pointer' };

const detailSelectButtonStyle: CSSProperties = { background: colors.gold, border: 'none', color: 'black', padding: '8px 30px', borderRadius: radii.round, cursor: 'pointer', fontWeight: 'bold' };

const sectionLabelStyle: CSSProperties = { fontSize: '0.75rem', fontWeight: 'bold', color: colors.gold, letterSpacing: '2px', marginBottom: spacing.sm };

const loreTextStyle: CSSProperties = { color: colors.textLight, lineHeight: '1.7', fontSize: '1.05rem' };

const featureItemStyle: CSSProperties = { padding: spacing.md, background: colors.bgPanel, borderRadius: radii.md, border: `1px solid ${colors.borderLight}`, marginBottom: spacing.sm };

const createButtonStyle: CSSProperties = { width: '100%', padding: spacing.sm, borderRadius: radii.pill, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: spacing.md };

const portraitFrameStyle: CSSProperties = { width: '100%', height: '350px', border: `2px solid ${colors.gold}`, borderRadius: '150px 150px 0 0', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const nameInputStyle: CSSProperties = { width: '100%', padding: '12px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radii.md, color: 'white', marginTop: spacing.md, textAlign: 'center' };

const cancelButtonStyle: CSSProperties = { position: 'absolute', top: spacing.md, left: spacing.md, background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer' };

const seeOptionsButtonStyle: CSSProperties = { zIndex: 10, position: 'relative', background: colors.goldDark, color: 'white', border: 'none', padding: `${spacing.xs} ${spacing.md}`, borderRadius: radii.sm, fontWeight: 'bold', cursor: 'pointer' };

const selectionBadgeStyle: CSSProperties = { display: 'inline-block', background: colors.gold, color: 'black', padding: '2px 10px', borderRadius: radii.sm, fontSize: '0.8rem', fontWeight: 'bold', marginTop: spacing.xs };

const badgeStyle: CSSProperties = { background: 'rgba(255,255,255,0.1)', border: `1px solid ${colors.border}`, padding: '5px 15px', borderRadius: radii.round, fontSize: '0.7rem', fontWeight: 'bold', color: colors.textLight, textTransform: 'uppercase', letterSpacing: '1px' };

const classCardStyle: CSSProperties = { height: '400px', position: 'relative', borderRadius: radii.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' };

const classCardGradient: CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)', zIndex: 2 };

const classBannerContainer: CSSProperties = { position: 'absolute', top: '-5px', left: spacing.md, width: '80px', height: '140px', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', zIndex: 4, display: 'flex', justifyContent: 'center', paddingTop: spacing.sm };

const classIconOnBannerStyle: CSSProperties = { height: '50px', opacity: 0.9 };

const classCardContentStyle: CSSProperties = { position: 'relative', zIndex: 3, padding: spacing.lg, textAlign: 'left' };

const pillBadgeStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid', borderRadius: '30px', padding: '2px 12px', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.2px', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'sans-serif', backdropFilter: 'blur(3px)', marginRight: '8px', };

const learnMoreButtonStyle: CSSProperties = { background: 'rgba(255,255,255,0.1)', border: '1px solid white', color: 'white', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' };

const classSelectButtonStyle: CSSProperties = { background: 'white', border: 'none', color: 'black', padding: '8px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' };

const classDescriptionStyle: CSSProperties = { fontSize: '1rem', color: colors.textLight, lineHeight: '1.4', margin: `${spacing.xs} 0`, maxWidth: '90%' };

const goldBorderWrap: CSSProperties = { maxWidth: '1300px', margin: '0 auto', height: '100%', position: 'relative', borderLeft: '2px solid rgba(184, 134, 11, 0.3)', borderRight: '2px solid rgba(184, 134, 11, 0.3)' };

const loreListStyle: CSSProperties = { color: colors.textLight, lineHeight: '2', fontSize: '1.1rem', listStyleType: 'square' };

const subclassCardStyle: CSSProperties = { height: '200px', position: 'relative', borderRadius: radii.md, overflow: 'hidden', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' };

const goldCornerTL: CSSProperties = { position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: `2px solid ${colors.gold}`, borderLeft: `2px solid ${colors.gold}`, borderTopLeftRadius: radii.md };

const gearBoxStyle: CSSProperties = { border: `1px solid ${colors.gold}`, borderRadius: radii.md, padding: spacing.xl, display: 'flex', gap: spacing.xl, alignItems: 'center' };

const detailOverlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: colors.overlay, zIndex: 1200, overflowY: 'auto' };

const detailNavStyle: CSSProperties = { position: 'sticky', top: 0, height: '70px', background: 'rgba(10, 13, 18, 0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `0 ${spacing.xl}`, zIndex: 100 };

const heroSectionStyle: CSSProperties = { height: '65vh', backgroundSize: 'cover', backgroundPosition: 'center 20%', position: 'relative', display: 'flex', alignItems: 'flex-end' };

const heroContentStyle: CSSProperties = { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: `0 ${spacing.xl} 60px ${spacing.xl}`, zIndex: 2 };

const infoGridContainerStyle: CSSProperties = { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: spacing.xl };

const heroGradientStyle: CSSProperties = { position: 'absolute', inset: 0, background: `linear-gradient(to top, ${colors.overlay} 0%, rgba(10, 13, 18, 0.4) 50%, transparent 100%)`, zIndex: 1 };

const sideRailStyle: CSSProperties = { position: 'fixed', left: 0, top: '70px', bottom: 0, width: '70px', background: colors.bg, borderRight: `1px solid ${colors.borderLight}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: spacing.md, zIndex: 1300, overflowY: 'auto' };

const sideRailIconContainer: CSSProperties = { width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: transitions.fast, marginBottom: '5px' };

const subOverlayStyle: CSSProperties = { flex: 1, padding: spacing.xl, height: '100vh', overflowY: 'auto', position: 'relative' };

const statBonusBadgeStyle: CSSProperties = { padding: '2px 8px', border: `1px solid ${colors.gold}`, borderRadius: radii.sm, fontSize: '0.75rem', fontWeight: 'bold', color: 'white', background: colors.goldFaded };

const versionTabStyle: CSSProperties = { padding: '6px 12px', borderRadius: radii.sm, border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', transition: transitions.fast };

const equipmentRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: spacing.sm, width: '100%', marginBottom: spacing.xs };

const gearOptionStyle: CSSProperties = { flex: 1, padding: spacing.md, background: 'rgba(45, 55, 72, 0.4)', borderRadius: radii.md, cursor: 'pointer', transition: transitions.fast, minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const optionLabelStyle: CSSProperties = { fontSize: '0.7rem', fontWeight: 'bold', color: colors.gold, letterSpacing: '1px', marginBottom: '5px' };

const orDividerStyle: CSSProperties = { fontWeight: 'bold', color: colors.border, fontSize: '0.8rem' };

const modalOverlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 };

const pickerContentStyle: CSSProperties = { background: colors.bgPanel, padding: spacing.lg, borderRadius: radii.lg, border: `2px solid ${colors.gold}`, width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' };

const scrollableListStyle: CSSProperties = { flex: 1, overflowY: 'auto', marginTop: spacing.md, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.xs, paddingRight: spacing.xs };

const pickerItemButtonStyle: CSSProperties = { padding: '12px', background: colors.bgCard, border: `1px solid ${colors.border}`, color: 'white', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold', transition: transitions.fast };

const closeButtonStyle: CSSProperties = { marginTop: spacing.md, padding: '12px', background: colors.danger, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };

const pillToggleContainer: CSSProperties = { display: 'inline-flex', background: colors.bg, padding: '4px', borderRadius: '30px', border: `1px solid ${colors.borderLight}`, marginBottom: spacing.md };

const pillToggleBtn: CSSProperties = { padding: '8px 20px', borderRadius: '25px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: transitions.fast, textTransform: 'uppercase', letterSpacing: '0.5px' };

const arrayNumStyle: CSSProperties = {
  width: '45px',
  height: '45px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radii.md,
  fontWeight: '900',
  fontSize: '1.1rem',
  border: '1px solid rgba(255,255,255,0.1)',
  transition: 'all 0.2s ease-in-out',
  userSelect: 'none',
  cursor: 'default'
};

const abilityCardStyle: CSSProperties = {
  background: 'rgba(45, 55, 72, 0.3)',
  border: `1px solid ${colors.borderLight}`,
  borderRadius: radii.lg,
  padding: spacing.md,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'border-color 0.3s ease'
};

const abilitySelectStyle: CSSProperties = {
  background: colors.bgPanel,
  color: 'white',
  border: `1px solid ${colors.gold}`,
  padding: '10px',
  borderRadius: '6px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  outline: 'none',
  cursor: 'pointer',
  width: '80px',
  textAlign: 'center'
};