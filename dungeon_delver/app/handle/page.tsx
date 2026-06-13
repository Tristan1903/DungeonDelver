'use client';
// ===== 📘 FILE: app/handle/page.tsx =====
// 🎯 PURPOSE: Deep link handler — receives an Obsidian-style `url` param, parses it, and
//   redirects to the appropriate internal route.
// 🧠 REACT CONCEPT: Suspense + useSearchParams — demonstrates the Next.js pattern for accessing
//   search params in client components: wrap the consuming component in <Suspense> because
//   useSearchParams() triggers client-side rendering that needs a fallback boundary.
// =====
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseDeepLink, resolveDeepLink } from '../../utils/deepLinkEngine';

function HandleInner() {
  const [msg, setMsg] = useState('Processing link...');
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlParam = searchParams.get('url');
    const raw = urlParam || window.location.href;

    try {
      const target = parseDeepLink(raw);
      if (target) {
        const route = resolveDeepLink(target);
        setMsg(`Redirecting to ${route}...`);
        window.location.href = route;
      } else {
        setMsg('Invalid deep link.');
      }
    } catch { setMsg('Error processing link.'); }
  }, [searchParams]);

  return <p>{msg}</p>;
}

export default function HandlePage() {
  return (
    <div style={{ padding: '2rem', color: 'white', textAlign: 'center', fontFamily: 'serif' }}>
      <h1 style={{ color: '#b8860b' }}>Deep Link Handler</h1>
      <Suspense fallback={<p style={{ color: '#718096' }}>Loading...</p>}>
        <HandleInner />
      </Suspense>
    </div>
  );
}
