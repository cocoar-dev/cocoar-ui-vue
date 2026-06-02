<script setup lang="ts">
import { computed } from 'vue';
import { CoarTree, CoarTreeNodeLabel, CoarIcon, CoarSpinner } from '@cocoar/vue-ui';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
} from '@cocoar/vue-file-explorer-core';

const initialTree: Asset[] = [
  { id: 'src', name: 'src', kind: 'folder', parentId: null },
  { id: 'docs', name: 'docs', kind: 'folder', parentId: null },
  { id: 'assets', name: 'assets', kind: 'folder', parentId: null },
  { id: 'a', name: 'utils.ts', kind: 'file', parentId: 'src' },
  { id: 'b', name: 'main.ts', kind: 'file', parentId: 'src' },
  { id: 'c', name: 'README.md', kind: 'file', parentId: 'docs' },
  { id: 'd', name: 'CHANGELOG.md', kind: 'file', parentId: 'docs' },
  { id: 'e', name: 'logo.svg', kind: 'file', parentId: 'assets' },
];

const store = createInMemoryAssetStore({
  initialTree,
  initialContent: {},
  lazy: true,
  latencyMs: 800,           // make the spinner visible during expand
});
const fe = useFileExplorer({ store });

const busy = computed(() => new Set([...fe.loadingNodes.value, ...fe.savingNodes.value]));
</script>

<template>
  <div class="demo">
    <div class="hint">
      <strong>Lazy mode.</strong> Click a folder — children take ~800ms to load (simulated).
      The row icon swaps to a spinner while <code>loadingNodes</code> contains the folder's id.
    </div>
    <div class="tree">
      <CoarTree
        :nodes="fe.rootNodes.value"
        :get-id="fe.getId"
        :get-children="fe.getChildren"
        :get-label="fe.getLabel"
        :is-expandable="fe.isExpandable"
        v-model:expanded="fe.expanded.value"
        v-model:selected="fe.selectedId.value"
      >
        <template #default="{ node }">
          <CoarSpinner v-if="busy.has(node.id)" size="xs" />
          <CoarIcon v-else :name="node.kind === 'folder' ? 'folder' : 'file'" />
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
.hint {
  padding: 8px 12px; font-size: 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--coar-text-neutral-secondary, #475569);
}
.hint code {
  background: var(--vp-c-default-soft);
  padding: 1px 5px; border-radius: 3px; font-size: 11px;
}
.tree { flex: 1; min-height: 0; overflow: auto; padding: 8px 4px; }
</style>
