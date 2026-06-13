'use client';
// =============================================================================
// 📘 FILE: components/SpellSelectionView.tsx
// =============================================================================
// 🎯 PURPOSE: The spell selection wizard used during character creation and
//    level-up. Manages cantrip picks (up to known max) and prepared/known spells
//    (up to class maximums). Supports search, sort-by, new-level filtering,
//    existing spell highlighting, and inline spell detail modals.
//
// 🧠 REACT CONCEPT #1: useMemo for Filtered Spell List
//    `filtered` memoizes the spell list filtering/sorting by tab (cantrip/spell),
//    search query, class restriction, and new-level filters. This prevents
//    re-filtering on every keystroke or selection change.
//
// 🧠 REACT CONCEPT #2: Controlled Toggle Pattern
//    `toggle()` receives the current list and setter as arguments, adding or
//    removing the spell name while respecting the max count. This abstracts the
//    "select up to N" logic into a reusable function.
//
// 🧠 REACT CONCEPT #3: Props Drilling + Composition
//    The component receives all data via props (classInfo, level, baseStats,
//    initialSpells, onConfirm/onBack) rather than context. This makes it fully
//    controlled by its parent (create/level-up wizard) and easy to test.
// =============================================================================
import { useState, useEffect, useMemo } from 'react';
import { DataEngine } from '../utils/dataLoader';
import {
  getCantripsKnown,
  getSpellsKnownAtLevel,
  getPreparedCount,
  usesPreparedSpells,
  usesKnownSpells,
  getSpellcastingAbility,
  isSpellcaster,
  getMaxSpellLevel,
} from '../utils/spellcastingEngine';
import { Character } from '../lib/character';
import { getAbilityModifier } from '../utils/characterProgression';
import { cleanString, formatEntries as formatTextEntries } from '../utils/formatters';

interface SpellSelectionViewProps {
  classInfo: any;
  level: number;
  baseStats: Character['baseStats'];
  initialSpells?: Character['spells'];
  newCantripsCount?: number;
  newSpellsCount?: number;
  newSpellLevels?: Set<number>;
  onConfirm: (spells: Character['spells']) => void;
  onBack: () => void;
}

export default function SpellSelectionView({
  classInfo,
  level,
  baseStats,
  initialSpells,
  newCantripsCount = 0,
  newSpellsCount = 0,
  newSpellLevels,
  onConfirm,
  onBack,
}: SpellSelectionViewProps) {
  const [allSpells, setAllSpells] = useState<any[]>([]);
  const [spellClassLookup, setSpellClassLookup] = useState<Record<string, any> | null>(null);
  const [search, setSearch] = useState('');
  const [cantrips, setCantrips] = useState<string[]>(initialSpells?.cantrips || []);
  const [known, setKnown] = useState<string[]>(initialSpells?.known || []);
  const [prepared, setPrepared] = useState<string[]>(initialSpells?.prepared || []);
  const [tab, setTab] = useState<'cantrip' | 'spell'>('cantrip');
  const [viewingSpell, setViewingSpell] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'level'>('level');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const maxCantrips = getCantripsKnown(classInfo, level);
  const maxKnown = getSpellsKnownAtLevel(classInfo, level);
  const ability = getSpellcastingAbility(classInfo);
  const maxPrepared = getPreparedCount(classInfo, level, baseStats[ability]);
  const isPrepared = usesPreparedSpells(classInfo);
  const isKnown = usesKnownSpells(classInfo);
  const isLevelUp = initialSpells && (initialSpells.cantrips.length > 0 || initialSpells.known.length > 0 || initialSpells.prepared.length > 0);
  const hasNewSpellData = newCantripsCount > 0 || newSpellsCount > 0;

  useEffect(() => {
    DataEngine.getSpells(['PHB', 'XPHB']).then(setAllSpells);
  }, []);

  const classSpellNames = useMemo(() => {
    if (!spellClassLookup || !classInfo?.name) return null;
    const className = classInfo.name;
    const names = new Set<string>();
    for (const sourceKey of Object.keys(spellClassLookup)) {
      const sourceData = spellClassLookup[sourceKey];
      for (const spellName of Object.keys(sourceData)) {
        const entry = sourceData[spellName];
        if (entry.class) {
          for (const src of Object.keys(entry.class)) {
            if (entry.class[src][className]) {
              names.add(spellName);
              break;
            }
          }
        }
      }
    }
    return names;
  }, [spellClassLookup, classInfo?.name]);

  useEffect(() => {
    DataEngine.loadLocalJson('data/generated/gendata-spell-source-lookup.json').then(setSpellClassLookup);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let spells = allSpells.filter((s) => {
      if (tab === 'cantrip' && s.level !== 0) return false;
      if (tab === 'spell' && s.level === 0) return false;
      if (tab === 'spell' && s.level > getMaxSpellLevel(classInfo, level)) return false;
      if (classSpellNames && !classSpellNames.has(s.name.toLowerCase())) return false;
      if (showNewOnly && tab === 'spell' && newSpellLevels && !newSpellLevels.has(s.level)) return false;
      return s.name.toLowerCase().includes(q);
    });

    const sorted = [...spells].sort((a, b) => {
      if (sortBy === 'level') {
        const lvlDiff = (a.level || 0) - (b.level || 0);
        if (lvlDiff !== 0) return lvlDiff;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [allSpells, search, tab, level, classSpellNames, sortBy, showNewOnly, newSpellLevels]);

  const toggle = (name: string, list: string[], setList: (v: string[]) => void, max: number) => {
    if (list.includes(name)) {
      setList(list.filter((n) => n !== name));
    } else if (list.length < max) {
      setList([...list, name]);
    }
  };

  const spellList = tab === 'cantrip' ? cantrips : isPrepared ? prepared : known;
  const maxPicks = tab === 'cantrip' ? maxCantrips : isPrepared ? maxPrepared : maxKnown ?? 99;
  const setSpellList = tab === 'cantrip' ? setCantrips : isPrepared ? setPrepared : setKnown;

  if (!isSpellcaster(classInfo)) {
    return (
      <div style={{ padding: '40px', color: 'white' }}>
        <p>This class does not cast spells.</p>
        <button onClick={() => onConfirm({ cantrips: [], known: [], prepared: [] })}>Continue</button>
      </div>
    );
  }

  const existingSpells = tab === 'cantrip'
    ? (initialSpells?.cantrips || [])
    : isPrepared
      ? (initialSpells?.prepared || [])
      : (initialSpells?.known || []);

  return (
    <div style={{ flex: 1, padding: isMobile ? '16px' : '40px', color: 'white', overflow: 'auto' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#718096', cursor: 'pointer' }}>← Back</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <img src={`/img/classes/Icons/${classInfo.name}.png`} style={{ width: '48px', height: '48px' }} />
        <div>
          <h1 style={{ fontFamily: 'serif', margin: 0 }}>Choose Spells</h1>
          <p style={{ color: '#a0aec0', margin: '4px 0 0' }}>
            {classInfo.name} · Level {level} · {ability.toUpperCase()} ({getAbilityModifier(baseStats[ability]) >= 0 ? '+' : ''}{getAbilityModifier(baseStats[ability])})
            {isLevelUp && ' · Updating existing spellbook'}
          </p>
        </div>
      </div>

      {isLevelUp && (
        <div style={{ background: '#2d3748', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #6366f1', fontSize: '0.85rem', color: '#cbd5e0' }}>
          You already know {initialSpells?.cantrips.length || 0} cantrip{(initialSpells?.cantrips.length || 0) !== 1 ? 's' : ''}
          {isKnown ? ` and ${initialSpells?.known.length || 0} spell${(initialSpells?.known.length || 0) !== 1 ? 's' : ''}` : ''}
          . Your new maximum{tab === 'cantrip' ? ` is ${maxCantrips} (${(initialSpells?.cantrips || []).length} existing + ${maxCantrips - (initialSpells?.cantrips || []).length} new)` : ''}. Spells you already have are highlighted.
          {isKnown && <span style={{ display: 'block', marginTop: '6px', color: '#93c5fd' }}>You can deselect a known spell to replace it with a new one (spell swap).</span>}
        </div>
      )}

      {hasNewSpellData && (
        <div style={{ background: '#1a202c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #b8860b', fontSize: '0.85rem', color: '#f6e05e' }}>
          You can learn{newCantripsCount > 0 ? ` ${newCantripsCount} new cantrip${newCantripsCount > 1 ? 's' : ''}` : ''}{newCantripsCount > 0 && newSpellsCount > 0 ? ' and' : ''}{newSpellsCount > 0 ? ` ${newSpellsCount} new spell${newSpellsCount > 1 ? 's' : ''}` : ''}. Use the filter below to show only newly available spells.
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', margin: '20px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setTab('cantrip')}
          style={{ padding: '8px 16px', background: tab === 'cantrip' ? '#b8860b' : '#2d3748', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cantrips ({cantrips.length}/{maxCantrips})
        </button>
        <button
          onClick={() => setTab('spell')}
          style={{ padding: '8px 16px', background: tab === 'spell' ? '#b8860b' : '#2d3748', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isPrepared ? `Prepared (${prepared.length}/${maxPrepared})` : `Spells (${known.length}/${maxKnown ?? '—'})`}
        </button>
        {hasNewSpellData && newSpellLevels && newSpellLevels.size > 0 && (
          <button
            onClick={() => setShowNewOnly(!showNewOnly)}
            style={{ padding: '8px 16px', background: showNewOnly ? '#b8860b' : '#2d3748', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            {showNewOnly ? 'Showing New Only' : `Show New Only (${tab === 'spell' ? [...newSpellLevels].map(l => `Lv${l}`).join(', ') : newCantripsCount} new)`}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{ padding: '6px 10px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}
        >
          <option value="level">Sort by Level</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      <input
        placeholder="Search spells..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '15px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '8px' }}>
        {filtered.slice(0, 80).map((spell) => {
          const selected = spellList.includes(spell.name);
          const wasExisting = existingSpells.includes(spell.name);
          const isNewLevel = newSpellLevels?.has(spell.level);
          return (
            <div
              key={`${spell.name}-${spell.source}`}
              style={{
                padding: '10px',
                background: selected ? (wasExisting ? '#374151' : '#6366f1') : '#2d3748',
                border: `1px solid ${selected ? (wasExisting ? '#6366f1' : '#818cf8') : '#4a5568'}`,
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }} onClick={() => toggle(spell.name, spellList, setSpellList, maxPicks)}>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                  {spell.name}
                  {wasExisting && isLevelUp && <span style={{ marginLeft: '6px', fontSize: '0.6rem', color: '#93c5fd' }}>EXISTING</span>}
                  {isNewLevel && !showNewOnly && <span style={{ marginLeft: '6px', fontSize: '0.6rem', color: '#48bb78', fontWeight: 'bold' }}>NEW</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: selected ? '#e2e8f0' : '#a0aec0' }}>
                  {spell.level === 0 ? 'Cantrip' : `Lv ${spell.level}`} · {spell.school}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setViewingSpell(spell); }}
                style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'transparent', border: '1px solid #718096', color: '#cbd5e0', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' }}
                title="View details"
              >
                ⓘ
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
        <button
          onClick={() => onConfirm({ cantrips, known, prepared })}
          style={{ padding: '12px 24px', background: '#b8860b', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
        >
          {isLevelUp ? 'Update Spellbook' : 'Confirm Spells'}
        </button>
        <button
          onClick={onBack}
          style={{ padding: '12px 24px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
        >
          Back
        </button>
      </div>

      {viewingSpell && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#1a1a1a', padding: isMobile ? '16px' : '30px', borderRadius: '8px', width: isMobile ? '95vw' : '500px', maxHeight: '80vh', overflowY: 'auto', border: '2px solid #b8860b', color: 'white' }}>
            <h2 style={{ color: '#b8860b' }}>{viewingSpell.name}</h2>
            <p style={{ color: '#a0aec0' }}>
              {viewingSpell.level === 0 ? 'Cantrip' : `Level ${viewingSpell.level}`} · {viewingSpell.school} · {viewingSpell.source}
            </p>
            <div style={{ marginTop: '15px', lineHeight: 1.6 }}>
              {(viewingSpell.entries || []).map((e: unknown, i: number) => (
                <p key={i}>{typeof e === 'string' ? cleanString(e) : JSON.stringify(e)}</p>
              ))}
            </div>
            <button onClick={() => setViewingSpell(null)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#b8860b', border: 'none', color: 'white', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SpellDetailModal({ spell, onClose }: { spell: any; onClose: () => void }) {
  if (!spell) return null;
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#1a1a1a', padding: isMobile ? '16px' : '30px', borderRadius: '8px', width: isMobile ? '95vw' : '500px', maxHeight: '80vh', overflowY: 'auto', border: '2px solid #b8860b', color: 'white' }}>
        <h2 style={{ color: '#b8860b' }}>{spell.name}</h2>
        <p style={{ color: '#a0aec0' }}>
          {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · {spell.school} · {spell.source}
        </p>
        <div style={{ marginTop: '15px', lineHeight: 1.6, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
          {formatTextEntries(spell.entries || [])}
        </div>
        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#b8860b', border: 'none', color: 'white' }}>Close</button>
      </div>
    </div>
  );
}
