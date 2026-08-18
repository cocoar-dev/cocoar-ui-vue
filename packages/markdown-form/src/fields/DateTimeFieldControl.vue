<script setup lang="ts">
import { computed } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDateTimePicker, type DateFormatConfig } from '@cocoar/vue-ui';
import type { MarkdownFormFieldControlProps } from '../types';
import { parseFiniteNumber } from '../field-layout';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const dateFormat: DateFormatConfig = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 };

function parseDateTime(source: unknown): Temporal.PlainDateTime | null {
  if (typeof source !== 'string' || !source) return null;
  try {
    return Temporal.PlainDateTime.from(source);
  } catch {
    return null;
  }
}

const value = computed({
  get: () => parseDateTime(props.modelValue),
  set: (next: Temporal.PlainDateTime | null) =>
    emit('update:modelValue', next?.toString({ smallestUnit: 'minute' }) ?? ''),
});
const min = computed(() => parseDateTime(props.field.props['min']));
const max = computed(() => parseDateTime(props.field.props['max']));
const minuteStep = computed<1 | 5 | 10 | 15>(() => {
  const candidate = parseFiniteNumber(props.field.props['minuteStep']);
  return candidate === 1 || candidate === 5 || candidate === 10 || candidate === 15
    ? candidate
    : 15;
});

function updateBasic(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <CoarPlainDateTimePicker
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
    :minute-step="minuteStep"
    :use24-hour="true"
    size="xs"
    clearable
  />
  <input
    v-else
    :id="`markdown-form-${field.id}`"
    class="coar-markdown-form-basic-control"
    type="datetime-local"
    :value="typeof modelValue === 'string' ? modelValue : ''"
    :placeholder="field.props['placeholder'] || field.id"
    :min="field.props['min']"
    :max="field.props['max']"
    :required="field.required"
    :aria-invalid="error ? 'true' : undefined"
    @input="updateBasic"
  />
</template>
