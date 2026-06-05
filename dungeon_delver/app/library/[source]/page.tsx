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
