import { useState, useEffect } from 'react';
import { DataEngine } from '../utils/dataLoader';
import { cleanString } from '../utils/formatters';
import DmPasswordPanel from './DmPasswordPanel';

const DC_TABLE = [
  { task: 'Very Easy', dc: 5 },
  { task: 'Easy', dc: 10 },
  { task: 'Moderate', dc: 15 },
  { task: 'Hard', dc: 20 },
  { task: 'Very Hard', dc: 25 },
  { task: 'Nearly Impossible', dc: 30 },
];

const COVER_RULES = [
  { name: 'Half Cover', ac: '+2', dex: '+2', description: 'At least half the body is behind an obstacle. Grants +2 to AC and Dexterity saving throws.' },
  { name: 'Three-Quarters Cover', ac: '+5', dex: '+5', description: 'At least three-quarters of the body is behind an obstacle. Grants +5 to AC and Dexterity saving throws.' },
  { name: 'Total Cover', ac: '—', dex: '—', description: 'Fully behind an obstacle. Cannot be targeted directly.' },
];

const LIGHT_RULES = [
  { name: 'Bright Light', description: 'Normal vision, most creatures see clearly.' },
  { name: 'Dim Light', description: 'Shadows, lightly obscured area. Creatures without darkvision have disadvantage on Perception checks.' },
  { name: 'Darkness', description: 'Heavily obscured area. Creatures without darkvision or blindsight are effectively blinded.' },
];

const EXHAUSTION_TABLE = [
  { level: 1, effect: 'Disadvantage on ability checks' },
  { level: 2, effect: 'Speed halved' },
  { level: 3, effect: 'Disadvantage on attack rolls and saving throws' },
  { level: 4, effect: 'Hit point maximum halved' },
  { level: 5, effect: 'Speed reduced to 0' },
  { level: 6, effect: 'Death' },
];

const TRAVEL_PACE = [
  { pace: 'Fast', minute: '400 ft', hour: '4 miles', day: '30 miles', effect: '-5 to passive Perception' },
  { pace: 'Normal', minute: '300 ft', hour: '3 miles', day: '24 miles', effect: '—' },
  { pace: 'Slow', minute: '200 ft', hour: '2 miles', day: '18 miles', effect: 'Stealth possible, +5 to passive Perception' },
];

const SKILL_DCS = [
  { dc: 5, task: 'Very easy' },
  { dc: 10, task: 'Easy' },
  { dc: 15, task: 'Moderate' },
  { dc: 20, task: 'Hard' },
  { dc: 25, task: 'Very hard' },
  { dc: 30, task: 'Nearly impossible' },
];

const sections = [
  { id: 'conditions', label: 'Conditions' },
  { id: 'dcs', label: 'Common DCs' },
  { id: 'cover', label: 'Cover' },
  { id: 'light', label: 'Light & Vision' },
  { id: 'exhaustion', label: 'Exhaustion' },
  { id: 'travel', label: 'Travel Pace' },
  { id: 'password', label: 'DM Password' },
];

export default function DmScreenPanel({ compact }: { compact?: boolean }) {
  const [conditions, setConditions] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string>('conditions');

  useEffect(() => {
    DataEngine.getConditions().then(setConditions);
  }, []);

  return (
    <div style={{ color: '#e2e8f0', fontSize: compact ? '0.8rem' : '0.9rem' }}>
      {!compact && (
        <h2 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', margin: '0 0 16px' }}>DM Screen</h2>
      )}

      {/* Section nav */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', fontSize: '0.75rem', cursor: 'pointer', background: activeSection === s.id ? '#6366f1' : '#2d3748', color: 'white' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Conditions */}
      {activeSection === 'conditions' && (
        <div>
          {conditions.length === 0 && <p style={{ color: '#718096' }}>Loading conditions...</p>}
          {conditions.map((c, i) => (
            <div key={c.name || i} style={{ marginBottom: compact ? '6px' : '10px' }}>
              <strong style={{ color: '#f6e05e' }}>{c.name}</strong>
              <div style={{ color: '#a0aec0', marginTop: '2px', lineHeight: 1.4, fontSize: compact ? '0.75rem' : '0.85rem' }}>
                {typeof c.entries === 'string' ? cleanString(c.entries) : Array.isArray(c.entries) ? c.entries.map((e: any) => typeof e === 'string' ? cleanString(e) : '').filter(Boolean).join(' ') : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Common DCs */}
      {activeSection === 'dcs' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {DC_TABLE.map(d => (
              <div key={d.task} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #2d3748' }}>
                <span style={{ color: '#a0aec0' }}>{d.task}</span>
                <span style={{ fontWeight: 'bold', color: '#f6e05e' }}>DC {d.dc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {SKILL_DCS.map(d => (
              <div key={d.task} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #2d3748' }}>
                <span style={{ color: '#a0aec0' }}>{d.task}</span>
                <span style={{ fontWeight: 'bold', color: '#f6e05e' }}>DC {d.dc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cover */}
      {activeSection === 'cover' && (
        <div>
          {COVER_RULES.map(c => (
            <div key={c.name} style={{ marginBottom: compact ? '6px' : '12px', padding: '8px', background: '#1a202c', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                <strong style={{ color: '#f6e05e' }}>{c.name}</strong>
                <span style={{ color: '#a0aec0' }}>AC {c.ac} / Dex {c.dex}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#718096' }}>{c.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Light & Vision */}
      {activeSection === 'light' && (
        <div>
          {LIGHT_RULES.map(l => (
            <div key={l.name} style={{ marginBottom: compact ? '6px' : '12px' }}>
              <strong style={{ color: '#f6e05e' }}>{l.name}</strong>
              <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>{l.description}</div>
            </div>
          ))}
          <div style={{ marginTop: '12px', padding: '8px', background: '#1a202c', borderRadius: '4px' }}>
            <div><strong style={{ color: '#f6e05e' }}>Darkvision</strong> <span style={{ color: '#718096', fontSize: '0.8rem' }}>See in dim light as bright, darkness as dim (grey) out to a range</span></div>
            <div style={{ marginTop: '4px' }}><strong style={{ color: '#f6e05e' }}>Blindsight</strong> <span style={{ color: '#718096', fontSize: '0.8rem' }}>Perceive within a range without relying on sight</span></div>
            <div style={{ marginTop: '4px' }}><strong style={{ color: '#f6e05e' }}>Tremorsense</strong> <span style={{ color: '#718096', fontSize: '0.8rem' }}>Detect vibrations in the ground within a range</span></div>
            <div style={{ marginTop: '4px' }}><strong style={{ color: '#f6e05e' }}>Truesight</strong> <span style={{ color: '#718096', fontSize: '0.8rem' }}>See in normal/magical darkness, see invisible creatures, see into Ethereal Plane</span></div>
          </div>
        </div>
      )}

      {/* Exhaustion */}
      {activeSection === 'exhaustion' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: '4px 12px' }}>
            {EXHAUSTION_TABLE.map(e => (
              <div key={e.level} style={{ display: 'contents' }}>
                <span style={{ fontWeight: 'bold', color: '#f6e05e' }}>{e.level}</span>
                <span style={{ color: '#a0aec0', padding: '4px 0', borderBottom: '1px solid #2d3748' }}>{e.effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DM Password */}
      {activeSection === 'password' && (
        <DmPasswordPanel />
      )}

      {/* Travel Pace */}
      {activeSection === 'travel' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 60px 60px 50px 1fr', gap: '4px 8px', fontSize: '0.75rem' }}>
            <span style={{ color: '#718096', fontWeight: 'bold' }}>Pace</span>
            <span style={{ color: '#718096', fontWeight: 'bold' }}>Minute</span>
            <span style={{ color: '#718096', fontWeight: 'bold' }}>Hour</span>
            <span style={{ color: '#718096', fontWeight: 'bold' }}>Day</span>
            <span style={{ color: '#718096', fontWeight: 'bold' }}>Effect</span>
            {TRAVEL_PACE.map(t => (
              <>
                <span style={{ fontWeight: 'bold', color: '#f6e05e' }}>{t.pace}</span>
                <span style={{ color: '#a0aec0' }}>{t.minute}</span>
                <span style={{ color: '#a0aec0' }}>{t.hour}</span>
                <span style={{ color: '#a0aec0' }}>{t.day}</span>
                <span style={{ color: '#718096' }}>{t.effect}</span>
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
