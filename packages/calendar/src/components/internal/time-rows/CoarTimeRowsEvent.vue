<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarTimeRowsEvent>` — one timed event card in a day row of the
 * horizontal time grid: wide and short, time running left → right.
 *
 * Same four `variant`s as `<CoarTimeGridEvent>` (`live`, `preview`,
 * `phantom`, `invalid`); resize handles sit on the LEFT (start) and
 * RIGHT (end) edges. The built-in content is the title, plus the time
 * when the card is wide enough (`showTime`, decided by the parent from
 * the pixel width). Point events (no `end`) draw a solid start edge
 * and a translucent body, like the vertical card.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { CalendarEvent, PositionedEvent } from '../../../core';
import CoarEventDecorations from '../CoarEventDecorations.vue';
import CoarEventAssignees from '../CoarEventAssignees.vue';
import { eventTextColor } from '../../../core/eventTextContrast';

const props = withDefaults(
  defineProps<{
    event: CalendarEvent<TMeta>;
    positioned: PositionedEvent<TMeta>;
    variant?: 'live' | 'preview' | 'phantom' | 'invalid';
    bg: string;
    ink?: string;
    border: string;
    title: string;
    /** Localised "start – end"; shown when `showTime`. */
    timeLabel?: string;
    showTime?: boolean;
    displayZone?: string;
    ariaLabel?: string;
    snappingBack?: boolean;
    density?: 'comfortable' | 'compact' | 'spacious';
    /** Pixel offset from the row's left edge (time axis). */
    left: number;
    /** Pixel width (duration). */
    width: number;
    /** Pixel offset from the row's top edge (lane). */
    top: number;
    /** Pixel height (one lane). */
    height: number;
    zIndex: number;
    /** Starts before the visible range / before midnight. */
    clippedStart?: boolean;
    /** Ends after the visible range / after midnight. */
    clippedEnd?: boolean;
    /** The preview driven by an in-flight keyboard drag stays focusable. */
    kbdActive?: boolean;
  }>(),
  {
    variant: 'live',
    ink: undefined,
    timeLabel: undefined,
    showTime: false,
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
  pointerdown: [native: PointerEvent];
  keydown: [native: KeyboardEvent];
  dblclick: [native: MouseEvent];
  startResize: [native: PointerEvent];
  endResize: [native: PointerEvent];
}>();

defineSlots<{
  default(props: { event: CalendarEvent<TMeta>; positioned: PositionedEvent<TMeta> }): unknown;
}>();

const isInteractive = computed(
  () => props.variant === 'live' || (props.variant === 'preview' && props.kbdActive),
);
const isPoint = computed(() => props.event.end == null);
const useCustomSlot = computed(() => props.variant === 'live' || props.variant === 'preview');
const eventInk = computed(() => props.ink ?? eventTextColor(props.bg));

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
    class="coar-time-rows-event"
    :class="{
      'coar-time-rows-event--clipped-start': clippedStart,
      'coar-time-rows-event--clipped-end': clippedEnd,
      'coar-time-rows-event--ghost': variant === 'preview',
      'coar-time-rows-event--source-phantom': variant === 'phantom',
      'coar-time-rows-event--invalid': variant === 'invalid',
      'coar-time-rows-event--snap-back': variant === 'invalid' && snappingBack,
      'coar-time-rows-event--density-compact': density === 'compact',
      'coar-time-rows-event--point': isPoint,
    }"
    :style="{
      left: left + 'px',
      width: width + 'px',
      top: top + 'px',
      height: height + 'px',
      zIndex,
      '--event-bg': bg,
      '--event-border': border,
      '--event-ink': eventInk,
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
      v-if="isPoint && !clippedStart"
      class="coar-time-rows-event__point-edge"
      aria-hidden="true"
    />
    <div
      v-if="isInteractive && !isPoint"
      class="coar-time-rows-event__resize coar-time-rows-event__resize--start"
      aria-hidden="true"
      @pointerdown="onStartResize"
    />
    <slot v-if="useCustomSlot" :event="event" :positioned="positioned">
      <div class="coar-time-rows-event__default">
        <CoarEventDecorations :event="event" :display-zone="displayZone" size="s" />
        <span class="coar-time-rows-event__title">{{ title }}</span>
        <span v-if="showTime && timeLabel" class="coar-time-rows-event__time">{{ timeLabel }}</span>
        <CoarEventAssignees :event="event" :max="2" size="xs" />
      </div>
    </slot>
    <div v-else class="coar-time-rows-event__default">
      <span class="coar-time-rows-event__title">{{ title }}</span>
    </div>
    <div
      v-if="isInteractive && !isPoint"
      class="coar-time-rows-event__resize coar-time-rows-event__resize--end"
      aria-hidden="true"
      @pointerdown="onEndResize"
    />
  </div>
</template>

<style scoped>
.coar-time-rows-event {
  position: absolute;
  box-sizing: border-box;
  border-radius: 3px;
  font-size: var(--coar-font-size-xs, 11px);
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  /* As in the vertical grid: touch on an event is a drag. */
  touch-action: none;
  contain: layout paint;
  background: var(--event-bg);
  border-left: 3px solid var(--event-border);
}
.coar-time-rows-event--point {
  background: color-mix(
    in srgb,
    var(--event-bg) calc(var(--coar-calendar-point-body-opacity, 0.38) * 100%),
    transparent
  );
  border-left-color: color-mix(
    in srgb,
    var(--event-border) calc(var(--coar-calendar-point-body-opacity, 0.38) * 100%),
    transparent
  );
}
.coar-time-rows-event--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-time-rows-event--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.coar-time-rows-event:focus {
  outline: 2px solid var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
}
.coar-time-rows-event--ghost {
  pointer-events: none;
  outline: 2px dashed var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.coar-time-rows-event--source-phantom {
  opacity: 0.4;
  pointer-events: none;
}
.coar-time-rows-event--invalid {
  pointer-events: none;
  cursor: not-allowed;
  opacity: 0.7;
  outline: 2px dashed var(--coar-color-danger, #dc2626);
  outline-offset: 1px;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(220, 38, 38, 0.18) 0,
    rgba(220, 38, 38, 0.18) 6px,
    transparent 6px,
    transparent 12px
  );
}
.coar-time-rows-event--snap-back {
  animation: coar-time-rows-event-snap-back 220ms ease-out forwards;
}
@keyframes coar-time-rows-event-snap-back {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .coar-time-rows-event--snap-back {
    animation: none;
    opacity: 0;
  }
}
.coar-time-rows-event__default {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 6px;
  min-width: 0;
}
/* The title wins: it keeps its width (up to the card's), the time
   takes what is left and fades out first on a narrow card. */
.coar-time-rows-event__title {
  flex: 0 0 auto;
  max-width: 100%;
  color: var(--event-ink, var(--coar-text-base, #1a1c1f));
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.coar-time-rows-event__time {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--event-ink, var(--coar-text-base, #1a1c1f));
  opacity: 0.8;
  font-size: 10px;
  white-space: nowrap;
}
.coar-time-rows-event__point-edge {
  background: var(--event-border);
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--coar-calendar-point-edge-height, 3px);
  pointer-events: none;
  z-index: 1;
}
/* Resize handles — left edge for start, right edge for end. */
.coar-time-rows-event__resize {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  user-select: none;
  pointer-events: auto;
  z-index: 2;
}
.coar-time-rows-event__resize--start {
  left: 0;
}
.coar-time-rows-event__resize--end {
  right: 0;
}
.coar-time-rows-event--density-compact {
  font-size: 10px;
}
.coar-time-rows-event--density-compact .coar-time-rows-event__default {
  padding: 0 4px;
}
</style>
