<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';
import type { SwitchNode } from '../../schema';

defineProps<{
  node: SwitchNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarSwitch :model-value="!!node.defaultValue" :label="node.props.label || 'Switch'" disabled />
</template>
