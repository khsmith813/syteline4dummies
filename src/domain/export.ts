// CSV export — deterministic, dependency-ordered, lossless round-trip.
// Output order: Items (by item), Operations (by item, operation), Materials (by item, op, seq, material).
// Each row reconstructed from _raw with typed fields overlaid at the correct column positions.

import Papa from 'papaparse';
import type { DataStore, ItemRow, OperationRow, MaterialRow } from './types.ts';
import { ITEM_COL, OP_COL, MAT_COL } from './columns.ts';
import { opKey } from './store.ts';

// ── Row serialisation ─────────────────────────────────────────────────────────

function overlayItem(row: ItemRow): string[] {
  const r = [...row._raw];
  r[ITEM_COL.ITEM] = row.item;
  r[ITEM_COL.DESCRIPTION] = row.description;
  r[ITEM_COL.TYPE] = row.type;
  r[ITEM_COL.SOURCE] = row.source;
  r[ITEM_COL.STOCKED] = row.stocked ? '1' : '0';
  r[ITEM_COL.UOM] = row.uom;
  r[ITEM_COL.UNIT_COST] = String(row.unitCost);
  r[ITEM_COL.ABC_CODE] = row.abcCode;
  r[ITEM_COL.COST_TYPE] = row.costType;
  r[ITEM_COL.COST_METHOD] = row.costMethod;
  r[ITEM_COL.BACKFLUSH] = row.backflush ? '1' : '0';
  r[ITEM_COL.LEAD_TIME] = String(row.leadTime);
  r[ITEM_COL.PRODUCT_CODE] = row.productCode;
  r[ITEM_COL.MATERIAL_STATUS] = row.materialStatus;
  // Display-only columns are never overwritten (read from _raw as-is)
  return r;
}

function overlayOperation(row: OperationRow): string[] {
  const r = [...row._raw];
  r[OP_COL.ITEM] = row.item;
  r[OP_COL.OPERATION] = String(row.operation);
  r[OP_COL.WC] = row.wc;
  r[OP_COL.SCHED_DRIVER] = row.schedDriver;
  r[OP_COL.SPLIT_RULE] = row.splitRule;
  r[OP_COL.DESCRIPTION] = row.description;
  r[OP_COL.CONTROL_POINT] = row.controlPoint ? '1' : '0';
  r[OP_COL.BACKFLUSH] = row.backflush;
  r[OP_COL.LABOR_HR] = String(row.laborHrPerPiece);
  r[OP_COL.MACH_HR] = String(row.machHrsPerPiece);
  r[OP_COL.SETUP_HOURS] = String(row.setupHours);
  r[OP_COL.YIELD] = String(row.yieldPct);
  r[OP_COL.EFFECTIVE_DATE] = row.effectiveDate;
  r[OP_COL.OBSOLETE_DATE] = row.obsoleteDate;
  // Item Description and WC Description are SyteLine-derived; leave from _raw
  return r;
}

function overlayMaterial(row: MaterialRow, store: DataStore): string[] {
  const r = [...row._raw];
  r[MAT_COL.MATERIAL] = row.material;
  r[MAT_COL.ITEM] = row.item;
  r[MAT_COL.OPERATION] = String(row.operation);
  r[MAT_COL.SEQ] = String(row.seq);
  r[MAT_COL.QUANTITY] = String(row.quantity);
  r[MAT_COL.PER] = row.per;
  r[MAT_COL.UOM] = row.uom;
  r[MAT_COL.TYPE] = row.type;
  r[MAT_COL.SCRAP_FACTOR] = String(row.scrapFactor);
  r[MAT_COL.EFFECTIVE_DATE] = row.effectiveDate;
  r[MAT_COL.OBSOLETE_DATE] = row.obsoleteDate;
  r[MAT_COL.REF] = row.ref;
  r[MAT_COL.BACKFLUSH] = row.backflush ? '1' : '0';
  r[MAT_COL.BACKFLUSH_LOCATION] = row.backflushLocation;
  // WC and WC Description are DERIVED from parent operation — never read from row
  const parentOp = store.operationMap.get(opKey(row.item, row.operation));
  r[MAT_COL.WC] = parentOp?.wc ?? '';
  r[MAT_COL.WC_DESCRIPTION] = parentOp?.wcDescription ?? '';
  return r;
}

// ── CSV serialisation ─────────────────────────────────────────────────────────

function toCsv(headers: string[], dataRows: string[][]): string {
  return Papa.unparse([headers, ...dataRows], {
    quotes: false,
    newline: '\r\n',
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ExportResult {
  itemsCsv: string;
  operationsCsv: string;
  materialsCsv: string;
}

export function exportStore(store: DataStore): ExportResult {
  // Items — sorted by item number
  const sortedItems = [...store.itemMap.values()].sort((a, b) =>
    a.item.localeCompare(b.item),
  );
  const itemRows = sortedItems.map(overlayItem);

  // Operations — sorted by (item, operation)
  const sortedOps = [...store.operationMap.values()].sort((a, b) => {
    const c = a.item.localeCompare(b.item);
    return c !== 0 ? c : a.operation - b.operation;
  });
  const opRows = sortedOps.map(overlayOperation);

  // Materials — sorted by (item, operation, seq, material)
  const sortedMats = [...store.materialMap.values()].sort((a, b) => {
    let c = a.item.localeCompare(b.item);
    if (c !== 0) return c;
    c = a.operation - b.operation;
    if (c !== 0) return c;
    c = a.seq - b.seq;
    if (c !== 0) return c;
    return a.material.localeCompare(b.material);
  });
  const matRows = sortedMats.map(r => overlayMaterial(r, store));

  return {
    itemsCsv: toCsv(store.itemHeaders, itemRows),
    operationsCsv: toCsv(store.operationHeaders, opRows),
    materialsCsv: toCsv(store.materialHeaders, matRows),
  };
}

// ── New-row _raw initialiser ──────────────────────────────────────────────────
// When creating a brand-new record, _raw has no original values.
// Produce a blank array of the right length.

export function blankItemRaw(): string[] {
  return Array<string>(ITEM_COL.TOTAL_COLS).fill('');
}

export function blankOperationRaw(): string[] {
  return Array<string>(OP_COL.TOTAL_COLS).fill('');
}

export function blankMaterialRaw(): string[] {
  return Array<string>(MAT_COL.TOTAL_COLS).fill('');
}
