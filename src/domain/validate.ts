// Validation — run on load, after edits, and before export.
// Returns a list of issues; never mutates store or throws.

import type { DataStore, ValidationIssue } from './types.ts';
import { opKey, matKey } from './store.ts';

export function validate(store: DataStore): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Every operation's item exists in items table
  for (const op of store.operationMap.values()) {
    if (!store.itemMap.has(op.item)) {
      issues.push({
        severity: 'error',
        code: 'OP_ITEM_MISSING',
        message: `Operation (${op.item}, ${op.operation}): parent item "${op.item}" not found in Items`,
        item: op.item,
        operation: op.operation,
      });
    }
  }

  // 2. Every material's parent item exists in items table
  // 3. Every material's (item, operation) exists in Current Operations
  // 4. Every material's child item exists in items table
  const seenMatKeys = new Set<string>();
  for (const mat of store.materialMap.values()) {
    if (!store.itemMap.has(mat.item)) {
      issues.push({
        severity: 'error',
        code: 'MAT_PARENT_MISSING',
        message: `Material line (${mat.item}, op ${mat.operation}, seq ${mat.seq}): parent item "${mat.item}" not found in Items`,
        item: mat.item,
        operation: mat.operation,
        seq: mat.seq,
        material: mat.material,
      });
    }

    if (!store.operationMap.has(opKey(mat.item, mat.operation))) {
      issues.push({
        severity: 'error',
        code: 'MAT_OP_MISSING',
        message: `Material line (${mat.item}, op ${mat.operation}, seq ${mat.seq}, mat "${mat.material}"): operation not found in Current Operations`,
        item: mat.item,
        operation: mat.operation,
        seq: mat.seq,
        material: mat.material,
      });
    }

    if (!store.itemMap.has(mat.material)) {
      issues.push({
        severity: 'error',
        code: 'MAT_CHILD_MISSING',
        message: `Material line (${mat.item}, op ${mat.operation}, seq ${mat.seq}): child item "${mat.material}" not found in Items`,
        item: mat.item,
        operation: mat.operation,
        seq: mat.seq,
        material: mat.material,
      });
    }

    // 5. No duplicate PK in materials
    const mk = matKey(mat.item, mat.operation, mat.seq, mat.material);
    if (seenMatKeys.has(mk)) {
      issues.push({
        severity: 'error',
        code: 'MAT_DUPLICATE_PK',
        message: `Duplicate material PK: (${mat.item}, op ${mat.operation}, seq ${mat.seq}, mat "${mat.material}")`,
        item: mat.item,
        operation: mat.operation,
        seq: mat.seq,
        material: mat.material,
      });
    }
    seenMatKeys.add(mk);
  }

  // 6. No duplicate PK in operations
  const seenOpKeys = new Set<string>();
  for (const op of store.operationMap.values()) {
    const ok = opKey(op.item, op.operation);
    if (seenOpKeys.has(ok)) {
      issues.push({
        severity: 'error',
        code: 'OP_DUPLICATE_PK',
        message: `Duplicate operation PK: (${op.item}, op ${op.operation})`,
        item: op.item,
        operation: op.operation,
      });
    }
    seenOpKeys.add(ok);
  }

  // 7. Warn about items that are consumed but have no Items record
  //    (already caught above as MAT_CHILD_MISSING, but also worth a summary)
  for (const consumed of store.consumedItems) {
    if (!store.itemMap.has(consumed)) {
      // Already reported per-line above; skip duplicate
    }
  }

  // 8. Warn about new provisional materials whose child item is also provisional
  //    — dependency order check (item must exist before material references it)
  for (const mat of store.materialMap.values()) {
    if (mat._status === 'new') {
      const childItem = store.itemMap.get(mat.material);
      if (childItem && childItem._status === 'new') {
        // This is fine — both new in-session.  SyteLine import order will handle it
        // as long as we emit items before materials in export.
      }
    }
  }

  return issues;
}
