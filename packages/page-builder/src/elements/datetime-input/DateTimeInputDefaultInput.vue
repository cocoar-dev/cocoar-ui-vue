<script setup lang="ts">
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
import { isoToPlainDateTime } from '../../renderSafety';
import type { DateTimeInputNode } from '../../schema';

const componentProps = defineProps<{
  modelValue: unknown;
  props: DateTimeInputNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();
</script>

<template>
  <CoarPlainDateTimePicker
    clearable
    :model-value="isoToPlainDateTime(componentProps.modelValue)"
    @update:model-value="(d) => emit('update:modelValue', d ? d.toString() : undefined)"
  />
</template>
