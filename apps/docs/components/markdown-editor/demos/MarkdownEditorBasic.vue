<template>
  <ClientOnly>
    <div class="md-frame">
      <component :is="Editor" v-if="Editor" v-model="value" />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`# Try me

Select some text to see the **floating toolbar**, or insert a:

| Column A | Column B |
|----------|----------|
| Edit me  | Edit me  |

> Blockquote works too.
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
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
