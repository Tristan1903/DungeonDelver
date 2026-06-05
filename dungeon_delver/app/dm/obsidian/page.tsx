'use client';
import { useState, useEffect, useCallback } from 'react';
import { charToMarkdown, parseMarkdownToChar, wikiLinksToDeepLinks } from '../../../utils/markdownEngine';
import { computeDiff, createBackup, mergeLocalWins, mergeObsidianWins } from '../../../utils/conflictEngine';
import { loadCharFromLocal, saveCharToLocal } from '../../../utils/storageEngine';

interface SyncState {
  charId: string;
  charName: string;
  localVersion: number;
  mdVersion: number;
  status: 'synced' | 'local-newer' | 'md-newer' | 'conflict' | 'new' | 'no-file';
  mdExists: boolean;
  mdPath: string;
}

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', maxWidth: '1000px', margin: '0 auto' },
  h1: { fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' },
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' },
  card: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' },
  btn: { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.85rem' },
};

async function pickVaultFolder(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    return await open({ directory: true, multiple: false, title: 'Select Obsidian Vault Folder' }) as string | null;
  } catch { return null; }
}

async function listMdFiles(dir: string): Promise<string[]> {
  try {
    const { readDir } = await import('@tauri-apps/plugin-fs');
    const entries = await readDir(dir);
    return entries.filter((e: any) => e.name?.endsWith('.md')).map((e: any) => e.name);
  } catch { return []; }
}

async function readMdFile(path: string): Promise<string | null> {
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return await readTextFile(path);
  } catch { return null; }
}

async function writeMdFile(path: string, content: string): Promise<boolean> {
  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, content);
    return true;
  } catch { return false; }
}

async function ensureDir(dir: string): Promise<boolean> {
  try {
    const { mkdir, exists } = await import('@tauri-apps/plugin-fs');
    if (!(await exists(dir))) await mkdir(dir, { recursive: true });
    return true;
  } catch { return false; }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const { exists } = await import('@tauri-apps/plugin-fs');
    return !!(await exists(path));
  } catch { return false; }
}

function loadAllCharacters(): { id: string; name: string; version: number }[] {
  const chars: { id: string; name: string; version: number }[] = [];
  try {
    const registry = JSON.parse(localStorage.getItem('dungeon-delver-character-registry') || '[]');
    for (const entry of registry) {
      const key = entry.id ? `dd-char-${entry.id}` : `dd-char-${entry.name}`;
      const char = loadCharFromLocal(key);
      if (char) chars.push({ id: entry.id || char.id || char.name, name: char.name, version: (char as any)._version || 1 });
    }
  } catch { /* noop */ }
  return chars;
}

export default function ObsidianSyncPage() {
  const [vaultPath, setVaultPath] = useState<string>('');
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflictChar, setConflictChar] = useState<{ id: string; name: string; local: any; md: any; diffs: any[] } | null>(null);
  const [charDir, setCharDir] = useState('Characters');
  const [activeTab, setActiveTab] = useState<'sync' | 'scan'>('sync');
  const [scanResults, setScanResults] = useState<{
    total: number; characters: { path: string; name: string }[];
    journal: { path: string; title: string; type: string }[];
    unknown: { path: string }[];
    totalLinks: number;
  }>({ total: 0, characters: [], journal: [], unknown: [], totalLinks: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dd-obsidian-vault');
      if (saved) setVaultPath(saved);
    } catch { /* noop */ }
    try {
      const savedDir = localStorage.getItem('dd-obsidian-char-dir');
      if (savedDir) setCharDir(savedDir);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (vaultPath) scanSyncStates();
  }, [vaultPath]);

  const saveVaultPath = useCallback((path: string) => {
    setVaultPath(path);
    try { localStorage.setItem('dd-obsidian-vault', path); } catch { /* noop */ }
  }, []);

  const saveCharDir = useCallback((dir: string) => {
    setCharDir(dir);
    try { localStorage.setItem('dd-obsidian-char-dir', dir); } catch { /* noop */ }
  }, []);

  async function handlePickVault() {
    const path = await pickVaultFolder();
    if (path) saveVaultPath(path);
  }

  function getMdPath(char: { id?: string; name: string }): string {
    const sub = charDir || 'Characters';
    return `${vaultPath}/${sub}/${char.name.replace(/[\/\\:*?"<>|]/g, '_')}.md`;
  }

  function getVaultSubpath(subDir: string): string {
    return `${vaultPath}/${subDir}`;
  }

  async function scanSyncStates() {
    if (!vaultPath) return;
    const chars = loadAllCharacters();
    const states: SyncState[] = [];
    for (const c of chars) {
      const mdPath = getMdPath(c);
      const exists = await fileExists(mdPath);
      let mdVersion = 0;
      if (exists) {
        const content = await readMdFile(mdPath);
        if (content) {
          const fmMatch = content.match(/---[\s\S]*?---/);
          if (fmMatch) {
            const vMatch = fmMatch[0].match(/version:\s*(\d+)/);
            if (vMatch) mdVersion = parseInt(vMatch[1], 10);
          }
        }
      }
      const localVersion = c.version;
      let status: SyncState['status'] = 'new';
      if (!exists) status = 'no-file';
      else if (localVersion === mdVersion) status = 'synced';
      else if (localVersion > mdVersion) status = 'local-newer';
      else if (mdVersion > localVersion) status = 'md-newer';
      states.push({ charId: c.id, charName: c.name, localVersion, mdVersion, status, mdExists: exists, mdPath });
    }
    setSyncStates(states);
  }

  async function syncAll() {
    if (!vaultPath) return;
    setIsSyncing(true);
    setStatusMsg('Syncing...');
    try {
      await ensureDir(getVaultSubpath(charDir || 'Characters'));
    } catch { /* noop */ }
    let count = 0;
    for (const s of syncStates) {
      const char = loadCharFromLocal(`dd-char-${s.charId}`);
      if (!char) continue;
      const md = charToMarkdown(char);
      const withLinks = wikiLinksToDeepLinks(md);
      const ok = await writeMdFile(s.mdPath, withLinks);
      if (ok) count++;
    }
    setStatusMsg(`Wrote ${count} character files.`);
    setIsSyncing(false);
    scanSyncStates();
  }

  async function importAll() {
    if (!vaultPath) return;
    setIsSyncing(true);
    setStatusMsg('Importing...');
    const mdFiles = await listMdFiles(getVaultSubpath(charDir || 'Characters'));
    let imported = 0;
    let conflicts = 0;
    for (const file of mdFiles) {
      const mdPath = `${vaultPath}/${charDir || 'Characters'}/${file}`;
      const content = await readMdFile(mdPath);
      if (!content) continue;
      const fmMatch = content.match(/---[\s\S]*?---/);
      if (!fmMatch) continue;
      const nameMatch = fmMatch[0].match(/name:\s*(.+)/);
      const name = nameMatch ? nameMatch[1].trim() : file.replace('.md', '');
      const vMatch = fmMatch[0].match(/version:\s*(\d+)/);
      const mdVersion = vMatch ? parseInt(vMatch[1], 10) : 0;

      const chars = loadAllCharacters();
      const match = chars.find(c => c.name === name);
      if (match) {
        const local = loadCharFromLocal(`dd-char-${match.id}`);
        if (local) {
          const localVersion = (local as any)._version || 1;
          if (localVersion > mdVersion) { conflicts++; continue; }
          const updated = parseMarkdownToChar(content, local);
          const merged = { ...local, ...updated };
          merged._version = Math.max(localVersion, mdVersion) + 1;
          merged._lastSync = new Date().toISOString();
          saveCharToLocal(merged);
          imported++;
        }
      } else {
        const parsed = parseMarkdownToChar(content, {});
        const newChar = {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ...parsed,
          classLevels: [{ className: parsed.class || 'Fighter', level: parsed.level || 1 }],
          _version: mdVersion,
          _lastSync: new Date().toISOString(),
        } as any;
        saveCharToLocal(newChar);
        try {
          const registry = JSON.parse(localStorage.getItem('dungeon-delver-character-registry') || '[]');
          registry.push({ id: newChar.id, name: newChar.name });
          localStorage.setItem('dungeon-delver-character-registry', JSON.stringify(registry));
        } catch { /* noop */ }
        imported++;
      }
    }
    setStatusMsg(`Imported ${imported} characters.${conflicts ? ` ${conflicts} skipped (local newer).` : ''}`);
    setIsSyncing(false);
    scanSyncStates();
  }

  async function handleSyncOne(s: SyncState) {
    const char = loadCharFromLocal(`dd-char-${s.charId}`);
    if (!char) return;
    const md = charToMarkdown(char);
    const withLinks = wikiLinksToDeepLinks(md);
    await writeMdFile(s.mdPath, withLinks);
    scanSyncStates();
  }

  async function handleImportOne(s: SyncState) {
    const content = await readMdFile(s.mdPath);
    if (!content) return;
    const local = loadCharFromLocal(`dd-char-${s.charId}`);
    if (!local) return;
    const updated = parseMarkdownToChar(content, local);
    const merged = { ...local, ...updated };
    merged._version = s.mdVersion + 1;
    merged._lastSync = new Date().toISOString();
    saveCharToLocal(merged);
    scanSyncStates();
  }

  async function showConflict(s: SyncState) {
    const local = loadCharFromLocal(`dd-char-${s.charId}`);
    const content = await readMdFile(s.mdPath);
    if (!local || !content) return;
    const parsed = parseMarkdownToChar(content, {});
    const diffs = computeDiff(local, parsed);
    setConflictChar({ id: s.charId, name: s.charName, local, md: parsed, diffs });
  }

  function resolveConflict(wins: 'local' | 'obsidian') {
    if (!conflictChar) return;
    const merged = wins === 'local' ? mergeLocalWins(conflictChar.local, conflictChar.md) : mergeObsidianWins(conflictChar.local, conflictChar.md);
    createBackup(merged, wins === 'local' ? 'local' : 'obsidian');
    saveCharToLocal(merged);
    setConflictChar(null);
    scanSyncStates();
  }

  async function scanVault() {
    if (!vaultPath) return;
    setIsScanning(true);
    setScanMsg('Scanning vault...');
    const characters: { path: string; name: string }[] = [];
    const journal: { path: string; title: string; type: string }[] = [];
    const unknown: { path: string }[] = [];
    let totalLinks = 0;

    async function walkDir(dir: string) {
      try {
        const { readDir } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(dir);
        for (const entry of entries) {
          const fullPath = `${dir}/${entry.name}`;
          if (entry.isDirectory && entry.name !== '.obsidian' && !entry.name.startsWith('.')) {
            await walkDir(fullPath);
          } else if (entry.name?.endsWith('.md')) {
            const content = await readMdFile(fullPath);
            if (!content) continue;
            const linkCount = (content.match(/\[\[([^\]]+)\]\]/g) || []).length;
            totalLinks += linkCount;
            const fmMatch = content.match(/---[\s\S]*?---/);
            if (fmMatch) {
              const fm = fmMatch[0];
              const hasClass = /^class:\s/m.test(fm);
              const hasLevel = /^level:\s/m.test(fm);
              const hasName = /^name:\s/m.test(fm);
              const hasType = /^type:\s/m.test(fm);
              const hasTitle = /^title:\s/m.test(fm);
              if ((hasClass || hasLevel) && hasName) {
                const nMatch = fm.match(/^name:\s*(.+)/m);
                characters.push({ path: fullPath, name: nMatch ? nMatch[1].trim() : entry.name!.replace('.md', '') });
              } else if (hasType || hasTitle) {
                const tMatch = fm.match(/^type:\s*(.+)/m);
                const tiMatch = fm.match(/^title:\s*"?(.+?)"?$/m);
                journal.push({ path: fullPath, title: tiMatch ? tiMatch[1].trim() : entry.name!.replace('.md', ''), type: tMatch ? tMatch[1].trim() : 'note' });
              } else {
                unknown.push({ path: fullPath });
              }
            } else {
              unknown.push({ path: fullPath });
            }
          }
        }
      } catch { /* skip unreadable dirs */ }
    }

    await walkDir(vaultPath);
    setScanResults({ total: characters.length + journal.length + unknown.length, characters, journal, unknown, totalLinks });
    setScanMsg(`Scan complete: ${characters.length} characters, ${journal.length} journal entries, ${unknown.length} unknown, ${totalLinks} wiki-links found.`);
    setIsScanning(false);
  }

  async function importDiscoveredCharacters() {
    if (scanResults.characters.length === 0 || !vaultPath) return;
    setIsSyncing(true);
    setScanMsg('Importing discovered characters...');
    let imported = 0;
    let skipped = 0;
    const chars = loadAllCharacters();
    for (const c of scanResults.characters) {
      const exists = chars.find(x => x.name === c.name);
      if (exists) { skipped++; continue; }
      const content = await readMdFile(c.path);
      if (!content) continue;
      const parsed = parseMarkdownToChar(content, {});
      const newChar = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...parsed,
        classLevels: [{ className: parsed.class || 'Fighter', level: parsed.level || 1 }],
        _version: 1,
        _lastSync: new Date().toISOString(),
      } as any;
      saveCharToLocal(newChar);
      try {
        const registry = JSON.parse(localStorage.getItem('dungeon-delver-character-registry') || '[]');
        registry.push({ id: newChar.id, name: newChar.name });
        localStorage.setItem('dungeon-delver-character-registry', JSON.stringify(registry));
      } catch { /* noop */ }
      imported++;
    }
    setScanMsg(`Imported ${imported} new characters. ${skipped} already known.`);
    setIsSyncing(false);
    scanSyncStates();
  }

  async function importDiscoveredJournal() {
    for (const e of scanResults.journal) {
      const content = await readMdFile(e.path);
      if (!content) continue;
      const fmMatch = content.match(/---[\s\S]*?---\n*/);
      const body = fmMatch ? content.slice(fmMatch[0].length) : content;
      try {
        const entries: any[] = JSON.parse(localStorage.getItem('dd-journal-entries') || '[]');
        const exists = entries.find((x: any) => x.title === e.title);
        if (exists) continue;
        entries.push({
          id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: e.type || 'note',
          title: e.title,
          content: body.trim(),
          tags: [],
          linkedEntries: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
        localStorage.setItem('dd-journal-entries', JSON.stringify(entries));
      } catch { /* noop */ }
    }
    setScanMsg(`Imported ${scanResults.journal.length} journal entries into Lore & Journal.`);
  }

  function statusLabel(status: SyncState['status']): { text: string; color: string } {
    switch (status) {
      case 'synced': return { text: 'Synced', color: '#16a34a' };
      case 'local-newer': return { text: 'Local Newer', color: '#c9a84c' };
      case 'md-newer': return { text: 'MD Newer', color: '#8a7e6a' };
      case 'conflict': return { text: 'Conflict', color: '#a83232' };
      case 'new': return { text: 'New', color: '#c9a84c' };
      case 'no-file': return { text: 'No MD File', color: '#5a5248' };
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Obsidian Sync</h1>
      <p style={styles.sub}>Sync characters between Dungeon Delver and your Obsidian vault via Markdown files.</p>

      <div style={styles.card}>
        <label style={{ color: '#c9a84c', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Vault Folder</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input style={{ ...styles.input, flex: 1 }} value={vaultPath} onChange={e => saveVaultPath(e.target.value)} placeholder="C:/Users/.../Obsidian Vault" />
          <button onClick={handlePickVault} style={{ ...styles.btn, background: '#c9a84c', color: '#e8dcc8', whiteSpace: 'nowrap' }}>Browse</button>
        </div>
        <label style={{ color: '#8a7e6a', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Character Subdirectory</label>
        <input style={{ ...styles.input, maxWidth: '300px' }} value={charDir} onChange={e => saveCharDir(e.target.value)} placeholder="Characters" />
      </div>

      {vaultPath && (
        <>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
            <button onClick={() => setActiveTab('sync')} style={{ ...styles.btn, background: activeTab === 'sync' ? '#c9a84c' : '#1a1714', color: '#e8dcc8', fontSize: '0.85rem' }}>Character Sync</button>
            <button onClick={() => { setActiveTab('scan'); scanVault(); }} style={{ ...styles.btn, background: activeTab === 'scan' ? '#c9a84c' : '#1a1714', color: '#e8dcc8', fontSize: '0.85rem' }}>Vault Scanner</button>
          </div>

          {activeTab === 'sync' && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                <button onClick={syncAll} disabled={isSyncing} style={{ ...styles.btn, background: '#16a34a', color: '#e8dcc8', opacity: isSyncing ? 0.6 : 1 }}>
                  {isSyncing ? 'Working...' : 'Sync All to Vault'}
                </button>
                <button onClick={importAll} disabled={isSyncing} style={{ ...styles.btn, background: '#8a7e6a', color: '#e8dcc8', opacity: isSyncing ? 0.6 : 1 }}>
                  {isSyncing ? 'Working...' : 'Import All from Vault'}
                </button>
                <button onClick={scanSyncStates} disabled={isSyncing} style={{ ...styles.btn, background: '#3d3528', color: '#e8dcc8' }}>Refresh</button>
              </div>
              {statusMsg && <p style={{ color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1rem' }}>{statusMsg}</p>}
              <h2 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', fontSize: '1.3rem', color: '#c9a84c', marginBottom: '0.5rem' }}>Characters</h2>
              {syncStates.length === 0 && <p style={{ color: '#5a5248' }}>No characters found. Create one on the Character Sheet first.</p>}
              {syncStates.map(s => {
                const st = statusLabel(s.status);
                return (
                  <div key={s.charId} style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#e8dcc8' }}>{s.charName}</strong>
                      <span style={{ marginLeft: '12px', color: st.color, fontSize: '0.8rem', fontWeight: 600 }}>{st.text}</span>
                      <span style={{ marginLeft: '12px', color: '#5a5248', fontSize: '0.75rem' }}>v{s.localVersion} / v{s.mdVersion}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {s.status === 'local-newer' && <button onClick={() => handleSyncOne(s)} style={{ ...styles.btn, background: '#16a34a', color: '#e8dcc8', fontSize: '0.75rem' }}>Push</button>}
                      {s.status === 'md-newer' && <button onClick={() => handleImportOne(s)} style={{ ...styles.btn, background: '#8a7e6a', color: '#e8dcc8', fontSize: '0.75rem' }}>Pull</button>}
                      {s.status === 'no-file' && <button onClick={() => handleSyncOne(s)} style={{ ...styles.btn, background: '#c9a84c', color: '#e8dcc8', fontSize: '0.75rem' }}>Create</button>}
                      {(s.status === 'local-newer' || s.status === 'md-newer') && (
                        <button onClick={() => showConflict(s)} style={{ ...styles.btn, background: '#a83232', color: '#e8dcc8', fontSize: '0.75rem' }}>Diff</button>
                      )}
                      {s.status === 'synced' && <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'scan' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                <button onClick={scanVault} disabled={isScanning} style={{ ...styles.btn, background: '#c9a84c', color: '#e8dcc8', opacity: isScanning ? 0.6 : 1 }}>
                  {isScanning ? 'Scanning...' : 'Scan Vault'}
                </button>
                {scanResults.characters.length > 0 && (
                  <button onClick={importDiscoveredCharacters} disabled={isSyncing} style={{ ...styles.btn, background: '#16a34a', color: '#e8dcc8', opacity: isSyncing ? 0.6 : 1 }}>
                    Import {scanResults.characters.length} Characters
                  </button>
                )}
                {scanResults.journal.length > 0 && (
                  <button onClick={importDiscoveredJournal} style={{ ...styles.btn, background: '#8a7e6a', color: '#e8dcc8' }}>
                    Import {scanResults.journal.length} Journal Entries
                  </button>
                )}
              </div>
              {scanMsg && <p style={{ color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1rem' }}>{scanMsg}</p>}
              {scanResults.total === 0 && !isScanning && <p style={{ color: '#5a5248' }}>Click "Scan Vault" to discover files.</p>}
              {scanResults.characters.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ color: '#16a34a', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', margin: '0 0 0.5rem', fontSize: '1rem' }}>Characters ({scanResults.characters.length})</h3>
                  {scanResults.characters.slice(0, 20).map((c, i) => (
                    <div key={i} style={{ ...styles.card, padding: '0.5rem 1rem' }}>
                      <strong style={{ color: '#e8dcc8', fontSize: '0.9rem' }}>{c.name}</strong>
                      <span style={{ color: '#5a5248', fontSize: '0.75rem', marginLeft: '8px' }}>{c.path.replace(vaultPath, '')}</span>
                    </div>
                  ))}
                  {scanResults.characters.length > 20 && <p style={{ color: '#5a5248', fontSize: '0.8rem' }}>...and {scanResults.characters.length - 20} more</p>}
                </div>
              )}
              {scanResults.journal.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ color: '#8a7e6a', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', margin: '0 0 0.5rem', fontSize: '1rem' }}>Journal Entries ({scanResults.journal.length})</h3>
                  {scanResults.journal.slice(0, 15).map((e, i) => (
                    <div key={i} style={{ ...styles.card, padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#e8dcc8', fontSize: '0.85rem' }}>{e.title}</span>
                      <span style={{ color: '#5a5248', fontSize: '0.75rem' }}>{e.type}</span>
                    </div>
                  ))}
                  {scanResults.journal.length > 15 && <p style={{ color: '#5a5248', fontSize: '0.8rem' }}>...and {scanResults.journal.length - 15} more</p>}
                </div>
              )}
              {scanResults.unknown.length > 0 && (
                <div>
                  <h3 style={{ color: '#5a5248', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', margin: '0 0 0.5rem', fontSize: '1rem' }}>Unknown Files ({scanResults.unknown.length})</h3>
                  <p style={{ color: '#5a5248', fontSize: '0.75rem' }}>Files without recognizable frontmatter.</p>
                </div>
              )}
              {scanResults.totalLinks > 0 && (
                <div style={{ ...styles.card, marginTop: '0.5rem' }}>
                  <span style={{ color: '#c9a84c', fontWeight: 600 }}>Wiki-link Stats</span>
                  <span style={{ color: '#8a7e6a', fontSize: '0.85rem', marginLeft: '12px' }}>{scanResults.totalLinks} total links across vault</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {conflictChar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0c0e14', border: '2px solid #a83232', borderRadius: '12px', padding: '2rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#a83232', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', marginBottom: '1rem' }}>Conflict: {conflictChar.name}</h2>
            <p style={{ color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1rem' }}>Differences found between local and Obsidian versions:</p>
            {conflictChar.diffs.length === 0 && <p style={{ color: '#16a34a' }}>No meaningful differences found (metadata only).</p>}
            {conflictChar.diffs.map((d: any, i: number) => (
              <div key={i} style={{ padding: '0.5rem', marginBottom: '0.5rem', background: '#1a1714', borderRadius: '4px', fontSize: '0.8rem' }}>
                <strong style={{ color: '#c9a84c' }}>{d.field}</strong>
                <div style={{ color: '#16a34a', marginTop: '2px' }}>Local: {JSON.stringify(d.local)}</div>
                <div style={{ color: '#8a7e6a' }}>MD: {JSON.stringify(d.obsidian)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
              <button onClick={() => resolveConflict('local')} style={{ ...styles.btn, background: '#16a34a', color: '#e8dcc8' }}>Keep Local</button>
              <button onClick={() => resolveConflict('obsidian')} style={{ ...styles.btn, background: '#8a7e6a', color: '#e8dcc8' }}>Keep Obsidian</button>
              <button onClick={() => setConflictChar(null)} style={{ ...styles.btn, background: '#3d3528', color: '#e8dcc8' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
