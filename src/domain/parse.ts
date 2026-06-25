// CSV parsing — accepts raw CSV strings (PapaParse) and maps columns to typed records.
// UI layer reads File → string, then calls these functions.
// Tests can pass fixture strings directly.

import Papa from 'papaparse';
import { ITEM_COL, OP_COL, MAT_COL } from './columns.ts';
import type { ItemRow, OperationRow, MaterialRow } from './types.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCsvString(csv: string): { headers: string[]; rows: string[][] } {
  const result = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: true,
    // Don't transform types — keep everything as strings for _raw
  });
  const data = result.data as string[][];
  if (data.length === 0) return { headers: [], rows: [] };
  return { headers: data[0] ?? [], rows: data.slice(1) };
}

function str(raw: string[], idx: number): string {
  return (raw[idx] ?? '').trim();
}

function num(raw: string[], idx: number): number {
  const v = parseFloat(str(raw, idx));
  return isNaN(v) ? 0 : v;
}

function bool(raw: string[], idx: number): boolean {
  const v = str(raw, idx);
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

// ── Items ────────────────────────────────────────────────────────────────────

export function parseItems(csv: string): { headers: string[]; rows: ItemRow[] } {
  const { headers, rows } = parseCsvString(csv);
  const parsed = rows
    .filter(r => str(r, ITEM_COL.ITEM) !== '')
    .map((raw): ItemRow => ({
      item: str(raw, ITEM_COL.ITEM),
      description: str(raw, ITEM_COL.DESCRIPTION),
      type: str(raw, ITEM_COL.TYPE),
      source: str(raw, ITEM_COL.SOURCE),
      stocked: bool(raw, ITEM_COL.STOCKED),
      uom: str(raw, ITEM_COL.UOM),
      unitCost: num(raw, ITEM_COL.UNIT_COST),
      abcCode: str(raw, ITEM_COL.ABC_CODE),
      costType: str(raw, ITEM_COL.COST_TYPE),
      costMethod: str(raw, ITEM_COL.COST_METHOD),
      backflush: bool(raw, ITEM_COL.BACKFLUSH),
      leadTime: num(raw, ITEM_COL.LEAD_TIME),
      productCode: str(raw, ITEM_COL.PRODUCT_CODE),
      materialStatus: str(raw, ITEM_COL.MATERIAL_STATUS),
      currentUnitCost: num(raw, ITEM_COL.CURRENT_UNIT_COST),
      lowLevel: num(raw, ITEM_COL.LOW_LEVEL),
      qtyOnHand: num(raw, ITEM_COL.QTY_ON_HAND),
      _raw: raw,
      _status: 'existing',
    }));
  return { headers, rows: parsed };
}

// ── Current Operations ───────────────────────────────────────────────────────

export function parseOperations(csv: string): { headers: string[]; rows: OperationRow[] } {
  const { headers, rows } = parseCsvString(csv);
  const parsed = rows
    .filter(r => str(r, OP_COL.ITEM) !== '' && str(r, OP_COL.OPERATION) !== '')
    .map((raw): OperationRow => ({
      item: str(raw, OP_COL.ITEM),
      operation: num(raw, OP_COL.OPERATION),
      wc: str(raw, OP_COL.WC),
      schedDriver: str(raw, OP_COL.SCHED_DRIVER),
      splitRule: str(raw, OP_COL.SPLIT_RULE),
      description: str(raw, OP_COL.DESCRIPTION),
      controlPoint: bool(raw, OP_COL.CONTROL_POINT),
      backflush: str(raw, OP_COL.BACKFLUSH),
      laborHrPerPiece: num(raw, OP_COL.LABOR_HR),
      machHrsPerPiece: num(raw, OP_COL.MACH_HR),
      setupHours: num(raw, OP_COL.SETUP_HOURS),
      yieldPct: num(raw, OP_COL.YIELD),
      effectiveDate: str(raw, OP_COL.EFFECTIVE_DATE),
      obsoleteDate: str(raw, OP_COL.OBSOLETE_DATE),
      itemDescription: str(raw, OP_COL.ITEM_DESCRIPTION),
      wcDescription: str(raw, OP_COL.WC_DESCRIPTION),
      _raw: raw,
      _status: 'existing',
    }));
  return { headers, rows: parsed };
}

// ── Current Materials ────────────────────────────────────────────────────────

export function parseMaterials(csv: string): { headers: string[]; rows: MaterialRow[] } {
  const { headers, rows } = parseCsvString(csv);
  const parsed = rows
    .filter(r => str(r, MAT_COL.ITEM) !== '' && str(r, MAT_COL.MATERIAL) !== '')
    .map((raw): MaterialRow => ({
      material: str(raw, MAT_COL.MATERIAL),
      item: str(raw, MAT_COL.ITEM),
      operation: num(raw, MAT_COL.OPERATION),
      seq: num(raw, MAT_COL.SEQ),
      wc: str(raw, MAT_COL.WC),
      wcDescription: str(raw, MAT_COL.WC_DESCRIPTION),
      quantity: num(raw, MAT_COL.QUANTITY),
      per: str(raw, MAT_COL.PER),
      uom: str(raw, MAT_COL.UOM),
      type: str(raw, MAT_COL.TYPE),
      scrapFactor: num(raw, MAT_COL.SCRAP_FACTOR),
      effectiveDate: str(raw, MAT_COL.EFFECTIVE_DATE),
      obsoleteDate: str(raw, MAT_COL.OBSOLETE_DATE),
      ref: str(raw, MAT_COL.REF),
      backflush: bool(raw, MAT_COL.BACKFLUSH),
      backflushLocation: str(raw, MAT_COL.BACKFLUSH_LOCATION),
      itemDescription: str(raw, MAT_COL.ITEM_DESCRIPTION),
      materialDescription: str(raw, MAT_COL.MATERIAL_DESCRIPTION),
      _raw: raw,
      _status: 'existing',
    }));
  return { headers, rows: parsed };
}
