<script setup lang="ts">
import { CoarFormField, CoarMultiSelect } from '@cocoar/vue-ui';
import { toSelectOptions } from '../optionUtils';
import type { MultiSelectNode } from '../../schema';

defineProps<{
  node: MultiSelectNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarMultiSelect
      :model-value="(node.defaultValue as string[] | undefined) ?? []"
      :options="toSelectOptions(node.props.options)"
      :placeholder="node.props.placeholder"
      disabled
    />
  </CoarFormField>
</template>
