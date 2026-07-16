<script setup lang="ts">
import { CoarFormField, CoarOtpInput } from '@cocoar/vue-ui';
import type { OtpInputNode } from '../../schema';

defineProps<{
  node: OtpInputNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarOtpInput
      :model-value="''"
      :length="node.props.length"
      :mask="node.props.mask"
      disabled
    />
  </CoarFormField>
</template>
