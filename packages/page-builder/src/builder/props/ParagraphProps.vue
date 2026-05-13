<script setup lang="ts">
import { CoarFormField } from '@cocoar/vue-ui';
import type { ParagraphNode } from '../../schema';

const props = defineProps<{
  node: ParagraphNode;
  patch: (update: Partial<ParagraphNode>) => void;
}>();
</script>

<template>
  <CoarFormField label="Text">
    <textarea
      class="pb-prop-textarea"
      :value="props.node.text ?? ''"
      rows="3"
      @input="props.patch({ text: ($event.target as HTMLTextAreaElement).value })"
    />
  </CoarFormField>
</template>

<style scoped>
.pb-prop-textarea {
  width: 100%;
  border: 1px solid var(--coar-border-neutral, #d0d0d0);
  border-radius: 6px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--coar-text-neutral-primary, #111);
  background: var(--coar-surface-base, #fff);
  resize: vertical;
  min-height: 60px;
  box-sizing: border-box;
}

.pb-prop-textarea:focus {
  outline: 2px solid var(--coar-border-accent, #1a73e8);
  outline-offset: -1px;
}
</style>
