<script setup lang="ts">
import type { ImageNode } from '../../schema';
import { usePageElement } from '../usePageElement';

defineProps<{ node: ImageNode }>();

const ctx = usePageElement();
</script>

<template>
  <img class="pb-image" :src="ctx.resolveAsset(node.props.assetId)" :alt="node.props.alt ?? ''" />
</template>

<style scoped>
/* Inline-natured leaf: content-sized, not stretched by the parent stack. */
.pb-image {
  width: fit-content;
  max-width: 100%;
  display: block;
}
</style>
