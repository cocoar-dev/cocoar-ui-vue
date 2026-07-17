<script setup lang="ts">
import { CoarFormField, CoarPasswordInput } from '@cocoar/vue-ui';
import type { PasswordInputNode } from '../../schema';

defineProps<{
  node: PasswordInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarPasswordInput
      :model-value="''"
      :placeholder="node.props.placeholder"
      disabled
    />
  </CoarFormField>
</template>
