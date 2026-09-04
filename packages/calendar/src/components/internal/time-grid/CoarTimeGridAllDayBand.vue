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
  /**
   * Render the collapse control under the axis label. The parent
   * sets this only while the band is expanded beyond its lane cap.
   */
  collapsible?: boolean;
  /** Localised label for the collapse control. */
  collapseLabel?: string;
}

withDefaults(defineProps<Props>(), { collapsible: false, collapseLabel: '' });

const emit = defineEmits<{
  /** User clicked an empty all-day cell. */
  cellPointerdown: [native: PointerEvent, day: Temporal.PlainDate];
  /** User double-clicked an empty all-day cell (bars stop their own). */
  cellDblclick: [native: MouseEvent, day: Temporal.PlainDate];
  /** User asked to fold the expanded band back to its lane cap. */
  collapse: [];
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
    <div class="coar-time-grid-all-day-band__axis">
      <span aria-hidden="true">{{ axisLabel }}</span>
      <button
        v-if="collapsible"
        type="button"
        class="coar-time-grid-all-day-band__collapse"
        @pointerdown.stop
        @click.stop="emit('collapse')"
      >
        {{ collapseLabel }}
      </button>
    </div>
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
/* During a swipe only the cells paint (see CoarTimeGrid.vue). */
.coar-time-grid--ghost .coar-time-grid-all-day-band,
.coar-time-grid--swiping .coar-time-grid-all-day-band,
.coar-time-grid--settling .coar-time-grid-all-day-band {
  background: transparent;
}
.coar-time-grid-all-day-band__axis {
  /* Opaque + above the cells so bars sliding under the axis column
     during a swipe disappear. */
  position: relative;
  z-index: 1;
  background: var(--coar-calendar-bg, #fff);
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
.coar-time-grid-all-day-band__collapse {
  display: block;
  margin-top: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--coar-color-accent, var(--coar-color-accent-500, #2563eb));
  font: inherit;
  font-size: var(--coar-font-size-xs, 11px);
  text-transform: none;
  letter-spacing: normal;
  cursor: pointer;
}
.coar-time-grid-all-day-band__collapse:hover,
.coar-time-grid-all-day-band__collapse:focus-visible {
  text-decoration: underline;
}
.coar-time-grid-all-day-band__columns {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  /* Opaque strip that moves with the cells — the band box itself
     goes transparent while pages overlap during a swipe. */
  background: var(--coar-calendar-bg, #fff);
  touch-action: pan-y;
  transform: translateX(var(--coar-time-grid-swipe-x, 0px));
}
/* Neighbour page: the axis keeps its width, paints nothing. */
.coar-time-grid--ghost .coar-time-grid-all-day-band__axis {
  visibility: hidden;
}
/* A ghost band is pinned to the live band's height; lanes it can't
   fit stay hidden instead of pushing the hour rows down. */
.coar-time-grid--ghost .coar-time-grid-all-day-band__columns {
  overflow: hidden;
}
.coar-time-grid--settling .coar-time-grid-all-day-band__columns {
  transition: transform 180ms ease-out;
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
