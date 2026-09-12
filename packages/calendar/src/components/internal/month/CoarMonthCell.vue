<script setup lang="ts">
/**
 * `<CoarMonthCell>` — internal presentational wrapper for one day
 * in the month grid.
 *
 * Owns:
 *   - the cell element (today / weekend / other-month classes)
 *   - the day-number row
 *   - the pills container — content is provided via the default
 *     slot, so live pills, source phantoms and invalid ghosts all
 *     flow through one path
 *   - the "+N" overflow button below the pills — one stable row
 *     like iOS, and on the web a control that opens the day sheet
 *
 * Does NOT own: dnd, layout, the pill cap, pill / bar visuals.
 * Those live in the parent month view, `<CoarMonthPill>` and
 * `<CoarMonthBar>` respectively.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import type { Temporal } from '../../../core';

interface Props {
  day: Temporal.PlainDate;
  /** `dateKey(day)` precomputed by the parent. Surface as `data-day-key`. */
  dayKey: string;
  isToday?: boolean;
  isOtherMonth?: boolean;
  isWeekend?: boolean;
  /** Blank leading/trailing cell in a continuous month section. */
  placeholder?: boolean;
  /**
   * Top inset for the pills container. Lets the pills sit below
   * the row's multi-day-bar area instead of overlapping it. The
   * row knows the bar-area height; the cell just renders it.
   */
  pillsMarginTopPx: number;
  /**
   * Single-day events the parent folded away because the cell's
   * pill cap was reached. `0` renders no marker.
   */
  overflowCount?: number;
  /**
   * Accessible name of the "+N" button ("3 more events"). Parent
   * supplies the i18n string.
   */
  overflowLabel?: string;
  /** `true` while this cell's day sheet is open (`aria-expanded`). */
  overlayOpen?: boolean;
  density?: 'comfortable' | 'compact' | 'spacious';
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
  placeholder: false,
  overflowCount: 0,
  overflowLabel: '',
  overlayOpen: false,
  density: 'comfortable',
});

const emit = defineEmits<{
  /** Pointer-down on the cell body. Parent typically emits `date-click`. */
  cellPointerdown: [native: PointerEvent, day: Temporal.PlainDate];
  /**
   * Double-click on the EMPTY cell body. Pills / bars stop their own
   * `dblclick` (they route to `onEventDoubleClick`), so this only
   * reaches the parent for the cell background and day number.
   */
  cellDblclick: [native: MouseEvent, day: Temporal.PlainDate];
  /** Click on the "+N" button — parent opens the day sheet. */
  overflowClick: [native: MouseEvent, day: Temporal.PlainDate];
}>();

defineSlots<{
  /**
   * Pills (and source-phantom / invalid ghost). Rendered inside
   * the pills container above the "+N" marker.
   */
  default(): unknown;
}>();

function onPointerdown(e: PointerEvent) {
  if (props.placeholder) return;
  emit('cellPointerdown', e, props.day);
}
function onDblclick(e: MouseEvent) {
  if (props.placeholder) return;
  emit('cellDblclick', e, props.day);
}
function onOverflowClick(e: MouseEvent) {
  emit('overflowClick', e, props.day);
}
</script>

<template>
  <div
    class="coar-month-cell"
    :class="{
      'coar-month-cell--today': isToday,
      'coar-month-cell--other-month': isOtherMonth,
      'coar-month-cell--weekend': isWeekend,
      'coar-month-cell--placeholder': placeholder,
      'coar-month-cell--density-compact': density === 'compact',
    }"
    :data-day-key="dayKey"
    :data-placeholder="placeholder ? 'true' : undefined"
    role="gridcell"
    :aria-rowindex="ariaRowIndex"
    :aria-colindex="ariaColIndex"
    :aria-label="ariaLabel"
    :aria-current="isToday ? 'date' : undefined"
    :aria-hidden="placeholder ? 'true' : undefined"
    @pointerdown="onPointerdown"
    @dblclick="onDblclick"
  >
    <div v-if="!placeholder" class="coar-month-cell__day-number-row">
      <span class="coar-month-cell__day-number">{{ day.day }}</span>
    </div>

    <!-- Pills area: the capped single-day events for this cell,
         offset below the row's multi-day bars, followed by one
         stable "+N" row for whatever the parent folded away. The
         row is a button: it opens the day sheet with every event
         of the day (drag-enabled), and stops pointerdown so it is
         not also an `onDateClick`. -->
    <div
      v-if="!placeholder"
      class="coar-month-cell__pills"
      :style="{ marginTop: pillsMarginTopPx + 'px' }"
    >
      <slot />
      <button
        v-if="overflowCount > 0"
        type="button"
        class="coar-month-cell__overflow"
        :aria-label="overflowLabel"
        aria-haspopup="dialog"
        :aria-expanded="overlayOpen ? 'true' : 'false'"
        @pointerdown.stop
        @dblclick.stop
        @click.stop="onOverflowClick"
      >
        +{{ overflowCount }}
      </button>
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
     child can't shrink past its content's intrinsic size and the
     row's fixed height would be overruled by a full cell. */
  min-height: 0;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  background: var(--coar-calendar-bg, #fff);
  contain: layout paint;
}
.coar-month-cell:first-child {
  border-left: none;
}
.coar-month-cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-month-cell--other-month {
  background: var(--coar-calendar-bg-other-month, #fafafb);
  color: var(--coar-text-subtle, #9ca3af);
}
.coar-month-cell--placeholder {
  background: var(--coar-calendar-bg, #fff);
  cursor: default;
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
  color: var(--coar-color-accent, var(--coar-color-accent-500, #2563eb));
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
   * room inside the clipped container. Bottom padding is part of
   * the original visual spacing inside the cell. */
  padding: 3px 4px 4px 4px;
  /* margin-top is set inline based on the row's bar count, so the
     pills sit BELOW the multi-day bars no matter how many lanes
     are above. */
  /* Take the remaining space inside the cell. The parent caps the
     pills so the list fits by construction; `overflow: hidden`
     only guards custom `#pill` slots taller than the row budget. */
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

/* "+N" button — same type and line box as a Details pill, in the
 * subtle text colour, no background at rest (the iOS `+N` row);
 * hover / focus / open reveal it as a control. */
.coar-month-cell__overflow {
  flex: 0 0 auto;
  align-self: flex-start;
  padding: 1px 6px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  font: inherit;
  font-size: var(--coar-font-size-xs, 11px);
  font-weight: 600;
  line-height: 16px;
  color: var(--coar-text-subtle, #6c7280);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.coar-month-cell__overflow:hover,
.coar-month-cell__overflow:focus-visible,
.coar-month-cell__overflow[aria-expanded='true'] {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  color: var(--coar-text-base, #1a1c1f);
}
.coar-month-cell__overflow:focus-visible {
  outline: 2px solid var(--coar-color-focus, #2563eb);
  outline-offset: 1px;
}
.coar-month-cell--density-compact .coar-month-cell__overflow {
  font-size: 10px;
  padding: 0 4px;
}
</style>
