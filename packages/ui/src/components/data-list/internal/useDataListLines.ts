import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { CoarDataListEntry, CoarDataListKey, CoarDataListLayout } from '../types';

type ItemEntry<T> = Extract<CoarDataListEntry<T>, { kind: 'item' }>;
type GroupEntry<T> = Extract<CoarDataListEntry<T>, { kind: 'group' }>;

/**
 * One virtualized row. In list layout an `items` line holds exactly one entry;
 * in grid layout it holds up to `columns` entries, still in data order.
 */
export type CoarDataListLine<T> =
  | { kind: 'group'; key: string; entry: GroupEntry<T> }
  | { kind: 'items'; key: string; entries: ItemEntry<T>[] };

export interface UseDataListLinesOptions<T> {
  entries: Ref<readonly CoarDataListEntry<T>[]>;
  layout: () => CoarDataListLayout;
  tileMinWidth: () => number | string;
  gap: () => number | string | undefined;
  /** The scroll container — its width decides the column count. */
  viewport: Ref<HTMLElement | null>;
  /** Invisible element styled with `width: tileMinWidth; padding-left: gap`, used to resolve CSS lengths to px. */
  probe: Ref<HTMLElement | null>;
}

export interface UseDataListLinesReturn<T> {
  lines: ComputedRef<CoarDataListLine<T>[]>;
  /** Tiles per row (1 in list layout). */
  columns: ComputedRef<number>;
  lineIndexOfKey(key: CoarDataListKey): number;
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

/**
 * Chunks the model's entries into virtualizable lines and derives the grid
 * column count from the viewport width. Group headings always take a full line.
 */
export function useDataListLines<T>(options: UseDataListLinesOptions<T>): UseDataListLinesReturn<T> {
  const viewportWidth = ref(0);
  const minTilePx = ref(0);
  const gapPx = ref(0);

  function remeasure(): void {
    const viewport = options.viewport.value;
    if (viewport) viewportWidth.value = viewport.clientWidth;
    const probe = options.probe.value;
    let width = 0;
    let gap = 0;
    if (probe && typeof getComputedStyle !== 'undefined') {
      const style = getComputedStyle(probe);
      width = Number.parseFloat(style.width);
      gap = Number.parseFloat(style.paddingLeft);
    }
    // Environments without layout (tests) resolve px/rem values directly.
    minTilePx.value = width > 0 ? width : parseLength(options.tileMinWidth());
    gapPx.value = gap > 0 ? gap : parseLength(options.gap());
  }

  const columns = computed(() => {
    if (options.layout() !== 'grid') return 1;
    const min = Math.max(1, minTilePx.value);
    const gap = Math.max(0, gapPx.value);
    const width = viewportWidth.value;
    if (width <= 0) return 1;
    return Math.max(1, Math.floor((width + gap) / (min + gap)));
  });

  const lines = computed<CoarDataListLine<T>[]>(() => {
    const perLine = columns.value;
    const result: CoarDataListLine<T>[] = [];
    let current: ItemEntry<T>[] = [];
    const flush = () => {
      if (current.length === 0) return;
      result.push({ kind: 'items', key: `r:${String(current[0].itemKey)}`, entries: current });
      current = [];
    };
    for (const entry of options.entries.value) {
      if (entry.kind === 'group') {
        flush();
        result.push({ kind: 'group', key: entry.key, entry });
        continue;
      }
      current.push(entry);
      if (current.length >= perLine) flush();
    }
    flush();
    return result;
  });

  const lineByKey = computed(() => {
    const map = new Map<CoarDataListKey, number>();
    lines.value.forEach((line, index) => {
      if (line.kind === 'items') for (const entry of line.entries) map.set(entry.itemKey, index);
    });
    return map;
  });

  function lineIndexOfKey(key: CoarDataListKey): number {
    return lineByKey.value.get(key) ?? -1;
  }

  // Track the viewport width; the probe resolves CSS lengths without parsing units.
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

  watch([options.layout, options.tileMinWidth, options.gap], () => {
    void nextTick(remeasure);
  }, { flush: 'post' });

  onMounted(() => {
    void nextTick(remeasure);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    detachWindow?.();
    detachWindow = null;
  });

  return { lines, columns, lineIndexOfKey, remeasure };
}
