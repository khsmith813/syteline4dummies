// Core domain types for the SyteLine BOM editor.
// _raw stores all original CSV column values by position for lossless round-trip export.

export type ProvStatus = 'existing' | 'new';

export interface ItemRow {
  // Managed key
  item: string;

  // Editable — required on creation
  description: string;
  type: string;           // e.g. "Material", "Subcontract"
  source: string;         // "Purchased" | "Manufactured"
  stocked: boolean;
  uom: string;
  unitCost: number;
  abcCode: string;
  costType: string;       // e.g. "Actual"
  costMethod: string;     // e.g. "FIFO"

  // Editable — optional
  backflush: boolean;
  leadTime: number;
  productCode: string;
  materialStatus: string; // "Active" | "Obsolete" | …

  // Display-only (SyteLine-maintained)
  currentUnitCost: number;
  lowLevel: number;
  qtyOnHand: number;

  // All original CSV column values by position (for export pass-through)
  _raw: string[];
  _status: ProvStatus;
}

export interface OperationRow {
  // Managed keys
  item: string;
  operation: number;

  // Editable — required on creation
  wc: string;
  schedDriver: string;    // e.g. "Labor"
  splitRule: string;      // e.g. "No Splitting"

  // Editable — optional
  description: string;
  controlPoint: boolean;
  backflush: string;      // "Neither" | "Backflush" | … (string enum in SyteLine)
  laborHrPerPiece: number;
  machHrsPerPiece: number;
  setupHours: number;
  yieldPct: number;       // 0–100
  effectiveDate: string;
  obsoleteDate: string;

  // Display-only (derived)
  itemDescription: string;
  wcDescription: string;

  _raw: string[];
  _status: ProvStatus;
}

export interface MaterialRow {
  // Managed keys (PK: item + operation + seq + material)
  material: string;  // child item
  item: string;      // parent item
  operation: number;
  seq: number;

  // Derived / read-only — NOT independently stored; written through from parent op on export
  wc: string;
  wcDescription: string;

  // Editable — required on creation
  quantity: number;
  per: string;        // "Unit" | "Lot"

  // Editable — optional
  uom: string;
  type: string;       // "Material" | "Other"
  scrapFactor: number;
  effectiveDate: string;
  obsoleteDate: string;
  ref: string;        // "Inventory" | "Purchase Order"
  backflush: boolean;
  backflushLocation: string;

  // Display-only (derived from Items lookups)
  itemDescription: string;
  materialDescription: string;

  _raw: string[];
  _status: ProvStatus;
}

// ── Tree node types ──────────────────────────────────────────────────────────

export type NodeKind =
  | 'root-item'        // top-level assembly (has ops, not consumed anywhere)
  | 'operation'        // routing step under a parent item
  | 'material'         // component line under an operation
  | 'mfg-child'        // manufactured child item expanded inline (shared sub-assembly)
  | 'unassigned-group' // synthetic root for orphaned items
  | 'unassigned-item'; // orphaned item (no ops, not in any BOM)

export interface TreeNode {
  id: string;         // stable unique key for virtualizer
  kind: NodeKind;
  depth: number;

  // Exactly one of these is set depending on kind
  itemRow?: ItemRow;
  operationRow?: OperationRow;
  materialRow?: MaterialRow;

  // Sub-tree (populated lazily for mfg-child nodes)
  subRows: TreeNode[];
  isExpanded: boolean;

  // Visual flags
  isSharedMfg: boolean;  // this node is a manufactured item used in multiple parents
  _status: ProvStatus;
  _unassignedCount?: number; // only set on unassigned-group node
}

// ── In-memory store ──────────────────────────────────────────────────────────

export interface DataStore {
  // Primary maps
  itemMap: Map<string, ItemRow>;           // item → ItemRow
  operationMap: Map<string, OperationRow>; // `${item}::${op}` → OperationRow
  materialMap: Map<string, MaterialRow>;   // `${item}::${op}::${seq}::${mat}` → MaterialRow

  // Derived indexes (built on ingest, maintained on edit)
  opsByItem: Map<string, OperationRow[]>;   // item → sorted ops
  matsByItemOp: Map<string, MaterialRow[]>; // `${item}::${op}` → sorted materials
  mfgItems: Set<string>;                    // items that own operations
  consumedItems: Set<string>;              // items referenced as a material anywhere

  // Preserved CSV headers for lossless export
  itemHeaders: string[];
  operationHeaders: string[];
  materialHeaders: string[];
}

// ── Validation ───────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  // Optional references to the offending record
  item?: string;
  operation?: number;
  seq?: number;
  material?: string;
}
