'use client';
import { useState, useEffect } from 'react';
import { StashItem, Character } from '../../lib/character';
import { DataEngine } from '../../utils/dataLoader';
import { loadStash, saveStash, addToStash, removeFromStash, transferToCharacter, isMuleNearby, setMuleNearby } from '../../utils/stashEngine';
import { getStorageKey, loadCharFromLocal } from '../../utils/storageEngine';

export default function PartyStashPage() {
  const [stash, setStash] = useState<StashItem[]>([]);
  const [muleNearby, setMule] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTakeModal, setShowTakeModal] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addQuantity, setAddQuantity] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    setStash(loadStash());
    setMule(isMuleNearby());
  }, []);

  const refresh = () => setStash(loadStash());

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const items = await DataEngine.getItems();
    const q = searchQuery.toLowerCase();
    setSearchResults(
      items.filter((i: any) => i.name.toLowerCase().includes(q) && (!i.rarity || i.rarity === 'none')).slice(0, 30)
    );
  };

  const handleAdd = (item: any) => {
    const updated = addToStash(item, addQuantity, 'Party');
    setStash(updated);
    setSelectedItem(null);
    setAddQuantity(1);
    setShowAddModal(false);
  };

  const handleTake = async (itemId: string, charKey: string) => {
    const char = loadCharFromLocal(charKey);
    if (!char) return;
    const result = transferToCharacter(itemId, 1, char);
    setStash(result.stash);
    setShowTakeModal(null);
  };

  const handleRemove = (itemId: string) => {
    const updated = removeFromStash(itemId, 999);
    setStash(updated);
  };

  const toggleMule = () => {
    const newVal = !muleNearby;
    setMule(newVal);
    setMuleNearby(newVal);
  };

  const registry = typeof window !== 'undefined' ? (() => {
    try {
      const raw = localStorage.getItem('dungeon-delver-character-registry');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })() : [];

  const pageStyle: React.CSSProperties = {
    padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'white',
  };
  const headerStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px',
  };
  const cardStyle: React.CSSProperties = {
    background: '#1a202c', borderRadius: '10px', border: '1px solid #2d3748',
    padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
  };
  const btnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '6px', border: 'none',
    background: '#b8860b', color: 'black', fontWeight: 'bold', cursor: 'pointer',
  };
  const ghostBtn: React.CSSProperties = {
    padding: '4px 10px', borderRadius: '4px', border: '1px solid #4a5568',
    background: 'transparent', color: '#a0aec0', cursor: 'pointer', fontSize: '0.8rem',
  };
  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const modalContent: React.CSSProperties = {
    background: '#1a202c', borderRadius: '12px', border: '2px solid #b8860b',
    width: '90vw', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
    padding: '24px', color: 'white',
  };
  const itemRowStyle = (even: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 12px', background: even ? '#2d3748' : 'transparent',
    borderRadius: '6px',
  });

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontFamily: 'serif', color: '#f6e05e', margin: 0 }}>Party Stash</h1>
          <p style={{ color: '#718096', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Shared items accessible by all characters</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#a0aec0', fontSize: '0.85rem' }}>
            <span>🐫 Mule Nearby</span>
            <div onClick={toggleMule}
              style={{
                width: '40px', height: '22px', borderRadius: '11px', background: muleNearby ? '#48bb78' : '#4a5568',
                position: 'relative', cursor: 'pointer', transition: '0.2s',
              }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '2px', left: muleNearby ? '20px' : '2px',
                transition: '0.2s',
              }} />
            </div>
          </label>
          <button onClick={() => setShowAddModal(true)} style={btnStyle}>+ Add Item</button>
        </div>
      </div>

      {stash.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4a5568', border: '2px dashed #2d3748', borderRadius: '12px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Stash is empty</div>
          <div style={{ fontSize: '0.85rem' }}>Click "+ Add Item" to deposit equipment for the party.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stash.map((item, i) => (
          <div key={item.id} style={{ ...cardStyle, position: 'relative' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{item.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                Qty: {item.quantity || 1}{item.weight ? ` · ${item.weight} lb` : ''}
                {item.type?.startsWith('M') && item.dmg1 && ` · ${item.dmg1}`}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4a5568', marginTop: '2px' }}>
                Added by {item.addedBy} · {new Date(item.addedAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setShowTakeModal(item.id)} style={ghostBtn}>Take</button>
              <button onClick={() => handleRemove(item.id)} style={{ ...ghostBtn, color: '#fc8181' }}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={modalContent}>
            <h2 style={{ fontFamily: 'serif', color: '#f6e05e', margin: '0 0 16px 0' }}>Add Item to Stash</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search items..."
                style={{ flex: 1, padding: '10px', background: '#2d3748', border: '1px solid #4a5568', borderRadius: '6px', color: 'white' }} />
              <button onClick={handleSearch} style={btnStyle}>Search</button>
            </div>
            {selectedItem && (
              <div style={{ padding: '12px', background: '#2d3748', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', color: '#f6e05e' }}>{selectedItem.name}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Qty:</span>
                  <input type="number" min={1} value={addQuantity} onChange={e => setAddQuantity(Math.max(1, Number(e.target.value)))}
                    style={{ width: '60px', padding: '4px 8px', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '4px', color: 'white', textAlign: 'center' }} />
                  <button onClick={() => handleAdd(selectedItem)} style={btnStyle}>Add to Stash</button>
                  <button onClick={() => setSelectedItem(null)} style={ghostBtn}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {searchResults.map((item, i) => (
                <button key={i} onClick={() => setSelectedItem(item)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: selectedItem?.name === item.name ? '#2d3748' : 'transparent',
                    border: 'none', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <span>{item.name}</span>
                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>{item.value != null ? `${Math.floor(item.value / 100)} gp` : ''}</span>
                </button>
              ))}
              {searchResults.length === 0 && searchQuery && (
                <div style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>No items found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Take Item Modal */}
      {showTakeModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowTakeModal(null); }}>
          <div style={modalContent}>
            <h2 style={{ fontFamily: 'serif', color: '#f6e05e', margin: '0 0 16px 0' }}>Transfer Item to Character</h2>
            {registry.length === 0 && (
              <div style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>No saved characters found. Create a character first.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {registry.map((entry: any) => (
                <button key={entry.path} onClick={() => handleTake(showTakeModal!, entry.path)}
                  style={{
                    padding: '12px 16px', background: '#2d3748', border: '1px solid #4a5568',
                    borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div style={{ fontWeight: 'bold' }}>{entry.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#718096' }}>{entry.race} · {entry.class} · Level {entry.level}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTakeModal(null)} style={{ ...ghostBtn, marginTop: '12px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}