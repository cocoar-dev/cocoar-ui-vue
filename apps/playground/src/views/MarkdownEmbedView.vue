<script setup lang="ts">
/**
 * End-to-end demo of the markdown custom-embed mechanism.
 *
 * The same `:::demo{...}` markdown drives BOTH the editor (left) and the viewer
 * (right). Both are handed the SAME embed registry that maps the `demo` key to
 * the standalone `DemoEmbed` component — which has zero markdown dependency. The
 * editor folds the directive into a live NodeView; the viewer renders the same
 * component. Edit the raw markdown (below) or interact with either embed.
 */
import { computed, markRaw, ref } from 'vue';
import {
  CoarMarkdownEditor,
  type CoarMarkdownEditorToolEntry,
} from '@cocoar/vue-markdown-editor';
import { CoarMarkdown, type EmbedRegistry } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';
import DemoEmbed from '../components/DemoEmbed.vue';
import DemoEmbedConfig from '../components/DemoEmbedConfig.vue';

// The registry: key → { viewer (read-only), editor (editable), insert (toolbar) }.
// `markRaw` keeps Vue from making the component definitions reactive. A consumer
// (e.g. Tellify) registers their own here. `insert` defines the toolbar item's
// icon/label (the WHAT); the `tools` config below decides WHERE it appears.
const embeds: EmbedRegistry = {
  demo: {
    viewer: markRaw(DemoEmbed),
    editor: markRaw(DemoEmbedConfig),
    insert: { label: 'Demo dashboard', icon: 'layout-grid' },
  },
};

// Custom toolbar layout: array order = position. A flyout groups built-in AND
// embed refs together; `embed:demo` places the registered embed's insert item.
const tools: CoarMarkdownEditorToolEntry[] = [
  'bold',
  'italic',
  'headings',
  'divider',
  { flyout: ['embed:demo'], label: 'Insert', icon: 'plus' },
  'divider',
  'undo',
  'redo',
];

const value = ref(`# Custom Embeds in Markdown

Authors write a directive; the shared stack renders a registered component —
in the **editor** and the **viewer** alike. Below are two \`:::demo\` embeds.

:::demo{title="Revenue" accent=#6366f1 metric="1,284" trend="+12.4%"}

Regular markdown keeps working around embeds — **bold**, *italic*, lists:

- Round-trips losslessly to \`:::demo{...}\`
- Unknown keys degrade to a placeholder
- The component knows nothing about markdown

:::demo{title="Signups" accent=#16a34a metric="318" trend="+4.1%"}

A made-up key that isn't registered falls back gracefully:

:::unknownthing{foo=bar}
`);

const viewerDoc = computed(() => parse(value.value));
</script>

<template>
  <div class="emb">
    <p class="emb__hint">
      Editing the markdown updates both panes. Click <strong>Interact +1</strong>,
      switch tabs, or toggle the switch inside an embed — it's a live component in
      both the editor and the viewer.
    </p>

    <div class="emb__split">
      <div class="emb__pane">
        <div class="emb__label">Editor (<code>:flavor="cocoar"</code>, <code>:embeds</code>, custom <code>:tools</code>)</div>
        <div class="emb__editor-frame">
          <CoarMarkdownEditor
            v-model="value"
            flavor="cocoar"
            :embeds="embeds"
            :tools="tools"
            toolbar-mode="both"
          />
        </div>
      </div>

      <div class="emb__pane">
        <div class="emb__label">Viewer (<code>&lt;CoarMarkdown :embeds&gt;</code>)</div>
        <div class="emb__viewer-frame">
          <CoarMarkdown :doc="viewerDoc" :embeds="embeds" />
        </div>
      </div>
    </div>

    <details class="emb__output">
      <summary>Raw markdown (v-model) — note the lossless <code>:::demo{...}</code></summary>
      <pre>{{ value }}</pre>
    </details>
  </div>
</template>

<style scoped>
.emb {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  padding: 16px;
}
.emb__hint {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary, #666);
}
.emb__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}
.emb__pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 6px;
}
.emb__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary, #999);
}
.emb__label code {
  font-size: 11px;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  padding: 1px 4px;
  border-radius: 3px;
}
.emb__editor-frame,
.emb__viewer-frame {
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: 8px;
  flex: 1 1 auto;
  min-height: 0;
}
.emb__editor-frame {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.emb__viewer-frame {
  overflow: auto;
  padding: 12px 16px;
  background: var(--coar-background-neutral-primary, #fff);
}
.emb__output {
  flex-shrink: 0;
}
.emb__output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.emb__output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
