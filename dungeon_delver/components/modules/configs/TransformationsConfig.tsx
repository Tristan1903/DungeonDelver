'use client';
// ===== 📘 FILE: TransformationsConfig.tsx =====
// 🎯 PURPOSE: Configures Grim Hollow transformations — each type has 4 tiers (levels 3/6/10/14)
//   with editable boons, flaws, and features. Supports expand/collapse per type and inline editing.
// 🧠 REACT CONCEPT: Complex Nested State Management — manages a deeply nested data structure (types →
//   tiers → boons/flaws/features → { name, description }) using immutable update functions with
//   find/map patterns. Also demonstrates local UI state (expandedType, editingTier) alongside
//   lifted config state.
// =====
import { useState } from 'react';
import type { TransformationsConfig } from '../../../utils/campaignEngine';

interface Props {
  value: TransformationsConfig;
  onChange: (v: TransformationsConfig) => void;
}

export default function TransformationsConfig({ value, onChange }: Props) {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<{ typeId: string; tierIdx: number } | null>(null);

  const types = value?.types || [];

  const updateTier = (typeId: string, tierIdx: number, field: 'boons' | 'flaws' | 'features', entries: { name: string; description: string }[]) => {
    const newTypes = types.map((t) => {
      if (t.id !== typeId) return t;
      const newTiers = t.tiers.map((tier, i) => i === tierIdx ? { ...tier, [field]: entries } : tier);
      return { ...t, tiers: newTiers };
    });
    onChange({ ...value, types: newTypes });
  };

  const addEntry = (typeId: string, tierIdx: number, field: 'boons' | 'flaws' | 'features') => {
    const t = types.find((tt) => tt.id === typeId);
    if (!t) return;
    const tier = t.tiers[tierIdx];
    updateTier(typeId, tierIdx, field, [...tier[field], { name: 'New Option', description: 'Description here.' }]);
  };

  const removeEntry = (typeId: string, tierIdx: number, field: 'boons' | 'flaws' | 'features', entryIdx: number) => {
    const t = types.find((tt) => tt.id === typeId);
    if (!t) return;
    const tier = t.tiers[tierIdx];
    updateTier(typeId, tierIdx, field, tier[field].filter((_, i) => i !== entryIdx));
  };

  const updateEntry = (typeId: string, tierIdx: number, field: 'boons' | 'flaws' | 'features', entryIdx: number, update: Partial<{ name: string; description: string }>) => {
    const t = types.find((tt) => tt.id === typeId);
    if (!t) return;
    const tier = t.tiers[tierIdx];
    const entries = tier[field].map((e, i) => i === entryIdx ? { ...e, ...update } : e);
    updateTier(typeId, tierIdx, field, entries);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '4px 8px', background: '#1a202c', border: '1px solid #4a5568',
    color: '#e2e8f0', borderRadius: '3px', fontSize: '0.75rem', fontFamily: 'inherit',
  };

  const smallBtn: React.CSSProperties = {
    padding: '2px 8px', fontSize: '0.65rem', background: '#4a5568', border: 'none',
    color: '#cbd5e0', borderRadius: '3px', cursor: 'pointer',
  };

  const renderEntries = (typeId: string, tierIdx: number, field: 'boons' | 'flaws' | 'features', entries: { name: string; description: string }[], color: string) => (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color }}>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
        <button onClick={() => addEntry(typeId, tierIdx, field)} style={smallBtn}>+ Add</button>
      </div>
      {entries.map((entry, ei) => (
        <div key={ei} style={{ display: 'flex', gap: '4px', marginBottom: '3px', alignItems: 'flex-start' }}>
          <input value={entry.name} onChange={(e) => updateEntry(typeId, tierIdx, field, ei, { name: e.target.value })} style={{ ...inputStyle, width: '120px', flexShrink: 0 }} />
          <input value={entry.description} onChange={(e) => updateEntry(typeId, tierIdx, field, ei, { description: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => removeEntry(typeId, tierIdx, field, ei)} style={{ ...smallBtn, color: '#fc8181' }}>x</button>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: '12px' }}>
        Configure transformation options from Grim Hollow: The Player's Guide. Each transformation has 4 tiers (levels 3, 6, 10, 14) with boons, flaws, and features.
      </p>
      {types.map((t) => (
        <div key={t.id} style={{ background: '#2d3748', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpandedType(expandedType === t.id ? null : t.id)}>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#f6e05e' }}>{t.name}</strong>
              <span style={{ fontSize: '0.7rem', color: '#718096', marginLeft: '8px' }}>{t.description}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#718096' }}>{expandedType === t.id ? '▼' : '▶'}</span>
          </div>
          {expandedType === t.id && (
            <div style={{ marginTop: '10px' }}>
              {t.tiers.map((tier, ti) => (
                <div key={ti} style={{ background: '#1a202c', borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ecc94b', marginBottom: '6px' }}>
                    Level {tier.level}
                  </div>
                  {renderEntries(t.id, ti, 'boons', tier.boons, '#48bb78')}
                  {renderEntries(t.id, ti, 'flaws', tier.flaws, '#fc8181')}
                  {renderEntries(t.id, ti, 'features', tier.features, '#63b3ed')}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
