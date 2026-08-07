<script setup lang="ts">
import { computed } from 'vue';
import type { LinkNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: LinkNode }>();

const ctx = usePageElement();

/** Links fire actions too — they share the form-wide busy window of the buttons. */
const busy = computed(() => ctx.isValidating.value || ctx.isSubmitting.value);

function callAction(id?: string) {
  if (!id) return;
  ctx.triggerElementAction(props.node.props);
}
</script>

<template>
  <button class="pb-link" :disabled="busy" @click="callAction(props.node.props.action)">
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
  color: var(--coar-text-accent-primary, #0066cc);
  font-size: inherit;
  text-decoration: underline;
}

.pb-link:hover {
  color: var(--coar-text-accent-secondary, #004fa3);
}

.pb-link:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
