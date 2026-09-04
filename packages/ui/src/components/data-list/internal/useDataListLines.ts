import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { CoarDataListEntry, CoarDataListKey, CoarDataListLayout } from '../types';

type ItemEntry<T> = Extract<CoarDataListEntry<T>, { kind: 'item' }>;
type GroupEntry<T> = Extract<CoarDataListEntry<T>, { kind: 'group' }>;

/**
 * Where a line sits when it belongs to the children of an expanded grid tile:
 * the band under that tile's row. `parentColumn` / `columns` describe the
 * parent's position in its row so the frame can open exactly under it.
 */
export interface CoarDataListBand {
  parentKey: CoarDataListKey;
  parentColumn: number;
  parentColumns: number;
  /** 1 for a band under a top-level row, 2 for a band inside that band, … */
  level: number;
  first: boolean;
  last: boolean;
}

/**
 * One virtualized row. `items` lines hold one entry in list layout, up to
 * `columns` entries in grid layout — always in data order. Lines carry the
 * layout of their level, so a list may nest grid children and vice versa.
 */
export type CoarDataListLine<T> =
  | { kind: 'group'; key: string; entry: GroupEntry<T>; depth: 0; band?: CoarDataListBand }
  | {
      kind: 'items';
      key: string;
      entries: ItemEntry<T>[];
      depth: number;
      layout: CoarDataListLayout;
      columns: number;
      /** Set on the row that has a band directly under it (its bottom gap is removed). */
      opensBand: boolean;
      band?: CoarDataListBand;
    };

export interface UseDataListLinesOptions<T> {
  entries: Ref<readonly CoarDataListEntry<T>[]>;
  layout: () => CoarDataListLayout;
  tileMinWidth: () => number | string;
  /** Layout / tile width of the child levels; `undefined` = inherit. */
  childLayout: () => CoarDataListLayout | undefined;
  childTileMinWidth: () => number | string | undefined;
  gap: () => number | string | undefined;
  /** Horizontal inset of a band (px) — bands are narrower than their parent row. */
  bandInset: () => number;
  /** The scroll container — its width decides the column count. */
  viewport: Ref<HTMLElement | null>;
  /** Invisible element styled with `width: tileMinWidth; padding-left: gap`, used to resolve CSS lengths to px. */
  probe: Ref<HTMLElement | null>;
  /** Same for the child levels' tile width. */
  childProbe: Ref<HTMLElement | null>;
}

/** A band's extent in lines — one frame is drawn per band, not per line. */
export interface CoarDataListBandRange {
  parentKey: CoarDataListKey;
  level: number;
  firstLine: number;
  lastLine: number;
}

export interface UseDataListLinesReturn<T> {
  lines: ComputedRef<CoarDataListLine<T>[]>;
  bands: ComputedRef<CoarDataListBandRange[]>;
  /** Tiles per row on the top level (1 in list layout). */
  columns: ComputedRef<number>;
  lineIndexOfKey(key: CoarDataListKey): number;
  /** Visual position of an item: its line and its column inside that line. */
  positionOfKey(key: CoarDataListKey): { line: number; column: number } | null;
  /** Re-read viewport and probe sizes (e.g. after a layout change the observer cannot see). */
  remeasure(): void;
}

function parseLength(value: number | string | undefined): number {
  if (value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const match = /^\s*(-?[\d.]+)\s*(px|rem|em)?\s*$/.exec(value);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  if (match[2] === 'rem' || match[2] === 'em') {
    const root = typeof document !== 'undefined' ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) : 16;
    return amount * (Number.isFinite(root) && root > 0 ? root : 16);
  }
  return amount;
}

interface Node<T> {
  entry: ItemEntry<T>;
  children: Node<T>[];
}

/**
 * Chunks the model's entries into virtualizable lines and derives the grid
 * column count from the viewport width. Group headings always take a full
 * line. Children of an expanded parent follow the parent row directly in list
 * layout; in grid layout they form a band under the parent's *row*, so tiles
 * never move horizontally when something expands.
 */
export function useDataListLines<T>(options: UseDataListLinesOptions<T>): UseDataListLinesReturn<T> {
  const viewportWidth = ref(0);
  const minTilePx = ref(0);
  const childMinTilePx = ref(0);
  const gapPx = ref(0);

  function readProbe(probe: HTMLElement | null, fallback: number | string | undefined): { width: number; gap: number } {
    let width = 0;
    let gap = 0;
    if (probe && typeof getComputedStyle !== 'undefined') {
      const style = getComputedStyle(probe);
      width = Number.parseFloat(style.width);
      gap = Number.parseFloat(style.paddingLeft);
    }
    // Environments without layout (tests) resolve px/rem values directly.
    return { width: width > 0 ? width : parseLength(fallback), gap: gap > 0 ? gap : parseLength(options.gap()) };
  }

  function remeasure(): void {
    const viewport = options.viewport.value;
    if (viewport) {
      // Content width: the viewport may carry inner padding (`--coar-data-list-padding`).
      let padding = 0;
      if (typeof getComputedStyle !== 'undefined') {
        const style = getComputedStyle(viewport);
        padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
      }
      viewportWidth.value = Math.max(0, viewport.clientWidth - padding);
    }
    const top = readProbe(options.probe.value, options.tileMinWidth());
    minTilePx.value = top.width;
    gapPx.value = top.gap;
    childMinTilePx.value = readProbe(options.childProbe.value, options.childTileMinWidth() ?? options.tileMinWidth()).width;
  }

  function columnsFor(width: number, minTile: number): number {
    const min = Math.max(1, minTile);
    const gap = Math.max(0, gapPx.value);
    if (width <= 0) return 1;
    return Math.max(1, Math.floor((width + gap) / (min + gap)));
  }

  const columns = computed(() => (options.layout() === 'grid' ? columnsFor(viewportWidth.value, minTilePx.value) : 1));

  function layoutAt(depth: number): CoarDataListLayout {
    return depth === 0 ? options.layout() : (options.childLayout() ?? options.layout());
  }

  function columnsAt(depth: number, bandLevel: number): number {
    if (layoutAt(depth) !== 'grid') return 1;
    if (depth === 0) return columns.value;
    // Every enclosing band insets its content on both sides.
    const width = viewportWidth.value - 2 * options.bandInset() * bandLevel;
    return columnsFor(width, childMinTilePx.value || minTilePx.value);
  }

  /** Rebuild the tree the model flattened: children follow their parent with depth + 1. */
  function buildNodes(entries: readonly CoarDataListEntry<T>[], from: number, depth: number): { nodes: Node<T>[]; next: number } {
    const nodes: Node<T>[] = [];
    let i = from;
    while (i < entries.length) {
      const entry = entries[i];
      if (entry.kind !== 'item' || entry.depth < depth) break;
      if (entry.depth > depth) {
        // Belongs to the previous node; consumed by its recursive call.
        i++;
        continue;
      }
      const node: Node<T> = { entry, children: [] };
      const nested = buildNodes(entries, i + 1, depth + 1);
      node.children = nested.nodes;
      nodes.push(node);
      i = nested.next;
    }
    return { nodes, next: i };
  }

  const lines = computed<CoarDataListLine<T>[]>(() => {
    const result: CoarDataListLine<T>[] = [];

    const emitLevel = (nodes: Node<T>[], depth: number, band: CoarDataListBand | undefined) => {
      const layout = layoutAt(depth);
      if (layout === 'list') {
        for (const node of nodes) {
          result.push({ kind: 'items', key: `r:${String(node.entry.itemKey)}`, entries: [node.entry], depth, layout, columns: 1, opensBand: false, band });
          if (node.children.length > 0) emitLevel(node.children, depth + 1, band);
        }
        return;
      }
      const perLine = columnsAt(depth, band?.level ?? 0);
      for (let start = 0; start < nodes.length; start += perLine) {
        const row = nodes.slice(start, start + perLine);
        const parents = row.filter((node) => node.children.length > 0);
        result.push({
          kind: 'items',
          key: `r:${String(row[0].entry.itemKey)}`,
          entries: row.map((node) => node.entry),
          depth,
          layout,
          columns: perLine,
          opensBand: parents.length > 0,
          band,
        });
        // The band under this row: one per expanded parent, in tile order (the
        // component keeps it to one per row so the frame stays readable).
        for (const parent of parents) {
          const startIndex = result.length;
          emitLevel(parent.children, depth + 1, {
            parentKey: parent.entry.itemKey,
            parentColumn: row.indexOf(parent),
            parentColumns: perLine,
            level: (band?.level ?? 0) + 1,
            first: false,
            last: false,
          });
          if (result.length > startIndex) {
            const firstLine = result[startIndex];
            const lastLine = result[result.length - 1];
            if (firstLine.band) firstLine.band = { ...firstLine.band, first: true };
            if (lastLine.band) lastLine.band = { ...lastLine.band, last: true };
          }
        }
      }
    };

    const entries = options.entries.value;
    let i = 0;
    while (i < entries.length) {
      const entry = entries[i];
      if (entry.kind === 'group') {
        result.push({ kind: 'group', key: entry.key, entry, depth: 0 });
        i++;
        continue;
      }
      // A run of top-level items (with their nested children) up to the next group heading.
      const { nodes, next } = buildNodes(entries, i, 0);
      emitLevel(nodes, 0, undefined);
      i = Math.max(next, i + 1);
    }
    return result;
  });

  const bands = computed<CoarDataListBandRange[]>(() => {
    const result: CoarDataListBandRange[] = [];
    const open = new Map<CoarDataListKey, CoarDataListBandRange>();
    lines.value.forEach((line, index) => {
      const band = line.band;
      if (!band) return;
      if (band.first) open.set(band.parentKey, { parentKey: band.parentKey, level: band.level, firstLine: index, lastLine: index });
      const range = open.get(band.parentKey);
      if (range) range.lastLine = index;
      if (band.last && range) {
        result.push(range);
        open.delete(band.parentKey);
      }
    });
    return result;
  });

  const positions = computed(() => {
    const map = new Map<CoarDataListKey, { line: number; column: number }>();
    lines.value.forEach((line, index) => {
      if (line.kind === 'items') line.entries.forEach((entry, column) => map.set(entry.itemKey, { line: index, column }));
    });
    return map;
  });

  function lineIndexOfKey(key: CoarDataListKey): number {
    return positions.value.get(key)?.line ?? -1;
  }

  function positionOfKey(key: CoarDataListKey): { line: number; column: number } | null {
    return positions.value.get(key) ?? null;
  }

  // Track the viewport width; the probes resolve CSS lengths without parsing units.
  let observer: ResizeObserver | null = null;
  let detachWindow: (() => void) | null = null;

  watch(
    options.viewport,
    (el) => {
      observer?.disconnect();
      observer = null;
      detachWindow?.();
      detachWindow = null;
      if (!el) return;
      remeasure();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => remeasure());
        observer.observe(el);
      } else if (typeof window !== 'undefined') {
        const onResize = () => remeasure();
        window.addEventListener('resize', onResize);
        detachWindow = () => window.removeEventListener('resize', onResize);
      }
    },
    { immediate: true },
  );

  watch(
    [options.layout, options.tileMinWidth, options.childLayout, options.childTileMinWidth, options.gap],
    () => {
      void nextTick(remeasure);
    },
    { flush: 'post' },
  );

  onMounted(() => {
    void nextTick(remeasure);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    detachWindow?.();
    detachWindow = null;
  });

  return { lines, bands, columns, lineIndexOfKey, positionOfKey, remeasure };
}
