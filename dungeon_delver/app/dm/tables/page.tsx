'use client';
import { useState, useEffect } from 'react';
import {
  NamedTable, CustomTable, TableRow,
  loadDataTables, loadCustomTables, saveCustomTable, deleteCustomTable, combineTables,
  rollOnTable,
} from '../../../utils/tableEngine';

const styles = {
  page: { padding: '2rem', color: 'white', fontFamily: 'serif', maxWidth: '1200px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#b8860b', marginBottom: '4px' } as const,
  sub: { color: '#a0aec0', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  panel: { background: '#1a202c', border: '1px solid #4a5568', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' } as const,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' } as const,
  input: {
    width: '100%', padding: '8px', background: '#2d3748', border: '1px solid #4a5568',
    borderRadius: '4px', color: 'white', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const,
  },
  tableCard: {
    background: '#2d3748', border: '1px solid #4a5568', borderRadius: '8px', padding: '0.75rem', cursor: 'pointer',
    transition: 'border-color 0.15s',
  } as const,
};

export default function TablesPage() {
  const [dataTables, setDataTables] = useState<NamedTable[]>([]);
  const [customTables, setCustomTables] = useState<CustomTable[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<NamedTable | null>(null);
  const [rollResult, setRollResult] = useState<{ result: string; rollValue: number } | null>(null);
  const [tab, setTab] = useState<'browse' | 'custom'>('browse');
  const [rollHistory, setRollHistory] = useState<{ tableName: string; result: string; rollValue: number }[]>([]);

  // Custom table builder state
  const [editTable, setEditTable] = useState<CustomTable | null>(null);
  const [newRowRoll, setNewRowRoll] = useState('');
  const [newRowResult, setNewRowResult] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableDesc, setNewTableDesc] = useState('');

  useEffect(() => {
    loadDataTables().then(setDataTables);
    setCustomTables(loadCustomTables());
  }, []);

  const refreshCustom = () => setCustomTables(loadCustomTables());
  const allTables = combineTables(dataTables, customTables);

  const filtered = allTables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRoll = (table: NamedTable) => {
    if (table.rows.length === 0) return;
    const result = rollOnTable(table.rows);
    setRollResult(result);
    setRollHistory(prev => [{ tableName: table.name, ...result }, ...prev].slice(0, 50));
  };

  const handleCreateTable = () => {
    if (!newTableName.trim()) return;
    const table: CustomTable = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      name: newTableName.trim(),
      description: newTableDesc.trim(),
      rows: [],
    };
    saveCustomTable(table);
    setEditTable(table);
    setNewTableName('');
    setNewTableDesc('');
    refreshCustom();
  };

  const handleAddRow = () => {
    if (!editTable || !newRowResult.trim()) return;
    const row: TableRow = { roll: newRowRoll.trim() || String(editTable.rows.length + 1), result: newRowResult.trim() };
    const updated = { ...editTable, rows: [...editTable.rows, row] };
    saveCustomTable(updated);
    setEditTable(updated);
    setNewRowRoll('');
    setNewRowResult('');
    refreshCustom();
  };

  const handleDeleteRow = (idx: number) => {
    if (!editTable) return;
    const updated = { ...editTable, rows: editTable.rows.filter((_, i) => i !== idx) };
    saveCustomTable(updated);
    setEditTable(updated);
    refreshCustom();
  };

  const handleDeleteTable = (id: string) => {
    deleteCustomTable(id);
    if (editTable?.id === id) setEditTable(null);
    refreshCustom();
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>Random Table Engine</h1>
      <p style={styles.sub}>Browse data tables, roll on them, and create your own.</p>

      <div style={{ display: 'flex', gap: '0', marginBottom: '1rem' }}>
        <button onClick={() => setTab('browse')} style={{
          padding: '8px 20px', background: tab === 'browse' ? '#6366f1' : '#2d3748',
          border: '1px solid #4a5568', color: 'white', cursor: 'pointer', borderRadius: '6px 0 0 6px', fontSize: '0.8rem',
        }}>Browse & Roll</button>
        <button onClick={() => setTab('custom')} style={{
          padding: '8px 20px', background: tab === 'custom' ? '#6366f1' : '#2d3748',
          border: '1px solid #4a5568', borderLeft: 'none', color: 'white', cursor: 'pointer', borderRadius: '0 6px 6px 0', fontSize: '0.8rem',
        }}>Custom Tables</button>
      </div>

      {rollResult && (
        <div style={{ ...styles.panel, border: '2px solid #f6e05e', marginBottom: '1rem', textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#718096', marginBottom: '4px' }}>Rolled {rollResult.rollValue}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f6e05e', marginBottom: '8px' }}>{rollResult.result}</div>
          <button onClick={() => setRollResult(null)} style={{ padding: '4px 12px', background: '#4a5568', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Dismiss</button>
        </div>
      )}

      {tab === 'browse' && (
        <>
          <div style={{ ...styles.panel, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input style={{ ...styles.input, flex: 1 }} placeholder="Search tables..." value={search} onChange={e => setSearch(e.target.value)} />
            <span style={{ fontSize: '0.75rem', color: '#718096' }}>{filtered.length} tables</span>
          </div>

          {/* Table list + selected detail */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <div style={styles.grid}>
                {filtered.map(t => (
                  <div key={t.id} style={{
                    ...styles.tableCard,
                    borderColor: selectedTable?.id === t.id ? '#f6e05e' : '#4a5568',
                  }} onClick={() => { setSelectedTable(t); setRollResult(null); }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f6e05e' }}>{t.name}</div>
                    <div style={{ fontSize: '0.6rem', color: '#718096', marginTop: '2px' }}>
                      {t.source === 'custom' ? 'Custom' : 'Data'} · {t.rows.length} rows
                    </div>
                    {t.description && <div style={{ fontSize: '0.65rem', color: '#a0aec0', marginTop: '4px' }}>{t.description}</div>}
                  </div>
                ))}
              </div>
            </div>

            {selectedTable && (
              <div style={{ flex: '0 0 350px' }}>
                <div style={styles.panel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#f6e05e' }}>{selectedTable.name}</h3>
                    <button onClick={() => handleRoll(selectedTable)}
                      style={{ padding: '6px 16px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      Roll!
                    </button>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#718096', marginBottom: '6px' }}>
                    {selectedTable.source} · {selectedTable.rows.length} entries
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {selectedTable.rows.map((row, i) => (
                      <div key={i} style={{
                        padding: '4px 6px', fontSize: '0.7rem', borderBottom: '1px solid #2d3748',
                        background: rollResult?.result === row.result ? 'rgba(99,102,241,0.2)' : 'transparent',
                      }}>
                        <span style={{ color: '#718096', marginRight: '6px', fontSize: '0.6rem' }}>{row.roll}</span>
                        {row.result}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'custom' && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Left: create/list */}
          <div style={{ flex: '1 1 350px' }}>
            <div style={styles.panel}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#b8860b' }}>Create New Table</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input style={styles.input} placeholder="Table name..." value={newTableName} onChange={e => setNewTableName(e.target.value)} />
                <input style={styles.input} placeholder="Description (optional)..." value={newTableDesc} onChange={e => setNewTableDesc(e.target.value)} />
                <button onClick={handleCreateTable} disabled={!newTableName.trim()}
                  style={{ padding: '8px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Create Table
                </button>
              </div>
            </div>

            {customTables.map(ct => (
              <div key={ct.id} style={{ ...styles.panel, cursor: 'pointer', borderColor: editTable?.id === ct.id ? '#f6e05e' : '#4a5568' }}
                onClick={() => setEditTable(ct)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f6e05e' }}>{ct.name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#718096' }}>{ct.rows.length} rows</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDeleteTable(ct.id); }}
                    style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                </div>
                {ct.description && <div style={{ fontSize: '0.65rem', color: '#a0aec0', marginTop: '4px' }}>{ct.description}</div>}
              </div>
            ))}
          </div>

          {/* Right: table editor */}
          {editTable && (
            <div style={{ flex: '1 1 500px' }}>
              <div style={styles.panel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#f6e05e' }}>{editTable.name}</h3>
                  <button onClick={() => handleRoll({ ...editTable, source: 'custom' })}
                    style={{ padding: '6px 16px', background: '#6366f1', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Roll!
                  </button>
                </div>

                {/* Add row */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input style={{ ...styles.input, width: '60px', flexShrink: 0 }} placeholder="Roll" value={newRowRoll} onChange={e => setNewRowRoll(e.target.value)} title="Roll range (e.g. 1, 2-4, d10)" />
                  <input style={{ ...styles.input, flex: 1 }} placeholder="Result text..." value={newRowResult} onChange={e => setNewRowResult(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRow()} />
                  <button onClick={handleAddRow} disabled={!newRowResult.trim()}
                    style={{ padding: '6px 12px', background: '#48bb78', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                    + Add
                  </button>
                </div>

                {/* Rows list */}
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {editTable.rows.length === 0 && <p style={{ color: '#718096', fontSize: '0.75rem' }}>No rows yet. Add some above.</p>}
                  {editTable.rows.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '4px 6px', fontSize: '0.7rem', borderBottom: '1px solid #2d3748',
                    }}>
                      <span style={{ color: '#718096', marginRight: '8px', fontSize: '0.6rem', minWidth: '30px' }}>{row.roll}</span>
                      <span style={{ flex: 1 }}>{row.result}</span>
                      <button onClick={() => handleDeleteRow(i)}
                        style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Roll history */}
          {rollHistory.length > 0 && (
            <div style={{ flex: '1 1 100%' }}>
              <div style={styles.panel}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#718096' }}>Roll History</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {rollHistory.map((h, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', padding: '3px 6px', borderBottom: '1px solid #2d3748' }}>
                      <span style={{ color: '#f6e05e' }}>{h.tableName}</span>
                      <span style={{ color: '#718096', margin: '0 6px' }}>({h.rollValue})</span>
                      {h.result}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
