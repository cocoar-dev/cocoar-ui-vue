<script setup lang="ts">
import { computed } from 'vue';
import { clamp } from '@cocoar/vue-core';

export interface CoarButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 1 | 2 | 3 | 4 | 5;
  disabled?: boolean;
}

const props = withDefaults(defineProps<CoarButtonProps>(), {
  label: 'Button',
  variant: 'primary',
  size: 3,
  disabled: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const normalizedSize = computed(() => clamp(props.size, 1, 5));

const sizeClass = computed(() => `coar-button--size-${normalizedSize.value}`);

function handleClick(event: MouseEvent) {
  if (!props.disabled) {
    emit('click', event);
  }
}
</script>

<template>
  <button
    :class="['coar-button', `coar-button--${variant}`, sizeClass, { 'coar-button--disabled': disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.coar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.coar-button--size-1 { padding: 2px 6px; font-size: 0.75rem; }
.coar-button--size-2 { padding: 4px 10px; font-size: 0.85rem; }
.coar-button--size-3 { padding: 6px 14px; font-size: 1rem; }
.coar-button--size-4 { padding: 8px 18px; font-size: 1.1rem; }
.coar-button--size-5 { padding: 10px 22px; font-size: 1.25rem; }

.coar-button--primary {
  background-color: #3b82f6;
  color: white;
}
.coar-button--primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.coar-button--secondary {
  background-color: #6b7280;
  color: white;
}
.coar-button--secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.coar-button--outline {
  background-color: transparent;
  border-color: #3b82f6;
  color: #3b82f6;
}
.coar-button--outline:hover:not(:disabled) {
  background-color: #eff6ff;
}

.coar-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
