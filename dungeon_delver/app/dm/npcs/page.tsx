'use client';
import { useState } from 'react';
import {
  GeneratedNPC, STAT_TEMPLATES,
  generateNPC, generateNPCMultiple, loadSavedNPCs, saveNPC, deleteSavedNPC,
} from '../../../utils/npcGenerator';

const SPECIES = ['human', 'elf', 'dwarf', 'halfling', 'orc', 'tiefling', 'dragonborn', 'gnome'];

const styles = {
  page: { padding: '2rem', color: 'white', fontFamily: 'serif', maxWidth: '1200px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#b8860b', marginBottom: '4px' } as const,
  sub: { color: '#a0aec0', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#1a202c', border: '1px solid #4a5568', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  statBlock: (species: string) => ({
    background: getSpeciesBg(species), border: `1px solid ${getSpeciesBorder(species)}`,
    borderRadius: '8px', padding: '1rem', marginBottom: '1rem',
    fontFamily: 'serif', color: '#e2e8f0', fontSize: '0.8rem', lineHeight: 1.6,
  } as const),
  npcGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' } as const,
};

function getSpeciesBg(species: string): string {
  switch (species) {
    case 'elf': return '#0a1a1a';
    case 'dwarf': return '#1a0f0a';
    case 'halfling': return '#1a1a0a';
    case 'orc': return '#1a0a0a';
    case 'tiefling': return '#100a1a';
    case 'dragonborn': return '#0a0a1a';
    case 'gnome': return '#1a120a';
    default: return '#0f1a0f';
  }
}

function getSpeciesBorder(species: string): string {
  switch (species) {
    case 'elf': return '#2a6a5a';
    case 'dwarf': return '#6a4a3a';
    case 'halfling': return '#6a6a3a';
    case 'orc': return '#6a2a2a';
    case 'tiefling': return '#4a2a6a';
    case 'dragonborn': return '#2a2a6a';
    case 'gnome': return '#6a4a2a';
    default: return '#3a6a3a';
  }
}

function statLabel(s: string): string { return s.substring(0, 3).toUpperCase(); }

function statMod(v: number): string {
  const m = Math.floor((v - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

export default function NpcGeneratorPage() {
  const [npc, setNpc] = useState<GeneratedNPC | null>(null);
  const [savedNpcs, setSavedNpcs] = useState<GeneratedNPC[]>(() => loadSavedNPCs());
  const [batchCount, setBatchCount] = useState(5);
  const [batch, setBatch] = useState<GeneratedNPC[]>([]);
  const [speciesFilter, setSpeciesFilter] = useState<string>('');
  const [templateFilter, setTemplateFilter] = useState<string>('');

  const handleGenerate = () => {
    const n = generateNPC();
    setNpc(n);
  };

  const handleBatch = () => {
    const list = generateNPCMultiple(batchCount);
    setBatch(list);
  };

  const handleSave = (n: GeneratedNPC) => {
    saveNPC(n);
    setSavedNpcs(loadSavedNPCs());
  };

  const handleDelete = (id: string) => {
    deleteSavedNPC(id);
    setSavedNpcs(loadSavedNPCs());
  };

  const renderStatblock = (n: GeneratedNPC) => (
    <div style={styles.statBlock(n.species)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f6e05e' }}>{n.name}</span>
        <span style={{ fontSize: '0.65rem', color: '#718096' }}>{n.age} · {n.profession}</span>
      </div>
      <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginBottom: '8px' }}>
        {n.species.charAt(0).toUpperCase() + n.species.slice(1)} · {n.template} · {n.gender}
      </div>
      <div style={{ marginBottom: '4px' }}>{n.appearance}</div>
      <hr style={{ borderColor: '#4a5568', margin: '8px 0' }} />
      <div><strong>AC</strong> {n.ac} · <strong>HP</strong> {n.hp} · <strong>Speed</strong> {n.speed} ft.</div>
      <hr style={{ borderColor: '#4a5568', margin: '8px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {Object.entries(n.stats).map(([s, v]) => (
          <div key={s} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '4px' }}>
            <div style={{ fontSize: '0.55rem', color: '#718096' }}>{statLabel(s)}</div>
            <div style={{ fontWeight: 'bold' }}>{v}</div>
            <div style={{ fontSize: '0.6rem', color: '#a0aec0' }}>{statMod(v)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontStyle: 'italic', color: '#a0aec0', marginBottom: '4px' }}>
        {n.personality.map((t, i) => <span key={i}>"{t}"{i < n.personality.length - 1 ? ' ' : ''}</span>)}
      </div>
      <div><strong style={{ color: '#63b3ed' }}>Ideal:</strong> {n.ideal}</div>
      <div><strong style={{ color: '#f6e05e' }}>Bond:</strong> {n.bond}</div>
      <div><strong style={{ color: '#fc8181' }}>Flaw:</strong> {n.flaw}</div>
      {n.notes && <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#a0aec0' }}>{n.notes}</div>}
    </div>
  );

  const filteredSaved = savedNpcs.filter(n => {
    if (speciesFilter && n.species !== speciesFilter) return false;
    if (templateFilter && n.template !== templateFilter) return false;
    return true;
  });

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>NPC Generator</h1>
      <p style={styles.sub}>Generate NPCs for your campaign with a click.</p>

      <div style={{ ...styles.panel, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleGenerate} style={{ padding: '10px 24px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ⚡ Generate NPC
        </button>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>Batch:</span>
          <input type="number" min={1} max={50} value={batchCount} onChange={e => setBatchCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            style={{ width: '50px', padding: '6px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', textAlign: 'center', fontSize: '0.8rem' }} />
          <button onClick={handleBatch} style={{ padding: '8px 16px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Generate {batchCount}
          </button>
        </div>
        <select onChange={e => setSpeciesFilter(e.target.value)} value={speciesFilter}
          style={{ padding: '6px 10px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.75rem', marginLeft: 'auto' }}>
          <option value="">All Species</option>
          {SPECIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select onChange={e => setTemplateFilter(e.target.value)} value={templateFilter}
          style={{ padding: '6px 10px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.75rem' }}>
          <option value="">All Templates</option>
          {STAT_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {npc && (
        <div style={{ maxWidth: '400px' }}>
          {renderStatblock(npc)}
          <button onClick={() => handleSave(npc)} style={{ padding: '6px 14px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginTop: '4px' }}>
            Save NPC
          </button>
        </div>
      )}

      {batch.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ color: '#b8860b', margin: '0 0 8px 0', fontSize: '0.9rem' }}>Batch Results ({batch.length})</h3>
          <div style={styles.npcGrid}>
            {batch.map(n => (
              <div key={n.id}>
                {renderStatblock(n)}
                <button onClick={() => handleSave(n)} style={{ padding: '4px 10px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', marginTop: '4px' }}>
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {savedNpcs.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#b8860b', fontSize: '1.2rem', marginBottom: '8px' }}>Saved NPCs ({filteredSaved.length})</h2>
          <div style={styles.npcGrid}>
            {filteredSaved.map(n => (
              <div key={n.id}>
                {renderStatblock(n)}
                <button onClick={() => handleDelete(n.id)} style={{ padding: '4px 10px', background: '#e53e3e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', marginTop: '4px', marginRight: '6px' }}>
                  Delete
                </button>
                <button onClick={() => setNpc(n)} style={{ padding: '4px 10px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', marginTop: '4px' }}>
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
