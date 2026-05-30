'use client';
import { useState, useRef } from 'react';
import QRCode from 'qrcode';

const PRESETS = [
  { label: 'Lore Entry', text: 'A hidden passage winds behind the waterfall, leading to the forgotten vault of the Serpent King.' },
  { label: 'Map Note', text: 'The ruined tower at grid F7 contains a teleportation circle keyed to the wizard\'s library.' },
  { label: 'Item Description', text: 'This crystalline orb pulses with a faint inner light. When held, you hear whispered secrets from a thousand forgotten tongues.' },
  { label: 'Quest Hook', text: 'The innkeeper\'s daughter has gone missing. The last seen踪迹 was near the old mill outside town.' },
  { label: 'Custom', text: '' },
];

export default function QRPage() {
  const [text, setText] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>('Custom');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async (content: string) => {
    const t = content.trim();
    if (!t) { setError('Enter some text to generate a QR code.'); return; }
    setError(null);
    try {
      const url = await QRCode.toDataURL(t, { width: 400, margin: 2, color: { dark: '#b8860b', light: '#0f1419' } });
      setQrDataUrl(url);
    } catch {
      setError('Failed to generate QR code.');
    }
  };

  const usePreset = (label: string) => {
    setPreset(label);
    const p = PRESETS.find(x => x.label === label);
    setText(p?.text || '');
    if (p?.text) generate(p.text);
  };

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'handout-qr.png';
    a.click();
  };

  return (
    <div style={{ padding: '2rem', color: '#e2e8f0', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'serif', color: '#b8860b', fontSize: '1.4rem', marginBottom: '4px' }}>QR Code Handouts</h1>
      <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '20px' }}>Generate scannable QR codes for players to view lore, maps, and notes on their phones.</p>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginBottom: '6px' }}>Quick Presets</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => usePreset(p.label)} style={{ padding: '6px 12px', background: preset === p.label ? '#b8860b' : '#2d3748', border: 'none', color: 'white', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type lore, map directions, item descriptions, or any handout text here..."
        rows={5}
        style={{ width: '100%', padding: '10px', background: '#1e2538', border: '1px solid #4a5568', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={() => generate(text)} style={{ padding: '10px 24px', background: '#b8860b', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>Generate QR Code</button>
        {qrDataUrl && <button onClick={download} style={{ padding: '10px 24px', background: '#2d3748', border: '1px solid #4a5568', color: '#e2e8f0', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>Download PNG</button>}
      </div>

      {error && <p style={{ color: '#fc8181', fontSize: '0.8rem', marginTop: '8px' }}>{error}</p>}

      {qrDataUrl && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#0f1419', border: '1px solid #4a5568', borderRadius: '12px', padding: '16px' }}>
            <img src={qrDataUrl} alt="QR Code" style={{ width: '280px', height: '280px', imageRendering: 'pixelated' }} />
          </div>
          <p style={{ color: '#718096', fontSize: '0.75rem', marginTop: '8px' }}>Scan with any mobile camera or QR reader</p>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
