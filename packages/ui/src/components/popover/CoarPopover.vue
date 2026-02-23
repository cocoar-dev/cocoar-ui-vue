<script setup lang="ts">
import {
  ref,
  nextTick,
  onBeforeUnmount,
  watch,
  type PropType,
} from 'vue';
import { computeOverlayCoordinates } from '../overlay/overlay-position';
import type { Placement } from '../overlay/overlay-types';

export type PopoverMode = 'hover' | 'click' | 'both';

const props = defineProps({
  /** Trigger mode: 'hover', 'click', or 'both'. Default: 'hover' */
  mode: { type: String as PropType<PopoverMode>, default: 'hover' },
  /** Whether the popover is disabled. */
  disabled: { type: Boolean, default: false },
  /** Whether the panel receives pointer events. Default: true */
  interactive: { type: Boolean, default: true },
  /** Offset from trigger in px. */
  offset: { type: Number, default: 6 },
});

const isOpen = ref(false);
const pinnedByClick = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const panelStyle = ref<Record<string, string>>({
  position: 'fixed',
  top: '0px',
  left: '0px',
  opacity: '0',
});
const currentPlacement = ref<Placement>('bottom');

let hoveringTrigger = false;
let hoveringPanel = false;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let scrollParents: Element[] = [];
let resizeObserver: ResizeObserver | null = null;

const HOVER_CLOSE_DELAY = 80;

const FALLBACKS: readonly Placement[] = ['bottom', 'top', 'right', 'left'];

// --- helpers ---

function position() {
  const trigger = triggerRef.value;
  const panel = panelRef.value;
  if (!trigger || !panel) return;

  const anchorRect = trigger.getBoundingClientRect();
  const overlaySize = { width: panel.offsetWidth, height: panel.offsetHeight };
  const viewport = { width: window.innerWidth, height: window.innerHeight };

  const result = computeOverlayCoordinates(
    anchorRect,
    overlaySize,
    { placement: FALLBACKS, offset: props.offset, flip: false, shift: true },
    viewport,
  );

  currentPlacement.value = result.placement;
  panelStyle.value = {
    position: 'fixed',
    top: `${result.top}px`,
    left: `${result.left}px`,
    opacity: '1',
  };
}

function open(source: 'hover' | 'click') {
  if (props.disabled) return;
  if (isOpen.value) {
    if (source === 'click') pinnedByClick.value = true;
    return;
  }

  if (source === 'click') {
    pinnedByClick.value = true;
  } else {
    pinnedByClick.value = false;
  }

  isOpen.value = true;

  nextTick(() => {
    position();
    addScrollListeners();
  });
}

function close() {
  if (!isOpen.value) return;
  isOpen.value = false;
  pinnedByClick.value = false;
  clearCloseTimer();
  removeScrollListeners();
  panelStyle.value = { ...panelStyle.value, opacity: '0' };
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function scheduleHoverClose() {
  clearCloseTimer();
  closeTimer = setTimeout(() => {
    if (pinnedByClick.value) return;
    if (hoveringTrigger || hoveringPanel) return;
    close();
  }, HOVER_CLOSE_DELAY);
}

// --- scroll/resize repositioning ---

function onReposition() {
  if (isOpen.value) position();
}

function addScrollListeners() {
  const trigger = triggerRef.value;
  if (!trigger) return;

  let el: Element | null = trigger;
  while (el) {
    if (
      el.scrollHeight > el.clientHeight ||
      el.scrollWidth > el.clientWidth
    ) {
      scrollParents.push(el);
      el.addEventListener('scroll', onReposition, { passive: true });
    }
    el = el.parentElement;
  }
  window.addEventListener('scroll', onReposition, { passive: true });
  window.addEventListener('resize', onReposition, { passive: true });

  resizeObserver = new ResizeObserver(onReposition);
  if (panelRef.value) resizeObserver.observe(panelRef.value);
}

function removeScrollListeners() {
  for (const el of scrollParents) {
    el.removeEventListener('scroll', onReposition);
  }
  scrollParents = [];
  window.removeEventListener('scroll', onReposition);
  window.removeEventListener('resize', onReposition);
  resizeObserver?.disconnect();
  resizeObserver = null;
}

// --- event handlers ---

function canHover() {
  return props.mode === 'hover' || props.mode === 'both';
}

function canClick() {
  return props.mode === 'click' || props.mode === 'both';
}

function onTriggerMouseEnter() {
  if (!canHover()) return;
  hoveringTrigger = true;
  clearCloseTimer();
  open('hover');
}

function onTriggerMouseLeave() {
  if (!canHover()) return;
  if (pinnedByClick.value) return;
  hoveringTrigger = false;
  scheduleHoverClose();
}

function onPanelMouseEnter() {
  if (!canHover()) return;
  hoveringPanel = true;
  clearCloseTimer();
}

function onPanelMouseLeave() {
  if (!canHover()) return;
  if (pinnedByClick.value) return;
  hoveringPanel = false;
  scheduleHoverClose();
}

function onTriggerFocusIn() {
  if (!canHover()) return;
  open('hover');
}

function onFocusOut(event: FocusEvent) {
  if (pinnedByClick.value) return;
  const next = event.relatedTarget as Node | null;
  if (next && triggerRef.value?.contains(next)) return;
  if (next && panelRef.value?.contains(next)) return;
  close();
}

function onTriggerClick(event: MouseEvent) {
  if (!canClick()) return;
  if (props.disabled) return;
  event.stopPropagation();

  if (!isOpen.value) {
    open('click');
    return;
  }

  if (!pinnedByClick.value) {
    pinnedByClick.value = true;
    return;
  }

  close();
}

// --- global listeners ---

function onDocumentClick(event: MouseEvent) {
  if (!isOpen.value || !pinnedByClick.value) return;
  const target = event.target as Node | null;
  if (!target) return;
  if (triggerRef.value?.contains(target)) return;
  if (panelRef.value?.contains(target)) return;
  close();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    close();
  }
}

document.addEventListener('click', onDocumentClick);
document.addEventListener('keydown', onKeydown);

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close();
  },
);

onBeforeUnmount(() => {
  close();
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div
    class="coar-popover"
    @mouseenter="onTriggerMouseEnter"
    @mouseleave="onTriggerMouseLeave"
    @focusin="onTriggerFocusIn"
    @focusout="onFocusOut"
  >
    <span
      ref="triggerRef"
      class="coar-popover-trigger"
      @click="onTriggerClick"
    >
      <slot />
    </span>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="coar-popover-panel"
        :style="panelStyle"
        :data-placement="currentPlacement"
        role="tooltip"
        :class="{ 'coar-popover-panel--non-interactive': !interactive }"
        @mouseenter="onPanelMouseEnter"
        @mouseleave="onPanelMouseLeave"
        @focusin="onPanelMouseEnter"
        @focusout="onFocusOut"
      >
        <div class="coar-popover-content">
          <slot name="content" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.coar-popover {
  display: inline-block;
}

.coar-popover-trigger {
  display: inline-block;
  cursor: pointer;
}

.coar-popover-panel {
  z-index: var(--coar-z-overlay, 1000);
  padding: var(--coar-spacing-s);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m, 0 4px 16px rgba(0, 0, 0, 0.1));
  min-width: var(--coar-popover-min-width, 200px);
  max-width: var(--coar-popover-max-width, 360px);
  pointer-events: auto;
  transition: opacity 150ms ease;
}

.coar-popover-panel--non-interactive {
  pointer-events: none;
}

.coar-popover-content {
  max-height: var(--coar-popover-max-height, 240px);
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
