<script setup lang="ts">
import { computed } from 'vue';
import { clamp } from '@cocoar/ui-vue-core';

export interface CcrButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 1 | 2 | 3 | 4 | 5;
  disabled?: boolean;
}

const props = withDefaults(defineProps<CcrButtonProps>(), {
  label: 'Button',
  variant: 'primary',
  size: 3,
  disabled: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const normalizedSize = computed(() => clamp(props.size, 1, 5));

const sizeClass = computed(() => `ccr-button--size-${normalizedSize.value}`);

function handleClick(event: MouseEvent) {
  if (!props.disabled) {
    emit('click', event);
  }
}
</script>

<template>
  <button
    :class="['ccr-button', `ccr-button--${variant}`, sizeClass, { 'ccr-button--disabled': disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.ccr-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ccr-button--size-1 { padding: 2px 6px; font-size: 0.75rem; }
.ccr-button--size-2 { padding: 4px 10px; font-size: 0.85rem; }
.ccr-button--size-3 { padding: 6px 14px; font-size: 1rem; }
.ccr-button--size-4 { padding: 8px 18px; font-size: 1.1rem; }
.ccr-button--size-5 { padding: 10px 22px; font-size: 1.25rem; }

.ccr-button--primary {
  background-color: #3b82f6;
  color: white;
}
.ccr-button--primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.ccr-button--secondary {
  background-color: #6b7280;
  color: white;
}
.ccr-button--secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.ccr-button--outline {
  background-color: transparent;
  border-color: #3b82f6;
  color: #3b82f6;
}
.ccr-button--outline:hover:not(:disabled) {
  background-color: #eff6ff;
}

.ccr-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
