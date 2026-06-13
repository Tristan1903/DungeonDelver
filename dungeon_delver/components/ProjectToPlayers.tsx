'use client';
import { useState, useCallback } from 'react';
import { SyncClient, SyncStatus } from '../utils/syncEngine';

interface ProjectToPlayersProps {
  syncRef: React.MutableRefObject<SyncClient | null>;
  status: SyncStatus;
  projections: any[];
}

const styles = {
  panel: { background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  input: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px' },
  textarea: { width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528', borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px', minHeight: '80px', fontFamily: 'monospace' },
  btn: { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' as const },
};

const CONTENT_TYPES = [
  { value: 'message', label: 'Message' },
  { value: 'handout', label: 'Handout' },
  { value: 'map', label: 'Map' },
  { value: 'monster', label: 'Monster Stats' },
  { value: 'item', label: 'Item' },
  { value: 'note', label: 'Note' },
];

export default function ProjectToPlayers({ syncRef, status, projections }: ProjectToPlayersProps) {
  const [contentType, setContentType] = useState('message');
  const [content, setContent] = useState('');

  const sendProjection = useCallback(() => {
    if (!content.trim() || status !== 'connected' || !syncRef.current) return;
    syncRef.current.project(contentType, content.trim());
    setContent('');
  }, [content, contentType, status, syncRef]);

  const clearAll = useCallback(() => {
    if (status !== 'connected' || !syncRef.current) return;
    syncRef.current.clearProjections();
  }, [status, syncRef]);

  return (
    <>
      <div style={styles.panel}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>Project to Players</h3>

        <select value={contentType} onChange={e => setContentType(e.target.value)}
          style={{ ...styles.input, cursor: 'pointer', appearance: 'auto' as any }}>
          {CONTENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {contentType === 'monster' ? (
          <div style={{ fontSize: '0.7rem', color: '#8a7e6a', marginBottom: '8px' }}>
            Enter monster name(s) or stats to share with players
            <textarea style={styles.textarea} placeholder="e.g., Goblin (AC 15, HP 7, +4 to hit)" value={content} onChange={e => setContent(e.target.value)} />
          </div>
        ) : (
          <textarea style={styles.textarea}
            placeholder={contentType === 'message' ? 'Type a message to send to all players...' : `Enter ${contentType} content...`}
            value={content} onChange={e => setContent(e.target.value)} />
        )}

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={sendProjection} disabled={!content.trim() || status !== 'connected'}
            style={{ ...styles.btn, background: content.trim() && status === 'connected' ? '#c9a84c' : '#5a5248', color: content.trim() && status === 'connected' ? '#0c0e14' : '#8a7e6a', flex: 1 }}>
            Send to Players
          </button>
          <button onClick={clearAll} disabled={status !== 'connected' || projections.length === 0}
            style={{ ...styles.btn, background: status === 'connected' && projections.length > 0 ? '#a83232' : '#5a5248', color: status === 'connected' && projections.length > 0 ? '#e8dcc8' : '#8a7e6a' }}>
            Clear All
          </button>
        </div>
      </div>

      {projections.length > 0 && (
        <div style={styles.panel}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#c9a84c' }}>
            Active Projections ({projections.length})
          </h3>
          {projections.map((proj, i) => (
            <div key={proj.id || i} style={{ background: '#1a1714', borderRadius: '4px', padding: '8px', marginBottom: '6px', fontSize: '0.75rem' }}>
              <div style={{ color: '#c9a84c', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>
                {proj.contentType || 'message'}
              </div>
              <div style={{ color: '#e8dcc8' }}>{typeof proj.content === 'string' ? proj.content : JSON.stringify(proj.content)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
