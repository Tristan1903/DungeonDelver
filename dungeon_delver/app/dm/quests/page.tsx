'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Quest, QuestObjective } from '../../../lib/campaign';
import { campaignKey } from '../../../utils/campaignStorage';

const STORAGE_KEY = 'quests';
const ARCS_KEY = 'storyline-arcs';
function sk(key: string) { return campaignKey(key); }

interface StoryArc {
  id: string;
  name: string;
  description: string;
  color: string;
}

function loadQuests(): Quest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(sk(STORAGE_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQuests(quests: Quest[]) {
  try { localStorage.setItem(sk(STORAGE_KEY), JSON.stringify(quests)); } catch { /* ignore */ }
}

function loadArcs(): StoryArc[] {
  try {
    const raw = localStorage.getItem(sk(ARCS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveArcs(arcs: StoryArc[]) {
  try { localStorage.setItem(sk(ARCS_KEY), JSON.stringify(arcs)); } catch { /* ignore */ }
}

function newQuest(name: string): Quest {
  return {
    id: `quest-${Date.now()}`,
    name,
    status: 'active',
    description: '',
    objectives: [],
    rewardXp: 0,
    rewardItems: '',
    notes: '',
    sessionIds: [],
    createdAt: new Date().toISOString(),
  };
}

const ARC_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e91e63'];

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'complete' | 'failed'>('all');
  const [arcFilter, setArcFilter] = useState<string>('all');
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [editForm, setEditForm] = useState<Quest | null>(null);
  const [newObjectiveText, setNewObjectiveText] = useState('');
  const [showArcEditor, setShowArcEditor] = useState(false);
  const [arcForm, setArcForm] = useState<StoryArc>({ id: '', name: '', description: '', color: '#3498db' });

  useEffect(() => { setQuests(loadQuests()); setArcs(loadArcs()); }, []);

  const persist = useCallback((q: Quest[]) => { setQuests(q); saveQuests(q); }, []);
  const persistArcs = useCallback((a: StoryArc[]) => { setArcs(a); saveArcs(a); }, []);

  const filtered = quests
    .filter(q => statusFilter === 'all' || q.status === statusFilter)
    .filter(q => arcFilter === 'all' || (q as any).arc === arcFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const groupedByArc = (items: typeof filtered) => {
    const groups: Record<string, typeof filtered> = {};
    const unassigned: typeof filtered = [];
    for (const q of items) {
      const arcId = (q as any).arc;
      if (arcId && arcs.find(a => a.id === arcId)) {
        if (!groups[arcId]) groups[arcId] = [];
        groups[arcId].push(q);
      } else {
        unassigned.push(q);
      }
    }
    return { groups, unassigned };
  };

  const startEdit = (quest?: Quest) => {
    if (quest) { setEditForm({ ...quest }); setEditingQuest(quest); }
    else {
      const q = newQuest(`Quest ${quests.length + 1}`);
      (q as any).arc = arcFilter !== 'all' ? arcFilter : '';
      setEditForm(q);
      setEditingQuest(q);
    }
  };

  const saveEdit = () => {
    if (!editForm || !editForm.name.trim()) return;
    if (quests.find(q => q.id === editForm.id)) {
      persist(quests.map(q => q.id === editForm.id ? editForm : q));
    } else {
      persist([editForm, ...quests]);
    }
    setEditingQuest(null);
    setEditForm(null);
  };

  const deleteQuest = (id: string) => {
    if (confirm('Delete this quest?')) persist(quests.filter(q => q.id !== id));
  };

  const toggleObjective = (questId: string, objId: string) => {
    persist(quests.map(q => q.id === questId ? {
      ...q, objectives: q.objectives.map(o => o.id === objId ? { ...o, completed: !o.completed } : o),
    } : q));
  };

  const addObjective = () => {
    if (!editForm || !newObjectiveText.trim()) return;
    const obj: QuestObjective = { id: `obj-${Date.now()}`, text: newObjectiveText.trim(), completed: false };
    setEditForm({ ...editForm, objectives: [...editForm.objectives, obj] });
    setNewObjectiveText('');
  };

  const removeObjective = (id: string) => {
    if (!editForm) return;
    setEditForm({ ...editForm, objectives: editForm.objectives.filter(o => o.id !== id) });
  };

  const saveArc = () => {
    if (!arcForm.name.trim()) return;
    if (arcForm.id) {
      persistArcs(arcs.map(a => a.id === arcForm.id ? arcForm : a));
    } else {
      persistArcs([...arcs, { ...arcForm, id: `arc-${Date.now()}` }]);
    }
    setArcForm({ id: '', name: '', description: '', color: '#3498db' });
  };

  const deleteArc = (arcId: string) => {
    if (!confirm('Delete this story arc? Quests will become unassigned.')) return;
    persistArcs(arcs.filter(a => a.id !== arcId));
  };

  const statusOptions: { value: Quest['status']; label: string; color: string }[] = [
    { value: 'active', label: 'Active', color: '#48bb78' },
    { value: 'complete', label: 'Complete', color: '#6366f1' },
    { value: 'failed', label: 'Failed', color: '#e53e3e' },
  ];

  const { groups: grouped, unassigned } = groupedByArc(filtered);

  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1100px', margin: '0 auto' }}>
      <Link href="/dm" style={{ color: '#a0aec0', display: 'block', marginBottom: '12px' }}>← DM Hub</Link>
      <h1 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif' }}>Quest & Storyline Tracker</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'active', 'complete', 'failed'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', background: statusFilter === s ? '#6366f1' : '#2d3748', color: 'white' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <select value={arcFilter} onChange={e => setArcFilter(e.target.value)}
          style={{ padding: '6px 12px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
          <option value="all">All Arcs</option>
          <option value="">Unassigned</option>
          {arcs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => startEdit()} style={{ padding: '8px 20px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>+ New Quest</button>
        <button onClick={() => { setShowArcEditor(!showArcEditor); setArcForm({ id: '', name: '', description: '', color: ARC_COLORS[arcs.length % ARC_COLORS.length] }); }}
          style={{ padding: '8px 16px', background: showArcEditor ? '#e53e3e' : '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
          {showArcEditor ? 'Close Arc Editor' : 'Manage Arcs'}
        </button>
      </div>

      {/* Arc Editor */}
      {showArcEditor && (
        <div style={{ background: '#2d3748', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #4a5568' }}>
          <h3 style={{ color: '#f6e05e', margin: '0 0 12px', fontSize: '1rem' }}>Storyline Arcs</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input value={arcForm.name} onChange={e => setArcForm({ ...arcForm, name: e.target.value })} placeholder="Arc name"
              style={{ flex: 1, minWidth: '150px', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
            <input value={arcForm.description} onChange={e => setArcForm({ ...arcForm, description: e.target.value })} placeholder="Description"
              style={{ flex: 2, minWidth: '200px', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
            <input type="color" value={arcForm.color} onChange={e => setArcForm({ ...arcForm, color: e.target.value })}
              style={{ width: '40px', height: '40px', padding: '2px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', cursor: 'pointer' }} />
            <button onClick={saveArc} disabled={!arcForm.name.trim()}
              style={{ padding: '8px 20px', background: arcForm.name.trim() ? '#48bb78' : '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: arcForm.name.trim() ? 'pointer' : 'not-allowed', fontSize: '0.85rem' }}>
              {arcForm.id ? 'Update' : 'Add Arc'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {arcs.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#1a202c', borderRadius: '6px', border: `2px solid ${a.color}` }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem' }}>{a.name}</span>
                <button onClick={() => { setArcForm(a); }} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '0.7rem' }}>Edit</button>
                <button onClick={() => deleteArc(a.id)} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>
              </div>
            ))}
            {arcs.length === 0 && <p style={{ color: '#718096', fontSize: '0.85rem', margin: 0 }}>No arcs defined yet. Create one above.</p>}
          </div>
        </div>
      )}

      {/* Quest list grouped by arc */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No quests found.</div>
      )}
      {Object.entries(grouped).map(([arcId, quests]) => {
        const arc = arcs.find(a => a.id === arcId)!;
        return (
          <div key={arcId} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: arc.color, flexShrink: 0 }} />
              <h2 style={{ color: arc.color, margin: 0, fontSize: '1.1rem', fontFamily: 'serif' }}>{arc.name}</h2>
              <span style={{ color: '#718096', fontSize: '0.8rem' }}>{quests.length} quests</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quests.map(q => <QuestCard key={q.id} q={q} onEdit={startEdit} onDelete={deleteQuest} onToggleObjective={toggleObjective} statusOptions={statusOptions} />)}
            </div>
          </div>
        );
      })}
      {unassigned.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ color: '#718096', margin: '0 0 8px', fontSize: '1rem', fontFamily: 'serif' }}>Unassigned Quests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unassigned.map(q => <QuestCard key={q.id} q={q} onEdit={startEdit} onDelete={deleteQuest} onToggleObjective={toggleObjective} statusOptions={statusOptions} />)}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingQuest && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '8px', width: '520px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #b8860b' }}>
            <h2 style={{ color: '#b8860b', margin: '0 0 12px' }}>{quests.find(q => q.id === editForm.id) ? 'Edit Quest' : 'New Quest'}</h2>

            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Name</span>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.9rem', marginTop: '4px' }} />
            </label>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Status</span>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as Quest['status'] })}
                  style={{ width: '100%', padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.9rem', marginTop: '4px' }}>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Story Arc</span>
                <select value={(editForm as any).arc || ''} onChange={e => setEditForm({ ...editForm, arc: e.target.value } as any)}
                  style={{ width: '100%', padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.9rem', marginTop: '4px' }}>
                  <option value="">— None —</option>
                  {arcs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Description</span>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                style={{ width: '100%', minHeight: '50px', padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px', resize: 'vertical' }} />
            </label>

            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'block', marginBottom: '4px' }}>Objectives</span>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input value={newObjectiveText} onChange={e => setNewObjectiveText(e.target.value)} placeholder="Add objective..."
                  style={{ flex: 1, padding: '6px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                  onKeyDown={e => { if (e.key === 'Enter') addObjective(); }} />
                <button onClick={addObjective} disabled={!newObjectiveText.trim()}
                  style={{ padding: '6px 12px', background: newObjectiveText.trim() ? '#6366f1' : '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: newObjectiveText.trim() ? 'pointer' : 'not-allowed', fontSize: '0.8rem' }}>Add</button>
              </div>
              {editForm.objectives.map(o => (
                <div key={o.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', padding: '4px 6px', background: '#1a202c', borderRadius: '4px' }}>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: '#cbd5e0', textDecoration: o.completed ? 'line-through' : 'none' }}>{o.text}</span>
                  <button onClick={() => setEditForm({ ...editForm, objectives: editForm.objectives.map(x => x.id === o.id ? { ...x, completed: !x.completed } : x) })}
                    style={{ padding: '2px 6px', background: o.completed ? '#48bb78' : '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                    {o.completed ? '✓' : '○'}
                  </button>
                  <button onClick={() => removeObjective(o.id)}
                    style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>XP Reward</span>
                <input type="number" min={0} value={editForm.rewardXp} onChange={e => setEditForm({ ...editForm, rewardXp: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '6px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }} />
              </label>
              <label style={{ flex: 2 }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Item Rewards</span>
                <input value={editForm.rewardItems} onChange={e => setEditForm({ ...editForm, rewardItems: e.target.value })}
                  placeholder="e.g. Sword of Sharpness"
                  style={{ width: '100%', padding: '6px 8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }} />
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>DM Notes</span>
              <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                style={{ width: '100%', minHeight: '50px', padding: '8px', background: '#2d3748', border: '1px solid #4a5568', color: 'white', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px', resize: 'vertical' }} />
            </label>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={saveEdit} disabled={!editForm.name.trim()}
                style={{ flex: 1, padding: '10px', background: editForm.name.trim() ? '#48bb78' : '#4a5568', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '4px', cursor: editForm.name.trim() ? 'pointer' : 'not-allowed' }}>
                Save
              </button>
              <button onClick={() => { setEditingQuest(null); setEditForm(null); }}
                style={{ padding: '10px 20px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({ q, onEdit, onDelete, onToggleObjective, statusOptions }: {
  q: Quest; onEdit: (q: Quest) => void; onDelete: (id: string) => void;
  onToggleObjective: (qId: string, oId: string) => void; statusOptions: { value: string; label: string; color: string }[];
}) {
  return (
    <div style={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#e2e8f0', fontSize: '1rem' }}>{q.name}</span>
            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', background: statusOptions.find(s => s.value === q.status)?.color || '#718096', color: 'white' }}>
              {q.status.toUpperCase()}
            </span>
          </div>
          {q.description && <div style={{ color: '#a0aec0', fontSize: '0.85rem', marginBottom: '8px' }}>{q.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onEdit(q)} style={{ padding: '4px 10px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
          <button onClick={() => onDelete(q.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
        </div>
      </div>
      {q.objectives.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {q.objectives.map(o => (
            <label key={o.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', color: o.completed ? '#718096' : '#cbd5e0', textDecoration: o.completed ? 'line-through' : 'none' }}>
              <input type="checkbox" checked={o.completed} onChange={() => onToggleObjective(q.id, o.id)} style={{ accentColor: '#48bb78', cursor: 'pointer' }} />
              {o.text}
            </label>
          ))}
        </div>
      )}
      {(q.rewardXp > 0 || q.rewardItems) && (
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#ecc94b' }}>
          {q.rewardXp > 0 && <span>XP: {q.rewardXp} </span>}
          {q.rewardItems && <span>| Items: {q.rewardItems}</span>}
        </div>
      )}
    </div>
  );
}
