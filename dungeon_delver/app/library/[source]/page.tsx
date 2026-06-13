// ===== 📘 FILE: app/library/[source]/page.tsx =====
// 🎯 PURPOSE: Book reader page — server component that generates static params for all
//   book sources, then delegates rendering to the BookReaderClient component.
// 🧠 REACT CONCEPT: Server Component + generateStaticParams — this is a SERVER component
//   (no 'use client') that tells Next.js which dynamic routes to pre-render at build time
//   via generateStaticParams. The actual interactive UI lives in BookReaderClient.
// =====
import booksManifest from '@/public/data/books.json';
import BookReaderClient from './BookReaderClient';

export function generateStaticParams() {
  const sources = (booksManifest as any).book
    ?.map((b: any) => b.source?.toLowerCase())
    .filter(Boolean) || [];
  return sources.map((source: string) => ({ source }));
}

export default function BookReaderPage() {
  return <BookReaderClient />;
}
