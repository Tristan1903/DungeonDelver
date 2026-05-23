'use client';
import { useState, useEffect } from 'react';
import { DataEngine } from '../utils/dataLoader';
import { cleanString, formatEntries } from '../utils/formatters';


export default function CharacterWizard({ isOpen, onClose, onComplete }: any) {

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


  const CLASS_THEMES: Record<string, any> = {
    Barbarian: {
      color: '#eca6037c',
      tagline_color: '#eca603',
      tagline: 'A Fierce Warrior of Primal Rage',
      highlights: ['Storm with Rage and charge headlong into danger.', 'Channel primal forces to fuel uncanny reflexes.', 'Fight with reckless abandon.'],
      gear: ['A Greataxe, Greatsword, or Maul', 'Bare, lightweight clothing', 'Belt of Giant Strength'],
      pills: [{ short: 'Raging Warrior', full: 'Raging Warrior' }, { short: 'STR', full: 'Strength' }]
    },
    Bard: {
      color: '#c200c54d', // Purple
      tagline_color: '#c200c5',
      tagline: 'An Inspiring Performer of Music, Dance, and Magic',
      highlights: ['Weave magic and wonder through the arts.', 'Become a jack of all trades.', 'Perform spells that inspire and heal allies.'],
      gear: ['A Lute or other Musical Instrument', 'Stylish, often theatrical outfits', 'Instrument of the Bards'],
      pills: [{ short: 'Inspiring Performer', full: 'Inspiring Performer' }, { short: 'CHA', full: 'Charisma' }]

    },
    Cleric: {
      color: '#ffd12b79', // Olive Gold
      tagline_color: '#ffd12b',
      tagline: 'A Miraculous Priest of Divine Power',
      highlights: ['Invoke divine magic to bolster people.', 'Channel divine energy to sear enemies.', 'Martial the power of gods to ward off Undead.'],
      gear: ['A Holy Symbol borne prominently', 'Cloth vestments worn over a Chain shirt', 'Necklace of Prayer Beads'],
      pills: [{ short: 'Divine Priest', full: 'Divine Priest' }, { short: 'WIS', full: 'Wisdom' }]
    },
    Druid: {
      color: '#abce2e6e', // Forest Green
      tagline_color: '#abce2e',
      tagline: 'A Nature Priest of Primal Power',
      highlights: ['Call on the forces of nature to heal allies.', 'Embody the wilds by shape-shifting.', 'Combat threats to the natural world.'],
      gear: ['A Druidic Focus and a Sickle', 'Organic clothing adorned with nature', 'Staff of the Woodlands'],
      pills: [
        { short: 'WEAPONS MASTER', full: 'WEAPONS MASTER' },
        { short: 'STR • DEX', full: 'STRENGTH • DEXTERITY' }
      ]
    },
    Fighter: {
      color: '#c9750046', // Brown/Bronze
      tagline_color: '#c97500',
      tagline: 'A Master of All Arms and Armor',
      highlights: ['Master weapons to be prepared for anything.', 'Push yourself beyond normal limits.', 'Rule the battlefield.'],
      gear: ['Weapons of all descriptions', 'Every type of armor and shield', 'Vorpal Sword'],
      pills: [{ short: 'Weapon Master', full: 'Weapon Master' }, { short: 'STR • DEX', full: 'Strength • Dexterity' }]
    },
    Monk: {
      color: '#00d1d188', // Teal
      tagline_color: '#00ffff',
      tagline: 'A Martial Artist of Supernatural Focus',
      highlights: ['Focus potential to create supernatural effects.', 'Channel uncanny speed to sidestep danger.', 'Turn yourself into a living weapon.'],
      gear: ['Shortswords, Spears, or Quarterstaffs', 'Loose, simple clothes', 'Wraps of Unarmed Power'],
      pills: [{ short: 'Martial Artist', full: 'Martial Artist' }, { short: 'DEX • WIS', full: 'Dexterity • Wisdom' }]
    },
    Paladin: {
      color: '#6d88889a', // Steel Blue
      tagline_color: '#999999',
      tagline: 'A Devout Warrior of Sacred Oaths',
      highlights: ['Combine martial prowess and divine might.', 'Swear a sacred oath and abide by its tenets.', 'Wield divine power to heal the injured.'],
      gear: ['A Longsword and a Shield with a Holy Symbol', 'A suit of polished Plate Armor', 'Holy Avenger'],
      pills: [{ short: 'Devout Warrior', full: 'Devout Warrior' }, { short: 'STR • CHA', full: 'Strength • Charisma' }]
    },
    Ranger: {
      color: '#a0e95b71', // Deep Green
      tagline_color: '#a4ff50',
      tagline: 'A Wandering Warrior Imbued with Primal Magic',
      highlights: ['Weave together martial prowess and nature magic.', 'Deepen your connection to nature.', 'Track and slay your quarry like a predator.'],
      gear: ['A Scimitar, Shortsword, and a Longbow', 'A cloak camouflaged for the wilds', 'Bracers of Archery'],
      pills: [{ short: 'Primal Warrior', full: 'Primal Warrior' }, { short: 'DEX • WIS', full: 'Dexterity • Wisdom' }]
    },
    Rogue: {
      color: '#0c3ad35d', // Dark Blue
      tagline_color: '#6b8dfd',
      tagline: 'A Dexterous Expert in Stealth and Subterfuge',
      highlights: ['Launch deadly Sneak Attacks.', 'Escape notice, disarm traps, and pick locks.', 'Manipulate strikes to inflict debilitating effects.'],
      gear: ['Daggers and Shortswords', 'A dark, hooded cloak', 'Ring of Invisibility'],
      pills: [{ short: 'Master Thief', full: 'Master Thief' }, { short: 'DEX', full: 'Dexterity' }]
    },
    Sorcerer: {
      color: '#fcc35375', // Crimson
      tagline_color: '#ddab47',
      tagline: 'A Dazzling Mage Filled with Innate Magic',
      highlights: ['Alter your spells to suit your needs.', 'Attune to the origin of your innate magic.', 'Harness and channel raw, roiling power.'],
      gear: ["A Sorcerer's shard as a focus", 'Robe of the Archmagi', 'Staff of Power'],
      pills: [{ short: 'Innate Magic', full: 'Innate Magic' }, { short: 'CHA', full: 'Charisma' }]
    },
    Warlock: {
      color: '#fc2f1962', // Maroon
      tagline_color: '#a71504',
      tagline: 'An Occultist Empowered by Otherworldly Pacts',
      highlights: ['Form a pact with a mysterious entity.', 'Uncover eldritch truths for supernatural abilities.', 'Deepen your occult connection for greater power.'],
      gear: ['Leather Armor and a Sickle', 'Occult attire and tomes', 'Rod of the Pact Keeper'],
      pills: [{ short: 'Otherworldly Patron', full: 'Otherworldly Patron' }, { short: 'CHA', full: 'Charisma' }]
    },
    Wizard: {
      color: '#8228e96e', // Deep Indigo
      tagline_color: '#8431e4',
      tagline: 'A Scholarly Magic-User of Arcane Power',
      highlights: ['Pursue arcane magic with scholastic fervor.', 'Cast spells of explosive fire and lightning.', 'Become capable of manipulating reality.'],
      gear: ['Their personal spellbook & Spell Scrolls', 'An ornate, arcane Robe', 'Ring of Spell Storing'],
      pills: [{ short: 'Arcane Scholar', full: 'Arcane Scholar' }, { short: 'INT', full: 'Intelligence' }]
    }
  };

  // --- 1. STATE ---

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
  const [draft, setDraft] = useState<any>({
    name: '', race: '', class: '', classLevels: [],
    hp: { current: 10, max: 10 },
    baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: [],
    inventory: [] // MUST be an empty array
  });
  const [creationStage, setCreationStage] = useState<'hub' | 'equipment' | 'spells'>('hub');
  const [equipmentChoices, setEquipmentChoices] = useState<any[]>([]);
  const [allLibraryItems, setAllLibraryItems] = useState<any[]>([]);
  const [activeEquipmentPicker, setActiveEquipmentPicker] = useState<{
    groupIndex: number,
    choiceKey: 'a' | 'b',
    filter: string
  } | null>(null);

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
  // Inside CharacterWizard component at the top
  useEffect(() => {
    if (isOpen) {
      DataEngine.getMergedRaces().then(mergedData => {
        // 1. Save EVERY SINGLE race into rawSpecies for lookup purposes
        setRawSpecies(mergedData);

        // 2. Group them for the gallery display as usual
        const grouped = mergedData.reduce((acc: any, r: any) => {
          if (!acc[r.name]) acc[r.name] = r;
          if (r.source === 'XPHB' || r.source === 'PHB') acc[r.name] = r;
          return acc;
        }, {});
        setAllSpecies(Object.values(grouped));
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      setDraft({ ...draft, background: data.name });
    }

    // Close all overlays and go back to Hub
    setInspectingClass(null);
    setInspectingSpecies(null);
    setInspectingBackground(null);
    setActiveSection(null);
  };

  const AbilitiesView = () => {

    const classTheme = CLASS_THEMES[draft.class] || { color: '#b8860b' };
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

    const { bgSkills, raceAuto, raceChoice, classChoice } = getCategorizedSkills();
    const selected = draft.proficiencies || [];
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const standardArray = [15, 14, 13, 12, 10, 8];
    const usedNumbers = Object.values(baseScores).filter(n => n > 0);

    // --- 2. THE PICKER LOGIC ---
    const handleSkillToggle = (skill: string, pool: string[], limit: number) => {
      const isCurrentlySelected = selected.includes(skill);
      // Only count selections that came from THIS specific pool
      const currentPicksFromPool = selected.filter(s => pool.includes(s)).length;

      if (isCurrentlySelected) {
        setDraft({ ...draft, proficiencies: selected.filter(s => s !== skill) });
      } else if (currentPicksFromPool < limit) {
        setDraft({ ...draft, proficiencies: [...selected, skill] });
      }
    };

    // --- 3. UI BUILDER ---
    const SkillBlock = ({ title, skills, limit, isFixed, color }: any) => {
      const currentPicks = selected.filter(s => skills.includes(s)).length;
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
              const isSelected = selected.includes(s) || isFixed;
              return (
                <button
                  key={s}
                  onClick={() => !isFixed && handleSkillToggle(s, skills, limit)}
                  style={{
                    padding: '6px 14px', fontSize: '0.7rem', borderRadius: '4px', cursor: isFixed ? 'default' : 'pointer',
                    border: `1px solid ${isSelected ? color : '#4a5568'}`,
                    background: isSelected ? `${color}33` : 'transparent',
                    color: isSelected ? 'white' : '#cbd5e0',
                    fontWeight: 'bold', transition: '0.2s'
                  }}
                >
                  {s.replace(/([A-Z])/g, ' $1').toUpperCase()}
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

        <div style={{ display: 'flex', gap: '40px', marginTop: '30px' }}>

          {/* LEFT: THE SOURCE-DRIVEN LISTS */}
          <div style={{ flex: 1 }}>
            <div style={sectionLabelStyle}>PROFICIENCIES BY SOURCE</div>

            {bgSkills.length > 0 && <SkillBlock title={`Background: ${draft.background}`} skills={bgSkills} isFixed color="#a0aec0" />}
            {raceAuto.length > 0 && <SkillBlock title="Species Traits" skills={raceAuto} isFixed color="#b8860b" />}
            {raceChoice.count > 0 && <SkillBlock title="Species Choices" skills={raceChoice.from} limit={raceChoice.count} color="#b8860b" />}
            {classChoice.count > 0 && <SkillBlock title={`Class: ${draft.class}`} skills={classChoice.from} limit={classChoice.count} color={classTheme.tagline_color} />}

            {!draft.class && <p style={{ color: '#718096', fontSize: '0.8rem' }}>Please select a Class and Background to see skill options.</p>}
          </div>

          {/* RIGHT: ABILITY SCORES (Same as before) */}
          <div style={{ flex: 1.2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {stats.map(stat => {
              const base = baseScores[stat] || 0;
              const racial = getFinalRacialBonus(stat);
              const total = base > 0 ? base + racial : '-';

              return (
                <div key={stat} style={{ ...abilityCardStyle, borderLeft: `4px solid ${base > 0 ? '#b8860b' : '#4a5568'}` }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b8860b' }}>{stat.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
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
    const theme = CLASS_THEMES[info.name] || CLASS_THEMES.Barbarian;

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

                  return (
                    <div key={`${sub.name}-${sub.source}`} style={{
                      ...subclassCardStyle,
                      borderColor: `${theme.color}aa`, // Brighter border
                      background: '#12161d', // SOLID background to stop the gold bleed
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                      {/* The Image - Increased Opacity */}
                      <div style={{
                        ...cardArtStyle,
                        backgroundImage: `url("${imagePath}")`,
                        opacity: 0.8, // Increased from 0.5 to 0.8
                        backgroundSize: 'cover',
                        backgroundPosition: 'center top'
                      }} />

                      {/* The Gradient - Darkened to keep text white and crisp */}
                      <div style={{
                        ...cardGradientOverlay,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%)'
                      }} />

                      <div style={{ position: 'relative', zIndex: 3, padding: '25px' }}>
                        <div style={{ fontSize: '0.7rem', color: theme.tagline_color, fontWeight: 'bold', letterSpacing: '1px' }}>PATH OF THE</div>
                        <h3 style={{ fontSize: '1.8rem', margin: '5px 0', fontFamily: 'serif', color: 'white' }}>{sub.name}</h3>
                        <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>{sub.source}</div>
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
                {CLASS_THEMES[clsName] ? (
                  CLASS_THEMES[clsName].pills.map((pill: any) => (
                    <div
                      key={pill.short}
                      style={{
                        ...pillBadgeStyle,
                        borderColor: CLASS_THEMES[clsName].tagline_color,
                        background: hexToRGBA(CLASS_THEMES[clsName].color, 0.1),
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
                {CLASS_THEMES[clsName]?.tagline || `Masters of their craft, the ${clsName} brings unique skills to the party.`}
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

  // --- 4. SUB-VIEW: DETAILED LOOK ---
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

  // --- 5. SUB-VIEW: SPECIES SELECTOR ---
  const SpeciesView = () => (
    <div style={subOverlayStyle}>
      <button onClick={() => setActiveSection(null)} style={backButtonStyle}>← BACK TO HUB</button>
      <h1 style={{ fontSize: '2.5rem', margin: '10px 0' }}>What's your lineage?</h1>
      <input
        placeholder="Search species..."
        style={searchFieldStyle}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div style={speciesGridStyle}>
        {allSpecies
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
                      // Check if there are subraces OR multiple source versions
                      const hasSubraces = allSubraces.filter(sub => sub.raceName === s.name).length > 0;
                      const hasMultipleVersions = rawSpecies.filter(rs => rs.name === s.name).length > 1;

                      if (hasSubraces || hasMultipleVersions) {
                        // If multiple options exist, force them into the Detailed view to choose correctly
                        setInspectingSpecies(s);
                      } else {
                        // If it's unique, select it immediately
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

  const EquipmentSelectionView = () => {
    const startingGear = selectedClassData?.info?.startingEquipment;
    const choices = startingGear?.defaultData || [];

    // --- 1. ROBUST LABEL GENERATOR ---
    const generateGearLabel = (items: any[]) => {
      if (!items || items.length === 0) return "Standard Gear";

      const itemArray = Array.isArray(items) ? items : [items];

      return itemArray.map(item => {
        if (typeof item === 'string') return cleanString(item);

        // Handle "any martial/simple weapon" from class JSON
        if (item.equipmentType) {
          // We check if the string contains "martial" anywhere (case insensitive)
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

    const handleChoiceClick = (index: number, key: 'a' | 'b', items: any) => {
      if (!items) return;
      const itemsArray = Array.isArray(items) ? items : [items];

      const genericItem = itemsArray.find((i: any) => i.equipmentType);

      if (genericItem) {
        setActiveEquipmentPicker({
          groupIndex: index,
          choiceKey: key,
          filter: genericItem.equipmentType
        });
      } else {
        // 1. Mark the visual choice (Option A or B)
        const newChoices = [...equipmentChoices];
        newChoices[index] = key;
        setEquipmentChoices(newChoices);

        // 2. Map the actual items to our inventory format
        const gearToAdd = itemsArray.map((i: any) => ({
          id: `${Date.now()}-${Math.random()}`, // Unique ID
          name: typeof i === 'string' ? cleanString(i) : cleanString(i.item || i.name),
          equipped: true
        }));

        // 3. PERSISTENCE FIX: Always use the 'prev' state to avoid losing items
        setDraft((prev: any) => {
          // Filter out any old gear from this specific row index to allow "swapping" A and B
          const otherGear = (prev.inventory || []).filter((invItem: any) => !invItem.id.startsWith(`row-${index}`));

          // Tag these items so we can find/replace them if the user changes their mind
          const taggedGear = gearToAdd.map(g => ({ ...g, id: `row-${index}-${g.name}` }));

          return {
            ...prev,
            inventory: [...otherGear, ...taggedGear]
          };
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
              const optA = group.a || group.A;
              const optB = group.b || group.B;
              return (
                <div key={index} style={equipmentRowStyle}>
                  <div
                    onClick={() => handleChoiceClick(index, 'a', optA)}
                    style={{ ...gearOptionStyle, border: `2px solid ${equipmentChoices[index] === 'a' ? '#b8860b' : 'transparent'}` }}
                  >
                    <div style={optionLabelStyle}>OPTION A</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{generateGearLabel(optA)}</div>
                  </div>
                  {optB && <div style={orDividerStyle}>OR</div>}
                  {optB && (
                    <div
                      onClick={() => handleChoiceClick(index, 'b', optB)}
                      style={{ ...gearOptionStyle, border: `2px solid ${equipmentChoices[index] === 'b' ? '#b8860b' : 'transparent'}` }}
                    >
                      <div style={optionLabelStyle}>OPTION B</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{generateGearLabel(optB)}</div>
                    </div>
                  )}
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

            <button
              onClick={handleRollGold}
              style={{ ...detailSelectButtonStyle, background: '#b8860b', color: 'black' }}
            >
              🎲 {rolledGold > 0 ? 'RE-ROLL GOLD' : 'ROLL FOR GOLD'}
            </button>

            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#718096' }}>
              Note: Selecting gold means you will start with no equipment in your inventory.
            </p>
          </div>
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

                        setDraft((prev: any) => ({
                          ...prev,
                          inventory: [...(prev.inventory || []), { id: `${item.name}-${Date.now()}`, name: item.name, equipped: true }]
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
          defaultImage="/img/hub/abilities_default.jpg"
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
      backgroundImage = `url("/img/backgrounds/${draft.background.replace(/\s/g, '20%')}.webp")`;
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
          {type === 'class' && draft.class && CLASS_THEMES[draft.class] && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {CLASS_THEMES[draft.class].pills.map((pill: any) => (
                <div
                  key={pill.short}
                  style={{
                    ...pillBadgeStyle,
                    borderColor: CLASS_THEMES[draft.class].tagline_color,
                    background: `${hexToRGBA(CLASS_THEMES[draft.class].color, 0.1)}`, // Match the transparency
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
        {/* SIDEBAR ... */}
        <div style={sidebarStyle}>
          <button
            style={{
              ...createButtonStyle,
              // 1. Visual feedback: if valid, make it Gold. If not, make it Grey.
              background: (draft.name && draft.race && draft.class && Object.values(baseScores).every(v => v > 0))
                ? '#b8860b' : '#2d3748',
              color: 'white',
              cursor: 'pointer',
              opacity: (draft.name && draft.race && draft.class) ? 1 : 0.5
            }}
            onClick={() => {
              // DEBUG: This will print to your console (F12) so you can see why it won't advance
              console.log("Current Draft:", draft);
              console.log("Current Scores:", baseScores);

              const isIdentityValid = draft.name && draft.race && draft.class;
              const areStatsValid = Object.values(baseScores).every(v => v > 0);

              if (creationStage === 'hub') {
                if (isIdentityValid && areStatsValid) {
                  setCreationStage('equipment');
                  window.scrollTo(0, 0); // Scroll to top for the new screen
                } else {
                  alert(`Missing Info: ${!draft.name ? 'Name, ' : ''}${!draft.race ? 'Race, ' : ''}${!draft.class ? 'Class, ' : ''}${!areStatsValid ? 'Ability Scores' : ''}`);
                }
              } else {
                // Final Completion Logic
                const finalCharacter = {
                  ...draft,
                  baseStats: baseScores,
                  level: draft.classLevels?.reduce((sum: number, cl: any) => sum + cl.level, 0) || 1,
                  inventory: draft.inventory || []
                };
                onComplete(finalCharacter);
              }
            }}
          >
            {creationStage === 'hub' ? 'CONFIRM CORE IDENTITY' : 'FINISH CHARACTER'}
          </button>
          <input placeholder="Name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={nameInputStyle} />
        </div>
        {creationStage === 'hub' && (
          <>
            {inspectingSpecies && <DetailedSpeciesView data={inspectingSpecies} />}
            {inspectingClass && <DetailedClassView data={inspectingClass} />}
            {inspectingBackground && <DetailedBackgroundView data={inspectingBackground} />}
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
    </div>
  );
}

// --- 7. STYLES (Clean Object Definitions) ---
const overlayStyle: any = { position: 'fixed', inset: 0, background: '#12161d', zIndex: 1000, display: 'flex', color: 'white' };

const containerStyle: any = { display: 'flex', width: '100%', maxWidth: '1400px', margin: '0 auto' };

const sidebarStyle: any = { width: '350px', background: '#1a202c', padding: '40px 20px', borderLeft: '1px solid #2d3748', display: 'flex', flexDirection: 'column' };

const hubGridStyle: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };

const hubCardGradient: any = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18, 22, 29, 0.9) 0%, rgba(18, 22, 29, 0.4) 100%)', zIndex: 1, pointerEvents: 'none' };

const sectionTitleStyle: any = { fontSize: '2.5rem', margin: '10px 0 30px 0', fontFamily: 'serif' };

const hubCardStyle: any = { height: '240px', background: '#2d3748', borderRadius: '12px', padding: '30px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', border: '1px solid #4a5568', position: 'relative' };

const speciesGridStyle: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '30px', paddingBottom: '50px' };

const speciesCardStyle: any = { height: '320px', position: 'relative', borderRadius: '15px', overflow: 'hidden', border: '1px solid #4a5568' };

const cardArtStyle: any = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 };

const cardGradientOverlay: any = { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)', zIndex: 2 };

const cardContentStyle: any = { position: 'relative', zIndex: 3, padding: '30px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const cardDescriptionStyle: any = { fontSize: '0.85rem', color: '#cbd5e0', margin: '15px 0', maxWidth: '70%', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' };

const selectButtonStyle: any = { background: '#2d3748', border: '1px solid white', color: 'white', padding: '8px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };

const detailsLinkStyle: any = { background: 'none', border: 'none', color: '#f6e05e', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' };

const goldCornerBR: any = { position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '3px solid #b8860b', borderRight: '3px solid #b8860b', borderBottomRightRadius: '15px' };

const goldBorderBottom: any = { position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '3px solid #b8860b', borderRight: '3px solid #b8860b', borderBottomRightRadius: '15px' };

const searchFieldStyle: any = { width: '100%', padding: '15px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '8px', color: 'white', marginTop: '20px' };

const backButtonStyle: any = { background: 'none', border: 'none', color: '#718096', cursor: 'pointer', marginBottom: '10px' };

const detailBackButtonStyle: any = { background: 'none', border: '1px solid #4a5568', color: 'white', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer' };

const detailSelectButtonStyle: any = { background: '#b8860b', border: 'none', color: 'black', padding: '8px 30px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' };

const sectionLabelStyle: any = { fontSize: '0.75rem', fontWeight: 'bold', color: '#b8860b', letterSpacing: '2px', marginBottom: '15px' };

const loreTextStyle: any = { color: '#cbd5e0', lineHeight: '1.7', fontSize: '1.05rem' };

const featureItemStyle: any = { padding: '20px', background: '#1a202c', borderRadius: '8px', border: '1px solid #2d3748', marginBottom: '15px' };

const createButtonStyle: any = { width: '100%', padding: '15px', borderRadius: '25px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' };

const portraitFrameStyle: any = { width: '100%', height: '350px', border: '2px solid #b8860b', borderRadius: '150px 150px 0 0', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const nameInputStyle: any = { width: '100%', padding: '12px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '8px', color: 'white', marginTop: '20px', textAlign: 'center' };

const cancelButtonStyle: any = { position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', color: '#718096', cursor: 'pointer' };

const seeOptionsButtonStyle: any = { zIndex: 10, position: 'relative', background: '#822000', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };

const selectionBadgeStyle: any = { display: 'inline-block', background: '#b8860b', color: 'black', padding: '2px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '10px' };

const badgeStyle: any = { background: 'rgba(255,255,255,0.1)', border: '1px solid #4a5568', padding: '5px 15px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', color: '#cbd5e0', textTransform: 'uppercase', letterSpacing: '1px' };

const classCardStyle: any = { height: '400px', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #4a5568', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' };

const classCardGradient: any = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)', zIndex: 2 };

const classBannerContainer: any = { position: 'absolute', top: '-5px', left: '20px', width: '80px', height: '140px', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', zIndex: 4, display: 'flex', justifyContent: 'center', paddingTop: '15px' };

const classIconOnBannerStyle: any = { height: '50px', opacity: 0.9 };

const classCardContentStyle: any = { position: 'relative', zIndex: 3, padding: '30px', textAlign: 'left' };

const pillBadgeStyle: any = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid', borderRadius: '30px', padding: '2px 12px', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.2px', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'sans-serif', backdropFilter: 'blur(3px)', marginRight: '8px', };

const learnMoreButtonStyle: any = { background: 'rgba(255,255,255,0.1)', border: '1px solid white', color: 'white', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' };

const classSelectButtonStyle: any = { background: 'white', border: 'none', color: 'black', padding: '8px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' };

const classDescriptionStyle: any = { fontSize: '1rem', color: '#cbd5e0', lineHeight: '1.4', margin: '10px 0', maxWidth: '90%' };

const goldBorderWrap: any = { maxWidth: '1300px', margin: '0 auto', height: '100%', position: 'relative', borderLeft: '2px solid rgba(184, 134, 11, 0.3)', borderRight: '2px solid rgba(184, 134, 11, 0.3)' };

const loreListStyle: any = { color: '#cbd5e0', lineHeight: '2', fontSize: '1.1rem', listStyleType: 'square' };

const subclassCardStyle: any = { height: '200px', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #4a5568', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' };

const goldCornerTL: any = { position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '2px solid #b8860b', borderLeft: '2px solid #b8860b', borderTopLeftRadius: '8px' };

const gearBoxStyle: any = { border: '1px solid #b8860b', borderRadius: '8px', padding: '40px', display: 'flex', gap: '40px', alignItems: 'center' };

const detailOverlayStyle: any = { position: 'fixed', inset: 0, background: '#0a0d12', zIndex: 1200, overflowY: 'auto' };

const detailNavStyle: any = { position: 'sticky', top: 0, height: '70px', background: 'rgba(10, 13, 18, 0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', zIndex: 100 };

const heroSectionStyle: any = { height: '65vh', backgroundSize: 'cover', backgroundPosition: 'center 20%', position: 'relative', display: 'flex', alignItems: 'flex-end' };

const heroContentStyle: any = { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 40px 60px 40px', zIndex: 2 };

const infoGridContainerStyle: any = { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px' };

const heroGradientStyle: any = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0d12 0%, rgba(10, 13, 18, 0.4) 50%, transparent 100%)', zIndex: 1 };

const sideRailStyle: any = { position: 'fixed', left: 0, top: '70px', bottom: 0, width: '70px', background: '#12161d', borderRight: '1px solid #2d3748', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', zIndex: 1300, overflowY: 'auto' };

const sideRailIconContainer: any = { width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', marginBottom: '5px' };

const subOverlayStyle: any = { flex: 1, padding: '40px', height: '100vh', overflowY: 'auto', position: 'relative' };

const statBonusBadgeStyle: any = { padding: '2px 8px', border: '1px solid #b8860b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'white', background: 'rgba(184, 134, 11, 0.2)' };

const versionTabStyle: any = { padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' };

const equipmentRowStyle: any = { display: 'flex', alignItems: 'center', gap: '15px', width: '100%', marginBottom: '10px' };

const gearOptionStyle: any = { flex: 1, padding: '20px', background: 'rgba(45, 55, 72, 0.4)', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const optionLabelStyle: any = { fontSize: '0.7rem', fontWeight: 'bold', color: '#b8860b', letterSpacing: '1px', marginBottom: '5px' };

const orDividerStyle: any = { fontWeight: 'bold', color: '#4a5568', fontSize: '0.8rem' };

const modalOverlayStyle: any = { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 };

const pickerContentStyle: any = { background: '#1a202c', padding: '30px', borderRadius: '12px', border: '2px solid #b8860b', width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' };

const scrollableListStyle: any = { flex: 1, overflowY: 'auto', marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingRight: '10px' };

const pickerItemButtonStyle: any = { padding: '12px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold', transition: '0.2s' };

const closeButtonStyle: any = { marginTop: '20px', padding: '12px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };