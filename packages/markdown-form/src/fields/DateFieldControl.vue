<script setup lang="ts">
import { computed } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker, type DateFormatConfig } from '@cocoar/vue-ui';
import type { MarkdownFormFieldControlProps } from '../types';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const dateFormat: DateFormatConfig = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 };

function parseDate(source: unknown): Temporal.PlainDate | null {
  if (typeof source !== 'string' || !source) return null;
  try {
    return Temporal.PlainDate.from(source);
  } catch {
    return null;
  }
}

const value = computed({
  get: () => parseDate(props.modelValue),
  set: (next: Temporal.PlainDate | null) => emit('update:modelValue', next?.toString() ?? ''),
});
const min = computed(() => parseDate(props.field.props['min']));
const max = computed(() => parseDate(props.field.props['max']));

function updateBasic(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <CoarPlainDatePicker
    v-if="context.design === 'coar'"
    :id="`markdown-form-${field.id}`"
    v-model="value"
    :placeholder="field.props['placeholder'] || field.id"
    :required="field.required"
    :error="Boolean(error)"
    :locale="context.locale"
    :date-format="dateFormat"
    :min="min"
    :max="max"
    size="xs"
    clearable
  />
  <input
    v-else
    :id="`markdown-form-${field.id}`"
    class="coar-markdown-form-basic-control"
    type="date"
    :value="typeof modelValue === 'string' ? modelValue : ''"
    :placeholder="field.props['placeholder'] || field.id"
    :min="field.props['min']"
    :max="field.props['max']"
    :required="field.required"
    :aria-invalid="error ? 'true' : undefined"
    @input="updateBasic"
  />
</template>
