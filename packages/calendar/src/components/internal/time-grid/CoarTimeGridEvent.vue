<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarTimeGridEvent>` — internal presentational component for one
 * timed event card in the time-grid column.
 *
 * Four `variant`s, mirroring the month-view pieces:
 *
 *   - `live`     interactive (focusable, drag-startable, resize handles)
 *   - `preview`  the dnd ghost (dashed halo, pointer-events none)
 *   - `phantom`  source phantom at the original slot during a drag
 *   - `invalid`  red dashed + diagonal stripes, played back on
 *                snap-back when `snappingBack` is `true`
 *
 * Resize handles (`startResize` / `endResize` events) only emit for
 * `variant: 'live'`. The geometry (`top`, `height`, `left`, `width`,
 * `zIndex`) is computed by the parent column from `layoutDayEvents`.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { CalendarEvent, PositionedEvent } from '../../../core';
import CoarEventDecorations from '../CoarEventDecorations.vue';

interface Props {
  event: CalendarEvent<TMeta>;
  positioned: PositionedEvent<TMeta>;
  variant?: 'live' | 'preview' | 'phantom' | 'invalid';
  bg: string;
  border: string;
  title: string;
  /** Display zone — surfaced on the default decoration layer (C3/C5 hints). */
  displayZone?: string;
  ariaLabel?: string;
  snappingBack?: boolean;
  density?: 'comfortable' | 'compact';

  /** Pixel offset from the column's top edge. */
  top: number;
  /** Pixel height of the card. */
  height: number;
  /** CSS `left` (typically a `calc()` percentage expression). */
  left: string;
  /** CSS `width` (typically a `calc()` percentage expression). */
  width: string;
  /** Stacking order; preview gets bumped to 100 by the parent. */
  zIndex: number;

  clippedTop?: boolean;
  clippedBottom?: boolean;

  /**
   * `true` when the `preview` variant is being driven by an
   * IN-FLIGHT keyboard drag. Promotes the ghost from a passive
   * visual to a focusable interactive element so subsequent
   * arrow keystrokes keep landing on `keydown` (without this,
   * focus falls to `<body>` after the original event card
   * unmounts and the next arrow is dropped on the floor).
   *
   * No effect when variant is anything other than `preview`.
   */
  kbdActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'live',
  displayZone: undefined,
  ariaLabel: undefined,
  snappingBack: false,
  density: 'comfortable',
  clippedTop: false,
  clippedBottom: false,
  kbdActive: false,
});

const emit = defineEmits<{
  pointerdown: [native: PointerEvent];
  keydown: [native: KeyboardEvent];
  dblclick: [native: MouseEvent];
  startResize: [native: PointerEvent];
  endResize: [native: PointerEvent];
}>();

defineSlots<{
  default(props: {
    event: CalendarEvent<TMeta>;
    positioned: PositionedEvent<TMeta>;
  }): unknown;
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
    class="coar-time-grid-event"
    :class="{
      'coar-time-grid-event--clipped-top': clippedTop,
      'coar-time-grid-event--clipped-bottom': clippedBottom,
      'coar-time-grid-event--ghost': variant === 'preview',
      'coar-time-grid-event--source-phantom': variant === 'phantom',
      'coar-time-grid-event--invalid': variant === 'invalid',
      'coar-time-grid-event--snap-back': variant === 'invalid' && snappingBack,
      'coar-time-grid-event--density-compact': density === 'compact',
    }"
    :style="{
      top: top + 'px',
      height: height + 'px',
      left,
      width,
      zIndex,
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
    <div
      v-if="isInteractive"
      class="coar-time-grid-event__resize coar-time-grid-event__resize--top"
      aria-hidden="true"
      @pointerdown="onStartResize"
    />
    <slot v-if="useCustomSlot" :event="event" :positioned="positioned">
      <div class="coar-time-grid-event__default">
        <span class="coar-time-grid-event__title-row">
          <CoarEventDecorations :event="event" :display-zone="displayZone" size="s" />
          <span class="coar-time-grid-event__title">{{ title }}</span>
        </span>
      </div>
    </slot>
    <div v-else class="coar-time-grid-event__default">
      <span class="coar-time-grid-event__title-row">
        <CoarEventDecorations :event="event" :display-zone="displayZone" size="s" />
        <span class="coar-time-grid-event__title">{{ title }}</span>
      </span>
    </div>
    <div
      v-if="isInteractive"
      class="coar-time-grid-event__resize coar-time-grid-event__resize--bottom"
      aria-hidden="true"
      @pointerdown="onEndResize"
    />
  </div>
</template>

<style scoped>
.coar-time-grid-event {
  position: absolute;
  box-sizing: border-box;
  border-radius: 3px;
  font-size: var(--coar-font-size-xs, 11px);
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  /* Touch on a timed event is always a drag — empty grid slots
     still allow native scroll for the page. */
  touch-action: none;
  contain: layout paint;
}
.coar-time-grid-event--clipped-top {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.coar-time-grid-event--clipped-bottom {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
/* Use `:focus` (not `:focus-visible`) so the ring shows after a
 * mouse click as well — without it, the user sees no feedback
 * that the event has been "picked up" for keyboard moves until
 * they press a key. The 2 px outline matches the ghost halo. */
.coar-time-grid-event:focus {
  outline: 2px solid var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
}
.coar-time-grid-event--ghost {
  pointer-events: none;
  outline: 2px dashed var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.coar-time-grid-event--source-phantom {
  opacity: 0.4;
  pointer-events: none;
  cursor: grabbing;
}
.coar-time-grid-event--invalid {
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
.coar-time-grid-event--snap-back {
  animation: coar-time-grid-event-snap-back 220ms ease-out forwards;
}
@keyframes coar-time-grid-event-snap-back {
  0%   { opacity: 0.7; transform: scale(1); }
  100% { opacity: 0;   transform: scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .coar-time-grid-event--snap-back { animation: none; opacity: 0; }
}

.coar-time-grid-event__default {
  padding: 2px 6px;
  height: 100%;
}
.coar-time-grid-event__title-row {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
}
.coar-time-grid-event__title {
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* Resize handles — top edge for start, bottom edge for end. */
.coar-time-grid-event__resize {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  user-select: none;
  pointer-events: auto;
  z-index: 2;
}
.coar-time-grid-event__resize--top { top: 0; }
.coar-time-grid-event__resize--bottom { bottom: 0; }

/* Density */
.coar-time-grid-event--density-compact {
  font-size: 10px;
}
.coar-time-grid-event--density-compact .coar-time-grid-event__default {
  padding: 1px 4px;
}
</style>
