'use client';
import { useState, useEffect } from 'react';
import { DataEngine } from '../../utils/dataLoader';
import { formatValue, formatEntries, cleanString } from '../../utils/formatters';
import {
  rollD20,
  rollDice,
  rollD20WithAdvantage,
  applyDamageModifier,
  parseMonsterDamageTypes,
} from '../../utils/rollEngine';
import {
  getEffectsFromConditions,
  getCombinedModifiers,
  computeEffectiveSpeed,
} from '../../utils/activeEffects';
import { rollActionSimple } from '../../utils/actionRoller';
import { concentrationSaveDC } from '../../utils/spellcastingEngine';

export interface Combatant {
  id: number;
  name: string;
  initiative: number;
  currentHp: number;
  maxHp?: number;
  ac?: number;
  conditions: string[];
  concentratingOn?: string | null;
  resist?: string[];
  immune?: string[];
  vuln?: string[];
  action?: Array<{ name: string; entries?: unknown[] }>;
  count?: number;
  isPc?: boolean;
  cr?: any;
  [key: string]: unknown;
}

const CR_XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450,
  '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
  '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000,
  '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000,
  '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000,
  '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
  '29': 135000, '30': 155000,
};

function getCrNumber(cr: any): string {
  if (typeof cr === 'string') return cr;
  if (cr?.cr) return cr.cr;
  return '0';
}

function getCrXp(cr: any): number {
  return CR_XP[getCrNumber(cr)] || 0;
}

function estimateDifficulty(totalXp: number, players: number, level: number): string {
  if (players === 0 || level === 0) return '';
  const perPlayer = Math.round(totalXp / players);
  const table: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
    1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
    2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
    3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
    4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
    5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
    6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
    7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
    8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
    9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
    10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
    11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
    12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
    13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
    14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
    15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
    16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
    17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
    18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
    19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
    20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
  };
  const thresholds = table[level] || table[1];
  if (perPlayer >= thresholds.deadly) return 'Deadly';
  if (perPlayer >= thresholds.hard) return 'Hard';
  if (perPlayer >= thresholds.medium) return 'Medium';
  return 'Easy';
}

const commonConditions = ['Prone', 'Stunned', 'Poisoned', 'Frightened', 'Paralyzed', 'Blinded', 'Restrained', 'Incapacitated'];

function CombatantCard({ c, isActive, onAdjustHp, onToggleCondition, onRemove, onSetConcentration, setSelectedMonster, showHp, rollActionSimple }: {
  c: Combatant; isActive: boolean; onAdjustHp: (id: number, delta: number) => void;
  onToggleCondition: (id: number, cond: string) => void; onRemove: (id: number) => void;
  onSetConcentration: (id: number) => void; setSelectedMonster: (m: any) => void;
  showHp: boolean; rollActionSimple: (action: any) => any;
}) {
  const [actionRollResult, setActionRollResult] = useState<string | null>(null);
  const effects = getEffectsFromConditions(c.conditions);
  const effectMods = getCombinedModifiers(effects);
  const hpPct = c.maxHp ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 100;
  const hpColor = hpPct > 60 ? 'var(--dungeon-success, #48bb78)' : hpPct > 30 ? 'var(--dungeon-warning, #ecc94b)' : 'var(--dungeon-danger, #e53e3e)';
  const monsterActions = !c.isPc ? c.action : undefined;

  return (
    <div style={{
      background: 'var(--dungeon-surface, #2d3748)',
      border: isActive ? '2px solid var(--dungeon-gold, #b8860b)' : '1px solid var(--dungeon-border, #4a5568)',
      borderRadius: 'var(--dungeon-radius-md, 8px)',
      padding: '12px 16px',
      marginBottom: '8px',
      boxShadow: isActive ? '0 0 12px rgba(184,134,11,0.3)' : 'none',
      transition: 'border 0.2s, box-shadow 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--dungeon-text-dim, #718096)', fontWeight: 600, minWidth: '30px' }}>Init {c.initiative}</span>
          <strong style={{ color: c.isPc ? 'var(--dungeon-accent, #6366f1)' : 'var(--dungeon-text, #e2e8f0)', fontSize: '1rem' }}>
            {c.name}
            {c.count && c.count > 1 ? <span style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.75rem', marginLeft: '6px' }}>×{c.count}</span> : null}
          </strong>
          {c.concentratingOn && <span style={{ color: 'var(--dungeon-warning, #ecc94b)', fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(236,201,75,0.15)', borderRadius: '4px' }} title={`Concentrating: ${c.concentratingOn}`}>C</span>}
          {effectMods.attackDisadvantage && <span style={{ color: 'var(--dungeon-danger)', fontSize: '0.7rem' }}>ATK DIS</span>}
          {effectMods.grantAdvantageToAttackers && <span style={{ color: 'var(--dungeon-danger)', fontSize: '0.7rem' }}>VULN</span>}
          {!!c.cr && !c.isPc && (
            <button onClick={() => setSelectedMonster(c)}
              style={{ padding: '1px 6px', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', borderRadius: '3px', cursor: 'pointer', fontSize: '0.65rem' }}>
              View
            </button>
          )}
        </div>
        <button onClick={() => onRemove(c.id)} style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--dungeon-danger, #e53e3e)', color: 'var(--dungeon-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
      </div>

      {/* HP Bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
          <span style={{ color: 'var(--dungeon-text-dim)' }}>HP</span>
          <span style={{ fontWeight: 'bold', color: 'var(--dungeon-text)' }}>{showHp ? `${c.currentHp}${c.maxHp ? ` / ${c.maxHp}` : ''}` : '??'}</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* HP controls + speed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="touch-target" onClick={() => onAdjustHp(c.id, -10)} style={hpBtnStyle(-10)}>-10</button>
          <button className="touch-target" onClick={() => onAdjustHp(c.id, -5)} style={hpBtnStyle(-5)}>-5</button>
          <button className="touch-target" onClick={() => onAdjustHp(c.id, -1)} style={hpBtnStyle(-1)}>-1</button>
          <button className="touch-target" onClick={() => onAdjustHp(c.id, 1)} style={hpBtnStyle(1)}>+1</button>
          <button className="touch-target" onClick={() => onAdjustHp(c.id, 5)} style={hpBtnStyle(5)}>+5</button>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {c.ac != null && <span style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-dim)' }}>AC {c.ac}</span>}
          {!c.isPc && (
            <>
              <button onClick={() => onSetConcentration(c.id)}
                style={{ padding: '2px 8px', background: c.concentratingOn ? 'var(--dungeon-warning)' : 'transparent', border: `1px solid ${c.concentratingOn ? 'var(--dungeon-warning)' : 'var(--dungeon-border)'}`, color: c.concentratingOn ? '#000' : 'var(--dungeon-text)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}>
                C
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {commonConditions.map(cond => {
          const isActive = c.conditions.includes(cond);
          const hasEffect = getEffectsFromConditions([cond]).length > 0;
          return (
            <button key={cond} onClick={() => onToggleCondition(c.id, cond)}
              style={{
                padding: '2px 8px', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer',
                background: isActive ? 'var(--dungeon-accent, #6366f1)' : 'var(--dungeon-bg, #1a202c)',
                border: `1px solid ${isActive ? 'var(--dungeon-accent)' : 'var(--dungeon-border)'}`,
                color: 'var(--dungeon-text)',
                fontWeight: hasEffect ? 'bold' : 'normal',
              }}>
              {cond}
            </button>
          );
        })}
      </div>

      {/* Damage type tags */}
      {(c.resist?.length || c.immune?.length || c.vuln?.length) ? (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '0.65rem' }}>
          {c.resist?.map((t: string) => <span key={`r-${t}`} style={{ padding: '1px 6px', background: 'rgba(72,187,120,0.15)', color: '#48bb78', borderRadius: '4px' }}>R {t}</span>)}
          {c.immune?.map((t: string) => <span key={`i-${t}`} style={{ padding: '1px 6px', background: 'rgba(160,174,192,0.15)', color: '#a0aec0', borderRadius: '4px' }}>I {t}</span>)}
          {c.vuln?.map((t: string) => <span key={`v-${t}`} style={{ padding: '1px 6px', background: 'rgba(252,129,129,0.15)', color: '#fc8181', borderRadius: '4px' }}>V {t}</span>)}
        </div>
      ) : null}

      {/* Actions */}
      {monsterActions && monsterActions.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {monsterActions.slice(0, 4).map((a, ai) => (
            <button key={ai} onClick={() => setActionRollResult(rollActionSimple(a).rollResult)} style={{ padding: '2px 8px', fontSize: '0.65rem', background: 'var(--dungeon-accent, #6366f1)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
              {a.name}
            </button>
          ))}
          {monsterActions.length > 4 && <span style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.65rem', alignSelf: 'center' }}>+{monsterActions.length - 4}</span>}
        </div>
      )}
      {actionRollResult && (
        <div style={{ marginTop: '6px', padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--dungeon-text, #e2e8f0)', fontFamily: 'monospace' }}>
          {actionRollResult}
        </div>
      )}
    </div>
  );
}

function hpBtnStyle(delta: number) {
  const isDamage = delta < 0;
  return {
    padding: '4px 10px',
    fontSize: '0.7rem',
    fontWeight: 'bold' as const,
    borderRadius: 'var(--dungeon-radius-sm, 4px)',
    border: 'none',
    cursor: 'pointer',
    background: isDamage ? 'var(--dungeon-danger, #e53e3e)' : 'var(--dungeon-success, #48bb78)',
    color: 'white',
    opacity: 0.85,
  };
}

export default function CombatTracker() {
  const [allMonsters, setAllMonsters] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [initiativeList, setInitiativeList] = useState<Combatant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [filter, setFilter] = useState('A');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonster, setSelectedMonster] = useState<any | null>(null);
  const [conditionsList, setConditionsList] = useState<any[]>([]);
  const [rollMode, setRollMode] = useState<'auto' | 'manual'>('auto');
  const [lastRoll, setLastRoll] = useState<string | null>(null);
  const [damageInput, setDamageInput] = useState({ amount: 10, type: 'fire', targetId: 0 });
  const [damageResult, setDamageResult] = useState<string | null>(null);
  const [showPcForm, setShowPcForm] = useState(false);
  const [showHp, setShowHp] = useState(true);
  const [pcForm, setPcForm] = useState({ name: '', ac: 10, hp: 10, init: 10 });
  const [partySize, setPartySize] = useState(4);
  const [avgLevel, setAvgLevel] = useState(5);
  const [xpAward, setXpAward] = useState<{ total: number; perPlayer: number } | null>(null);
  const [concSavePrompt, setConcSavePrompt] = useState<{ combatantId: number; dc: number; damage: number } | null>(null);
  const [showBrowser, setShowBrowser] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      const data = await DataEngine.loadLocalJson('data/bestiary/bestiary-mm.json');
      if (data && data.monster) setAllMonsters(data.monster);
    };
    loadAll();
    DataEngine.getConditions().then(setConditionsList);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pending = sessionStorage.getItem('pendingEncounter');
    if (pending) {
      try {
        const enc = JSON.parse(pending);
        setRollMode(enc.initiativeMode || 'auto');
        if (enc.combatants?.length) setInitiativeList(enc.combatants);
        sessionStorage.removeItem('pendingEncounter');
      } catch { /* ignore */ }
    }
    const pendingPcs = sessionStorage.getItem('pendingPcCombatants');
    if (pendingPcs) {
      try {
        const pcs: Combatant[] = JSON.parse(pendingPcs);
        setInitiativeList((prev) => [...prev, ...pcs].sort((a, b) => b.initiative - a.initiative));
        sessionStorage.removeItem('pendingPcCombatants');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const filtered = allMonsters.filter((m) => {
      const name = m.name.toUpperCase();
      return (filter === 'All' || name.startsWith(filter)) && m.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setSearchResults(filtered);
  }, [filter, searchTerm, allMonsters]);

  const addToInitiative = (monster: any, manualInit?: number) => {
    const dexMod = Math.floor(((monster.dex || 10) - 10) / 2);
    const initiative = manualInit !== undefined ? manualInit : rollMode === 'auto' ? rollD20(dexMod, `${monster.name} initiative`, 'combat').total : 10 + dexMod;
    const dmgTypes = parseMonsterDamageTypes(monster);
    const monsterAc = Array.isArray(monster.ac) ? (typeof monster.ac[0] === 'number' ? monster.ac[0] : monster.ac[0]?.ac ?? 10) : (monster.ac ?? 10);
    const newCombatant = {
      id: Date.now(),
      name: monster.name,
      initiative,
      currentHp: monster.hp?.average || 10,
      maxHp: monster.hp?.average || 10,
      ac: monsterAc,
      conditions: [],
      concentratingOn: null,
      cr: monster.cr,
      ...dmgTypes,
    } as Combatant;

    setInitiativeList((prev) => {
      const existing = prev.find(c => !c.isPc && c.name === monster.name && c.currentHp > 0);
      if (existing && monster.hp?.average) {
        return prev.map(c => c.id === existing.id ? { ...c, currentHp: c.currentHp + monster.hp.average, maxHp: c.maxHp! + monster.hp.average, count: (c.count || 1) + 1 } : c).sort((a, b) => b.initiative - a.initiative);
      }
      return [...prev, { ...newCombatant, count: 1 }].sort((a, b) => b.initiative - a.initiative);
    });
  };

  const adjustHp = (id: number, delta: number) => {
    setInitiativeList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newHp = Math.max(0, c.currentHp + delta);
        if (delta < 0 && c.concentratingOn && newHp > 0) {
          const dc = concentrationSaveDC(Math.abs(delta));
          setConcSavePrompt({ combatantId: id, dc, damage: Math.abs(delta) });
        }
        return { ...c, currentHp: newHp };
      })
    );
  };

  const toggleCondition = (id: number, conditionName: string) => {
    setInitiativeList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const has = c.conditions.includes(conditionName);
        return { ...c, conditions: has ? c.conditions.filter((x) => x !== conditionName) : [...c.conditions, conditionName] };
      })
    );
  };

  const getDisplaySpeed = (c: Combatant) => {
    const effects = getEffectsFromConditions(c.conditions);
    const mods = getCombinedModifiers(effects);
    if (mods.speed === 0) {
      const condName = c.conditions.find(x => getEffectsFromConditions([x]).some(e => e.modifiers.speed === 0));
      return condName ? `0 (${condName})` : '0';
    }
    const speed = c.speed as { walk?: number } | undefined;
    let baseSpeed = 30;
    if (speed && typeof speed === 'object' && 'walk' in speed && speed.walk) baseSpeed = speed.walk;
    else if (typeof c.speed === 'number') baseSpeed = c.speed;
    else if (typeof c.speed === 'string') { const parsed = parseInt(c.speed); if (!isNaN(parsed)) baseSpeed = parsed; }
    const effective = computeEffectiveSpeed(baseSpeed, effects);
    if (effective !== baseSpeed) return `${effective} ft. (was ${baseSpeed})`;
    return `${baseSpeed} ft.`;
  };

  const rollAction = (action: { name: string; entries?: unknown[] }) => {
    const text = JSON.stringify(action.entries || []);
    const dmgMatch = text.match(/(\d+d\d+(?:\s*\+\s*\d+)?)/i);
    if (dmgMatch) {
      const result = rollDice(dmgMatch[1].replace(/\s/g, ''), action.name, 'combat-action');
      setLastRoll(`${action.name}: [${result.rolls.join(', ')}]${result.modifier ? ` + ${result.modifier}` : ''} = ${result.total}`);
    } else {
      const atk = rollD20(0, `${action.name} attack`, 'combat-action');
      setLastRoll(`${action.name}: Attack ${atk.total}`);
    }
  };

  const applyTypedDamage = () => {
    const target = initiativeList.find((c) => c.id === damageInput.targetId);
    if (!target) return;
    const { damage, note } = applyDamageModifier(damageInput.amount, damageInput.type, target.resist, target.immune, target.vuln);
    adjustHp(target.id, -damage);
    setDamageResult(`${damageInput.type} damage: ${damage} (${note || 'normal'})`);
  };

  const alphabet = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const saveEncounter = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: 'encounter.json' });
      if (filePath) { await writeTextFile(filePath, JSON.stringify(initiativeList, null, 2)); }
    } catch { /* noop */ }
  };

  const loadEncounter = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (selected && !Array.isArray(selected)) {
        const contents = await readTextFile(selected); const parsed = JSON.parse(contents); if (Array.isArray(parsed)) { setInitiativeList(parsed); setTurnIndex(0); }
      }
    } catch { /* noop */ }
  };

  const addPc = () => {
    if (!pcForm.name.trim()) return;
    const id = Date.now();
    setInitiativeList((prev) => [...prev, { id, name: pcForm.name, initiative: pcForm.init, currentHp: pcForm.hp, maxHp: pcForm.hp, ac: pcForm.ac, conditions: [], concentratingOn: null, isPc: true } as unknown as Combatant].sort((a, b) => b.initiative - a.initiative));
    setPcForm({ name: '', ac: 10, hp: 10, init: 10 });
    setShowPcForm(false);
  };

  const removeCombatant = (id: number) => setInitiativeList((prev) => prev.filter((c) => c.id !== id));

  const nextTurn = () => setTurnIndex((prev) => (prev + 1) % (initiativeList.length || 1));

  const monsterXp = initiativeList.filter(c => !c.isPc && c.currentHp > 0).reduce((sum, c) => sum + getCrXp(c.cr), 0);
  const diff = estimateDifficulty(monsterXp, partySize, avgLevel);
  const diffColors: Record<string, string> = { Easy: '#48bb78', Medium: '#ecc94b', Hard: '#ed8936', Deadly: '#e53e3e' };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--dungeon-bg, #1a202c)', color: 'var(--dungeon-text, #e2e8f0)', gap: 0, overflow: 'hidden' }}>
      {/* Mobile browser toggle */}
      <div style={{ position: 'fixed', bottom: '16px', left: '16px', zIndex: 50 }}>
        <button onClick={() => setShowBrowser(!showBrowser)}
          style={{ padding: '10px 16px', background: 'var(--dungeon-accent, #6366f1)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
          {showBrowser ? '✕ Browser' : '☰ Browser'}
        </button>
      </div>

      {/* Monster Browser Panel */}
      <div style={{
        width: showBrowser ? '320px' : '0px',
        minWidth: showBrowser ? '320px' : '0px',
        overflow: 'hidden',
        transition: 'width 0.25s, min-width 0.25s',
        background: 'var(--dungeon-surface, #2d3748)',
        borderRight: showBrowser ? '1px solid var(--dungeon-border)' : 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif' }}>Monster Browser</h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setRollMode('auto')} style={{ padding: '3px 8px', fontSize: '0.65rem', background: rollMode === 'auto' ? 'var(--dungeon-accent)' : 'transparent', border: `1px solid ${rollMode === 'auto' ? 'var(--dungeon-accent)' : 'var(--dungeon-border)'}`, color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Auto</button>
              <button onClick={() => setRollMode('manual')} style={{ padding: '3px 8px', fontSize: '0.65rem', background: rollMode === 'manual' ? 'var(--dungeon-accent)' : 'transparent', border: `1px solid ${rollMode === 'manual' ? 'var(--dungeon-accent)' : 'var(--dungeon-border)'}`, color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Manual</button>
            </div>
          </div>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search monsters..."
            style={{ width: '100%', padding: '8px 10px', background: 'var(--dungeon-bg, #1a202c)', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '8px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '4px' }}>
            {alphabet.map(letter => (
              <button key={letter} onClick={() => setFilter(letter)}
                style={{ padding: '3px 5px', fontSize: '0.6rem', background: filter === letter ? 'var(--dungeon-accent)' : 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '3px', cursor: 'pointer', flex: letter === 'All' ? '0 0 100%' : '0 0 auto', textAlign: 'center', marginBottom: letter === 'All' ? '4px' : 0 }}>
                {letter}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {searchResults.length === 0 && <p style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No monsters found.</p>}
          {searchResults.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--dungeon-bg)', marginBottom: '4px', borderRadius: '6px', border: '1px solid var(--dungeon-border)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--dungeon-text-dim)' }}>CR {getCrNumber(m.cr)} · {m.hp?.average || '?'} HP</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setSelectedMonster(m)} style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                <button onClick={() => addToInitiative(m)} style={{ padding: '4px 10px', fontSize: '0.65rem', background: 'var(--dungeon-success, #48bb78)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main initiative area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Encounter header bar */}
        <div style={{ padding: '12px 20px', background: 'var(--dungeon-surface, #2d3748)', borderBottom: '1px solid var(--dungeon-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '1.3rem', color: 'var(--dungeon-gold, #b8860b)' }}>Combat</h1>
              {initiativeList.length > 0 && (
                <>
                  <span style={{ color: 'var(--dungeon-text-dim)', fontSize: '0.8rem' }}>
                    {initiativeList.length} combatants · Turn {turnIndex + 1}
                  </span>
                  <span style={{ color: diffColors[diff] || 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>{monsterXp > 0 ? `${diff} (${monsterXp} XP)` : ''}</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--dungeon-text-dim)' }}>Party:</label>
              <input type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '40px', padding: '3px 6px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }} />
              <label style={{ fontSize: '0.7rem', color: 'var(--dungeon-text-dim)' }}>Lvl:</label>
              <input type="number" min={1} max={20} value={avgLevel} onChange={e => setAvgLevel(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '36px', padding: '3px 6px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }} />
              <div style={{ width: '1px', height: '20px', background: 'var(--dungeon-border)' }} />
              <button onClick={() => setShowPcForm(true)} style={{ padding: '6px 12px', background: 'var(--dungeon-accent, #6366f1)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>+PC</button>
              <button onClick={() => setShowHp((v) => !v)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--dungeon-border)', color: showHp ? 'white' : 'var(--dungeon-text-dim)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>{showHp ? 'HP' : '??'}</button>
              <button onClick={nextTurn} style={{ padding: '6px 16px', background: 'var(--dungeon-gold, #b8860b)', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Next Turn →</button>
              <button onClick={saveEncounter} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Save</button>
              <button onClick={loadEncounter} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Load</button>
            </div>
          </div>

          {/* Last roll */}
          {lastRoll && (
            <div style={{ marginTop: '8px', padding: '6px 12px', background: 'var(--dungeon-accent)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{lastRoll}</span>
              <button onClick={() => setLastRoll(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
            </div>
          )}

          {/* Damage Calculator */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-dim)' }}>Damage:</span>
            <input type="number" value={damageInput.amount} onChange={(e) => setDamageInput({ ...damageInput, amount: Number(e.target.value) })} style={{ width: '60px', padding: '4px 6px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }} />
            <input value={damageInput.type} onChange={(e) => setDamageInput({ ...damageInput, type: e.target.value })} style={{ width: '80px', padding: '4px 6px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }} placeholder="fire" />
            <select value={damageInput.targetId} onChange={(e) => setDamageInput({ ...damageInput, targetId: Number(e.target.value) })} style={{ padding: '4px 6px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>
              {initiativeList.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button onClick={applyTypedDamage} style={{ padding: '4px 12px', background: 'var(--dungeon-danger)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Apply</button>
            <button onClick={() => {
              const deadXp = initiativeList.filter(c => !c.isPc && c.currentHp <= 0).reduce((sum, c) => sum + getCrXp(c.cr), 0);
              setXpAward(deadXp > 0 ? { total: deadXp, perPlayer: Math.round(deadXp / Math.max(1, partySize)) } : null);
            }} style={{ padding: '4px 12px', background: 'var(--dungeon-warning, #ecc94b)', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>XP Award</button>
            {damageResult && <span style={{ color: 'var(--dungeon-warning)', fontSize: '0.75rem' }}>{damageResult}</span>}
          </div>

          {xpAward && (
            <div style={{ marginTop: '6px', padding: '6px 12px', background: 'var(--dungeon-bg)', borderRadius: '6px', color: 'var(--dungeon-warning)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Defeated: <strong>{xpAward.total} XP</strong> ({xpAward.perPlayer} per player)</span>
              <button onClick={() => setXpAward(null)} style={{ background: 'none', border: 'none', color: 'var(--dungeon-text-dim)', cursor: 'pointer' }}>×</button>
            </div>
          )}
        </div>

        {/* Initiative list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {initiativeList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dungeon-text-dim)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No combatants yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Add monsters from the browser or use +PC to add party members.</p>
            </div>
          )}
          {initiativeList.map((c, i) => (
            <CombatantCard key={c.id} c={c} isActive={i === turnIndex} onAdjustHp={adjustHp} onToggleCondition={toggleCondition} onRemove={removeCombatant} onSetConcentration={(id) => setInitiativeList(prev => prev.map(x => x.id === id ? { ...x, concentratingOn: x.concentratingOn ? null : 'Spell' } : x))} setSelectedMonster={setSelectedMonster} showHp={showHp} rollActionSimple={rollActionSimple} />
          ))}
        </div>
      </div>

      {/* PC Form Modal */}
      {showPcForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--dungeon-surface, #2d3748)', color: 'var(--dungeon-text)', padding: '24px', borderRadius: 'var(--dungeon-radius-md)', width: '340px', border: '2px solid var(--dungeon-gold)' }}>
            <h2 style={{ color: 'var(--dungeon-gold)', marginBottom: '16px', fontFamily: 'serif' }}>Add Party Member</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Name" value={pcForm.name} onChange={(e) => setPcForm({ ...pcForm, name: e.target.value })} style={{ padding: '8px 10px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: 'var(--dungeon-text-dim)' }}>AC
                  <input type="number" value={pcForm.ac} onChange={(e) => setPcForm({ ...pcForm, ac: Number(e.target.value) })} style={{ padding: '6px 8px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '2px' }} />
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: 'var(--dungeon-text-dim)' }}>HP
                  <input type="number" value={pcForm.hp} onChange={(e) => setPcForm({ ...pcForm, hp: Number(e.target.value) })} style={{ padding: '6px 8px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '2px' }} />
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: 'var(--dungeon-text-dim)' }}>Init
                  <input type="number" value={pcForm.init} onChange={(e) => setPcForm({ ...pcForm, init: Number(e.target.value) })} style={{ padding: '6px 8px', background: 'var(--dungeon-bg)', border: '1px solid var(--dungeon-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '2px' }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={addPc} style={{ flex: 1, padding: '10px', background: 'var(--dungeon-success)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
                <button onClick={() => setShowPcForm(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text-dim)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Concentration Prompt */}
      {concSavePrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--dungeon-surface)', padding: '24px', borderRadius: 'var(--dungeon-radius-md)', width: '360px', border: '2px solid var(--dungeon-warning)' }}>
            <h3 style={{ color: 'var(--dungeon-warning)', margin: '0 0 8px' }}>Concentration Check</h3>
            {(() => {
              const target = initiativeList.find(c => c.id === concSavePrompt.combatantId);
              return (
                <>
                  <p style={{ fontSize: '0.9rem' }}>{target?.name || 'Unknown'} took <strong>{concSavePrompt.damage}</strong> damage while concentrating on <strong>{target?.concentratingOn || 'a spell'}</strong>.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--dungeon-text-dim)' }}>Constitution save DC {concSavePrompt.dc}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={() => {
                      const result = rollD20WithAdvantage('normal', 0, 'Concentration save', 'concentration');
                      const success = result.total >= concSavePrompt.dc;
                      setLastRoll(`Concentration DC ${concSavePrompt.dc}: rolled ${result.total} — ${success ? 'Maintained' : 'Lost!'}`);
                      if (!success) setInitiativeList(prev => prev.map(c => c.id === concSavePrompt.combatantId ? { ...c, concentratingOn: null } : c));
                      setConcSavePrompt(null);
                    }} style={{ flex: 1, padding: '10px', background: 'var(--dungeon-accent)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Auto-Roll</button>
                    <button onClick={() => { setLastRoll(`Concentration lost`); setInitiativeList(prev => prev.map(c => c.id === concSavePrompt.combatantId ? { ...c, concentratingOn: null } : c)); setConcSavePrompt(null); }}
                      style={{ padding: '10px', background: 'var(--dungeon-danger)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Lost</button>
                    <button onClick={() => { setLastRoll(`Concentration held`); setConcSavePrompt(null); }}
                      style={{ padding: '10px', background: 'transparent', border: '1px solid var(--dungeon-border)', color: 'var(--dungeon-text)', borderRadius: '4px', cursor: 'pointer' }}>Held</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Monster Detail Modal */}
      {selectedMonster && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--dungeon-surface)', color: 'var(--dungeon-text)', padding: '24px', borderRadius: 'var(--dungeon-radius-md)', width: '500px', maxHeight: '80vh', overflowY: 'auto', border: '2px solid var(--dungeon-gold)' }}>
            <h2 style={{ color: 'var(--dungeon-gold)', marginBottom: '4px' }}>{selectedMonster.name}</h2>
            <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--dungeon-text-dim)', marginBottom: '12px' }}>
              {selectedMonster.size?.[0] || ''} {(() => { const t = selectedMonster.type; return typeof t === 'string' ? t : t?.type || ''; })()}
              {(() => { const a = selectedMonster.alignment; if (!a) return ''; return `, ${Array.isArray(a) ? a.join(', ') : a}`; })()}
            </p>
            <div style={{ border: '1px solid var(--dungeon-gold)', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ margin: '2px 0' }}><strong>AC:</strong> {(() => { const ac = selectedMonster.ac; if (!ac || !ac[0]) return '—'; const first = ac[0]; const val = typeof first === 'number' ? first : (first.ac ?? first.value); if (val === undefined) return '—'; return first.from ? `${val} (${first.from.join(', ')})` : `${val}`; })()}</p>
              <p style={{ margin: '2px 0' }}><strong>HP:</strong> {selectedMonster.hp?.average || '—'}{selectedMonster.hp?.formula ? ` (${selectedMonster.hp.formula})` : ''}</p>
              <p style={{ margin: '2px 0' }}><strong>Speed:</strong> {(() => { const s = selectedMonster.speed; if (!s) return '—'; if (typeof s === 'string') return s; if (typeof s === 'object') return Object.entries(s).map(([k, v]) => `${k} ${v}`).join(', '); return '—'; })()}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '12px', textAlign: 'center' }}>
              {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((abbr) => {
                const key = abbr.toLowerCase().slice(0, 3);
                const val = selectedMonster[key];
                const mod = val != null ? Math.floor((val - 10) / 2) : null;
                return (<div key={abbr} style={{ background: 'var(--dungeon-bg)', padding: '6px 2px', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: 'var(--dungeon-gold)' }}>{abbr}</div>
                  <div style={{ fontSize: '1rem' }}>{val ?? '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dungeon-text-dim)' }}>{mod != null ? `${mod >= 0 ? '+' : ''}${mod}` : '—'}</div>
                </div>);
              })}
            </div>
            {(() => { const s = selectedMonster.save; if (!s || !Object.keys(s).length) return null; return <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Saving Throws:</strong> {Object.entries(s).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')}</p>; })()}
            {(() => { const s = selectedMonster.skill; if (!s || !Object.keys(s).length) return null; return <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>Skills:</strong> {Object.entries(s).map(([k, v]) => `${k} ${v}`).join(', ')}</p>; })()}
            {(() => { const parts: string[] = []; if (selectedMonster.resist?.length) parts.push(`Resistances: ${selectedMonster.resist.join(', ')}`); if (selectedMonster.immune?.length) parts.push(`Immunities: ${selectedMonster.immune.join(', ')}`); if (selectedMonster.vuln?.length) parts.push(`Vulnerabilities: ${selectedMonster.vuln.join(', ')}`); if (selectedMonster.conditionImmune?.length) parts.push(`Condition Immunities: ${selectedMonster.conditionImmune.join(', ')}`); if (!parts.length) return null; return parts.map((p, i) => <p key={i} style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{p.split(': ')[0]}:</strong> {p.split(': ')[1]}</p>); })()}
            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>CR:</strong> {typeof selectedMonster.cr === 'string' ? selectedMonster.cr : selectedMonster.cr?.cr || selectedMonster.cr || '—'}</p>
            <hr style={{ borderColor: 'var(--dungeon-border)' }} />
            {selectedMonster.trait?.map((t: { name: string; entries?: unknown[] }, i: number) => (<div key={`trait-${i}`} style={{ margin: '10px 0' }}><strong style={{ color: 'var(--dungeon-gold)' }}>{cleanString(t.name)}.</strong><div style={{ fontSize: '0.85rem', marginTop: '2px' }}>{formatEntries(t.entries)}</div></div>))}
            {selectedMonster.action?.map((a: { name: string; entries?: unknown[] }, i: number) => (<div key={`action-${i}`} style={{ margin: '10px 0' }}><button onClick={() => rollAction(a)} style={{ marginRight: '10px', padding: '4px 10px', background: 'var(--dungeon-accent)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', float: 'right' }}>Roll</button><strong style={{ color: 'var(--dungeon-gold)' }}>{cleanString(a.name)}.</strong><div style={{ fontSize: '0.85rem', marginTop: '2px' }}>{formatEntries(a.entries)}</div></div>))}
            <button onClick={() => setSelectedMonster(null)} style={{ marginTop: '20px', padding: '10px', width: '100%', background: 'var(--dungeon-gold)', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
