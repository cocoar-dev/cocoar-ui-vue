<template>
  <ClientOnly>
    <div class="md-frame">
      <component :is="Editor" v-if="Editor" v-model="value" />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      The <code>---</code> YAML block at the top renders as muted, italic
      <code>key: value</code> lines — not a collapsed heading. Edit the body and watch the
      raw <code>v-model</code>: the frontmatter is preserved untouched on save.
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
author: Jane Doe
tags:
  - editor
  - markdown
---

# Heading

Body text. Try editing me — the metadata above stays put.
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
