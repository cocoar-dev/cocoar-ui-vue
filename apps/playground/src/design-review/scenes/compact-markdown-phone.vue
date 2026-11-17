<script setup lang="ts">
// A phone-sized composition (stories.json: modes ["mobile"], 390 × 844):
// editor with a fixed toolbar, a short document, a form row with an error and
// a zoomable diagram. Profile-neutral: the gallery (one iframe per profile,
// Mermaid's config is page-global) or a story wrapper sets the profile class.
import { ref } from 'vue';
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import { CoarMermaidDiagram } from '@cocoar/vue-mermaid';
// No playground alias for @cocoar/vue-markdown-form: imported by path.
import { CoarMarkdownForm } from '../../../../../packages/markdown-form/src/index';
import '../../../../../packages/markdown-form/styles/markdown-form.css';

const text = ref('## Notes\n\nSome **bold** text and `code`.');
const doc = parse(`### Summary

Reading text on a phone, with a [link](https://example.com).

| Item | Qty |
| --- | --- |
| Paper | 2 |
`);
const template = '**Name:** :field{id=name type=text layout=row width=fill required placeholder="Full name"}';
</script>

<template>
  <div class="vs-stack" style="align-items: stretch">
    <div style="height: 180px; border: 1px solid var(--coar-border-neutral)">
      <CoarMarkdownEditor v-model="text" toolbar-mode="fixed" toolbar-position="top" />
    </div>
    <CoarMarkdown :doc="doc" />
    <CoarMarkdownForm :template="template" :values="{}" show-errors />
    <div style="--coar-mermaid-height: 160px">
      <CoarMermaidDiagram code="flowchart LR&#10;  A[Draft] --> B[Done]" zoomable />
    </div>
  </div>
</template>