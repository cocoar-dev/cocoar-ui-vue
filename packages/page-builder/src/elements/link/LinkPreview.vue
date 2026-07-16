<script setup lang="ts">
import { computed } from 'vue';
import type { LinkNode } from '../../schema';
import { leafSizeStyle } from '../previewUtils';

const props = defineProps<{
  node: LinkNode;
  resolveAsset?: (id: string) => string;
}>();

const sizeStyle = computed(() => leafSizeStyle(props.node.style));
</script>

<template>
  <button class="canvas-node__link" type="button" :style="sizeStyle">
    {{ props.node.props?.label || 'Link' }}
  </button>
</template>

<style scoped>
.canvas-node__link {
  background: none;
  border: none;
  padding: 0;
  cursor: default;
  color: var(--coar-text-accent, #1666cc);
  font-size: 14px;
  text-decoration: underline;
}
</style>
