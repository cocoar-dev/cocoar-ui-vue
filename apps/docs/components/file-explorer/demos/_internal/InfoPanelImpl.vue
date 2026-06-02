<script setup lang="ts">
import { CoarTree, CoarTreeNodeLabel, CoarIcon } from '@cocoar/vue-ui';
import {
  createInMemoryAssetStore,
  useFileExplorer,
  type Asset,
} from '@cocoar/vue-file-explorer-core';

const initialTree: Asset[] = [
  { id: 's', name: 'src', kind: 'folder', parentId: null },
  { id: 'c', name: 'components', kind: 'folder', parentId: 's' },
  { id: 'b', name: 'Button.vue', kind: 'file', parentId: 'c' },
  { id: 'u', name: 'utils.ts', kind: 'file', parentId: 's' },
  { id: 'd', name: 'docs', kind: 'folder', parentId: null },
  { id: 'r', name: 'README.md', kind: 'file', parentId: 'd' },
];
const initialContent = {
  b: '<template>\n  <button><slot /></button>\n</template>\n',
  u: 'export const noop = () => {};\n',
  r: '# Hello\n\nSelect a file to see its details below the tree.\n',
};
const store = createInMemoryAssetStore({ initialTree, initialContent });
const fe = useFileExplorer({ store });
</script>

<template>
  <div class="demo">
    <aside class="tree">
      <div class="tree__scroll">
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
      </div>

      <!-- The details panel is plain consumer markup, driven by the
           composable's selectedAsset + describeAsset. The layout (here a
           sibling below the tree) is entirely yours. -->
      <section class="info" aria-label="Selected item details">
        <header class="info__title">Details</header>
        <dl v-if="fe.selectedAsset.value" class="info__list">
          <div
            v-for="p in fe.describeAsset(fe.selectedAsset.value)"
            :key="p.key"
            class="info__row"
          >
            <dt>{{ p.label }}</dt>
            <dd>{{ p.value }}</dd>
          </div>
        </dl>
        <p v-else class="info__empty">Select an item to see its details.</p>
      </section>
    </aside>
    <main class="editor">
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
  grid-template-columns: 240px 1fr;
  height: 360px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--vp-font-family-base);
}
.tree {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.tree__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.editor { display: flex; flex-direction: column; min-width: 0; }
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
.info {
  flex-shrink: 0;
  max-height: 168px;
  overflow: auto;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  padding: 8px 12px 10px;
  font-size: 12px;
}
.info__title {
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  margin-bottom: 6px;
}
.info__list { margin: 0; display: grid; gap: 4px; }
.info__row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; }
.info__row dt { margin: 0; color: var(--coar-text-neutral-tertiary, #6b7280); }
.info__row dd { margin: 0; color: var(--vp-c-text-1); word-break: break-word; }
.info__empty { margin: 0; color: var(--coar-text-neutral-tertiary, #6b7280); }
</style>
