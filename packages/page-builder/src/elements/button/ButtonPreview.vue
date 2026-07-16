<script setup lang="ts">
import { computed } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import type { ButtonNode } from '../../schema';
import { leafSizeStyle } from '../previewUtils';

const props = defineProps<{
  node: ButtonNode;
  resolveAsset?: (id: string) => string;
}>();

const sizeStyle = computed(() => leafSizeStyle(props.node.style));
</script>

<template>
  <CoarButton
    :variant="props.node.props?.variant ?? 'primary'"
    :size="props.node.props?.size"
    :style="sizeStyle"
    disabled
  >
    {{ props.node.props?.label || 'Button' }}
  </CoarButton>
</template>
