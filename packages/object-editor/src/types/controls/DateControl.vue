<script setup lang="ts">
import { computed } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<string>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: string | undefined] }>();
const date = computed({
  get: () => {
    try {
      return props.modelValue ? Temporal.PlainDate.from(props.modelValue) : null;
    } catch {
      return null;
    }
  },
  set: (value: Temporal.PlainDate | null) => emit('update:modelValue', value?.toString()),
});
</script>

<template>
  <CoarPlainDatePicker
    :id="id"
    v-model="date"
    size="s"
    appearance="inline"
    width="content"
    :locale="locale"
    close-on-select
    :readonly="readonly"
    :error="error"
    :aria-label="label"
  />
</template>
