export interface TableRow {
  roll: string;
  result: string;
}

export interface NamedTable {
  id: string;
  name: string;
  source: 'data' | 'custom';
  rows: TableRow[];
  description?: string;
}

export interface CustomTable {
  id: string;
  name: string;
  description: string;
  rows: TableRow[];
}

import { campaignKey } from './campaignStorage';
const CUSTOM_TABLES_KEY = 'custom-tables';
function sk(key: string) { return campaignKey(key); }
let dataTablesCache: NamedTable[] | null = null;

function parseRollRange(roll: string): { min: number; max: number } | null {
  const clean = roll.replace(/[,. ]/g, '');
  if (/^\d+$/.test(clean)) {
    const v = parseInt(clean);
    return { min: v, max: v };
  }
  const match = clean.match(/^(\d+)[-–](\d+)$/);
  if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
  return null;
}

function rollDie(spec: string): number {
  const match = spec.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 0;
  const count = parseInt(match[1]);
  const die = parseInt(match[2]);
  const mod = parseInt(match[3] || '0');
  let total = mod;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * die) + 1;
  }
  return total;
}

export function rollOnTable(rows: TableRow[]): { result: string; rollValue: number; row: TableRow } {
  const simpleRows = rows.filter(r => parseRollRange(r.roll) !== null);
  const dieRows = rows.filter(r => r.roll.match(/^\d+d\d+/));
  const plainRows = rows.filter(r => parseRollRange(r.roll) === null && !r.roll.match(/^\d+d\d+/));

  if (simpleRows.length > 0) {
    const allNums = simpleRows.flatMap(r => {
      const range = parseRollRange(r.roll)!;
      return [range.min, range.max];
    });
    const maxVal = Math.max(...allNums);
    const rollValue = Math.floor(Math.random() * maxVal) + 1;
    const match = simpleRows.find(r => {
      const range = parseRollRange(r.roll)!;
      return rollValue >= range.min && rollValue <= range.max;
    });
    if (match) return { result: match.result, rollValue, row: match };
  }

  if (dieRows.length > 0) {
    const rollValue = rollDie(dieRows[0].roll.replace(/[^0-9d+/-]/g, ''));
    const match = dieRows.find(() => true);
    if (match) return { result: match.result, rollValue, row: match };
  }

  if (plainRows.length > 0) {
    const idx = Math.floor(Math.random() * plainRows.length);
    const row = plainRows[idx];
    return { result: row.result, rollValue: idx + 1, row };
  }

  return { result: '(empty table)', rollValue: 0, row: { roll: '', result: '(empty table)' } };
}

function clean5eToolsUrl(text: string): string {
  return text.replace(/\{@\w+ ([^}]+)\}/g, '$1').replace(/\|(?:phb|xmm|psx|xphb|mm)\}/g, '}').replace(/[|}]/g, '');
}

export async function loadDataTables(): Promise<NamedTable[]> {
  if (dataTablesCache) return dataTablesCache;
  try {
    const resp = await fetch('/data/tables.json');
    const data = await resp.json();
    const tables: NamedTable[] = (data.table || []).map((t: any, i: number) => {
      const source = t.source || 'data';
      const rows: TableRow[] = (t.rows || []).map((row: any) => {
        if (Array.isArray(row)) {
          return { roll: String(row[0] || ''), result: clean5eToolsUrl(row.slice(1).join(' ')) };
        }
        return { roll: '', result: clean5eToolsUrl(String(row)) };
      });
      return {
        id: `data-${source}-${i}`,
        name: t.name || t.caption || `Table ${i + 1}`,
        source: 'data',
        rows,
        description: t.caption || '',
      };
    });
    dataTablesCache = tables;
    return tables;
  } catch {
    return [];
  }
}

export function loadCustomTables(): CustomTable[] {
  try {
    const raw = localStorage.getItem(sk(CUSTOM_TABLES_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomTable(table: CustomTable): void {
  const list = loadCustomTables();
  const idx = list.findIndex(t => t.id === table.id);
  if (idx >= 0) list[idx] = table;
  else list.push(table);
  localStorage.setItem(sk(CUSTOM_TABLES_KEY), JSON.stringify(list));
}

export function deleteCustomTable(id: string): void {
  const list = loadCustomTables().filter(t => t.id !== id);
  localStorage.setItem(sk(CUSTOM_TABLES_KEY), JSON.stringify(list));
}

export function combineTables(data: NamedTable[], custom: CustomTable[]): NamedTable[] {
  const customs: NamedTable[] = custom.map(c => ({
    id: c.id,
    name: c.name,
    source: 'custom' as const,
    rows: c.rows,
    description: c.description,
  }));
  return [...data, ...customs];
}
