// Builds and maintains the in-memory DataStore from parsed rows.
// All indexes are derived here; tree construction reads from these indexes.

import type { DataStore, ItemRow, OperationRow, MaterialRow } from './types.ts';

export function opKey(item: string, operation: number): string {
  return `${item}::${operation}`;
}

export function matKey(item: string, operation: number, seq: number, material: string): string {
  return `${item}::${operation}::${seq}::${material}`;
}

export function buildStore(
  itemHeaders: string[],
  itemRows: ItemRow[],
  operationHeaders: string[],
  operationRows: OperationRow[],
  materialHeaders: string[],
  materialRows: MaterialRow[],
): DataStore {
  const itemMap = new Map<string, ItemRow>();
  for (const row of itemRows) {
    itemMap.set(row.item, row);
  }

  const operationMap = new Map<string, OperationRow>();
  const opsByItem = new Map<string, OperationRow[]>();
  for (const row of operationRows) {
    operationMap.set(opKey(row.item, row.operation), row);
    const list = opsByItem.get(row.item) ?? [];
    list.push(row);
    opsByItem.set(row.item, list);
  }
  // Sort operations ascending by operation number within each item
  for (const [, ops] of opsByItem) {
    ops.sort((a, b) => a.operation - b.operation);
  }

  const materialMap = new Map<string, MaterialRow>();
  const matsByItemOp = new Map<string, MaterialRow[]>();
  const consumedItems = new Set<string>();
  for (const row of materialRows) {
    materialMap.set(matKey(row.item, row.operation, row.seq, row.material), row);
    const key = opKey(row.item, row.operation);
    const list = matsByItemOp.get(key) ?? [];
    list.push(row);
    matsByItemOp.set(key, list);
    consumedItems.add(row.material);
  }
  // Sort materials ascending by seq within each (item, operation)
  for (const [, mats] of matsByItemOp) {
    mats.sort((a, b) => a.seq - b.seq);
  }

  const mfgItems = new Set<string>(opsByItem.keys());

  return {
    itemMap,
    operationMap,
    materialMap,
    opsByItem,
    matsByItemOp,
    mfgItems,
    consumedItems,
    itemHeaders,
    operationHeaders,
    materialHeaders,
  };
}

// ── Store mutation helpers ───────────────────────────────────────────────────

export function addItem(store: DataStore, row: ItemRow): void {
  store.itemMap.set(row.item, row);
}

export function addOperation(store: DataStore, row: OperationRow): void {
  store.operationMap.set(opKey(row.item, row.operation), row);
  const list = store.opsByItem.get(row.item) ?? [];
  list.push(row);
  list.sort((a, b) => a.operation - b.operation);
  store.opsByItem.set(row.item, list);
  store.mfgItems.add(row.item);
}

export function addMaterial(store: DataStore, row: MaterialRow): void {
  store.materialMap.set(matKey(row.item, row.operation, row.seq, row.material), row);
  const key = opKey(row.item, row.operation);
  const list = store.matsByItemOp.get(key) ?? [];
  list.push(row);
  list.sort((a, b) => a.seq - b.seq);
  store.matsByItemOp.set(key, list);
  store.consumedItems.add(row.material);
}

export function removeMaterial(store: DataStore, row: MaterialRow): void {
  store.materialMap.delete(matKey(row.item, row.operation, row.seq, row.material));
  const key = opKey(row.item, row.operation);
  const list = store.matsByItemOp.get(key) ?? [];
  const idx = list.findIndex(
    m => m.item === row.item && m.operation === row.operation && m.seq === row.seq && m.material === row.material
  );
  if (idx !== -1) list.splice(idx, 1);

  // Rebuild consumedItems for this material if it no longer appears anywhere
  let stillConsumed = false;
  for (const m of store.materialMap.values()) {
    if (m.material === row.material) { stillConsumed = true; break; }
  }
  if (!stillConsumed) store.consumedItems.delete(row.material);
}

export function removeOperation(store: DataStore, row: OperationRow): void {
  store.operationMap.delete(opKey(row.item, row.operation));
  const list = store.opsByItem.get(row.item) ?? [];
  const idx = list.findIndex(o => o.operation === row.operation);
  if (idx !== -1) list.splice(idx, 1);
  if (list.length === 0) {
    store.opsByItem.delete(row.item);
    store.mfgItems.delete(row.item);
  }
  // Remove all child materials for this operation
  const matKey2 = opKey(row.item, row.operation);
  const mats = store.matsByItemOp.get(matKey2) ?? [];
  for (const m of mats) removeMaterial(store, m);
  store.matsByItemOp.delete(matKey2);
}
