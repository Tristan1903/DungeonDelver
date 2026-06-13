'use client';
// ===== 📘 FILE: app/library/spells/page.tsx =====
// 🎯 PURPOSE: Spells library — grimoire-style class-based browsing with expandable class
//   sections, global search, spell-level grouping, and a detail modal via SpellDetail.
// 🧠 REACT CONCEPT: Class-Grouped Expandable Browser — builds a reverse lookup from spell
//   names to class lists, renders class cards with themed colors, and expands to show
//   spells grouped by level within each class.
// =====
import { useState, useEffect } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import { loadHBSpells } from '../../../utils/homebrewEngine';
import { CLASS_LIST, LEVEL_NAMES, getSchoolName, formatTime } from '../../../utils/libraryHelpers';
import { CLASS_THEMES } from '../../../utils/classThemes';
import { useIsMobile } from '../../../utils/useIsMobile';
import LibrarySidebar from '../../../components/LibrarySidebar';
import SpellDetail from '../../../components/SpellDetail';

export default function SpellsPage() {
  const isMobile = useIsMobile();
  const [allSpells, setAllSpells] = useState<any[]>([]);
  const [spellClassLookup, setSpellClassLookup] = useState<Record<string, string[]>>({});
  const [expandedGrimoire, setExpandedGrimoire] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const spells = await DataEngine.getSpells();
      setAllSpells([...spells, ...loadHBSpells().map((x: any) => ({ ...x, _homebrew: true }))]);
      try {
        const lookupRaw = await DataEngine.loadLocalJson('data/generated/gendata-spell-source-lookup.json');
        if (lookupRaw) {
          const lookup: Record<string, string[]> = {};
          for (const spellItem of spells) {
            const spellName = spellItem.name?.toLowerCase();
            if (!spellName) continue;
            const classes = new Set<string>();
            for (const sourceKey of Object.keys(lookupRaw)) {
              const entry = lookupRaw[sourceKey]?.[spellName];
              if (entry?.class) {
                for (const classSource of Object.keys(entry.class)) {
                  const classData = entry.class[classSource];
                  if (classData && typeof classData === 'object') {
                    Object.keys(classData).forEach((cn: string) => classes.add(cn));
                  }
                }
              }
            }
            if (classes.size > 0) lookup[spellItem.name] = Array.from(classes).sort();
          }
          setSpellClassLookup(lookup);
        }
      } catch { /* ignore */ }
    };
    load();
  }, []);

  const spellsByClass = () => {
    const map: Record<string, any[]> = {};
    for (const spell of allSpells) {
      const classes = spellClassLookup[spell.name];
      if (classes) {
        for (const cls of classes) {
          if (!map[cls]) map[cls] = [];
          map[cls].push(spell);
        }
      }
    }
    return map;
  };

  const q = search.toLowerCase();
  const filteredSpells = q ? allSpells.filter((s: any) => s.name?.toLowerCase().includes(q)) : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
      <LibrarySidebar />
      <div style={{ marginLeft: isMobile ? '0' : '200px', flex: 1, maxWidth: '960px', padding: '24px 32px 80px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '8px' }}>
          Spells — Grimoires
        </h1>
        <p style={{ color: '#5a5248', fontSize: '0.85rem', marginBottom: '20px' }}>
          Click a grimoire to browse spells by class, or search across all spells.
        </p>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all spells..."
          style={{ width: '100%', padding: '10px 14px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '24px', boxSizing: 'border-box' }} />

        {filteredSpells ? (
          <div style={{ display: 'grid', gap: '4px' }}>
            {filteredSpells.map((spell: any, i: number) => (
              <div key={i} onClick={() => setSelectedItem(spell)}
                style={{ padding: '8px 12px', background: '#1a1714', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: '#e8dcc8' }}>{spell.name}</span>
                <span style={{ color: '#5a5248', fontSize: '0.7rem' }}>
                  {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · {getSchoolName(spell.school)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: expandedGrimoire ? '20px' : 0 }}>
              {CLASS_LIST.filter(cls => (spellsByClass()[cls]?.length || 0) > 0).map((cls) => {
                const theme = CLASS_THEMES[cls.replace(' ', '')] || CLASS_THEMES[cls] || { color: '#7f8c8d7c', tagline_color: '#7f8c8d' };
                const spellCount = spellsByClass()[cls]?.length || 0;
                const isExpanded = expandedGrimoire === cls;
                return (
                  <div key={cls} onClick={() => setExpandedGrimoire(isExpanded ? null : cls)}
                    style={{
                      background: `linear-gradient(180deg, ${theme.tagline_color}22 0%, ${theme.color} 100%)`,
                      border: `1px solid ${theme.tagline_color}44`, borderRadius: '8px', padding: '16px 10px',
                      cursor: 'pointer', textAlign: 'center', minHeight: '120px', display: 'flex',
                      flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                      transition: 'all 0.15s', transform: isExpanded ? 'scale(1.03)' : 'none',
                      boxShadow: isExpanded ? `0 0 12px ${theme.tagline_color}33` : 'none',
                    }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '6px', opacity: 0.6 }}>📖</div>
                    <div style={{ color: theme.tagline_color, fontWeight: 700, fontSize: '0.85rem' }}>{cls}</div>
                    <div style={{ color: '#8a7e6a', fontSize: '0.65rem', marginTop: '4px' }}>{spellCount} spells</div>
                  </div>
                );
              })}
            </div>

            {expandedGrimoire && (
              <div style={{ marginTop: '4px', padding: '16px', background: '#1a1714', borderRadius: '8px', border: '1px solid #3d3528' }}>
                <h3 style={{ color: (CLASS_THEMES[expandedGrimoire.replace(' ', '')] || CLASS_THEMES[expandedGrimoire] || { tagline_color: '#c9a84c' }).tagline_color, margin: '0 0 12px 0', fontSize: '1rem' }}>
                  {expandedGrimoire} Spells
                </h3>
                {(() => {
                  const spells = spellsByClass()[expandedGrimoire] || [];
                  if (spells.length === 0) return <p style={{ color: '#5a5248', fontStyle: 'italic', fontSize: '0.85rem' }}>No spells found.</p>;
                  const byLevel: Record<number, any[]> = {};
                  for (const spell of spells) {
                    const lvl = spell.level ?? 0;
                    if (!byLevel[lvl]) byLevel[lvl] = [];
                    byLevel[lvl].push(spell);
                  }
                  return Object.keys(byLevel).sort((a, b) => Number(a) - Number(b)).map((lvl) => (
                    <div key={lvl} style={{ marginBottom: '12px' }}>
                      <div style={{ color: '#c9a84c', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        {LEVEL_NAMES[Number(lvl)] || `Level ${lvl}`}
                      </div>
                      {byLevel[Number(lvl)].map((spell: any, si: number) => (
                        <div key={si} onClick={() => setSelectedItem({ ...spell, classes: [expandedGrimoire] })}
                          style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ color: '#e8dcc8' }}>{spell.name}</span>
                          <span style={{ color: '#5a5248', fontSize: '0.7rem' }}>{getSchoolName(spell.school)} · {formatTime(spell.time)}</span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </>
        )}

        {selectedItem && <SpellDetail item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </div>
    </div>
  );
}
