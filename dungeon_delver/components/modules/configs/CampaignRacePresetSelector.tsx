'use client';
// ===== 📘 FILE: CampaignRacePresetSelector.tsx =====
// 🎯 PURPOSE: Dropdown selector for campaign-wide race restrictions during character creation.
//   Reads available presets from campaignEngine and shows the current preset's description.
// 🧠 REACT CONCEPT: Controlled Select Element — the <select> value is driven by props and changes
//   are emitted upward via onChange, keeping the parent as the single source of truth.
// =====
import { CAMPAIGN_RACE_PRESETS, type RacePresetId } from '../../../utils/campaignEngine';

interface Props {
  value: RacePresetId | undefined;
  onChange: (preset: RacePresetId) => void;
}

export default function CampaignRacePresetSelector({ value, onChange }: Props) {
  const current = value || 'standard';
  return (
    <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px', border: '1px solid #4a5568', marginTop: '12px' }}>
      <div style={{ color: '#f6e05e', marginBottom: '8px', fontWeight: 700 }}>Race Preset</div>
      <p style={{ color: '#a0aec0', fontSize: '0.82rem', marginBottom: '12px' }}>
        Restricts which races are available during character creation. Characters outside the allowed list will still be editable.
      </p>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as RacePresetId)}
        style={{
          width: '100%', padding: '10px', background: '#1a202c', border: '1px solid #4a5568',
          borderRadius: '4px', color: 'white', fontSize: '0.9rem', marginBottom: '10px',
        }}
      >
        {CAMPAIGN_RACE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>{preset.label}</option>
        ))}
      </select>
      <div style={{ fontSize: '0.82rem', color: '#a0aec0', lineHeight: 1.5 }}>
        {CAMPAIGN_RACE_PRESETS.find(p => p.id === current)?.description}
      </div>
    </div>
  );
}
