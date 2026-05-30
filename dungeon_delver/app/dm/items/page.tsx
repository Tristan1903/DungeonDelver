'use client';
import { useState, useEffect, useCallback } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import { loadCharFromLocal, CHAR_STORAGE_PREFIX } from '../../../utils/storageEngine';
import {
  ObscuredItem,
  loadObscuredItems, addObscuredItem, identifyItem, deleteObscuredItem,
  getObscuredForCharacter, generateDisplayName,
} from '../../../utils/obscuredItemsEngine';
import { getStorageKey } from '../../../utils/storageEngine';

interface CharRef {
  id: string;
  name: string;
}

const styles = {
  page: { padding: '2rem', color: 'white', fontFamily: 'serif', maxWidth: '1200px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#b8860b', marginBottom: '4px' } as const,
  sub: { color: '#a0aec0', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#1a202c', border: '1px solid #4a5568', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' } as const,
  input: {
    width: '100%', padding: '8px', background: '#2d3748', border: '1px solid #4a5568',
    borderRadius: '4px', color: 'white', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const,
  },
  itemCard: (identified: boolean): React.CSSProperties => ({
    background: '#2d3748', border: `1px solid ${identified ? '#48bb78' : '#e53e3e'}`,
    borderRadius: '8px', padding: '0.75rem',
  }),
};

export default function MagicItemsPage() {
  const [characters, setCharacters] = useState<CharRef[]>([]);
  const [selectedChar, setSelectedChar] = useState<string>('');
  const [obscured, setObscured] = useState<ObscuredItem[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'assign' | 'manage'>('assign');

  useEffect(() => {
    const refs: CharRef[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CHAR_STORAGE_PREFIX)) {
        const char = loadCharFromLocal(key);
        if (char) refs.push({ id: char.id || key, name: char.name || key });
      }
    }
    setCharacters(refs);
    setObscured(loadObscuredItems());
    DataEngine.getItems().then(all => setLibraryItems(all));
  }, []);

  const refreshObscured = useCallback(() => {
    setObscured(loadObscuredItems());
  }, []);

  const handleAssign = async (libItem: any, hidden: boolean) => {
    if (!selectedChar) return;
    const charRef = characters.find(c => c.id === selectedChar);
    if (!charRef) return;

    if (!hidden) {
      addObscuredItem({ trueName: libItem.name, displayName: libItem.name, identified: true, assignedTo: selectedChar, assignedByName: charRef.name, notes: '', trueData: libItem });
    } else {
      const displayName = generateDisplayName(libItem.name);
      addObscuredItem({ trueName: libItem.name, displayName, identified: false, assignedTo: selectedChar, assignedByName: charRef.name, notes: '', trueData: libItem });
    }
    refreshObscured();
  };

  const handleIdentify = (id: string) => {
    identifyItem(id);
    refreshObscured();
  };

  const handleRemove = (id: string) => {
    deleteObscuredItem(id);
    refreshObscured();
  };

  const filteredLibrary = libraryItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 40);

  const charObscured = obscured.filter(i => !selectedChar || i.assignedTo === selectedChar);
  const unidentified = charObscured.filter(i => !i.identified);
  const identified = charObscured.filter(i => i.identified);

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Magic Item Assignment</h1>
      <p style={styles.sub}>Assign magic items to characters and control identification.</p>

      {/* Character select */}
      <div style={styles.panel}>
        <select value={selectedChar} onChange={e => setSelectedChar(e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.85rem' }}>
          <option value="">— Select a character —</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedChar && (
        <>
          <div style={{ display: 'flex', gap: '0', marginBottom: '1rem' }}>
            <button onClick={() => setTab('assign')} style={{
              padding: '8px 20px', background: tab === 'assign' ? '#6366f1' : '#2d3748',
              border: '1px solid #4a5568', color: 'white', cursor: 'pointer', borderRadius: '6px 0 0 6px', fontSize: '0.8rem',
            }}>Assign Items</button>
            <button onClick={() => setTab('manage')} style={{
              padding: '8px 20px', background: tab === 'manage' ? '#6366f1' : '#2d3748',
              border: '1px solid #4a5568', borderLeft: 'none', color: 'white', cursor: 'pointer', borderRadius: '0 6px 6px 0', fontSize: '0.8rem',
            }}>Manage ({charObscured.length})</button>
          </div>

          {tab === 'assign' && (
            <div style={styles.panel}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input style={styles.input} placeholder="Search magic items..." value={search} onChange={e => setSearch(e.target.value)} />
                <span style={{ fontSize: '0.7rem', color: '#718096', alignSelf: 'center' }}>{filteredLibrary.length} items</span>
              </div>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {filteredLibrary.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: '#2d3748', marginBottom: '4px', borderRadius: '6px',
                  }}>
                    <div>
                      <span style={{ fontSize: '0.8rem' }}>{item.name}</span>
                      {item.rarity && <span style={{ fontSize: '0.6rem', color: '#718096', marginLeft: '6px' }}>{item.rarity}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleAssign(item, true)}
                        style={{ padding: '4px 10px', background: '#e53e3e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}>
                        Assign Hidden
                      </button>
                      <button onClick={() => handleAssign(item, false)}
                        style={{ padding: '4px 10px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}>
                        Assign Revealed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'manage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Unidentified items */}
              {unidentified.length > 0 && (
                <div>
                  <h3 style={{ color: '#e53e3e', fontSize: '0.85rem', marginBottom: '8px' }}>Unidentified ({unidentified.length})</h3>
                  <div style={styles.grid}>
                    {unidentified.map(item => (
                      <div key={item.id} style={styles.itemCard(false)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f6e05e' }}>{item.displayName}</span>
                          <button onClick={() => handleRemove(item.id)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#718096', marginBottom: '4px' }}>
                          True: <span style={{ color: '#a0aec0' }}>{item.trueName}</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#718096', marginBottom: '8px' }}>
                          Assigned: {item.assignedAt.split('T')[0]}
                        </div>
                        <button onClick={() => handleIdentify(item.id)}
                          style={{ padding: '5px 14px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                          Identify
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified items */}
              {identified.length > 0 && (
                <div>
                  <h3 style={{ color: '#48bb78', fontSize: '0.85rem', marginBottom: '8px' }}>Identified ({identified.length})</h3>
                  <div style={styles.grid}>
                    {identified.map(item => (
                      <div key={item.id} style={styles.itemCard(true)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#48bb78' }}>{item.trueName}</span>
                          <button onClick={() => handleRemove(item.id)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#718096' }}>Identified</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {charObscured.length === 0 && (
                <p style={{ color: '#718096', fontSize: '0.85rem' }}>No obscured items for this character. Go to Assign tab to add some.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
