<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarNumberInput } from '@cocoar/vue-ui';
import type { NumberInputNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: NumberInputNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);
</script>

<template>
  <CoarFormField
    :label="node.props.label"
    :required="node.validation?.required"
    :error="name ? ctx.getError(name) : ''"
    :disabled="node.props.disabled"
  >
    <CoarNumberInput
      :model-value="name ? (ctx.getValue(name) as number ?? null) : null"
      :placeholder="node.props.placeholder"
      :min="node.props.min"
      :max="node.props.max"
      :step="node.props.step"
      :decimals="node.props.decimals"
      :disabled="node.props.disabled"
      @update:model-value="(v) => name && ctx.setValue(name, v)"
      @blurred="name && ctx.markTouched(name)"
    />
  </CoarFormField>
</template>
