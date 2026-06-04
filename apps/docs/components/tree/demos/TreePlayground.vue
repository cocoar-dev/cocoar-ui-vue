<script setup lang="ts">
/**
 * Kitchen-sink playground: flip every CoarTree option on/off, switch density,
 * filter, drag-reorder, rename, drive the imperative api, and watch the event
 * log. A live sandbox for the whole feature surface in one place.
 */
import { reactive, ref, computed } from 'vue';
import {
  CoarTree,
  CoarTreeNodeLabel,
  CoarIcon,
  CoarSwitch,
  CoarButton,
  CoarTextInput,
  CoarSegmentedControl,
  type CoarTreeSelectionMode,
  type CoarTreeDensity,
  type CoarTreeNodeMoveEvent,
  type CoarTreeSelectEvent,
} from '@cocoar/vue-ui';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

// Mutable (reactive) so drag-reorder + rename actually change the tree.
const treeData = reactive<Node[]>([
  {
    id: 'src',
    name: 'src',
    children: [
      {
        id: 'src/components',
        name: 'components',
        children: [
          { id: 'src/components/Button.vue', name: 'Button.vue' },
          { id: 'src/components/Tree.vue', name: 'Tree.vue' },
          { id: 'src/components/Modal.vue', name: 'Modal.vue' },
        ],
      },
      {
        id: 'src/composables',
        name: 'composables',
        children: [
          { id: 'src/composables/useTree.ts', name: 'useTree.ts' },
          { id: 'src/composables/useDrag.ts', name: 'useDrag.ts' },
        ],
      },
      { id: 'src/main.ts', name: 'main.ts' },
      { id: 'src/App.vue', name: 'App.vue' },
    ],
  },
  {
    id: 'docs',
    name: 'docs',
    children: [
      { id: 'docs/guide.md', name: 'guide.md' },
      { id: 'docs/api.md', name: 'api.md' },
    ],
  },
  { id: 'package.json', name: 'package.json' },
  { id: 'README.md', name: 'README.md' },
]);

// ─── option state (everything toggleable) ───────────────────────────────────
const selectionMode = ref<CoarTreeSelectionMode>('single');
const density = ref<CoarTreeDensity>('m');
const draggable = ref(false);
const renamable = ref(false);
const acceptsFiles = ref(false);
const activateOnClick = ref(false);
const virtualize = ref(false);
const checkStrictly = ref(false);
const disableSome = ref(false);
const search = ref('');

const modeOptions = (['single', 'multiple', 'checkbox'] as const).map((v) => ({ value: v, label: v }));
const densityOptions = (['xs', 's', 'm', 'l'] as const).map((v) => ({ value: v, label: v }));

// ─── models ──────────────────────────────────────────────────────────────
const expanded = ref(new Set<string>(['src', 'src/components']));
const selected = ref<string | null>(null);
const selectedIds = ref(new Set<string>());
const checkedIds = ref(new Set<string>());

// ─── derived ───────────────────────────────────────────────────────────────
const DISABLED = new Set(['package.json', 'README.md']);
const isDisabledFn = (n: Node) => DISABLED.has(n.id);

const matchedIds = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return undefined;
  const hits = new Set<string>();
  const walk = (list: Node[]) => {
    for (const n of list) {
      if (n.name.toLowerCase().includes(q)) hits.add(n.id);
      if (n.children) walk(n.children);
    }
  };
  walk(treeData);
  return hits;
});

const vItemSize = computed(() => ({ xs: 22, s: 26, m: 30, l: 38 })[density.value]);

// ─── event log ───────────────────────────────────────────────────────────
let seq = 0;
const events = ref<string[]>([]);
function log(msg: string) {
  events.value = [`#${++seq}  ${msg}`, ...events.value].slice(0, 6);
}

// ─── handlers ──────────────────────────────────────────────────────────────
function onSelect(e: CoarTreeSelectEvent<Node>) {
  log(`select ${e.node?.name ?? '—'} (${e.ids.length} total, ${e.via})`);
}
function onActivate(n: Node) {
  log(`activate ${n.name}`);
}
function onRename({ node, newName }: { node: Node; newName: string }) {
  node.name = newName;
  log(`rename → ${newName}`);
}
function onFilesDrop({ files, target }: { files: FileList; target: Node | null }) {
  log(`files-drop ${files.length} → ${target?.name ?? 'root'}`);
}

function detach(id: string): Node | null {
  const rec = (list: Node[]): Node | null => {
    const i = list.findIndex((n) => n.id === id);
    if (i >= 0) return list.splice(i, 1)[0];
    for (const n of list) if (n.children) {
      const f = rec(n.children);
      if (f) return f;
    }
    return null;
  };
  return rec(treeData);
}
function parentListOf(id: string): Node[] | null {
  const rec = (list: Node[]): Node[] | null => {
    if (list.some((n) => n.id === id)) return list;
    for (const n of list) if (n.children) {
      const f = rec(n.children);
      if (f) return f;
    }
    return null;
  };
  return rec(treeData);
}
function onNodeMove({ source, target, position }: CoarTreeNodeMoveEvent<Node>) {
  const node = detach(source.id);
  if (!node) return;
  if (!target || position === 'inside') {
    const into = target ? (target.children ??= []) : treeData;
    into.push(node);
  } else {
    const list = parentListOf(target.id) ?? treeData;
    const idx = list.findIndex((n) => n.id === target.id);
    list.splice(position === 'before' ? idx : idx + 1, 0, node);
  }
  log(`move ${node.name} ${position} ${target?.name ?? 'root'}`);
}

// ─── imperative api (template ref) ───────────────────────────────────────
const treeRef = ref<{
  expandAll(): void;
  collapseAll(): void;
  revealNode(id: string): void;
  startRename(id: string): void;
} | null>(null);
</script>

<template>
  <div class="pg">
    <div class="pg__controls">
      <label class="pg__field">
        <span class="pg__label">Selection</span>
        <CoarSegmentedControl v-model="selectionMode" :options="modeOptions" size="s" />
      </label>
      <label class="pg__field">
        <span class="pg__label">Density</span>
        <CoarSegmentedControl v-model="density" :options="densityOptions" size="s" />
      </label>
      <div class="pg__switches">
        <CoarSwitch v-model="draggable" label="draggable" size="s" />
        <CoarSwitch v-model="renamable" label="renamable" size="s" />
        <CoarSwitch v-model="acceptsFiles" label="acceptsFiles" size="s" />
        <CoarSwitch v-model="activateOnClick" label="activateOnClick" size="s" />
        <CoarSwitch v-model="virtualize" label="virtualize" size="s" />
        <CoarSwitch v-model="checkStrictly" label="checkStrictly" size="s" />
        <CoarSwitch v-model="disableSome" label="disable some" size="s" />
      </div>
      <label class="pg__field pg__field--grow">
        <span class="pg__label">Filter</span>
        <CoarTextInput v-model="search" placeholder="type to highlight + reveal…" size="s" />
      </label>
      <div class="pg__buttons">
        <CoarButton size="xs" variant="secondary" @click="treeRef?.expandAll()">Expand all</CoarButton>
        <CoarButton size="xs" variant="secondary" @click="treeRef?.collapseAll()">Collapse all</CoarButton>
        <CoarButton size="xs" variant="secondary" @click="treeRef?.revealNode('src/components/Modal.vue')">Reveal Modal.vue</CoarButton>
        <CoarButton size="xs" variant="secondary" :disabled="!renamable" @click="treeRef?.startRename('src/App.vue')">Rename App.vue</CoarButton>
      </div>
    </div>

    <div class="pg__tree-frame">
      <CoarTree
        ref="treeRef"
        :nodes="treeData"
        :get-id="(n: Node) => n.id"
        :get-children="(n: Node) => n.children"
        :get-label="(n: Node) => n.name"
        :is-expandable="(n: Node) => !!n.children"
        :is-disabled="disableSome ? isDisabledFn : undefined"
        :selection-mode="selectionMode"
        :check-strictly="checkStrictly"
        :density="density"
        :draggable="draggable"
        :renamable="renamable"
        :accepts-files="acceptsFiles"
        :activate-on-click="activateOnClick"
        :virtualize="virtualize ? { itemSize: vItemSize } : false"
        :matched-ids="matchedIds"
        aria-label="Playground tree"
        v-model:expanded="expanded"
        v-model:selected="selected"
        v-model:selected-ids="selectedIds"
        v-model:checked-ids="checkedIds"
        @select="onSelect"
        @activate="onActivate"
        @rename="onRename"
        @node-move="onNodeMove"
        @files-drop="onFilesDrop"
      >
        <template #default="{ node, isMatch }">
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="var(--coar-tree-icon-size)"
            class="pg__icon"
          />
          <CoarTreeNodeLabel :label="node.name" :class="{ 'pg__hit': isMatch }" />
        </template>
      </CoarTree>
    </div>

    <div class="pg__log">
      <span class="pg__label">Events</span>
      <p v-for="(e, i) in events" :key="i" class="pg__log-line">{{ e }}</p>
      <p v-if="!events.length" class="pg__log-empty">Click / drag / rename to see events…</p>
    </div>
  </div>
</template>

<style scoped>
.pg {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pg__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}
.pg__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pg__field--grow {
  flex: 1;
  min-width: 200px;
}
.pg__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary);
}
.pg__switches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}
.pg__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pg__tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  height: 300px;
  /* `display: flex` gives the tree a definite height so the *virtualized* mode's
     scroll viewport works; `overflow: auto` scrolls the *non-virtualized* mode
     (which doesn't own a scroll viewport) instead of letting expanded rows
     spill out of the frame. */
  display: flex;
  overflow: auto;
}
.pg__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.pg__hit {
  background: var(--coar-background-warning-tertiary, #fef9c3);
  border-radius: 3px;
  padding: 0 2px;
}
.pg__log {
  border-top: 1px dashed var(--coar-border-neutral-secondary);
  padding-top: 8px;
  font-family: var(--coar-font-mono, monospace);
  font-size: 12px;
  min-height: 60px;
}
.pg__log-line {
  margin: 2px 0;
  color: var(--coar-text-neutral-secondary);
}
.pg__log-empty {
  margin: 2px 0;
  color: var(--coar-text-neutral-tertiary);
  font-style: italic;
}
</style>
