'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Character } from '../../../lib/character';
import LevelUpWizard from '../../../components/LevelUpWizard';
import { isValidCharacter } from '../../../utils/storageEngine';

function LevelUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [char, setChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = searchParams.get('id');
    if (!id) {
      setError('No character ID provided. Use ?id=<uuid> to specify a character.');
      setLoading(false);
      return;
    }

    try {
      const raw = localStorage.getItem(`dd-char-${id}`);
      if (!raw) {
        setError(`Character with ID "${id}" not found.`);
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!isValidCharacter(parsed)) {
        setError('Invalid character data.');
        setLoading(false);
        return;
      }
      setChar(parsed as Character);
    } catch (e) {
      setError('Failed to load character.');
    }
    setLoading(false);
  }, [mounted, searchParams]);

  const handleComplete = (updatedChar: Character) => {
    const key = updatedChar.id ? `dd-char-${updatedChar.id}` : `dd-char-${updatedChar.name}`;
    localStorage.setItem(key, JSON.stringify(updatedChar));
    router.push(`/character-sheet?id=${updatedChar.id || ''}`);
  };

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#a0aec0' }}>
        Loading character...
      </div>
    );
  }

  if (error || !char) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: 'white', gap: '20px' }}>
        <h2 style={{ color: '#fc8181' }}>Error</h2>
        <p style={{ color: '#a0aec0' }}>{error || 'Unknown error'}</p>
        <button onClick={() => router.push('/character-sheet')}
          style={{ padding: '10px 24px', background: '#b8860b', border: 'none', color: 'black', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
          Back to Character Sheet
        </button>
      </div>
    );
  }

  return (
    <LevelUpWizard
      existingChar={char}
      onComplete={handleComplete}
      onClose={() => router.push('/character-sheet')}
    />
  );
}

export default function LevelUpPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#a0aec0' }}>
        Loading...
      </div>
    }>
      <LevelUpContent />
    </Suspense>
  );
}


