<script setup lang="ts">
/**
 * `<CoarTimeGridColumn>` — internal day-column for the time-grid.
 *
 * Owns:
 *   - the column's today / weekend background tint
 *   - the gradient-painted slot lines (no DOM nodes per slot)
 *   - the click target for empty-slot `time-click`
 *   - a `position: relative` containing block for the absolutely-
 *     positioned events + phantom + invalid + now-marker that
 *     the parent stacks via the default slot
 *
 * The slot-gradient uses `slotHeightPx` (slotDuration × pxPerHour
 * / 60) and is shifted by `renderBufferOffsetPx` so the first
 * gridline lands at the END of the FIRST slot of `timeRange`
 * (instead of 15 min before it).
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { Temporal } from '../../../core';

interface Props {
  day: Temporal.PlainDate;
  isToday?: boolean;
  isWeekend?: boolean;
  /** Total column height in pixels (`(endHour - startHour) * pxPerHour`). */
  heightPx: number;
  /** Pixel height of one slot subdivision (slotDuration × pxPerHour / 60). */
  slotHeightPx: number;
  /** Pixel offset for the slot-line gradient — shifts the pattern
   *  down so the first gridline lands at the end of the first slot. */
  renderBufferOffsetPx: number;
}

const props = withDefaults(defineProps<Props>(), {
  isToday: false,
  isWeekend: false,
});

const emit = defineEmits<{
  pointerdown: [native: PointerEvent, day: Temporal.PlainDate];
  /** Double-click on the EMPTY column (event cards stop their own). */
  dblclick: [native: MouseEvent, day: Temporal.PlainDate];
}>();

defineSlots<{
  /** Events + drag overlays + now-marker — absolutely positioned
   *  inside the column by the parent. */
  default(): unknown;
}>();

const backgroundImage = computed(
  () =>
    'repeating-linear-gradient(to bottom,' +
    ' transparent 0,' +
    ` transparent ${props.slotHeightPx - 1}px,` +
    ` var(--coar-calendar-grid-line, #e3e5e9) ${props.slotHeightPx - 1}px,` +
    ` var(--coar-calendar-grid-line, #e3e5e9) ${props.slotHeightPx}px)`,
);

function onPointerdown(e: PointerEvent) {
  emit('pointerdown', e, props.day);
}
function onDblclick(e: MouseEvent) {
  emit('dblclick', e, props.day);
}
</script>

<template>
  <div
    class="coar-time-grid-column"
    :class="{
      'coar-time-grid-column--today': isToday,
      'coar-time-grid-column--weekend': isWeekend,
    }"
    :style="{
      height: heightPx + 'px',
      backgroundImage,
      backgroundPosition: `0 ${renderBufferOffsetPx}px`,
    }"
    @pointerdown="onPointerdown"
    @dblclick="onDblclick"
  >
    <slot />
  </div>
</template>

<style scoped>
.coar-time-grid-column {
  position: relative;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  background: var(--coar-calendar-bg, #fff);
  /* `contain: layout` keeps the layout-isolation perf win without
     clipping the paint of children — needed so a ghost / invalid
     event card's outline can extend slightly past the column box
     instead of getting cut off at the rightmost column edge. */
  contain: layout;
}
.coar-time-grid-column--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-time-grid-column--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}
</style>
