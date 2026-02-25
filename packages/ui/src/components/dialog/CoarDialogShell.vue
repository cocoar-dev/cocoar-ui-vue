<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import type { DialogSize } from './dialog-types';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarButton from '../button/CoarButton.vue';
import { vScrollbar } from '../scrollbar/vScrollbar';

const props = defineProps<{
  title: string;
  size: DialogSize;
  showCloseButton: boolean;
  closeOnBackdropClick: boolean;
  closeOnEscape: boolean;
  /** When true, renders built-in confirm UI (message + buttons). */
  confirmMode: boolean;
  confirmMessage: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: 'primary' | 'danger';
}>();

const emit = defineEmits<{
  close: [result?: unknown];
}>();

const dialogRef = ref<HTMLElement | null>(null);

function onClose(result?: unknown) {
  emit('close', result);
}

function onBackdropClick(event: MouseEvent) {
  if (!props.closeOnBackdropClick) return;
  // Only close when clicking the backdrop itself, not the dialog panel
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape) {
    onClose();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  // Focus the dialog for keyboard accessibility
  dialogRef.value?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
});

const sizeClass = computed(() => `coar-dialog--${props.size}`);
</script>

<template>
  <div class="coar-dialog-backdrop" @mousedown="onBackdropClick">
    <div
      ref="dialogRef"
      class="coar-dialog"
      :class="sizeClass"
      role="dialog"
      aria-modal="true"
      :aria-label="title || undefined"
      :aria-labelledby="title ? 'coar-dialog-title' : undefined"
      tabindex="-1"
    >
      <div v-if="title || showCloseButton" class="coar-dialog-header">
        <h2 v-if="title" id="coar-dialog-title" class="coar-dialog-title">{{ title }}</h2>
        <button
          v-if="showCloseButton"
          class="coar-dialog-close"
          aria-label="Close dialog"
          @click="onClose()"
        >
          <CoarIcon name="x" size="s" />
        </button>
      </div>

      <div v-scrollbar="{ overflowX: 'hidden', defer: false }" class="coar-dialog-body">
        <p v-if="confirmMode">{{ confirmMessage }}</p>
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
  </div>
</template>

<style scoped>
.coar-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  animation: coar-dialog-fade-in 150ms ease;
}

.coar-dialog {
  background: var(--coar-background-neutral-primary);
  border-radius: var(--coar-radius-l, 12px);
  box-shadow: var(--coar-shadow-xl, 0 16px 48px rgba(0, 0, 0, 0.2));
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow: hidden;
  animation: coar-dialog-scale-in 200ms ease;
  outline: none;
}

.coar-dialog--s { width: 400px; }
.coar-dialog--m { width: 560px; }
.coar-dialog--l { width: 720px; }

.coar-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-m, 16px);
  padding: var(--coar-spacing-l, 24px);
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
  padding: var(--coar-spacing-xs, 4px);
  border-radius: var(--coar-radius-s, 4px);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 150ms ease, color 150ms ease;
}

.coar-dialog-close:hover {
  background-color: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
}

.coar-dialog-close:focus-visible {
  outline: 2px solid var(--coar-border-focus);
  outline-offset: -2px;
}

.coar-dialog-body {
  padding: var(--coar-spacing-l, 24px);
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
  gap: var(--coar-spacing-s, 8px);
  padding: var(--coar-spacing-l, 24px);
  padding-top: 0;
}

@keyframes coar-dialog-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes coar-dialog-scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .coar-dialog-backdrop,
  .coar-dialog {
    animation: none;
  }
  .coar-dialog-close {
    transition: none;
  }
}
</style>
