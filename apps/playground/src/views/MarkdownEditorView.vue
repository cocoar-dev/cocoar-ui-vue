<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { CoarMarkdownEditor, type CoarMarkdownEditorTool } from '@cocoar/vue-markdown-editor';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';

const containerSize = ref<'full' | 'medium' | 'small' | 'modal'>('full');
const toolbarMode = ref<'floating' | 'fixed' | 'both'>('floating');
const toolbarPosition = ref<'left' | 'right'>('left');
const readonly = ref(false);
const toolsPreset = ref<'all' | 'minimal' | 'no-tables'>('all');
const darkMode = ref(false);
const showViewer = ref(true);

// Mirrors the script-editor playground: toggle `.dark-mode` on <html> so the
// Cocoar token override kicks in. Reset on unmount so other routes start light.
watch(darkMode, (v) => {
  document.documentElement.classList.toggle('dark-mode', v);
}, { immediate: true });
onBeforeUnmount(() => {
  document.documentElement.classList.remove('dark-mode');
});

const tools = computed<CoarMarkdownEditorTool[] | undefined>(() => {
  if (toolsPreset.value === 'all') return undefined;
  if (toolsPreset.value === 'minimal') {
    return ['bold', 'italic', 'bulletList', 'orderedList', 'outdent', 'indent', 'clearFormatting'];
  }
  // no-tables
  return ['bold', 'italic', 'strikethrough', 'inlineCode', 'headings',
    'bulletList', 'orderedList', 'taskList', 'outdent', 'indent',
    'blockquote', 'horizontalRule', 'codeBlock', 'clearFormatting',
    'undo', 'redo'];
});

const value = ref(`# Hello CoarMarkdownEditor

This page renders the **packaged** \`<CoarMarkdownEditor>\` component (extracted from the prototype).

## Features

- **Bold**, *italic*, ~~strikethrough~~
- <span style="color: #dc2626">Text color</span> via the palette button — try <span style="color: #2563eb">a swatch</span> or <span style="color: rgb(22, 163, 74)">custom hex/rgb</span>
- Lists (ordered and unordered)
- [Links](https://example.com)
- \`inline code\`

## GFM Table

| Feature | Status |
|---------|--------|
| Tables | Works |
| Task lists | Works |
| Strikethrough | Works |

## Task List

- [x] Install Milkdown
- [x] Create prototype
- [x] Extract to package
- [ ] Add link dialog, image upload, edge handles

> Try the \`v-model\` round-trip — the markdown below updates as you type.

\`\`\`typescript
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';

const value = ref('# Hello');

function greet(name: string): string {
  return \`Hello \${name}\`;
}
\`\`\`
`);

const containerStyles: Record<string, Record<string, string>> = {
  full: { width: '100%', height: '100%' },
  medium: { width: '600px', height: '400px' },
  small: { width: '360px', height: '300px' },
  modal: { width: '480px', height: '260px' },
};

// Live-render the editor's markdown through the standalone viewer so the
// editor↔viewer parity is verifiable side-by-side. `parse` is pure and
// quick — fine to recompute on every keystroke for the playground.
const viewerDoc = computed(() => parse(value.value));

// Test hooks — exposed on window for the Playwright suite. Lets specs read/write
// the markdown without scraping the details `<pre>` and toggle UI state without
// hunting for buttons by text.
export interface MarkdownPlaygroundHooks {
  getMarkdown(): string;
  setMarkdown(md: string): void;
  setToolbarMode(m: 'floating' | 'fixed' | 'both'): void;
  setToolsPreset(p: 'all' | 'minimal' | 'no-tables'): void;
  setReadonly(r: boolean): void;
}

onMounted(() => {
  (window as unknown as { __playground: MarkdownPlaygroundHooks }).__playground = {
    getMarkdown: () => value.value,
    setMarkdown: (md) => { value.value = md; },
    setToolbarMode: (m) => { toolbarMode.value = m; },
    setToolsPreset: (p) => { toolsPreset.value = p; },
    setReadonly: (r) => { readonly.value = r; },
  };
});
</script>

<template>
  <div class="md-playground">
    <!-- Controls -->
    <div class="md-controls">
      <span class="md-controls__label">Container:</span>
      <button
        v-for="size in (['full', 'medium', 'small', 'modal'] as const)"
        :key="size"
        :class="['md-controls__btn', { 'md-controls__btn--active': containerSize === size }]"
        @click="containerSize = size"
      >
        {{ size }}
      </button>

      <span class="md-controls__label">Toolbar:</span>
      <button
        v-for="mode in (['floating', 'fixed', 'both'] as const)"
        :key="mode"
        :class="['md-controls__btn', { 'md-controls__btn--active': toolbarMode === mode }]"
        @click="toolbarMode = mode"
      >
        {{ mode }}
      </button>

      <template v-if="toolbarMode !== 'floating'">
        <span class="md-controls__label">Position:</span>
        <button
          v-for="pos in (['left', 'right'] as const)"
          :key="pos"
          :class="['md-controls__btn', { 'md-controls__btn--active': toolbarPosition === pos }]"
          @click="toolbarPosition = pos"
        >
          {{ pos }}
        </button>
      </template>

      <label class="md-controls__readonly">
        <input v-model="readonly" type="checkbox" />
        readonly
      </label>

      <label class="md-controls__readonly">
        <input v-model="darkMode" type="checkbox" />
        dark-mode
      </label>

      <label class="md-controls__readonly">
        <input v-model="showViewer" type="checkbox" />
        viewer pane
      </label>

      <span class="md-controls__label">Tools:</span>
      <button
        v-for="preset in (['all', 'minimal', 'no-tables'] as const)"
        :key="preset"
        :class="['md-controls__btn', { 'md-controls__btn--active': toolsPreset === preset }]"
        @click="toolsPreset = preset"
      >
        {{ preset }}
      </button>
    </div>

    <!-- Editor + Viewer (side-by-side when viewer pane is enabled) -->
    <div :class="['md-split', { 'md-split--single': !showViewer }]">
      <div class="md-pane">
        <div class="md-pane__label">Editor</div>
        <div class="md-editor-frame" :style="containerStyles[containerSize]">
          <CoarMarkdownEditor
            v-model="value"
            :readonly="readonly"
            :toolbar-mode="toolbarMode"
            :toolbar-position="toolbarPosition"
            :tools="tools"
          />
        </div>
      </div>
      <div v-if="showViewer" class="md-pane">
        <div class="md-pane__label">Viewer (<code>&lt;CoarMarkdown&gt;</code>)</div>
        <div class="md-viewer-frame" :style="containerStyles[containerSize]">
          <CoarMarkdown :doc="viewerDoc" />
        </div>
      </div>
    </div>

    <!-- Markdown Output -->
    <details class="md-output">
      <summary class="md-output__summary">Raw Markdown Output (v-model)</summary>
      <pre class="md-output__pre">{{ value }}</pre>
    </details>
  </div>
</template>

<style scoped>
.md-playground {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  padding: 16px;
}

.md-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.md-controls__label {
  font-size: 13px;
  font-weight: 600;
  margin-left: 12px;
}
.md-controls__label:first-child { margin-left: 0; }

.md-controls__btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--coar-border-neutral);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.md-controls__btn--active {
  background: var(--coar-background-accent-primary);
  color: white;
}

.md-controls__readonly {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.md-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}
.md-split--single { grid-template-columns: 1fr; }

.md-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 6px;
}

.md-pane__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary);
}
.md-pane__label code {
  font-size: 11px;
  font-weight: 600;
  background: var(--coar-background-neutral-secondary);
  padding: 1px 4px;
  border-radius: 3px;
}

.md-editor-frame,
.md-viewer-frame {
  border: 1px solid var(--coar-border-neutral);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
}
.md-viewer-frame {
  overflow: auto;
  padding: 12px 16px;
  background: var(--coar-background-neutral-primary);
}

/* When container is 'full', let frames grow within their pane */
.md-pane .md-editor-frame[style*="100%"],
.md-pane .md-viewer-frame[style*="100%"] {
  flex-shrink: 1;
  flex: 1 1 auto;
}

.md-output { flex-shrink: 0; }

.md-output__summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.md-output__pre {
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
