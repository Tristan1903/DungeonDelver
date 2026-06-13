'use client';
// ===== 📘 FILE: app/library/classes/page.tsx =====
// 🎯 PURPOSE: Classes library — expandable class cards with class theme colors, icons,
//   and lazy-loaded feature data.
// 🧠 REACT CONCEPT: Lazy Data Loading + Expand/Collapse — demonstrates on-demand data fetching:
//   class features are loaded only when the user clicks to expand a class card, using a
//   state cache to avoid re-fetching.
// =====
import { useState, useEffect } from 'react';
import { DataEngine } from '../../../utils/dataLoader';
import { CLASS_LIST } from '../../../utils/libraryHelpers';
import { CLASS_THEMES } from '../../../utils/classThemes';
import { classIconPath } from '../../../utils/imgPaths';
import { useIsMobile } from '../../../utils/useIsMobile';
import LibrarySidebar from '../../../components/LibrarySidebar';

export default function ClassesPage() {
  const isMobile = useIsMobile();
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [classDataCache, setClassDataCache] = useState<Record<string, any>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const loadClassData = async (className: string) => {
    if (classDataCache[className]) return;
    try {
      const data = await DataEngine.getClassFullData(className);
      if (data) setClassDataCache(prev => ({ ...prev, [className]: data }));
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
      <LibrarySidebar />
      <div style={{ marginLeft: isMobile ? '0' : '200px', flex: 1, maxWidth: '960px', padding: '24px 32px 80px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '8px' }}>
          Classes
        </h1>
        <p style={{ color: '#5a5248', fontSize: '0.85rem', marginBottom: '20px' }}>
          Browse full class descriptions. Click a class to expand its features.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {CLASS_LIST.map((cls) => {
            const themeKey = cls.replace(' ', '');
            const theme = CLASS_THEMES[themeKey];
            const isExpanded = expandedClass === cls;
            const classData = classDataCache[cls];
            const imgFailed = imgErrors[cls];

            return (
              <div key={cls}>
                <div onClick={async () => {
                  if (isExpanded) { setExpandedClass(null); return; }
                  setExpandedClass(cls);
                  if (!classDataCache[cls]) await loadClassData(cls);
                }}
                  style={{
                    padding: '16px', background: `linear-gradient(135deg, ${theme?.color || '#1a1714'} 0%, #1a1714 100%)`,
                    border: `1px solid ${theme?.tagline_color || '#3d3528'}44`, borderRadius: '8px',
                    cursor: 'pointer', textAlign: 'center', minHeight: '120px', display: 'flex',
                    flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    gap: '6px', transition: 'all 0.15s', transform: isExpanded ? 'scale(1.02)' : 'none',
                    boxShadow: isExpanded ? `0 0 12px ${theme?.tagline_color || '#c9a84c'}33` : 'none',
                  }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imgFailed ? (
                      <span style={{ fontSize: '1.6rem' }}>📚</span>
                    ) : (
                      <img src={classIconPath(cls)}
                        onError={() => setImgErrors(prev => ({ ...prev, [cls]: true }))}
                        alt={cls}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ color: theme?.tagline_color || '#c9a84c', fontWeight: 700, fontSize: '0.85rem' }}>{cls}</div>
                  {theme && <div style={{ color: '#8a7e6a', fontSize: '0.65rem' }}>{theme.tagline}</div>}
                </div>

                {isExpanded && classData && (
                  <div style={{ marginTop: '4px', padding: '14px', background: '#1a1714', borderRadius: '8px', border: `1px solid ${theme?.tagline_color || '#3d3528'}44`, fontSize: '0.8rem' }}>
                    {classData.hd && (
                      <div style={{ marginBottom: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span><strong style={{ color: '#c9a84c' }}>Hit Die:</strong> d{classData.hd.faces}</span>
                        {classData.proficiency && <span><strong style={{ color: '#c9a84c' }}>Saves:</strong> {classData.proficiency.map((p: string) => p.toUpperCase()).join(', ')}</span>}
                        {classData.spellcastingAbility && <span><strong style={{ color: '#c9a84c' }}>Spellcasting:</strong> {classData.spellcastingAbility.toUpperCase()}</span>}
                      </div>
                    )}
                    {classData.classFeature && classData.classFeature.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#c9a84c', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Class Features</div>
                        {classData.classFeature.slice(0, 25).map((f: any, fi: number) => (
                          <div key={fi} style={{ marginBottom: '4px' }}>
                            <strong style={{ color: '#e8dcc8', fontSize: '0.75rem' }}>
                              {f.level ? `Lv ${f.level} — ` : ''}{f.name}
                            </strong>
                            {f.entries && (
                              <div style={{ color: '#8a7e6a', fontSize: '0.7rem', marginTop: '1px', lineHeight: 1.4 }}>
                                {Array.isArray(f.entries) ? f.entries.map((e: any, ei: number) => <div key={ei}>{typeof e === 'string' ? e : ''}</div>) : null}
                              </div>
                            )}
                          </div>
                        ))}
                        {classData.classFeature.length > 25 && (
                          <div style={{ color: '#5a5248', fontStyle: 'italic', fontSize: '0.7rem', marginTop: '6px' }}>
                            +{classData.classFeature.length - 25} more features
                          </div>
                        )}
                      </div>
                    )}
                    {(!classData.classFeature || classData.classFeature.length === 0) && (
                      <p style={{ color: '#5a5248', fontStyle: 'italic', fontSize: '0.75rem' }}>Feature data loading...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
