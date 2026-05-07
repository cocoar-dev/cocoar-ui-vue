<script setup lang="ts">
/**
 * `<CoarMonthGrid>` — internal layout component for the full
 * 6-row month grid plus the localised weekday-header strip.
 *
 * Owns:
 *   - the sticky weekday-header row (`Mon / Tue / Wed / …`)
 *   - the rows container that carries the DnD hit-test ref
 *   - the column borders + sticky background under the header
 *
 * Does NOT own: row layout, cells, dnd, layout pass. The row
 * container exposes its element via a function-ref prop so the
 * parent can wire it into `useCalendarDnd({ monthGridRef })`
 * without giving up the SRP.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

interface Props {
  /** Localised, first-day-of-week-respecting weekday labels. */
  weekdayHeaders: ReadonlyArray<string>;
  /**
   * Forward the rows container's DOM element to the parent the
   * moment it mounts (and `null` on unmount). The parent uses it
   * as the month-grid hit-test reference for `useCalendarDnd`.
   * Function-ref keeps the rows container DOM-owned by this
   * component while the parent still has a Ref to bind dnd to.
   */
  setRowsEl: (el: HTMLElement | null) => void;
}

defineProps<Props>();

defineSlots<{
  /** Week rows — one `<CoarMonthRow>` per `MonthWeekRow`. */
  default(): unknown;
}>();
</script>

<template>
  <div class="coar-month-grid">
    <!-- Weekday header row. Sticky to the top of the calendar
         body's scroll surface. ARIA: this is row 1 of the grid,
         containing seven column-headers. -->
    <div class="coar-month-grid__weekday-row" role="row" aria-rowindex="1">
      <div
        v-for="(name, i) in weekdayHeaders"
        :key="i"
        class="coar-month-grid__weekday-cell"
        role="columnheader"
        :aria-colindex="i + 1"
      >
        {{ name }}
      </div>
    </div>

    <!-- Rows container. Carries the ref the month-DnD hit-test
         resolves cell coords against — the weekday header row
         above doesn't participate in cell math. -->
    <div :ref="(el) => setRowsEl(el as HTMLElement | null)" class="coar-month-grid__rows">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.coar-month-grid {
  display: contents;
}

.coar-month-grid__weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
  /* Pin to the top of the scroll surface (the calendar body) so
     the weekday labels stay visible while the user scrolls
     through expanded rows. */
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--coar-calendar-bg, #fff);
}
.coar-month-grid__weekday-cell {
  padding: 8px 12px;
  font-size: var(--coar-font-size-xs, 11px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-subtle, #6c7280);
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-month-grid__weekday-cell:first-child {
  border-left: none;
}
</style>
