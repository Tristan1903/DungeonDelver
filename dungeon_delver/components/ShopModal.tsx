'use client';
// =============================================================================
// 📘 FILE: components/ShopModal.tsx
// =============================================================================
// 🎯 PURPOSE: A full equipment shop modal with category tabs, text search,
//    item grid, cart management with quantity controls, and a checkout flow.
//    Filters out magic/rare items and sorts by name.
//
// 🧠 REACT CONCEPT: useMemo for Filtered & Sorted Lists
//    `mundaneItems` and `filteredItems` are computed with `useMemo` so they are
//    only recalculated when their dependencies (allItems, category, search)
//    change. `cartTotal` is also memoized. This avoids recomputing the entire
//    filtered list on every render — especially important for large item arrays.
//
// 🧠 REACT CONCEPT: Lifting State Up (onPurchase callback)
//    The shop doesn't own the gold or inventory — it receives `goldAvailable`
//    and calls `onPurchase` with the final cart. The parent (e.g. character
//    sheet or DM hub) handles deducting gold and adding items to inventory.
// =============================================================================
import { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../lib/character';

interface CartEntry {
  item: any;
  quantity: number;
}

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldAvailable: number;
  allItems: any[];
  onPurchase: (items: { name: string; quantity: number; id: string }[], totalCost: number) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'weapons', label: 'Weapons' },
  { key: 'armor', label: 'Armor' },
  { key: 'gear', label: 'Adventuring Gear' },
  { key: 'packs', label: 'Packs' },
] as const;

function getItemCategory(item: any): string {
  const t = (item.type || '').split('|')[0];
  if (item.weapon || t === 'M' || t === 'R') return 'weapons';
  if (item.armor || t === 'LA' || t === 'MA' || t === 'HA' || t === 'S') return 'armor';
  if (item.packContents) return 'packs';
  return 'gear';
}

function getItemPriceGp(item: any): number {
  if (item.value == null) return 0;
  return Math.floor(item.value / 100);
}

export default function ShopModal({ isOpen, onClose, goldAvailable, allItems, onPurchase }: ShopModalProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);

  useEffect(() => { if (!isOpen) { setCart([]); setSearch(''); setCategory('all'); } }, [isOpen]);

  const mundaneItems = useMemo(() => {
    return allItems.filter((item: any) => {
      if (item.rarity && item.rarity !== 'none') return false;
      if (item.value == null || item.value <= 0) return false;
      if (item.type === 'GV' || item.type === 'OTH' || item.type?.startsWith('LA|') === false) return true;
      return true;
    });
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return mundaneItems.filter((item: any) => {
      if (category !== 'all' && getItemCategory(item) !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [mundaneItems, category, search]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(e => e.item.name === item.name);
      if (existing) {
        return prev.map(e => e.item.name === item.name ? { ...e, quantity: e.quantity + 1 } : e);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemName: string) => {
    setCart(prev => {
      const existing = prev.find(e => e.item.name === itemName);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map(e => e.item.name === itemName ? { ...e, quantity: e.quantity - 1 } : e);
      }
      return prev.filter(e => e.item.name !== itemName);
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, e) => sum + getItemPriceGp(e.item) * e.quantity, 0);
  }, [cart]);

  const remaining = goldAvailable - cartTotal;
  const canAfford = remaining >= 0;

  const handleBuy = () => {
    if (!canAfford || cart.length === 0) return;
    const purchased = cart.map(e => ({
      name: e.item.name,
      quantity: e.quantity,
      id: `shop-${e.item.name}-${Date.now()}`,
    }));
    onPurchase(purchased, cartTotal);
    setCart([]);
    onClose();
  };

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const modalStyle: React.CSSProperties = {
    background: '#1a202c', borderRadius: '16px', border: '2px solid #b8860b',
    width: '90vw', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column',
    color: 'white', overflow: 'hidden',
  };
  const headerStyle: React.CSSProperties = {
    padding: '20px 24px', borderBottom: '1px solid #2d3748', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: '6px', border: 'none',
    background: active ? '#b8860b' : '#2d3748', color: active ? 'black' : 'white',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? 'bold' : 'normal',
  });
  const itemCardStyle: React.CSSProperties = {
    background: '#2d3748', borderRadius: '8px', padding: '12px',
    display: 'flex', flexDirection: 'column', gap: '6px',
  };
  const btnStyle: React.CSSProperties = {
    padding: '4px 12px', borderRadius: '4px', border: 'none',
    background: '#b8860b', color: 'black', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem',
  };
  const btnSmallStyle: React.CSSProperties = {
    padding: '2px 8px', borderRadius: '3px', border: 'none',
    background: '#4a5568', color: 'white', cursor: 'pointer', fontSize: '0.75rem',
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🪙</span>
            <h2 style={{ margin: 0, fontFamily: 'serif', color: '#f6e05e' }}>Equipment Shop</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#718096' }}>GOLD</div>
              <div style={{ fontWeight: 'bold', color: '#f6e05e' }}>{goldAvailable} gp</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#718096' }}>SPENT</div>
              <div style={{ fontWeight: 'bold', color: '#fc8181' }}>{cartTotal} gp</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#718096' }}>REMAINING</div>
              <div style={{ fontWeight: 'bold', color: remaining >= 0 ? '#48bb78' : '#fc8181' }}>{remaining} gp</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
        </div>

        {/* Categories + Search */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #2d3748', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)} style={tabStyle(category === c.key)}>{c.label}</button>
            ))}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            style={{
              flex: 1, minWidth: '150px', padding: '8px 12px', background: '#2d3748',
              border: '1px solid #4a5568', borderRadius: '6px', color: 'white', fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Item grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No items found</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {filteredItems.slice(0, 200).map((item: any, i: number) => {
              const price = getItemPriceGp(item);
              const inCart = cart.find(e => e.item.name === item.name);
              return (
                <div key={`${item.name}-${i}`} style={itemCardStyle}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#e2e8f0' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                    {price} gp
                    {item.weight && <span> · {item.weight} lb</span>}
                    {item.type?.startsWith('M') && item.dmg1 && <span> · {item.dmg1}</span>}
                    {item.ac && <span> · AC {typeof item.ac === 'number' ? item.ac : item.ac.ac || ''}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                    {inCart ? (
                      <>
                        <button onClick={() => removeFromCart(item.name)} style={btnSmallStyle}>−</button>
                        <span style={{ fontSize: '0.85rem', color: '#f6e05e' }}>{inCart.quantity}</span>
                        <button onClick={() => addToCart(item)} style={btnSmallStyle}>+</button>
                      </>
                    ) : (
                      <button onClick={() => addToCart(item)} style={btnStyle}>Add</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart footer */}
        {cart.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f141e' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#718096' }}>Cart: </span>
              {cart.map((e, i) => (
                <span key={e.item.name} style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {i > 0 && <span style={{ color: '#4a5568' }}>, </span>}
                  {e.item.name} ×{e.quantity} ({getItemPriceGp(e.item) * e.quantity} gp)
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setCart([])} style={{ ...btnSmallStyle, background: 'transparent', border: '1px solid #4a5568' }}>Clear</button>
              <button onClick={handleBuy} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: canAfford ? '#48bb78' : '#4a5568', color: canAfford ? 'black' : 'white', fontWeight: 'bold', cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.5 }}>
                Buy ({cartTotal} gp)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}