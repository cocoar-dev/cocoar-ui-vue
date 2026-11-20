<script setup lang="ts">
import { computed } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<number>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: number | undefined] }>();
const number = computed({
  get: () => (typeof props.modelValue === 'number' ? props.modelValue : null),
  set: (value: number | null) => emit('update:modelValue', value ?? undefined),
});
const decimals = computed(() => props.schema['x-coar-decimals'] ?? (props.schema.type === 'integer' ? 0 : 2));
</script>

<template>
  <CoarNumberInput
    :id="id"
    v-model="number"
    size="s"
    appearance="inline"
    width="content"
    :min="schema.minimum"
    :max="schema.maximum"
    :decimals="decimals"
    :suffix="schema['x-coar-unit']"
    :locale="locale"
    placeholder="–"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
  />
</template>
