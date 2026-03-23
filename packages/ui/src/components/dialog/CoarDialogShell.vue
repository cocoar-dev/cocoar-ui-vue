<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, nextTick, type Component, h } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import type { DialogSize } from './dialog-types';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarButton from '../button/CoarButton.vue';
import { vScrollbar } from '../scrollbar/vScrollbar';

const props = defineProps<{
  title: string;
  size: DialogSize;
  showCloseButton: boolean;
  /** When true, renders built-in confirm UI (message + buttons). */
  confirmMode: boolean;
  confirmMessage: string;
  confirmText: string;
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

const dialogRef = ref<HTMLElement | null>(null);

const autoId = `coar-dialog-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const titleId = `${autoId}-title`;

// --- Focus trap state ---
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

let previouslyFocusedElement: Element | null = null;

function getFocusableElements(): HTMLElement[] {
  if (!dialogRef.value) return [];
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.offsetParent !== null); // exclude hidden elements
}

function setInitialFocus() {
  if (!dialogRef.value) return;

  // Prefer element with autofocus attribute
  const autofocusEl = dialogRef.value.querySelector<HTMLElement>('[autofocus]');
  if (autofocusEl) {
    autofocusEl.focus();
    return;
  }

  // Otherwise focus first focusable element
  const focusable = getFocusableElements();
  if (focusable.length > 0) {
    focusable[0].focus();
  } else {
    // Fallback: focus the dialog container itself
    dialogRef.value.focus();
  }
}

function onClose(result?: unknown) {
  emit('close', result);
}

function onKeydown(event: KeyboardEvent) {
  // Focus trap: intercept Tab / Shift+Tab
  if (event.key === 'Tab') {
    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}

onMounted(() => {
  // Save the currently focused element for restoration on close
  if (typeof document !== 'undefined') {
    previouslyFocusedElement = document.activeElement;
  }

  document.addEventListener('keydown', onKeydown);

  // Move focus into the dialog
  nextTick(() => {
    setInitialFocus();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);

  // Restore focus to the element that was focused before the dialog opened
  if (previouslyFocusedElement && previouslyFocusedElement instanceof HTMLElement) {
    nextTick(() => {
      (previouslyFocusedElement as HTMLElement).focus();
    });
  }
});

const sizeClass = computed(() => `coar-dialog--${props.size}`);

const BodyRenderer = computed(() => {
  if (!props.bodyComponent) return null;
  const comp = props.bodyComponent;
  const compProps = props.bodyComponentProps;
  return { render: () => h(comp, compProps) };
});
</script>

<template>
  <div
    ref="dialogRef"
    class="coar-dialog"
    :class="sizeClass"
    role="dialog"
    aria-modal="true"
    :aria-label="title ? undefined : t('coar.ui.dialog.dialog', undefined, 'Dialog')"
    :aria-labelledby="title ? titleId : undefined"
    tabindex="-1"
  >
    <div v-if="title || showCloseButton" class="coar-dialog-header">
      <h2 v-if="title" :id="titleId" class="coar-dialog-title">{{ title }}</h2>
      <button
        v-if="showCloseButton"
        type="button"
        class="coar-dialog-close"
        :aria-label="t('coar.ui.dialog.close', undefined, 'Close dialog')"
        @click="onClose()"
      >
        <CoarIcon name="x" size="s" />
      </button>
    </div>

    <div v-scrollbar="{ overflowX: 'hidden', defer: false }" class="coar-dialog-body">
      <p v-if="confirmMode">{{ confirmMessage }}</p>
      <component :is="BodyRenderer" v-else-if="BodyRenderer" />
      <slot v-else />
    </div>

    <div v-if="confirmMode" class="coar-dialog-footer">
      <CoarButton variant="secondary" @click="onClose(false)">{{ cancelText }}</CoarButton>
      <CoarButton :variant="confirmVariant" @click="onClose(true)">{{ confirmText }}</CoarButton>
    </div>

    <div v-if="!confirmMode && $slots.footer" class="coar-dialog-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.coar-dialog {
  background: var(--coar-dialog-background);
  border-radius: var(--coar-dialog-border-radius);
  box-shadow: var(--coar-shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow: hidden;
  animation: coar-dialog-scale-in var(--coar-duration-normal) var(--coar-ease-out);
  outline: none;
}

.coar-dialog--s { width: var(--coar-dialog-s-width); }
.coar-dialog--m { width: var(--coar-dialog-m-width); }
.coar-dialog--l { width: var(--coar-dialog-l-width); }

.coar-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-dialog-header-gap);
  padding: var(--coar-dialog-padding);
  padding-bottom: 0;
}

.coar-dialog-title {
  margin: 0;
  font: var(--coar-heading-s);
  color: var(--coar-text-neutral-primary);
  flex: 1;
  min-width: 0;
}

.coar-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: var(--coar-spacing-xs);
  border-radius: var(--coar-radius-s);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-dialog-close:hover {
  background-color: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
}

.coar-dialog-close:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-dialog-body {
  padding: var(--coar-dialog-padding);
  overflow: hidden;
  flex: 1;
  color: var(--coar-text-neutral-primary);
}

.coar-dialog-body p {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
}

.coar-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--coar-spacing-s);
  padding: var(--coar-dialog-padding);
  padding-top: 0;
}

@keyframes coar-dialog-scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .coar-dialog {
    animation: none;
  }
  .coar-dialog-close {
    transition: none;
  }
}
</style>
