<script setup lang="ts">
import { CoarFormField, CoarSelect } from '@cocoar/vue-ui';
import { toSelectOptions } from '../optionUtils';
import type { SelectNode } from '../../schema';

defineProps<{
  node: SelectNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarSelect
      :model-value="null"
      :options="toSelectOptions(node.props.options)"
      :placeholder="node.props.placeholder"
      disabled
    />
  </CoarFormField>
</template>
