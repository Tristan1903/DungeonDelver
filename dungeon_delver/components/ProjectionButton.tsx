'use client';
import { useCallback } from 'react';

interface ProjectionButtonProps {
  label?: string;
  contentType: string;
  content: any;
  disabled?: boolean;
}

export default function ProjectionButton({ label, contentType, content, disabled }: ProjectionButtonProps) {
  const handleClick = useCallback(() => {
    const lanRoom = localStorage.getItem('dd-lan-room');
    const lanToken = localStorage.getItem('dd-lan-token');
    if (!lanRoom || !lanToken) {
      alert('Not connected to a LAN session. Open the LAN page first.');
      return;
    }
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const senderId = `dm-proj-${Date.now()}`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: lanRoom, senderId, payload: { role: 'dm' }, timestamp: Date.now() }));
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'project', room: lanRoom, senderId, payload: { contentType, content }, timestamp: Date.now() }));
        setTimeout(() => ws.close(), 100);
      }, 200);
    };
  }, [contentType, content]);

  return (
    <button onClick={handleClick} disabled={disabled}
      title="Project to players"
      style={{
        padding: '4px 10px', background: '#c9a84c', border: 'none', borderRadius: '4px',
        color: '#0c0e14', fontSize: '0.65rem', cursor: disabled ? 'default' : 'pointer',
        fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px',
        opacity: disabled ? 0.4 : 1,
      }}>
      📺 {label || 'Show Players'}
    </button>
  );
}
