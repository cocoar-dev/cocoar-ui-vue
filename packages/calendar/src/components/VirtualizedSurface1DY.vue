<script setup lang="ts">
/**
 * `<VirtualizedSurface1DY>` — vertical 1D virtualized list. Foundation
 * of every scrolling surface in `@cocoar/vue-calendar`.
 *
 * ── Why no recycling pool ────────────────────────────────────────────
 *
 * An earlier draft used a recycling pool: stable Vue components whose
 * slot scope changed as the visible range shifted, so the same DOM
 * nodes were reused. We benchmarked it against Vue 3's keyed `v-for`
 * on the dev baseline (Snapdragon X Elite). Recycling was *slower* on
 * the worst-frame metric — fine-grained reactive writes to per-slot
 * properties produced more update overhead than Vue's keyed diff,
 * which mounts/unmounts exactly the deltas (one in, one out for a
 * single-item shift).
 *
 * Recycling is a winning pattern for *heavy* slot content where mount
 * cost dominates. For the slot content this calendar surfaces (event
 * cards, agenda rows, month-cell pills), Vue's diff is the better
 * primitive. We re-evaluate if a real consumer hits a wall.
 *
 * ── Architecture ─────────────────────────────────────────────────────
 *
 *   container (overflow-y: auto, contain: strict)
 *     spacer (height: totalSize, position: relative)
 *       v-for i in [startIndex, endIndex):
 *         item (position: absolute, transform: translateY(offsetForItem(i)))
 *           <slot name="item" :y="i" />
 *
 * One absolute element per visible item, each pinned by transform from
 * the spacer's top. Vue's keyed v-for over `renderedIndices` mounts new
 * items on entry and unmounts on exit. No pool, no slot-scope rotation.
 *
 * ── Measurement loop ─────────────────────────────────────────────────
 *
 * In fixed-size mode (`fixedItemSize` prop set), measurement is skipped
 * entirely — no ResizeObserver, no MeasurementCache writes. Range math
 * is plain integer division.
 *
 * In variable-size mode, a custom directive (`v-measure`) observes each
 * item's outer DIV exactly once on mount and disconnects on unmount.
 * Resize callbacks push `[itemIndex, newSize]` onto a queue drained in
 * a single rAF — the cache update, range recompute, and anchor
 * adjustment all happen in one frame.
 *
 * ── Anchor restoration ───────────────────────────────────────────────
 *
 * Default anchor = first visible item index. When sizes above it
 * change, we adjust scrollTop by `computeAnchorAdjustment` so the
 * anchor's screen position stays put. Set `anchor: null` to disable.
 */

import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Directive,
} from 'vue';

import {
  MeasurementCache,
  computeAnchorAdjustment,
  getVisibleRange1D,
  type Range1D,
} from '../core';

// ─── Props / emits ─────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    /** Total number of items in the virtual list. */
    itemCount: number;
    /** Initial estimate for an item's height before it is measured. */
    estimatedItemSize: number;
    /**
     * Fixed item size, when known. If provided, the measurement cache
     * is skipped entirely and items are positioned by simple
     * arithmetic. Use this for grids with known cell heights.
     */
    fixedItemSize?: number;
    /**
     * Items beyond the viewport rendered in each direction. Default 3
     * is a reasonable balance between scroll smoothness (more = better)
     * and memory (more = more DOM).
     */
    overscan?: number;
    /**
     * Anchor item for scroll-position restoration when sizes change.
     * `'auto'` (default) = first visible item. `null` = disabled.
     */
    anchor?: number | 'auto' | null;
  }>(),
  {
    fixedItemSize: undefined,
    overscan: 3,
    anchor: 'auto',
  },
);

const emit = defineEmits<{
  /** Fired after every range change. */
  rangeChange: [range: Range1D];
  /** Fired on every scroll. Throttled to one event per rAF. */
  scroll: [scrollTop: number];
}>();

// ─── Mode discriminator ────────────────────────────────────────────────

const isFixed = computed<boolean>(() => props.fixedItemSize !== undefined);

// ─── State ─────────────────────────────────────────────────────────────

/** The DOM element with `overflow-y: auto`. */
const containerRef = ref<HTMLElement | null>(null);

/** Current scroll position (synced from `scrollTop` on rAF after scroll). */
const scrollTop = ref(0);

/** Current viewport height (the container's clientHeight). */
const viewportHeight = ref(0);

/**
 * Variable-size cache. Lazily initialized — fixed-size mode never
 * touches it.
 */
const cache = shallowRef<MeasurementCache | null>(null);

function ensureCache(): MeasurementCache {
  if (!cache.value) {
    cache.value = new MeasurementCache(props.itemCount, props.estimatedItemSize);
  }
  return cache.value;
}

/**
 * Bumped only when the variable-size cache's prefix-sum-affecting
 * state changes (after a measurement flush, a `clear()`, or a
 * `resize()`). The `range` computed reads this in variable mode only.
 */
const cacheVersion = ref(0);

// ─── Range computation ─────────────────────────────────────────────────

const totalSize: ComputedRef<number> = computed(() => {
  if (isFixed.value) return props.itemCount * (props.fixedItemSize as number);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  cacheVersion.value;
  return cache.value ? cache.value.totalSize() : props.itemCount * props.estimatedItemSize;
});

const range = computed<Range1D>(() => {
  if (isFixed.value) {
    const size = props.fixedItemSize as number;
    if (props.itemCount === 0 || size === 0) {
      return { startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 };
    }
    const total = props.itemCount * size;
    const clamped = Math.max(0, Math.min(scrollTop.value, total));
    const firstVisible = Math.floor(clamped / size);
    const lastVisible =
      clamped + viewportHeight.value >= total
        ? props.itemCount - 1
        : Math.floor((clamped + viewportHeight.value) / size);
    const startIndex = Math.max(0, firstVisible - Math.floor(props.overscan));
    const endIndex = Math.min(
      props.itemCount,
      lastVisible + 1 + Math.floor(props.overscan),
    );
    return { startIndex, endIndex, offset: startIndex * size, totalSize: total };
  }
  // Variable mode — track cacheVersion so the computed re-runs after a
  // measurement flush.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  cacheVersion.value;
  const c = ensureCache();
  return getVisibleRange1D(c, scrollTop.value, viewportHeight.value, props.overscan);
});

/**
 * Concrete index list for `v-for`. We materialize the [start, end)
 * range into an array so Vue can key/diff. Length grows with the
 * pool's natural max but each entry is just a number.
 */
const renderedIndices = computed<number[]>(() => {
  const r = range.value;
  const out: number[] = [];
  for (let i = r.startIndex; i < r.endIndex; i++) out.push(i);
  return out;
});

function offsetForItem(itemIndex: number): number {
  if (isFixed.value) return itemIndex * (props.fixedItemSize as number);
  return cache.value ? cache.value.prefixSum(itemIndex) : itemIndex * props.estimatedItemSize;
}

// Re-emit range-change whenever the range changes.
watch(
  range,
  (r) => {
    emit('rangeChange', r);
  },
  { immediate: false },
);

// ─── Scroll handling ───────────────────────────────────────────────────

let scrollRafScheduled = false;
function onScroll(e: Event) {
  if (scrollRafScheduled) return;
  scrollRafScheduled = true;
  requestAnimationFrame(() => {
    scrollRafScheduled = false;
    const el = e.target as HTMLElement;
    scrollTop.value = el.scrollTop;
    emit('scroll', el.scrollTop);
  });
}

// ─── ResizeObserver / measurement (variable-size mode only) ────────────

interface MeasureCtx {
  /** Resolved item index for an observed element. */
  index: number;
}

/**
 * Element → context map. `WeakMap` so unmounted-but-not-yet-GC'd
 * elements don't pin memory.
 */
const measureCtx = new WeakMap<Element, MeasureCtx>();

const pendingMeasurements = new Map<number, number>();
let flushScheduled = false;

let resizeObserver: ResizeObserver | null = null;

function ensureResizeObserver() {
  if (resizeObserver || isFixed.value || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const ctx = measureCtx.get(entry.target);
      if (!ctx) continue;
      const measured = entry.contentRect.height;
      const c = cache.value;
      const cur =
        c && c.has(ctx.index) ? c.get(ctx.index) : props.estimatedItemSize;
      if (Math.abs(measured - cur) < 0.5) continue;
      pendingMeasurements.set(ctx.index, measured);
    }
    if (pendingMeasurements.size > 0) scheduleFlush();
  });
}

/**
 * Custom directive: observe on mount, disconnect on unmount, update
 * the resolved index on bound-value change. Fires hooks at exactly
 * the right times — never on every render.
 */
const vMeasure: Directive<HTMLElement, number> = {
  mounted(el, binding) {
    if (isFixed.value) return;
    ensureResizeObserver();
    if (!resizeObserver) return;
    measureCtx.set(el, { index: binding.value });
    resizeObserver.observe(el);
  },
  updated(el, binding) {
    // Bound value (= itemIndex) only changes if the same DOM is reused
    // for a different index — Vue's keyed v-for normally avoids this
    // (mount/unmount on key change), but if a parent forces re-key
    // we want to track the new index.
    const ctx = measureCtx.get(el);
    if (ctx && ctx.index !== binding.value) ctx.index = binding.value;
  },
  unmounted(el) {
    if (resizeObserver) resizeObserver.unobserve(el);
    measureCtx.delete(el);
  },
};

/**
 * Resolve the anchor item index for the given cache state.
 *
 * `'auto'` (default) → the first VISIBLE item (the item containing the
 * pixel at the current scrollTop). NOT `range.startIndex`, which would
 * include overscan above the viewport — toggling a size in overscan
 * would then pass through with delta=0 even though the visible content
 * does shift.
 *
 * `null` → no anchor; size changes propagate without scroll
 * compensation.
 *
 * `number` → the consumer's explicit choice; we trust it.
 *
 * Computed against an explicit cache snapshot (rather than reading
 * Vue reactivity) so the flush can capture the BEFORE state and use
 * it for the delta math against the AFTER state.
 */
function resolveAnchorIndex(snapshot: MeasurementCache): number | null {
  if (props.anchor === null) return null;
  if (typeof props.anchor === 'number') return props.anchor;
  // auto
  if (props.itemCount === 0) return null;
  if (isFixed.value) {
    const size = props.fixedItemSize as number;
    if (size <= 0) return 0;
    return Math.min(props.itemCount - 1, Math.floor(scrollTop.value / size));
  }
  return snapshot.indexAtOffset(scrollTop.value);
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  requestAnimationFrame(flushMeasurements);
}

function flushMeasurements() {
  flushScheduled = false;
  if (pendingMeasurements.size === 0) return;

  const c = ensureCache();
  // Snapshot of the BEFORE state — required for anchor delta math.
  const snapshot = cloneCache(c);

  // Capture anchor BEFORE we mutate the cache, against the snapshot.
  const anchor = resolveAnchorIndex(snapshot);

  for (const [idx, size] of pendingMeasurements) {
    if (idx >= 0 && idx < c.itemCount) c.set(idx, size);
  }
  pendingMeasurements.clear();
  cacheVersion.value++;

  // Anchor adjustment — keep the anchor item at its prior screen
  // y-coordinate. delta = newPrefixSum(anchor) - oldPrefixSum(anchor).
  if (anchor !== null && containerRef.value) {
    const delta = computeAnchorAdjustment(snapshot, c, anchor);
    if (delta !== 0) {
      const el = containerRef.value;
      el.scrollTop = el.scrollTop + delta;
      scrollTop.value = el.scrollTop;
    }
  }
}

function cloneCache(c: MeasurementCache): MeasurementCache {
  const copy = new MeasurementCache(c.itemCount, c.estimatedSize);
  for (let i = 0; i < c.itemCount; i++) {
    if (c.has(i)) copy.set(i, c.get(i));
  }
  return copy;
}

// ─── itemCount / estimatedItemSize / anchor reactivity ─────────────────

watch(
  () => props.itemCount,
  (newCount) => {
    if (cache.value) {
      cache.value.resize(newCount);
      cacheVersion.value++;
    }
  },
);

watch(
  () => props.estimatedItemSize,
  (newEstimate) => {
    if (!cache.value) return;
    const old = cache.value;
    const fresh = new MeasurementCache(old.itemCount, newEstimate);
    for (let i = 0; i < old.itemCount; i++) {
      if (old.has(i)) fresh.set(i, old.get(i));
    }
    cache.value = fresh;
    cacheVersion.value++;
  },
);

// ─── Lifecycle ─────────────────────────────────────────────────────────

let viewportObserver: ResizeObserver | null = null;

onMounted(() => {
  const el = containerRef.value;
  if (!el) return;
  viewportHeight.value = el.clientHeight;
  scrollTop.value = el.scrollTop;

  if (typeof ResizeObserver !== 'undefined') {
    viewportObserver = new ResizeObserver(() => {
      const h = el.clientHeight;
      if (h !== viewportHeight.value) viewportHeight.value = h;
    });
    viewportObserver.observe(el);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  viewportObserver?.disconnect();
  pendingMeasurements.clear();
});

// ─── Imperative API ────────────────────────────────────────────────────

defineExpose({
  /** Current rendered range (a snapshot of `range.value`). Includes overscan. */
  getRange: () => range.value,
  /**
   * Index of the topmost item whose top edge is at or above the
   * current scrollTop — i.e. the first item the user actually sees.
   * Different from `getRange().startIndex`, which includes overscan
   * above the viewport.
   */
  getFirstVisibleIndex(): number {
    if (props.itemCount === 0) return 0;
    if (isFixed.value) {
      const size = props.fixedItemSize as number;
      if (size <= 0) return 0;
      return Math.min(props.itemCount - 1, Math.floor(scrollTop.value / size));
    }
    return cache.value
      ? cache.value.indexAtOffset(scrollTop.value)
      : Math.floor(scrollTop.value / props.estimatedItemSize);
  },
  /** Scroll the surface so item `index` is at the top of the viewport. */
  scrollToIndex(index: number, behavior: ScrollBehavior = 'auto') {
    const el = containerRef.value;
    if (!el) return;
    const offset = offsetForItem(index);
    el.scrollTo({ top: offset, behavior });
  },
  /** Direct access to the underlying cache (variable-size mode). */
  getCache: () => cache.value,
});
</script>

<template>
  <div
    ref="containerRef"
    class="coar-virtualized-surface-1dy"
    @scroll="onScroll"
  >
    <div
      class="coar-virtualized-surface-1dy__spacer"
      :style="{ height: totalSize + 'px' }"
    >
      <div
        v-for="i in renderedIndices"
        :key="i"
        v-measure="i"
        class="coar-virtualized-surface-1dy__item"
        :style="{ transform: `translateY(${offsetForItem(i)}px)` }"
        :data-y="i"
      >
        <slot name="item" :y="i" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-virtualized-surface-1dy {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  /* `contain: strict` isolates layout, paint, size, and style. Critical
     for 60fps scroll. */
  contain: strict;
}

.coar-virtualized-surface-1dy__spacer {
  position: relative;
  width: 100%;
  /* Spacer height is set via :style. */
}

.coar-virtualized-surface-1dy__item {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  /* Per-item compositor isolation. We do NOT add `contain: size` because
     items have intrinsic content height that ResizeObserver needs to read
     in variable-size mode. */
  contain: layout paint style;
  /* The transform is set inline. */
}
</style>
