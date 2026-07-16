<script setup lang="ts">
import type { HeadingNode } from '../../schema';
import { headingTag } from '../../renderSafety';

defineProps<{ node: HeadingNode }>();
</script>

<template>
  <component :is="headingTag(node.props.level)" class="pb-heading">
    {{ node.props.text }}
  </component>
</template>

<style scoped>
.pb-heading {
  margin: 0;
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
}
</style>
