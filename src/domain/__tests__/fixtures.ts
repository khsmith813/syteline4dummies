// Minimal CSV fixture strings for unit tests.
// Column counts match the real files (202 / 50 / 46 cols) so _raw arrays
// are the right length and overlay indices hit valid positions.

import { ITEM_COL, OP_COL, MAT_COL } from '../columns.ts';

function blankCols(n: number): string {
  return ','.repeat(n - 1);
}

// Build a single Items CSV row with key fields set, rest blank
export function makeItemCsvRow(fields: {
  item: string;
  description?: string;
  type?: string;
  source?: string;
  stocked?: string;
  uom?: string;
  unitCost?: string;
  abcCode?: string;
  costType?: string;
  costMethod?: string;
  materialStatus?: string;
}): string {
  const cols: string[] = Array(ITEM_COL.TOTAL_COLS).fill('');
  cols[ITEM_COL.ITEM] = fields.item;
  cols[ITEM_COL.DESCRIPTION] = fields.description ?? 'Test Item';
  cols[ITEM_COL.TYPE] = fields.type ?? 'Material';
  cols[ITEM_COL.SOURCE] = fields.source ?? 'Purchased';
  cols[ITEM_COL.STOCKED] = fields.stocked ?? '1';
  cols[ITEM_COL.UOM] = fields.uom ?? 'EA';
  cols[ITEM_COL.UNIT_COST] = fields.unitCost ?? '0';
  cols[ITEM_COL.ABC_CODE] = fields.abcCode ?? 'C';
  cols[ITEM_COL.COST_TYPE] = fields.costType ?? 'Actual';
  cols[ITEM_COL.COST_METHOD] = fields.costMethod ?? 'FIFO';
  cols[ITEM_COL.MATERIAL_STATUS] = fields.materialStatus ?? 'Active';
  return cols.join(',');
}

function makeItemHeader(): string {
  const cols: string[] = Array(ITEM_COL.TOTAL_COLS).fill('');
  cols[ITEM_COL.ITEM] = 'Item';
  cols[ITEM_COL.DESCRIPTION] = 'Description';
  cols[ITEM_COL.TYPE] = 'Type';
  cols[ITEM_COL.SOURCE] = 'Source';
  cols[ITEM_COL.STOCKED] = 'Stocked';
  cols[ITEM_COL.UOM] = 'U/M';
  cols[ITEM_COL.UNIT_COST] = 'Unit Cost';
  cols[ITEM_COL.ABC_CODE] = 'ABC Code';
  cols[ITEM_COL.COST_TYPE] = 'Cost Type';
  cols[ITEM_COL.COST_METHOD] = 'Cost Method';
  cols[ITEM_COL.MATERIAL_STATUS] = 'Material Status';
  cols[ITEM_COL.CURRENT_UNIT_COST] = 'Current Unit Cost';
  cols[ITEM_COL.LOW_LEVEL] = 'Low Level';
  cols[ITEM_COL.QTY_ON_HAND] = 'Quantity On Hand';
  return cols.join(',');
}

function makeOpHeader(): string {
  const cols: string[] = Array(OP_COL.TOTAL_COLS).fill('');
  cols[OP_COL.ITEM] = 'Item';
  cols[OP_COL.OPERATION] = 'Operation';
  cols[OP_COL.WC] = 'WC';
  cols[OP_COL.SCHED_DRIVER] = 'Sched Driver';
  cols[OP_COL.SPLIT_RULE] = 'Split Rule';
  cols[OP_COL.DESCRIPTION] = 'Description';
  cols[OP_COL.CONTROL_POINT] = 'Control Point';
  cols[OP_COL.BACKFLUSH] = 'Backflush';
  cols[OP_COL.YIELD] = 'Yield';
  cols[OP_COL.ITEM_DESCRIPTION] = 'Item Description';
  cols[OP_COL.WC_DESCRIPTION] = 'WC Description';
  return cols.join(',');
}

function makeMatHeader(): string {
  const cols: string[] = Array(MAT_COL.TOTAL_COLS).fill('');
  cols[MAT_COL.MATERIAL] = 'Material';
  cols[MAT_COL.ITEM] = 'Item';
  cols[MAT_COL.OPERATION] = 'Operation';
  cols[MAT_COL.SEQ] = 'Seq';
  cols[MAT_COL.WC] = 'WC';
  cols[MAT_COL.WC_DESCRIPTION] = 'WC Description';
  cols[MAT_COL.QUANTITY] = 'Quantity';
  cols[MAT_COL.PER] = 'Per';
  cols[MAT_COL.UOM] = 'U/M';
  cols[MAT_COL.TYPE] = 'Type';
  cols[MAT_COL.SCRAP_FACTOR] = 'Scrap Factor';
  cols[MAT_COL.REF] = 'Ref';
  cols[MAT_COL.BACKFLUSH] = 'Backflush';
  cols[MAT_COL.REVISION_1] = 'Revision';
  cols[MAT_COL.REVISION_2] = 'Revision';
  cols[MAT_COL.ITEM_DESCRIPTION] = 'Item Description';
  cols[MAT_COL.MATERIAL_DESCRIPTION] = 'Material Description';
  return cols.join(',');
}

export function makeOpCsvRow(fields: {
  item: string;
  operation: number;
  wc?: string;
  schedDriver?: string;
  splitRule?: string;
  controlPoint?: string;
  backflush?: string;
  yield_?: string;
}): string {
  const cols: string[] = Array(OP_COL.TOTAL_COLS).fill('');
  cols[OP_COL.ITEM] = fields.item;
  cols[OP_COL.OPERATION] = String(fields.operation);
  cols[OP_COL.WC] = fields.wc ?? 'WC1';
  cols[OP_COL.SCHED_DRIVER] = fields.schedDriver ?? 'Labor';
  cols[OP_COL.SPLIT_RULE] = fields.splitRule ?? 'No Splitting';
  cols[OP_COL.CONTROL_POINT] = fields.controlPoint ?? '1';
  cols[OP_COL.BACKFLUSH] = fields.backflush ?? 'Neither';
  cols[OP_COL.YIELD] = fields.yield_ ?? '100';
  return cols.join(',');
}

export function makeMatCsvRow(fields: {
  material: string;
  item: string;
  operation: number;
  seq: number;
  wc?: string;
  quantity?: string;
  per?: string;
  uom?: string;
  backflush?: string;
  ref?: string;
}): string {
  const cols: string[] = Array(MAT_COL.TOTAL_COLS).fill('');
  cols[MAT_COL.MATERIAL] = fields.material;
  cols[MAT_COL.ITEM] = fields.item;
  cols[MAT_COL.OPERATION] = String(fields.operation);
  cols[MAT_COL.SEQ] = String(fields.seq);
  cols[MAT_COL.WC] = fields.wc ?? 'WC1';
  cols[MAT_COL.QUANTITY] = fields.quantity ?? '1';
  cols[MAT_COL.PER] = fields.per ?? 'Unit';
  cols[MAT_COL.UOM] = fields.uom ?? 'EA';
  cols[MAT_COL.BACKFLUSH] = fields.backflush ?? '1';
  cols[MAT_COL.REF] = fields.ref ?? 'Inventory';
  return cols.join(',');
}

// ── Complete fixture CSVs ─────────────────────────────────────────────────────

/**
 * A self-consistent fixture:
 *   ROOT-A  (top-level assembly)
 *     op 10 (WC1)
 *       SUB-B (seq 1) — manufactured subassembly
 *         op 10 (WC2)
 *           LEAF-C (seq 1) — purchased leaf
 *   ROOT-A is consumed nowhere.
 *   ORPHAN-D has no ops and is consumed nowhere → unassigned.
 */
export function makeFixtureCsvs() {
  const itemsCsv = [
    makeItemHeader(),
    makeItemCsvRow({ item: 'ROOT-A', source: 'Manufactured' }),
    makeItemCsvRow({ item: 'SUB-B', source: 'Manufactured' }),
    makeItemCsvRow({ item: 'LEAF-C', source: 'Purchased' }),
    makeItemCsvRow({ item: 'ORPHAN-D', source: 'Purchased' }),
  ].join('\r\n');

  const opsCsv = [
    makeOpHeader(),
    makeOpCsvRow({ item: 'ROOT-A', operation: 10, wc: 'WC1' }),
    makeOpCsvRow({ item: 'SUB-B', operation: 10, wc: 'WC2' }),
  ].join('\r\n');

  const matsCsv = [
    makeMatHeader(),
    makeMatCsvRow({ material: 'SUB-B', item: 'ROOT-A', operation: 10, seq: 1, wc: 'WC1' }),
    makeMatCsvRow({ material: 'LEAF-C', item: 'SUB-B', operation: 10, seq: 1, wc: 'WC2' }),
  ].join('\r\n');

  return { itemsCsv, opsCsv, matsCsv };
}

// Silence unused import warning
void blankCols;
