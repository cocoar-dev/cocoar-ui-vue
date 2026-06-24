<script setup lang="ts">
/**
 * Dedicated table testbed for `<CoarMarkdownEditor>`.
 *
 * Tables are where the editor still has gaps (see the on-page checklist), and
 * the hover-based **edge handles** (select / delete a whole row or column by
 * pointing at its border) will be prototyped here. Defaults to `both` toolbar
 * mode so the sidebar **Insert Table** button is always reachable.
 */
import { computed, onMounted, ref } from 'vue';
import { CoarMarkdownEditor, type CoarMarkdownFlavor } from '@cocoar/vue-markdown-editor';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';

const toolbarMode = ref<'floating' | 'fixed' | 'both'>('both');
const toolbarPosition = ref<'left' | 'right'>('left');
const flavor = ref<CoarMarkdownFlavor>('cocoar');
const showViewer = ref(true);

const value = ref(`# Table testbed

Prose before the table. Click **Insert Table** in the sidebar to create one,
or edit the tables below (cursor inside a cell → row/column ops in the toolbar).

## Small (3×3)

| Feature | Status | Notes |
|---------|--------|-------|
| Create  | sidebar only | not in floating mode |
| Edit    | works | add/remove row + col |
| Align   | missing | \`setAlignCommand\` not wired |

## With column alignment (GFM \`:--\`, \`:-:\`, \`--:\`)

| Left | Center | Right |
|:-----|:------:|------:|
| a    | b      | c     |
| longer cell | x | 42 |

## Wide table (horizontal scroll)

| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 |
|----|----|----|----|----|----|----|----|
| 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  |

Prose after the table.
`);

const viewerDoc = computed(() => parse(value.value));

// Test hook for driving the editor from DevTools / specs.
onMounted(() => {
  (window as unknown as { __tablesPlayground: { getMarkdown(): string; setMarkdown(md: string): void } }).__tablesPlayground = {
    getMarkdown: () => value.value,
    setMarkdown: (md) => { value.value = md; },
  };
});
</script>

<template>
  <div class="tbl-playground">
    <div class="tbl-controls">
      <span class="tbl-controls__label">Toolbar:</span>
      <button
        v-for="mode in (['floating', 'fixed', 'both'] as const)"
        :key="mode"
        :class="['tbl-controls__btn', { 'tbl-controls__btn--active': toolbarMode === mode }]"
        @click="toolbarMode = mode"
      >
        {{ mode }}
      </button>

      <template v-if="toolbarMode !== 'floating'">
        <span class="tbl-controls__label">Position:</span>
        <button
          v-for="pos in (['left', 'right'] as const)"
          :key="pos"
          :class="['tbl-controls__btn', { 'tbl-controls__btn--active': toolbarPosition === pos }]"
          @click="toolbarPosition = pos"
        >
          {{ pos }}
        </button>
      </template>

      <span class="tbl-controls__label">Flavor:</span>
      <button
        v-for="f in (['commonmark', 'gfm', 'cocoar'] as const)"
        :key="f"
        :class="['tbl-controls__btn', { 'tbl-controls__btn--active': flavor === f }]"
        @click="flavor = f"
      >
        {{ f }}
      </button>

      <label class="tbl-controls__check">
        <input v-model="showViewer" type="checkbox" />
        viewer pane
      </label>
    </div>

    <div class="tbl-checklist">
      <strong>Table status</strong> — ✅ create (size picker + type <code>|3x4|</code>+space) · ✅ add/remove row+col ·
      ✅ column align L/C/R · ✅ delete whole table · ❌ hover edge-handles (row/col select)<br />
      <strong>Flavor</strong> — <code>commonmark</code> hides tables/strike/tasks/color (and won't parse them);
      <code>gfm</code> adds GFM; <code>cocoar</code> adds text color. Try switching with a table in the doc.
    </div>

    <div :class="['tbl-split', { 'tbl-split--single': !showViewer }]">
      <div class="tbl-pane">
        <div class="tbl-pane__label">Editor</div>
        <div class="tbl-editor-frame">
          <!-- `:key="flavor"` remounts on flavor change so the plugin set
               (the hard part of the contract) re-registers — see flavor docs. -->
          <CoarMarkdownEditor
            :key="flavor"
            v-model="value"
            :flavor="flavor"
            :toolbar-mode="toolbarMode"
            :toolbar-position="toolbarPosition"
          />
        </div>
      </div>
      <div v-if="showViewer" class="tbl-pane">
        <div class="tbl-pane__label">Viewer (<code>&lt;CoarMarkdown&gt;</code>)</div>
        <div class="tbl-viewer-frame">
          <CoarMarkdown :doc="viewerDoc" />
        </div>
      </div>
    </div>

    <details class="tbl-output">
      <summary class="tbl-output__summary">Raw Markdown Output (v-model)</summary>
      <pre class="tbl-output__pre">{{ value }}</pre>
    </details>
  </div>
</template>

<style scoped>
.tbl-playground {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  padding: 16px;
}

.tbl-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.tbl-controls__label {
  font-size: 13px;
  font-weight: 600;
  margin-left: 12px;
}
.tbl-controls__label:first-child { margin-left: 0; }
.tbl-controls__btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--coar-border-neutral);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.tbl-controls__btn--active {
  background: var(--coar-background-accent-primary);
  color: white;
}
.tbl-controls__check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.tbl-checklist {
  flex-shrink: 0;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-secondary);
}

.tbl-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}
.tbl-split--single { grid-template-columns: 1fr; }

.tbl-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 6px;
}
.tbl-pane__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary);
}
.tbl-pane__label code {
  font-size: 11px;
  font-weight: 600;
  background: var(--coar-background-neutral-secondary);
  padding: 1px 4px;
  border-radius: 3px;
}

.tbl-editor-frame {
  border: 1px solid var(--coar-border-neutral);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.tbl-viewer-frame {
  border: 1px solid var(--coar-border-neutral);
  border-radius: 8px;
  overflow: auto;
  padding: 12px 16px;
  background: var(--coar-background-neutral-primary);
  flex: 1 1 auto;
  min-height: 0;
}

.tbl-output { flex-shrink: 0; }
.tbl-output__summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.tbl-output__pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: 6px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
