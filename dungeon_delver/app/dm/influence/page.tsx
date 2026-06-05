'use client';
import { useState, useEffect } from 'react';
import {
  SocialNPC, SocialGroup, Disposition, DISPOSITION_ORDER,
  getInfluenceDC, getDCDescription, adjustDisposition, reactionRoll,
  loadSocialNPCs, saveSocialNPC, deleteSocialNPC,
  loadSocialGroups, saveSocialGroup, deleteSocialGroup,
} from '../../../utils/influenceEngine';

const DISPOSITION_COLORS: Record<Disposition, string> = {
  hostile: '#a83232',
  unfriendly: '#c9a84c',
  indifferent: '#8a7e6a',
  friendly: '#16a34a',
  helpful: '#16a34a',
};

const DISPOSITION_LABELS: Record<Disposition, string> = {
  hostile: 'Hostile',
  unfriendly: 'Unfriendly',
  indifferent: 'Indifferent',
  friendly: 'Friendly',
  helpful: 'Helpful',
};

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '1200px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' } as const,
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' } as const,
  npcCard: {
    background: '#1a1714', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem',
  } as const,
  input: {
    width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528',
    borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const,
  },
  slider: {
    width: '100%', height: '6px', appearance: 'none' as const, outline: 'none',
    borderRadius: '3px', cursor: 'pointer',
  },
};

export default function InfluencePage() {
  const [npcs, setNpcs] = useState<SocialNPC[]>([]);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [newName, setNewName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [reactionResult, setReactionResult] = useState<{ name: string; total: number; disposition: Disposition; rolls: number[] } | null>(null);
  const [tab, setTab] = useState<'npcs' | 'groups'>('npcs');

  useEffect(() => {
    setNpcs(loadSocialNPCs());
    setGroups(loadSocialGroups());
  }, []);

  const refresh = () => {
    setNpcs(loadSocialNPCs());
    setGroups(loadSocialGroups());
  };

  const handleAddNPC = () => {
    if (!newName.trim()) return;
    const npc: SocialNPC = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      name: newName.trim(),
      disposition: 'indifferent',
      notes: '',
      tags: [],
      lastInteraction: new Date().toISOString().split('T')[0],
    };
    saveSocialNPC(npc);
    setNewName('');
    refresh();
  };

  const handleDispositionChange = (id: string, disposition: Disposition) => {
    const npc = npcs.find(n => n.id === id);
    if (npc) {
      saveSocialNPC({ ...npc, disposition, lastInteraction: new Date().toISOString().split('T')[0] });
      refresh();
    }
  };

  const handleNotesChange = (id: string, notes: string) => {
    const npc = npcs.find(n => n.id === id);
    if (npc) {
      saveSocialNPC({ ...npc, notes });
      refresh();
    }
  };

  const handleRollReaction = (npc: SocialNPC) => {
    const result = reactionRoll(npc.persuasionMod || 0);
    setReactionResult({ name: npc.name, ...result });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const group: SocialGroup = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      name: newGroupName.trim(),
      memberIds: [],
      notes: '',
    };
    saveSocialGroup(group);
    setNewGroupName('');
    refresh();
  };

  const handleGroupMemberToggle = (groupId: string, npcId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const memberIds = group.memberIds.includes(npcId)
      ? group.memberIds.filter(id => id !== npcId)
      : [...group.memberIds, npcId];
    saveSocialGroup({ ...group, memberIds });
    refresh();
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Influence & Social Tracker</h1>
      <p style={styles.sub}>Track NPC dispositions and manage social encounters.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1rem' }}>
        <button onClick={() => setTab('npcs')} style={{
          padding: '8px 20px', background: tab === 'npcs' ? '#c9a84c' : '#1a1714',
          border: '1px solid #3d3528', color: '#e8dcc8', cursor: 'pointer', borderRadius: '6px 0 0 6px', fontSize: '0.8rem',
        }}>NPCs ({npcs.length})</button>
        <button onClick={() => setTab('groups')} style={{
          padding: '8px 20px', background: tab === 'groups' ? '#c9a84c' : '#1a1714',
          border: '1px solid #3d3528', borderLeft: 'none', color: '#e8dcc8', cursor: 'pointer', borderRadius: '0 6px 6px 0', fontSize: '0.8rem',
        }}>Groups ({groups.length})</button>
      </div>

      {reactionResult && (
        <div style={{ ...styles.panel, background: '#1a1714', border: '2px solid #c9a84c', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{reactionResult.name}</strong> — Rolled {reactionResult.rolls[0]} + {reactionResult.rolls[1]} = <strong>{reactionResult.total}</strong></span>
            <span style={{ color: DISPOSITION_COLORS[reactionResult.disposition], fontWeight: 'bold' }}>
              {DISPOSITION_LABELS[reactionResult.disposition]}
            </span>
            <button onClick={() => setReactionResult(null)} style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
        </div>
      )}

      {tab === 'npcs' && (
        <>
          {/* Add NPC */}
          <div style={{ ...styles.panel, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input style={{ ...styles.input, flex: 1 }} placeholder="NPC name..." value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNPC()} />
            <button onClick={handleAddNPC} disabled={!newName.trim()}
              style={{ padding: '8px 16px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Add NPC</button>
          </div>

          {/* NPC Grid */}
          <div style={styles.grid}>
            {npcs.length === 0 && <p style={{ color: '#5a5248', fontSize: '0.85rem' }}>No NPCs tracked yet. Add one above.</p>}
            {npcs.map(npc => {
              const dc = getInfluenceDC(npc.disposition);
              const dcMajor = getInfluenceDC(npc.disposition, true);
              return (
                <div key={npc.id} style={styles.npcCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{npc.name}</span>
                    <button onClick={() => { deleteSocialNPC(npc.id); refresh(); }}
                      style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                  </div>

                  {/* Disposition slider */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#5a5248', marginBottom: '2px' }}>
                      {DISPOSITION_ORDER.map(d => (
                        <span key={d} style={{ color: DISPOSITION_COLORS[d] }}>{DISPOSITION_LABELS[d]}</span>
                      ))}
                    </div>
                    <input type="range" min={0} max={4} step={1} value={DISPOSITION_ORDER.indexOf(npc.disposition)}
                      onChange={e => handleDispositionChange(npc.id, DISPOSITION_ORDER[parseInt(e.target.value)])}
                      style={{
                        ...styles.slider,
                        background: `linear-gradient(to right, #a83232, #c9a84c, #8a7e6a, #16a34a, #16a34a)`,
                      }}
                      title={DISPOSITION_LABELS[npc.disposition]} />
                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: DISPOSITION_COLORS[npc.disposition], fontSize: '0.8rem', marginTop: '2px' }}>
                      {DISPOSITION_LABELS[npc.disposition]}
                    </div>
                  </div>

                  {/* Influence DC */}
                  <div style={{ fontSize: '0.75rem', marginBottom: '8px' }}>
                    <span style={{ color: '#8a7e6a' }}>Influence DC: </span>
                    <strong>{getDCDescription(dc)}</strong>
                    {dc && <span style={{ color: '#5a5248', marginLeft: '6px' }}>(major: {getDCDescription(dcMajor)})</span>}
                  </div>

                  {/* Notes */}
                  <textarea value={npc.notes} onChange={e => handleNotesChange(npc.id, e.target.value)}
                    placeholder="Notes about this NPC..."
                    style={{ ...styles.input, minHeight: '50px', resize: 'vertical', marginBottom: '8px', fontSize: '0.7rem' }} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleRollReaction(npc)}
                      style={{ padding: '4px 10px', background: '#c9a84c', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                      Roll Reaction
                    </button>
                    <button onClick={() => {
                      handleDispositionChange(npc.id, adjustDisposition(npc.disposition, 1));
                    }} style={{ padding: '4px 10px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                      ↑ Friendlier
                    </button>
                    <button onClick={() => {
                      handleDispositionChange(npc.id, adjustDisposition(npc.disposition, -1));
                    }} style={{ padding: '4px 10px', background: '#a83232', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                      ↓ Hostile
                    </button>
                  </div>

                  {/* Groups */}
                  {groups.filter(g => g.memberIds.includes(npc.id)).length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.65rem', color: '#5a5248' }}>
                      Groups: {groups.filter(g => g.memberIds.includes(npc.id)).map(g => g.name).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'groups' && (
        <>
          {/* Add Group */}
          <div style={{ ...styles.panel, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ ...styles.input, flex: 1 }} placeholder="Group name..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
            <button onClick={handleAddGroup} disabled={!newGroupName.trim()}
              style={{ padding: '8px 16px', background: '#16a34a', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Add Group</button>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              style={{ padding: '6px 10px', background: '#1a1714', color: '#e8dcc8', border: '1px solid #3d3528', borderRadius: '4px', fontSize: '0.75rem' }}>
              <option value="">Select group to manage</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {selectedGroup && (() => {
            const group = groups.find(g => g.id === selectedGroup);
            if (!group) return null;
            return (
              <div style={styles.panel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#c9a84c' }}>{group.name}</h3>
                  <button onClick={() => { deleteSocialGroup(group.id); setSelectedGroup(''); refresh(); }}
                    style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Group</button>
                </div>
                <textarea value={group.notes} onChange={e => {
                  saveSocialGroup({ ...group, notes: e.target.value });
                  refresh();
                }} placeholder="Group notes..." style={{ ...styles.input, marginBottom: '8px', fontSize: '0.7rem' }} />
                <div style={{ fontSize: '0.75rem', color: '#8a7e6a', marginBottom: '6px' }}>Members ({group.memberIds.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {npcs.map(npc => (
                    <label key={npc.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer', padding: '3px 6px', background: group.memberIds.includes(npc.id) ? '#1a1714' : 'transparent', borderRadius: '4px' }}>
                      <input type="checkbox" checked={group.memberIds.includes(npc.id)}
                        onChange={() => handleGroupMemberToggle(group.id, npc.id)} />
                      <span style={{ color: group.memberIds.includes(npc.id) ? DISPOSITION_COLORS[npc.disposition] : '#5a5248' }}>
                        {npc.name}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: '#5a5248' }}>{DISPOSITION_LABELS[npc.disposition]}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
