<script setup lang="ts">
/**
 * Live demo of the opt-in Mermaid fence renderer. The viewer is handed
 * `mermaidFenceRenderers`, so the ` ```mermaid ` fenced code block in the source
 * renders as a diagram. The plain ` ```ts ` block stays a normal code block — an
 * unregistered fence language is untouched.
 */
import { computed, ref } from 'vue';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { mermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';
import { parse } from '@cocoar/vue-markdown-core';

// Note: assembled from parts so the ```mermaid fences here are never seen by the
// docs' own vitepress-plugin-mermaid (which only scans the page's own markdown).
const source = [
  '# Release flow',
  '',
  'A `mermaid` fenced block renders as a diagram:',
  '',
  '```mermaid',
  'flowchart LR',
  '  A[Author writes markdown] --> B{Renderer registered?}',
  '  B -->|yes| C[Diagram]',
  '  B -->|no| D[Readable code block]',
  '```',
  '',
  'Other code blocks are untouched:',
  '',
  '```ts',
  'const shipped: boolean = true;',
  '```',
].join('\n');

const doc = computed(() => parse(source));
</script>

<template>
  <ClientOnly>
    <div class="mmd-demo">
      <CoarMarkdown :doc="doc" :fence-renderers="mermaidFenceRenderers" />
    </div>
  </ClientOnly>
</template>

<style scoped>
.mmd-demo {
  padding: 8px 4px;
}
</style>
