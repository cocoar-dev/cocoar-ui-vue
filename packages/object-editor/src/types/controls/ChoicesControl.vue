<script setup lang="ts">
import { computed } from 'vue';
import { CoarTagSelect } from '@cocoar/vue-ui';
import type { JsonValue } from '../../core/schema';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<JsonValue[]> & { allowCreate?: boolean }>(), {
  allowCreate: false,
  locale: undefined,
});
const emit = defineEmits<{ 'update:modelValue': [value: JsonValue[] | undefined] }>();
const values = computed({
  get: () => (Array.isArray(props.modelValue) ? props.modelValue : []),
  set: (value: JsonValue[]) => emit('update:modelValue', value),
});
// Free tags offer the suggestions of the schema and keep the tags already set.
const choices = computed(() => {
  if (!props.allowCreate) return props.options;
  const suggestions = props.schema['x-coar-suggestions'] ?? [];
  return [...new Set([...suggestions, ...values.value.map(String)])].map((value) => ({ value, label: value }));
});
</script>

<template>
  <CoarTagSelect
    :id="id"
    v-model="values"
    size="s"
    appearance="inline"
    :options="choices"
    :allow-create="allowCreate"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
  />
</template>
