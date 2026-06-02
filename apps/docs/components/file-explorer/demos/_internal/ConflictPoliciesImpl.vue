<script setup lang="ts">
import { ref } from 'vue';
import { CoarTree, CoarTreeNodeLabel, CoarIcon, CoarButton, CoarSegmentedControl } from '@cocoar/vue-ui';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
  type ConflictPolicy,
} from '@cocoar/vue-file-explorer-core';

const initialTree: Asset[] = [
  { id: 'root', name: 'uploads', kind: 'folder', parentId: null },
  { id: 'f1', name: 'photo.png', kind: 'file', parentId: 'root' },
];
const policy = ref<ConflictPolicy>('rename');
const lastError = ref<string>('');

const store = createInMemoryAssetStore({
  initialTree,
  initialContent: { f1: '(seed)' },
  onConflict: policy,
});
const fe = useFileExplorer({
  store,
  initialExpandedIds: ['root'],
  onError: (op, err) => (lastError.value = `${op}: ${(err as Error).message}`),
});

async function uploadDuplicate() {
  lastError.value = '';
  const file = new File(['(new bytes)'], 'photo.png', { type: 'image/png' });
  await fe.addFiles('root', [file]);
}
</script>

<template>
  <div class="demo">
    <div class="bar">
      <span class="lbl">Policy:</span>
      <CoarSegmentedControl
        v-model="policy"
        :options="[
          { value: 'rename',    label: 'rename' },
          { value: 'overwrite', label: 'overwrite' },
          { value: 'error',     label: 'error' },
        ]"
        size="s"
      />
      <CoarButton size="s" @click="uploadDuplicate">Upload photo.png</CoarButton>
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
      >
        <template #default="{ node }">
          <CoarIcon :name="node.kind === 'folder' ? 'folder' : 'image'" />
          <CoarTreeNodeLabel :label="node.name" />
        </template>
      </CoarTree>
    </div>
    <div v-if="lastError" class="err">{{ lastError }}</div>
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
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.lbl { font-size: 12px; color: var(--coar-text-neutral-secondary, #475569); }
.body { flex: 1; min-height: 0; overflow: auto; padding: 8px 4px; }
.err {
  padding: 8px 12px; font-size: 12px;
  background: var(--coar-color-error-soft, #fee2e2);
  color: var(--coar-color-error-strong, #991b1b);
  border-top: 1px solid var(--vp-c-divider);
}
</style>
