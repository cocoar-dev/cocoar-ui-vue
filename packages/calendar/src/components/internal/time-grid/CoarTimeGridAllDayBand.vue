<script setup lang="ts">
/**
 * `<CoarTimeGridAllDayBand>` — internal all-day band sitting
 * between the day-of-week header and the time-grid body.
 *
 * Renders the localised "all-day" axis label on the left, then
 * one click-target cell per visible day, plus a default slot for
 * the actual `<CoarTimeGridAllDayBar>` instances and any drag
 * overlays the parent stacks on top.
 *
 * The columns container's element is forwarded to the parent
 * via `setColumnsEl(el)` — the parent uses it as the all-day
 * hit-test reference for `useCalendarDnd`.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import type { Temporal } from '../../../core';

interface Props {
  /** Visible days, left-to-right. */
  days: ReadonlyArray<Temporal.PlainDate>;
  /** Localised "all-day" label. */
  axisLabel: string;
  /** Pixel height for the band (lane-count + lane-gap math). */
  bandHeightPx: number;
  isToday: (day: Temporal.PlainDate) => boolean;
  isWeekend: (day: Temporal.PlainDate) => boolean;
  /** Forwards the columns DOM element to the parent on mount. */
  setColumnsEl: (el: HTMLElement | null) => void;
}

defineProps<Props>();

const emit = defineEmits<{
  /** User clicked an empty all-day cell. */
  cellPointerdown: [native: PointerEvent, day: Temporal.PlainDate];
  /** User double-clicked an empty all-day cell (bars stop their own). */
  cellDblclick: [native: MouseEvent, day: Temporal.PlainDate];
}>();

defineSlots<{
  /** Bars + phantom + invalid overlay placed above the cells. */
  default(): unknown;
}>();

function onCellPointerdown(e: PointerEvent, day: Temporal.PlainDate) {
  emit('cellPointerdown', e, day);
}
function onCellDblclick(e: MouseEvent, day: Temporal.PlainDate) {
  emit('cellDblclick', e, day);
}
</script>

<template>
  <div
    class="coar-time-grid-all-day-band"
    :style="{ minHeight: bandHeightPx + 'px' }"
    role="region"
    :aria-label="axisLabel"
  >
    <div class="coar-time-grid-all-day-band__axis" aria-hidden="true">{{ axisLabel }}</div>
    <div
      :ref="(el) => setColumnsEl(el as HTMLElement | null)"
      class="coar-time-grid-all-day-band__columns"
    >
      <div
        v-for="(day, i) in days"
        :key="day.toString()"
        class="coar-time-grid-all-day-band__cell"
        :class="{
          'coar-time-grid-all-day-band__cell--today': isToday(day),
          'coar-time-grid-all-day-band__cell--weekend': isWeekend(day),
        }"
        :style="{ gridColumn: i + 1 }"
        @pointerdown="onCellPointerdown($event, day)"
        @dblclick="onCellDblclick($event, day)"
      />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.coar-time-grid-all-day-band {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width) 1fr;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
  background: var(--coar-calendar-bg, #fff);
  font-size: var(--coar-font-size-xs, 11px);
}
.coar-time-grid-all-day-band__axis {
  /* No border-right — the first all-day cell owns the seam via
     `border-left: 1px` (parity with the hour-axis fix below the band). */
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-subtle, #6c7280);
  padding: 4px 6px;
  /*
   * Allow the localized label to wrap. The band uses `min-height`
   * (set inline based on lane count), not a fixed height — so when
   * wrapping makes the row taller, the cells grow with it and the
   * border-bottom stays correctly anchored.
   * `--coar-time-grid-axis-width: 80 px` is a comfortable default
   * for English / German; longer locales just take an extra line.
   */
  align-self: start;
  line-height: 1.2;
}
.coar-time-grid-all-day-band__columns {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}
.coar-time-grid-all-day-band__cell {
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
}
.coar-time-grid-all-day-band__cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-time-grid-all-day-band__cell--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}
</style>
