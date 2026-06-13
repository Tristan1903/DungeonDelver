'use client';
// ===== 📘 FILE: ModulePanel.tsx =====
// 🎯 PURPOSE: Campaign module toggle & configuration hub — lists all optional modules with on/off toggles
//   and lazy-loads the per-module config panel (e.g. PietyConfig, DarkGiftsConfig) when expanded.
// 🧠 REACT CONCEPT: Lifting State Up + Conditional Rendering — the panel receives enabled modules and
//   config from the parent via props, and delegates per-module state changes upward. This is a
//   "control panel" pattern where the parent owns the data and the child only fires change callbacks.
// =====
import { useState } from 'react';
import { OPTIONAL_MODULES, MODULE_CONFIG_DEFAULTS, ModuleConfigMap, ModuleId } from '../../utils/campaignEngine';
import PietyConfig from './configs/PietyConfig';
import RenownConfig from './configs/RenownConfig';
import DarkGiftsConfig from './configs/DarkGiftsConfig';
import StressFearConfig from './configs/StressFearConfig';
import ShipMoraleConfig from './configs/ShipMoraleConfig';
import DefilingConfig from './configs/DefilingConfig';
import GroupPatronsConfig from './configs/GroupPatronsConfig';
import SidekicksConfig from './configs/SidekicksConfig';
import SupernaturalRegionsConfig from './configs/SupernaturalRegionsConfig';
import SiegeConfig from './configs/SiegeConfig';
import MadnessConfig from './configs/MadnessConfig';
import EpicBoonsConfig from './configs/EpicBoonsConfig';
import HonorSanityConfig from './configs/HonorSanityConfig';
import GrittyRealismConfig from './configs/GrittyRealismConfig';
import HeroPointsConfig from './configs/HeroPointsConfig';
import TransformationsConfig from './configs/TransformationsConfig';
import IsekaiConfig from './configs/IsekaiConfig';

export { OPTIONAL_MODULES };
export type { ModuleId };

interface ModulePanelProps {
  enabled: string[];
  onChange: (modules: string[]) => void;
  moduleConfig: Partial<ModuleConfigMap>;
  onModuleConfigChange: (moduleId: ModuleId, config: any) => void;
}

const CONFIG_PANELS: Record<string, React.FC<{ value: any; onChange: (v: any) => void }>> = {
  piety: PietyConfig,
  renown: RenownConfig,
  darkGifts: DarkGiftsConfig,
  stressFear: StressFearConfig,
  shipMorale: ShipMoraleConfig,
  defiling: DefilingConfig,
  groupPatrons: GroupPatronsConfig,
  sidekicks: SidekicksConfig,
  supernaturalRegions: SupernaturalRegionsConfig,
  siege: SiegeConfig,
  madness: MadnessConfig,
  epicBoons: EpicBoonsConfig,
  honorSanity: HonorSanityConfig,
  grittyRealism: GrittyRealismConfig,
  heroPoints: HeroPointsConfig,
  transformations: TransformationsConfig,
  isekai: IsekaiConfig,
};

export default function ModulePanel({ enabled, onChange, moduleConfig, onModuleConfigChange }: ModulePanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (enabled.includes(id)) onChange(enabled.filter((m) => m !== id));
    else onChange([...enabled, id]);
  };

  return (
    <div>
      {OPTIONAL_MODULES.map((mod) => {
        const isOn = enabled.includes(mod.id);
        const ConfigPanel = CONFIG_PANELS[mod.id];
        const defaults = MODULE_CONFIG_DEFAULTS[mod.id as ModuleId];
        const stored = (moduleConfig as any)?.[mod.id] ?? {};
        // Merge with defaults and defensively normalize expected array fields
        let value: any = { ...defaults, ...stored };

        if (mod.id === 'piety' && !Array.isArray((value as any).thresholds)) {
          (value as any).thresholds = (defaults as any).thresholds;
        }
        if (mod.id === 'renown' && !Array.isArray((value as any).factions)) {
          (value as any).factions = (defaults as any).factions;
        }
        if (mod.id === 'darkGifts' && !Array.isArray((value as any).gifts)) {
          (value as any).gifts = (defaults as any).gifts;
        }
        if (mod.id === 'shipMorale') {
          if (!Array.isArray((value as any).officerRoles)) (value as any).officerRoles = (defaults as any).officerRoles;
          if (!Array.isArray((value as any).moraleModifiers)) (value as any).moraleModifiers = (defaults as any).moraleModifiers;
        }
        if (mod.id === 'defiling' && !Array.isArray((value as any).preserveOptions)) {
          (value as any).preserveOptions = (defaults as any).preserveOptions;
        }
        if (mod.id === 'groupPatrons' && !Array.isArray((value as any).patrons)) {
          (value as any).patrons = (defaults as any).patrons;
        }
        if (mod.id === 'sidekicks' && !Array.isArray((value as any).statBlocks)) {
          (value as any).statBlocks = (defaults as any).statBlocks;
        }
        if (mod.id === 'supernaturalRegions' && !Array.isArray((value as any).regions)) {
          (value as any).regions = (defaults as any).regions;
        }
        if (mod.id === 'siege' && !Array.isArray((value as any).weapons)) {
          (value as any).weapons = (defaults as any).weapons;
        }
        if (mod.id === 'madness') {
          if (!Array.isArray((value as any).shortTermTable)) (value as any).shortTermTable = (defaults as any).shortTermTable;
          if (!Array.isArray((value as any).longTermTable)) (value as any).longTermTable = (defaults as any).longTermTable;
          if (!Array.isArray((value as any).indefiniteTable)) (value as any).indefiniteTable = (defaults as any).indefiniteTable;
        }
        if (mod.id === 'epicBoons' && !Array.isArray((value as any).boons)) {
          (value as any).boons = (defaults as any).boons;
        }
        if (mod.id === 'transformations') {
          if (!Array.isArray((value as any).types)) (value as any).types = (defaults as any).types;
          if (typeof (value as any).activeTransformations !== 'object') (value as any).activeTransformations = {};
        }
        if (mod.id === 'isekai' && !Array.isArray((value as any).types)) {
          (value as any).types = (defaults as any).types;
        }
        return (
          <div key={mod.id} style={{
            background: '#2d3748', padding: '15px', borderRadius: '8px', marginBottom: '10px',
            border: isOn ? '1px solid #b8860b' : '1px solid #4a5568',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{mod.name}</strong>
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#a0aec0' }}>{mod.description}</p>
              </div>
              <button
                onClick={() => toggle(mod.id)}
                style={{
                  padding: '6px 14px', background: isOn ? '#48bb78' : '#4a5568',
                  border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer',
                }}
              >
                {isOn ? 'ON' : 'OFF'}
              </button>
            </div>
            {isOn && (
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => setExpanded(expanded === mod.id ? null : mod.id)}
                  style={{
                    fontSize: '0.8rem', background: 'transparent', border: '1px solid #4a5568',
                    color: '#cbd5e0', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  {expanded === mod.id ? 'Hide Config' : 'Configure'}
                </button>
                {expanded === mod.id && ConfigPanel && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#1a202c', borderRadius: '6px' }}>
                    <ConfigPanel
                      value={value}
                      onChange={(v: any) => onModuleConfigChange(mod.id as ModuleId, v)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
