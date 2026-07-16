<script setup lang="ts">
import type { SpacerNode } from '../../schema';

defineProps<{
  node: SpacerNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <div class="canvas-node__spacer-preview" />
</template>

<style scoped>
.canvas-node__spacer-preview {
  height: 20px;
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 4px,
    transparent 4px,
    transparent 8px
  );
  border-radius: 2px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
}
</style>
