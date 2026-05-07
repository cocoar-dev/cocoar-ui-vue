<script setup lang="ts">
/**
 * `<CoarMonthRow>` — internal layout component for one week row
 * inside the month grid.
 *
 * Owns:
 *   - the 7-column CSS grid that lines up day cells across the week
 *   - the row's pixel height (set inline so per-row collapsed /
 *     expanded states can animate independently)
 *   - the `position: relative` containing block that lets multi-day
 *     bars overlay across cells via absolute positioning
 *
 * Does NOT own: cells, bars, dnd, expansion logic. Those are
 * passed in as slot content.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

interface Props {
  /** Pixel height for the entire row (computed by the parent
   *  from the multi-day-bar lane count + collapsed/expanded state). */
  heightPx: number;
  /**
   * Visual density. Compact tightens the row's `min-height`; the
   * compact rule lives here (not on the parent month-view) because
   * Vue's scoped CSS won't let a parent descendant selector reach
   * into the child's scope.
   */
  density?: 'comfortable' | 'compact';
}

withDefaults(defineProps<Props>(), { density: 'comfortable' });

defineSlots<{
  /**
   * Row content. The parent typically renders day cells first
   * (which establish the 7 columns + flex pill columns) followed
   * by absolutely-positioned multi-day bars and any drag overlays.
   */
  default(): unknown;
}>();
</script>

<template>
  <div
    class="coar-month-row"
    :class="{ 'coar-month-row--density-compact': density === 'compact' }"
    :style="{ height: heightPx + 'px' }"
    role="row"
  >
    <slot />
  </div>
</template>

<style scoped>
.coar-month-row {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* `height` is set inline by the parent via the `heightPx` prop;
     this `min-height` is an emergency floor in case the inline
     height is ever omitted. */
  min-height: 100px;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
  /* Smooth the collapsed → expanded height change when a user
     opens (or closes) a row via the cell kebab. 200 ms is short
     enough to feel snappy but long enough to read as "the row
     is growing", not just popping. The accordion-style single-
     row expansion keeps total motion at one row at a time. */
  transition: height 200ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .coar-month-row { transition: none; }
}
.coar-month-row:last-child {
  border-bottom: none;
}

.coar-month-row--density-compact {
  min-height: 80px;
}
</style>
