import { useRef, useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { buildFlatTree } from '../domain/tree.ts';
import { opKey } from '../domain/store.ts';
import type { DataStore, TreeNode } from '../domain/types.ts';

interface Props {
  store: DataStore;
}

export function BomTree({ store }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const flat = useMemo(
    () => buildFlatTree(store, expandedIds),
    [store, expandedIds],
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 15,
  });

  const toggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  const expandRoots = useCallback(() => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      for (const node of flat) {
        if (node.kind === 'root-item') next.add(node.id);
      }
      return next;
    });
  }, [flat]);

  const stats = `${store.itemMap.size.toLocaleString()} items · ${store.operationMap.size.toLocaleString()} ops · ${store.materialMap.size.toLocaleString()} materials`;

  return (
    // flex-1 min-h-0: allows this column to shrink inside the App flex container
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 h-8 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <span className="text-[11px] text-zinc-500 select-none">{stats}</span>
        <div className="flex gap-1">
          <ToolbarBtn onClick={expandRoots}>Expand Roots</ToolbarBtn>
          <ToolbarBtn onClick={collapseAll}>Collapse All</ToolbarBtn>
        </div>
      </div>

      {/* ── Scroll container ─────────────────────────────────────────────────
           overflow-auto here + flex-1 min-h-0 makes this div the scroll root.
           Without min-h-0 a flex child won't shrink below its content height,
           so overflow-auto never triggers and the page scrolls instead.       */}
      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto">

        {/* Inner div sized to the total virtual height so the scrollbar is correct */}
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>

          {virtualizer.getVirtualItems().map(vrow => {
            const node = flat[vrow.index]!;
            return (
              // Each virtual row: absolutely positioned, translateY drives placement.
              // Height is fixed at estimateSize (28 px) — set explicitly so the
              // virtualizer's total-size calculation stays accurate.
              <div
                key={vrow.key}
                className="absolute top-0 left-0 w-full"
                style={{ height: `${vrow.size}px`, transform: `translateY(${vrow.start}px)` }}
              >
                <TreeRow node={node} store={store} onToggle={toggle} />
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border border-zinc-600 rounded-sm cursor-pointer select-none"
    >
      {children}
    </button>
  );
}

function nodeIsExpandable(node: TreeNode, store: DataStore): boolean {
  switch (node.kind) {
    case 'root-item':
    case 'mfg-child':
      return !!node.itemRow && (store.opsByItem.get(node.itemRow.item)?.length ?? 0) > 0;
    case 'operation':
      return !!node.operationRow &&
        (store.matsByItemOp.get(opKey(node.operationRow.item, node.operationRow.operation))?.length ?? 0) > 0;
    case 'material':
      return node.isSharedMfg;
    case 'unassigned-group':
      return true;
    case 'unassigned-item':
      return false;
  }
}

function TreeRow({
  node,
  store,
  onToggle,
}: {
  node: TreeNode;
  store: DataStore;
  onToggle: (id: string) => void;
}) {
  const expandable = nodeIsExpandable(node, store);

  return (
    <div
      className={[
        'flex items-center h-full border-b border-zinc-800/50 hover:bg-zinc-800/40',
        node._status === 'new' ? 'border-l-2 border-l-yellow-400' : '',
      ].join(' ')}
    >
      {/* Depth indent — inline width so it's dynamic */}
      <div className="shrink-0" style={{ width: node.depth * 20 }} />

      {/* Expand / collapse toggle */}
      <button
        onClick={() => expandable && onToggle(node.id)}
        disabled={!expandable}
        className={[
          'shrink-0 w-5 h-full flex items-center justify-center text-[9px]',
          expandable
            ? 'text-zinc-500 hover:text-zinc-200 cursor-pointer'
            : 'text-zinc-700 cursor-default',
        ].join(' ')}
        aria-label={node.isExpanded ? 'collapse' : 'expand'}
      >
        {expandable ? (node.isExpanded ? '▼' : '▶') : '·'}
      </button>

      {/* Kind-specific content */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden pr-3">
        <RowContent node={node} />
      </div>
    </div>
  );
}

function RowContent({ node }: { node: TreeNode }) {
  switch (node.kind) {
    case 'root-item':
    case 'mfg-child': {
      const r = node.itemRow!;
      return (
        <>
          <span className="font-semibold text-[#9cdcfe] whitespace-nowrap">{r.item}</span>
          <span className="text-[11px] text-zinc-500 truncate min-w-0 flex-1">{r.description}</span>
          <Badge variant="default">{r.source}</Badge>
          <span className="text-[11px] text-zinc-500 tabular-nums whitespace-nowrap">{r.uom}</span>
          {node.isSharedMfg && <Badge variant="shared">shared</Badge>}
        </>
      );
    }

    case 'operation': {
      const r = node.operationRow!;
      return (
        <>
          <span className="text-[#ce9178] whitespace-nowrap">
            Op&nbsp;<strong>{r.operation}</strong>
          </span>
          <Badge variant="wc">{r.wc}</Badge>
          <span className="text-[11px] text-zinc-500 whitespace-nowrap">{r.schedDriver}</span>
          {r.description && (
            <span className="text-[11px] text-zinc-600 truncate min-w-0 flex-1">{r.description}</span>
          )}
        </>
      );
    }

    case 'material': {
      const r = node.materialRow!;
      return (
        <>
          <span className={`whitespace-nowrap ${node.isSharedMfg ? 'text-[#4ec9b0] font-medium' : 'text-zinc-300'}`}>
            {r.material}
          </span>
          {r.materialDescription && (
            <span className="text-[11px] text-zinc-500 truncate min-w-0 flex-1">{r.materialDescription}</span>
          )}
          <span className="text-[11px] text-zinc-500 tabular-nums whitespace-nowrap">
            {r.quantity}&nbsp;{r.per}
          </span>
          <span className="text-[11px] text-zinc-500 whitespace-nowrap">{r.uom}</span>
          {/* WC is derived from parent operation — italic + muted green signals read-only */}
          <span
            className="text-[11px] text-green-800 italic whitespace-nowrap"
            title="Derived from parent operation — not editable here"
          >
            {r.wc}
          </span>
          {r.backflush && <Badge variant="backflush">BF</Badge>}
          {node.isSharedMfg && <Badge variant="shared">mfg↓</Badge>}
        </>
      );
    }

    case 'unassigned-group':
      return (
        <span className="italic text-zinc-500 text-[12px] select-none">
          Unassigned ({node._unassignedCount})
        </span>
      );

    case 'unassigned-item': {
      const r = node.itemRow!;
      return (
        <>
          <span className="text-zinc-600 whitespace-nowrap">{r.item}</span>
          <span className="text-[11px] text-zinc-600 truncate min-w-0 flex-1">{r.description}</span>
          <Badge variant="default">{r.source}</Badge>
        </>
      );
    }
  }
}

type BadgeVariant = 'default' | 'wc' | 'shared' | 'backflush';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  default:   'bg-zinc-800 text-zinc-400 border-zinc-700',
  wc:        'bg-[#1e2d3d] text-[#4fc1ff] border-[#1e4070]',
  shared:    'bg-teal-950 text-teal-400 border-teal-800',
  backflush: 'bg-yellow-950 text-yellow-400 border-yellow-900',
};

function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-1.5 py-px rounded border whitespace-nowrap shrink-0 leading-none ${BADGE_CLASSES[variant]}`}>
      {children}
    </span>
  );
}
