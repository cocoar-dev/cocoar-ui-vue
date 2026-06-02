<script setup lang="ts">
/**
 * Internal draggable divider shared by `CoarSplitPane` and `CoarPanelLayout`,
 * so every resize handle in the layout system looks and behaves identically.
 *
 * Renders a thin hairline inside a wider hit area. Drag (pointer) or arrow keys
 * adjust the bound `value` — the px size of the pane this handle controls.
 *
 * - `orientation` is the divider's own axis: a `'vertical'` divider sits
 *   between left/right panes and resizes width; a `'horizontal'` one sits
 *   between top/bottom panes and resizes height.
 * - `invert` flips the drag/arrow direction for handles that grow the pane
 *   AFTER them (a right sidebar, a bottom panel) instead of before them.
 *
 * Pointer move/up are bound on `window` (not via pointer capture alone) so the
 * drag keeps tracking when the cursor leaves the thin strip — and so it works
 * in environments without `setPointerCapture`.
 */
import { computed, onScopeDispose, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    orientation: 'vertical' | 'horizontal';
    value: number;
    min?: number;
    max?: number;
    invert?: boolean;
    /**
     * Px to keep for the REST of the container — the pane can never grow past
     * `containerExtent - reserve`. Lets a parent stop a drag before it crushes
     * sibling regions (e.g. a layout's content area). Default `0`.
     */
    reserve?: number;
    /** Arrow-key nudge, in px. */
    step?: number;
    ariaLabel?: string;
  }>(),
  {
    min: 0,
    max: Number.POSITIVE_INFINITY,
    invert: false,
    reserve: 0,
    step: 8,
    ariaLabel: 'Resize',
  },
);

const emit = defineEmits<{ 'update:value': [value: number] }>();

const rootEl = ref<HTMLElement | null>(null);
const dragging = ref(false);

/** Clamp to [min, max] and never beyond the container the divider lives in. */
function clamp(v: number): number {
  const parent = rootEl.value?.parentElement;
  const extent = parent
    ? props.orientation === 'vertical'
      ? parent.clientWidth
      : parent.clientHeight
    : 0;
  // `extent` is 0 in non-layout environments (tests) — fall back to props.max.
  const max = extent > 0 ? Math.min(props.max, extent - props.reserve) : props.max;
  return Math.max(props.min, Math.min(max, v));
}

let startPos = 0;
let startValue = 0;

function pointerCoord(e: PointerEvent): number {
  return props.orientation === 'vertical' ? e.clientX : e.clientY;
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return;
  // `preventDefault` stops text selection during the drag but also blocks the
  // default focus — focus explicitly so keyboard resize works after a click.
  e.preventDefault();
  rootEl.value?.focus();
  dragging.value = true;
  startPos = pointerCoord(e);
  startValue = props.value;
  try {
    rootEl.value?.setPointerCapture(e.pointerId);
  } catch {
    /* setPointerCapture unsupported — window listeners below still track. */
  }
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e: PointerEvent): void {
  let delta = pointerCoord(e) - startPos;
  if (props.invert) delta = -delta;
  emit('update:value', clamp(startValue + delta));
}

function onPointerUp(): void {
  dragging.value = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

// If the divider unmounts mid-drag (a parent toggles the region off), the
// window listeners would otherwise leak and fire into a torn-down component.
onScopeDispose(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});

// ARIA reports a value clamped to [min, max] so an out-of-bounds `value` prop
// never produces a spec-violating aria-valuenow. `valuetext` makes the bare px
// figure legible to assistive tech ("240px" rather than "240").
const ariaValue = computed(() => {
  const hi = Number.isFinite(props.max) ? props.max : props.value;
  return Math.round(Math.min(Math.max(props.value, props.min), hi));
});

function onKeydown(e: KeyboardEvent): void {
  const dec = props.orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp';
  const inc = props.orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';
  let next: number | null = null;
  if (e.key === dec) next = props.value + (props.invert ? props.step : -props.step);
  else if (e.key === inc) next = props.value + (props.invert ? -props.step : props.step);
  else if (e.key === 'Home') next = props.min;
  else if (e.key === 'End') next = props.max;
  if (next === null) return;
  e.preventDefault();
  emit('update:value', clamp(next));
}
</script>

<template>
  <div
    ref="rootEl"
    class="coar-pane-divider"
    :class="[`coar-pane-divider--${orientation}`, { 'coar-pane-divider--dragging': dragging }]"
    role="separator"
    :aria-orientation="orientation"
    :aria-valuenow="ariaValue"
    :aria-valuemin="min"
    :aria-valuemax="Number.isFinite(max) ? max : undefined"
    :aria-valuetext="`${ariaValue}px`"
    :aria-label="ariaLabel"
    tabindex="0"
    @pointerdown="onPointerDown"
    @keydown="onKeydown"
  />
</template>

<style scoped>
.coar-pane-divider {
  position: relative;
  flex: 0 0 auto;
  z-index: 1;
  background: transparent;
  outline: none;
  touch-action: none;
}
.coar-pane-divider--vertical {
  width: 6px;
  cursor: col-resize;
}
.coar-pane-divider--horizontal {
  height: 6px;
  cursor: row-resize;
}

/* Visible 1px hairline centered in the hit area. */
.coar-pane-divider::before {
  content: '';
  position: absolute;
  background: var(--coar-border-neutral-tertiary, #e2e8f0);
  transition: background var(--coar-duration-fast, 120ms) var(--coar-ease-out, ease);
}
.coar-pane-divider--vertical::before {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
}
.coar-pane-divider--horizontal::before {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
}
.coar-pane-divider:hover::before,
.coar-pane-divider:focus-visible::before,
.coar-pane-divider--dragging::before {
  background: var(--coar-color-accent, #3b82f6);
}
.coar-pane-divider--vertical:hover::before,
.coar-pane-divider--vertical:focus-visible::before,
.coar-pane-divider--vertical.coar-pane-divider--dragging::before {
  width: 2px;
}
.coar-pane-divider--horizontal:hover::before,
.coar-pane-divider--horizontal:focus-visible::before,
.coar-pane-divider--horizontal.coar-pane-divider--dragging::before {
  height: 2px;
}
</style>
