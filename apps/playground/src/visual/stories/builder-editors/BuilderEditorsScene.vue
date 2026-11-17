<script setup lang="ts">
// The same real renderers and authored data in each profile. No replacement renderers,
// external assets, diagnostic suppression or CSS that restyles the components.
import './monaco';
import { ref } from 'vue';
import {
  CoarPageBuilder,
  CURRENT_PAGE_SCHEMA_VERSION,
  type PageNode,
} from '@cocoar/vue-page-builder';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';
import { createMermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';

const schema = ref<PageNode>({
  id: 'root',
  type: 'page',
  schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
  style: { padding: '24px', gap: '16px' },
  children: [
    { id: 'heading', type: 'heading', props: { text: 'Kontoeinstellungen', level: 2 } },
    {
      id: 'name',
      type: 'text-input',
      name: 'displayName',
      props: { label: 'Anzeigename', placeholder: 'Vor- und Nachname' },
    },
    { id: 'save', type: 'button', props: { label: 'Speichern' } },
  ],
});
const source = '{\n  "reviewer": "Ada Lovelace",\n  "visits": 12\n}';
const markdown = ref(
  '## Überprüfung\n\nSome **bold** text and `code`.\n\n- First task\n- Second task',
);
const diagram = parse('```mermaid\nflowchart LR\n  A[Entwurf] --> B[Überprüfung]\n```');
const fences = createMermaidFenceRenderers();
</script>

<template>
  <section class="vs-section" data-renderer="builder" style="height: 540px">
    <CoarPageBuilder v-model="schema" />
  </section>
  <section class="vs-section renderer-columns">
    <div data-renderer="script">
      <h2 class="vs-title">Monaco · JSON</h2>
      <CoarScriptEditor :model-value="source" language="json" :height="200" readonly />
    </div>
    <div data-renderer="markdown">
      <h2 class="vs-title">Markdown editor</h2>
      <div style="height: 200px">
        <CoarMarkdownEditor v-model="markdown" toolbar-mode="fixed" />
      </div>
    </div>
  </section>
  <section class="vs-section" data-renderer="mermaid">
    <h2 class="vs-title">Markdown → Mermaid</h2>
    <CoarMarkdown :doc="diagram" :fence-renderers="fences" />
  </section>
</template>

<style scoped>
.renderer-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
}
</style>
