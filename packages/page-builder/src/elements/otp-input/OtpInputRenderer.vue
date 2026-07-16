<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarOtpInput } from '@cocoar/vue-ui';
import type { OtpInputNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: OtpInputNode }>();

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
    <CoarOtpInput
      :model-value="name ? (ctx.getValue(name) as string ?? '') : ''"
      :length="node.props.length"
      :type="node.props.otpType"
      :mask="node.props.mask"
      :disabled="node.props.disabled"
      @update:model-value="(v) => name && ctx.setValue(name, v)"
      @blurred="name && ctx.markTouched(name)"
    />
  </CoarFormField>
</template>
