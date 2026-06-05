'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DataEngine } from '../../utils/dataLoader';
import LibrarySidebar from '../../components/LibrarySidebar';

export default function LibraryPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    DataEngine.getBooks().then(setBooks);
  }, []);

  const q = search.toLowerCase();
  const filtered = q ? books.filter((b: any) => b.name?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)) : books;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
      <LibrarySidebar />
      <div style={{ marginLeft: '200px', flex: 1, maxWidth: '960px', padding: '24px 32px 80px' }}>
        <h1 style={{ fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '8px' }}>
          Bookshelf
        </h1>
        <p style={{ color: '#5a5248', fontSize: '0.85rem', marginBottom: '20px' }}>
          Browse the library. Select a category from the sidebar or search for a book below.
        </p>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books..."
          style={{ width: '100%', padding: '10px 14px', background: '#1a1714', border: '1px solid #3d3528', color: '#e8dcc8', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '24px', boxSizing: 'border-box' }} />

        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map((book: any, i: number) => (
            <Link key={i} href={`/library/${book.source?.toLowerCase() || book.id?.toLowerCase() || ''}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ padding: '14px', background: '#1a1714', borderRadius: '6px', border: '1px solid #3d3528', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ color: '#c9a84c', fontSize: '0.95rem' }}>{book.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#5a5248', marginTop: '2px' }}>
                      {book.author} {book.published && `· ${book.published}`}
                    </div>
                  </div>
                  <span style={{ padding: '2px 8px', background: '#0c0e14', borderRadius: '3px', fontSize: '0.65rem', color: '#5a5248' }}>{book.group}</span>
                </div>
                {book.contents && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {book.contents.filter((c: any) => c.name !== 'Credits').map((c: any, j: number) => (
                      <span key={j} style={{ padding: '2px 6px', background: '#0c0e14', borderRadius: '3px', fontSize: '0.65rem', color: '#e8dcc8' }}>{c.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
