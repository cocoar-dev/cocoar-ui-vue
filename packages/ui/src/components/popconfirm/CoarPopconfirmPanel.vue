<script setup lang="ts">
import CoarButton from '../button/CoarButton.vue';

defineProps<{
  message: string;
  title?: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}>();
</script>

<template>
  <div class="coar-popconfirm-host">
    <div class="coar-popconfirm-panel">
      <div v-if="title" class="coar-popconfirm-panel__title">{{ title }}</div>
      <div class="coar-popconfirm-panel__message">{{ message }}</div>
      <div class="coar-popconfirm-panel__actions">
        <CoarButton size="s" variant="secondary" @click="onCancel">{{ cancelText }}</CoarButton>
        <CoarButton
          size="s"
          :variant="confirmVariant === 'danger' ? 'danger' : 'primary'"
          @click="onConfirm"
        >{{ confirmText }}</CoarButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-popconfirm-host {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

.coar-popconfirm-panel {
  position: relative;
  padding: 0.75rem;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  max-width: 280px;
  font-family: var(--coar-body-base-family);
  box-sizing: border-box;
}

/* Arrow pseudo-element */
.coar-popconfirm-panel::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  transform: rotate(45deg);
}

/* Top placement - arrow at bottom */
:global(.coar-overlay-host[data-placement='top']) .coar-popconfirm-panel::before {
  bottom: -6px;
  left: 50%;
  margin-left: -5px;
  border-top: none;
  border-left: none;
}

/* Bottom placement - arrow at top */
:global(.coar-overlay-host[data-placement='bottom']) .coar-popconfirm-panel::before {
  top: -6px;
  left: 50%;
  margin-left: -5px;
  border-bottom: none;
  border-right: none;
}

/* Left placement - arrow at right */
:global(.coar-overlay-host[data-placement='left']) .coar-popconfirm-panel::before {
  right: -6px;
  top: 50%;
  margin-top: -5px;
  border-bottom: none;
  border-left: none;
}

/* Right placement - arrow at left */
:global(.coar-overlay-host[data-placement='right']) .coar-popconfirm-panel::before {
  left: -6px;
  top: 50%;
  margin-top: -5px;
  border-top: none;
  border-right: none;
}

.coar-popconfirm-panel__title {
  font-weight: 600;
  font-size: var(--coar-body-base-size);
  color: var(--coar-text-neutral-primary);
  margin-bottom: 0.25rem;
}

.coar-popconfirm-panel__message {
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
  margin-bottom: 0.75rem;
  line-height: var(--coar-line-height-normal);
}

.coar-popconfirm-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
