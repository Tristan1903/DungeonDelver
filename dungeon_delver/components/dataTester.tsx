'use client';
import { useState } from 'react';
import { DataEngine } from '../utils/dataLoader';

export default function DataTester() {
  const [result, setResult] = useState<string>('');

  const testLoad = async () => {
    // Let's try to load the Monsters from the Monster Manual
    const data = await DataEngine.loadLocalJson('data/bestiary/bestiary-mm.json');
    
    if (data && data.monster) {
      setResult(`Loaded ${data.monster.length} monsters! First one: ${data.monster[0].name}`);
    } else {
      setResult("Failed to load or invalid format.");
    }
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid gold' }}>
      <button onClick={testLoad}>Test Load Monster Manual</button>
      <p>Result: {result}</p>
    </div>
  );
}