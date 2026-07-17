<script setup lang="ts">
import type { ParagraphNode } from '../../schema';

const props = defineProps<{
  node: ParagraphNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <p class="canvas-node__paragraph">
    {{ props.node.props?.text || 'Paragraph text.' }}
  </p>
</template>

<style scoped>
.canvas-node__paragraph {
  margin: 0;
  font-size: 14px;
  color: var(--coar-text-neutral-secondary, #555);
}
</style>
