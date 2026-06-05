'use client';
import { useState } from 'react';
import { OPTIONAL_MODULES, CAMPAIGN_TONES, CAMPAIGN_PANTHEONS, saveCampaignConfig, loadCampaignConfig, type CampaignConfig, type RacePresetId, type CustomDeity } from '../utils/campaignEngine';
import { createCampaign } from '../utils/campaignStorage';
import PantheonConfig from './PantheonConfig';

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modal: React.CSSProperties = { background: '#0c0e14', color: '#e8dcc8', borderRadius: '12px', border: '1px solid #3d3528', width: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' };
const hd: React.CSSProperties = { padding: '20px 24px 12px', borderBottom: '1px solid #3d3528' };
const body: React.CSSProperties = { padding: '20px 24px', overflowY: 'auto', flex: 1 };
const footer: React.CSSProperties = { padding: '12px 24px 20px', borderTop: '1px solid #3d3528', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const inp: React.CSSProperties = { background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', padding: '10px 14px', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
const ta: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: '0.75rem', color: '#8a7e6a', marginBottom: '4px', display: 'block' };
const btn: React.CSSProperties = { background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '6px', padding: '10px 24px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'transparent', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', padding: '10px 24px', fontSize: '0.85rem', cursor: 'pointer' };

const STEPS = ['Identity', 'Modules', 'Rules', 'Review'];

interface WizardState {
  name: string; description: string; toneTheme: string; enabledModules: string[];
  restVariant: 'standard' | 'gritty-realism' | 'epic-heroism';
  startingLevel: number; startingGold: string; houseRules: string;
  safetyEnabled: boolean; safetyType: 'lines-veils' | 'x-card' | 'both'; safetyNotes: string; racePreset: string;
  pantheonSetting: string; customDeities: CustomDeity[];
}

function configToState(c: CampaignConfig): WizardState {
  return {
    name: c.name, description: c.description, toneTheme: c.toneTheme, enabledModules: c.enabledModules,
    restVariant: c.restVariant, startingLevel: c.startingLevel, startingGold: c.startingGold, houseRules: c.houseRules,
    safetyEnabled: c.safetyTools.enabled, safetyType: c.safetyTools.type, safetyNotes: c.safetyTools.notes,
    racePreset: c.racePreset || '',
    pantheonSetting: c.pantheonSetting || '', customDeities: c.customDeities || [],
  };
}

const defaultState: WizardState = {
  name: '', description: '', toneTheme: '', enabledModules: [],
  restVariant: 'standard', startingLevel: 1, startingGold: 'standard',
  houseRules: '', safetyEnabled: false, safetyType: 'both', safetyNotes: '', racePreset: '',
  pantheonSetting: '', customDeities: [],
};

const ALL_RACE_PRESET_OPTIONS = [
  { value: '', label: 'None (all races available)' },
  { value: 'standard', label: 'Standard' },
  { value: 'phb', label: 'PHB Only' },
  { value: 'greyhawk', label: 'Greyhawk' },
  { value: 'grimHollow', label: 'Grim Hollow' },
  { value: 'ravenloft', label: 'Ravenloft' },
  { value: 'eberron', label: 'Eberron' },
  { value: 'exandria', label: 'Exandria' },
  { value: 'theros', label: 'Theros' },
  { value: 'ravnica', label: 'Ravnica' },
  { value: 'spelljammer', label: 'Spelljammer' },
  { value: 'dragonlance', label: 'Dragonlance' },
  { value: 'strixhaven', label: 'Strixhaven' },
  { value: 'darkSun', label: 'Dark Sun' },
];

interface Props {
  onClose: () => void;
  onCreated?: (campaignId: string) => void;
  onSaved?: () => void;
  campaignId?: string;
  initialData?: CampaignConfig;
}

export default function CampaignWizard({ onClose, onCreated, onSaved, campaignId, initialData }: Props) {
  const isEdit = !!campaignId;
  const [step, setStep] = useState(0);
  const [s, setS] = useState<WizardState>(initialData ? configToState(initialData) : defaultState);

  const set = (patch: Partial<WizardState>) => setS(prev => ({ ...prev, ...patch }));

  const handleTone = (toneId: string) => {
    const tone = CAMPAIGN_TONES.find(t => t.id === toneId);
    if (!tone) { set({ toneTheme: '', enabledModules: [], restVariant: 'standard' }); return; }
    set({ toneTheme: toneId, enabledModules: tone.autoModules, restVariant: tone.restVariant });
  };

  const toggleModule = (id: string) => {
    set({ enabledModules: s.enabledModules.includes(id) ? s.enabledModules.filter(m => m !== id) : [...s.enabledModules, id] });
  };

  const buildConfig = (): CampaignConfig => ({
    name: s.name.trim(),
    description: s.description.trim(),
    toneTheme: s.toneTheme,
    enabledModules: s.enabledModules,
    moduleConfig: initialData?.moduleConfig || {},
    racePreset: (s.racePreset || undefined) as RacePresetId | undefined,
    restVariant: s.restVariant,
    startingLevel: s.startingLevel,
    startingGold: s.startingGold,
    houseRules: s.houseRules.trim(),
    safetyTools: { enabled: s.safetyEnabled, type: s.safetyType, notes: s.safetyNotes.trim() },
    pantheonSetting: s.pantheonSetting || '',
    customDeities: s.customDeities || [],
    updatedAt: new Date().toISOString(),
  });

  const handleSave = () => {
    const config = buildConfig();
    if (isEdit && campaignId) {
      saveCampaignConfig(config, campaignId);
      onSaved?.();
    } else {
      const entry = createCampaign(s.name.trim());
      saveCampaignConfig(config, entry.id);
      onCreated?.(entry.id);
    }
  };

  const canNext = () => {
    if (step === 0) return s.name.trim().length > 0;
    return true;
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={hd}>
          <h2 style={{ margin: 0, color: '#c9a84c', fontSize: '1.1rem', fontFamily: '"MedievalSharp", serif' }}>
            {isEdit ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
          {!isEdit && (
            <>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                {STEPS.map((name, i) => (
                  <div key={name} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= step ? '#c9a84c' : '#3d3528', transition: 'background 0.2s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', color: '#5a5248' }}>
                {STEPS.map((name, i) => (
                  <span key={name} style={{ fontWeight: i === step ? 700 : 400, color: i === step ? '#c9a84c' : '#5a5248' }}>{name}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={body}>
          {/* Step 0 — Identity */}
          {(step === 0 || isEdit) && (isEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Campaign Name</label>
                <input value={s.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Curse of Strahd" style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea value={s.description} onChange={e => set({ description: e.target.value })} placeholder="A brief overview..." style={ta} />
              </div>
              <div>
                <label style={lbl}>Rest Variant</label>
                <select value={s.restVariant} onChange={e => set({ restVariant: e.target.value as any })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="standard">Standard (1hr short, 8hr long)</option>
                  <option value="gritty-realism">Gritty Realism (8hr short, 7-day long)</option>
                  <option value="epic-heroism">Epic Heroism (5min short, 1hr long)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Starting Level</label>
                  <input type="number" min={1} max={20} value={s.startingLevel} onChange={e => set({ startingLevel: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Starting Gold</label>
                  <select value={s.startingGold} onChange={e => set({ startingGold: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="standard">Standard Equipment</option>
                    <option value="rolled-2d4">Rolled (2d4 × 10 gp)</option>
                    <option value="fixed-150">Fixed (150 gp)</option>
                    <option value="fixed-500">High Fantasy (500 gp)</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Campaign Name *</label>
                <input value={s.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Curse of Strahd" style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea value={s.description} onChange={e => set({ description: e.target.value })} placeholder="A brief overview of the campaign setting and premise..." style={ta} />
              </div>
              <div>
                <label style={lbl}>Tone / Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button onClick={() => handleTone('')} style={{ ...btnGhost, textAlign: 'left', padding: '8px 12px', fontSize: '0.78rem', background: !s.toneTheme ? '#c9a84c' : 'transparent', color: !s.toneTheme ? '#0c0e14' : '#e8dcc8', borderColor: !s.toneTheme ? '#c9a84c' : '#3d3528' }}>None (Manual)</button>
                  {CAMPAIGN_TONES.map(t => (
                    <button key={t.id} onClick={() => handleTone(t.id)} style={{ ...btnGhost, textAlign: 'left', padding: '8px 12px', fontSize: '0.78rem', background: s.toneTheme === t.id ? '#c9a84c' : 'transparent', color: s.toneTheme === t.id ? '#0c0e14' : '#e8dcc8', borderColor: s.toneTheme === t.id ? '#c9a84c' : '#3d3528' }}>
                      <strong>{t.label}</strong>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Step 1 — Modules */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {s.toneTheme && <p style={{ fontSize: '0.75rem', color: '#8a7e6a', marginBottom: '8px' }}>Modules auto-selected by tone · toggle any on/off</p>}
              {OPTIONAL_MODULES.map(m => {
                const on = s.enabledModules.includes(m.id);
                return (
                  <div key={m.id} onClick={() => toggleModule(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: on ? 'rgba(201,168,76,0.08)' : '#1a1714', border: `1px solid ${on ? '#c9a84c' : '#3d3528'}`, borderRadius: '6px', cursor: 'pointer' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '3px', flexShrink: 0, background: on ? '#c9a84c' : 'transparent', border: `2px solid ${on ? '#c9a84c' : '#5a5248'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? '#0c0e14' : 'transparent', fontSize: '0.7rem', fontWeight: 700 }}>{on ? '✓' : ''}</div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: on ? 700 : 400, color: on ? '#c9a84c' : '#e8dcc8' }}>{m.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#5a5248' }}>{m.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2 — Rules */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Race Preset</label>
                <select value={s.racePreset} onChange={e => set({ racePreset: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  {ALL_RACE_PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ borderTop: '1px solid #3d3528', paddingTop: '12px' }}>
                <PantheonConfig
                  pantheonSetting={s.pantheonSetting}
                  customDeities={s.customDeities}
                  onChange={(setting, customs) => set({ pantheonSetting: setting, customDeities: customs })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Starting Level</label>
                  <input type="number" min={1} max={20} value={s.startingLevel} onChange={e => set({ startingLevel: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Starting Gold</label>
                  <select value={s.startingGold} onChange={e => set({ startingGold: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="standard">Standard Equipment</option>
                    <option value="rolled-2d4">Rolled (2d4 × 10 gp)</option>
                    <option value="fixed-150">Fixed (150 gp)</option>
                    <option value="fixed-500">High Fantasy (500 gp)</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>House Rules</label>
                <textarea value={s.houseRules} onChange={e => set({ houseRules: e.target.value })} placeholder="Any homebrew or house rules..." style={{ ...ta, minHeight: '80px' }} />
              </div>
              <div>
                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={s.safetyEnabled} onChange={e => set({ safetyEnabled: e.target.checked })} style={{ accentColor: '#c9a84c' }} />
                  Safety Tools
                </label>
                {s.safetyEnabled && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select value={s.safetyType} onChange={e => set({ safetyType: e.target.value as any })} style={{ ...inp, cursor: 'pointer' }}>
                      <option value="lines-veils">Lines & Veils</option>
                      <option value="x-card">X-Card</option>
                      <option value="both">Both</option>
                    </select>
                    <textarea value={s.safetyNotes} onChange={e => set({ safetyNotes: e.target.value })} placeholder="Notes about safety tools (optional)..." style={{ ...ta, minHeight: '50px' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#c9a84c', fontSize: '1rem' }}>Review</h3>
              <div style={{ background: '#1a1714', borderRadius: '6px', padding: '12px', border: '1px solid #3d3528', fontSize: '0.82rem', lineHeight: 1.6 }}>
                <ReviewRow label="Name" value={s.name} />
                {s.description && <ReviewRow label="Description" value={s.description} />}
                {s.toneTheme && <ReviewRow label="Tone" value={CAMPAIGN_TONES.find(t => t.id === s.toneTheme)?.label || s.toneTheme} />}
                <ReviewRow label="Rest Variant" value={{ 'standard': 'Standard', 'gritty-realism': 'Gritty Realism', 'epic-heroism': 'Epic Heroism' }[s.restVariant] || s.restVariant} />
                {s.racePreset && <ReviewRow label="Race Preset" value={ALL_RACE_PRESET_OPTIONS.find(o => o.value === s.racePreset)?.label || s.racePreset} />}
                {s.pantheonSetting && <ReviewRow label="Pantheon" value={(CAMPAIGN_PANTHEONS.find(p => p.id === s.pantheonSetting)?.label || s.pantheonSetting) + (s.customDeities.length > 0 ? ` + ${s.customDeities.length} custom` : '')} />}
                <ReviewRow label="Starting Level" value={`${s.startingLevel}`} />
                <ReviewRow label="Starting Gold" value={s.startingGold} />
                <ReviewRow label="Modules" value={s.enabledModules.length > 0 ? s.enabledModules.map(m => OPTIONAL_MODULES.find(o => o.id === m)?.name || m).join(', ') : 'None'} />
                <ReviewRow label="House Rules" value={s.houseRules || 'None'} />
                {s.safetyEnabled && <ReviewRow label="Safety Tools" value={`${s.safetyType}${s.safetyNotes ? ` — ${s.safetyNotes}` : ''}`} />}
              </div>
            </div>
          )}
        </div>

        <div style={footer}>
          <button onClick={step === 0 ? onClose : () => setStep(step - 1)} style={btnGhost}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {!isEdit && <span style={{ fontSize: '0.7rem', color: '#5a5248' }}>Step {step + 1} of {STEPS.length}</span>}
          {!isEdit && step < STEPS.length - 1 ? (
            <button onClick={() => canNext() && setStep(step + 1)} style={{ ...btn, opacity: canNext() ? 1 : 0.5 }} disabled={!canNext()}>Next →</button>
          ) : (
            <button onClick={isEdit || step === STEPS.length - 1 ? handleSave : undefined} style={btn}>
              {isEdit ? 'Save Changes' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
      <span style={{ color: '#c9a84c', fontWeight: 700, minWidth: '100px', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#e8dcc8' }}>{value}</span>
    </div>
  );
}
