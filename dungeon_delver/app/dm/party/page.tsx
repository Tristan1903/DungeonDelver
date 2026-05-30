'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PartyFile } from '../../../lib/campaign';
import { Character } from '../../../lib/character';
import { getLiveStats } from '../../../utils/characterEngine';
import { rollD20WithAdvantage, type AdvantageMode } from '../../../utils/rollEngine';
import { campaignKey } from '../../../utils/campaignStorage';

type LoadedChar = {
  path: string;
  data: Character;
  live: ReturnType<typeof getLiveStats>;
};

type InitiativeRoll = {
  value: number;
  rolled: boolean;
};

const LOCAL_PARTY_KEY = 'dm-party';
function sk() { return campaignKey(LOCAL_PARTY_KEY); }

function loadPartyFromLocal(): PartyFile | null {
  try {
    const raw = localStorage.getItem(sk());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePartyToLocal(party: PartyFile) {
  try { localStorage.setItem(sk(), JSON.stringify(party)); } catch { }
}

export default function PartyPage() {
  const router = useRouter();
  const [party, setParty] = useState<PartyFile>({
    name: 'New Party',
    characterPaths: [],
    enabledModules: [],
    createdAt: new Date().toISOString(),
  });
  const [loadedChars, setLoadedChars] = useState<LoadedChar[]>([]);
  const [initMode, setInitMode] = useState<'auto' | 'manual'>('auto');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [initRolls, setInitRolls] = useState<Record<string, InitiativeRoll>>({});
  const [manualInits, setManualInits] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [rolledAll, setRolledAll] = useState(false);

  // Load all character data when characterPaths change
  useEffect(() => {
    const loadAll = async () => {
      const results: LoadedChar[] = [];
      for (const path of party.characterPaths) {
        try {
          let char: Character;
          // Try localStorage-based key first, then Tauri file read
          const localRaw = localStorage.getItem(path);
          if (localRaw) {
            char = JSON.parse(localRaw);
          } else {
            // Tauri fallback
            const { readTextFile } = await import('@tauri-apps/plugin-fs');
            const content = await readTextFile(path);
            char = JSON.parse(content);
          }
          const live = getLiveStats(char);
          results.push({ path, data: char, live });
        } catch (e) {
          console.error(`Failed to load ${path}:`, e);
        }
      }
      setLoadedChars(results);
    };
    loadAll();
  }, [party.characterPaths]);

  const addCharacter = async () => {
    // Try Tauri first, fall back to prompt for web
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (selected && !Array.isArray(selected)) {
        setParty((p) => ({ ...p, characterPaths: [...p.characterPaths, selected] }));
      }
    } catch {
      // Web fallback: prompt for a localStorage key
      const key = prompt('Enter the localStorage key of the character (dd-char-<uuid> or dd-char-<name>):');
      if (key) {
        const raw = localStorage.getItem(key);
        if (raw) {
          setParty((p) => ({ ...p, characterPaths: [...p.characterPaths, key] }));
        } else {
          alert('Character not found in browser storage. Make sure the character exists.');
        }
      }
    }
  };

  const removeChar = (path: string) => {
    setParty((prev) => ({
      ...prev,
      characterPaths: prev.characterPaths.filter((p) => p !== path),
    }));
  };

  const rollInit = (charPath: string, mode: AdvantageMode = 'normal') => {
    const lc = loadedChars.find((c) => c.path === charPath);
    if (!lc) return;
    const mod = lc.live.modifiers.dex;
    const result = rollD20WithAdvantage(mode, mod, `Initiative (${lc.data.name})`);
    setInitRolls((prev) => ({ ...prev, [charPath]: { value: result.total, rolled: true } }));
    setRolledAll(false);
  };

  const rollAllInit = () => {
    for (const lc of loadedChars) {
      rollInit(lc.path, 'normal');
    }
    setRolledAll(true);
    setStatusMsg('All initiatives rolled!');
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const toggleSelected = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const pushToCombat = (paths: string[]) => {
    const combatants = paths.map((path) => {
      const lc = loadedChars.find((c) => c.path === path);
      if (!lc) return null;
      const initRoll = initRolls[path];
      const initiative = initRoll?.rolled ? initRoll.value : 10 + lc.live.modifiers.dex;
      return {
        id: Date.now() + Math.random(),
        name: lc.data.name,
        initiative,
        currentHp: lc.data.hp.current,
        maxHp: lc.data.hp.max,
        ac: lc.live.ac,
        conditions: [] as string[],
        concentratingOn: lc.data.concentratingOn || null,
        isPc: true,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);

    // Merge with existing sessionStorage, dedup by name
    const existing = sessionStorage.getItem('pendingPcCombatants');
    const existingList = existing ? JSON.parse(existing) : [];
    const existingNames = new Set(existingList.map((c: any) => c.name));
    const uniqueNew = combatants.filter((c) => !existingNames.has(c.name));
    sessionStorage.setItem('pendingPcCombatants', JSON.stringify([...existingList, ...uniqueNew]));
    router.push('/combat');
  };

  const savePartyFile = async () => {
    savePartyToLocal(party);
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: `${party.name}.party.json` });
      if (path) {
        await writeTextFile(path, JSON.stringify(party, null, 2));
      }
    } catch {
      // Web: already saved to localStorage
    }
    setStatusMsg('Party saved!');
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const loadPartyFile = async () => {
    try {
      // Tauri first
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (selected && !Array.isArray(selected)) {
        const content = await readTextFile(selected);
        setParty(JSON.parse(content));
        return;
      }
    } catch {
      // Web fallback: try localStorage
    }
    const local = loadPartyFromLocal();
    if (local) {
      setParty(local);
      setStatusMsg('Loaded from browser storage');
      setTimeout(() => setStatusMsg(null), 2000);
    }
  };

  const selectedCount = selectedPaths.size;

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <Link href="/dm" style={{ color: '#a0aec0' }}>← DM Hub</Link>
      <h1 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif' }}>Party Management</h1>

      {/* Header controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input value={party.name} onChange={(e) => setParty({ ...party, name: e.target.value })}
          style={{ padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', width: '260px' }} />
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={savePartyFile} style={{ padding: '8px 16px', background: '#b8860b', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Save</button>
        <button onClick={loadPartyFile} style={{ padding: '8px 16px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Load</button>
        <button onClick={addCharacter} style={{ padding: '8px 16px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Add Character</button>
        {statusMsg && <span style={{ color: '#48bb78', fontSize: '0.85rem', padding: '8px 0' }}>{statusMsg}</span>}
      </div>

      {/* Initiative mode toggle */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Initiative:</span>
        <button onClick={() => setInitMode('auto')}
          style={{ padding: '4px 14px', borderRadius: '4px', border: 'none', background: initMode === 'auto' ? '#6366f1' : '#4a5568', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Auto</button>
        <button onClick={() => setInitMode('manual')}
          style={{ padding: '4px 14px', borderRadius: '4px', border: 'none', background: initMode === 'manual' ? '#6366f1' : '#4a5568', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Manual</button>
      </div>

      {/* Push buttons */}
      {loadedChars.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => pushToCombat([...loadedChars.map((c) => c.path)])}
            style={{ padding: '8px 20px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Push All to Combat
          </button>
          <button onClick={() => pushToCombat([...selectedPaths])} disabled={selectedCount === 0}
            style={{ padding: '8px 20px', background: selectedCount === 0 ? '#4a5568' : '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: selectedCount === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem', opacity: selectedCount === 0 ? 0.5 : 1 }}>
            Push Selected ({selectedCount})
          </button>
          <button onClick={rollAllInit}
            style={{ padding: '8px 20px', background: '#ecc94b', border: 'none', color: 'black', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Roll All Initiative
          </button>
        </div>
      )}

      {/* Character lobby */}
      {loadedChars.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096', background: '#1a202c', borderRadius: '8px', border: '1px dashed #4a5568' }}>
          <p>No characters loaded. Add a character file to get started.</p>
          <p style={{ fontSize: '0.8rem' }}>Works with browser-stored characters (dd-char-*) or .json files on desktop.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loadedChars.map((lc) => {
          const isSelected = selectedPaths.has(lc.path);
          const initRoll = initRolls[lc.path];
          const initMod = lc.live.modifiers.dex;
          const initTotal = initRoll?.rolled ? initRoll.value : 10 + initMod;

          return (
            <div key={lc.path} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', background: '#1a202c', borderRadius: '10px',
              border: `2px solid ${isSelected ? '#48bb78' : '#2d3748'}`,
              transition: 'border-color 0.15s',
            }}>
              {/* Checkbox */}
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(lc.path)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#48bb78' }} />

              {/* Character info */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f6e05e', fontSize: '0.95rem' }}>{lc.data.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                    {lc.data.class || lc.data.classes?.join('/')} · Level {lc.data.totalLevel || lc.data.level || 1}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#cbd5e0' }}>
                  <span>AC <strong style={{ color: 'white' }}>{lc.live.ac}</strong></span>
                  <span>HP <strong style={{ color: '#48bb78' }}>{lc.data.hp.current}</strong> / <strong style={{ color: 'white' }}>{lc.data.hp.max}</strong></span>
                  <span>Init <strong style={{ color: '#ecc94b' }}>{initMod >= 0 ? `+${initMod}` : initMod}</strong></span>
                  {initRoll?.rolled && (
                    <span>Roll <strong style={{ color: '#ecc94b', fontSize: '1rem' }}>{initTotal}</strong></span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {initMode === 'manual' ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input type="number" value={manualInits[lc.path] ?? ''} onChange={(e) => {
                      setManualInits((prev) => ({ ...prev, [lc.path]: e.target.value }));
                    }} placeholder="Init"
                      style={{ width: '50px', padding: '4px 6px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center' }} />
                    <button onClick={() => {
                      const val = parseInt(manualInits[lc.path] || '');
                      if (!isNaN(val)) {
                        setInitRolls((prev) => ({ ...prev, [lc.path]: { value: val, rolled: true } }));
                        setRolledAll(false);
                      }
                    }}
                      style={{ padding: '4px 8px', background: '#ecc94b', border: 'none', color: 'black', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Set</button>
                  </div>
                ) : (
                  <button onClick={() => rollInit(lc.path)}
                    style={{ padding: '4px 12px', background: initRoll?.rolled ? '#9758e6' : '#ecc94b', border: 'none', color: initRoll?.rolled ? 'white' : 'black', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {initRoll?.rolled ? `Rolled ${initTotal}` : 'Roll d20'}
                  </button>
                )}
                <button onClick={() => pushToCombat([lc.path])}
                  style={{ padding: '4px 12px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  Push
                </button>
                <button onClick={() => removeChar(lc.path)}
                  style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #e53e3e', color: '#fc8181', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend for non-loaded paths */}
      {party.characterPaths.length > loadedChars.length && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#2d3748', borderRadius: '8px', fontSize: '0.8rem', color: '#718096' }}>
          {party.characterPaths.length - loadedChars.length} character(s) could not be loaded. Remove and re-add them.
        </div>
      )}
    </div>
  );
}
