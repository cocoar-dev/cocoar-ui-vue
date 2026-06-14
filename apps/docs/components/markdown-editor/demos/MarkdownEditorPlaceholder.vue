<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        :placeholder="placeholder"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      The hint above is a decoration only. Until you type, the raw
      <code>v-model</code> stays an empty string — nothing gets persisted.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model) — <code>{{ value.length }}</code> chars</summary>
      <pre>{{ value || '(empty)' }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref('');

// The placeholder is itself Markdown — it renders through the same viewer the
// editor uses for content, so **bold**, lists and headings all work.
const placeholder = `**Describe the change…**

- What changed?
- Why does it matter?`;

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 240px;
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
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
