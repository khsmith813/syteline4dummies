// Tree construction — builds the flat ordered list of TreeNodes from a DataStore.
// The virtualizer works off this flat list; depth drives indentation.

import type { DataStore, TreeNode } from './types.ts';
import { opKey } from './store.ts';

// ── Build flat visible list ───────────────────────────────────────────────────

/**
 * Returns the flat ordered list of visible TreeNodes given current expansion state.
 * Call this whenever expansion state changes to re-flatten.
 */
export function buildFlatTree(
  store: DataStore,
  expandedIds: Set<string>,
): TreeNode[] {
  const flat: TreeNode[] = [];

  // Root items: have operations, NOT consumed by any material line
  const rootItems: string[] = [];
  for (const item of store.mfgItems) {
    if (!store.consumedItems.has(item)) {
      rootItems.push(item);
    }
  }
  rootItems.sort();

  for (const item of rootItems) {
    appendItemSubtree(store, item, 0, flat, expandedIds, new Set(), false);
  }

  // Unassigned group: items with no ops and not consumed anywhere
  const unassigned: string[] = [];
  for (const [itemId] of store.itemMap) {
    if (!store.mfgItems.has(itemId) && !store.consumedItems.has(itemId)) {
      unassigned.push(itemId);
    }
  }
  unassigned.sort();

  if (unassigned.length > 0) {
    const groupId = 'unassigned-group';
    const groupNode: TreeNode = {
      id: groupId,
      kind: 'unassigned-group',
      depth: 0,
      subRows: [],
      isExpanded: expandedIds.has(groupId),
      isSharedMfg: false,
      _status: 'existing',
      _unassignedCount: unassigned.length,
    };
    flat.push(groupNode);

    if (groupNode.isExpanded) {
      for (const itemId of unassigned) {
        const itemRow = store.itemMap.get(itemId)!;
        flat.push({
          id: `unassigned::${itemId}`,
          kind: 'unassigned-item',
          depth: 1,
          itemRow,
          subRows: [],
          isExpanded: false,
          isSharedMfg: false,
          _status: itemRow._status,
        });
      }
    }
  }

  return flat;
}

// ── Recursion helpers ────────────────────────────────────────────────────────

function appendItemSubtree(
  store: DataStore,
  itemId: string,
  depth: number,
  flat: TreeNode[],
  expandedIds: Set<string>,
  visitedItems: Set<string>,
  isSharedMfg: boolean,
): void {
  const itemRow = store.itemMap.get(itemId);
  const nodeId = `item::${itemId}::d${depth}`;
  const isExpanded = expandedIds.has(nodeId);

  flat.push({
    id: nodeId,
    kind: depth === 0 ? 'root-item' : 'mfg-child',
    depth,
    itemRow,
    subRows: [],
    isExpanded,
    isSharedMfg,
    _status: itemRow?._status ?? 'existing',
  });

  if (!isExpanded) return;
  if (visitedItems.has(itemId)) return; // cycle guard

  const visited2 = new Set(visitedItems);
  visited2.add(itemId);

  const ops = store.opsByItem.get(itemId) ?? [];
  for (const op of ops) {
    appendOperationSubtree(store, op.item, op.operation, depth + 1, flat, expandedIds, visited2);
  }
}

function appendOperationSubtree(
  store: DataStore,
  item: string,
  operation: number,
  depth: number,
  flat: TreeNode[],
  expandedIds: Set<string>,
  visitedItems: Set<string>,
): void {
  const opRow = store.operationMap.get(opKey(item, operation));
  if (!opRow) return;

  const nodeId = `op::${item}::${operation}`;
  const isExpanded = expandedIds.has(nodeId);

  flat.push({
    id: nodeId,
    kind: 'operation',
    depth,
    operationRow: opRow,
    subRows: [],
    isExpanded,
    isSharedMfg: false,
    _status: opRow._status,
  });

  if (!isExpanded) return;

  const mats = store.matsByItemOp.get(opKey(item, operation)) ?? [];
  for (const mat of mats) {
    appendMaterialRow(store, mat, depth + 1, flat, expandedIds, visitedItems);
  }
}

function appendMaterialRow(
  store: DataStore,
  mat: import('./types.ts').MaterialRow,
  depth: number,
  flat: TreeNode[],
  expandedIds: Set<string>,
  visitedItems: Set<string>,
): void {
  const nodeId = `mat::${mat.item}::${mat.operation}::${mat.seq}::${mat.material}`;
  const isMfg = store.mfgItems.has(mat.material);
  const isExpanded = expandedIds.has(nodeId);

  flat.push({
    id: nodeId,
    kind: 'material',
    depth,
    materialRow: mat,
    subRows: [],
    isExpanded,
    isSharedMfg: isMfg,
    _status: mat._status,
  });

  // If manufactured child and expanded, recurse into its own ops → materials
  if (isExpanded && isMfg) {
    appendItemSubtree(store, mat.material, depth + 1, flat, expandedIds, visitedItems, true);
  }
}
