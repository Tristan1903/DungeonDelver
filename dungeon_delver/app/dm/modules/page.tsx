'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ModulePanel from '../../../components/modules/ModulePanel';
import CampaignRacePresetSelector from '../../../components/modules/configs/CampaignRacePresetSelector';
import { loadCampaignConfig, saveCampaignConfig, clearCampaignConfig, ModuleConfigMap, ModuleId, CampaignConfig, MODULE_CONFIG_DEFAULTS, type RacePresetId } from '../../../utils/campaignEngine';

const PRESETS: Array<{ id: string; name: string; modules: ModuleId[]; description: string }> = [
  { id: 'classic-dmg', name: 'Classic DMG', modules: ['madness', 'honorSanity', 'grittyRealism', 'heroPoints'], description: 'Traditional optional rule stack for grittier campaigns.' },
  { id: 'horror-arc', name: 'Horror Arc', modules: ['darkGifts', 'stressFear', 'madness'], description: 'Fear, dread, and corruption-focused play.' },
  { id: 'grim-hollow', name: 'Grim Hollow', modules: ['transformations', 'darkGifts', 'stressFear', 'madness', 'grittyRealism'], description: 'Dark fantasy with character transformations from the Player\'s Guide.' },
  { id: 'epic-play', name: 'Epic Play', modules: ['epicBoons', 'piety', 'renown', 'heroPoints'], description: 'High-power progression and faction influence.' },
];

function normalizeImportedCampaign(raw: any): CampaignConfig {
  const enabledModules = Array.isArray(raw?.enabledModules) ? raw.enabledModules.filter((m: unknown): m is string => typeof m === 'string') : [];
  const moduleConfig: Partial<ModuleConfigMap> = {};
  const rawCfg = raw?.moduleConfig && typeof raw.moduleConfig === 'object' ? raw.moduleConfig : {};
  for (const moduleId of Object.keys(MODULE_CONFIG_DEFAULTS) as ModuleId[]) {
    const defaults = MODULE_CONFIG_DEFAULTS[moduleId] as Record<string, any>;
    const incoming = rawCfg[moduleId] && typeof rawCfg[moduleId] === 'object' ? rawCfg[moduleId] : {};
    const merged: Record<string, any> = { ...defaults, ...incoming };
    Object.keys(defaults).forEach((k) => { if (Array.isArray(defaults[k]) && !Array.isArray(merged[k])) merged[k] = defaults[k]; });
    moduleConfig[moduleId] = merged as any;
  }
  const racePreset = typeof raw?.racePreset === 'string' && ['standard', 'phb', 'greyhawk', 'grimHollow', 'ravenloft', 'eberron', 'exandria', 'theros', 'ravnica', 'spelljammer', 'dragonlance', 'strixhaven', 'darkSun'].includes(raw.racePreset) ? raw.racePreset as RacePresetId : undefined;
  return { name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Default Campaign', enabledModules, moduleConfig, racePreset, updatedAt: new Date().toISOString() };
}

export default function ModulesPage() {
  const [config, setConfig] = useState<CampaignConfig>({ name: 'Default Campaign', enabledModules: [], moduleConfig: {}, updatedAt: '' });
  const [dirty, setDirty] = useState(false);
  const [importError, setImportError] = useState('');
  const [health, setHealth] = useState<{ ok: boolean; notes: string[] }>({ ok: true, notes: [] });

  useEffect(() => { const loaded = loadCampaignConfig(); setConfig(normalizeImportedCampaign(loaded)); }, []);

  const persist = useCallback((next: CampaignConfig) => {
    const normalized = normalizeImportedCampaign(next);
    setConfig(normalized);
    saveCampaignConfig(normalized);
    setDirty(true);
    setTimeout(() => setDirty(false), 1800);
  }, []);

  useEffect(() => {
    const notes: string[] = [];
    if (!config.name.trim()) notes.push('Campaign name is blank.');
    if (!Array.isArray(config.enabledModules)) notes.push('Enabled modules payload was invalid and was normalized.');
    for (const moduleId of config.enabledModules) { if (!(moduleId in MODULE_CONFIG_DEFAULTS)) notes.push(`Unknown module id in enabled list: ${moduleId}`); }
    setHealth({ ok: notes.length === 0, notes });
  }, [config]);

  const enabledModuleNames = useMemo(() => config.enabledModules.map((m) => m.replace(/([A-Z])/g, ' $1')).map((m) => m.charAt(0).toUpperCase() + m.slice(1)), [config.enabledModules]);

  const handleModulesChange = (modules: string[]) => { persist({ ...config, enabledModules: modules }); };
  const handleModuleConfigChange = (moduleId: ModuleId, moduleConfig: any) => { persist({ ...config, moduleConfig: { ...config.moduleConfig, [moduleId]: moduleConfig } as Partial<ModuleConfigMap> }); };
  const applyPreset = (presetId: string) => { const preset = PRESETS.find((p) => p.id === presetId); if (!preset) return; persist({ ...config, enabledModules: Array.from(new Set(preset.modules)) }); };

  const handleReset = () => {
    if (!confirm('Reset all optional subsystem config to defaults?')) return;
    clearCampaignConfig();
    const clean = normalizeImportedCampaign({ name: 'Default Campaign', enabledModules: [], moduleConfig: {}, updatedAt: new Date().toISOString() });
    setConfig(clean);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_campaign.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      setImportError('');
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (!file) return;
      try { const text = await file.text(); const parsed = JSON.parse(text); persist(normalizeImportedCampaign(parsed)); }
      catch { setImportError('Failed to parse campaign file. Use exported JSON from this page.'); }
    };
    input.click();
  };

  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/dm" style={{ color: '#a0aec0' }}>← DM Hub</Link>
      <h1 style={{ color: 'var(--dungeon-gold, #b8860b)', fontFamily: 'serif', marginBottom: '6px' }}>Optional Subsystems 2.0</h1>
      <p style={{ color: '#a0aec0', marginBottom: '16px' }}>Configure variant rules safely with presets, schema normalization, and campaign-level inheritance.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px', border: '1px solid #4a5568' }}>
          <label style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Campaign Name</label>
          <input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} onBlur={() => config.name.trim() && persist(config)} placeholder="My Campaign" style={{ width: '100%', marginTop: '6px', padding: '8px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white' }} />
          {dirty && <span style={{ color: '#48bb78', fontSize: '0.8rem', display: 'inline-block', marginTop: '6px' }}>Saved ✓</span>}
        </div>
        <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px', border: '1px solid #4a5568' }}>
          <div style={{ color: '#a0aec0', fontSize: '0.82rem' }}>Subsystem Health</div>
          <div style={{ marginTop: '8px', color: health.ok ? '#48bb78' : '#f6ad55', fontWeight: 700 }}>{health.ok ? 'Healthy' : 'Needs Attention'}</div>
          {!health.ok && health.notes.map((note, i) => (<div key={i} style={{ fontSize: '0.76rem', color: '#f6ad55', marginTop: '4px' }}>• {note}</div>))}
        </div>
      </div>

      <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px', border: '1px solid #4a5568', marginBottom: '12px' }}>
        <div style={{ color: '#f6e05e', marginBottom: '8px', fontWeight: 700 }}>Quick Presets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
          {PRESETS.map((preset) => (
            <button key={preset.id} onClick={() => applyPreset(preset.id)} style={{ textAlign: 'left', background: '#1a202c', border: '1px solid #4a5568', color: 'white', borderRadius: '6px', padding: '10px', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{preset.name}</div>
              <div style={{ color: '#a0aec0', fontSize: '0.75rem', marginTop: '4px' }}>{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={handleExport} style={btnStyle}>Export JSON</button>
        <button onClick={handleImport} style={{ ...btnStyle, background: '#4a5568' }}>Import JSON</button>
        <button onClick={handleReset} style={{ ...btnStyle, background: '#e53e3e' }}>Reset Defaults</button>
      </div>

      {importError && <p style={{ color: '#fc8181', fontSize: '0.85rem', marginBottom: '10px' }}>{importError}</p>}

      <div style={{ marginBottom: '12px', color: '#a0aec0', fontSize: '0.82rem' }}>Enabled: {enabledModuleNames.length ? enabledModuleNames.join(', ') : 'No optional modules enabled'}</div>

      <ModulePanel enabled={config.enabledModules} onChange={handleModulesChange} moduleConfig={config.moduleConfig} onModuleConfigChange={handleModuleConfigChange} />

      <CampaignRacePresetSelector value={config.racePreset} onChange={(preset) => persist({ ...config, racePreset: preset })} />

      <div style={{ marginTop: '16px', padding: '12px', background: '#2d3748', borderRadius: '8px' }}>
        <h3 style={{ color: '#b8860b', margin: '0 0 8px', fontSize: '1rem' }}>Campaign Linking</h3>
        <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: 0 }}>Characters with a matching <code style={{ background: '#1a202c', padding: '1px 4px', borderRadius: 3 }}>campaignName</code> inherit enabled module toggles and config blocks from this campaign profile.</p>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { padding: '8px 16px', background: '#b8860b', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' };
