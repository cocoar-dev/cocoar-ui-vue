<script setup lang="ts">
import { computed } from 'vue';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';
import type { ElementNode } from '@cocoar/vue-page-builder';
import type { MarkdownFieldProps } from './MarkdownFieldRenderer.vue';

const props = defineProps<{ node: ElementNode<string, MarkdownFieldProps> }>();
const source = computed(() => String(props.node.defaultValue || props.node.props.placeholder || '*Markdown field*'));
const doc = computed(() => parse(source.value));
</script>

<template>
  <div class="poc-markdown-preview">
    <CoarMarkdown :doc="doc" />
  </div>
</template>

<style scoped>
.poc-markdown-preview {
  min-height: 90px;
  padding: 10px 12px;
  overflow: hidden;
  border: 1px dashed var(--coar-border-neutral);
  border-radius: var(--coar-radius-m);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-secondary);
}
</style>
