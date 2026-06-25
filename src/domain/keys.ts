// Key management — operation number and material sequence assignment.

import type { DataStore } from './types.ts';
import { opKey } from './store.ts';

/**
 * Returns the next suggested operation number for a given parent item.
 * Uses gap-of-10 (10, 20, 30 …).  If existing operations are present,
 * suggests max + 10.  Caller may override; pass the override to
 * validateOperationNumber before use.
 */
export function nextOperationNumber(store: DataStore, item: string): number {
  const ops = store.opsByItem.get(item) ?? [];
  if (ops.length === 0) return 10;
  const max = Math.max(...ops.map(o => o.operation));
  return max + 10;
}

/**
 * Validates a candidate operation number for a given parent item.
 * Returns an error string if invalid, undefined if OK.
 */
export function validateOperationNumber(
  store: DataStore,
  item: string,
  candidate: number,
  excludeExisting?: number, // pass current op# when editing in-place
): string | undefined {
  if (!Number.isInteger(candidate) || candidate <= 0) {
    return 'Operation number must be a positive integer';
  }
  const key = opKey(item, candidate);
  const existing = store.operationMap.get(key);
  if (existing && existing.operation !== excludeExisting) {
    return `Operation ${candidate} already exists for item "${item}"`;
  }
  return undefined;
}

/**
 * Returns the next material sequence number for a given (item, operation).
 * SyteLine assigns highest-seq + 1 within the operation.
 */
export function nextSeq(store: DataStore, item: string, operation: number): number {
  const mats = store.matsByItemOp.get(opKey(item, operation)) ?? [];
  if (mats.length === 0) return 1;
  return Math.max(...mats.map(m => m.seq)) + 1;
}

/**
 * After a material is moved or a new one inserted, renumber seqs sequentially
 * (1, 2, 3 …) within the given (item, operation).
 * Returns the updated materials list (mutates seq in-place).
 */
export function renumberSeqs(store: DataStore, item: string, operation: number): void {
  const mats = store.matsByItemOp.get(opKey(item, operation)) ?? [];
  mats.sort((a, b) => a.seq - b.seq);
  mats.forEach((m, i) => { m.seq = i + 1; });
}
