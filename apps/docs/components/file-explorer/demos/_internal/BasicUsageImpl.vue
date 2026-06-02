<script setup lang="ts">
import { CoarTree, CoarTreeNodeLabel, CoarIcon } from '@cocoar/vue-ui';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
} from '@cocoar/vue-file-explorer-core';

const initialTree: Asset[] = [
  { id: 's', name: 'src', kind: 'folder', parentId: null },
  { id: 'u', name: 'utils.ts', kind: 'file', parentId: 's' },
  { id: 'm', name: 'main.ts', kind: 'file', parentId: 's' },
  { id: 'd', name: 'docs', kind: 'folder', parentId: null },
  { id: 'r', name: 'README.md', kind: 'file', parentId: 'd' },
];
const initialContent = {
  u: 'export const clamp = (n: number, lo: number, hi: number): number =>\n  Math.min(hi, Math.max(lo, n));\n',
  m: "import { clamp } from './utils';\nconsole.log(clamp(5, 0, 10));\n",
  r: '# Hello\n\nTry clicking files in the tree.\n',
};
const store = createInMemoryAssetStore({ initialTree, initialContent });
const fe = useFileExplorer({ store });
</script>

<template>
  <div class="demo">
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
          <CoarIcon :name="node.kind === 'folder' ? 'folder' : 'file'" />
          <CoarTreeNodeLabel :label="node.name" />
        </template>
      </CoarTree>
    </aside>
    <main class="editor">
      <div v-if="fe.activeTab.value" class="path">
        {{ fe.breadcrumbPath.value.join(' / ') }}
        <span v-if="fe.isDirty(fe.activeTab.value)" class="dirty">●</span>
      </div>
      <textarea
        v-if="fe.activeTab.value"
        class="buf"
        :value="fe.activeTab.value.content"
        @input="e => fe.setContent(fe.activeTab.value!.id, (e.target as HTMLTextAreaElement).value)"
      />
      <div v-else class="empty">Select a file to open it.</div>
    </main>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  height: 360px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--vp-font-family-base);
}
.tree {
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 8px 4px;
  overflow: auto;
}
.editor { display: flex; flex-direction: column; min-width: 0; }
.path {
  font-size: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--coar-text-neutral-secondary, #475569);
  display: flex;
  gap: 6px;
  align-items: center;
}
.dirty { color: var(--coar-color-accent, #f59e0b); }
.buf {
  flex: 1; min-height: 0;
  border: 0; outline: none; resize: none;
  padding: 10px 12px;
  font: 13px/1.5 ui-monospace, monospace;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.empty {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
