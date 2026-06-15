<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        source-toggle
        toolbar-mode="fixed"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      Use the <strong>Source</strong> button at the top of the toolbar. In Source mode you
      edit the whole Markdown document as raw text — including the frontmatter YAML —
      and the toolbar's <strong>Rendered</strong> button switches back.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`---
title: Release notes
status: draft
---

# Heading

Some **body** text. Flip to *Source* to edit the raw Markdown
(and the YAML above) directly.
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
