<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarMonthPill>` — internal presentational component for a
 * single-day pill in the month grid.
 *
 * One component, four `variant`s:
 *
 *   - `live`     interactive (focusable, drag-startable, double-click)
 *   - `preview`  the dnd ghost (dashed halo, pointer-events none)
 *   - `phantom`  source phantom at the original cell during a drag
 *   - `invalid`  red dashed + diagonal stripes, played back on
 *                snap-back when `snappingBack` is `true`
 *
 * The component is purely presentational: it owns no dnd state, no
 * layout, no aria-label computation. The parent passes background,
 * border, title and (for live) an aria-label. Events fire only for
 * `variant: 'live'`.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { CalendarEvent, MonthCellPill } from '../../../core';
import CoarEventDecorations from '../CoarEventDecorations.vue';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = withDefaults(
  defineProps<{
    event: CalendarEvent<TMeta>;
    pill: MonthCellPill<TMeta>;
    variant?: 'live' | 'preview' | 'phantom' | 'invalid';
    bg: string;
    border: string;
    title: string;
    /** Display zone — surfaced on the default decoration layer (C3/C5 hints). */
    displayZone?: string;
    /** Required for `live`; ignored otherwise. */
    ariaLabel?: string;
    /** Apply the snap-back exit animation (invalid variant only). */
    snappingBack?: boolean;
    /**
     * Visual density. The compact rule has to live HERE (not on the
     * parent month-view) — Vue's scoped CSS won't let a parent
     * descendant selector reach into the child's scope.
     */
    density?: 'comfortable' | 'compact' | 'spacious';
    /**
     * `true` when the `preview` variant is being driven by an
     * in-flight keyboard drag. Promotes the ghost from a passive
     * visual to a focusable interactive element so subsequent
     * arrow keystrokes keep landing on `keydown`.
     */
    kbdActive?: boolean;
  }>(),
  {
    variant: 'live',
    displayZone: undefined,
    ariaLabel: undefined,
    snappingBack: false,
    density: 'comfortable',
    kbdActive: false,
  },
);

const emit = defineEmits<{
  /** Pointer-down on the pill body (live only). Parent starts the drag. */
  pointerdown: [native: PointerEvent];
  /** Keyboard event on a focused pill (live only). */
  keydown: [native: KeyboardEvent];
  /** Double-click on the pill (live only). */
  dblclick: [native: MouseEvent];
}>();

defineSlots<{
  /**
   * Render custom pill content. Receives `event` + `pill` so the
   * consumer can do whatever it wants with the layout payload. The
   * default fallback renders the bare `title`. Slot is only invoked
   * for `live` and `preview` — phantom / invalid use the bare
   * title to keep their visuals consistent across consumers.
   */
  default(props: { event: CalendarEvent<TMeta>; pill: MonthCellPill<TMeta> }): unknown;
}>();

const isInteractive = computed(
  () =>
    props.variant === 'live' ||
    (props.variant === 'preview' && props.kbdActive),
);
const useCustomSlot = computed(
  () => props.variant === 'live' || props.variant === 'preview',
);

function onPointerdown(e: PointerEvent) {
  if (!isInteractive.value) return;
  emit('pointerdown', e);
}
function onKeydown(e: KeyboardEvent) {
  if (!isInteractive.value) return;
  emit('keydown', e);
}
function onDblclick(e: MouseEvent) {
  if (!isInteractive.value) return;
  e.stopPropagation();
  emit('dblclick', e);
}
</script>

<template>
  <div
    class="coar-month-pill"
    :class="{
      'coar-month-pill--ghost': variant === 'preview',
      'coar-month-pill--source-phantom': variant === 'phantom',
      'coar-month-pill--invalid': variant === 'invalid',
      'coar-month-pill--snap-back': variant === 'invalid' && snappingBack,
      'coar-month-pill--density-compact': density === 'compact',
    }"
    :style="{
      background: bg,
      borderLeft: `3px solid ${border}`,
    }"
    :data-event-id="isInteractive ? event.id : undefined"
    :tabindex="isInteractive ? 0 : -1"
    :role="isInteractive ? 'button' : undefined"
    :aria-label="isInteractive ? ariaLabel : undefined"
    :aria-hidden="isInteractive ? undefined : 'true'"
    @pointerdown="onPointerdown"
    @keydown="onKeydown"
    @dblclick="onDblclick"
  >
    <slot v-if="useCustomSlot" :event="event" :pill="pill">
      <CoarEventDecorations :event="event" :display-zone="displayZone" size="xs" />
      <span class="coar-month-pill__title">{{ title }}</span>
    </slot>
    <template v-else>
      <CoarEventDecorations :event="event" :display-zone="displayZone" size="xs" />
      <span class="coar-month-pill__title">{{ title }}</span>
    </template>
  </div>
</template>

<style scoped>
.coar-month-pill {
  font-size: var(--coar-font-size-xs, 11px);
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  display: flex;
  align-items: center;
  min-width: 0;
  /* Touch on a pill is always a drag — empty cell area still
     allows native scroll for the page. */
  touch-action: none;
  /* Don't shrink in the cell's flex column. Without this the
     pills compress to fit instead of overflowing the pills
     container, and `overflow-y: auto` never engages. */
  flex: 0 0 auto;
}
/* Use `:focus` (not `:focus-visible`) so the ring shows after a
 * mouse click as well — without it, the user sees no feedback
 * that the event has been "picked up" for keyboard moves until
 * they press a key. */
.coar-month-pill:focus {
  outline: 2px solid var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
}
.coar-month-pill--ghost {
  pointer-events: none;
  outline: 2px dashed var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.coar-month-pill--source-phantom {
  opacity: 0.4;
  pointer-events: none;
  cursor: grabbing;
}
.coar-month-pill--invalid {
  pointer-events: none;
  cursor: not-allowed;
  opacity: 0.7;
  outline: 2px dashed var(--coar-color-danger, #dc2626);
  outline-offset: 1px;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);
  background-image:
    repeating-linear-gradient(
      45deg,
      rgba(220, 38, 38, 0.18) 0,
      rgba(220, 38, 38, 0.18) 6px,
      transparent 6px,
      transparent 12px
    );
}
.coar-month-pill__title {
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Snap-back exit: matches CoarTimeGrid's animation. */
.coar-month-pill--snap-back {
  animation: coar-month-pill-snap-back 220ms ease-out forwards;
}
@keyframes coar-month-pill-snap-back {
  0%   { opacity: 0.7; transform: scale(1); }
  100% { opacity: 0;   transform: scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .coar-month-pill--snap-back { animation: none; opacity: 0; }
}

/* Density */
.coar-month-pill--density-compact {
  font-size: 10px;
  padding: 0 4px;
}
</style>
