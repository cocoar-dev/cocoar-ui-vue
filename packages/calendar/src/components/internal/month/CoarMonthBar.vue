<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarMonthBar>` — internal presentational component for a
 * multi-day bar in the month grid.
 *
 * One component, four `variant`s, mirroring `CoarMonthPill`:
 *
 *   - `live`     interactive (focusable, drag-startable, resize handles)
 *   - `preview`  the dnd ghost (dashed halo, pointer-events none)
 *   - `phantom`  source phantom at the original col-range during a drag
 *   - `invalid`  red dashed + diagonal stripes, played back on
 *                snap-back when `snappingBack` is `true`
 *
 * Resize handles (`startResize` / `endResize` events) only emit for
 * `variant: 'live'`. Clipped sides hide the corresponding handle —
 * resizing from off-month start/end has no visible meaning here.
 *
 * Positioning (top / left / width) is computed by the row layer
 * and passed in as discrete props; the bar itself is just an
 * absolute-positioned box.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { CalendarEvent, MonthMultiDayBar } from '../../../core';
import CoarEventDecorations from '../CoarEventDecorations.vue';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = withDefaults(
  defineProps<{
    event: CalendarEvent<TMeta>;
    bar: MonthMultiDayBar<TMeta>;
    variant?: 'live' | 'preview' | 'phantom' | 'invalid';
    bg: string;
    border: string;
    title: string;
    /** Display zone — surfaced on the default decoration layer (C3/C5 hints). */
    displayZone?: string;
    ariaLabel?: string;
    snappingBack?: boolean;
    density?: 'comfortable' | 'compact' | 'spacious';

    /** Pixel offset from the row's top edge. */
    top: number;
    /** CSS `left` (typically a `calc(...)` percentage expression). */
    left: string;
    /** CSS `width` (typically a `calc(...)` percentage expression). */
    width: string;
    /** Pixel height. */
    height: number;
    /** Stacking order; preview gets bumped to 100 by the parent. */
    zIndex: number;

    /** Bar is clipped at the start (off-month or at the row edge). */
    clippedStart?: boolean;
    /** Bar is clipped at the end (off-month or at the row edge). */
    clippedEnd?: boolean;
    /**
     * `true` when the `preview` variant is being driven by an
     * in-flight keyboard drag.
     */
    kbdActive?: boolean;
  }>(),
  {
    variant: 'live',
    displayZone: undefined,
    ariaLabel: undefined,
    snappingBack: false,
    density: 'comfortable',
    clippedStart: false,
    clippedEnd: false,
    kbdActive: false,
  },
);

const emit = defineEmits<{
  /** Pointer-down on the bar body (live only). Parent starts the move drag. */
  pointerdown: [native: PointerEvent];
  keydown: [native: KeyboardEvent];
  dblclick: [native: MouseEvent];
  /** Pointer-down on the start (left) resize handle (live only). */
  startResize: [native: PointerEvent];
  /** Pointer-down on the end (right) resize handle (live only). */
  endResize: [native: PointerEvent];
}>();

defineSlots<{
  default(props: { event: CalendarEvent<TMeta>; bar: MonthMultiDayBar<TMeta> }): unknown;
}>();

const isInteractive = computed(
  () =>
    props.variant === 'live' ||
    (props.variant === 'preview' && props.kbdActive),
);
const useCustomSlot = computed(
  () => props.variant === 'live' || props.variant === 'preview',
);
const showStartHandle = computed(
  () => isInteractive.value && !props.clippedStart,
);
const showEndHandle = computed(
  () => isInteractive.value && !props.clippedEnd,
);

const borderLeft = computed(() =>
  props.clippedStart ? 'none' : `3px solid ${props.border}`,
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
function onStartResize(e: PointerEvent) {
  e.stopPropagation();
  emit('startResize', e);
}
function onEndResize(e: PointerEvent) {
  e.stopPropagation();
  emit('endResize', e);
}
</script>

<template>
  <div
    class="coar-month-bar"
    :class="{
      'coar-month-bar--clipped-start': clippedStart,
      'coar-month-bar--clipped-end': clippedEnd,
      'coar-month-bar--ghost': variant === 'preview',
      'coar-month-bar--source-phantom': variant === 'phantom',
      'coar-month-bar--invalid': variant === 'invalid',
      'coar-month-bar--snap-back': variant === 'invalid' && snappingBack,
      'coar-month-bar--density-compact': density === 'compact',
    }"
    :style="{
      top: top + 'px',
      left,
      width,
      height: height + 'px',
      background: bg,
      borderLeft,
      zIndex,
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
    <div
      v-if="showStartHandle"
      class="coar-month-bar__resize coar-month-bar__resize--start"
      aria-hidden="true"
      @pointerdown="onStartResize"
    />
    <slot v-if="useCustomSlot" :event="event" :bar="bar">
      <CoarEventDecorations
        v-if="!clippedStart"
        :event="event"
        :display-zone="displayZone"
        size="xs"
      />
      <span class="coar-month-bar__title">{{ title }}</span>
    </slot>
    <template v-else>
      <CoarEventDecorations
        v-if="!clippedStart"
        :event="event"
        :display-zone="displayZone"
        size="xs"
      />
      <span class="coar-month-bar__title">{{ title }}</span>
    </template>
    <div
      v-if="showEndHandle"
      class="coar-month-bar__resize coar-month-bar__resize--end"
      aria-hidden="true"
      @pointerdown="onEndResize"
    />
  </div>
</template>

<style scoped>
.coar-month-bar {
  position: absolute;
  box-sizing: border-box;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: var(--coar-font-size-xs, 11px);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  /* Touch on a multi-day bar is always a drag. */
  touch-action: none;
  display: flex;
  align-items: center;
  contain: layout paint;
}
.coar-month-bar--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-month-bar--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.coar-month-bar:focus {
  outline: 2px solid var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
}
.coar-month-bar--ghost {
  pointer-events: none;
  outline: 2px dashed var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.coar-month-bar--source-phantom {
  opacity: 0.4;
  pointer-events: none;
  cursor: grabbing;
}
.coar-month-bar--invalid {
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

.coar-month-bar__title {
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Resize handles — left edge for start, right edge for end. */
.coar-month-bar__resize {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  user-select: none;
  pointer-events: auto;
  z-index: 2;
}
.coar-month-bar__resize--start { left: 0; }
.coar-month-bar__resize--end { right: 0; }

.coar-month-bar--snap-back {
  animation: coar-month-bar-snap-back 220ms ease-out forwards;
}
@keyframes coar-month-bar-snap-back {
  0%   { opacity: 0.7; transform: scale(1); }
  100% { opacity: 0;   transform: scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .coar-month-bar--snap-back { animation: none; opacity: 0; }
}

/* Density */
.coar-month-bar--density-compact {
  font-size: 10px;
  padding: 0 4px;
}
</style>
