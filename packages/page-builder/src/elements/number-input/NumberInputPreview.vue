<script setup lang="ts">
import { CoarFormField, CoarNumberInput } from '@cocoar/vue-ui';
import type { NumberInputNode } from '../../schema';

defineProps<{
  node: NumberInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarNumberInput
      :model-value="(node.defaultValue as number | undefined) ?? null"
      :placeholder="node.props.placeholder"
      disabled
    />
  </CoarFormField>
</template>
