<script setup lang="ts">
/**
 * `<CoarTimeGridNowMarker>` — internal "current time" indicator
 * for the time-grid's today column.
 *
 * Thin horizontal line + dot; pure visual, no events. The
 * parent column decides whether to render it (only on today's
 * column when `nowMinutesFromGridStart !== null`) and feeds the
 * pixel offset.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

interface Props {
  /** Pixel offset from the column's top edge. */
  topPx: number;
}

defineProps<Props>();
</script>

<template>
  <div
    class="coar-time-grid-now-marker"
    :style="{ top: topPx + 'px' }"
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
</style>
