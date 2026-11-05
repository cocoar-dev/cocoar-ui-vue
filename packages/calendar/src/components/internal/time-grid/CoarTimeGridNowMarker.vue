<script setup lang="ts">
/**
 * `<CoarTimeGridNowMarker>` — internal "current time" indicator
 * for the time-grid's today column (vertical grid) or today's row
 * (horizontal grid).
 *
 * Thin line + dot; pure visual, no events. The parent decides
 * whether to render it (only for today, when the current time is in
 * the visible range) and feeds the pixel offset along the time axis.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

interface Props {
  /** Vertical grid: pixel offset from the column's top edge. */
  topPx?: number;
  /** Horizontal grid: pixel offset from the row's left edge. */
  leftPx?: number;
  orientation?: 'vertical' | 'horizontal';
}

withDefaults(defineProps<Props>(), { topPx: 0, leftPx: 0, orientation: 'vertical' });
</script>

<template>
  <div
    class="coar-time-grid-now-marker"
    :class="{ 'coar-time-grid-now-marker--horizontal': orientation === 'horizontal' }"
    :style="orientation === 'horizontal' ? { left: leftPx + 'px' } : { top: topPx + 'px' }"
    aria-hidden="true"
  >
    <span class="coar-time-grid-now-marker__dot" />
    <span class="coar-time-grid-now-marker__line" />
  </div>
</template>

<style scoped>
.coar-time-grid-now-marker {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 5;
}
.coar-time-grid-now-marker__dot {
  position: absolute;
  left: -4px;
  top: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--coar-color-danger, #dc2626);
}
.coar-time-grid-now-marker__line {
  display: block;
  height: 1px;
  background: var(--coar-color-danger, #dc2626);
}
/* Horizontal grid: a vertical line through today's row, dot on top. */
.coar-time-grid-now-marker--horizontal {
  top: 0;
  bottom: 0;
  right: auto;
  width: 0;
}
.coar-time-grid-now-marker--horizontal .coar-time-grid-now-marker__line {
  width: 1px;
  height: 100%;
}
</style>
