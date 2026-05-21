'use client';
import { useState, useEffect } from 'react';
import { DataEngine } from '../../utils/dataLoader';
import { formatValue, formatEntries, cleanString } from '../../utils/formatters';
import { useRef } from 'react';
import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';

export default function CombatTracker() {
    const [allMonsters, setAllMonsters] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [initiativeList, setInitiativeList] = useState<any[]>([]);
    const [turnIndex, setTurnIndex] = useState(0);
    const [filter, setFilter] = useState('A');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonster, setSelectedMonster] = useState<any | null>(null);

    useEffect(() => {
        const loadAll = async () => {
            const data = await DataEngine.loadLocalJson('data/bestiary/bestiary-mm.json');
            if (data && data.monster) setAllMonsters(data.monster);
        };
        loadAll();
    }, []);

    useEffect(() => {
        const filtered = allMonsters.filter(m =>
            m.name.toUpperCase().startsWith(filter) &&
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered);
    }, [filter, searchTerm, allMonsters]);

    const addToInitiative = (monster: any) => {
        const dexMod = Math.floor(((monster.dex || 10) - 10) / 2);
        const initiative = Math.floor(Math.random() * 20) + 1 + dexMod;

        setInitiativeList(prev => [...prev, {
            ...monster,
            id: Date.now(),
            initiative,
            currentHp: monster.hp?.average || 10
        }].sort((a, b) => b.initiative - a.initiative));
    };

    const adjustHp = (id: number, delta: number) => {
        setInitiativeList(prev => prev.map(c =>
            c.id === id ? { ...c, currentHp: c.currentHp + delta } : c
        ));
    };

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const saveEncounter = async () => {
        try {
            const data = JSON.stringify(initiativeList);

            // Open the native Save As dialog
            const filePath = await save({
                filters: [{ name: 'JSON', extensions: ['json'] }],
                defaultPath: 'encounter.json'
            });

            if (filePath) {
                await writeTextFile(filePath, data);
                alert("Encounter saved!");
            }
        } catch (err) {
            console.error("Save failed:", err);
        }
    };

    const loadEncounter = async () => {
        const selected = await open({
            multiple: false,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (selected && !Array.isArray(selected)) {
            const contents = await readTextFile(selected);
            setInitiativeList(JSON.parse(contents));
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#1a202c', color: 'white', padding: '20px', gap: '20px' }}>

            {/* LEFT PANE: Search */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h2>Combat Tracker</h2>
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search monster..."
                    style={{ width: '100%', padding: '10px', marginBottom: '10px', color: 'black' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginBottom: '10px' }}>
                    {alphabet.map(letter => (
                        <button key={letter} onClick={() => setFilter(letter)} style={{ padding: '8px 4px', background: filter === letter ? '#6366f1' : '#4a5568', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                            {letter}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', background: '#2d3748', padding: '10px', borderRadius: '4px' }}>
                    {searchResults.map((m, i) => (
                        <div key={i} style={{ background: '#4a5568', padding: '8px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.9rem' }}>{m.name}</span>
                            <div>
                                <button onClick={() => setSelectedMonster(m)} style={{ marginRight: '5px', background: '#718096', border: 'none', color: 'white', padding: '2px 8px', cursor: 'pointer' }}>View</button>
                                <button onClick={() => addToInitiative(m)} style={{ background: '#48bb78', border: 'none', color: 'white', padding: '2px 8px', cursor: 'pointer' }}>Add</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANE: Initiative */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h2>Initiative List</h2>
                    <button onClick={() => setTurnIndex((prev) => (prev + 1) % (initiativeList.length || 1))} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '5px 15px' }}>
                        Next Turn
                    </button>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => { saveEncounter(); }}
                            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}
                        >
                            SAVE
                        </button>

                        <input type="file" ref={fileInputRef} onChange={loadEncounter} style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ background: '#4a5568', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}>
                            Load
                        </button>
                    </div>

                </div>

                <div style={{ flex: 1, overflowY: 'auto', background: '#2d3748', padding: '20px', borderRadius: '8px' }}>
                    {initiativeList.map((c, i) => (
                        <div key={c.id} style={{ marginBottom: '10px', background: '#4a5568', padding: '15px', borderRadius: '4px', border: i === turnIndex ? '3px solid #f6e05e' : '1px solid #718096' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>{c.name}</strong> <span>Init: {c.initiative}</span>
                            </div>
                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>HP: {c.currentHp}</span>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => adjustHp(c.id, -5)} style={{ padding: '2px 6px' }}>-5</button>
                                    <button onClick={() => adjustHp(c.id, -1)} style={{ padding: '2px 6px' }}>-1</button>
                                    <button onClick={() => adjustHp(c.id, 1)} style={{ padding: '2px 6px' }}>+1</button>
                                    <button onClick={() => adjustHp(c.id, 5)} style={{ padding: '2px 6px' }}>+5</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* STAT BLOCK MODAL */}
            {selectedMonster && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#1a1a1a', color: '#e0e0e0', padding: '30px', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflowY: 'auto', border: '2px solid #b8860b' }}>
                        <h2>{selectedMonster.name}</h2>
                        <p><strong>AC:</strong> {formatValue(selectedMonster.ac?.[0]?.value)}</p>
                        <p><strong>Speed:</strong> {formatValue(selectedMonster.speed)}</p>
                        <p><strong>HP:</strong> {selectedMonster.hp?.average || "N/A"}</p>
                        <p><strong>STR:</strong> {formatValue(selectedMonster.str)}</p>
                        <p><strong>DEX:</strong> {formatValue(selectedMonster.dex)}</p>
                        <p><strong>CON:</strong> {formatValue(selectedMonster.con)}</p>
                        <p><strong>INT:</strong> {formatValue(selectedMonster.int)}</p>
                        <p><strong>WIS:</strong> {formatValue(selectedMonster.wis)}</p>
                        <p><strong>CHA:</strong> {formatValue(selectedMonster.cha)}</p>
                        <hr />
                        {selectedMonster.trait?.map((t: any, i: number) => (
                            <p key={i}><strong>{t.name}.</strong> {formatEntries(t.entries)}</p>
                        ))}
                        {selectedMonster.action?.map((a: any, i: number) => (
                            <p key={i}>
                                <strong>{cleanString(a.name)}.</strong> {formatEntries(a.entries)}
                            </p>
                        ))}
                        <button onClick={() => setSelectedMonster(null)} style={{ marginTop: '20px', padding: '10px', width: '100%', background: '#b8860b', border: 'none', color: 'white' }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}