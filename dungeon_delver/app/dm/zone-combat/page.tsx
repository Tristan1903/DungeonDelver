'use client';
import { useState, useEffect } from 'react';
import {
  Zone, ZoneCombatant,
  ZONE_PRESETS, loadPendingCombatants, clearPendingEncounter,
} from '../../../utils/zoneCombatEngine';
import { loadGmOverlay, onGmOverlayChange, GmOverlayState } from '../../../utils/gmOverlayEngine';
import { rollD20 as rollD20Engine } from '../../../utils/rollEngine';

type ZoneLayoutKey = 'melee-near-far' | 'close-distant' | 'front-back' | 'siege';

const LAYOUT_NAMES: Record<ZoneLayoutKey, string> = {
  'melee-near-far': 'Melee / Near / Far',
  'close-distant': 'Close / Distant',
  'front-back': 'Front / Middle / Back',
  'siege': 'Siege (Walls / Courtyard / Gate / Outside)',
};

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '1200px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' } as const,
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
};

function rollD20(mod: number): { total: number; rolls: number[] } {
  const result = rollD20Engine(mod, 'zone combat', 'zone');
  return { total: result.total, rolls: result.rolls };
}

export default function ZoneCombatPage() {
  const [layoutKey, setLayoutKey] = useState<ZoneLayoutKey>('melee-near-far');
  const [zones, setZones] = useState<Zone[]>(ZONE_PRESETS['melee-near-far']);
  const [combatants, setCombatants] = useState<ZoneCombatant[]>([]);
  const [turnOrder, setTurnOrder] = useState<ZoneCombatant[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [initRolls, setInitRolls] = useState<Record<string, number>>({});
  const [log, setLog] = useState<string[]>([]);
  const [gmOverlay, setGmOverlay] = useState<GmOverlayState>({ enabled: false, showStats: true, showNotes: true, showHidden: true, notes: '' });

  useEffect(() => {
    setGmOverlay(loadGmOverlay());
    return onGmOverlayChange(setGmOverlay);
  }, []);

  useEffect(() => {
    const { monsters, pcs } = loadPendingCombatants();
    setCombatants([...pcs, ...monsters]);
    clearPendingEncounter();
  }, []);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 50));

  const handleLayoutChange = (key: ZoneLayoutKey) => {
    setLayoutKey(key);
    setZones(ZONE_PRESETS[key]);
  };

  const moveToZone = (combatantId: string, zoneId: string) => {
    setCombatants(prev => prev.map(c =>
      c.id === combatantId ? { ...c, zoneId } : c
    ));
    const c = combatants.find(c => c.id === combatantId);
    const zone = zones.find(z => z.id === zoneId);
    if (c && zone) addLog(`${c.name} moves to ${zone.name}`);
  };

  const handleDamage = (id: string, amount: number) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, hp: Math.max(0, c.hp - amount) } : c
    ));
    const c = combatants.find(c => c.id === id);
    if (c) addLog(`${c.name} takes ${amount} damage (${Math.max(0, c.hp - amount)}/${c.maxHp})`);
  };

  const handleHeal = (id: string, amount: number) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, hp: Math.min(c.maxHp, c.hp + amount) } : c
    ));
    const c = combatants.find(c => c.id === id);
    if (c) addLog(`${c.name} heals ${amount} (${Math.min(c.maxHp, c.hp + amount)}/${c.maxHp})`);
  };

  const handleRollInit = () => {
    const rolls: Record<string, number> = {};
    const order = [...combatants].map(c => {
      const r = rollD20(c.initBonus);
      rolls[c.id] = r.total - c.initBonus;
      return { ...c, _initTotal: r.total };
    }).sort((a, b) => b._initTotal - a._initTotal);
    setInitRolls(rolls);
    setTurnOrder(order);
    setCurrentTurn(0);
    setIsActive(true);
    addLog('=== Combat Started ===');
    addLog(`${order[0]?.name} goes first (${order[0]?._initTotal})`);
  };

  const nextTurn = () => {
    const next = (currentTurn + 1) % turnOrder.length;
    setCurrentTurn(next);
    addLog(`→ ${turnOrder[next]?.name}'s turn`);
  };

  const toggleCondition = (id: string, condition: string) => {
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c;
      const has = c.conditions.includes(condition);
      return {
        ...c,
        conditions: has
          ? c.conditions.filter(cond => cond !== condition)
          : [...c.conditions, condition],
      };
    }));
  };

  const allConditions = [...new Set(combatants.flatMap(c => c.conditions))];
  const zoneCombatants = (zoneId: string) => combatants.filter(c => c.zoneId === zoneId);

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Zone Combat</h1>
      <p style={styles.sub}>Theater-of-the-mind combat with abstract zones.</p>

      {/* Controls bar */}
      <div style={{ ...styles.panel, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={layoutKey} onChange={e => handleLayoutChange(e.target.value as ZoneLayoutKey)}
          style={{ padding: '6px 10px', background: '#1a1714', color: '#e8dcc8', border: '1px solid #3d3528', borderRadius: '4px', fontSize: '0.75rem' }}>
          {Object.entries(LAYOUT_NAMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {!isActive ? (
          <button onClick={handleRollInit}
            style={{ padding: '8px 20px', background: '#c9a84c', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
            Roll Initiative & Start
          </button>
        ) : (
          <>
            <span style={{ fontSize: '0.8rem', color: '#c9a84c', fontWeight: 'bold' }}>
              Turn: {turnOrder[currentTurn]?.name}
            </span>
            <button onClick={nextTurn} style={{ padding: '6px 14px', background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
              Next Turn →
            </button>
          </>
        )}
        {combatants.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: '#5a5248' }}>
            No pending encounter —{' '}
            <a href="/dm/party" style={{ color: '#c9a84c' }}>push from Party Management</a>
          </span>
        )}
      </div>

      {combatants.length > 0 && (
        <>
          {/* Zone grid */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${zones.length}, 1fr)`, gap: '1rem', marginBottom: '1rem' }}>
            {zones.map(zone => {
              const occupants = zoneCombatants(zone.id);
              const dead = occupants.filter(c => c.hp <= 0);
              const alive = occupants.filter(c => c.hp > 0);
              const isTurnsActive = isActive && turnOrder[currentTurn]?.zoneId === zone.id;
              return (
                <div key={zone.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (dragId) { moveToZone(dragId, zone.id); setDragId(null); } }}
                  style={{
                    background: `${zone.color}15`,
                    border: `2px solid ${isTurnsActive ? '#c9a84c' : zone.color}`,
                    borderRadius: '12px', padding: '1rem', minHeight: '250px',
                    transition: 'border-color 0.2s',
                  }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{zone.icon}</span>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: zone.color }}>{zone.name}</div>
                    <div style={{ fontSize: '0.6rem', color: '#5a5248' }}>{zone.description}</div>
                    <div style={{ fontSize: '0.6rem', color: '#5a5248', marginTop: '2px' }}>{occupants.length} combatant{occupants.length !== 1 ? 's' : ''}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {alive.map(c => (
                      <div key={c.id} draggable onDragStart={() => setDragId(c.id)}
                        style={{
                          background: c.isPc ? '#1a1714' : '#0c0e14',
                          borderRadius: '6px', padding: '6px 8px', cursor: 'grab', fontSize: '0.7rem',
                          border: isActive && turnOrder[currentTurn]?.id === c.id ? '2px solid #c9a84c' : '1px solid transparent',
                          transition: 'border 0.15s',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{c.name}</span>
                          <span style={{ fontSize: '0.6rem', color: c.hp <= c.maxHp * 0.25 ? '#a83232' : '#8a7e6a' }}>
                            {c.hp}/{c.maxHp}
                            {gmOverlay.enabled && gmOverlay.showStats && <span style={{ color: '#8a7e6a', marginLeft: '4px' }}>AC {c.ac}</span>}
                            {' '}❤
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {initRolls[c.id] !== undefined && (
                            <span style={{ fontSize: '0.55rem', color: '#c9a84c' }}>Init: {initRolls[c.id]}</span>
                          )}
                          {c.conditions.map(cond => (
                            <span key={cond} style={{ fontSize: '0.5rem', padding: '1px 5px', background: '#a83232', borderRadius: '3px', color: '#e8dcc8' }}>
                              {cond}
                            </span>
                          ))}
                          <select value="" onChange={e => { if (e.target.value) { toggleCondition(c.id, e.target.value); e.target.value = ''; }}}
                            style={{ fontSize: '0.5rem', padding: '1px 4px', background: '#1a1714', color: '#e8dcc8', border: '1px solid #3d3528', borderRadius: '3px' }}>
                            <option value="">+Cond</option>
                            {['Prone', 'Stunned', 'Blinded', 'Charmed', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Restrained', 'Unconscious'].map(cond => (
                              <option key={cond} value={cond}>{cond}</option>
                            ))}
                          </select>
                          <button onClick={() => handleDamage(c.id, 1)} style={{ fontSize: '0.5rem', background: '#a83232', border: 'none', color: '#e8dcc8', borderRadius: '3px', cursor: 'pointer', padding: '1px 6px' }}>−1</button>
                          <button onClick={() => handleDamage(c.id, 5)} style={{ fontSize: '0.5rem', background: '#a83232', border: 'none', color: '#e8dcc8', borderRadius: '3px', cursor: 'pointer', padding: '1px 6px' }}>−5</button>
                          <button onClick={() => handleHeal(c.id, 5)} style={{ fontSize: '0.5rem', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '3px', cursor: 'pointer', padding: '1px 6px' }}>+5</button>
                        </div>
                      </div>
                    ))}
                    {dead.map(c => (
                      <div key={c.id} style={{ opacity: 0.4, background: '#0c0e14', borderRadius: '6px', padding: '4px 8px', fontSize: '0.65rem' }}>
                        <span style={{ textDecoration: 'line-through' }}>{c.name}</span>
                        <span style={{ color: '#5a5248', marginLeft: '6px' }}>0/{c.maxHp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Turn order */}
          {isActive && (
            <div style={styles.panel}>
              <div style={{ fontSize: '0.7rem', color: '#5a5248', fontWeight: 'bold', marginBottom: '6px' }}>INITIATIVE ORDER</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {turnOrder.map((c, i) => (
                  <div key={c.id} style={{
                    padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem',
                    background: i === currentTurn ? '#c9a84c' : '#1a1714',
                    color: i === currentTurn ? 'black' : 'white',
                    fontWeight: i === currentTurn ? 'bold' : 'normal',
                  }}>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Combat log */}
      {log.length > 0 && (
        <div style={{ ...styles.panel, maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', color: '#5a5248', fontWeight: 'bold', marginBottom: '6px' }}>COMBAT LOG</div>
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: '0.65rem', color: '#8a7e6a', padding: '2px 0', borderBottom: '1px solid #1a1714' }}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}
