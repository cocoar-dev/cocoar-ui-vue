<template>
  <div class="wb-frame">
    <CoarPanelLayout
      v-model:left-width="leftW"
      v-model:right-width="rightW"
      v-model:bottom-height="botH"
      :left-open="leftOpen"
      :right-open="rightOpen"
      :bottom-open="botOpen"
      :left-min="160"
      :left-max="360"
      :right-min="140"
      :right-max="320"
      :bottom-min="60"
      :bottom-max="220"
    >
      <template #top>
        <div class="wb-bar">
          <strong>Workbench</strong>
          <span class="wb-spacer" />
          <button class="wb-btn" :class="{ 'wb-btn--on': leftOpen }" @click="leftOpen = !leftOpen">Left</button>
          <button class="wb-btn" :class="{ 'wb-btn--on': botOpen }" @click="botOpen = !botOpen">Bottom</button>
          <button class="wb-btn" :class="{ 'wb-btn--on': rightOpen }" @click="rightOpen = !rightOpen">Right</button>
        </div>
      </template>

      <template #left>
        <!-- left sidebar = vertical split: tree (top) + details (bottom) -->
        <CoarSplitPane direction="column" side="second" v-model:size="detailsH" :min="64" :max="220">
          <template #first>
            <section class="wb-pane">
              <header class="wb-title">Explorer</header>
              <div class="wb-body wb-scroll">
                <CoarTree
                  :nodes="nodes"
                  :get-id="(n) => n.id"
                  :get-children="(n) => n.children"
                  :get-label="(n) => n.name"
                  :is-expandable="(n) => !!n.children"
                  v-model:expanded="expanded"
                  v-model:selected="selected"
                >
                  <template #default="{ node }">
                    <CoarTreeNodeLabel :label="node.name" />
                  </template>
                </CoarTree>
              </div>
            </section>
          </template>
          <template #second>
            <section class="wb-pane">
              <header class="wb-title">Details</header>
              <div class="wb-body">
                <p class="wb-muted">Selected: <strong>{{ selectedName }}</strong></p>
              </div>
            </section>
          </template>
        </CoarSplitPane>
      </template>

      <template #default>
        <div class="wb-content">Content / editor area</div>
      </template>

      <template #right>
        <section class="wb-pane">
          <header class="wb-title">Outline</header>
          <div class="wb-body"><p class="wb-muted">Any panel you like.</p></div>
        </section>
      </template>

      <template #bottom>
        <section class="wb-pane">
          <header class="wb-title">Problems</header>
          <div class="wb-body"><p class="wb-muted">No problems detected.</p></div>
        </section>
      </template>

      <template #status>
        <div class="wb-status"><span>Ready</span><span class="wb-spacer" /><span>UTF-8</span></div>
      </template>
    </CoarPanelLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarPanelLayout, CoarSplitPane, CoarTree, CoarTreeNodeLabel } from '@cocoar/vue-ui';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

const nodes: Node[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      { id: 'app', name: 'App.vue' },
      { id: 'main', name: 'main.ts' },
    ],
  },
  { id: 'readme', name: 'README.md' },
];

const expanded = ref(new Set<string>(['src']));
const selected = ref<string | null>('app');
const selectedName = computed(() => {
  const find = (list: Node[]): Node | undefined =>
    list.flatMap((n) => [n, ...(n.children ?? [])]).find((n) => n.id === selected.value);
  return find(nodes)?.name ?? 'nothing';
});

// Layout state — consumer-owned.
const leftW = ref(220);
const rightW = ref(180);
const botH = ref(110);
const detailsH = ref(96);
const leftOpen = ref(true);
const rightOpen = ref(true);
const botOpen = ref(true);
</script>

<style scoped>
.wb-frame {
  height: 420px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}
.wb-bar,
.wb-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--vp-c-bg-soft);
}
.wb-bar {
  height: 40px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.wb-status {
  height: 26px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.wb-spacer {
  flex: 1;
}
.wb-btn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--coar-text-neutral-secondary, #475569);
  font-size: 12px;
  cursor: pointer;
}
.wb-btn--on {
  background: var(--coar-color-accent, #3b82f6);
  border-color: var(--coar-color-accent, #3b82f6);
  color: #fff;
}
.wb-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--vp-c-bg-soft);
}
.wb-title {
  flex: 0 0 auto;
  height: 26px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.wb-body {
  flex: 1 1 0;
  min-height: 0;
  padding: 4px 0;
}
.wb-scroll {
  overflow: auto;
}
.wb-muted {
  margin: 0;
  padding: 4px 12px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.wb-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
</style>
