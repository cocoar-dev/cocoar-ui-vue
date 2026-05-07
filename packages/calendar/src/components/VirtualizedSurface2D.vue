<script setup lang="ts">
/**
 * `<VirtualizedSurface2D>` — 2D virtualized grid (X × Y) with
 * recycling-pool-free keyed v-for.
 *
 * Designed for the (post-launch) timeline view (resources × time);
 * shipped today as part of the calendar package so the 2D virtualization
 * architecture is empirically validated and not just promised.
 *
 * ── Why a separate component, not a bigger 1DY ──────────────────────
 *
 * The 1D and 2D code paths share NOTHING at the Vue layer. The 1DY
 * component has exactly zero conditional branches for "if axis is also
 * X". Adding 2D as a separate component means:
 *
 *   1. 1D scrolling can never be regressed by 2D work.
 *   2. The 1D bundle is unaffected — consumers using only 1DY pay 0
 *      bytes for 2D code.
 *   3. Both components compile to dead-simple v-for loops, no axis
 *      switches inside the render function.
 *
 * The shared layer is the framework-agnostic `core/virtualScroll.ts`:
 * `getVisibleRange1D` is called twice (one per axis), and a fresh
 * `MeasurementCache` lives per axis when variable-size lands.
 *
 * ── Phase 0 scope: fixed-size only ──────────────────────────────────
 *
 * The 2D variable-size path adds complexity (per-row + per-column
 * caches, anchor restoration in two axes, ResizeObserver-driven
 * partial re-layouts). Real consumers — a future timeline view in
 * particular — typically have known cell sizes (a "minute" is a fixed
 * pixel width; a "resource" is a fixed row height). Fixed-size 2D
 * ships today; variable-size 2D extends the API when a consumer
 * actually needs it.
 *
 * ── Anchor restoration in 2D ────────────────────────────────────────
 *
 * Not implemented in fixed-size mode (no measurements → no size
 * changes → no anchor work needed). When variable-size 2D lands, the
 * anchor will be a `{x, y}` pair, computed against the snapshot in
 * the same way the 1D component does, and applied to both
 * scrollLeft and scrollTop.
 */

import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
} from 'vue';

import {
  getVisibleRange1D,
  MeasurementCache,
  type Range2D,
} from '../core';

// ─── Props / emits ─────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    /** Number of items along the X axis (columns). */
    itemCountX: number;
    /** Number of items along the Y axis (rows). */
    itemCountY: number;
    /** Fixed cell width in px. Required in Phase 0 fixed-size mode. */
    cellWidth: number;
    /** Fixed cell height in px. Required in Phase 0 fixed-size mode. */
    cellHeight: number;
    /** Items beyond the X-axis viewport rendered each direction. */
    overscanX?: number;
    /** Items beyond the Y-axis viewport rendered each direction. */
    overscanY?: number;
  }>(),
  {
    overscanX: 3,
    overscanY: 3,
  },
);

const emit = defineEmits<{
  rangeChange: [range: Range2D];
  scroll: [pos: { scrollX: number; scrollY: number }];
}>();

// ─── State ─────────────────────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null);
const scrollX = ref(0);
const scrollY = ref(0);
const viewportWidth = ref(0);
const viewportHeight = ref(0);

// Internal caches — pre-populated with `getItemSize` equivalents for
// the fixed cell sizes. Each cache size is constant (just a single
// estimate × itemCount, no per-item measurements). We keep the
// cache type for symmetry with the 1D path; in fixed-size mode the
// cache is effectively just a constant multiplier.
const cacheX = computed(() => new MeasurementCache(props.itemCountX, props.cellWidth));
const cacheY = computed(() => new MeasurementCache(props.itemCountY, props.cellHeight));

// ─── Range computation ────────────────────────────────────────────────

const range: ComputedRef<Range2D> = computed(() => ({
  x: getVisibleRange1D(cacheX.value, scrollX.value, viewportWidth.value, props.overscanX),
  y: getVisibleRange1D(cacheY.value, scrollY.value, viewportHeight.value, props.overscanY),
}));

const totalWidth = computed(() => props.itemCountX * props.cellWidth);
const totalHeight = computed(() => props.itemCountY * props.cellHeight);

/**
 * Materialised cell list. The 2D surface renders the Cartesian
 * product of `[range.x.startIndex, range.x.endIndex)` ×
 * `[range.y.startIndex, range.y.endIndex)`. Each cell carries its
 * `{x, y}` indices and pre-computed transform offset so the v-for
 * key stays simple (`y * itemCountX + x`).
 */
const renderedCells = computed(() => {
  const r = range.value;
  const w = props.cellWidth;
  const h = props.cellHeight;
  const cells: { x: number; y: number; tx: number; ty: number; key: number }[] = [];
  for (let y = r.y.startIndex; y < r.y.endIndex; y++) {
    for (let x = r.x.startIndex; x < r.x.endIndex; x++) {
      cells.push({
        x,
        y,
        tx: x * w,
        ty: y * h,
        key: y * props.itemCountX + x,
      });
    }
  }
  return cells;
});

// ─── Scroll handling ──────────────────────────────────────────────────

let scrollRafScheduled = false;
function onScroll(e: Event) {
  if (scrollRafScheduled) return;
  scrollRafScheduled = true;
  requestAnimationFrame(() => {
    scrollRafScheduled = false;
    const el = e.target as HTMLElement;
    if (el.scrollLeft !== scrollX.value) scrollX.value = el.scrollLeft;
    if (el.scrollTop !== scrollY.value) scrollY.value = el.scrollTop;
    emit('scroll', { scrollX: el.scrollLeft, scrollY: el.scrollTop });
  });
}

// Re-emit on range change.
import { watch } from 'vue';
watch(range, (r) => emit('rangeChange', r));

// ─── Lifecycle ────────────────────────────────────────────────────────

let viewportObserver: ResizeObserver | null = null;

onMounted(() => {
  const el = containerRef.value;
  if (!el) return;
  viewportWidth.value = el.clientWidth;
  viewportHeight.value = el.clientHeight;
  scrollX.value = el.scrollLeft;
  scrollY.value = el.scrollTop;

  if (typeof ResizeObserver !== 'undefined') {
    viewportObserver = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w !== viewportWidth.value) viewportWidth.value = w;
      if (h !== viewportHeight.value) viewportHeight.value = h;
    });
    viewportObserver.observe(el);
  }
});

onBeforeUnmount(() => {
  viewportObserver?.disconnect();
});

// ─── Imperative API ───────────────────────────────────────────────────

defineExpose({
  /** Current rendered range (both axes, includes overscan). */
  getRange: () => range.value,
  /** First fully-or-partially visible cell at the top-left. */
  getFirstVisibleCell: () => ({
    x:
      props.itemCountX === 0 || props.cellWidth <= 0
        ? 0
        : Math.min(props.itemCountX - 1, Math.floor(scrollX.value / props.cellWidth)),
    y:
      props.itemCountY === 0 || props.cellHeight <= 0
        ? 0
        : Math.min(props.itemCountY - 1, Math.floor(scrollY.value / props.cellHeight)),
  }),
  /**
   * Scroll so the cell at `(x, y)` is at the top-left of the viewport.
   * Either axis may be omitted to leave that axis untouched.
   */
  scrollToCell(coord: { x?: number; y?: number }, behavior: ScrollBehavior = 'auto') {
    const el = containerRef.value;
    if (!el) return;
    const opts: ScrollToOptions = { behavior };
    if (coord.x !== undefined) opts.left = coord.x * props.cellWidth;
    if (coord.y !== undefined) opts.top = coord.y * props.cellHeight;
    el.scrollTo(opts);
  },
});
</script>

<template>
  <div
    ref="containerRef"
    class="coar-virtualized-surface-2d"
    @scroll="onScroll"
  >
    <div
      class="coar-virtualized-surface-2d__spacer"
      :style="{
        width: totalWidth + 'px',
        height: totalHeight + 'px',
      }"
    >
      <div
        v-for="cell in renderedCells"
        :key="cell.key"
        class="coar-virtualized-surface-2d__cell"
        :style="{
          width: props.cellWidth + 'px',
          height: props.cellHeight + 'px',
          transform: `translate(${cell.tx}px, ${cell.ty}px)`,
        }"
        :data-x="cell.x"
        :data-y="cell.y"
      >
        <slot name="cell" :x="cell.x" :y="cell.y" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-virtualized-surface-2d {
  position: relative;
  overflow: auto;
  /* `contain: strict` isolates layout / paint / size / style. The 2D
     surface is a self-contained scroll boundary. */
  contain: strict;
}

.coar-virtualized-surface-2d__spacer {
  position: relative;
  /* Width / height set inline. */
}

.coar-virtualized-surface-2d__cell {
  position: absolute;
  top: 0;
  left: 0;
  /* Width / height / transform set inline. `contain: layout paint
     style` keeps each cell's render isolated; `contain: size` is safe
     here because cell dimensions are explicit (fixed-size mode). */
  contain: layout paint size style;
  box-sizing: border-box;
}
</style>
