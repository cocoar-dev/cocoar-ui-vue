<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarPasswordInput } from '@cocoar/vue-ui';
import type { PasswordInputNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: PasswordInputNode }>();

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
    <CoarPasswordInput
      :model-value="name ? (ctx.getValue(name) as string ?? '') : ''"
      :placeholder="node.props.placeholder"
      :disabled="node.props.disabled"
      @update:model-value="(v) => name && ctx.setValue(name, v)"
      @blurred="name && ctx.markTouched(name)"
    />
  </CoarFormField>
</template>
