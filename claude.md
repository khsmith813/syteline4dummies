# Build: SyteLine BOM Tree Editor (in-browser, CSV round-trip)

## Context
I'm building an internal engineering tool to visualize and restructure Bills of
Material exported from Infor SyteLine (CloudSuite Industrial). SyteLine's native
forms only show flat tables and have no good multi-level visualization and no
usable version control. This tool fills that gap for a large upcoming BOM
restructuring that is largely composed of NEW records.

The workflow is: load 3 CSVs exported from SyteLine → visualize and edit them as
an indented, collapsible tree with editable data columns → export the 3 CSVs back
out → commit to Git (Git is the source of truth and the diff/version-control
layer). The exported CSVs later get imported into a SyteLine TEST environment for
validation before promotion to production, so export fidelity and dependency
ordering are critical.

## IMPORTANT: read the real data first
Three CSV files are provided in the workspace: an **items** table, a
**current operations** table, and a **current materials** table. Before writing
any code, inspect all three to learn the EXACT column names, types, and key
fields. The field names I use below are conceptual — use the real column names
from the files. Do not hardcode guessed names. Early on, propose which specific
columns are editable, which are tool-managed keys, which are derived/read-only,
and which are pass-through, based on the actual data, and let me confirm.

## SyteLine data model (the domain — get this right)

### Items
Master records. Primary key = item number. Source of default values for many
material and operation fields (e.g. Source, Stocked, Type, UOM, cost). Every
parent and every component referenced anywhere must exist here.

### Current Operations
Primary key = (item, operation_number). A routing step belonging to a PARENT
item. Carries work center (WC), control-point flag, backflush setting, and
scheduling/labor fields. It has only ONE item reference — the parent. Operations
have no child. A single parent can have multiple operations, which is how that
parent flows through multiple stations/WCs; this flow-through-operations
dimension is exactly what the tree should make visible.

### Current Materials
Primary key = **(parent item, operation_number, sequence, material)** — i.e. the
child item (`material`) is PART OF THE KEY, not just a payload field. The same
parent at the same operation can carry many distinct material lines; sequence and
material together disambiguate within an operation. Fields:
- `item` = the PARENT assembly whose BOM this line belongs to.
- `material` = the CHILD component consumed (part of the key).
- quantity-per, a backflush flag, and other fields defaulted from the child
  item's master.
- **WC is DERIVED, never authored here.** A material's work center comes solely
  from how Current Operations defines that parent's operation's WC. In the tool,
  the material-row WC is READ-ONLY/computed: display it for context, never make it
  editable on the material, and on export write it by looking THROUGH to its
  operation rather than storing it as independent truth. Change a material's
  effective WC only by reparenting it to a different operation or by editing the
  operation's WC at the operation level.

### Hierarchy / tree construction
- A parent item's tree-children are its operations (Current Operations where
  operation.item == parent). Each operation's children are its material lines
  (Current Materials where material.item == parent AND material.operation == that
  operation).
- Multi-level: a material's `material` (child item) may itself be a manufactured
  parent — detect this by checking whether that child item appears as an `item` in
  Current Operations (it has its own routing). If so, the node is expandable into
  that child's own operations → materials (recurse). If not, it's a purchased leaf.
- **Root nodes** = top-level items: items that have operations but never appear as
  a `material` in Current Materials (nothing consumes them — the sellable models).
  Also support loading an explicit list of root item numbers.
- **Shared subassemblies**: the same manufactured child item can appear under many
  parents. Its sub-tree is a single shared DEFINITION — editing its
  operations/materials in one place reflects everywhere it's used. Expand these
  lazily (on user click), not automatically, and visually indicate that a node is
  a shared manufactured item whose edits propagate to all usages.

## Tech stack
- Vite + React + TypeScript.
- TanStack Table for the row/expansion model (tree via subRows) and TanStack
  Virtual for row virtualization. Both are headless — write ALL markup and styling
  yourself with custom components + CSS. Do not pull in a UI component kit; I want
  full control of the rendering (indented tree, data columns beside the name,
  drag handles).
- PapaParse for CSV parse/serialize.
- Everything runs in the browser. No backend, no remote/serverless database, no
  auth. Optionally use IndexedDB (e.g. `idb`) ONLY for local autosave / crash
  recovery — Git/CSV remains the source of truth.

## Performance
- Current materials is ~30,000+ rows; items and operations add more.
- Hold the entire dataset in memory as plain JS/TS objects, with Map indexes
  (by item, by parent, by (item,operation)). Memory is not a concern at this size;
  do NOT use SQLite/WASM or any query engine — plain objects + Maps are simpler
  and faster for this access pattern.
- Virtualization is MANDATORY — never render the full row set to the DOM, only the
  visible window. The flattened visible list is the expanded tree in display order.

## Core features

### 1. Ingest
- Load the 3 CSVs (file picker + drag-drop). Parse with PapaParse, preserving ALL
  columns and original values.
- Build the in-memory tree per the model above. Validate on load (see Validation).

### 2. Tree view (main UI)
- Indented, collapsible/expandable rows like a CAD BOM tree. Node types nest:
  item → operation → material → (manufactured child item → operation → ...).
- To the right of the name/number, show data columns appropriate per row type
  (materials: quantity-per, backflush flag, derived WC [read-only], reference;
  operations: WC, control-point flag, backflush, key scheduling fields). Use the
  real columns from the CSVs.
- Expand/collapse, expand-all/collapse-all, per-node expand.

### 3. Inline editing
- Editable cells for non-key, non-derived fields. Keys
  (item / operation / sequence / material) are MANAGED by the tool. The
  material-row WC is derived and read-only.

### 4. Record creation (first-class — the launch is mostly new records)
Creation is the same edit model plus new-row generation, managed-key assignment,
and default population. Support four cases:

- **New item (items table).** When choosing a child item anywhere, offer "pick
  existing" OR "create new item." Creating a net-new item captures its item number
  and the fields that drive downstream defaults (Source, Stocked, Type, UOM, cost),
  so material lines referencing it populate sensibly.
- **New operation (under a parent).** Key = (parent, new operation number).
  Auto-suggest the next gap-of-10 number (10, 20, 30…) and allow inserting between
  (e.g. 25). Require a WC (which becomes the derived WC for materials placed under
  it). Default control-point/backflush/scheduling from the chosen work center
  where possible (SyteLine itself defaults these from the WC).
- **New material line (under an operation).** Key = (parent, operation, next
  sequence, material). Require choosing the child item (existing or newly created)
  and quantity-per. WC is NOT entered (derived from the operation). Other fields
  default from the child item's master.
- **New top-level model.** Compose the above: create a new parent item, scaffold
  an empty routing ready to receive operations, then materials. Provide a
  "copy from existing model" option that clones another model's operations +
  materials as a starting template (mirrors SyteLine's Copy Routing/BOM), since
  the models share much structure.

**Enforced dependency order (critical):** item → operation → material. The tool
must PREVENT creating a material that references a child item which doesn't exist
(and isn't being created in the same action), or a material under a nonexistent
operation. Top-down creation in the UI satisfies this naturally, but enforce it
explicitly. Flag created-but-not-yet-exported rows as provisional/new so they're
visually distinct and easy to spot in review.

### 5. Move tool (drag-to-reparent)
- Drag a material node to a different operation (same or different parent):
  retarget its (item, operation) to the destination and assign the next available
  sequence there; the derived WC updates to the destination operation's WC.
- Drag an operation node to a different parent item: retarget its item.
- Renumbering: operations use gap-of-10 so steps can be inserted; material
  sequences renumber sequentially (+1) within their operation (SyteLine assigns
  highest-sequence + 1).
- Reuse the same managed-key logic for both move and create.

### 6. Search (replaces Ctrl+F)
Browser Ctrl+F can't work with virtualization (off-screen rows aren't in the DOM),
so build in-app search over the in-memory data:
- Search across configurable fields (item, description, WC, operation, material),
  including columns not currently visible.
- On a match: walk UP the matched node's ancestor chain and expand every collapsed
  ancestor so it enters the flattened visible list; THEN compute its index and call
  the virtualizer's scrollToIndex; THEN highlight/select. (The expand-ancestors
  step is essential — without it, matches inside collapsed branches can't be
  scrolled to.)
- Maintain all matching indices with next/previous nav (Enter / Shift+Enter) and a
  match count. A clickable results side-panel that jumps to each hit is a plus.
- Intercept Ctrl/Cmd+F (preventDefault) to open this search instead of the
  browser's.

### 7. Export + Git round-trip
- Export the SAME 3 CSVs (items, current operations, current materials), each
  preserving its original column set and order. Modify only edited values and
  tool-managed keys; pass through untouched any columns the UI doesn't display.
  Write each material's WC by looking through to its operation.
- **Dependency-ordered output**: emit items first, then operations, then materials,
  so a downstream SyteLine import satisfies foreign-key dependencies in sequence.
- **Deterministic ordering** so Git diffs reflect real changes, not reorder noise:
  sort current materials by (item, operation, sequence, material), current
  operations by (item, operation), items by item number; keep column order
  identical to source; stable quoting/line endings.
- The user commits the 3 files to Git themselves; the tool just produces clean,
  diff-friendly files.

## Validation (run on load, after creation/edits, and before export)
Surface (don't silently emit) integrity problems:
- Every current-materials `material` (child) exists in the items table (or is a
  provisional new item created in-session).
- Every current-materials (item, operation) exists in current operations.
- Every current-operations `item` exists in the items table.
- No duplicate (item, operation, sequence, material) in materials; no duplicate
  (item, operation) in operations.
- No material referencing a nonexistent/uncreated item or operation (creation
  dependency check).
- Report orphans / stranded references and let the user review before exporting.

## Architecture guidance
- Put the domain logic — tree construction from the adjacency data, key derivation,
  sequence/operation renumbering, create + reparent operations, default
  inheritance from the items master, validation, and CSV regeneration — in a
  separate, well-tested, UI-INDEPENDENT TypeScript module. This is the hard,
  high-value part and determines whether the round-trip into SyteLine is correct.
- Unit-test it. Key test: ingest → no edits → export reproduces the input modulo
  deterministic ordering (round-trip fidelity). Add tests for create and reparent
  key assignment, and for the dependency-order export.
- Build incrementally; let me review between stages:
  1. Inspect the CSVs; define the data model + types from the real columns;
     propose editable vs. managed vs. derived vs. pass-through columns.
  2. Ingest + tree construction + validation (no UI; prove with tests).
  3. Virtualized tree render (read-only).
  4. Inline editing.
  5. Record creation (all four cases) with dependency enforcement.
  6. Drag-to-reparent.
  7. Search.
  8. Export + deterministic, dependency-ordered CSV writing + round-trip test.

## Non-goals
- No backend, no cloud/serverless DB, no authentication.
- No direct SyteLine API integration — import into SyteLine is handled separately
  via the test environment.
- Not live multi-user; collaboration happens through Git branches/merges.