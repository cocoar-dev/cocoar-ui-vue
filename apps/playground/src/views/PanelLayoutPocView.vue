<script setup lang="ts">
/**
 * Demonstrates the panel-layout primitives:
 *   - <CoarPanelLayout> arranges top / left / content / right / bottom / status
 *   - <CoarSplitPane> nested inside #left stacks the file tree over a details
 *     panel with a draggable divider between them ("left-bottom").
 * Content comes from useFileExplorer so the tree + details are real.
 */
import { ref } from 'vue';
import {
  CoarPanelLayout,
  CoarSplitPane,
  CoarTree,
  CoarTreeNodeLabel,
  CoarIcon,
} from '@cocoar/vue-ui';
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
  { id: 'm', name: 'main.ts', kind: 'file', parentId: 's' },
  { id: 'd', name: 'docs', kind: 'folder', parentId: null },
  { id: 'r', name: 'README.md', kind: 'file', parentId: 'd' },
];
const initialContent = {
  b: '<template>\n  <button><slot /></button>\n</template>\n',
  u: 'export const clamp = (n: number, lo: number, hi: number) =>\n  Math.min(hi, Math.max(lo, n));\n',
  m: "import { clamp } from './utils';\nconsole.log(clamp(5, 0, 10));\n",
  r: '# Hello\n\nDrag the dividers. Toggle panels in the toolbar.\n',
};
const store = createInMemoryAssetStore({ initialTree, initialContent });
const fe = useFileExplorer({ store });

// Layout state — all consumer-owned (persist these in a real app).
const leftWidth = ref(260);
const rightWidth = ref(220);
const bottomHeight = ref(150);
const detailsHeight = ref(180); // height of the details pane inside #left
const leftOpen = ref(true);
const rightOpen = ref(true);
const bottomOpen = ref(true);
</script>

<template>
  <CoarPanelLayout
    class="pl-demo"
    v-model:left-width="leftWidth"
    v-model:right-width="rightWidth"
    v-model:bottom-height="bottomHeight"
    :left-open="leftOpen"
    :right-open="rightOpen"
    :bottom-open="bottomOpen"
    :left-min="180"
    :left-max="480"
    :right-min="160"
    :right-max="420"
    :bottom-min="80"
    :bottom-max="360"
  >
    <template #top>
      <div class="pl-toolbar">
        <strong class="pl-toolbar__title">CoarPanelLayout</strong>
        <span class="pl-toolbar__spacer" />
        <button class="pl-tbtn" :class="{ 'pl-tbtn--on': leftOpen }" @click="leftOpen = !leftOpen">Left</button>
        <button class="pl-tbtn" :class="{ 'pl-tbtn--on': bottomOpen }" @click="bottomOpen = !bottomOpen">Bottom</button>
        <button class="pl-tbtn" :class="{ 'pl-tbtn--on': rightOpen }" @click="rightOpen = !rightOpen">Right</button>
      </div>
    </template>

    <template #left>
      <!-- Left sidebar = vertical split: tree on top, details below. -->
      <CoarSplitPane direction="column" side="second" v-model:size="detailsHeight" :min="80" :max="360">
        <template #first>
          <section class="pl-pane">
            <header class="pl-pane__title">Explorer</header>
            <div class="pl-pane__body pl-pane__body--scroll">
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
                  <CoarIcon :name="node.kind === 'folder' ? 'folder' : 'file'" size="xs" />
                  <CoarTreeNodeLabel :label="node.name" />
                </template>
              </CoarTree>
            </div>
          </section>
        </template>
        <template #second>
          <section class="pl-pane">
            <header class="pl-pane__title">Details</header>
            <div class="pl-pane__body pl-pane__body--scroll">
              <dl v-if="fe.selectedAsset.value" class="pl-props">
                <div v-for="p in fe.describeAsset(fe.selectedAsset.value)" :key="p.key" class="pl-props__row">
                  <dt>{{ p.label }}</dt>
                  <dd>{{ p.value }}</dd>
                </div>
              </dl>
              <p v-else class="pl-muted">Select an item to see its details.</p>
            </div>
          </section>
        </template>
      </CoarSplitPane>
    </template>

    <template #default>
      <section class="pl-editor">
        <header v-if="fe.activeTab.value" class="pl-editor__path">
          {{ fe.breadcrumbPath.value.join(' / ') }}
        </header>
        <textarea
          v-if="fe.activeTab.value"
          class="pl-editor__buf"
          :value="fe.activeTab.value.content"
          @input="(e) => fe.setContent(fe.activeTab.value!.id, (e.target as HTMLTextAreaElement).value)"
        />
        <div v-else class="pl-muted pl-editor__empty">Select a file from the tree to open it.</div>
      </section>
    </template>

    <template #right>
      <section class="pl-pane">
        <header class="pl-pane__title">Outline</header>
        <div class="pl-pane__body"><p class="pl-muted">Drop any panel here.</p></div>
      </section>
    </template>

    <template #bottom>
      <section class="pl-pane">
        <header class="pl-pane__title">Problems</header>
        <div class="pl-pane__body"><p class="pl-muted">No problems detected.</p></div>
      </section>
    </template>

    <template #status>
      <div class="pl-status">
        <span>{{ fe.selectedAsset.value ? fe.pathOf(fe.selectedAsset.value.id).join(' / ') : 'Ready' }}</span>
        <span class="pl-toolbar__spacer" />
        <span>UTF-8</span>
      </div>
    </template>
  </CoarPanelLayout>
</template>

<style scoped>
.pl-demo {
  height: 100%;
  border: 1px solid var(--coar-border-neutral-tertiary, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
  background: var(--coar-background-neutral-primary, #fff);
  font-size: 13px;
}

.pl-toolbar,
.pl-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--coar-background-neutral-secondary, #fafafa);
}
.pl-toolbar {
  height: 40px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e2e8f0);
}
.pl-status {
  height: 26px;
  border-top: 1px solid var(--coar-border-neutral-tertiary, #e2e8f0);
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.pl-toolbar__title {
  font-size: 12px;
  letter-spacing: 0.02em;
}
.pl-toolbar__spacer {
  flex: 1;
}
.pl-tbtn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--coar-border-neutral-tertiary, #e2e8f0);
  border-radius: 4px;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-secondary, #475569);
  font-size: 12px;
  cursor: pointer;
}
.pl-tbtn--on {
  background: var(--coar-color-accent, #3b82f6);
  border-color: var(--coar-color-accent, #3b82f6);
  color: #fff;
}

/* A generic titled pane used in left / right / bottom regions. */
.pl-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--coar-background-neutral-secondary, #fafafa);
}
.pl-pane__title {
  flex: 0 0 auto;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.pl-pane__body {
  flex: 1 1 0;
  min-height: 0;
  padding: 4px 0;
}
.pl-pane__body--scroll {
  overflow: auto;
}

.pl-props {
  margin: 0;
  padding: 0 12px;
  display: grid;
  gap: 5px;
}
.pl-props__row {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 8px;
  align-items: baseline;
}
.pl-props__row dt {
  margin: 0;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.pl-props__row dd {
  margin: 0;
  color: var(--coar-text-neutral-primary, #0f172a);
  word-break: break-word;
}
.pl-muted {
  margin: 0;
  padding: 4px 12px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}

.pl-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--coar-background-neutral-primary, #fff);
}
.pl-editor__path {
  flex: 0 0 auto;
  padding: 6px 12px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e2e8f0);
  color: var(--coar-text-neutral-secondary, #475569);
  font-size: 12px;
}
.pl-editor__buf {
  flex: 1 1 0;
  min-height: 0;
  border: 0;
  outline: none;
  resize: none;
  padding: 10px 12px;
  font: 13px/1.5 ui-monospace, monospace;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #0f172a);
}
.pl-editor__empty {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
