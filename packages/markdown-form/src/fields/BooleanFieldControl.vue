<script setup lang="ts">
import { computed } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { MarkdownFormFieldControlProps } from '../types';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const value = computed(() => props.modelValue === true || props.modelValue === 'true');
const label = computed(() =>
  props.field.source === 'block' ? props.field.props['label'] || '' : '',
);

function updateBasic(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <CoarCheckbox
    v-if="context.design === 'coar'"
    :id="`markdown-form-${field.id}`"
    :model-value="value"
    :label="label"
    :required="field.required"
    :error="Boolean(error)"
    size="xs"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <label v-else class="coar-markdown-form-basic-checkbox">
    <input
      :id="`markdown-form-${field.id}`"
      type="checkbox"
      :checked="value"
      :required="field.required"
      :aria-invalid="error ? 'true' : undefined"
      @change="updateBasic"
    />
    <span v-if="label">{{ label }}</span>
  </label>
</template>
