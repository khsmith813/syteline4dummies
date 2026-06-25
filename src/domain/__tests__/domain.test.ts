import { describe, it, expect } from 'vitest';
import { parseItems, parseOperations, parseMaterials } from '../parse.ts';
import { buildStore, opKey } from '../store.ts';
import { buildFlatTree } from '../tree.ts';
import { validate } from '../validate.ts';
import { exportStore } from '../export.ts';
import { nextOperationNumber, nextSeq, validateOperationNumber } from '../keys.ts';
import { makeFixtureCsvs, makeOpCsvRow, makeMatCsvRow } from './fixtures.ts';
import { ITEM_COL, OP_COL, MAT_COL } from '../columns.ts';

// ── Helper ────────────────────────────────────────────────────────────────────

function buildFromFixture() {
  const { itemsCsv, opsCsv, matsCsv } = makeFixtureCsvs();
  const { headers: ih, rows: items } = parseItems(itemsCsv);
  const { headers: oh, rows: ops } = parseOperations(opsCsv);
  const { headers: mh, rows: mats } = parseMaterials(matsCsv);
  const store = buildStore(ih, items, oh, ops, mh, mats);
  return store;
}

// ── Parse tests ───────────────────────────────────────────────────────────────

describe('parseItems', () => {
  it('parses item number and description', () => {
    const { itemsCsv } = makeFixtureCsvs();
    const { rows } = parseItems(itemsCsv);
    expect(rows.map(r => r.item)).toEqual(['ROOT-A', 'SUB-B', 'LEAF-C', 'ORPHAN-D']);
    expect(rows[0]?.description).toBe('Test Item');
  });

  it('parses boolean stocked correctly', () => {
    const { itemsCsv } = makeFixtureCsvs();
    const { rows } = parseItems(itemsCsv);
    expect(rows[0]?.stocked).toBe(true);
  });

  it('preserves all raw columns', () => {
    const { itemsCsv } = makeFixtureCsvs();
    const { rows } = parseItems(itemsCsv);
    expect(rows[0]?._raw.length).toBe(ITEM_COL.TOTAL_COLS);
  });
});

describe('parseOperations', () => {
  it('parses item, operation number, and WC', () => {
    const { opsCsv } = makeFixtureCsvs();
    const { rows } = parseOperations(opsCsv);
    expect(rows[0]?.item).toBe('ROOT-A');
    expect(rows[0]?.operation).toBe(10);
    expect(rows[0]?.wc).toBe('WC1');
  });

  it('preserves all raw columns', () => {
    const { opsCsv } = makeFixtureCsvs();
    const { rows } = parseOperations(opsCsv);
    expect(rows[0]?._raw.length).toBe(OP_COL.TOTAL_COLS);
  });
});

describe('parseMaterials', () => {
  it('parses material, item, operation, seq', () => {
    const { matsCsv } = makeFixtureCsvs();
    const { rows } = parseMaterials(matsCsv);
    expect(rows[0]?.material).toBe('SUB-B');
    expect(rows[0]?.item).toBe('ROOT-A');
    expect(rows[0]?.operation).toBe(10);
    expect(rows[0]?.seq).toBe(1);
  });

  it('preserves all raw columns including duplicate Revision cols', () => {
    const { matsCsv } = makeFixtureCsvs();
    const { rows } = parseMaterials(matsCsv);
    expect(rows[0]?._raw.length).toBe(MAT_COL.TOTAL_COLS);
  });
});

// ── Store / index tests ───────────────────────────────────────────────────────

describe('buildStore', () => {
  it('indexes items by item number', () => {
    const store = buildFromFixture();
    expect(store.itemMap.has('ROOT-A')).toBe(true);
    expect(store.itemMap.has('ORPHAN-D')).toBe(true);
  });

  it('identifies mfgItems correctly', () => {
    const store = buildFromFixture();
    expect(store.mfgItems.has('ROOT-A')).toBe(true);
    expect(store.mfgItems.has('SUB-B')).toBe(true);
    expect(store.mfgItems.has('LEAF-C')).toBe(false);
    expect(store.mfgItems.has('ORPHAN-D')).toBe(false);
  });

  it('identifies consumedItems correctly', () => {
    const store = buildFromFixture();
    expect(store.consumedItems.has('SUB-B')).toBe(true);   // consumed by ROOT-A
    expect(store.consumedItems.has('LEAF-C')).toBe(true);  // consumed by SUB-B
    expect(store.consumedItems.has('ROOT-A')).toBe(false); // top-level
    expect(store.consumedItems.has('ORPHAN-D')).toBe(false);
  });

  it('sorts operations by operation number', () => {
    const { itemsCsv, matsCsv } = makeFixtureCsvs();
    const { headers: ih, rows: items } = parseItems(itemsCsv);
    const { headers: oh, rows: ops } = parseOperations(
      [
        // Header row (just build from op fixture helper in reverse order)
        Array(OP_COL.TOTAL_COLS).fill('').map((_, i) => i === OP_COL.ITEM ? 'Item' : i === OP_COL.OPERATION ? 'Operation' : i === OP_COL.WC ? 'WC' : '').join(','),
        makeOpCsvRow({ item: 'ROOT-A', operation: 30, wc: 'WC3' }),
        makeOpCsvRow({ item: 'ROOT-A', operation: 10, wc: 'WC1' }),
        makeOpCsvRow({ item: 'ROOT-A', operation: 20, wc: 'WC2' }),
      ].join('\r\n'),
    );
    const { headers: mh, rows: mats } = parseMaterials(matsCsv);
    const store = buildStore(ih, items, oh, ops, mh, mats);
    const rootOps = store.opsByItem.get('ROOT-A')!;
    expect(rootOps.map(o => o.operation)).toEqual([10, 20, 30]);
  });

  it('sorts materials by seq', () => {
    const { itemsCsv, opsCsv } = makeFixtureCsvs();
    const { headers: ih, rows: items } = parseItems(itemsCsv);
    const { headers: oh, rows: ops } = parseOperations(opsCsv);
    const matHeader = Array(MAT_COL.TOTAL_COLS).fill('').map((_, i) =>
      i === MAT_COL.MATERIAL ? 'Material' : i === MAT_COL.ITEM ? 'Item' :
      i === MAT_COL.OPERATION ? 'Operation' : i === MAT_COL.SEQ ? 'Seq' : ''
    ).join(',');
    const { headers: mh, rows: mats } = parseMaterials([
      matHeader,
      makeMatCsvRow({ material: 'LEAF-C', item: 'ROOT-A', operation: 10, seq: 3 }),
      makeMatCsvRow({ material: 'SUB-B', item: 'ROOT-A', operation: 10, seq: 1 }),
    ].join('\r\n'));
    const store = buildStore(ih, items, oh, ops, mh, mats);
    const mats2 = store.matsByItemOp.get(opKey('ROOT-A', 10))!;
    expect(mats2.map(m => m.seq)).toEqual([1, 3]);
  });
});

// ── Tree construction tests ───────────────────────────────────────────────────

describe('buildFlatTree', () => {
  it('places ROOT-A as root node when collapsed', () => {
    const store = buildFromFixture();
    const flat = buildFlatTree(store, new Set());
    expect(flat[0]?.kind).toBe('root-item');
    expect(flat[0]?.itemRow?.item).toBe('ROOT-A');
  });

  it('places unassigned-group after root items', () => {
    const store = buildFromFixture();
    const flat = buildFlatTree(store, new Set());
    const groupNode = flat.find(n => n.kind === 'unassigned-group');
    expect(groupNode).toBeDefined();
    expect((groupNode as any)._unassignedCount).toBe(1); // ORPHAN-D
  });

  it('expands root-item to show operations', () => {
    const store = buildFromFixture();
    const rootId = 'item::ROOT-A::d0';
    const flat = buildFlatTree(store, new Set([rootId]));
    const opNode = flat.find(n => n.kind === 'operation');
    expect(opNode).toBeDefined();
    expect(opNode?.operationRow?.operation).toBe(10);
    expect(opNode?.depth).toBe(1);
  });

  it('expands operation to show material row', () => {
    const store = buildFromFixture();
    const expanded = new Set(['item::ROOT-A::d0', 'op::ROOT-A::10']);
    const flat = buildFlatTree(store, expanded);
    const matNode = flat.find(n => n.kind === 'material');
    expect(matNode).toBeDefined();
    expect(matNode?.materialRow?.material).toBe('SUB-B');
    expect(matNode?.depth).toBe(2);
  });

  it('flags SUB-B material node as isSharedMfg', () => {
    const store = buildFromFixture();
    const expanded = new Set(['item::ROOT-A::d0', 'op::ROOT-A::10']);
    const flat = buildFlatTree(store, expanded);
    const matNode = flat.find(n => n.kind === 'material' && n.materialRow?.material === 'SUB-B');
    expect(matNode?.isSharedMfg).toBe(true);
  });

  it('expands unassigned-group to show orphan item', () => {
    const store = buildFromFixture();
    const flat = buildFlatTree(store, new Set(['unassigned-group']));
    const orphan = flat.find(n => n.kind === 'unassigned-item');
    expect(orphan).toBeDefined();
    expect(orphan?.itemRow?.item).toBe('ORPHAN-D');
  });

  it('full expansion shows mfg-child for SUB-B', () => {
    const store = buildFromFixture();
    const expanded = new Set([
      'item::ROOT-A::d0',
      'op::ROOT-A::10',
      'mat::ROOT-A::10::1::SUB-B',
    ]);
    const flat = buildFlatTree(store, expanded);
    const mfgChild = flat.find(n => n.kind === 'mfg-child');
    expect(mfgChild).toBeDefined();
    expect(mfgChild?.itemRow?.item).toBe('SUB-B');
    expect(mfgChild?.depth).toBe(3);
  });
});

// ── Validation tests ──────────────────────────────────────────────────────────

describe('validate', () => {
  it('returns no issues for a clean fixture', () => {
    const store = buildFromFixture();
    const issues = validate(store);
    expect(issues).toHaveLength(0);
  });

  it('flags a material whose parent item is missing from Items', () => {
    const store = buildFromFixture();
    // Manually inject a bad material row
    const badMat = parseMaterials(
      [
        Array(MAT_COL.TOTAL_COLS).fill('').map((_, i) =>
          i === MAT_COL.MATERIAL ? 'Material' : i === MAT_COL.ITEM ? 'Item' :
          i === MAT_COL.OPERATION ? 'Operation' : i === MAT_COL.SEQ ? 'Seq' : ''
        ).join(','),
        makeMatCsvRow({ material: 'LEAF-C', item: 'GHOST-PARENT', operation: 10, seq: 99 }),
      ].join('\r\n'),
    ).rows[0]!;
    store.materialMap.set('GHOST-PARENT::10::99::LEAF-C', badMat);

    const issues = validate(store);
    expect(issues.some(i => i.code === 'MAT_PARENT_MISSING')).toBe(true);
  });

  it('flags a material whose operation does not exist', () => {
    const store = buildFromFixture();
    const badMat = parseMaterials(
      [
        Array(MAT_COL.TOTAL_COLS).fill('').map((_, i) =>
          i === MAT_COL.MATERIAL ? 'Material' : i === MAT_COL.ITEM ? 'Item' :
          i === MAT_COL.OPERATION ? 'Operation' : i === MAT_COL.SEQ ? 'Seq' : ''
        ).join(','),
        makeMatCsvRow({ material: 'LEAF-C', item: 'ROOT-A', operation: 999, seq: 99 }),
      ].join('\r\n'),
    ).rows[0]!;
    store.materialMap.set('ROOT-A::999::99::LEAF-C', badMat);

    const issues = validate(store);
    expect(issues.some(i => i.code === 'MAT_OP_MISSING')).toBe(true);
  });
});

// ── Key management tests ──────────────────────────────────────────────────────

describe('nextOperationNumber', () => {
  it('returns 10 for an item with no existing ops', () => {
    const store = buildFromFixture();
    expect(nextOperationNumber(store, 'ORPHAN-D')).toBe(10);
  });

  it('returns max + 10 for an item with existing ops', () => {
    const store = buildFromFixture();
    expect(nextOperationNumber(store, 'ROOT-A')).toBe(20); // only op 10 exists
  });
});

describe('validateOperationNumber', () => {
  it('accepts a free operation number', () => {
    const store = buildFromFixture();
    expect(validateOperationNumber(store, 'ROOT-A', 25)).toBeUndefined();
  });

  it('rejects a duplicate operation number', () => {
    const store = buildFromFixture();
    expect(validateOperationNumber(store, 'ROOT-A', 10)).toBeDefined();
  });

  it('accepts the same number when editing in place', () => {
    const store = buildFromFixture();
    expect(validateOperationNumber(store, 'ROOT-A', 10, 10)).toBeUndefined();
  });
});

describe('nextSeq', () => {
  it('returns 1 for a new operation', () => {
    const store = buildFromFixture();
    expect(nextSeq(store, 'ROOT-A', 99)).toBe(1);
  });

  it('returns max seq + 1', () => {
    const store = buildFromFixture();
    // ROOT-A op 10 has SUB-B at seq 1
    expect(nextSeq(store, 'ROOT-A', 10)).toBe(2);
  });
});

// ── Export / round-trip tests ─────────────────────────────────────────────────

describe('exportStore', () => {
  it('produces the same number of data rows as input', () => {
    const store = buildFromFixture();
    const { itemsCsv, operationsCsv, materialsCsv } = exportStore(store);

    const countDataRows = (csv: string) =>
      csv.split('\n').filter(l => l.trim()).length - 1; // minus header

    expect(countDataRows(itemsCsv)).toBe(4);    // ROOT-A, SUB-B, LEAF-C, ORPHAN-D
    expect(countDataRows(operationsCsv)).toBe(2); // ROOT-A op10, SUB-B op10
    expect(countDataRows(materialsCsv)).toBe(2);  // SUB-B under ROOT-A, LEAF-C under SUB-B
  });

  it('writes WC from parent operation, not from material _raw', () => {
    const store = buildFromFixture();
    // Corrupt the WC on the material _raw to confirm it is overwritten from the op
    const mat = store.materialMap.get('ROOT-A::10::1::SUB-B')!;
    mat._raw[MAT_COL.WC] = 'WRONG-WC';

    const { materialsCsv } = exportStore(store);
    // WC1 is the operation's WC; the export should write that, not WRONG-WC
    expect(materialsCsv).not.toContain('WRONG-WC');
    expect(materialsCsv).toContain('WC1');
  });

  it('sorts materials deterministically by (item, op, seq, material)', () => {
    const store = buildFromFixture();
    const { materialsCsv } = exportStore(store);
    const lines = materialsCsv.split('\n').filter(l => l.trim()).slice(1);
    // First row should be ROOT-A / op 10 / seq 1 (SUB-B)
    expect(lines[0]).toContain('ROOT-A');
    // Second row should be SUB-B / op 10 / seq 1 (LEAF-C)
    expect(lines[1]).toContain('SUB-B');
  });

  it('round-trips item field values unchanged', () => {
    const { itemsCsv } = makeFixtureCsvs();
    const { headers: ih, rows: items } = parseItems(itemsCsv);
    const { headers: oh, rows: ops } = parseOperations(makeFixtureCsvs().opsCsv);
    const { headers: mh, rows: mats } = parseMaterials(makeFixtureCsvs().matsCsv);
    const store = buildStore(ih, items, oh, ops, mh, mats);
    const { itemsCsv: out } = exportStore(store);

    // Re-parse the output
    const { rows: items2 } = parseItems(out);
    const rootA = items2.find(r => r.item === 'ROOT-A')!;
    expect(rootA.description).toBe('Test Item');
    expect(rootA.source).toBe('Manufactured');
    expect(rootA.uom).toBe('EA');
  });
});
