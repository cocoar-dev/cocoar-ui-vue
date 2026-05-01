<template>
  <ClientOnly>
    <div class="md-color-demo">
      <div class="md-color-demo__frame">
        <component :is="Editor" v-if="Editor" v-model="value" />
        <div v-else class="md-color-demo__loading">Loading editor…</div>
      </div>
      <div class="md-color-demo__viewer">
        <div class="md-color-demo__viewer-label">Rendered output (`@cocoar/vue-markdown`)</div>
        <component :is="Viewer" v-if="Viewer && doc" :doc="doc" />
      </div>
    </div>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`# Text color round-trip

Select some text and click the **palette** button in the floating toolbar.
Try a swatch, then the custom hex input, then re-select the colored text.

The wire format on disk is plain inline HTML:
<span style="color: #dc2626">red</span>,
<span style="color: #2563eb">blue</span>,
<span style="color: rgb(22, 163, 74)">green via rgb()</span>.

Anything outside the whitelist (other CSS properties, \`url(...)\`, \`var()\`)
is rejected by the sanitizer in both the editor and the viewer.
`);

const Editor = shallowRef<Component | null>(null);
const Viewer = shallowRef<Component | null>(null);
const parse = shallowRef<((md: string) => unknown) | null>(null);

const doc = computed(() => (parse.value ? parse.value(value.value) : null));

onMounted(async () => {
  const [editor, viewer, core] = await Promise.all([
    import('@cocoar/vue-markdown-editor'),
    import('@cocoar/vue-markdown'),
    import('@cocoar/vue-markdown-core'),
  ]);
  Editor.value = editor.CoarMarkdownEditor;
  Viewer.value = viewer.CoarMarkdown;
  parse.value = (md: string) => core.parse(md);
});
</script>

<style scoped>
.md-color-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--coar-spacing-m);
}

.md-color-demo__frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-color-demo__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-color-demo__viewer {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: auto;
  padding: var(--coar-spacing-m);
  background: var(--coar-background-neutral-primary);
}

.md-color-demo__viewer-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary);
  margin-bottom: var(--coar-spacing-s);
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

@media (max-width: 720px) {
  .md-color-demo {
    grid-template-columns: 1fr;
  }
}
</style>
