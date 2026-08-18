<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CoarOverlayHost } from '@cocoar/vue-ui';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';
import {
  CoarMarkdownEditor,
  CoarMarkdownEditorGroup,
  CoarMarkdownToolbar,
  type CoarMarkdownEditorToolEntry,
} from '@cocoar/vue-markdown-editor';
import { composerEmbeds } from './embed-registry';
import { picker, requestedBuilderPageId } from './page-store';
import PagePicker from './PagePicker.vue';
import PageLibrary from './PageLibrary.vue';
import PageBuilderScreen from './PageBuilderScreen.vue';

type Screen = 'document' | 'pages' | 'builder';
type DocumentMode = 'template' | 'fill';

const screen = ref<Screen>('document');
const documentMode = ref<DocumentMode>('fill');
const builderPageId = ref<string | null>(null);

const markdown = ref(`# Jour Fixe · Product & Platform

:::field{id=introduction label="Einleitung" placeholder="Einleitung ergänzen …"}

:::page{id=agenda page=jour-fixe-canvas version=1}

## Abschluss

:::field{id=closing label="Abschlussnotiz" placeholder="Abschlussnotiz ergänzen …"}
`);

const doc = computed(() => parse(markdown.value));
const rootTools: CoarMarkdownEditorToolEntry[] = [
  'bold', 'italic', 'strikethrough', 'inlineCode', 'textColor', 'headings',
  'divider', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'horizontalRule',
  'divider', 'codeBlock', 'table', 'image',
  { flyout: ['embed:field', 'embed:page'], label: 'Insert', icon: 'plus' },
  'divider', 'clearFormatting', 'undo', 'redo',
];

watch(requestedBuilderPageId, (pageId) => {
  if (!pageId) return;
  builderPageId.value = pageId;
  screen.value = 'builder';
  requestedBuilderPageId.value = null;
});

function showPages(): void {
  screen.value = 'pages';
}

function backFromBuilder(): void {
  screen.value = 'pages';
  builderPageId.value = null;
}
</script>

<template>
  <div class="poc-app">
    <header class="app-header">
      <button type="button" class="brand" @click="screen = 'document'">
        <span class="brand__mark">C</span>
        <span><strong>Document Composer</strong><small>Markdown × Pages · proof of concept</small></span>
      </button>
      <nav aria-label="Primary navigation">
        <button type="button" :class="{ active: screen === 'document' }" @click="screen = 'document'">Document</button>
        <button type="button" :class="{ active: screen === 'pages' || screen === 'builder' }" @click="showPages">Pages</button>
      </nav>
      <div class="status-pill"><i /> Local POC</div>
    </header>

    <main v-if="screen === 'document'" class="document-screen">
      <CoarMarkdownEditorGroup>
        <section class="document-topbar">
          <div class="document-mode" aria-label="Document mode">
            <button type="button" :class="{ active: documentMode === 'template' }" @click="documentMode = 'template'">Template</button>
            <button type="button" :class="{ active: documentMode === 'fill' }" @click="documentMode = 'fill'">Fill document</button>
          </div>
          <div class="document-context">
            <span>{{ documentMode === 'template' ? 'Editing the Markdown template' : 'Editing document values only' }}</span>
            <button type="button" class="text-button" @click="showPages">Manage pages →</button>
          </div>
        </section>

        <section class="shared-toolbar-frame">
          <div class="shared-toolbar-label">
            <span>Shared toolbar</span>
            <small>follows the focused Markdown editor</small>
          </div>
          <CoarMarkdownToolbar position="top" />
        </section>

        <div class="document-workspace" :class="`document-workspace--${documentMode}`">
          <aside class="document-rail">
            <span>Document anatomy</span>
            <ol>
              <li><i class="plain" />Markdown root</li>
              <li><i class="page" />Page reference</li>
              <li><i class="field" />Markdown values</li>
            </ol>
            <p v-if="documentMode === 'template'">The Page is atomic here. Open it in the full builder instead of nesting authoring tools.</p>
            <p v-else>The template structure is read-only. Its text slots — at root level and inside Pages — remain editable.</p>
          </aside>

          <article class="document-paper">
            <CoarMarkdownEditor
              v-if="documentMode === 'template'"
              v-model="markdown"
              toolbar-mode="external"
              toolbar-position="top"
              source-toggle
              flavor="cocoar"
              :embeds="composerEmbeds"
              :tools="rootTools"
            />
            <div v-else class="runtime-document">
              <CoarMarkdown :doc="doc" :embeds="composerEmbeds" />
            </div>
          </article>
        </div>
      </CoarMarkdownEditorGroup>
    </main>

    <PageLibrary v-else-if="screen === 'pages'" @back="screen = 'document'" />
    <PageBuilderScreen v-else-if="screen === 'builder' && builderPageId" :page-id="builderPageId" @back="backFromBuilder" />

    <PagePicker v-if="picker.open" />
    <CoarOverlayHost />
  </div>
</template>
