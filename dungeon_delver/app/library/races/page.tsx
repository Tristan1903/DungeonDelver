'use client';
import { useState, useEffect } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import { formatSpeed } from '../../../utils/libraryHelpers';
import { raceImgPath } from '../../../utils/imgPaths';
import LibrarySidebar from '../../../components/LibrarySidebar';
import RaceDetail from '../../../components/RaceDetail';

export default function RacesPage() {
  const [allRaces, setAllRaces] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    DataEngine.getMergedRaces().then(setAllRaces);
  }, []);

  const q = search.toLowerCase();
  const races = q ? allRaces.filter((r: any) => r.name?.toLowerCase().includes(q)) : allRaces;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
      <LibrarySidebar />
      <div style={{ marginLeft: '200px', flex: 1, maxWidth: '960px', padding: '24px 32px 80px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '8px' }}>
          Races
        </h1>
        <p style={{ color: '#5a5248', fontSize: '0.85rem', marginBottom: '20px' }}>Browse playable races.</p>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search races..."
          style={{ width: '100%', padding: '10px 14px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '24px', boxSizing: 'border-box' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
          {races.map((race: any, i: number) => {
            const imgKey = race.name;
            const imgFailed = imgErrors[imgKey];
            return (
              <div key={i} onClick={() => setSelectedItem(race)}
                style={{ padding: '12px', background: '#1a1714', borderRadius: '8px', border: '1px solid #3d3528', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: '#0c0e14', border: '2px solid #c9a84c44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {imgFailed ? (
                      <span style={{ fontSize: '1.4rem', color: '#c9a84c' }}>{race.name?.[0] || '?'}</span>
                    ) : (
                      <img src={raceImgPath(race.name)}
                        onError={() => setImgErrors(prev => ({ ...prev, [imgKey]: true }))}
                        alt={race.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ color: '#e8dcc8', fontSize: '0.85rem' }}>{race.name}</strong>
                    <div style={{ fontSize: '0.65rem', color: '#5a5248', marginTop: '1px' }}>
                      {race.size?.[0] || '—'} · {race.source}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginTop: '2px' }}>
                      Speed {formatSpeed(race.speed)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedItem && <RaceDetail item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </div>
    </div>
  );
}
