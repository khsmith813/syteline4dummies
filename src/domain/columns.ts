// Column index constants — single source of truth for CSV ↔ typed field mapping.
// Indices verified against actual CSV headers.

export const ITEM_COL = {
  // Managed key
  ITEM: 7,
  // Editable — required on creation
  DESCRIPTION: 14,
  TYPE: 24,
  SOURCE: 25,
  STOCKED: 22,
  UOM: 5,
  UNIT_COST: 30,
  ABC_CODE: 27,
  COST_TYPE: 28,
  COST_METHOD: 29,
  // Editable — optional
  BACKFLUSH: 103,
  LEAD_TIME: 61,
  PRODUCT_CODE: 26,
  MATERIAL_STATUS: 97,
  // Display-only
  CURRENT_UNIT_COST: 31,
  LOW_LEVEL: 43,
  QTY_ON_HAND: 35,
  TOTAL_COLS: 202,
} as const;

export const OP_COL = {
  // Managed keys
  ITEM: 0,
  OPERATION: 29,
  // Editable — required on creation
  WC: 27,
  SCHED_DRIVER: 11,
  SPLIT_RULE: 18,
  // Editable — optional
  DESCRIPTION: 22,
  CONTROL_POINT: 40,
  BACKFLUSH: 41,
  LABOR_HR: 1,
  MACH_HR: 2,
  SETUP_HOURS: 14,
  YIELD: 39,
  EFFECTIVE_DATE: 3,
  OBSOLETE_DATE: 24,
  // Display-only (derived)
  ITEM_DESCRIPTION: 35,
  WC_DESCRIPTION: 36,
  TOTAL_COLS: 50,
} as const;

export const MAT_COL = {
  // Managed keys (PK)
  MATERIAL: 0,
  ITEM: 1,
  OPERATION: 2,
  SEQ: 3,
  // Derived / read-only (written through from parent op on export)
  WC: 11,
  WC_DESCRIPTION: 12,
  // Editable — required on creation
  QUANTITY: 21,
  PER: 22,
  // Editable — optional
  UOM: 23,
  TYPE: 20,
  SCRAP_FACTOR: 25,
  EFFECTIVE_DATE: 26,
  OBSOLETE_DATE: 27,
  REF: 29,
  BACKFLUSH: 30,
  BACKFLUSH_LOCATION: 31,
  // Display-only (derived)
  ITEM_DESCRIPTION: 10,
  MATERIAL_DESCRIPTION: 13,
  // Duplicate Revision columns (pass-through)
  REVISION_1: 4,  // col 4
  REVISION_2: 8,  // col 8
  TOTAL_COLS: 46,
} as const;
