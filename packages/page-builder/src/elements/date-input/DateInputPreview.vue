<script setup lang="ts">
import { CoarFormField, CoarPlainDatePicker } from '@cocoar/vue-ui';
import { isoToPlainDate } from '../../renderSafety';
import type { DateInputNode } from '../../schema';

defineProps<{
  node: DateInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarPlainDatePicker
      :model-value="isoToPlainDate(node.defaultValue)"
      :placeholder="node.props.placeholder"
      disabled
    />
  </CoarFormField>
</template>
