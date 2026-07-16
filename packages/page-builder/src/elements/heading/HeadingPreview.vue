<script setup lang="ts">
import type { HeadingNode } from '../../schema';
import { headingTag } from '../../renderSafety';

const props = defineProps<{
  node: HeadingNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <component :is="headingTag(props.node.props?.level)" class="canvas-node__heading">
    {{ props.node.props?.text || 'Heading' }}
  </component>
</template>

<style scoped>
.canvas-node__heading {
  margin: 0;
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
}
h1.canvas-node__heading { font-size: 28px; }
h2.canvas-node__heading { font-size: 22px; }
h3.canvas-node__heading { font-size: 18px; }
h4.canvas-node__heading { font-size: 15px; }
h5.canvas-node__heading { font-size: 13px; }
h6.canvas-node__heading { font-size: 12px; }
</style>
