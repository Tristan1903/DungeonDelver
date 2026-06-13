'use client';
// ===== 📘 FILE: app/library/[source]/BookReaderClient.tsx =====
// 🎯 PURPOSE: Book reader — loads book data by source from the URL params, renders a
//   navigation sidebar with scroll-spy highlighting, and renders book content with
//   support for tables, lists, images, quotes, insets, and wiki-style entries.
// 🧠 REACT CONCEPT: IntersectionObserver Scroll-Spy — uses useRef + IntersectionObserver to
//   track which section is currently visible and highlight it in the sidebar nav. Also
//   demonstrates recursive renderBookEntries for deeply nested 5e data structures.
// =====
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DataEngine } from '../../../utils/dataLoader';
import { cleanString } from '../../../utils/formatters';

function renderBookEntries(entries: any): React.ReactNode {
  if (!entries) return null;
  if (typeof entries === 'string') return <p style={{ margin: '4px 0' }}>{cleanString(entries)}</p>;
  if (Array.isArray(entries)) return entries.map((e, i) => <div key={i}>{renderBookEntries(e)}</div>);
  if (typeof entries === 'object') {
    const t = entries.type;
    if (t === 'section') return null;
    if (entries.items) {
      if (entries.style?.startsWith('list-hang')) {
        return (
          <div style={{ margin: '8px 0' }}>
            {entries.items.map((it: any, i: number) => (
              <div key={i} style={{ marginBottom: '6px' }}>
                {it.name && <strong style={{ color: '#c9a84c' }}>{cleanString(it.name)}</strong>}
                {it.entry && <span style={{ marginLeft: it.name ? '4px' : 0 }}>{renderBookEntries(it.entry)}</span>}
                {it.entries && renderBookEntries(it.entries)}
              </div>
            ))}
          </div>
        );
      }
      return <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{entries.items.map((it: any, i: number) => <li key={i} style={{ marginBottom: '2px' }}>{renderBookEntries(it.entry || it)}</li>)}</ul>;
    }
    if (entries.entries) {
      const inner = (
        <div style={{ margin: '4px 0' }}>
          {Array.isArray(entries.entries) ? entries.entries.map((e: any, i: number) => <div key={i}>{renderBookEntries(e)}</div>) : renderBookEntries(entries.entries)}
        </div>
      );
      if (entries.name) {
        return (
          <div style={{ margin: '10px 0' }}>
            {entries.type !== 'inset' ? (
              <div>
                {inner}
              </div>
            ) : (
              <div style={{ borderLeft: '3px solid #c9a84c', paddingLeft: '12px', margin: '12px 0' }}>
                <div style={{ fontSize: '0.75rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{cleanString(entries.name)}</div>
                {inner}
              </div>
            )}
          </div>
        );
      }
      return inner;
    }
    if (t === 'list' && entries.items) {
      return <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{entries.items.map((it: any, i: number) => <li key={i} style={{ marginBottom: '2px' }}>{renderBookEntries(it.entry || it)}</li>)}</ul>;
    }
    if (t === 'table' && entries.rows) {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: '0.75rem' }}>
          {entries.colLabels && (
            <thead><tr>{entries.colLabels.map((l: string, i: number) => <th key={i} style={{ border: '1px solid #3d3528', padding: '4px 6px', color: '#c9a84c' }}>{l}</th>)}</tr></thead>
          )}
          <tbody>{entries.rows.map((row: any[], ri: number) => (
            <tr key={ri}>{row.map((cell: any, ci: number) => <td key={ci} style={{ border: '1px solid #3d3528', padding: '4px 6px' }}>{renderBookEntries(cell)}</td>)}</tr>
          ))}</tbody>
        </table>
      );
    }
    if (t === 'image' && entries.href) {
      const src = typeof entries.href === 'string' ? entries.href : entries.href.path || '';
      return (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <img src={src} alt={entries.title || ''} style={{ maxWidth: '100%', borderRadius: '4px' }} />
          {entries.title && <p style={{ fontSize: '0.7rem', color: '#5a5248', marginTop: '4px', fontStyle: 'italic' }}>{entries.title}</p>}
        </div>
      );
    }
    if (t === 'quote') {
      return (
        <blockquote style={{ borderLeft: '3px solid #c9a84c', paddingLeft: '16px', margin: '12px 0', fontStyle: 'italic', color: '#d4c8a8' }}>
          {renderBookEntries(entries.entries)}
          {entries.by && <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#c9a84c' }}>— {entries.by}</div>}
        </blockquote>
      );
    }
    if (t === 'inset') {
      return (
        <div style={{ borderLeft: '3px solid #c9a84c', paddingLeft: '12px', margin: '12px 0' }}>
          {entries.name && <div style={{ fontSize: '0.75rem', color: '#c9a84c', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{cleanString(entries.name)}</div>}
          {renderBookEntries(entries.entries)}
        </div>
      );
    }
    return <span style={{ fontSize: '0.75rem', color: '#5a5248' }}>{JSON.stringify(entries)}</span>;
  }
  return <span style={{ fontSize: '0.75rem', color: '#5a5248' }}>{JSON.stringify(entries)}</span>;
}

interface NavSection {
  id: string;
  name: string;
  page: number;
  children: { id: string; name: string; page: number }[];
}

function hasName(entry: any): entry is { name: string; id?: string; page?: number; entries?: any[]; type?: string } {
  return entry && typeof entry === 'object' && typeof entry.name === 'string' && entry.name.length > 0;
}

function isNavWorthy(entry: any): boolean {
  if (!hasName(entry)) return false;
  if (entry.type === 'section') return true;
  if (entry.type === 'entries' && entry.entries && entry.entries.length > 0) return true;
  if (entry.type === 'inset' && entry.entries && entry.entries.length > 0) return true;
  return false;
}

function extractNav(data: any[]): NavSection[] {
  const nav: NavSection[] = [];
  const walk = (entries: any[], parent: any[] | null) => {
    if (!entries) return;
    for (const entry of entries) {
      if (isNavWorthy(entry)) {
        const children: { id: string; name: string; page: number }[] = [];
        if (entry.entries) {
          for (const sub of entry.entries) {
            if (isNavWorthy(sub)) {
              children.push({ id: sub.id || sub.name, name: sub.name, page: sub.page || 0 });
            }
          }
        }
        if (parent === null) {
          nav.push({ id: entry.id || entry.name, name: entry.name, page: entry.page || 0, children });
        }
      }
    }
  };
  walk(data, null);
  return nav;
}

function flattenOrderedSections(data: any[]): any[] {
  const result: any[] = [];
  const walk = (entries: any[]) => {
    if (!entries) return;
    for (const entry of entries) {
      if (isNavWorthy(entry)) {
        result.push(entry);
        if (entry.entries) walk(entry.entries);
      }
    }
  };
  walk(data);
  return result;
}

export default function BookReaderClient() {
  const params = useParams();
  const source = (params?.source as string)?.toLowerCase() || '';
  const [bookMeta, setBookMeta] = useState<any>(null);
  const [orderedSections, setOrderedSections] = useState<any[]>([]);
  const [nav, setNav] = useState<NavSection[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const load = async () => {
      const books = await DataEngine.getBooks();
      const meta = books.find((b: any) => b.source?.toLowerCase() === source || b.id?.toLowerCase() === source);
      setBookMeta(meta || { name: source.toUpperCase(), source: source.toUpperCase() });

      try {
        const raw = await DataEngine.loadLocalJson(`data/book/book-${source}.json`);
        const data = raw?.data || [];
        const sections = extractNav(data);
        setNav(sections);
        const ordered = flattenOrderedSections(data);
        setOrderedSections(ordered);
        if (ordered.length > 0) {
          setActiveSection(ordered[0].id || ordered[0].name);
        }
      } catch {
        setOrderedSections([]);
        setNav([]);
      }
      setLoading(false);
    };
    load();
  }, [source]);

  useEffect(() => {
    if (orderedSections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            if (id) setActiveSection(id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    observerRef.current = observer;
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [orderedSections]);

  const setSectionRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
      if (observerRef.current) observerRef.current.observe(el);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: '#5a5248' }}>Loading book...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        width: navCollapsed ? '0px' : '280px', minWidth: navCollapsed ? '0px' : '280px',
        background: '#0c0e14', borderRight: '1px solid #3d3528',
        overflowY: 'auto', transition: 'width 0.2s, min-width 0.2s',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #3d3528' }}>
          <Link href="/library" style={{ color: '#5a5248', textDecoration: 'none', fontSize: '0.75rem', display: 'block', marginBottom: '8px' }}>← Back to Library</Link>
          <h2 style={{ color: '#c9a84c', fontSize: '0.95rem', margin: 0, lineHeight: 1.3 }}>{bookMeta?.name || source.toUpperCase()}</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {nav.map((section) => (
            <div key={section.id}>
              <div
                onClick={() => scrollToSection(section.id)}
                style={{
                  padding: '8px 16px', cursor: 'pointer', fontSize: '0.78rem',
                  color: activeSection === section.id ? '#c9a84c' : '#e8dcc8',
                  background: activeSection === section.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                  borderLeft: activeSection === section.id ? '3px solid #c9a84c' : '3px solid transparent',
                  fontWeight: activeSection === section.id ? 700 : 400,
                }}>
                {section.name}
              </div>
              {section.children.length > 0 && (
                <div>
                  {section.children.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => scrollToSection(child.id)}
                      style={{
                        padding: '4px 16px 4px 32px', cursor: 'pointer', fontSize: '0.7rem',
                        color: activeSection === child.id ? '#c9a84c' : '#8a7e6a',
                        background: activeSection === child.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                        borderLeft: activeSection === child.id ? '3px solid #c9a84c' : '3px solid transparent',
                      }}>
                      {child.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setNavCollapsed(!navCollapsed)}
        style={{
          position: 'fixed', left: navCollapsed ? '8px' : '288px', top: '8px', zIndex: 50,
          background: '#1a1714', border: '1px solid #3d3528', color: '#c9a84c',
          borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem',
          transition: 'left 0.2s',
        }}>
        {navCollapsed ? '☰' : '✕'}
      </button>

      <div ref={contentRef} style={{
        flex: 1, overflowY: 'auto', padding: '32px 48px', maxWidth: '800px', margin: '0 auto',
      }}>
        <Link href="/library" style={{ color: '#5a5248', textDecoration: 'none', fontSize: '0.75rem', display: 'inline-block', marginBottom: '16px' }}>← Back to Library</Link>

        {bookMeta && (
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #3d3528' }}>
            <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', margin: '0 0 4px 0', fontSize: '1.5rem' }}>{bookMeta.name}</h1>
            {bookMeta.author && <p style={{ color: '#5a5248', fontSize: '0.8rem', margin: 0 }}>By {bookMeta.author}</p>}
            {bookMeta.group && <p style={{ color: '#5a5248', fontSize: '0.75rem', margin: '4px 0 0 0' }}>{bookMeta.group}</p>}
          </div>
        )}

        {orderedSections.length > 0 ? (
          <div style={{ lineHeight: 1.7, fontSize: '0.9rem' }}>
            {orderedSections.map((section, idx) => {
              const sectionId = section.id || section.name;
              return (
                <div
                  key={sectionId}
                  ref={(el) => setSectionRef(sectionId, el)}
                  data-section-id={sectionId}
                  style={{ marginBottom: '32px', scrollMarginTop: '80px' }}
                >
                  <h2 style={{
                    color: '#c9a84c', fontSize: '1.2rem', marginBottom: '16px',
                    fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif',
                    borderBottom: idx > 0 ? '1px solid #3d3528' : 'none',
                    paddingTop: idx > 0 ? '16px' : 0,
                  }}>
                    {cleanString(section.name)}
                  </h2>
                  <div style={{ color: '#e8dcc8' }}>
                    {section.entries ? renderBookEntries(section.entries.filter((e: any) => !(e && typeof e === 'object' && e.type === 'section'))) : <p style={{ color: '#5a5248', fontStyle: 'italic' }}>No content.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#5a5248', textAlign: 'center', padding: '60px 0' }}>
            <p>No content available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
