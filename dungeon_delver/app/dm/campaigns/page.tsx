'use client';
// ===== 📘 FILE: app/dm/campaigns/page.tsx =====
// 🎯 PURPOSE: Campaign management — CRUD for campaigns with wizard creation, settings editing,
//   character linking/unlinking, module summary, house rules, and a campaign dashboard view.
// 🧠 REACT CONCEPT: Complex CRUD with Sub-views — manages campaigns (list/detail/dashboard views),
//   character linking, race presets, and inline editing. Uses functional updates and lazy state
//   for the compound `DashboardView` sub-component.
// =====
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveCampaign, getCampaigns, setActiveCampaign, renameCampaign, deleteCampaign, type CampaignEntry } from '../../../utils/campaignStorage';
import { loadCampaignConfig, saveCampaignConfig, OPTIONAL_MODULES, getModuleConfig, CAMPAIGN_TONES, CAMPAIGN_PANTHEONS, type CampaignConfig, type RacePresetId } from '../../../utils/campaignEngine';
import { getLiveStats } from '../../../utils/characterEngine';
import { CHAR_STORAGE_PREFIX } from '../../../utils/storageEngine';
import CampaignWizard from '../../../components/CampaignWizard';
import PantheonConfig from '../../../components/PantheonConfig';

const card: React.CSSProperties = { background: '#1a1714', border: '1px solid #3d3528', borderRadius: '10px', padding: '16px' };
const input: React.CSSProperties = { background: '#0c0e14', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { background: '#c9a84c', border: 'none', color: '#0c0e14', borderRadius: '6px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'transparent', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { background: '#5c1a1a', border: 'none', color: '#e8dcc8', borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' };
const cardHover = { ...card, cursor: 'pointer' };

const RACE_PRESET_OPTIONS = [
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

const TONE_LABELS: Record<string, string> = {};
CAMPAIGN_TONES.forEach(t => { TONE_LABELS[t.id] = t.label; });
const PANTHEON_LABELS: Record<string, string> = {};
CAMPAIGN_PANTHEONS.forEach(p => { PANTHEON_LABELS[p.id] = p.label; });

function getCampaignChars(campaignId: string): any[] {
  const chars: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CHAR_STORAGE_PREFIX)) continue;
      try { const raw = localStorage.getItem(key); if (!raw) continue; const char = JSON.parse(raw); if ((char.campaignId || 'default') === campaignId) chars.push(char); } catch { continue; }
    }
  } catch { }
  return chars;
}

function countSessionsByCampaign(campaignId: string): number {
  try { const raw = localStorage.getItem(`dd-${campaignId}-sessions`); if (!raw) return 0; const data = JSON.parse(raw); return data.sessions?.length || 0; } catch { return 0; }
}

function charSummary(char: any): string {
  if (!char.classLevels?.length) return '—';
  return char.classLevels.map((cl: any) => `${cl.className} ${cl.level}`).join(' / ');
}

function passivePerception(char: any): number {
  const wis = char.baseStats?.wis ?? 10;
  const prof = char.skills?.perception?.proficient ? (char.attributes?.profBonus || 2) : 0;
  return 10 + Math.floor((wis - 10) / 2) + prof;
}

function saveDC(char: any): string {
  if (!char.classLevels?.length) return '—';
  const casters = char.classLevels.filter((cl: any) => ['Wizard', 'Sorcerer', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Warlock', 'Artificer'].includes(cl.className));
  if (casters.length === 0) return '—';
  const abil = casters[0].className === 'Wizard' || casters[0].className === 'Artificer' ? 'int' : casters[0].className === 'Cleric' || casters[0].className === 'Druid' || casters[0].className === 'Paladin' ? 'wis' : 'cha';
  const mod = Math.floor(((char.baseStats as any)?.[abil] || 10) - 10) / 2;
  return `${8 + mod + (char.attributes?.profBonus || 2)}`;
}

function getModuleSummary(mid: string, config: CampaignConfig): string | null {
  try {
    if (mid === 'piety') { const c = getModuleConfig(config, 'piety'); return `Deity: ${c.deityName}`; }
    if (mid === 'honorSanity') { const c = getModuleConfig(config, 'honorSanity'); return `Honor ${c.defaultHonor} · Sanity ${c.defaultSanity}`; }
    if (mid === 'heroPoints') { const c = getModuleConfig(config, 'heroPoints'); return `Pool: ${c.poolSize} (max ${c.maxPool})${c.resetPerSession ? ' · reset/session' : ''}`; }
    if (mid === 'grittyRealism') { const c = getModuleConfig(config, 'grittyRealism'); return `${c.shortRestHours}hr short · ${c.longRestDays}d long`; }
    if (mid === 'stressFear') { const c = getModuleConfig(config, 'stressFear'); return `Frightened DC ${c.stressFrightenedDC} · Horrified DC ${c.stressHorrifiedDC}`; }
  } catch { }
  return null;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaignsState] = useState<CampaignEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(getActiveCampaign());
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(() => { setCampaignsState(getCampaigns()); setActiveId(getActiveCampaign()); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const sessionCounts: Record<string, number> = {};
  if (typeof window !== 'undefined') { campaigns.forEach(c => { sessionCounts[c.id] = countSessionsByCampaign(c.id); }); }

  const activeCampaign = activeId ? campaigns.find(c => c.id === activeId) : null;

  const handleSwitch = (id: string) => { setActiveCampaign(id); window.location.reload(); };
  const handleWizardCreated = (campaignId: string) => { setShowWizard(false); setActiveCampaign(campaignId); window.location.reload(); };

  const handleRename = (id: string) => {
    if (!editName.trim()) { setEditingNameId(null); return; }
    renameCampaign(id, editName.trim()); setEditingNameId(null); refresh();
  };

  const handleDelete = (id: string) => { deleteCampaign(id); setDeleteConfirm(null); if (activeId === id) window.location.reload(); else refresh(); };

  const handleRacePresetChange = (campaignId: string, value: string) => {
    const c = loadCampaignConfig(campaignId);
    c.racePreset = (value || undefined) as RacePresetId | undefined;
    saveCampaignConfig(c, campaignId);
    refresh();
  };

  const [dashboardId, setDashboardId] = useState<string | null>(null);

  const handleOpenDashboard = (campaignId: string) => {
    setDashboardId(campaignId);
  };

  const dashboardEntry = dashboardId ? campaigns.find(c => c.id === dashboardId) : null;
  const dashboardConfig = dashboardEntry ? (() => { try { return loadCampaignConfig(dashboardEntry.id); } catch { return null; } })() : null;
  const dashboardChars = dashboardId ? getCampaignChars(dashboardId) : [];

  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [linkCharId, setLinkCharId] = useState('');

  const unlinkedChars = (() => {
    const result: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(CHAR_STORAGE_PREFIX)) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const ch = JSON.parse(raw);
          if (ch.campaignId !== linkTarget && (!ch.campaignId || ch.campaignId === 'default')) {
            result.push(ch);
          }
        } catch { continue; }
      }
    } catch { }
    return result;
  })();

  const handleLinkCharacter = () => {
    if (!linkTarget || !linkCharId) return;
    try {
      const key = `${CHAR_STORAGE_PREFIX}${linkCharId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const ch = JSON.parse(raw);
      const campaignName = campaigns.find(c => c.id === linkTarget)?.name || '';
      ch.campaignId = linkTarget;
      ch.campaignName = campaignName;
      localStorage.setItem(key, JSON.stringify(ch));
    } catch { }
    setLinkCharId('');
    refresh();
  };

  const handleUnlinkCharacter = (campaignId: string, charId: string) => {
    try {
      const key = `${CHAR_STORAGE_PREFIX}${charId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const ch = JSON.parse(raw);
      delete ch.campaignId;
      delete ch.campaignName;
      localStorage.setItem(key, JSON.stringify(ch));
    } catch { }
    refresh();
  };

  const editingCampaign = editingCampaignId ? campaigns.find(c => c.id === editingCampaignId) : null;
  const editingConfig = editingCampaign ? loadCampaignConfig(editingCampaign.id) : null;

  return (
    <div style={{ padding: '2rem', color: '#e8dcc8', maxWidth: '1040px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', margin: '0 0 4px' }}>Campaigns</h1>
          <p style={{ color: '#8a7e6a', margin: 0, fontSize: '0.85rem' }}>Create and manage campaign contexts.</p>
        </div>
        <button onClick={() => setShowWizard(true)} style={btn}>+ New Campaign</button>
      </header>

      {showWizard && <CampaignWizard onClose={() => setShowWizard(false)} onCreated={handleWizardCreated} />}

      {editingCampaign && editingConfig && (
        <CampaignWizard onClose={() => setEditingCampaignId(null)} onSaved={() => { setEditingCampaignId(null); window.location.reload(); }} campaignId={editingCampaign.id} initialData={editingConfig} />
      )}

      {dashboardId && dashboardEntry && dashboardConfig ? (
        <DashboardView
          entry={dashboardEntry}
          config={dashboardConfig}
          chars={dashboardChars}
          activeId={activeId}
          linkCharId={linkCharId}
          setLinkCharId={setLinkCharId}
          onLink={() => {
            if (!dashboardId || !linkCharId) return;
            try { const key = `${CHAR_STORAGE_PREFIX}${linkCharId}`; const raw = localStorage.getItem(key); if (!raw) return; const ch = JSON.parse(raw); ch.campaignId = dashboardId; ch.campaignName = dashboardEntry.name; localStorage.setItem(key, JSON.stringify(ch)); } catch { }
            setLinkCharId(''); refresh();
          }}
          onUnlink={(charId: string) => {
            try { const key = `${CHAR_STORAGE_PREFIX}${charId}`; const raw = localStorage.getItem(key); if (!raw) return; const ch = JSON.parse(raw); delete ch.campaignId; delete ch.campaignName; localStorage.setItem(key, JSON.stringify(ch)); } catch { }
            refresh();
          }}
          onSwitch={(id: string) => { setActiveCampaign(id); window.location.reload(); }}
          onEdit={() => { const c = loadCampaignConfig(dashboardId); setEditingCampaignId(dashboardId); }}
          onBack={() => setDashboardId(null)}
        />
      ) : (<>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={{ fontSize: '0.7rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: activeCampaign ? '#c9a84c' : '#5a5248' }}>{activeCampaign ? activeCampaign.name : 'No campaign'}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: '0.7rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Characters</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{activeId ? getCampaignChars(activeId).length : 0}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: '0.7rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sessions</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{activeId ? sessionCounts[activeId] || 0 : 0}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: '0.7rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Campaigns</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{campaigns.length}</div>
        </div>
      </div>

      {/* Campaign list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {campaigns.map(c => {
          const config: CampaignConfig | null = (() => { try { return loadCampaignConfig(c.id); } catch { return null; } })();
          const chars = getCampaignChars(c.id);
          const expanded = expandedId === c.id;
          return (
            <div key={c.id}>
              <div style={{ ...cardHover, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderColor: activeId === c.id ? '#c9a84c' : '#3d3528' }}
                onClick={() => setExpandedId(expanded ? null : c.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '1.1rem' }}>📁</span>
                  {editingNameId === c.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...input, maxWidth: '240px' }}
                      onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditingNameId(null); }} autoFocus />
                  ) : (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#5a5248' }}>
                        Created {new Date(c.createdAt).toLocaleDateString()} · {chars.length} chars · {sessionCounts[c.id] || 0} sessions{config?.enabledModules?.length ? ` · ${config.enabledModules.length} modules` : ''}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  {activeId === c.id && <span style={{ background: '#c9a84c', color: '#0c0e14', padding: '2px 8px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>ACTIVE</span>}
                  {activeId !== c.id && <button onClick={() => handleSwitch(c.id)} style={btnGhost}>Switch</button>}
                  <button onClick={() => { setEditingCampaignId(c.id); }} style={btnGhost}>⚙</button>
                  {editingNameId === c.id ? (
                    <><button onClick={() => handleRename(c.id)} style={btnGhost}>Save</button><button onClick={() => setEditingNameId(null)} style={btnGhost}>Cancel</button></>
                  ) : (
                    <button onClick={() => { setEditingNameId(c.id); setEditName(c.name); }} style={btnGhost}>✎</button>
                  )}
                  {deleteConfirm === c.id ? (
                    <><span style={{ fontSize: '0.7rem', color: '#8a7e6a' }}>Confirm?</span><button onClick={() => handleDelete(c.id)} style={btnDanger}>Delete</button><button onClick={() => setDeleteConfirm(null)} style={btnGhost}>No</button></>
                  ) : (
                    <button onClick={() => setDeleteConfirm(c.id)} style={btnGhost}>🗑</button>
                  )}
                  <span style={{ fontSize: '0.7rem', color: '#5a5248', marginLeft: '4px' }}>{expanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded && (
                <div style={{ marginTop: '4px', marginLeft: '36px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
                  {/* Campaign settings summary */}
                  {config && (
                    <div style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Settings</div>
                        <button onClick={() => handleOpenDashboard(c.id)} style={{ ...btnGhost, fontSize: '0.7rem', padding: '4px 10px' }}>Open Dashboard →</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: '#8a7e6a' }}>
                        {config.toneTheme && <span><strong>Tone:</strong> {TONE_LABELS[config.toneTheme] || config.toneTheme}</span>}
                        <span><strong>Rest:</strong> {{ 'standard': 'Standard', 'gritty-realism': 'Gritty Realism', 'epic-heroism': 'Epic Heroism' }[config.restVariant] || config.restVariant}</span>
                        <span><strong>Start Lv:</strong> {config.startingLevel}</span>
                        <span><strong>Gold:</strong> {config.startingGold}</span>
                        {config.description && <span style={{ width: '100%', fontSize: '0.75rem', color: '#5a5248', fontStyle: 'italic' }}>{config.description}</span>}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.7rem', color: '#8a7e6a' }}>Race Preset:</label>
                        <select value={config.racePreset || ''} onChange={e => handleRacePresetChange(c.id, e.target.value)}
                          style={{ ...input, width: 'auto', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                          {RACE_PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Modules summary */}
                  {config && (
                    <div style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Modules</div>
                        <button onClick={() => router.push('/dm/modules')} style={{ ...btnGhost, fontSize: '0.7rem', padding: '4px 10px' }}>Configure All →</button>
                      </div>
                      {config.enabledModules.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {config.enabledModules.map(mid => {
                            const mod = OPTIONAL_MODULES.find(m => m.id === mid);
                            const summary = getModuleSummary(mid, config);
                            return (
                              <div key={mid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#0c0e14', borderRadius: '4px', border: '1px solid #3d3528' }}>
                                <span style={{ fontSize: '0.78rem', color: '#c9a84c', fontWeight: 600 }}>{mod?.name || mid}</span>
                                {summary && <span style={{ fontSize: '0.7rem', color: '#5a5248' }}>{summary}</span>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#5a5248' }}>No optional modules enabled</span>
                      )}
                    </div>
                  )}

                  {/* Character roster */}
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Characters ({chars.length})</div>
                    </div>
                    {chars.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px' }}>
                        {chars.map((ch, i) => (
                          <div key={i} style={{ background: '#0c0e14', borderRadius: '6px', padding: '10px', border: '1px solid #3d3528', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e8dcc8' }}>{ch.name}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginTop: '2px' }}>{ch.race || '—'} · {charSummary(ch)}</div>
                              </div>
                              <button onClick={() => handleUnlinkCharacter(c.id, ch.id)} style={{ ...btnGhost, padding: '2px 6px', fontSize: '0.65rem', color: '#5a5248' }} title="Remove from campaign">✕</button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.7rem', color: '#5a5248' }}>
                              <span><strong>AC:</strong> {getLiveStats(ch).ac}</span>
                              <span><strong>PP:</strong> {passivePerception(ch)}</span>
                              <span><strong>DC:</strong> {saveDC(ch)}</span>
                            </div>
                            <button onClick={() => router.push(`/character-sheet?id=${ch.id}`)} style={{ ...btnGhost, padding: '3px 8px', fontSize: '0.65rem', marginTop: '6px', width: '100%', textAlign: 'center' }}>Open Sheet</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: '#5a5248', margin: '0 0 10px' }}>No characters linked to this campaign.</p>
                    )}
                    {/* Link characters */}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <select value={linkCharId} onChange={e => { setLinkTarget(c.id); setLinkCharId(e.target.value); }}
                        style={{ ...input, width: 'auto', minWidth: '200px', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <option value="">— Link a character —</option>
                        {(() => {
                          const available: any[] = [];
                          try {
                            for (let i = 0; i < localStorage.length; i++) {
                              const key = localStorage.key(i);
                              if (!key || !key.startsWith(CHAR_STORAGE_PREFIX)) continue;
                              try {
                                const raw = localStorage.getItem(key);
                                if (!raw) continue;
                                const ch = JSON.parse(raw);
                                if (ch.campaignId !== c.id && (!ch.campaignId || ch.campaignId === 'default' || ch.campaignId === '') && ch.id) {
                                  available.push(ch);
                                }
                              } catch { continue; }
                            }
                          } catch { }
                          return available.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.name} ({ch.race || '—'} · {charSummary(ch)})</option>);
                        })()}
                      </select>
                      <button onClick={() => handleLinkCharacter()} style={{ ...btn, padding: '6px 12px', fontSize: '0.75rem' }} disabled={!linkCharId}>Link</button>
                    </div>
                  </div>

                  {/* House rules */}
                  {config?.houseRules && (
                    <div style={card}>
                      <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>House Rules</div>
                      <p style={{ fontSize: '0.8rem', color: '#8a7e6a', margin: 0, whiteSpace: 'pre-wrap' }}>{config.houseRules}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '48px', color: '#5a5248' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</div>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>No campaigns yet.</p>
          <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Click "+ New Campaign" to set up your first campaign.</p>
        </div>
      )}
      </>)}
      </div>
  );
}

const REST_LABELS: Record<string, string> = { standard: 'Standard', 'gritty-realism': 'Gritty Realism', 'epic-heroism': 'Epic Heroism' };

const QUICK_LINKS = [
  { href: '/dm/session', label: 'Session Prep', icon: '🎲' },
  { href: '/dm/quests', label: 'Quests', icon: '⚔' },
  { href: '/dm/modules', label: 'Modules', icon: '📦' },
  { href: '/dm/journal', label: 'Journal', icon: '📝' },
  { href: '/dm/party', label: 'Party', icon: '👥' },
  { href: '/dm/calendar', label: 'Calendar', icon: '📅' },
];

function DashboardView({ entry, config, chars, activeId, linkCharId, setLinkCharId, onLink, onUnlink, onSwitch, onEdit, onBack }: {
  entry: CampaignEntry; config: CampaignConfig; chars: any[]; activeId: string | null;
  linkCharId: string; setLinkCharId: (v: string) => void;
  onLink: () => void; onUnlink: (charId: string) => void; onSwitch: (id: string) => void; onEdit: () => void; onBack: () => void;
}) {
  const router = useRouter();

  const handlePantheonChange = (setting: string, customs: any[]) => {
    const updated: CampaignConfig = { ...config, pantheonSetting: setting, customDeities: customs };
    saveCampaignConfig(updated, entry.id);
    // Force re-render by updating local state
    window.location.reload();
  };

  const linkableChars: any[] = (() => {
    const result: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(CHAR_STORAGE_PREFIX)) continue;
        try { const raw = localStorage.getItem(key); if (!raw) continue; const ch = JSON.parse(raw); if (ch.campaignId !== entry.id && (!ch.campaignId || ch.campaignId === 'default' || ch.campaignId === '') && ch.id) result.push(ch); } catch { continue; }
      }
    } catch { }
    return result;
  })();

  const sessionCount = (() => { try { const raw = localStorage.getItem(`dd-${entry.id}-sessions`); if (!raw) return 0; return JSON.parse(raw).sessions?.length || 0; } catch { return 0; } })();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <button onClick={onBack} style={{ ...btnGhost, marginBottom: '8px', fontSize: '0.7rem' }}>← Campaigns</button>
          <h1 style={{ fontFamily: '"MedievalSharp", serif', color: '#c9a84c', margin: '0 0 2px', fontSize: '1.4rem' }}>{entry.name}</h1>
          {config.description && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#5a5248', fontStyle: 'italic' }}>{config.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {activeId === entry.id && <span style={{ background: '#c9a84c', color: '#0c0e14', padding: '3px 10px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>ACTIVE</span>}
          <button onClick={onEdit} style={btnGhost}>⚙ Edit</button>
          {activeId !== entry.id && <button onClick={() => onSwitch(entry.id)} style={btn}>Make Active</button>}
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={card}><div style={{ fontSize: '0.65rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Characters</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c9a84c' }}>{chars.length}</div></div>
        <div style={card}><div style={{ fontSize: '0.65rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sessions</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c9a84c' }}>{sessionCount}</div></div>
        <div style={card}><div style={{ fontSize: '0.65rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Modules</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c9a84c' }}>{config.enabledModules?.length || 0}</div></div>
        <div style={card}><div style={{ fontSize: '0.65rem', color: '#5a5248', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Start Lv</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c9a84c' }}>{config.startingLevel || 1}</div></div>
      </div>

      {/* Settings + Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={card}>
          <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#8a7e6a' }}>
            {config.toneTheme && <span><strong>Tone:</strong> {TONE_LABELS[config.toneTheme] || config.toneTheme}</span>}
            <span><strong>Rest:</strong> {REST_LABELS[config.restVariant] || config.restVariant}</span>
            <span><strong>Starting Gold:</strong> {config.startingGold}</span>
            {config.racePreset && <span><strong>Race Preset:</strong> {RACE_PRESET_OPTIONS.find(o => o.value === config.racePreset)?.label || config.racePreset}</span>}
            {config.safetyTools?.enabled && <span><strong>Safety:</strong> {config.safetyTools.type}{config.safetyTools.notes ? ` — ${config.safetyTools.notes}` : ''}</span>}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Quick Links</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {QUICK_LINKS.map(link => (
              <button key={link.href} onClick={() => router.push(link.href)} style={{ ...btnGhost, textAlign: 'left', padding: '8px 10px', fontSize: '0.78rem' }}>{link.icon} {link.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Pantheon */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Pantheon</div>
        <PantheonConfig
          pantheonSetting={config.pantheonSetting || ''}
          customDeities={config.customDeities || []}
          onChange={handlePantheonChange}
        />
      </div>

      {/* Modules */}
      {config.enabledModules.length > 0 && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Enabled Modules</div>
            <button onClick={() => router.push('/dm/modules')} style={{ ...btnGhost, fontSize: '0.7rem', padding: '4px 10px' }}>Configure All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {config.enabledModules.map(mid => {
              const mod = OPTIONAL_MODULES.find(m => m.id === mid);
              let summary = '';
              try {
                if (mid === 'piety') { const c = getModuleConfig(config, 'piety'); summary = `Deity: ${c.deityName}`; }
                if (mid === 'honorSanity') { const c = getModuleConfig(config, 'honorSanity'); summary = `Honor ${c.defaultHonor} · Sanity ${c.defaultSanity}`; }
                if (mid === 'heroPoints') { const c = getModuleConfig(config, 'heroPoints'); summary = `Pool ${c.poolSize} / max ${c.maxPool}`; }
                if (mid === 'grittyRealism') { const c = getModuleConfig(config, 'grittyRealism'); summary = `${c.shortRestHours}h short / ${c.longRestDays}d long`; }
              } catch { }
              return (
                <div key={mid} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: '#0c0e14', borderRadius: '4px', fontSize: '0.78rem' }}>
                  <span style={{ color: '#c9a84c' }}>{mod?.name || mid}</span>
                  {summary && <span style={{ color: '#5a5248', fontSize: '0.7rem' }}>{summary}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Character roster */}
      <div style={card}>
        <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Characters ({chars.length})</div>
        {chars.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px' }}>
            {chars.map((ch, i) => (
              <div key={i} style={{ background: '#0c0e14', borderRadius: '6px', padding: '10px', border: '1px solid #3d3528', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e8dcc8' }}>{ch.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginTop: '2px' }}>{ch.race || '—'} · {charSummary(ch)}</div>
                  </div>
                  <button onClick={() => onUnlink(ch.id)} style={{ ...btnGhost, padding: '2px 6px', fontSize: '0.65rem', color: '#5a5248' }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.7rem', color: '#5a5248' }}>
                  <span><strong>AC:</strong> {ch.attributes?.ac || '—'}</span>
                  <span><strong>PP:</strong> {passivePerception(ch)}</span>
                  <span><strong>DC:</strong> {saveDC(ch)}</span>
                </div>
                <button onClick={() => router.push(`/character-sheet?id=${ch.id}`)} style={{ ...btnGhost, padding: '3px 8px', fontSize: '0.65rem', marginTop: '6px', width: '100%', textAlign: 'center' }}>Open Sheet</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: '#5a5248', margin: '0 0 10px' }}>No characters linked to this campaign.</p>
        )}
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={linkCharId} onChange={e => setLinkCharId(e.target.value)} style={{ ...input, width: 'auto', minWidth: '200px', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
            <option value="">— Link a character —</option>
            {linkableChars.map(ch => <option key={ch.id} value={ch.id}>{ch.name} ({ch.race || '—'} · {charSummary(ch)})</option>)}
          </select>
          <button onClick={onLink} style={{ ...btn, padding: '6px 12px', fontSize: '0.75rem' }} disabled={!linkCharId}>Link</button>
        </div>
      </div>

      {/* House rules */}
      {config.houseRules && (
        <div style={{ ...card, marginTop: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>House Rules</div>
          <p style={{ fontSize: '0.8rem', color: '#8a7e6a', margin: 0, whiteSpace: 'pre-wrap' }}>{config.houseRules}</p>
        </div>
      )}
    </div>
  );
}
