<script setup lang="ts">
/**
 * End-to-end embed demo: the SAME markdown drives the editor (left) and the
 * viewer (right), both handed the SAME registry. The editor folds `:::stat{…}`
 * into a live, editable NodeView (configure it, or insert a new one from the
 * Insert ▾ flyout in the left rail); the viewer renders it read-only. Edits
 * round-trip through the markdown.
 */
import { computed, markRaw, onMounted, ref, shallowRef, type Component } from 'vue';
import { CoarMarkdown, type EmbedRegistry } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';
import type { CoarMarkdownEditorToolEntry } from '@cocoar/vue-markdown-editor';
import DocStat from './DocStat.vue';
import DocStatConfig from './DocStatConfig.vue';

// key → { viewer (read-only), editor (editable), insert (toolbar item) }.
const embeds: EmbedRegistry = {
  stat: {
    viewer: markRaw(DocStat),
    editor: markRaw(DocStatConfig),
    insert: { label: 'Stat card', icon: 'layout-grid' },
  },
};

// Custom toolbar: array order = position; the Insert flyout carries `embed:stat`.
const tools: CoarMarkdownEditorToolEntry[] = [
  'bold', 'italic', 'headings',
  'divider',
  { flyout: ['embed:stat'], label: 'Insert', icon: 'plus' },
  'divider',
  'undo', 'redo',
];

const value = ref(`# Quarterly report

Edit the metric in the editor — the viewer updates from the same markdown.

:::stat{label="Revenue" value="1,284" trend="+12.4%" tone=positive}

Regular markdown keeps working around the embed.
`);

const doc = computed(() => parse(value.value, { gfm: true }));

const Editor = shallowRef<Component | null>(null);
onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<template>
  <ClientOnly>
    <div class="emb-demo">
      <div class="emb-demo__col">
        <div class="emb-demo__label">Editor</div>
        <div class="emb-demo__frame">
          <component
            :is="Editor"
            v-if="Editor"
            v-model="value"
            flavor="cocoar"
            :embeds="embeds"
            :tools="tools"
            toolbar-mode="both"
          />
          <div v-else class="emb-demo__loading">Loading editor…</div>
        </div>
      </div>
      <div class="emb-demo__col">
        <div class="emb-demo__label">Viewer</div>
        <div class="emb-demo__frame emb-demo__frame--viewer">
          <CoarMarkdown :doc="doc" :embeds="embeds" />
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.emb-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 720px) {
  .emb-demo { grid-template-columns: 1fr; }
}
.emb-demo__col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.emb-demo__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary, #999);
}
.emb-demo__frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: var(--coar-radius-xl, 12px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.emb-demo__frame--viewer {
  overflow: auto;
  padding: 12px 16px;
  background: var(--coar-background-neutral-primary, #fff);
}
.emb-demo__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #999);
  font-size: 13px;
}
</style>
