<script setup lang="ts">
import { computed } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import type { ImageNode } from '../../schema';
import { leafSizeStyle } from '../previewUtils';

const props = defineProps<{
  node: ImageNode;
  resolveAsset?: (id: string) => string;
}>();

const sizeStyle = computed(() => leafSizeStyle(props.node.style));

const src = computed(() => {
  const id = props.node.props?.assetId;
  if (!id) return '';
  return props.resolveAsset?.(id) ?? '';
});
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="props.node.props?.alt ?? ''"
    class="canvas-node__image-preview"
    :style="sizeStyle"
  />
  <div v-else class="canvas-node__image-placeholder">
    <CoarIcon name="image" size="m" />
    <span>{{ props.node.props?.assetId || 'No image' }}</span>
  </div>
</template>

<style scoped>
.canvas-node__image-preview {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
.canvas-node__image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px;
  background: var(--coar-background-neutral-secondary, #f7f7f9);
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  color: var(--coar-text-neutral-secondary, #888);
  font-size: 12px;
}
</style>
