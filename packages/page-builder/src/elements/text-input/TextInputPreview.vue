<script setup lang="ts">
import { CoarFormField, CoarPasswordInput, CoarTextInput } from '@cocoar/vue-ui';
import type { TextInputNode } from '../../schema';

defineProps<{
  node: TextInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarPasswordInput
      v-if="node.props.inputType === 'password'"
      :model-value="''"
      :placeholder="node.props.placeholder"
      disabled
    />
    <CoarTextInput
      v-else
      :model-value="''"
      :rows="node.props.rows"
      :placeholder="node.props.placeholder"
      readonly
    />
  </CoarFormField>
</template>
