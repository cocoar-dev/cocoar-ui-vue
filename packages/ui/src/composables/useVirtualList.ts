import {
  ref,
  computed,
  watch,
  unref,
  onBeforeUnmount,
  type MaybeRefOrGetter,
  type Ref,
  type ComputedRef,
} from 'vue';

/** Options for {@link useVirtualList}. */
export interface UseVirtualListOptions {
  /** Total number of items in the virtual list. */
  count: MaybeRefOrGetter<number>;
  /**
   * Row height in pixels — either a fixed number, or a function that returns
   * the height for a given index. Reactive: if you pass a ref, changes invalidate
   * the offset cache automatically.
   */
  itemSize: MaybeRefOrGetter<number | ((index: number) => number)>;
  /** Rows rendered above/below the viewport as a scroll buffer. Default 5. */
  overscan?: MaybeRefOrGetter<number>;
  /** The scrollable element — typically a template ref on the scrolling container. */
  scrollElement: Ref<HTMLElement | null>;
}

/** One positioned row produced by the virtualizer. */
export interface VirtualRow {
  /** Position in the underlying list (0 .. count - 1). */
  index: number;
  /** Pixel offset from the top of the spacer. */
  start: number;
  /** Row height in pixels. */
  size: number;
}

export interface UseVirtualListReturn {
  /** Slice of rows currently inside the viewport + overscan window. */
  virtualRows: ComputedRef<VirtualRow[]>;
  /** Total pixel height of the full list — use this for the scroll spacer. */
  totalSize: ComputedRef<number>;
  /** Programmatically scroll an index into view. */
  scrollToIndex(
    index: number,
    align?: 'auto' | 'start' | 'center' | 'end',
  ): void;
  /** Inspect the precomputed offset for an index (debug/tests). */
  offsetFor(index: number): number;
}

function toGetter<T>(v: MaybeRefOrGetter<T>): () => T {
  return typeof v === 'function'
    ? (v as () => T)
    : () => unref(v as Ref<T> | T) as T;
}

/**
 * Minimal fixed-viewport virtualizer. Keeps a cumulative offset table so both
 * fixed and per-index heights are O(log n) per scroll event, without any
 * external dependencies.
 *
 * Usage:
 * ```ts
 * const scrollEl = useTemplateRef('scroll')
 * const { virtualRows, totalSize, scrollToIndex } = useVirtualList({
 *   count: () => items.length,
 *   itemSize: 32,
 *   scrollElement: scrollEl,
 * })
 * ```
 */
export function useVirtualList(opts: UseVirtualListOptions): UseVirtualListReturn {
  const getCount = toGetter(opts.count);
  const getSize = toGetter(opts.itemSize);
  const getOverscan = toGetter(opts.overscan ?? 5);

  const scrollTop = ref(0);
  const viewportHeight = ref(0);

  // Cumulative offset table — only materialized for the per-index (function)
  // size path. For a constant item size we skip the O(n) array entirely and
  // derive offsets analytically (offset(i) = i * size), so a count change
  // (expand/collapse) stays O(1) instead of rebuilding an n-length array.
  const offsets = computed<number[] | null>(() => {
    const sizeRaw = getSize();
    if (typeof sizeRaw !== 'function') return null;
    const n = getCount();
    const arr: number[] = new Array(n + 1);
    arr[0] = 0;
    for (let i = 0; i < n; i++) arr[i + 1] = arr[i] + sizeRaw(i);
    return arr;
  });

  /** Cumulative pixel offset at index `i`, clamped to [0, count]. O(1). */
  function offsetAt(i: number): number {
    const arr = offsets.value;
    if (arr) return arr[Math.max(0, Math.min(i, arr.length - 1))] ?? 0;
    const size = getSize() as number;
    return Math.max(0, Math.min(i, getCount())) * size;
  }

  const totalSize = computed(() => {
    const arr = offsets.value;
    if (arr) return arr.length > 0 ? arr[arr.length - 1] : 0;
    return getCount() * (getSize() as number);
  });

  /**
   * First visible index at scroll position `top` = largest i where offsets[i] ≤ top.
   * (Item i occupies [offsets[i], offsets[i+1]); it overlaps the viewport top as long
   * as its start ≤ top.)
   */
  function firstVisibleIndex(top: number): number {
    const n = getCount();
    if (n === 0) return 0;
    const arr = offsets.value;
    if (!arr) {
      const size = getSize() as number;
      if (!(size > 0)) return 0; // also rejects NaN / negative
      return Math.max(0, Math.min(n - 1, Math.floor(top / size)));
    }
    if (arr.length <= 1) return 0;
    let lo = 0;
    let hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] <= top) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - 1);
  }

  /**
   * Last visible index for viewport bottom `bot` = largest i where offsets[i] < bot.
   * (Item i is visible only if its start is strictly inside the viewport; an item
   * starting exactly at the bottom edge isn't rendered.)
   */
  function lastVisibleIndex(bot: number): number {
    const n = getCount();
    if (n === 0) return 0;
    const arr = offsets.value;
    if (!arr) {
      const size = getSize() as number;
      if (!(size > 0)) return 0; // also rejects NaN / negative
      // largest i with i*size < bot  ==  ceil(bot/size) - 1
      return Math.max(0, Math.min(n - 1, Math.ceil(bot / size) - 1));
    }
    if (arr.length <= 1) return 0;
    let lo = 0;
    let hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < bot) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - 1);
  }

  const virtualRows = computed<VirtualRow[]>(() => {
    const n = getCount();
    if (n === 0) return [];
    const overscan = Math.max(0, getOverscan() | 0);

    const top = scrollTop.value;
    const bottom = top + viewportHeight.value;

    const first = firstVisibleIndex(top);
    const last = lastVisibleIndex(bottom);

    const start = Math.max(0, first - overscan);
    const end = Math.min(n - 1, last + overscan);

    const rows: VirtualRow[] = [];
    for (let i = start; i <= end; i++) {
      const startPx = offsetAt(i);
      rows.push({ index: i, start: startPx, size: offsetAt(i + 1) - startPx });
    }
    return rows;
  });

  function scrollToIndex(
    index: number,
    align: 'auto' | 'start' | 'center' | 'end' = 'auto',
  ): void {
    const el = opts.scrollElement.value;
    if (!el) return;
    const n = getCount();
    if (n === 0) return;
    const i = Math.max(0, Math.min(n - 1, index | 0));
    const target = offsetAt(i);
    const targetEnd = offsetAt(i + 1);
    const viewport = el.clientHeight;
    const currentTop = el.scrollTop;
    const currentBottom = currentTop + viewport;

    let next = currentTop;
    if (align === 'start') next = target;
    else if (align === 'end') next = targetEnd - viewport;
    else if (align === 'center') next = target - (viewport - (targetEnd - target)) / 2;
    else {
      if (target < currentTop) next = target;
      else if (targetEnd > currentBottom) next = targetEnd - viewport;
    }

    const maxScroll = Math.max(0, totalSize.value - viewport);
    el.scrollTop = Math.max(0, Math.min(next, maxScroll));
  }

  // Wire the element: track scroll + size.
  let detach: (() => void) | null = null;

  function attach(el: HTMLElement): void {
    viewportHeight.value = el.clientHeight;
    scrollTop.value = el.scrollTop;

    const onScroll = () => {
      scrollTop.value = el.scrollTop;
      // Re-read viewport height too — covers layout changes not visible to ResizeObserver
      // (and environments without one, e.g. jsdom).
      viewportHeight.value = el.clientHeight;
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    // ResizeObserver is not guaranteed in older Node test environments — guard it.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        viewportHeight.value = el.clientHeight;
      });
      ro.observe(el);
    } else if (typeof window !== 'undefined') {
      const onResize = () => { viewportHeight.value = el.clientHeight; };
      window.addEventListener('resize', onResize);
      detach = () => {
        el.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      };
      return;
    }

    detach = () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }

  watch(
    opts.scrollElement,
    (el) => {
      detach?.();
      detach = null;
      if (el) attach(el);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    detach?.();
    detach = null;
  });

  return {
    virtualRows,
    totalSize,
    scrollToIndex,
    offsetFor: (i: number) => offsetAt(i),
  };
}
