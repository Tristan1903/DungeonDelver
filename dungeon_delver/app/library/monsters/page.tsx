'use client';
// ===== 📘 FILE: app/library/monsters/page.tsx =====
// 🎯 PURPOSE: Bestiary browser — searchable monster grid with type-based colors, CR badges,
//   monster images, and a full statblock detail modal via MonsterDetail component.
// 🧠 REACT CONCEPT: Rich List + Detail Modal — renders a searchable grid with conditional
//   image display (fallback to emoji on error), color-coded type badges, and a modal overlay.
// =====
import { useState, useEffect } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import { loadHBMonsters } from '../../../utils/homebrewEngine';
import { getTypeLabel, getMonsterTypeColor, getMonsterTypeEmoji, formatCR, formatAC } from '../../../utils/libraryHelpers';
import { monsterImgPath } from '../../../utils/imgPaths';
import { useIsMobile } from '../../../utils/useIsMobile';
import LibrarySidebar from '../../../components/LibrarySidebar';
import MonsterDetail from '../../../components/MonsterDetail';

export default function MonstersPage() {
  const isMobile = useIsMobile();
  const [allMonsters, setAllMonsters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    DataEngine.getBestiary().then(m => {
      setAllMonsters([...m, ...loadHBMonsters().map((x: any) => ({ ...x, _homebrew: true }))]);
    });
  }, []);

  const q = search.toLowerCase();
  const monsters = q ? allMonsters.filter((m: any) => m.name?.toLowerCase().includes(q)) : allMonsters;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
      <LibrarySidebar />
      <div style={{ marginLeft: isMobile ? '0' : '200px', flex: 1, maxWidth: '960px', padding: '24px 32px 80px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '8px' }}>
          Monsters — Bestiary
        </h1>
        <p style={{ color: '#5a5248', fontSize: '0.85rem', marginBottom: '20px' }}>
          Browse the bestiary. Click any creature for full statblock.
        </p>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search monsters..."
          style={{ width: '100%', padding: '10px 14px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '24px', boxSizing: 'border-box' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {monsters.map((monster: any, i: number) => {
            const type = getTypeLabel(monster);
            const typeColor = getMonsterTypeColor(type);
            const imgKey = `${monster.source}-${monster.name}`;
            const imgFailed = imgErrors[imgKey];
            return (
              <div key={i} onClick={() => setSelectedItem(monster)}
                style={{ padding: '12px', background: '#1a1714', borderRadius: '8px', border: `1px solid ${typeColor}33`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: `${typeColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${typeColor}44`, overflow: 'hidden' }}>
                    {imgFailed ? (
                      <span style={{ fontSize: '1.6rem' }}>{getMonsterTypeEmoji(type)}</span>
                    ) : (
                      <img src={monsterImgPath(monster.source, monster.name)}
                        onError={() => setImgErrors(prev => ({ ...prev, [imgKey]: true }))}
                        alt={monster.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ color: '#e8dcc8', fontSize: '0.85rem' }}>{monster.name}</strong>
                      <span style={{ padding: '1px 6px', background: `${typeColor}33`, color: typeColor, borderRadius: '3px', fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        CR {formatCR(monster.cr)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#5a5248', marginTop: '2px' }}>
                      {monster.size?.[0] || ''} {type} · {monster.source}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginTop: '4px' }}>
                      HP {monster.hp?.average || '—'} · AC {formatAC(monster.ac)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedItem && <MonsterDetail item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </div>
    </div>
  );
}
