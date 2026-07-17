<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';

defineProps<{
  node: CheckboxNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarCheckbox
    :model-value="!!node.defaultValue"
    :label="node.props.label || 'Checkbox'"
    :required="node.validation?.required"
    disabled
  />
</template>
