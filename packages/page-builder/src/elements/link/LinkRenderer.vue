<script setup lang="ts">
import type { LinkNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: LinkNode }>();

const ctx = usePageElement();

function callAction(id?: string) {
  if (!id) return;
  ctx.triggerAction(id);
}
</script>

<template>
  <button class="pb-link" @click="callAction(props.node.props.action)">
    {{ node.props.label }}
  </button>
</template>

<style scoped>
/* Inline-natured leaf: content-sized, not stretched by the parent stack. */
.pb-link {
  width: fit-content;
  max-width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--coar-text-accent, #0066cc);
  font-size: inherit;
  text-decoration: underline;
}

.pb-link:hover {
  color: var(--coar-text-accent-hover, #004fa3);
}
</style>
