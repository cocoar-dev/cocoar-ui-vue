<script setup lang="ts">
import { computed } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';
import type { MarkdownFormFieldControlProps } from '../types';
import { parseFiniteNumber } from '../field-layout';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const value = computed<number | null>(() => {
  if (typeof props.modelValue === 'number' && Number.isFinite(props.modelValue))
    return props.modelValue;
  if (typeof props.modelValue === 'string') return parseFiniteNumber(props.modelValue) ?? null;
  return null;
});
const min = computed(() => parseFiniteNumber(props.field.props['min']));
const max = computed(() => parseFiniteNumber(props.field.props['max']));
const step = computed(() => parseFiniteNumber(props.field.props['step']) ?? 1);
const decimals = computed(() =>
  Math.max(0, Math.trunc(parseFiniteNumber(props.field.props['decimals']) ?? 0)),
);

function updateBasic(event: Event): void {
  const source = (event.target as HTMLInputElement).value;
  emit('update:modelValue', source === '' ? null : Number(source));
}
</script>

<template>
  <CoarNumberInput
    v-if="context.design === 'coar'"
    :id="`markdown-form-${field.id}`"
    :model-value="value"
    :placeholder="field.props['placeholder'] || field.id"
    :min="min"
    :max="max"
    :step="step"
    :decimals="decimals"
    :suffix="field.props['suffix']"
    :required="field.required"
    :error="Boolean(error)"
    :locale="context.locale"
    size="xs"
    stepper-buttons="both"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
  <input
    v-else
    :id="`markdown-form-${field.id}`"
    class="coar-markdown-form-basic-control"
    type="number"
    :value="value ?? ''"
    :placeholder="field.props['placeholder'] || field.id"
    :min="min"
    :max="max"
    :step="step"
    :required="field.required"
    :aria-invalid="error ? 'true' : undefined"
    @input="updateBasic"
  />
</template>
