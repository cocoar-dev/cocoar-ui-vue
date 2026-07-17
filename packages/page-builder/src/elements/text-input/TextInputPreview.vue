<script setup lang="ts">
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';
import type { TextInputNode } from '../../schema';

defineProps<{
  node: TextInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarTextInput
      :model-value="''"
      :rows="node.props.rows"
      :placeholder="node.props.placeholder"
      readonly
    />
  </CoarFormField>
</template>
