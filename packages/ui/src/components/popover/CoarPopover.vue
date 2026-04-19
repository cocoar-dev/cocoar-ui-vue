<script setup lang="ts">
/**
 * Anchored popover with hover / click / both trigger modes.
 *
 * Delegates panel mount, positioning, teleport, z-index stacking, click-outside, and
 * escape dismissal to the overlay-service. The component itself only tracks trigger
 * state (hover vs. click-pinned) and the hover-out grace timer — everything below the
 * `useOverlay().open()` call is handled by the service.
 *
 * When mounted inside another overlay (dialog, menu, etc.), `useOverlayParent()` returns
 * the parent `OverlayInstance` and is passed to `open({ parent })`. The service then
 * stacks this popover above the parent (each new `instance.id` is larger → higher
 * z-index) and treats clicks inside it as clicks inside the parent so the parent does
 * not close when the user interacts with the popover.
 */
import {
  ref,
  onBeforeUnmount,
  useSlots,
  watch,
  markRaw,
  type PropType,
  type VNode,
} from 'vue';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { popoverPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import CoarPopoverPanel from './CoarPopoverPanel.vue';

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

const panelId = `coar-popover-${Math.random().toString(36).slice(2, 9)}`;

const triggerRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const pinnedByClick = ref(false);

let overlayRef: OverlayRef | null = null;
let hoveringTrigger = false;
let hoveringPanel = false;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const HOVER_CLOSE_DELAY = 80;

const slots = useSlots();
const parentOverlay = useOverlayParent();

/** Closure into this component's own slot scope — captured here, invoked later by the
 * panel component via `<component :is="{ render: renderContent }" />`. Without this
 * indirection the panel (mounted by the service under a different v-node parent) would
 * have no way to reach the popover's `content` slot VNodes. */
function renderContent(): VNode[] | undefined {
  return slots.content?.();
}

// --- helpers ---

function canHover() {
  return props.mode === 'hover' || props.mode === 'both';
}

function canClick() {
  return props.mode === 'click' || props.mode === 'both';
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

function open(source: 'hover' | 'click') {
  if (props.disabled) return;
  if (isOpen.value) {
    if (source === 'click') pinnedByClick.value = true;
    return;
  }

  const trigger = triggerRef.value;
  if (!trigger) return;

  pinnedByClick.value = source === 'click';
  isOpen.value = true;

  overlayRef = getOverlayService().open({
    spec: {
      ...popoverPreset,
      anchor: { kind: 'element', element: trigger },
      position: {
        placement: popoverPreset.position?.placement ?? ['bottom', 'top', 'right', 'left'],
        offset: props.offset,
        flip: false,
        shift: true,
      },
      // Hover-only popovers close via the hover-out timer below; suppress the service's
      // outsideClick to avoid races between the timer and a stray document click.
      // Click-mode popovers rely on the service's outsideClick to close when pinned.
      dismiss: {
        outsideClick: canClick(),
        escapeKey: true,
      },
      a11y: {
        role: props.interactive ? 'dialog' : 'tooltip',
      },
    },
    content: { kind: 'component', component: markRaw(CoarPopoverPanel) },
    inputs: {
      interactive: props.interactive,
      renderContent,
      onPanelEnter: () => {
        if (!canHover()) return;
        hoveringPanel = true;
        clearCloseTimer();
      },
      onPanelLeave: () => {
        if (!canHover()) return;
        if (pinnedByClick.value) return;
        hoveringPanel = false;
        scheduleHoverClose();
      },
      onPanelFocusOut: (event: FocusEvent) => {
        if (pinnedByClick.value) return;
        const next = event.relatedTarget as Node | null;
        if (next && triggerRef.value?.contains(next)) return;
        // The panel's own DOM is inside the overlay-host; the service's focus logic keeps
        // focus within the overlay tree, so a focusout with no target inside trigger/panel
        // means the user tabbed away deliberately. Close.
        close();
      },
    },
    parent: parentOverlay,
  });

  // If the service closes the overlay externally (outside click, escape) our local state
  // must follow so the next hover/click reopens it instead of no-opping on isOpen.value.
  overlayRef.afterClosed.then(() => {
    if (overlayRef?.isClosed) {
      overlayRef = null;
      isOpen.value = false;
      pinnedByClick.value = false;
      hoveringPanel = false;
      clearCloseTimer();
    }
  });
}

function close() {
  if (!isOpen.value) return;
  clearCloseTimer();
  if (overlayRef && !overlayRef.isClosed) {
    overlayRef.close();
  }
  overlayRef = null;
  isOpen.value = false;
  pinnedByClick.value = false;
  hoveringPanel = false;
}

// --- trigger event handlers ---

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

function onTriggerFocusIn() {
  if (!canHover()) return;
  open('hover');
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

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close();
  },
);

onBeforeUnmount(() => {
  close();
});

// Expose for tests / advanced consumers that want to query open state.
defineExpose({
  isOpen,
});
</script>

<template>
  <div
    class="coar-popover"
    @mouseenter="onTriggerMouseEnter"
    @mouseleave="onTriggerMouseLeave"
    @focusin="onTriggerFocusIn"
  >
    <span
      ref="triggerRef"
      class="coar-popover-trigger"
      :aria-describedby="!interactive && isOpen ? panelId : undefined"
      :aria-haspopup="interactive ? 'dialog' : undefined"
      :aria-expanded="interactive ? isOpen : undefined"
      @click="onTriggerClick"
    >
      <slot />
    </span>
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
</style>
