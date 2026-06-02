<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarTree, CoarTreeNodeLabel, CoarIcon, CoarSpinner, CoarBreadcrumb, CoarBreadcrumbItem,
} from '@cocoar/vue-ui';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import {
  CoarDocumentViewer,
  imageSource,
  type CoarDocumentViewerTool,
} from '@cocoar/vue-document-viewer';
import '@cocoar/vue-document-viewer/styles';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
  type OpenTab,
} from '@cocoar/vue-file-explorer-core';

const IMAGE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="100%" height="100%" fill="#eff6ff"/>
  <text x="400" y="240" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="#1e3a8a">logo.svg</text>
  <text x="400" y="290" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#475569">Rendered via CoarDocumentViewer · imageSource()</text>
</svg>`,
)}`;

const initialTree: Asset[] = [
  { id: 'src', name: 'src', kind: 'folder', parentId: null },
  { id: 'u',   name: 'utils.ts', kind: 'file', parentId: 'src' },
  { id: 'm',   name: 'main.ts',  kind: 'file', parentId: 'src' },
  { id: 'docs', name: 'docs', kind: 'folder', parentId: null },
  { id: 'r',   name: 'README.md', kind: 'file', parentId: 'docs' },
  { id: 'assets', name: 'assets', kind: 'folder', parentId: null },
  { id: 'l',   name: 'logo.svg', kind: 'file', parentId: 'assets' },
];
const store = createInMemoryAssetStore({
  initialTree,
  initialContent: {
    u: `export function clamp(n: number, lo: number, hi: number): number {\n  return Math.min(hi, Math.max(lo, n));\n}\n`,
    m: `import { clamp } from './utils';\n\nconst safe = clamp(42, 0, 10);\nconsole.log(safe);\n`,
    r: `# File Explorer\n\nClick around — every file type dispatches to the right editor:\n\n- **.ts** → \`CoarScriptEditor\` (Monaco)\n- **.md** → \`CoarMarkdownEditor\` (Milkdown)\n- **.svg / .png** → \`CoarDocumentViewer\` with \`imageSource()\`\n\nEdit anything: the dirty marker appears, **Ctrl+S** saves.\n`,
    l: IMAGE_URL,
  },
});
const fe = useFileExplorer({
  store,
  initialExpandedIds: ['src', 'docs', 'assets'],
});

const busy = computed(() => new Set([...fe.loadingNodes.value, ...fe.savingNodes.value]));
const imageSrc = computed(() =>
  fe.activeTab.value?.editor === 'image'
    ? imageSource({ url: fe.activeTab.value.content })
    : null,
);

// ── DocumentViewer config — held OUTSIDE the editor v-if branch so it
// persists across file swaps. Open the left rail once and it stays open
// when the user clicks another image, switches to .ts, then back to .svg.
const viewerSidebarOpen = ref(false);
const viewerAnnotationsPanelOpen = ref(false);
const viewerTools: CoarDocumentViewerTool[] = [
  'sidebar-toggle',
  'annotations-panel',
  'separator',
  'zoom-out',
  'zoom-reset',
  'zoom-in',
  'separator',
  'fit-width',
  'fit-page',
];

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    void fe.saveActive();
  }
}
function activate(tab: OpenTab) { fe.activeId.value = tab.id; }
function closeFromBar(e: MouseEvent, id: string) {
  e.stopPropagation();
  fe.closeTab(id);
}
</script>

<template>
  <div class="demo" tabindex="0" @keydown="onKeydown">
    <aside class="tree">
      <CoarTree
        :nodes="fe.rootNodes.value"
        :get-id="fe.getId"
        :get-children="fe.getChildren"
        :get-label="fe.getLabel"
        :is-expandable="fe.isExpandable"
        v-model:expanded="fe.expanded.value"
        v-model:selected="fe.selectedId.value"
        @activate="fe.activateNode"
      >
        <template #default="{ node }">
          <CoarSpinner v-if="busy.has(node.id)" size="xs" />
          <CoarIcon
            v-else
            :name="node.kind === 'folder'
              ? 'folder'
              : node.name.endsWith('.md') ? 'file-text'
              : node.name.endsWith('.svg') || node.name.endsWith('.png') ? 'image'
              : 'file'"
          />
          <CoarTreeNodeLabel :label="node.name" />
        </template>
      </CoarTree>
    </aside>

    <section class="pane">
      <div class="tabs">
        <button
          v-for="tab in fe.openTabs.value"
          :key="tab.id"
          class="tab"
          :class="{ active: tab.id === fe.activeId.value, preview: !tab.pinned }"
          @click="activate(tab)"
          @dblclick="fe.pinTab(tab.id)"
          :title="tab.pinned ? '' : 'Double-click to pin'"
        >
          <span class="name">{{ tab.name }}</span>
          <span
            v-if="fe.isDirty(tab)"
            class="dot"
            :title="'Unsaved — Ctrl+S to save'"
          >●</span>
          <span v-else class="x" @click="closeFromBar($event, tab.id)" :title="'Close'">×</span>
        </button>
      </div>

      <div v-if="fe.activeTab.value" class="bc">
        <CoarBreadcrumb separator="›" size="s" aria-label="File path">
          <CoarBreadcrumbItem
            v-for="(name, i) in fe.breadcrumbPath.value"
            :key="i"
            :active="i === fe.breadcrumbPath.value.length - 1"
          >
            {{ name }}
          </CoarBreadcrumbItem>
        </CoarBreadcrumb>
        <span v-if="fe.isDirty(fe.activeTab.value)" class="bc-dirty">· unsaved (Ctrl+S to save)</span>
      </div>

      <div class="editor">
        <template v-if="fe.activeTab.value && !fe.loadingNodes.value.has(fe.activeTab.value.id)">
          <CoarScriptEditor
            v-if="fe.activeTab.value.editor === 'script'"
            :model-value="fe.activeTab.value.content"
            :language="fe.activeTab.value.language ?? 'plaintext'"
            @update:model-value="(v: string) => fe.setContent(fe.activeTab.value!.id, v)"
            style="height: 100%"
          />
          <CoarMarkdownEditor
            v-else-if="fe.activeTab.value.editor === 'markdown'"
            :model-value="fe.activeTab.value.content"
            @update:model-value="(v: string) => fe.setContent(fe.activeTab.value!.id, v)"
          />
          <CoarDocumentViewer
            v-else-if="fe.activeTab.value.editor === 'image' && imageSrc"
            :source="imageSrc"
            :tools="viewerTools"
            :show-thumbnails="true"
            :show-annotations-panel="true"
            v-model:sidebar-open="viewerSidebarOpen"
            v-model:annotations-panel-open="viewerAnnotationsPanelOpen"
          />
        </template>
        <div v-else-if="fe.activeTab.value" class="loading">Loading {{ fe.activeTab.value.name }}…</div>
        <div v-else class="empty">Select a file from the tree.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 560px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  outline: none;
  font-family: var(--vp-font-family-base);
}
.tree {
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 8px 4px;
  overflow: auto;
}
.pane { display: flex; flex-direction: column; min-width: 0; }
.tabs {
  display: flex; flex-wrap: nowrap; overflow-x: auto;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border: 0; outline: none; background: transparent; cursor: pointer;
  border-right: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 12px;
  position: relative;
  white-space: nowrap;
}
.tab.active { background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.tab.active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: var(--coar-color-accent, #f59e0b);
}
.tab.preview .name { font-style: italic; }
.tab .dot { color: var(--coar-color-accent, #f59e0b); font-size: 10px; }
.tab .x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 3px;
  opacity: 0.6;
}
.tab .x:hover { background: var(--vp-c-default-soft); opacity: 1; }
.bc {
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
  padding: 4px 12px;
  min-height: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
/* VitePress' .vp-doc gives every <li>+<li> an 8px margin-top — reset it
   so the breadcrumb's <ol> doesn't grow taller than its own line-height. */
.bc :deep(.coar-breadcrumb-list li) { margin: 0; padding: 0; }
.bc-dirty {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--coar-text-accent-primary, #f59e0b);
}
.editor { flex: 1; min-height: 0; position: relative; }
.editor > * { height: 100%; }
/* CoarScriptEditor draws its own 1px border on the root — collides with
   the demo's outer wrapper border. Markdown editor + DocumentViewer don't,
   so suppress the script-editor one here for visual parity. */
.editor :deep(.coar-script-editor) { border: 0; }
.empty, .loading {
  height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
