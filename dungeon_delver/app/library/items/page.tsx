'use client';
import { useState, useEffect } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import { loadHBItems } from '../../../utils/homebrewEngine';
import { getItemTypeLabel, getItemTypeRank } from '../../../utils/libraryHelpers';
import LibrarySidebar from '../../../components/LibrarySidebar';
import ItemDetail from '../../../components/ItemDetail';

export default function ItemsPage() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [itemTypeGroups, setItemTypeGroups] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const items = await DataEngine.getItems();
      const merged = [...items, ...loadHBItems().map((x: any) => ({ ...x, _homebrew: true }))];
      setAllItems(merged);
      const groups: Record<string, any[]> = {};
      for (const item of merged) {
        const label = getItemTypeLabel(item.type);
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
      }
      const sorted: Record<string, any[]> = {};
      Object.keys(groups).sort((a, b) => getItemTypeRank(groups[a][0]?.type) - getItemTypeRank(groups[b][0]?.type)).forEach(k => { sorted[k] = groups[k]; });
      setItemTypeGroups(sorted);
    };
    load();
  }, []);

  const q = search.toLowerCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
      <LibrarySidebar />
      <div style={{ marginLeft: '200px', flex: 1, maxWidth: '960px', padding: '24px 32px 80px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '8px' }}>
          Items
        </h1>
        <p style={{ color: '#5a5248', fontSize: '0.85rem', marginBottom: '20px' }}>
          Browse items grouped by type.
        </p>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          style={{ width: '100%', padding: '10px 14px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '24px', boxSizing: 'border-box' }} />

        {Object.entries(itemTypeGroups).map(([typeLabel, items]) => {
          const filtered = q ? items.filter((i: any) => i.name?.toLowerCase().includes(q)) : items;
          if (filtered.length === 0) return null;
          return (
            <div key={typeLabel} style={{ marginBottom: '20px' }}>
              <div style={{ color: '#c9a84c', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                {typeLabel} <span style={{ color: '#5a5248', fontWeight: 400 }}>({filtered.length})</span>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                {filtered.map((item: any, i: number) => (
                  <div key={i} onClick={() => setSelectedItem({ ...item, source: item.source || '—' })}
                    style={{ padding: '6px 10px', background: '#1a1714', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#e8dcc8' }}>{item.name}</span>
                      {item._homebrew && <span style={{ padding: '1px 6px', background: '#c9a84c', borderRadius: '3px', fontSize: '0.6rem', color: '#0c0e14' }}>Homebrew</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: '#5a5248' }}>
                      {item.rarity && item.rarity !== 'none' && <span>{item.rarity}</span>}
                      {item.source && <span>{item.source}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {selectedItem && <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </div>
    </div>
  );
}
