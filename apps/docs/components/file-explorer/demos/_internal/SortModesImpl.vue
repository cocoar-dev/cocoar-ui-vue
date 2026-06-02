<script setup lang="ts">
import { ref } from 'vue';
import { CoarTree, CoarTreeNodeLabel, CoarIcon, CoarSegmentedControl } from '@cocoar/vue-ui';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
  type SortMode,
} from '@cocoar/vue-file-explorer-core';

const initialTree: Asset[] = [
  { id: 'docs',   name: 'docs',     kind: 'folder', parentId: null },
  { id: 'app',    name: 'app.ts',   kind: 'file',   parentId: null },
  { id: 'lib',    name: 'lib',      kind: 'folder', parentId: null },
  { id: 'cfg',    name: 'config.json', kind: 'file', parentId: null },
  { id: 'src',    name: 'src',      kind: 'folder', parentId: null },
  { id: 'readme', name: 'README.md', kind: 'file',  parentId: null },
];
const sortMode = ref<SortMode>('folders-first');

const store = createInMemoryAssetStore({ initialTree, initialContent: {} });
const fe = useFileExplorer({ store, sortMode });
</script>

<template>
  <div class="demo">
    <div class="bar">
      <span class="lbl">Sort:</span>
      <CoarSegmentedControl
        v-model="sortMode"
        :options="[
          { value: 'folders-first', label: 'folders-first' },
          { value: 'alphabetical',  label: 'alphabetical' },
          { value: 'manual',        label: 'manual' },
        ]"
        size="s"
      />
      <span class="hint">
        manual → tree drop-between-siblings persists position via <code>store.move()</code>.
      </span>
    </div>
    <div class="body">
      <CoarTree
        :nodes="fe.rootNodes.value"
        :get-id="fe.getId"
        :get-children="fe.getChildren"
        :get-label="fe.getLabel"
        :is-expandable="fe.isExpandable"
        v-model:expanded="fe.expanded.value"
        v-model:selected="fe.selectedId.value"
        draggable
        @node-move="fe.moveNode"
      >
        <template #default="{ node }">
          <CoarIcon :name="node.kind === 'folder' ? 'folder' : 'file'" />
          <CoarTreeNodeLabel :label="node.name" />
        </template>
      </CoarTree>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex; flex-direction: column;
  height: 360px;
  border: 1px solid var(--vp-c-divider); border-radius: 8px;
  overflow: hidden;
  font-family: var(--vp-font-family-base);
}
.bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.lbl { font-size: 12px; color: var(--coar-text-neutral-secondary, #475569); }
.hint { font-size: 11px; color: var(--coar-text-neutral-tertiary, #6b7280); }
.hint code {
  background: var(--vp-c-default-soft);
  padding: 1px 5px; border-radius: 3px;
}
.body { flex: 1; min-height: 0; overflow: auto; padding: 8px 4px; }
</style>
