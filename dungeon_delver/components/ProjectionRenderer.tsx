'use client';
import { useState, useMemo } from 'react';
import { parseBlock, tokenizeInline, isListItem, parseListItems, rollFormula, type InlineToken, type StatBlockData } from '../utils/projectionParser';

interface Props {
  content: string;
  contentType?: string;
  onRoll?: (formula: string) => void;
}

export default function ProjectionRenderer({ content, contentType, onRoll }: Props) {
  const [rollResult, setRollResult] = useState<string | null>(null);

  const lines = useMemo(() => {
    const raw = typeof content === 'string' ? content : '';
    const allLines = raw.split('\n');
    const result: { type: 'block'; block: ReturnType<typeof parseBlock> }[] = [];

    let i = 0;
    while (i < allLines.length) {
      const line = allLines[i];

      if (isListItem(line)) {
        const items: string[] = [];
        while (i < allLines.length && isListItem(allLines[i])) {
          items.push(allLines[i]);
          i++;
        }
        result.push({
          type: 'block',
          block: { type: 'list', items: parseListItems(items) },
        });
        continue;
      }

      const block = parseBlock(line);
      result.push({ type: 'block', block });
      i++;
    }

    return result;
  }, [content]);

  const handleDiceClick = (formula: string) => {
    const result = rollFormula(formula);
    if (result) {
      setRollResult(`${formula} = ${result.total} [${result.rolls.join(',')}]`);
      setTimeout(() => setRollResult(null), 3000);
      onRoll?.(formula);
    }
  };

  const renderInline = (text: string) => {
    return tokenizeInline(text).map((token, i) => renderToken(token, i));
  };

  const renderToken = (token: InlineToken, key: number) => {
    switch (token.type) {
      case 'bold':
        return <strong key={key} style={{ color: '#e8dcc8', fontWeight: 'bold' }}>{renderInline(token.text || '')}</strong>;
      case 'italic':
        return <em key={key} style={{ fontStyle: 'italic', color: '#d4c8b0' }}>{renderInline(token.text || '')}</em>;
      case 'code':
        return <code key={key} style={{ background: '#0c0e14', padding: '1px 4px', borderRadius: '3px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#c9a84c' }}>{token.text}</code>;
      case 'link':
        return <a key={key} href={token.href} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c', textDecoration: 'underline' }}>{token.text}</a>;
      case 'image':
        return (
          <div key={key} style={{ margin: '8px 0' }}>
            <img src={token.href} alt={token.alt || ''} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px', border: '1px solid #3d3528' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        );
      case 'dice':
        return (
          <button key={key} onClick={() => handleDiceClick(token.formula || '')}
            style={{ background: '#2d3748', border: '1px solid #c9a84c', borderRadius: '4px', color: '#c9a84c', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', margin: '0 2px' }}>
            [{token.formula}]
          </button>
        );
      case 'stat':
        return token.stat ? renderStatInline(token.stat, key) : null;
      case 'text':
      default:
        return <span key={key}>{token.text}</span>;
    }
  };

  const renderStatInline = (stat: StatBlockData, key: number) => (
    <span key={key} style={{ display: 'inline-flex', gap: '8px', background: '#0c0e14', border: '1px solid #c9a84c', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', margin: '0 2px' }}>
      <strong style={{ color: '#c9a84c' }}>{stat.name}</strong>
      <span style={{ color: '#8a7e6a' }}>AC {stat.ac}</span>
      <span style={{ color: '#16a34a' }}>HP {stat.hp}</span>
      {stat.hit && <span style={{ color: '#a83232' }}>{stat.hit} hit</span>}
    </span>
  );

  const renderStatBlock = (stat: StatBlockData, key: number) => (
    <div key={key} style={{ background: '#0c0e14', border: '1px solid #c9a84c', borderRadius: '8px', padding: '12px', margin: '8px 0' }}>
      <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '6px' }}>{stat.name}</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
        <div><span style={{ color: '#8a7e6a' }}>AC </span><strong style={{ color: '#e8dcc8' }}>{stat.ac}</strong></div>
        <div><span style={{ color: '#8a7e6a' }}>HP </span><strong style={{ color: '#16a34a' }}>{stat.hp}</strong></div>
        {stat.hit && <div><span style={{ color: '#8a7e6a' }}>Hit </span><strong style={{ color: '#a83232' }}>{stat.hit}</strong></div>}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <button onClick={() => handleDiceClick(`1d20${stat.hit ? stat.hit.replace('+', '+') : '+0'}`)}
          style={{ background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px', color: '#e8dcc8', padding: '3px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>
          Attack (d20)
        </button>
        <button onClick={() => handleDiceClick(`1d8+${stat.hit ? stat.hit.replace('+', '') : '0'}`)}
          style={{ background: '#2d3748', border: '1px solid #4a5568', borderRadius: '4px', color: '#e8dcc8', padding: '3px 10px', fontSize: '0.7rem', cursor: 'pointer' }}>
          Damage
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ lineHeight: 1.6, fontSize: '0.85rem' }}>
      {lines.map(({ block }, idx) => {
        switch (block.type) {
          case 'heading':
            const lvl = block.level ?? 1;
            const headingSize = lvl === 1 ? '1.2rem' : lvl === 2 ? '1rem' : '0.9rem';
            const headingColor = lvl <= 2 ? '#c9a84c' : '#e8dcc8';
            return (
              <div key={idx} style={{ fontSize: headingSize, fontWeight: 'bold', color: headingColor, margin: '8px 0 4px' }}>
                {renderInline(block.content || '')}
              </div>
            );
          case 'paragraph':
            if (!block.content) return <div key={idx} style={{ height: '0.5rem' }} />;
            return <div key={idx} style={{ margin: '2px 0' }}>{renderInline(block.content)}</div>;
          case 'list':
            return (
              <ul key={idx} style={{ margin: '4px 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                {(block.items || []).map((item, i) => (
                  <li key={i} style={{ margin: '2px 0' }}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'blockquote':
            return (
              <blockquote key={idx} style={{ borderLeft: '3px solid #c9a84c', padding: '4px 12px', margin: '6px 0', color: '#8a7e6a', fontStyle: 'italic' }}>
                {renderInline(block.content || '')}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={idx} style={{ background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '4px', padding: '8px', fontSize: '0.7rem', fontFamily: 'monospace', overflowX: 'auto', margin: '6px 0', color: '#c9a84c' }}>
                {block.content}
              </pre>
            );
          case 'hr':
            return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #3d3528', margin: '12px 0' }} />;
          case 'statblock':
            return block.stat ? renderStatBlock(block.stat, idx) : null;
          default:
            return null;
        }
      })}
      {rollResult && (
        <div style={{ marginTop: '8px', padding: '6px 10px', background: '#1a1714', borderRadius: '4px', fontSize: '0.75rem', color: '#c9a84c', border: '1px solid #3d3528' }}>
          {rollResult}
        </div>
      )}
    </div>
  );
}
