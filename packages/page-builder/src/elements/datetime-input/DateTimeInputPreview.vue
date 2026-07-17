<script setup lang="ts">
import { CoarFormField, CoarPlainDateTimePicker } from '@cocoar/vue-ui';
import { isoToPlainDateTime } from '../../renderSafety';
import type { DateTimeInputNode } from '../../schema';

defineProps<{
  node: DateTimeInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarPlainDateTimePicker
      :model-value="isoToPlainDateTime(node.defaultValue)"
      :placeholder="node.props.placeholder"
      disabled
    />
  </CoarFormField>
</template>
