'use client';
// ===== 📘 FILE: app/dm/homebrew/page.tsx =====
// 🎯 PURPOSE: Homebrew editor — CRUD for custom items, monsters, and spells stored in localStorage.
//   Tabbed interface with sidebar list + editor panel, plus JSON import/export.
// 🧠 REACT CONCEPT: Tabbed CRUD with Shared Pattern — three entity types (items/monsters/spells)
//   each follow the same list+form pattern via reusable Input/Select/EditorPanel sub-components,
//   demonstrating DRY component composition.
// =====
import { useState, useEffect } from 'react';
import {
  HomebrewItem, HomebrewMonster, HomebrewSpell,
  loadHBItems, saveHBItem, deleteHBItem,
  loadHBMonsters, saveHBMonster, deleteHBMonster,
  loadHBSpells, saveHBSpell, deleteHBSpell,
  exportAllHomebrew, importAllHomebrew,
  RARITIES, ITEM_TYPES, SCHOOLS, MONSTER_TYPES,
} from '../../../utils/homebrewEngine';

type Tab = 'items' | 'monsters' | 'spells';

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '1200px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' } as const,
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const },
  textarea: { width: '100%', minHeight: '80px', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'monospace' },
  label: { fontSize: '0.7rem', color: '#8a7e6a', fontWeight: 'bold', marginBottom: '4px', display: 'block' } as const,
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '8px' } as const,
  halfRow: { flex: '1 1 180px', display: 'flex', flexDirection: 'column' as const } as const,
};

function genId(): string { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }

function EditorPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.panel}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>{title}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div style={styles.halfRow}>
      <label style={styles.label}>{label}</label>
      {type === 'textarea' ? (
        <textarea style={styles.textarea} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input style={styles.input} type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={styles.halfRow}>
      <label style={styles.label}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={styles.input}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function HomebrewEditorPage() {
  const [tab, setTab] = useState<Tab>('items');

  // Items
  const [items, setItems] = useState<HomebrewItem[]>([]);
  const [editItem, setEditItem] = useState<HomebrewItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<HomebrewItem>>({ name: '', type: '', rarity: 'none', value: 0, weight: 0, description: '' });

  // Monsters
  const [monsters, setMonsters] = useState<HomebrewMonster[]>([]);
  const [editMonster, setEditMonster] = useState<HomebrewMonster | null>(null);
  const defaultStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const [monsterForm, setMonsterForm] = useState<Partial<HomebrewMonster>>({ name: '', cr: '1', type: 'humanoid', ac: 10, hp: 10, speed: '30 ft.', stats: { ...defaultStats }, description: '', actions: [] });

  // Spells
  const [spells, setSpells] = useState<HomebrewSpell[]>([]);
  const [editSpell, setEditSpell] = useState<HomebrewSpell | null>(null);
  const [spellForm, setSpellForm] = useState<Partial<HomebrewSpell>>({ name: '', level: 1, school: 'Evocation', castingTime: '1 action', range: '60 ft.', components: 'V, S, M', duration: 'Instantaneous', description: '' });

  // Import/export
  const [importText, setImportText] = useState('');

  useEffect(() => {
    setItems(loadHBItems());
    setMonsters(loadHBMonsters());
    setSpells(loadHBSpells());
  }, []);

  const refreshItems = () => setItems(loadHBItems());
  const refreshMonsters = () => setMonsters(loadHBMonsters());
  const refreshSpells = () => setSpells(loadHBSpells());

  // Item handlers
  const startNewItem = () => {
    setEditItem(null);
    setItemForm({ name: '', type: '', rarity: 'none', value: 0, weight: 0, description: '' });
  };
  const startEditItem = (item: HomebrewItem) => {
    setEditItem(item);
    setItemForm({ ...item });
  };
  const saveItem = () => {
    if (!itemForm.name) return;
    const item: HomebrewItem = { id: editItem?.id || genId(), name: itemForm.name, type: itemForm.type || 'Other', rarity: itemForm.rarity || 'none', value: itemForm.value || 0, weight: itemForm.weight || 0, description: itemForm.description || '', source: 'homebrew' };
    saveHBItem(item);
    refreshItems();
    setEditItem(null);
  };
  const removeItem = (id: string) => { deleteHBItem(id); refreshItems(); if (editItem?.id === id) setEditItem(null); };

  // Monster handlers
  const startNewMonster = () => {
    setEditMonster(null);
    setMonsterForm({ name: '', cr: '1', type: 'humanoid', ac: 10, hp: 10, speed: '30 ft.', stats: { ...defaultStats }, description: '', actions: [] });
  };
  const startEditMonster = (m: HomebrewMonster) => {
    setEditMonster(m);
    setMonsterForm({ ...m });
  };
  const saveMonster = () => {
    if (!monsterForm.name) return;
    const m: HomebrewMonster = { id: editMonster?.id || genId(), name: monsterForm.name || '', cr: monsterForm.cr || '1', type: monsterForm.type || 'humanoid', ac: monsterForm.ac || 10, hp: monsterForm.hp || 10, speed: monsterForm.speed || '30 ft.', stats: monsterForm.stats || { ...defaultStats }, description: monsterForm.description || '', actions: monsterForm.actions || [], source: 'homebrew' };
    saveHBMonster(m);
    refreshMonsters();
    setEditMonster(null);
  };
  const removeMonster = (id: string) => { deleteHBMonster(id); refreshMonsters(); if (editMonster?.id === id) setEditMonster(null); };

  // Spell handlers
  const startNewSpell = () => {
    setEditSpell(null);
    setSpellForm({ name: '', level: 1, school: 'Evocation', castingTime: '1 action', range: '60 ft.', components: 'V, S, M', duration: 'Instantaneous', description: '' });
  };
  const startEditSpell = (s: HomebrewSpell) => {
    setEditSpell(s);
    setSpellForm({ ...s });
  };
  const saveSpell = () => {
    if (!spellForm.name) return;
    const s: HomebrewSpell = { id: editSpell?.id || genId(), name: spellForm.name || '', level: spellForm.level ?? 1, school: spellForm.school || 'Evocation', castingTime: spellForm.castingTime || '1 action', range: spellForm.range || '60 ft.', components: spellForm.components || 'V, S', duration: spellForm.duration || 'Instantaneous', description: spellForm.description || '', source: 'homebrew' };
    saveHBSpell(s);
    refreshSpells();
    setEditSpell(null);
  };
  const removeSpell = (id: string) => { deleteHBSpell(id); refreshSpells(); if (editSpell?.id === id) setEditSpell(null); };

  // Import/Export
  const handleExport = () => {
    const blob = new Blob([exportAllHomebrew()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'homebrew-export.json';
    a.click();
  };
  const handleImport = () => {
    try {
      const counts = importAllHomebrew(importText);
      alert(`Imported: ${counts.items} items, ${counts.monsters} monsters, ${counts.spells} spells`);
      refreshItems(); refreshMonsters(); refreshSpells();
      setImportText('');
    } catch { alert('Invalid JSON'); }
  };

  const renderItemForm = () => (
    <EditorPanel title={editItem ? `Edit: ${editItem.name}` : 'New Item'}>
      <div style={styles.row}>
        <Input label="Name" value={itemForm.name || ''} onChange={v => setItemForm({ ...itemForm, name: v })} placeholder="e.g. Frostbrand Longsword" />
        <Select label="Type" value={itemForm.type || ''} onChange={v => setItemForm({ ...itemForm, type: v })} options={ITEM_TYPES} />
        <Select label="Rarity" value={itemForm.rarity || 'none'} onChange={v => setItemForm({ ...itemForm, rarity: v })} options={RARITIES} />
      </div>
      <div style={styles.row}>
        <Input label="Value (gp)" value={String(itemForm.value ?? 0)} onChange={v => setItemForm({ ...itemForm, value: parseInt(v) || 0 })} />
        <Input label="Weight (lb)" value={String(itemForm.weight ?? 0)} onChange={v => setItemForm({ ...itemForm, weight: parseInt(v) || 0 })} />
      </div>
      <Input label="Description" value={itemForm.description || ''} onChange={v => setItemForm({ ...itemForm, description: v })} type="textarea" placeholder="Describe the item..." />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button onClick={saveItem} disabled={!itemForm.name} style={{ padding: '8px 16px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save Item</button>
        <button onClick={() => setEditItem(null)} style={{ padding: '8px 16px', background: '#3d3528', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
      </div>
    </EditorPanel>
  );

  const renderMonsterForm = () => (
    <EditorPanel title={editMonster ? `Edit: ${editMonster.name}` : 'New Monster'}>
      <div style={styles.row}>
        <Input label="Name" value={monsterForm.name || ''} onChange={v => setMonsterForm({ ...monsterForm, name: v })} placeholder="e.g. Shadow Wolf" />
        <Select label="Type" value={monsterForm.type || 'humanoid'} onChange={v => setMonsterForm({ ...monsterForm, type: v })} options={MONSTER_TYPES} />
        <Input label="CR" value={monsterForm.cr || '1'} onChange={v => setMonsterForm({ ...monsterForm, cr: v })} placeholder="e.g. 3, 1/2" />
      </div>
      <div style={styles.row}>
        <Input label="AC" value={String(monsterForm.ac ?? 10)} onChange={v => setMonsterForm({ ...monsterForm, ac: parseInt(v) || 10 })} />
        <Input label="HP" value={String(monsterForm.hp ?? 10)} onChange={v => setMonsterForm({ ...monsterForm, hp: parseInt(v) || 10 })} />
        <Input label="Speed" value={monsterForm.speed || ''} onChange={v => setMonsterForm({ ...monsterForm, speed: v })} placeholder="e.g. 30 ft." />
      </div>
      <div style={{ ...styles.row, marginBottom: '12px' }}>
        {Object.keys(defaultStats).map(stat => (
          <div key={stat} style={{ flex: '1 1 50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ ...styles.label, textAlign: 'center' }}>{stat.toUpperCase()}</label>
            <input type="number" value={monsterForm.stats?.[stat as keyof typeof defaultStats] ?? 10} onChange={e => setMonsterForm({ ...monsterForm, stats: { ...monsterForm.stats!, [stat]: parseInt(e.target.value) || 10 } })}
              style={{ ...styles.input, width: '50px', textAlign: 'center' }} />
          </div>
        ))}
      </div>
      <Input label="Description" value={monsterForm.description || ''} onChange={v => setMonsterForm({ ...monsterForm, description: v })} type="textarea" placeholder="Flavor text and special traits..." />
      {monsterForm.actions?.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <input style={{ ...styles.input, flex: '1' }} placeholder="Action name" value={a.name} onChange={e => {
            const actions = [...(monsterForm.actions || [])];
            actions[i] = { ...actions[i], name: e.target.value };
            setMonsterForm({ ...monsterForm, actions });
          }} />
          <input style={{ ...styles.input, flex: '2' }} placeholder="Description" value={a.description} onChange={e => {
            const actions = [...(monsterForm.actions || [])];
            actions[i] = { ...actions[i], description: e.target.value };
            setMonsterForm({ ...monsterForm, actions });
          }} />
          <button onClick={() => {
            const actions = (monsterForm.actions || []).filter((_, j) => j !== i);
            setMonsterForm({ ...monsterForm, actions });
          }} style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button onClick={() => setMonsterForm({ ...monsterForm, actions: [...(monsterForm.actions || []), { name: '', description: '' }] })}
        style={{ padding: '4px 10px', background: '#3d3528', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', marginBottom: '8px' }}>
        + Add Action
      </button>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={saveMonster} disabled={!monsterForm.name} style={{ padding: '8px 16px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save Monster</button>
        <button onClick={() => setEditMonster(null)} style={{ padding: '8px 16px', background: '#3d3528', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
      </div>
    </EditorPanel>
  );

  const renderSpellForm = () => (
    <EditorPanel title={editSpell ? `Edit: ${editSpell.name}` : 'New Spell'}>
      <div style={styles.row}>
        <Input label="Name" value={spellForm.name || ''} onChange={v => setSpellForm({ ...spellForm, name: v })} placeholder="e.g. Arcane Burst" />
        <Input label="Level" type="number" value={String(spellForm.level ?? 1)} onChange={v => setSpellForm({ ...spellForm, level: parseInt(v) || 0 })} />
        <Select label="School" value={spellForm.school || 'Evocation'} onChange={v => setSpellForm({ ...spellForm, school: v })} options={SCHOOLS} />
      </div>
      <div style={styles.row}>
        <Input label="Casting Time" value={spellForm.castingTime || ''} onChange={v => setSpellForm({ ...spellForm, castingTime: v })} placeholder="1 action" />
        <Input label="Range" value={spellForm.range || ''} onChange={v => setSpellForm({ ...spellForm, range: v })} placeholder="60 ft." />
      </div>
      <div style={styles.row}>
        <Input label="Components" value={spellForm.components || ''} onChange={v => setSpellForm({ ...spellForm, components: v })} placeholder="V, S, M" />
        <Input label="Duration" value={spellForm.duration || ''} onChange={v => setSpellForm({ ...spellForm, duration: v })} placeholder="Instantaneous" />
      </div>
      <Input label="Description" value={spellForm.description || ''} onChange={v => setSpellForm({ ...spellForm, description: v })} type="textarea" placeholder="Spell description, damage, effects..." />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button onClick={saveSpell} disabled={!spellForm.name} style={{ padding: '8px 16px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save Spell</button>
        <button onClick={() => setEditSpell(null)} style={{ padding: '8px 16px', background: '#3d3528', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
      </div>
    </EditorPanel>
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Homebrew Editor</h1>
      <p style={styles.sub}>Create and manage custom items, monsters, and spells. Stored in your browser.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['items', 'monsters', 'spells'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', background: tab === t ? '#c9a84c' : '#1a1714',
            border: '1px solid #3d3528', color: '#e8dcc8', cursor: 'pointer', fontSize: '0.8rem',
            borderRight: t === 'spells' ? '1px solid #3d3528' : 'none',
            borderRadius: t === 'items' ? '6px 0 0 6px' : t === 'spells' ? '0 6px 6px 0' : '0',
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'items' ? items.length : t === 'monsters' ? monsters.length : spells.length})
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleExport} style={{ padding: '6px 14px', background: '#3d3528', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', marginLeft: '8px' }}>
          Export JSON
        </button>
      </div>

      {/* Import */}
      <details style={{ marginBottom: '1rem', color: '#8a7e6a', fontSize: '0.75rem' }}>
        <summary style={{ cursor: 'pointer' }}>Import JSON</summary>
        <div style={{ marginTop: '8px' }}>
          <textarea style={styles.textarea} value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste homebrew JSON here..." />
          <button onClick={handleImport} disabled={!importText.trim()} style={{ marginTop: '6px', padding: '6px 14px', background: '#c9a84c', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
            Import
          </button>
        </div>
      </details>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Sidebar: list */}
        <div style={{ flex: '0 0 280px', maxHeight: '600px', overflowY: 'auto' }}>
          {tab === 'items' && (
            <div style={styles.panel}>
              <button onClick={startNewItem} style={{ width: '100%', padding: '8px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '8px' }}>+ New Item</button>
              {items.map(item => (
                <div key={item.id} onClick={() => startEditItem(item)} style={{ padding: '6px 8px', cursor: 'pointer', background: editItem?.id === item.id ? '#1a1714' : 'transparent', borderRadius: '4px', marginBottom: '2px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#c9a84c' }}>{item.name}</span>
                  <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '0.65rem' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {tab === 'monsters' && (
            <div style={styles.panel}>
              <button onClick={startNewMonster} style={{ width: '100%', padding: '8px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '8px' }}>+ New Monster</button>
              {monsters.map(m => (
                <div key={m.id} onClick={() => startEditMonster(m)} style={{ padding: '6px 8px', cursor: 'pointer', background: editMonster?.id === m.id ? '#1a1714' : 'transparent', borderRadius: '4px', marginBottom: '2px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a83232' }}>{m.name}</span>
                  <button onClick={e => { e.stopPropagation(); removeMonster(m.id); }} style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '0.65rem' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {tab === 'spells' && (
            <div style={styles.panel}>
              <button onClick={startNewSpell} style={{ width: '100%', padding: '8px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '8px' }}>+ New Spell</button>
              {spells.map(s => (
                <div key={s.id} onClick={() => startEditSpell(s)} style={{ padding: '6px 8px', cursor: 'pointer', background: editSpell?.id === s.id ? '#1a1714' : 'transparent', borderRadius: '4px', marginBottom: '2px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8a7e6a' }}>{s.name}</span>
                  <button onClick={e => { e.stopPropagation(); removeSpell(s.id); }} style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '0.65rem' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div style={{ flex: '1 1 500px' }}>
          {tab === 'items' && (editItem !== undefined) && renderItemForm()}
          {tab === 'monsters' && (editMonster !== undefined) && renderMonsterForm()}
          {tab === 'spells' && (editSpell !== undefined) && renderSpellForm()}
          {tab === 'items' && editItem === null && !itemForm.name && <p style={{ color: '#5a5248', fontSize: '0.85rem' }}>Select an item or create a new one.</p>}
          {tab === 'monsters' && editMonster === null && !monsterForm.name && <p style={{ color: '#5a5248', fontSize: '0.85rem' }}>Select a monster or create a new one.</p>}
          {tab === 'spells' && editSpell === null && !spellForm.name && <p style={{ color: '#5a5248', fontSize: '0.85rem' }}>Select a spell or create a new one.</p>}
        </div>
      </div>
    </div>
  );
}
