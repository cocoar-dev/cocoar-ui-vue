<script setup lang="ts">
/**
 * `<CoarTimeGridHeader>` — internal day-of-week header strip.
 *
 * Renders the empty top-left "corner" cell over the hour axis,
 * then one labelled day-cell per visible day. Sticks to the top
 * of the calendar body via the wrapper's `position: sticky`.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import type { Temporal } from '../../../core';

interface Props {
  /** Visible days, left-to-right. Length = column count. */
  days: ReadonlyArray<Temporal.PlainDate>;
  /** Decoration predicate provided by the parent. */
  isToday: (day: Temporal.PlainDate) => boolean;
  /** Decoration predicate provided by the parent. */
  isWeekend: (day: Temporal.PlainDate) => boolean;
  /** Locale-aware label for a day-header. */
  formatLabel: (day: Temporal.PlainDate) => string;
  density?: 'comfortable' | 'compact' | 'spacious';
  /**
   * The strip is a paging handle: a drag across the day names (any
   * pointer) pages the grid. Shows the grab cursor and forwards
   * `pointerdown` to the parent's swipe runtime.
   */
  swipeable?: boolean;
}

withDefaults(defineProps<Props>(), { density: 'comfortable', swipeable: false });

const emit = defineEmits<{
  /** Pointer went down on the day-name strip (any pointer type). */
  cellsPointerdown: [native: PointerEvent];
}>();

defineSlots<{
  /** Custom day-header. The default reads `formatLabel(day)`. */
  dayHeader(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();
</script>

<template>
  <div
    class="coar-time-grid-header"
    :class="{ 'coar-time-grid-header--density-compact': density === 'compact' }"
  >
    <div class="coar-time-grid-header__corner" aria-hidden="true" />
    <div
      class="coar-time-grid-header__cells"
      :class="{ 'coar-time-grid-header__cells--swipeable': swipeable }"
      role="row"
      @pointerdown="emit('cellsPointerdown', $event)"
    >
      <div
        v-for="(day, i) in days"
        :key="day.toString()"
        class="coar-time-grid-header__cell"
        :class="{
          'coar-time-grid-header__cell--today': isToday(day),
          'coar-time-grid-header__cell--weekend': isWeekend(day),
        }"
        role="columnheader"
        :aria-colindex="i + 1"
        :aria-current="isToday(day) ? 'date' : undefined"
      >
        <slot name="dayHeader" :date="day" :is-today="isToday(day)" :is-weekend="isWeekend(day)">
          <span class="coar-time-grid-header__label">{{ formatLabel(day) }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-time-grid-header {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width) 1fr;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
  background: var(--coar-calendar-bg, #fff);
  min-height: var(--coar-time-grid-header-height);
}
.coar-time-grid-header__corner {
  /* empty top-left cell */
}
.coar-time-grid-header__cells {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  transform: translateX(var(--coar-time-grid-swipe-x, 0px));
  /* Paging handle: horizontal pans are ours, vertical stays native. */
  touch-action: pan-y;
}
.coar-time-grid-header__cells--swipeable {
  cursor: grab;
  user-select: none;
}
.coar-time-grid--swiping .coar-time-grid-header__cells--swipeable {
  cursor: grabbing;
}
.coar-time-grid--settling .coar-time-grid-header__cells {
  transition: transform 180ms ease-out;
}
.coar-time-grid-header__cell {
  padding: 8px 12px;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  background: var(--coar-calendar-bg, #fff);
}
.coar-time-grid-header__cell--today {
  color: var(--coar-color-accent, var(--coar-color-accent-500, #2563eb));
}
.coar-time-grid-header__cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}

/* Density */
.coar-time-grid-header--density-compact .coar-time-grid-header__cell {
  padding: 4px 8px;
  font-size: var(--coar-font-size-xs, 11px);
}
</style>
