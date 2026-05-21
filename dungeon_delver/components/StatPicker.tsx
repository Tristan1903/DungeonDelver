'use client';
import { useState } from 'react';

export default function StatPicker({ onComplete }: { onComplete: (stats: any) => void }) {
  const [available, setAvailable] = useState([15, 14, 13, 12, 10, 8]);
  const [stats, setStats] = useState<Record<string, number | null>>({
    str: null, dex: null, con: null, int: null, wis: null, cha: null
  });

  const assignStat = (statName: string, value: number) => {
    // 1. If already assigned, put the old value back in 'available'
    const oldValue = stats[statName];
    
    // 2. Update the assignment
    setStats({ ...stats, [statName]: value });
    
    // 3. Remove the chosen value from available, add back the old one
    const newAvailable = available.filter(n => n !== value);
    if (oldValue) newAvailable.push(oldValue);
    setAvailable(newAvailable.sort((a, b) => b - a));
  };

  return (
    <div style={{ padding: '1rem', background: '#1a1a1a', color: 'white' }}>
      <h3>Assign Stats (Standard Array)</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {available.map(val => <span key={val} style={{ padding: '10px', border: '1px solid gold' }}>{val}</span>)}
      </div>

      {Object.keys(stats).map(stat => (
        <div key={stat} style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '10px' }}>{stat.toUpperCase()}:</label>
          <select 
            onChange={(e) => assignStat(stat, Number(e.target.value))}
            value={stats[stat] || ""}
          >
            <option value="">Select...</option>
            {[...available, stats[stat]].filter(Boolean).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      ))}
      
      <button 
        disabled={Object.values(stats).includes(null)}
        onClick={() => onComplete(stats)}
      >
        Confirm Stats
      </button>
    </div>
  );
}