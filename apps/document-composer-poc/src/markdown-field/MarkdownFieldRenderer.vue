<script setup lang="ts">
import { computed } from 'vue';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import { usePageElement, type ElementNode } from '@cocoar/vue-page-builder';
import { markdownValueTools } from '../markdown-value-tools';

export interface MarkdownFieldProps {
  [key: string]: unknown
  placeholder?: string
}

const props = defineProps<{ node: ElementNode<string, MarkdownFieldProps> }>();
const page = usePageElement();
const name = computed(() => props.node.name);
const value = computed(() => name.value ? String(page.getValue(name.value) ?? '') : '');

function update(next: string): void {
  if (name.value) page.setValue(name.value, next);
}
</script>

<template>
  <div class="poc-markdown-field">
    <CoarMarkdownEditor
      :model-value="value"
      :placeholder="node.props.placeholder"
      :tools="markdownValueTools"
      toolbar-mode="external"
      toolbar-position="top"
      flavor="gfm"
      @update:model-value="update"
    />
  </div>
</template>

<style scoped>
.poc-markdown-field {
  width: 100%;
  height: 100%;
  min-height: 120px;
  overflow: hidden;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-m);
  background: var(--coar-background-neutral-primary);
}
</style>
