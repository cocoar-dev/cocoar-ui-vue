<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarTimeGridAllDayBar>` — internal presentational component
 * for one all-day bar in the time-grid's all-day band.
 *
 * Same four-variant model as `<CoarTimeGridEvent>`. Resize
 * handles live on the LEFT/RIGHT edges (vs top/bottom for
 * timed events) — they shift `start` / `end` date.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { CalendarEvent, AllDayBar } from '../../../core';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = withDefaults(
  defineProps<{
    event: CalendarEvent<TMeta>;
    bar: AllDayBar<TMeta>;
    variant?: 'live' | 'preview' | 'phantom' | 'invalid';
    bg: string;
    border: string;
    title: string;
    ariaLabel?: string;
    snappingBack?: boolean;
    density?: 'comfortable' | 'compact' | 'spacious';

    top: number;
    left: string;
    width: string;
    height: number;
    zIndex: number;

    clippedStart?: boolean;
    clippedEnd?: boolean;
    /**
     * `true` when the `preview` variant is being driven by an
     * in-flight keyboard drag. See `CoarTimeGridEvent` for rationale.
     */
    kbdActive?: boolean;
  }>(),
  {
    variant: 'live',
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
  default(props: { event: CalendarEvent<TMeta>; bar: AllDayBar<TMeta> }): unknown;
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
    class="coar-time-grid-all-day-bar"
    :class="{
      'coar-time-grid-all-day-bar--clipped-start': clippedStart,
      'coar-time-grid-all-day-bar--clipped-end': clippedEnd,
      'coar-time-grid-all-day-bar--ghost': variant === 'preview',
      'coar-time-grid-all-day-bar--source-phantom': variant === 'phantom',
      'coar-time-grid-all-day-bar--invalid': variant === 'invalid',
      'coar-time-grid-all-day-bar--snap-back': variant === 'invalid' && snappingBack,
      'coar-time-grid-all-day-bar--density-compact': density === 'compact',
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
      class="coar-time-grid-all-day-bar__resize coar-time-grid-all-day-bar__resize--start"
      aria-hidden="true"
      @pointerdown="onStartResize"
    />
    <slot v-if="useCustomSlot" :event="event" :bar="bar">
      <span class="coar-time-grid-all-day-bar__title">{{ title }}</span>
    </slot>
    <span v-else class="coar-time-grid-all-day-bar__title">{{ title }}</span>
    <div
      v-if="showEndHandle"
      class="coar-time-grid-all-day-bar__resize coar-time-grid-all-day-bar__resize--end"
      aria-hidden="true"
      @pointerdown="onEndResize"
    />
  </div>
</template>

<style scoped>
.coar-time-grid-all-day-bar {
  position: absolute;
  box-sizing: border-box;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: var(--coar-font-size-xs, 11px);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  touch-action: none;
  display: flex;
  align-items: center;
  contain: layout paint;
}
.coar-time-grid-all-day-bar--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-time-grid-all-day-bar--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.coar-time-grid-all-day-bar:focus {
  outline: 2px solid var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
}
.coar-time-grid-all-day-bar--ghost {
  pointer-events: none;
  outline: 2px dashed var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.coar-time-grid-all-day-bar--source-phantom {
  opacity: 0.4;
  pointer-events: none;
  cursor: grabbing;
}
.coar-time-grid-all-day-bar--invalid {
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
.coar-time-grid-all-day-bar--snap-back {
  animation: coar-time-grid-all-day-bar-snap-back 220ms ease-out forwards;
}
@keyframes coar-time-grid-all-day-bar-snap-back {
  0%   { opacity: 0.7; transform: scale(1); }
  100% { opacity: 0;   transform: scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .coar-time-grid-all-day-bar--snap-back { animation: none; opacity: 0; }
}

.coar-time-grid-all-day-bar__title {
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
}

.coar-time-grid-all-day-bar__resize {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  user-select: none;
  pointer-events: auto;
  z-index: 2;
}
.coar-time-grid-all-day-bar__resize--start { left: 0; }
.coar-time-grid-all-day-bar__resize--end { right: 0; }

/* Density */
.coar-time-grid-all-day-bar--density-compact {
  font-size: 10px;
  padding: 0 4px;
}
</style>
