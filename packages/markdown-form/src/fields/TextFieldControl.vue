<script setup lang="ts">
import { computed } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';
import type { MarkdownFormFieldControlProps } from '../types';
import { parseFiniteNumber } from '../field-layout';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const value = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''));
const rows = computed(() =>
  Math.max(1, Math.trunc(parseFiniteNumber(props.field.props['rows']) ?? 1)),
);
const maxLength = computed(() => parseFiniteNumber(props.field.props['maxLength']));
const inputType = computed(() => {
  const candidate = props.field.props['inputType'];
  return candidate === 'email' ||
    candidate === 'url' ||
    candidate === 'tel' ||
    candidate === 'search'
    ? candidate
    : 'text';
});

function updateBasic(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement).value);
}
</script>

<template>
  <CoarTextInput
    v-if="context.design === 'coar'"
    :id="`markdown-form-${field.id}`"
    :model-value="value"
    :placeholder="field.props['placeholder'] || field.id"
    :rows="rows"
    :type="inputType"
    :maxlength="maxLength"
    :required="field.required"
    :error="Boolean(error)"
    size="xs"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
  <textarea
    v-else-if="rows > 1"
    :id="`markdown-form-${field.id}`"
    class="coar-markdown-form-basic-control"
    :value="value"
    :rows="rows"
    :maxlength="maxLength"
    :placeholder="field.props['placeholder'] || field.id"
    :required="field.required"
    :aria-invalid="error ? 'true' : undefined"
    @input="updateBasic"
  />
  <input
    v-else
    :id="`markdown-form-${field.id}`"
    class="coar-markdown-form-basic-control"
    :type="inputType"
    :value="value"
    :maxlength="maxLength"
    :placeholder="field.props['placeholder'] || field.id"
    :required="field.required"
    :aria-invalid="error ? 'true' : undefined"
    @input="updateBasic"
  />
</template>
