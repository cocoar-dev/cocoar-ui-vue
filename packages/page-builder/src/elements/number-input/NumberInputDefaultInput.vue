<script setup lang="ts">
import { CoarNumberInput } from '@cocoar/vue-ui';
import type { NumberInputNode } from '../../schema';

const props = defineProps<{
  modelValue: unknown;
  props: NumberInputNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();
</script>

<template>
  <CoarNumberInput
size="s"
    clearable
    :decimals="props.props.decimals ?? 6"
    :model-value="(props.modelValue as number | undefined) ?? null"
    @update:model-value="(v) => emit('update:modelValue', v ?? undefined)"
  />
</template>
