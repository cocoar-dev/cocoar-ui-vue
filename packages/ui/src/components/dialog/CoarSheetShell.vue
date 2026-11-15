<script setup lang="ts">
/**
 * **Preview** — may still change. The bottom-sheet presentation of `useDialog`
 * (`presentation: 'sheet'`): docked to the bottom of the visual viewport with
 * `position: fixed` (the overlay host is positioned by `top`/`left`, so it is no
 * containing block), drag handle and header that drag it closed, content that scrolls
 * inside, a footer that stays put. Locks page scroll while mounted.
 */
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import type { DialogSize } from './dialog-types';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarButton from '../button/CoarButton.vue';
import { vScrollbar } from '../scrollbar/vScrollbar';
import { useFocusTrap } from '../_internal/useFocusTrap';
import { useVisualViewport } from '../_internal/useVisualViewport';
import { lockPageScroll } from '../_internal/pageScrollLock';
import { useSheetDrag } from './useSheetDrag';
import { provideDialogFooter } from './dialogFooter';

const props = defineProps<{
  title: string;
  /** Caps the width from a 640 px wide window on; below the sheet spans the full width. */
  size: DialogSize;
  showCloseButton: boolean;
  /** Whether dragging the handle or header down closes the sheet. */
  dragToClose: boolean;
  /** When true, renders built-in confirm UI (message + buttons). */
  confirmMode: boolean;
  confirmMessage: string;
  confirmText: string;
  /** Empty: no cancel button (alert). */
  cancelText: string;
  confirmVariant: 'primary' | 'danger';
  /** Optional body component for programmatic rendering (falls back to slot). */
  bodyComponent?: Component;
  /** Props to pass to bodyComponent. */
  bodyComponentProps?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  close: [result?: unknown];
}>();

const { t } = useI18n();

const sheetRef = ref<HTMLElement | null>(null);

const autoId = `coar-sheet-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const titleId = `${autoId}-title`;

useFocusTrap(sheetRef);

let releaseScrollLock: (() => void) | null = null;
onMounted(() => {
  releaseScrollLock = lockPageScroll();
});
onBeforeUnmount(() => {
  releaseScrollLock?.();
  releaseScrollLock = null;
});

function onClose(result?: unknown) {
  emit('close', result);
}

const drag = useSheetDrag({
  enabled: () => props.dragToClose,
  sheetHeight: () => sheetRef.value?.offsetHeight ?? 0,
  onClose: () => onClose(),
});
const dragListeners = {
  pointerdown: drag.handlers.onPointerdown,
  pointermove: drag.handlers.onPointermove,
  pointerup: drag.handlers.onPointerup,
  pointercancel: drag.handlers.onPointercancel,
};

const { metrics } = useVisualViewport();

// `CoarDialogFooter` of a body component: its buttons go into the footer element below.
const { element: footerRef, used: footerUsed } = provideDialogFooter();

const sheetStyle = computed(() => {
  const style: Record<string, string> = {};
  const viewport = metrics.value;
  if (viewport) {
    // Above the keyboard; the handle and header also keep clear of the top system inset.
    style.bottom = `${viewport.bottomInset}px`;
    style.maxHeight = `calc(${viewport.height}px - var(--coar-sheet-top-gap) - env(safe-area-inset-top, 0px))`;
  }
  if (drag.offset.value > 0) style.translate = `0 ${drag.offset.value}px`;
  return style;
});

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

/**
 * Scrolls the focused field into the visible part of its scroll container inside the
 * sheet. Not `scrollIntoView()`: it may scroll the locked page as well.
 */
function revealFocusedField() {
  const sheet = sheetRef.value;
  const field = typeof document !== 'undefined' ? document.activeElement : null;
  if (!sheet || !(field instanceof HTMLElement) || !sheet.contains(field)) return;
  if (!field.matches(EDITABLE_SELECTOR)) return;
  for (let el = field.parentElement; el && el !== sheet; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight) continue;
    const box = el.getBoundingClientRect();
    const rect = field.getBoundingClientRect();
    if (rect.bottom > box.bottom) el.scrollTop += rect.bottom - box.bottom;
    else if (rect.top < box.top) el.scrollTop -= box.top - rect.top;
    return;
  }
}

// The keyboard opens after the focus moves: reveal again once the viewport has shrunk.
watch(metrics, () => nextTick(revealFocusedField));

const sizeClass = computed(() => `coar-sheet--${props.size}`);

const BodyRenderer = computed(() => {
  if (!props.bodyComponent) return null;
  const comp = props.bodyComponent;
  const compProps = props.bodyComponentProps;
  return { render: () => h(comp, compProps) };
});
</script>

<template>
  <div
    ref="sheetRef"
    class="coar-sheet"
    :class="[sizeClass, { 'coar-sheet--dragging': drag.dragging.value }]"
    :style="sheetStyle"
    role="dialog"
    aria-modal="true"
    :aria-label="title ? undefined : t('coar.ui.dialog.dialog', undefined, 'Dialog')"
    :aria-labelledby="title ? titleId : undefined"
    tabindex="-1"
    @focusin="nextTick(revealFocusedField)"
  >
    <div class="coar-sheet-handle-area" v-on="dragListeners">
      <span v-if="dragToClose" class="coar-sheet-handle" aria-hidden="true" />
    </div>

    <div v-if="title || showCloseButton" class="coar-sheet-header" v-on="dragListeners">
      <h2 v-if="title" :id="titleId" class="coar-sheet-title">{{ title }}</h2>
      <button
        v-if="showCloseButton"
        type="button"
        class="coar-sheet-close"
        :aria-label="t('coar.ui.dialog.close', undefined, 'Close dialog')"
        @click="onClose()"
      >
        <CoarIcon name="x" size="s" />
      </button>
    </div>

    <div
      v-scrollbar="{ overflowX: 'hidden', defer: false, overscrollBehavior: 'contain' }"
      class="coar-sheet-body"
    >
      <p v-if="confirmMode">{{ confirmMessage }}</p>
      <component :is="BodyRenderer" v-else-if="BodyRenderer" />
      <slot v-else />
    </div>

    <div v-if="confirmMode" class="coar-sheet-footer">
      <CoarButton v-if="cancelText" variant="secondary" full-width @click="onClose(false)">{{ cancelText }}</CoarButton>
      <CoarButton :variant="confirmVariant" full-width @click="onClose(true)">{{ confirmText }}</CoarButton>
    </div>

    <div v-if="!confirmMode && ($slots.footer || footerUsed)" ref="footerRef" class="coar-sheet-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.coar-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  width: 100%;
  margin-inline: auto;
  max-height: calc(100vh - var(--coar-sheet-top-gap) - env(safe-area-inset-top, 0px));
  max-height: calc(100dvh - var(--coar-sheet-top-gap) - env(safe-area-inset-top, 0px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--coar-dialog-background);
  border-radius: var(--coar-sheet-border-radius) var(--coar-sheet-border-radius) 0 0;
  box-shadow: var(--coar-dialog-shadow);
  outline: none;
  animation: coar-sheet-slide-in var(--coar-duration-normal) var(--coar-ease-out);
  /* Springs back after a drag that did not close it; `translate` leaves `transform` to the animation. */
  transition: translate var(--coar-duration-normal) var(--coar-ease-out);
}

.coar-sheet--dragging {
  transition: none;
}

/* From tablet width on, the sheet keeps the width of its size, centered. */
@media (min-width: 640px) {
  .coar-sheet--s { max-width: var(--coar-dialog-s-width); }
  .coar-sheet--m { max-width: var(--coar-dialog-m-width); }
  .coar-sheet--l { max-width: var(--coar-dialog-l-width); }
  .coar-sheet--xl { max-width: var(--coar-dialog-xl-width); }
}

.coar-sheet-handle-area {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: var(--coar-sheet-handle-area-height);
  touch-action: none;
  user-select: none;
}

.coar-sheet-handle {
  width: var(--coar-sheet-handle-width);
  height: var(--coar-sheet-handle-height);
  border-radius: calc(var(--coar-sheet-handle-height) / 2);
  background: var(--coar-sheet-handle-color);
}

.coar-sheet-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-dialog-header-gap);
  padding: 0 var(--coar-sheet-padding);
  touch-action: none;
  user-select: none;
}

.coar-sheet-title {
  margin: 0;
  font: var(--coar-heading-s);
  color: var(--coar-text-neutral-primary);
  flex: 1;
  min-width: 0;
}

.coar-sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--coar-control-min-target-size, 0px);
  min-height: var(--coar-control-min-target-size, 0px);
  background: none;
  border: none;
  padding: var(--coar-spacing-xs);
  border-radius: var(--coar-radius-s);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sheet-close:hover {
  background-color: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
}

.coar-sheet-close:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: var(--coar-sheet-padding);
  /* No footer: the content keeps clear of the home indicator. */
  padding-bottom: max(var(--coar-sheet-padding), env(safe-area-inset-bottom));
  color: var(--coar-text-neutral-primary);
}

.coar-sheet-body:not(:last-child) {
  padding-bottom: var(--coar-sheet-padding);
}

.coar-sheet-body p {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
}

/* Full-width buttons, the confirming one (last in the markup, as in the dialog) on top. */
.coar-sheet-footer {
  display: flex;
  flex-shrink: 0;
  flex-direction: column-reverse;
  align-items: stretch;
  gap: var(--coar-spacing-s);
  padding: 0 var(--coar-sheet-padding);
  padding-bottom: max(var(--coar-sheet-padding), env(safe-area-inset-bottom));
}

@keyframes coar-sheet-slide-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .coar-sheet,
  .coar-sheet-close {
    animation: none;
    transition: none;
  }
}
</style>
