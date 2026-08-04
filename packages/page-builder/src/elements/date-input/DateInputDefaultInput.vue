<script setup lang="ts">
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
import { isoToPlainDate } from '../../renderSafety';
import type { DateInputNode } from '../../schema';

const componentProps = defineProps<{
  modelValue: unknown;
  props: DateInputNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();
</script>

<template>
  <CoarPlainDatePicker size="s"
    clearable
    :model-value="isoToPlainDate(componentProps.modelValue)"
    @update:model-value="(d) => emit('update:modelValue', d ? d.toString() : undefined)"
  />
</template>
