'use client';
import { useState } from 'react';
import { supabase } from '../utils/supabase'; // Your singleton instance
import { MonsterSchema } from '../lib/schema';

export default function MonsterImporter() {
  const[status, setStatus] = useState('Ready');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawData = JSON.parse(e.target?.result as string);
        console.log("Raw Data:", rawData);

        // Validate
        const validatedData = MonsterSchema.parse(rawData);
        
        // Upload to Supabase
        const { error } = await supabase
          .from('monsters')
          .insert([{ name: validatedData.name, data: validatedData }]);

        if (error) {
          console.error("Supabase Error:", error);
          setStatus('Error: Database upload failed.');
        } else {
          setStatus('Success! Monster imported to database.');
        }
      } catch (err) {
        console.error("Validation Error:", err);
        setStatus('Error: Validation failed.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input type="file" accept=".json" onChange={handleFileUpload} />
      <p>Status: {status}</p>
    </div>
  );
}