<script setup lang="ts">
import type { ParagraphNode } from '../../schema';

defineProps<{ node: ParagraphNode }>();
</script>

<template>
  <p class="pb-paragraph">
    {{ node.props.text }}
  </p>
</template>

<style scoped>
.pb-paragraph {
  margin: 0;
  color: var(--coar-text-neutral-secondary, #666);
}
</style>
