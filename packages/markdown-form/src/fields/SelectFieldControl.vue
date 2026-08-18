<script setup lang="ts">
import { computed } from 'vue';
import { CoarSelect, type CoarSelectOption } from '@cocoar/vue-ui';
import type { MarkdownFormFieldControlProps } from '../types';
import { parseMarkdownFormSelectOptions } from '../field-layout';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const value = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : null));
const options = computed<CoarSelectOption<string>[]>(() =>
  parseMarkdownFormSelectOptions(props.field.props['options']),
);

function updateBasic(event: Event): void {
  const next = (event.target as HTMLSelectElement).value;
  emit('update:modelValue', next || null);
}
</script>

<template>
  <CoarSelect
    v-if="context.design === 'coar'"
    :id="`markdown-form-${field.id}`"
    :model-value="value"
    :options="options"
    :placeholder="field.props['placeholder'] || field.id"
    :error="Boolean(error)"
    size="xs"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
  <select
    v-else
    :id="`markdown-form-${field.id}`"
    class="coar-markdown-form-basic-control"
    :value="value ?? ''"
    :required="field.required"
    :aria-invalid="error ? 'true' : undefined"
    @change="updateBasic"
  >
    <option value="">{{ field.props['placeholder'] || '—' }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
