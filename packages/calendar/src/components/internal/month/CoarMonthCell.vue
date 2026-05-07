<script setup lang="ts">
/**
 * `<CoarMonthCell>` — internal presentational wrapper for one day
 * in the month grid.
 *
 * Owns:
 *   - the cell element (today / weekend / other-month classes)
 *   - the day-number row + per-cell kebab trigger
 *   - the pills container (scrollable when overflowing) — content
 *     is provided via the default slot, so live pills, source
 *     phantoms and invalid ghosts all flow through one path
 *
 * Does NOT own: dnd, layout, expand state, pill / bar visuals.
 * Those live in the parent month view, `<CoarMonthPill>` and
 * `<CoarMonthBar>` respectively.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { Temporal } from '../../../core';

interface Props {
  day: Temporal.PlainDate;
  /** `dateKey(day)` precomputed by the parent. Surface as `data-day-key`. */
  dayKey: string;
  isToday?: boolean;
  isOtherMonth?: boolean;
  isWeekend?: boolean;
  /**
   * Top inset for the pills container. Lets the pills sit below
   * the row's multi-day-bar area instead of overlapping it. The
   * row knows the bar-area height; the cell just renders it.
   */
  pillsMarginTopPx: number;
  /**
   * Forwarded `aria-expanded` for the kebab. The cell only knows
   * "is the menu currently open AGAINST me?", set by the parent.
   */
  menuOpenForThisCell?: boolean;
  /** Localised kebab `aria-label`. Parent supplies the i18n string. */
  kebabAriaLabel: string;
  density?: 'comfortable' | 'compact';
  /**
   * `aria-rowindex` for the cell — counts from 1, with row 1 being
   * the weekday-header row, so week rows start at 2.
   */
  ariaRowIndex: number;
  /** `aria-colindex` for the cell — 1..7. */
  ariaColIndex: number;
  /** Locale-formatted date string for `aria-label`. */
  ariaLabel: string;
}

const props = withDefaults(defineProps<Props>(), {
  isToday: false,
  isOtherMonth: false,
  isWeekend: false,
  menuOpenForThisCell: false,
  density: 'comfortable',
});

const emit = defineEmits<{
  /** Pointer-down on the cell body. Parent typically emits `date-click`. */
  cellPointerdown: [native: PointerEvent, day: Temporal.PlainDate];
  /** Right-click / long-press on the cell body. */
  cellContextmenu: [native: MouseEvent, day: Temporal.PlainDate];
  /** Click on the kebab — opens the cell menu anchored at the trigger. */
  kebabClick: [native: MouseEvent, day: Temporal.PlainDate];
}>();

defineSlots<{
  /**
   * Pills (and source-phantom / invalid ghost). Rendered inside
   * the pills container which scrolls when content overflows.
   */
  default(): unknown;
}>();

const ariaExpanded = computed(() =>
  props.menuOpenForThisCell ? 'true' : 'false',
);

function onPointerdown(e: PointerEvent) {
  emit('cellPointerdown', e, props.day);
}
function onContextmenu(e: MouseEvent) {
  emit('cellContextmenu', e, props.day);
}
function onKebabClick(e: MouseEvent) {
  emit('kebabClick', e, props.day);
}
</script>

<template>
  <div
    class="coar-month-cell"
    :class="{
      'coar-month-cell--today': isToday,
      'coar-month-cell--other-month': isOtherMonth,
      'coar-month-cell--weekend': isWeekend,
      'coar-month-cell--density-compact': density === 'compact',
    }"
    :data-day-key="dayKey"
    role="gridcell"
    :aria-rowindex="ariaRowIndex"
    :aria-colindex="ariaColIndex"
    :aria-label="ariaLabel"
    :aria-current="isToday ? 'date' : undefined"
    @pointerdown="onPointerdown"
    @contextmenu="onContextmenu"
  >
    <div class="coar-month-cell__day-number-row">
      <span class="coar-month-cell__day-number">{{ day.day }}</span>
      <!-- Kebab trigger for per-cell actions. Hover-reveal on
           desktop (CSS), always visible on touch where there's
           no hover. Currently only carries expand/collapse —
           future actions land here as extra menu items. -->
      <button
        type="button"
        class="coar-month-cell__menu-trigger"
        :aria-label="kebabAriaLabel"
        aria-haspopup="menu"
        :aria-expanded="ariaExpanded"
        @pointerdown.stop
        @click.stop="onKebabClick"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="2.5" r="1" fill="currentColor" />
          <circle cx="6" cy="6" r="1" fill="currentColor" />
          <circle cx="6" cy="9.5" r="1" fill="currentColor" />
        </svg>
      </button>
    </div>

    <!-- Pills area: single-day events for this cell, offset
         below the row's multi-day bars. The container scrolls
         when the pill list outgrows the cell's height — no
         "+N more" truncation, every event stays in the DOM
         (so keyboard focus + DnD reach all of them). -->
    <div
      class="coar-month-cell__pills"
      :style="{ marginTop: pillsMarginTopPx + 'px' }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.coar-month-cell {
  position: relative;
  /* Grid items default to `min-width: auto` which lets long pill
     content (event titles) blow up the column. Lock to 0 so the
     `1fr` track sizing actually distributes equally regardless of
     what's inside. */
  min-width: 0;
  /* `min-height: 0` is the flex/grid analogue: without it, a flex
     child with `overflow: auto` can't actually shrink past its
     content's intrinsic size, so the pill list won't scroll. */
  min-height: 0;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  background: var(--coar-calendar-bg, #fff);
  contain: layout paint;
}
.coar-month-cell:first-child { border-left: none; }
.coar-month-cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-month-cell--other-month {
  background: var(--coar-calendar-bg-other-month, #fafafb);
  color: var(--coar-text-subtle, #9ca3af);
}
.coar-month-cell--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}

.coar-month-cell__day-number-row {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  height: 24px;
  box-sizing: border-box;
}
.coar-month-cell__day-number {
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.coar-month-cell--today .coar-month-cell__day-number {
  color: var(--coar-color-accent, #2563eb);
}
.coar-month-cell--other-month .coar-month-cell__day-number {
  color: var(--coar-text-subtle, #9ca3af);
  font-weight: 500;
}

.coar-month-cell__pills {
  display: flex;
  flex-direction: column;
  gap: 2px;
  /* Top padding gives the topmost pill's focus outline (2 px width
   * at outline-offset: 1 px → 3 px above the pill box) breathing
   * room inside the overflow:auto viewport. Without it, the top of
   * the focus halo is clipped by the scroll edge and the user sees
   * a missing border. Bottom padding is part of the original visual
   * spacing inside the cell. */
  padding: 3px 4px 4px 4px;
  /* margin-top is set inline based on the row's bar count, so the
     pills sit BELOW the multi-day bars no matter how many lanes
     are above. */
  /* Take the remaining space inside the cell and scroll if the
     pill list is taller. `min-height: 0` (here AND on the cell
     parent) is what lets a flex child actually shrink to its
     constraints; without it the cell's intrinsic content height
     wins and overflow:auto never engages. */
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  /* Thin scrollbar that doesn't compete with calendar content. */
  scrollbar-width: thin;
  scrollbar-color: var(--coar-border-neutral-tertiary, #d1d5db) transparent;
}
.coar-month-cell__pills::-webkit-scrollbar {
  width: 6px;
}
.coar-month-cell__pills::-webkit-scrollbar-thumb {
  background: var(--coar-border-neutral-tertiary, #d1d5db);
  border-radius: 3px;
}
.coar-month-cell__pills::-webkit-scrollbar-track {
  background: transparent;
}

/* Per-cell kebab trigger. Hover-reveal on devices that have
 * hover (typical desktop / mouse). Always visible on devices
 * without hover (touch). Also visible whenever the menu is open,
 * keeping the trigger anchored as the user mouses to the menu. */
.coar-month-cell__menu-trigger {
  margin-left: auto;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--coar-text-subtle, #6c7280);
  border-radius: var(--coar-radius-xs, 2px);
}
.coar-month-cell__menu-trigger:hover,
.coar-month-cell__menu-trigger:focus-visible,
.coar-month-cell__menu-trigger[aria-expanded="true"] {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  color: var(--coar-text-base, #1a1c1f);
}
@media (hover: hover) {
  .coar-month-cell__menu-trigger {
    opacity: 0;
  }
  .coar-month-cell:hover .coar-month-cell__menu-trigger,
  .coar-month-cell__menu-trigger:focus-visible,
  .coar-month-cell__menu-trigger[aria-expanded="true"] {
    opacity: 1;
  }
}
</style>
