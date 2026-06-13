// =============================================================================
// ?? FILE: components/LevelUpWizard.tsx
// =============================================================================
// ?? PURPOSE: Standalone level-up wizard (976 lines). Separated from
//    CharacterWizard so it can be used as a full-page route at
//    /character-sheet/level-up?id=<uuid>. Covers the same 4-phase flow:
//    Picker (choose which class to level / add a new class) ? Intro (what
//    you gain) ? Choices (HP mode, subclass, ASI/feat, feature picks) ?
//    Confirm (summary view with spell selection for casters).
//
// ?? REACT CONCEPT: State Machine + Conditional Rendering
//    Uses a levelUpPhase state ('picker' | 'intro' | 'choices' | 'confirm')
//    to drive which sub-view renders. This is a simple finite state machine
//    pattern: transitions are explicit (setLevelUpPhase('confirm')) and
//    validation is checked before each transition.
//
//    The component also shows how embedded mode works: when used inside
//    CharacterWizard, the wrapping layout is omitted (no sidebar, no
//    fullscreen container). When standalone, it renders its own layout.
//
// ?? HOW TO ALTER:
//    - Add a new phase: add a value to levelUpPhase type + sub-view + render
//    - Change HP formula: modify getHPGainDisplay usage
//    - Change ASI/feat logic: modify the button handlers in asiAvailable block
// =============================================================================

'use client';
import { useState, useEffect } from 'react';
import { DataEngine } from '../utils/dataLoader';
import { cleanString } from '../utils/formatters';
import { Character, CharacterFeature } from '../lib/character';
import { finalizeCharacterFromWizard, getAbilityModifier } from '../utils/characterProgression';
import { isSpellcaster, buildSpellSlots, getPreparedCount, getSpellcastingAbility, computeMulticlassSpellSlots } from '../utils/spellcastingEngine';
import { getNewFeaturesAtLevel, getNewSubclassFeaturesAtLevel, getHPGainDisplay, isASLevel, getSubclassLevel, getNewCantripsKnown, getNewSpellsKnown, getNewPreparedCount, getNewSpellSlots } from '../utils/levelingEngine';
import { getAvailablePicks } from '../utils/classResources';
import { rollDice } from '../utils/rollEngine';
import { CLASS_THEMES } from '../utils/classThemes';
import SpellSelectionView from './SpellSelectionView';

const MULTICLASS_PREREQS: Record<string, Record<string, number>> = {
  Barbarian: { str: 13 }, Bard: { cha: 13 }, Cleric: { wis: 13 }, Druid: { wis: 13 },
  Fighter: { str: 13, dex: 13 }, Monk: { dex: 13, wis: 13 }, Paladin: { str: 13, cha: 13 },
  Ranger: { dex: 13, wis: 13 }, Rogue: { dex: 13 }, Sorcerer: { cha: 13 },
  Warlock: { cha: 13 }, Wizard: { int: 13 }, Artificer: { int: 13 },
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

// CLASS_THEMES imported from utils/classThemes.ts

interface LevelUpWizardProps {
  existingChar: Character;
  onComplete: (char: Character) => void;
  onClose: () => void;
  embedded?: boolean;
}

export default function LevelUpWizard({ existingChar, onComplete, onClose, embedded }: LevelUpWizardProps) {
  const getCharClassList = (char: any): string[] => {
    if (char.classes && char.classes.length > 0) return char.classes as string[];
    return [...new Set((char.classLevels || []).map((cl: any) => cl.className))] as string[];
  };

  const [baseScores, setBaseScores] = useState<Record<string, number>>({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
  const [draft, setDraft] = useState<any>({
    name: '', race: '', class: '', classLevels: [],
    hp: { current: 10, max: 10 },
    baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: [],
    backgroundProficiencies: [],
    inventory: [],
  });
  const [selectedSubclass, setSelectedSubclass] = useState<string | undefined>(undefined);
  const [pendingSpells, setPendingSpells] = useState<Character['spells']>({ cantrips: [], known: [], prepared: [] });
  const [selectedClassData, setSelectedClassData] = useState<any>(null);
  const [allBackgrounds, setAllBackgrounds] = useState<any[]>([]);
  const [rawSpecies, setRawSpecies] = useState<any[]>([]);
  const [allSubraces, setAllSubraces] = useState<any[]>([]);
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
  const [featurePicks, setFeaturePicks] = useState<Record<string, string[]>>(existingChar.classFeaturePicks || {});
  const [featurePicksConfirmed, setFeaturePicksConfirmed] = useState(false);
  const [optionalFeatureLookup, setOptionalFeatureLookup] = useState<Record<string, any>>({});
  const [allFeats, setAllFeats] = useState<any[]>([]);
  const [featSearch, setFeatSearch] = useState('');
  const [selectedFeat, setSelectedFeat] = useState<any | null>(null);
  const [creationStage, setCreationStage] = useState<'levelup' | 'spells'>('levelup');
  const [viewingFeatureDetail, setViewingFeatureDetail] = useState<any | null>(null);
  const [hpRollAnimation, setHpRollAnimation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initialize from existingChar
  useEffect(() => {
    if (!existingChar) return;
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
    setLevelUpPhase('picker');
    setLevelingClass(null);
    setFeaturePicksConfirmed(false);
    setPickedSkills({ class: [], species: [] });
    setCreationStage('levelup');
  }, []);

  // Load data
  useEffect(() => {
    DataEngine.getMergedRaces().then(mergedData => {
      setRawSpecies(mergedData);
      const grouped = mergedData.reduce((acc: any, r: any) => {
        if (!acc[r.name]) acc[r.name] = r;
        if (r.source === 'XPHB' || r.source === 'PHB') acc[r.name] = r;
        return acc;
      }, {});
    });
    DataEngine.getRacesData().then(data => setAllSubraces(data.subraces || []));
    DataEngine.getMergedBackgrounds().then(mergedData => {
      const grouped = mergedData.reduce((acc: any, bg: any) => {
        const name = bg.name.trim();
        if (!acc[name]) acc[name] = bg;
        if (['PHB', 'XPHB', 'SCAG'].includes(bg.source)) acc[name] = bg;
        return acc;
      }, {});
      setAllBackgrounds(Object.values(grouped));
    });
    DataEngine.loadLocalJson('data/optionalfeatures.json').then((data: any) => {
      if (data?.optionalfeature) {
        const lookup: Record<string, any> = {};
        for (const f of data.optionalfeature) lookup[f.name] = f;
        setOptionalFeatureLookup(lookup);
      }
    });
    DataEngine.getFeats().then(setAllFeats);
  }, []);

  // --- FINALIZATION: assemble final character and call onComplete ---
  const finishWizard = async (spells?: Character['spells'], hpGainOverride?: number) => {
    const className = draft.class;
    if (!className) return;
    const fullData = selectedClassData || (await DataEngine.getClassFullData(className));
    const bgData = allBackgrounds.find((b: { name: string }) => b.name === draft.background);

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
      'levelup',
      existingChar
    );
    if (spells) {
      finalChar.spells = spells;
    } else if (existingChar?.spells) {
      finalChar.spells = existingChar.spells;
    }
    if (finalChar.classLevels && finalChar.classLevels.length > 1) {
      const classDataMap: Record<string, any> = {};
      for (const cl of finalChar.classLevels) {
        try { const data = await DataEngine.getClassFullData(cl.className); classDataMap[cl.className] = data; } catch (e) { }
      }
      finalChar.spellSlots = computeMulticlassSpellSlots(finalChar.classLevels, classDataMap);
    } else {
      finalChar.spellSlots = buildSpellSlots(fullData.info, finalChar.totalLevel);
    }
    if (asiConfirmed && asiMode === 'feat' && selectedFeat) {
      const featEntry: CharacterFeature = {
        name: selectedFeat.name,
        level: (existingChar?.totalLevel || 1),
        source: 'Feat',
        entries: selectedFeat.entries,
      };
      finalChar.features = [...(finalChar.features || []), featEntry];
    }
    onComplete(finalChar);
  };

  const normalizeSkillName = (name: string) => {
    const clean = name.toLowerCase().trim();
    if (clean === 'sleight of hand') return 'sleightOfHand';
    if (clean === 'animal handling') return 'animalHandling';
    return clean;
  };

  // ──── LEVEL UP CLASS PICKER ────
  const LevelUpClassPicker = () => {
    const classList = getCharClassList(existingChar);
    const classLevels = existingChar?.classLevels || [];
    const newTotalLevel = (existingChar?.totalLevel || 1) + 1;
    const [loadingData, setLoadingData] = useState(false);

    const handlePickClass = async (cls: string) => {
      setLoadingData(true);
      setLevelingClass(cls);
      setDraft((prev: any) => ({ ...prev, class: cls }));
      const data = await DataEngine.getClassFullData(cls);
      setSelectedClassData(data);
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
      <div style={{ flex: 1, padding: isMobile ? '16px' : '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
        <div style={{ maxWidth: '720px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'serif', color: '#f6e05e', margin: '0 0 8px 0', fontSize: isMobile ? '1.8rem' : '2.5rem' }}>Level Up</h1>
            <p style={{ color: '#a0aec0', fontSize: '1.1rem' }}>Total: Level {newTotalLevel - 1} → <span style={{ color: '#48bb78' }}>Level {newTotalLevel}</span></p>
          </div>
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
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', background: '#1a202c', border: `2px solid ${theme.tagline_color}44`, borderRadius: '12px', color: 'white', cursor: loadingData ? 'wait' : 'pointer', textAlign: 'left', transition: 'all 0.15s', fontSize: '1rem', opacity: loadingData ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <img src={`/img/classes/Icons/${cls}.png`} style={{ width: '56px', height: '56px', borderRadius: '8px', border: `2px solid ${theme.tagline_color}` }} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
          <div>
            <h3 style={{ color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0' }}>OR ADD A NEW CLASS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
              {DataEngine.getClassesList()
                .filter((cls: string) => !classList.includes(cls))
                .map(cls => {
                  const prereqs = meetsMulticlassPrereqs(cls, existingChar?.baseStats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
                  const theme = CLASS_THEMES[cls.replace(/ /g, '')] || { color: '#b8860b', tagline_color: '#b8860b' };
                  return (
                    <button key={cls} onClick={() => handleAddNewClass(cls)} disabled={loadingData || !prereqs.ok}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 10px', background: '#1a202c', border: `2px solid ${prereqs.ok ? '#4a5568' : '#e53e3e44'}`, borderRadius: '10px', color: 'white', cursor: (prereqs.ok && !loadingData) ? 'pointer' : 'not-allowed', textAlign: 'center', opacity: prereqs.ok ? (loadingData ? 0.6 : 1) : 0.5, transition: '0.15s' }}>
                      <img src={`/img/classes/Icons/${cls}.png`} style={{ width: '36px', height: '36px', borderRadius: '6px' }} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f6e05e', fontSize: '0.8rem' }}>{cls}</div>
                        <div style={{ fontSize: '0.65rem', color: '#718096' }}>Lv 1</div>
                        {!prereqs.ok && <div style={{ fontSize: '0.6rem', color: '#fc8181', marginTop: '2px' }}>Needs {prereqs.missing.join(', ')}</div>}
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

  // ──── LEVEL UP INTRO VIEW ────
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
      <div style={{ flex: 1, padding: isMobile ? '16px' : '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
        <div style={{ maxWidth: '680px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
              <img src={`/img/classes/Icons/${draft.class}.png`} style={{ width: isMobile ? '56px' : '80px', height: isMobile ? '56px' : '80px', borderRadius: '10px', border: `2px solid ${theme.tagline_color}` }} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {isNewClass && <span style={{ fontSize: '0.8rem', color: '#48bb78', padding: '4px 12px', background: 'rgba(72,187,120,0.15)', borderRadius: '6px', fontWeight: 'bold' }}>NEW CLASS</span>}
            </div>
            <h1 style={{ fontFamily: 'serif', color: theme.tagline_color, margin: '0 0 8px 0', fontSize: isMobile ? '1.8rem' : '2.5rem' }}>Level Up</h1>
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
          <div style={{ background: '#1a202c', borderRadius: '16px', border: `2px solid ${theme.tagline_color}33`, padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'serif', margin: '0 0 24px 0', fontSize: '1.3rem', color: '#f6e05e' }}>What you'll gain</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>❤️</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#48bb78' }}>+{hpGainValue} Hit Points</div>
                  <div style={{ fontSize: '0.8rem', color: '#718096' }}>d{hpDisplay.hitDieFaces} + {conMod >= 0 ? `${conMod} CON` : `${conMod} CON`}</div>
                </div>
              </div>
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
              {needsSubclass && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px', borderLeft: `4px solid ${theme.tagline_color}` }}>
                  <span style={{ fontSize: '1.3rem' }}>🔮</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: theme.tagline_color }}>Choose a Subclass</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>Select your path at level {subLevel}</div>
                  </div>
                </div>
              )}
              {asiAvailable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>📈</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#f6e05e' }}>Ability Score Improvement</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>Increase one ability by 2, or two by 1</div>
                  </div>
                </div>
              )}
              {slotChanges.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#2d3748', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔮</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#6366f1' }}>Spellcasting Growth</div>
                    <div style={{ fontSize: '0.82rem', color: '#a0aec0' }}>
                      {slotChanges.filter((s: any) => s.newMax > 0).map((s: any) => `Level ${s.level}: ${s.newMax} slot${s.newMax > 1 ? 's' : ''}`).join(', ')}
                      {newCantrips > 0 && ` · +${newCantrips} cantrip${newCantrips > 1 ? 's' : ''}`}
                    </div>
                  </div>
                </div>
              )}
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
          <button onClick={() => setLevelUpPhase('choices')}
            style={{ display: 'block', width: '100%', padding: '18px', background: theme.tagline_color, border: 'none', color: 'black', fontWeight: 'bold', fontSize: '1.2rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'serif', letterSpacing: '1px' }}>
            BEGIN LEVEL UP
          </button>
        </div>
      </div>
    );
  };

  // ──── LEVEL UP CHOICES VIEW ────
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
      <div style={{ flex: 1, padding: isMobile ? '16px' : '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'serif', color: theme.tagline_color, fontSize: isMobile ? '1.4rem' : '2rem', marginBottom: '24px', textAlign: 'center' }}>
            {isNewClass ? `Starting ${draft.class}` : `${draft.class} Level ${newClassLevel}`}
          </h1>

          {/* HP */}
          <div style={{ background: '#1a202c', borderRadius: '12px', border: `1px solid #2d3748`, padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f6e05e', margin: '0 0 12px 0', fontSize: '1rem' }}>Hit Points</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#718096' }}>{targetClass} (d{hpDisplay.hitDieFaces}):</span>
              <button onClick={() => setHpRollMode('average')}
                style={{ padding: '8px 20px', borderRadius: '8px', border: `2px solid ${hpRollMode === 'average' ? theme.tagline_color : '#4a5568'}`, background: hpRollMode === 'average' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontWeight: hpRollMode === 'average' ? 'bold' : 'normal' }}>
                Average: {hpDisplay.average}
              </button>
              <button onClick={() => { setHpRollMode('rolled'); setRolledHpGain(hpDisplay.rolledMin); }}
                style={{ padding: '8px 20px', borderRadius: '8px', border: `2px solid ${hpRollMode === 'rolled' ? theme.tagline_color : '#4a5568'}`, background: hpRollMode === 'rolled' ? `${theme.tagline_color}22` : '#2d3748', color: 'white', cursor: 'pointer', fontWeight: hpRollMode === 'rolled' ? 'bold' : 'normal' }}>
                Roll: <span style={hpRollAnimation ? { color: '#48bb78', fontWeight: 'bold', textShadow: '0 0 8px #48bb78', transition: 'all 0.3s' } : {}}>{hpRollMode === 'rolled' ? rolledHpGain || hpDisplay.rolledMin : `d${hpDisplay.hitDieFaces}`}</span>
              </button>
              {hpRollMode === 'rolled' && (
                <button onClick={() => {
                  const result = rollDice(`1d${hpDisplay.hitDieFaces}`).total + Math.max(0, conMod);
                  setRolledHpGain(result);
                  setHpRollAnimation(true);
                  setTimeout(() => setHpRollAnimation(false), 600);
                }}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', cursor: 'pointer' }}>
                  Roll
                </button>
              )}
            </div>
          </div>

          {/* Subclass */}
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
              {(!asiConfirmed && asiMode !== 'feat') && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
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

  // ──── LEVEL UP CONFIRM VIEW ────
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
      <div style={{ flex: 1, padding: isMobile ? '16px' : '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ maxWidth: '620px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ color: theme.tagline_color, margin: '0 0 4px 0', fontSize: isMobile ? '1.1rem' : '1.3rem' }}>Confirm Level Up</h2>
          <p style={{ color: '#a0aec0', margin: '0 0 24px 0', fontSize: '0.85rem' }}>
            {targetClass} {isNewClass ? `1` : `${existingClassLevel} → ${newClassLevel}`} · Total Level {existingChar?.totalLevel || 1} → {(existingChar?.totalLevel || 1) + 1}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Hit Points</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>+{hpGain}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: 4 }}>
                {hpRollMode === 'average' ? 'Average' : `Rolled (${rolledHpGain || '?'})`} · CON {conMod >= 0 ? `+${conMod}` : conMod}
              </div>
            </div>
            {needsSubclass && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Subclass</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedSubclass}</span>
                </div>
              </div>
            )}
            {newFeatures.length > 0 && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>New Features</div>
                {newFeatures.map((f: any, i: number) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem', padding: '4px 0' }}>{f.name}</div>
                ))}
              </div>
            )}
            {newSubclassFeatures.length > 0 && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>Subclass Features ({selectedSubclass || draft.subclass})</div>
                {newSubclassFeatures.map((f: any, i: number) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem', padding: '4px 0' }}>{f.name}</div>
                ))}
              </div>
            )}
            {asiChanges && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#f6e05e', fontWeight: 'bold' }}>Ability Score Improvement</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{asiChanges}</span>
                </div>
              </div>
            )}
            {featurePickLabels.length > 0 && (
              <div style={{ background: '#1a202c', borderRadius: '12px', border: '1px solid #2d3748', padding: '16px 20px' }}>
                <div style={{ color: '#f6e05e', fontWeight: 'bold', marginBottom: 8 }}>Feature Choices</div>
                {featurePickLabels.map((label, i) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '0.85rem', padding: '2px 0' }}>{label}</div>
                ))}
              </div>
            )}
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

  // ──── SIDEBAR ────
  const sidebarStyle: React.CSSProperties = {
    width: '220px',
    background: '#1a202c',
    borderLeft: '1px solid #2d3748',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexShrink: 0,
  };

  const targetClassForSpells = levelingClass || draft.class;
  const classLevelsForSpells = existingChar?.classLevels || [];
  const existingClForSpells = classLevelsForSpells.find(cl => cl.className === targetClassForSpells)?.level ?? 0;
  const isNewClassForSpells = existingClForSpells === 0;
  const newClLvlForSpells = isNewClassForSpells ? 1 : existingClForSpells + 1;
  const oldClLvlForSpells = existingClForSpells > 0 ? existingClForSpells : 0;
  const clInfoForSpells = selectedClassData?.info;
  const newCantripsCount = clInfoForSpells && !isNewClassForSpells ? getNewCantripsKnown(clInfoForSpells, newClLvlForSpells, oldClLvlForSpells) : (clInfoForSpells ? getNewCantripsKnown(clInfoForSpells, newClLvlForSpells, 0) : 0);
  const newSpellsCount = clInfoForSpells && !isNewClassForSpells ? getNewSpellsKnown(clInfoForSpells, newClLvlForSpells, oldClLvlForSpells) : (clInfoForSpells ? getNewSpellsKnown(clInfoForSpells, newClLvlForSpells, 0) : 0);
  const slotChangesForSpells = clInfoForSpells && !isNewClassForSpells ? getNewSpellSlots(clInfoForSpells, newClLvlForSpells, oldClLvlForSpells) : (clInfoForSpells ? getNewSpellSlots(clInfoForSpells, newClLvlForSpells, 0) : []);
  const newSpellLevels = new Set<number>();
  for (const change of slotChangesForSpells) {
    if (change.oldMax === 0) newSpellLevels.add(change.level);
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', width: '100%', background: '#0d1117', color: 'white', position: 'relative' }}>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' }}>
        {levelUpPhase === 'picker' && <LevelUpClassPicker />}
        {levelUpPhase === 'intro' && <LevelUpIntroView />}
        {levelUpPhase === 'choices' && <LevelUpView />}
        {levelUpPhase === 'confirm' && <LevelUpConfirmView />}
        {creationStage === 'spells' && selectedClassData?.info && (
          <SpellSelectionView
            classInfo={selectedClassData.info}
            level={(existingChar?.totalLevel || existingChar?.level || 0) + 1}
            baseStats={baseScores as Character['baseStats']}
            initialSpells={pendingSpells}
            newCantripsCount={newCantripsCount}
            newSpellsCount={newSpellsCount}
            newSpellLevels={newSpellLevels}
            onConfirm={async (spells) => {
              setPendingSpells(spells);
              try {
                await finishWizard(spells, pendingHpGain);
              } catch (e) {
                console.error('finishWizard error:', e);
                alert('Error completing level up: ' + (e instanceof Error ? e.message : 'Unknown error'));
              }
            }}
            onBack={() => setCreationStage('levelup')}
          />
        )}
      </div>

      {/* Sidebar */}
      <div style={isMobile ? { ...sidebarStyle, width: '100%', borderLeft: 'none', borderTop: '1px solid #2d3748', padding: '8px 12px', flexDirection: 'row', alignItems: 'center', gap: '8px', flexShrink: 0 } : sidebarStyle}>
        <button
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            width: '100%',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.85rem',
            background: levelUpPhase === 'confirm' ? '#b8860b' : (levelUpPhase === 'intro' || levelUpPhase === 'picker') ? '#2d3748' : '#b8860b',
            color: 'white',
            opacity: (levelUpPhase === 'intro' || levelUpPhase === 'picker') ? 0.4 : 1,
          }}
          onClick={async () => {
            if (levelUpPhase === 'intro' || levelUpPhase === 'picker') return;
            if (levelUpPhase === 'confirm') {
              if (!draft.class) {
                console.error('No class selected (draft.class is empty)');
                alert('No class selected. Please go back and select a class.');
                return;
              }
              const classInfo = selectedClassData?.info;
              if (classInfo && isSpellcaster(classInfo)) {
                setCreationStage('spells');
              } else {
                try {
                  await finishWizard(undefined, pendingHpGain);
                } catch (e) {
                  console.error('finishWizard error:', e);
                  alert('Error completing level up: ' + (e instanceof Error ? e.message : 'Unknown error'));
                }
              }
              return;
            }
            if (levelUpPhase === 'choices') {
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
            }
          }}
        >
          {levelUpPhase === 'intro' ? 'REVIEWING CHANGES...' :
           levelUpPhase === 'picker' ? 'SELECT A CLASS TO LEVEL' :
           levelUpPhase === 'confirm' ? 'CONFIRM LEVEL UP' :
           `LEVEL UP TO ${(existingChar?.totalLevel || existingChar?.level || 0) + 1}`}
        </button>
        {existingChar && (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>
            <div style={{ fontSize: '0.8rem' }}>{existingChar.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#4a5568' }}>{existingChar.class} · Level {existingChar.totalLevel || existingChar.level}</div>
          </div>
        )}
        <button onClick={onClose}
          style={{ marginTop: '12px', padding: '8px', borderRadius: '6px', background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', cursor: 'pointer', width: '100%', fontSize: '0.8rem' }}>
          CANCEL
        </button>
      </div>

      {/* Feature detail modal */}
      {viewingFeatureDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#1a202c', padding: isMobile ? '16px' : '28px', borderRadius: '12px', width: isMobile ? '95vw' : '500px', maxHeight: '70vh', overflowY: 'auto', border: '2px solid #b8860b', color: 'white' }}>
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
                <div key={i} style={{ marginBottom: '8px' }}>
                  {typeof e === 'string' ? cleanString(e) : e?.caption ? <b>{e.caption}</b> : e?.entry ? e.entry : ''}
                </div>
              ))}
            </div>
            <button onClick={() => setViewingFeatureDetail(null)}
              style={{ marginTop: '16px', background: '#b8860b', border: 'none', color: 'black', fontWeight: 'bold', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

