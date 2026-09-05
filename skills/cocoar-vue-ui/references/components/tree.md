<!-- Generated from apps/docs/components/tree.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Tree

A generic, keyboard-navigable, drag-drop-aware tree primitive. Identity, children and label are extracted via prop functions — render any node shape (file systems, navigation, settings, categories, …) without forcing a common base type.

```ts
import {
  CoarTree,
  useTree,
  type CoarTreeNodeMoveEvent,
  type CoarTreeFilesDropEvent,
} from '@cocoar/vue-ui';
```

> **Info: Two APIs**
>
> `<CoarTree>` works in two modes:
>
> - **Props-mode** — pass `nodes`, `getId`, `getChildren`, etc. as props; wire `<CoarContextMenu>` yourself. Good for simple cases.
> - **Builder-mode** — `useTree()` returns a fluent builder. Declarative per-target context menus are rendered internally, the imperative `api` lets you focus nodes from outside the component. Recommended for anything beyond the basics.
>
> The two compose — but pick one per `<CoarTree>` instance; mixing props and builder on the same instance is a footgun.

> **Tip: Desktop-first**
>
> `<CoarTree>` is an explicit exception to the library's tablet-first principle. Right-click context menus and hover-revealed UI on rows (⋮ buttons, inline actions) are part of the intended UX. The component still works on touch devices but isn't tuned for them — use it for power-user surfaces (file managers, settings explorers, asset trees) rather than mobile navigation.

## Playground

Flip every option on or off, switch density, filter, drag-reorder, rename, drive the imperative `api`, and watch the event log — the whole feature surface in one sandbox.

**Demo — `tree/demos/TreePlayground.vue`**

```vue
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
const filter = ref(false);
const filterMode = ref<'strict' | 'lenient'>('strict');
const filterModeOptions = (['strict', 'lenient'] as const).map((v) => ({ value: v, label: v }));

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
        <div class="pg__filter-row">
          <CoarTextInput v-model="search" placeholder="type to highlight + reveal…" size="s" />
          <CoarSwitch v-model="filter" label="hide non-matches" size="s" />
          <CoarSegmentedControl v-if="filter" v-model="filterMode" :options="filterModeOptions" size="s" />
        </div>
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
        :filter="filter"
        :filter-mode="filterMode"
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
.pg__filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pg__filter-row > :first-child {
  flex: 1;
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
```

## Basic Tree

Pass a list of root nodes and four extractors: `getId`, `getChildren`, `getLabel`, and optionally `isExpandable`. Render the row body via the default slot. Two `v-model`s — `expanded` (a `Set<string>` of node ids) and `selected` (a single id or `null`) — let the consumer control state.

**Demo — `tree/demos/TreeBasic.vue`**

```vue
<script setup lang="ts">
/**
 * The simplest possible `<CoarTree>`: a static nested structure rendered with
 * the default slot. Click a row to select it, click a chevron (or use Space)
 * to expand or collapse a branch.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, vTooltip } from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: 'docs',
    label: 'Documentation',
    children: [
      { id: 'docs/getting-started', label: 'Getting Started' },
      { id: 'docs/components', label: 'Components' },
      { id: 'docs/recipes', label: 'Recipes' },
    ],
  },
  {
    id: 'design',
    label: 'Design Tokens',
    children: [
      { id: 'design/colors', label: 'Colors' },
      { id: 'design/spacing', label: 'Spacing' },
    ],
  },
  { id: 'changelog', label: 'CHANGELOG.md' },
];

const expanded = ref(new Set<string>(['docs']));
const selected = ref<string | null>('docs/components');
</script>

<template>
  <div class="tree-frame">
    <CoarTree
      :nodes="tree"
      :get-id="(n: Node) => n.id"
      :get-children="(n: Node) => n.children"
      :get-label="(n: Node) => n.label"
      v-model:expanded="expanded"
      v-model:selected="selected"
    >
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
      </template>
    </CoarTree>
  </div>
  <p class="tree-state">Selected: <code>{{ selected ?? '—' }}</code></p>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  max-width: 360px;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-state {
  margin-top: 12px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## Selection

`selectionMode` picks one of three behaviours (default `'single'`, fully back-compatible):

| Mode | Bound to | Interaction |
|------|----------|-------------|
| `'single'` | `v-model:selected` (`string \| null`) | One highlighted row |
| `'multiple'` | `v-model:selectedIds` (`Set<string>`) | Ctrl/Cmd-click toggles, Shift-click ranges, `Ctrl/Cmd+A` selects all, Shift+Arrow extends |
| `'checkbox'` | `v-model:checkedIds` (`Set<string>`) + `v-model:selectedIds` | A per-row tri-state checkbox **independent** of the highlight selection |

In **checkbox** mode the checkbox state (`checkedIds`) and the highlight (`selectedIds`) are separate models — a row can be focused/highlighted while a different set is checked. Checking a folder cascades to its descendants and a partially-checked folder shows the indeterminate (`mixed`) state; checking a folder whose children aren't loaded yet propagates the check to them once they arrive (lazy inheritance). Set `check-strictly` for independent parent/child checks with no cascade.

```vue
<script setup lang="ts">
const selectedIds = ref(new Set<string>())
const checkedIds = ref(new Set<string>())
</script>

<template>
  <CoarTree
    selection-mode="checkbox"
    v-model:selected-ids="selectedIds"
    v-model:checked-ids="checkedIds"
    :nodes="nodes" :get-id="n => n.id" :get-children="n => n.children"
  />
</template>
```

**Demo — `tree/demos/TreeSelection.vue`**

```vue
<script setup lang="ts">
/**
 * The three selection modes. Toggle between single / multiple / checkbox and
 * watch the bound models update. In checkbox mode the checkbox set
 * (`checkedIds`) is independent of the highlight (`selectedIds`), and folder
 * checks cascade with a tri-state (indeterminate) parent.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, CoarSegmentedControl, type CoarTreeSelectionMode } from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'src/main.ts', label: 'main.ts' },
      { id: 'src/app.vue', label: 'App.vue' },
      {
        id: 'src/components',
        label: 'components',
        children: [
          { id: 'src/components/button.vue', label: 'Button.vue' },
          { id: 'src/components/tree.vue', label: 'Tree.vue' },
        ],
      },
    ],
  },
  { id: 'readme', label: 'README.md' },
];

const mode = ref<CoarTreeSelectionMode>('checkbox');
const modeOptions = [
  { value: 'single', label: 'single' },
  { value: 'multiple', label: 'multiple' },
  { value: 'checkbox', label: 'checkbox' },
];

const expanded = ref(new Set<string>(['src', 'src/components']));
const selected = ref<string | null>(null);
const selectedIds = ref(new Set<string>());
const checkedIds = ref(new Set<string>());
</script>

<template>
  <div class="sel-demo">
    <CoarSegmentedControl v-model="mode" :options="modeOptions" size="s" />

    <div class="tree-frame">
      <CoarTree
        :nodes="tree"
        :get-id="(n: Node) => n.id"
        :get-children="(n: Node) => n.children"
        :get-label="(n: Node) => n.label"
        :selection-mode="mode"
        aria-label="Project files"
        v-model:expanded="expanded"
        v-model:selected="selected"
        v-model:selected-ids="selectedIds"
        v-model:checked-ids="checkedIds"
      >
        <template #default="{ node }">
          <CoarIcon :name="node.children ? 'folder' : 'file-text'" size="xs" class="sel-row__icon" />
          <span class="sel-row__label">{{ node.label }}</span>
        </template>
      </CoarTree>
    </div>

    <p class="sel-state">
      <template v-if="mode === 'single'">Selected: <code>{{ selected ?? '—' }}</code></template>
      <template v-else-if="mode === 'multiple'">Selected: <code>{{ [...selectedIds].join(', ') || '—' }}</code></template>
      <template v-else>Checked: <code>{{ [...checkedIds].join(', ') || '—' }}</code></template>
    </p>
  </div>
</template>

<style scoped>
.sel-demo {
  max-width: 380px;
}
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  margin-top: 10px;
}
.sel-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.sel-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sel-state {
  margin-top: 12px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## Drag-and-Drop Reorder

Set `draggable` to allow internal moves. Drop **between** sibling rows to reorder; drop **into** a folder (middle 50 % of the row) to move it inside. The tree rejects self-onto-descendant drops, draws a 2-pixel indicator line for `before`/`after` and a dashed outline for `inside`, and auto-expands collapsed folders after a short hover.

The consumer handles the actual mutation in `@node-move` — splice the source out of its current parent and re-insert it at the target's location.

**Demo — `tree/demos/TreeDragReorder.vue`**

```vue
<script setup lang="ts">
/**
 * Internal drag-and-drop: pick a node, drag onto another. Drop **between**
 * siblings (top / bottom edge of the row) to reorder; drop **into** a folder
 * (middle 50 % of the row) to move it inside. Self-onto-descendant is rejected
 * by the tree automatically. Hovering a collapsed folder for ~700 ms while
 * dragging auto-expands it so deeper drops are reachable.
 */
import { ref } from 'vue';
import {
  CoarTree,
  CoarIcon,
  vTooltip,
  type CoarTreeNodeMoveEvent,
} from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree = ref<Node[]>([
  {
    id: 'inbox',
    label: 'Inbox',
    children: [
      { id: 'inbox/a', label: 'Welcome aboard' },
      { id: 'inbox/b', label: 'Quarterly report' },
      { id: 'inbox/c', label: 'PTO request' },
    ],
  },
  {
    id: 'archive',
    label: 'Archive',
    children: [{ id: 'archive/x', label: 'Old contracts' }],
  },
  { id: 'spam', label: 'Spam' },
]);

const expanded = ref(new Set<string>(['inbox', 'archive']));
const selected = ref<string | null>(null);

function findLoc(id: string, nodes: Node[] = tree.value, parent: Node | null = null): { parent: Node | null; idx: number } | null {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx >= 0) return { parent, idx };
  for (const n of nodes) {
    if (n.children) {
      const found = findLoc(id, n.children, n);
      if (found) return found;
    }
  }
  return null;
}

function moveNode({ source, target, position }: CoarTreeNodeMoveEvent<Node>) {
  const loc = findLoc(source.id);
  if (!loc) return;
  const arr = loc.parent ? loc.parent.children! : tree.value;
  const [node] = arr.splice(loc.idx, 1);
  if (!target) {
    tree.value.push(node);
    return;
  }
  if (position === 'inside') {
    if (!target.children) target.children = [];
    target.children.push(node);
    expanded.value = new Set(expanded.value).add(target.id);
    return;
  }
  const targetLoc = findLoc(target.id);
  if (!targetLoc) return;
  const dst = targetLoc.parent ? targetLoc.parent.children! : tree.value;
  const at = position === 'before' ? targetLoc.idx : targetLoc.idx + 1;
  dst.splice(at, 0, node);
}
</script>

<template>
  <div class="tree-frame">
    <CoarTree
      :nodes="tree"
      :get-id="(n: Node) => n.id"
      :get-children="(n: Node) => n.children"
      :get-label="(n: Node) => n.label"
      :is-expandable="(n: Node) => Array.isArray(n.children)"
      v-model:expanded="expanded"
      v-model:selected="selected"
      draggable
      @node-move="moveNode"
    >
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
      </template>
    </CoarTree>
  </div>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  max-width: 360px;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

## OS File Drop

Set `accepts-files` to receive operating-system file drops onto folder rows or the empty background. The tree emits `@files-drop` with the raw `FileList` plus the target folder (or `null` when dropped on the background). Use this for asset uploaders, image inboxes, or any flow where the user drags files in from outside the browser.

**Demo — `tree/demos/TreeFileDrop.vue`**

```vue
<script setup lang="ts">
/**
 * Drop **OS files** from your file manager onto a folder row (or the empty
 * tree background). The tree highlights the drop target and emits a
 * `@files-drop` event with the `FileList` plus the target folder (or `null`
 * for the background). The consumer decides what to do — here we just append
 * a placeholder leaf per dropped file.
 */
import { ref } from 'vue';
import {
  CoarTree,
  CoarIcon,
  vTooltip,
  type CoarTreeFilesDropEvent,
} from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree = ref<Node[]>([
  {
    id: 'uploads',
    label: 'Uploads',
    children: [{ id: 'uploads/seed.png', label: 'seed.png' }],
  },
  { id: 'untracked', label: 'Untracked', children: [] },
]);

const expanded = ref(new Set<string>(['uploads', 'untracked']));
const selected = ref<string | null>(null);

function findFolder(id: string, nodes: Node[] = tree.value): Node | null {
  for (const n of nodes) {
    if (!n.children) continue;
    if (n.id === id) return n;
    const inner = findFolder(id, n.children);
    if (inner) return inner;
  }
  return null;
}

function onFilesDrop({ files, target }: CoarTreeFilesDropEvent<Node>) {
  // Convert FileList to placeholder leaves — a real app would inspect each
  // file, build the right node, and likely kick off an upload.
  const dropped: Node[] = Array.from(files).map((f) => ({
    id: `dropped-${crypto.randomUUID()}`,
    label: f.name,
  }));
  if (target) {
    const folder = findFolder(target.id);
    if (folder) {
      folder.children = [...(folder.children ?? []), ...dropped];
      expanded.value = new Set(expanded.value).add(folder.id);
    }
  } else {
    tree.value.push(...dropped);
  }
}
</script>

<template>
  <div class="tree-frame">
    <CoarTree
      :nodes="tree"
      :get-id="(n: Node) => n.id"
      :get-children="(n: Node) => n.children"
      :get-label="(n: Node) => n.label"
      :is-expandable="(n: Node) => Array.isArray(n.children)"
      v-model:expanded="expanded"
      v-model:selected="selected"
      accepts-files
      @files-drop="onFilesDrop"
    >
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
      </template>
    </CoarTree>
  </div>
  <p class="hint">Drag a file from your OS file manager onto a folder above.</p>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  max-width: 360px;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
```

## App-internal drops (drag something onto a node)

`accepts-files` is for **OS** files. For an **in-app** drag — a card dragged out of your grid, a chip from a palette — set `accepts-data` to the MIME type(s) your source registered, and handle `@data-drop`. The tree reuses the same drop highlight, auto-expand-on-hover, and `before`/`inside`/`after` position as node reordering, but emits a generic event so your handler decides what the drop means (move the asset into the folder, link it, etc.).

```vue
<!-- your grid card -->
<div draggable="true" @dragstart="e => e.dataTransfer.setData('application/x-myapp-asset', asset.id)">…</div>

<!-- the tree -->
<CoarTree
  :builder="builder"
  :accepts-data="['application/x-myapp-asset']"
  @data-drop="onDataDrop"
/>
```

```ts
function onDataDrop({ node, position, dataTransfer }) {
  const assetId = dataTransfer.getData('application/x-myapp-asset') // read at drop time
  const targetFolderId = node?.id ?? null                          // null = dropped on the background
  moveAssetToFolder(assetId, targetFolderId)
}
```

Internal node drags (`@node-move`) are never delivered as `@data-drop` even when `accepts-data` is set — the two channels don't cross. The `DataTransfer` is only valid inside the handler (the browser neuters it afterwards), so read your payload synchronously.

## Context Menu + ⋮ Button

`@context-menu` fires on right-click of any row and on background right-click (`node` is `null`). Wire it to a single `useContextMenu()` controller — the menu's contents adapt to whether a folder, file, or background was hit. The same controller doubles as the click handler for a hover-revealed `⋮` button per row, giving keyboard / left-click users equal access.

**Demo — `tree/demos/TreeContextMenu.vue`**

```vue
<script setup lang="ts">
/**
 * Wire `@context-menu` to a `useContextMenu()` controller and a single
 * `<CoarContextMenu>` instance — the menu's contents adapt to the right-
 * clicked node (folder vs file vs empty background).
 *
 * The same controller also opens from a hover-revealed `⋮` button per row,
 * giving keyboard / non-right-click users the same actions.
 */
import { ref } from 'vue';
import {
  CoarTree,
  CoarIcon,
  CoarContextMenu,
  CoarMenu,
  CoarMenuItem,
  CoarMenuDivider,
  useContextMenu,
  vTooltip,
} from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree = ref<Node[]>([
  {
    id: 'projects',
    label: 'Projects',
    children: [
      { id: 'projects/alpha', label: 'alpha' },
      { id: 'projects/beta', label: 'beta' },
    ],
  },
  { id: 'README.md', label: 'README.md' },
]);

const expanded = ref(new Set<string>(['projects']));
const selected = ref<string | null>(null);

const menu = useContextMenu();
const target = ref<Node | null>(null);

function open(node: Node | null, ev: MouseEvent) {
  target.value = node;
  menu.open(ev);
}

function rename() {
  if (!target.value) return;
  const next = window.prompt('Rename to:', target.value.label);
  if (next) target.value.label = next.trim() || target.value.label;
}
function remove() {
  if (!target.value) return;
  const id = target.value.id;
  const drop = (list: Node[]): boolean => {
    const i = list.findIndex((n) => n.id === id);
    if (i >= 0) { list.splice(i, 1); return true; }
    return list.some((n) => n.children && drop(n.children));
  };
  drop(tree.value);
}
</script>

<template>
  <div class="tree-frame">
    <CoarTree
      :nodes="tree"
      :get-id="(n: Node) => n.id"
      :get-children="(n: Node) => n.children"
      :get-label="(n: Node) => n.label"
      :is-expandable="(n: Node) => Array.isArray(n.children)"
      v-model:expanded="expanded"
      v-model:selected="selected"
      @context-menu="open"
    >
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
        <button
          type="button"
          class="tree-row__more"
          aria-label="More actions"
          @click.stop="open(node, $event)"
        >
          <CoarIcon name="ellipsis-vertical" size="xs" />
        </button>
      </template>
    </CoarTree>
  </div>

  <CoarContextMenu :menu="menu">
    <CoarMenu>
      <template v-if="target">
        <CoarMenuItem label="Rename…" icon="pencil" @clicked="rename" />
        <CoarMenuDivider />
        <CoarMenuItem label="Delete" icon="trash-2" @clicked="remove" />
      </template>
      <template v-else>
        <CoarMenuItem label="(Right-click a row to see context-aware actions)" disabled />
      </template>
    </CoarMenu>
  </CoarContextMenu>

  <p class="hint">Right-click a row, or hover and use the <code>⋮</code> button.</p>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  max-width: 360px;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-row__more {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 3px;
  color: var(--coar-text-neutral-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease;
}
:deep(.coar-tree-node__row:hover) .tree-row__more,
:deep(.coar-tree-node__row:focus-within) .tree-row__more {
  opacity: 1;
}
.tree-row__more:hover {
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}
.hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
```

## Builder API

`useTree<T>()` returns `{ builder, api }`. Configure data, behavior, handlers and three context menus in a single fluent chain — the tree renders the `<CoarContextMenu>` itself, so the template is just `<CoarTree :builder>`.

**Demo — `tree/demos/TreeBuilderApi.vue`**

```vue
<script setup lang="ts">
/**
 * Full builder-mode demo. Configures data + handlers + per-target context
 * menus in a single fluent chain. The tree renders the `<CoarContextMenu>`
 * internally — no extra markup in the template.
 *
 * Three menu types are wired:
 *   - `folderMenu` — right-click a folder row
 *   - `leafMenu`   — right-click a file row
 *   - `viewportMenu` — right-click the empty background (e.g. below the rows)
 */
import { ref } from 'vue';
import {
  CoarTree,
  CoarIcon,
  useTree,
  vTooltip,
  type CoarTreeNodeMoveEvent,
} from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const uid = () => crypto.randomUUID();

const tree = ref<Node[]>([
  {
    id: uid(),
    label: 'inbox',
    children: [
      { id: uid(), label: 'welcome.md' },
      { id: uid(), label: 'todo.md' },
    ],
  },
  {
    id: uid(),
    label: 'archive',
    children: [{ id: uid(), label: 'old-notes.md' }],
  },
  { id: uid(), label: 'CHANGELOG.md' },
]);
const expanded = ref(new Set<string>(tree.value.filter((n) => n.children).map((n) => n.id)));
const selected = ref<string | null>(null);
const lastActivated = ref<string | null>(null);

// Find a node's parent + index so we can mutate the tree in place.
function findLoc(id: string, nodes: Node[] = tree.value, parent: Node | null = null): { parent: Node | null; idx: number } | null {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx >= 0) return { parent, idx };
  for (const n of nodes) {
    if (n.children) {
      const found = findLoc(id, n.children, n);
      if (found) return found;
    }
  }
  return null;
}

function addFolder(parentId: string | null) {
  const label = window.prompt('Folder name?')?.trim();
  if (!label) return;
  const node: Node = { id: uid(), label, children: [] };
  if (parentId) {
    const parent = findLoc(parentId)?.parent === null ? tree.value.find((n) => n.id === parentId) : null;
    const found = tree.value.find((n) => n.id === parentId);
    if (found?.children) found.children.push(node);
    expanded.value = new Set(expanded.value).add(parentId);
  } else {
    tree.value.push(node);
  }
}

function remove(id: string) {
  const loc = findLoc(id);
  if (!loc) return;
  const arr = loc.parent ? loc.parent.children! : tree.value;
  arr.splice(loc.idx, 1);
}

function move({ source, target, position }: CoarTreeNodeMoveEvent<Node>) {
  const loc = findLoc(source.id);
  if (!loc) return;
  const arr = loc.parent ? loc.parent.children! : tree.value;
  const [node] = arr.splice(loc.idx, 1);
  if (!target) { tree.value.push(node); return; }
  if (position === 'inside') {
    if (!target.children) target.children = [];
    target.children.push(node);
    expanded.value = new Set(expanded.value).add(target.id);
    return;
  }
  const targetLoc = findLoc(target.id);
  if (!targetLoc) return;
  const dst = targetLoc.parent ? targetLoc.parent.children! : tree.value;
  dst.splice(position === 'before' ? targetLoc.idx : targetLoc.idx + 1, 0, node);
}

const { builder, api } = useTree<Node>();

builder
  .nodes(tree)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.label)
  .isExpandable((n) => Array.isArray(n.children))
  .expanded(expanded)
  .selected(selected)
  .draggable(true)
  .onActivate((n) => { lastActivated.value = n.label; })
  .onNodeMove(move)
  .folderMenu((folder) => [
    { label: 'New subfolder…', icon: 'plus', onClick: () => addFolder(folder.id) },
    'divider',
    { label: 'Delete folder', icon: 'trash-2', danger: true, onClick: () => remove(folder.id) },
  ])
  .leafMenu((leaf) => [
    { label: 'Open', icon: 'file', onClick: () => { lastActivated.value = leaf.label; } },
    'divider',
    { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => remove(leaf.id) },
  ])
  .viewportMenu(() => [
    { label: 'New folder at root…', icon: 'plus', onClick: () => addFolder(null) },
  ]);
</script>

<template>
  <div class="tree-frame">
    <CoarTree :builder="builder">
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
      </template>
    </CoarTree>
  </div>
  <p class="hint">
    Right-click a folder, a file, or the empty area below — each has its own menu.
    <code>useTree()</code> exposes <code>api.selectedId</code> (currently <code>{{ api.selectedId.value ?? '—' }}</code>)
    and <code>api.focusNode(id)</code> for imperative control.
  </p>
  <p v-if="lastActivated" class="hint">Last activated: <code>{{ lastActivated }}</code></p>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  max-width: 360px;
  min-height: 220px;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
```

### Context menus per target

Three setters, one per target type. Each callback returns an array of menu entries (`{ label, icon?, danger?, disabled?, onClick }` or the literal string `'divider'`):

```ts
builder
  .folderMenu(folder => [
    { label: 'Upload here', icon: 'upload', onClick: () => upload(folder.id) },
    { label: 'New subfolder', icon: 'plus', onClick: () => newFolder(folder.id) },
    'divider',
    { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => del(folder) },
  ])
  .leafMenu(leaf => [
    { label: 'Open', icon: 'file', onClick: () => openFile(leaf) },
    { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => del(leaf) },
  ])
  .viewportMenu(() => [
    { label: 'New folder', icon: 'plus', onClick: () => newFolder(null) },
  ]);
```

| Setter | Fires on | Receives |
|--------|----------|----------|
| `.folderMenu(folder => [])` | Right-click an expandable node | The folder node |
| `.leafMenu(leaf => [])` | Right-click a non-expandable node | The leaf node |
| `.viewportMenu(() => [])` | Right-click empty tree background | Nothing (`null` target) |

If a setter is omitted for a target, no menu opens on that target. Items without an `icon` align flush left; the tree allocates the icon column when *any* item in the menu uses an icon.

### Escape hatch — raw events

When you want a fully custom popover (form inputs, async sub-menus, third-party menu component) instead of the standard menu, use the event variants. They **override** the declarative setters for that target:

```ts
builder.onLeafContextMenu((leaf, ev) => {
  ev.preventDefault();
  myCustomPopover.openAt(ev.clientX, ev.clientY, leaf);
});
```

| Event setter | Overrides |
|--------------|-----------|
| `.onFolderContextMenu((folder, ev) => …)` | `.folderMenu` |
| `.onLeafContextMenu((leaf, ev) => …)` | `.leafMenu` |
| `.onViewportContextMenu((ev) => …)` | `.viewportMenu` |

### The `api`

`useTree()`'s second return value is a narrow imperative interface — call from anywhere without needing a template ref:

```ts
const { builder, api } = useTree<MyNode>();

// readonly refs (suitable for watch / computed)
api.selectedId   // Ref<string | null>
api.expandedIds  // Ref<Set<string>>

// readonly refs (multiple / checkbox modes)
api.selectedIds  // Ref<Set<string>>
api.checkedIds   // Ref<Set<string>>

// imperative (warn until mounted)
api.selectNode('some-id')       // highlight-select + focus (preferred)
api.focusNode('some-id')        // alias of selectNode (back-compat since 2.4.0)
api.expandTo('some-id')         // reveal a deep node
api.revealNode('some-id')       // scroll into view without stealing focus
api.moveNode('a', 'b', 'after') // accessible/programmatic move
api.getNode('some-id')          // resolve node by id, or null
api.reloadChildren('some-id')   // re-run loadChildren (retry / refresh)
api.startRename('some-id')      // enter inline-rename (needs `renamable`)
api.startCreate('some-id')      // open inline-create draft under a parent (needs `creatable`)
```

## Lazy loading (async children)

Fetch a node's children the first time it's expanded — for trees backed by an API where loading everything up front isn't an option. Two pieces:

- **`isExpandable`** must return `true` for a folder *before* its children exist (otherwise there's no chevron to expand). Derive it from the node's own "is a folder" flag, not from `getChildren`.
- **`loadChildren(node)`** fires on first expand of an unloaded folder. Return a `Promise` and the tree shows a spinner in the chevron until it settles; on rejection the row flips to an error state and `@load-error` fires. Your handler attaches the fetched children to your own `nodes` data — the tree re-renders and stops asking (a node counts as loaded once `getChildren` returns an array; `[]` is loaded-but-empty). Attach so `nodes` updates reactively — produce a **new root `nodes` reference** (`nodes.value = [...]`) or keep `nodes` deeply reactive; a pure in-place mutation on a shallow source leaves the spinner spinning. An unrelated `nodes` change never re-fires a node that already attempted-and-settled — retry is explicit (`api.reloadChildren(id)` or collapse + re-expand).

The demo below is interactive — dial in **latency** and a **failure rate** to watch the loading spinner, the error + **Retry** path, and the load-once-then-cache behaviour, then drill in to see each level load on its own. It renders the spinner at the row-icon position (the `hide-loading-spinner` + `isLoading` pattern below) rather than the built-in chevron spinner.

**Demo — `tree/demos/TreeLazyLoad.vue`**

```vue
<script setup lang="ts">
/**
 * Interactive lazy-loading demo. Folders fetch their children on first expand
 * via `loadChildren`. The simulator dials in latency + a failure rate so you can
 * actually SEE the loading spinner, the error + Retry path, and the
 * load-once-then-cache behaviour (collapse + re-expand never re-fetches).
 *
 * The spinner here replaces the row ICON (not the chevron): `hide-loading-spinner`
 * turns off the tree's built-in chevron spinner, and we render our own from the
 * `isLoading` slot prop. `hasError` drives the inline Retry button via
 * `api.reloadChildren`.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, CoarSegmentedControl, useTree } from '@cocoar/vue-ui';

interface Node {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  children?: Node[];
}

const roots = (): Node[] => [
  { id: 'src', name: 'src', kind: 'folder' },
  { id: 'docs', name: 'docs', kind: 'folder' },
  { id: 'assets', name: 'assets', kind: 'folder' },
];

const tree = ref<Node[]>(roots());
const expanded = ref(new Set<string>());

// ─── simulator knobs ───
const latency = ref(700);
const failurePct = ref(0);
const fetches = ref(0);

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Deterministic children for any folder — folders for the first two levels, then
// files, so you can drill in and watch each level lazy-load on its own.
function childrenFor(node: Node): Node[] {
  const depth = node.id.split('/').length;
  if (depth >= 3) {
    return [
      { id: `${node.id}/index.ts`, name: 'index.ts', kind: 'file' },
      { id: `${node.id}/styles.css`, name: 'styles.css', kind: 'file' },
    ];
  }
  return [
    { id: `${node.id}/components`, name: 'components', kind: 'folder' },
    { id: `${node.id}/lib`, name: 'lib', kind: 'folder' },
    { id: `${node.id}/index.ts`, name: 'index.ts', kind: 'file' },
    { id: `${node.id}/README.md`, name: 'README.md', kind: 'file' },
  ];
}

// Attach fetched children to the node, deep in the tree (reactive via the ref).
function attach(id: string, kids: Node[]) {
  const visit = (list: Node[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        n.children = kids;
        return true;
      }
      if (n.children && visit(n.children)) return true;
    }
    return false;
  };
  visit(tree.value);
  tree.value = [...tree.value];
}

const { builder, api } = useTree<Node>();
builder
  .nodes(tree)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.name)
  .isExpandable((n) => n.kind === 'folder')
  .expanded(expanded)
  .hideLoadingSpinner(true) // we render our own icon-position spinner from `isLoading`
  .loadChildren(async (node) => {
    fetches.value += 1;
    await delay(latency.value);
    if (Math.random() * 100 < failurePct.value) throw new Error('Simulated network error');
    attach(node.id, childrenFor(node));
  });

function reset() {
  expanded.value = new Set();
  tree.value = roots();
  fetches.value = 0;
}
</script>

<template>
  <div class="lz">
    <div class="lz__bar">
      <label class="lz__knob">
        <span class="lz__knob-label">Latency</span>
        <CoarSegmentedControl
          v-model="latency"
          size="xs"
          :options="[
            { value: 0, label: 'Instant' },
            { value: 700, label: '700ms' },
            { value: 1800, label: 'Slow' },
          ]"
        />
      </label>
      <label class="lz__knob">
        <span class="lz__knob-label">Failure</span>
        <CoarSegmentedControl
          v-model="failurePct"
          size="xs"
          :options="[
            { value: 0, label: '0%' },
            { value: 30, label: '30%' },
            { value: 100, label: 'Always' },
          ]"
        />
      </label>
      <button type="button" class="lz__reset" @click="reset">Reset</button>
      <span class="lz__stat">{{ fetches }} fetch{{ fetches === 1 ? '' : 'es' }}</span>
    </div>

    <div class="lz__frame">
      <CoarTree :builder="builder">
        <template #default="{ node, isLoading, hasError }">
          <span class="lz__row">
            <span v-if="isLoading" class="lz__spinner lz__icon" aria-hidden="true" />
            <CoarIcon
              v-else
              :name="node.kind === 'folder' ? 'folder' : 'file-text'"
              size="xs"
              class="lz__icon"
              :class="{ 'lz__icon--error': hasError }"
            />
            <span class="lz__label" :class="{ 'lz__label--error': hasError }">{{ node.name }}</span>
            <button
              v-if="hasError"
              type="button"
              class="lz__retry"
              @click.stop="api.reloadChildren(node.id)"
            >
              Retry
            </button>
          </span>
        </template>
      </CoarTree>
    </div>

    <p class="hint">
      Expand a folder → it fetches its children. Try <strong>Slow</strong> to watch the spinner, bump
      <strong>Failure</strong> and hit <strong>Retry</strong> on the red row, and drill in to see each
      level load on its own. Loaded folders cache — collapse + re-expand never re-fetches;
      <strong>Reset</strong> clears everything.
    </p>
  </div>
</template>

<style scoped>
.lz {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lz__bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.lz__knob {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lz__knob-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary);
}
.lz__reset {
  border: 1px solid var(--coar-border-neutral-secondary);
  background: transparent;
  color: var(--coar-text-neutral-secondary);
  border-radius: var(--coar-radius-xs, 3px);
  font: inherit;
  font-size: 12px;
  padding: 2px 10px;
  cursor: pointer;
}
.lz__reset:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}
.lz__stat {
  margin-left: auto;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  font-variant-numeric: tabular-nums;
}
.lz__frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  max-width: 400px;
  height: 300px;
  /* Non-virtualized trees don't own a scroll viewport — the consumer's
     container does. Without this, expanded rows overflow the frame. */
  overflow: auto;
}
/* The exact border-ring spinner from the file-explorer demo. No
   prefers-reduced-motion guard on purpose — a frozen loading indicator reads as
   "stuck", and this matches the file-explorer POC's spinner 1:1. */
.lz__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid var(--coar-border-neutral-tertiary);
  border-top-color: var(--coar-text-accent-primary);
  flex-shrink: 0;
  /* `!important` overrides VitePress's global prefers-reduced-motion reset
     (`*, ::before, ::after { animation-duration: 1ms !important }`), which would
     otherwise freeze this spinner into a static ring for reduced-motion users.
     A loading indicator that doesn't move reads as "stuck" — keep it spinning. */
  animation: lz-spin 700ms linear infinite !important;
}
@keyframes lz-spin {
  to {
    transform: rotate(360deg);
  }
}
.lz__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.lz__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.lz__icon--error {
  color: var(--coar-text-semantic-error-bold, #dc2626);
}
.lz__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lz__label--error {
  color: var(--coar-text-semantic-error-bold, #dc2626);
}
.lz__retry {
  flex-shrink: 0;
  border: 1px solid var(--coar-border-semantic-error, #dc2626);
  color: var(--coar-text-semantic-error-bold, #dc2626);
  background: transparent;
  border-radius: var(--coar-radius-xs, 2px);
  font-size: 11px;
  padding: 1px 6px;
  cursor: pointer;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
```

```ts
const { builder, api } = useTree<FsNode>();
builder
  .nodes(tree)
  .getId(n => n.id)
  .getChildren(n => n.children)            // undefined until loaded; [] = loaded-but-empty
  .isExpandable(n => n.kind === 'folder')  // expandable BEFORE children exist
  .loadChildren(async (node, { signal }) => {
    const kids = await myApi.fetchChildren(node.id, { signal }); // aborts on collapse
    attachChildren(node.id, kids);         // mutate your own `nodes` data
  })
  .maxConcurrentLoads(6)                   // cap fan-out for rate-limited backends (0 = unlimited)
  .onLoadError(({ node, error }) => toast.error(`Couldn't open ${node.name}`));
```

`loadChildren`'s second argument carries an `AbortSignal` that fires when the folder is collapsed or leaves the tree mid-flight — forward it to `fetch` so a cancelled load doesn't waste work or race a later reopen. A load that settles after being aborted is suppressed (no phantom error). `maxConcurrentLoads` (default `0` = unlimited) bounds simultaneous loads so an `expandAll()` / state-restore can't fan out unbounded.

The `default` slot exposes `isLoading` and `hasError` per row, and `api.reloadChildren(id)` forces a re-fetch — wire it to a retry button (or a "refresh folder" action):

```vue
<template #default="{ node, hasError }">
  <FileRow :node="node" />
  <button v-if="hasError" @click.stop="api.reloadChildren(node.id)">Retry</button>
</template>
```

> **Tip: Default loading + error visuals**
>
> By default the chevron shows a spinner while loading and a red **retry** icon on error (click it to re-fetch) — no extra markup needed. Set `hide-loading-spinner` to suppress **both** and render your own from `isLoading` / `hasError`. Collapsing then re-expanding an errored folder also retries.

> **Tip: Render your own loading indicator**
>
> Prefer a spinner that replaces the row icon (or anything else)? Set `hide-loading-spinner` to suppress the built-in chevron spinner and render your own from the `isLoading` slot prop — the tree still owns the *when* (expand-trigger, dedupe, error state), you own the *look*:
>
```vue
<CoarTree :builder="builder" hide-loading-spinner>
  <template #default="{ node, isLoading }">
    <Spinner v-if="isLoading" />
    <Icon v-else :name="node.icon" />
    <span>{{ node.label }}</span>
  </template>
</CoarTree>
```

## Virtualization

For trees with hundreds or thousands of visible rows, enable virtualization to mount only the rows actually inside the viewport. The component is built on `useVirtualList` — fixed-known-size virtualizer, no DOM auto-measure — so you declare the row height once.

**Demo — `tree/demos/TreeVirtualization.vue`**

```vue
<script setup lang="ts">
/**
 * Virtualized tree with 5 000 nodes across two levels. Without virtualization
 * this would mount 5 000 row components — with `.virtualize({ itemSize: 28 })`
 * only the rows inside the viewport (~15 at this size) + a 5-row overscan
 * are mounted, regardless of how far the user scrolls.
 *
 * Try expanding one of the "Category" folders — each holds 250 entries.
 * Scrolling stays smooth even at thousands of nodes.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, useTree, vTooltip } from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

// 20 categories × 250 items = 5 000 leaves, plus the 20 folders themselves.
const tree: Node[] = Array.from({ length: 20 }, (_, c) => ({
  id: `cat-${c}`,
  label: `Category ${c + 1}`,
  children: Array.from({ length: 250 }, (_, i) => ({
    id: `cat-${c}-item-${i}`,
    label: `item-${c + 1}-${String(i + 1).padStart(3, '0')}.md`,
  })),
}));

const expanded = ref(new Set<string>(['cat-0']));   // first category open by default
const selected = ref<string | null>(null);

const { builder } = useTree<Node>();
builder
  .nodes(tree)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.label)
  .expanded(expanded)
  .selected(selected)
  // Default itemSize is 28px which matches the standard row layout. Bump it
  // when the slot adds extra padding or multi-line content. Overscan of 8
  // gives a slightly smoother scroll on slow GPUs.
  .virtualize({ itemSize: 28, overscan: 8 });
</script>

<template>
  <div class="tree-frame">
    <CoarTree :builder="builder">
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
      </template>
    </CoarTree>
  </div>
  <p class="hint">
    5 000 nodes total · only the ~15 visible rows are mounted at a time · expand more categories to see scroll stay smooth.
  </p>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  max-width: 360px;
  /* Virtualization needs an explicit height for the scroll viewport. Without
     one the tree would collapse to 0 height (flex / grid auto sizing) and
     useVirtualList wouldn't have anything to measure. */
  height: 320px;
  display: flex;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
```

### Scale (50 000 nodes)

Virtualization plus the flat-render pipeline scales to tens of thousands of nodes. Hit **Expand all** to flatten ~51 200 rows into the visible list — only ~30 row components stay mounted, and selecting / arrow-keying / dragging stays smooth. Expand-all is O(1) in the virtualizer for the constant row height, and a selection or drag-over re-renders only the rows that actually change.

**Demo — `tree/demos/TreeStress.vue`**

```vue
<script setup lang="ts">
/**
 * Stress / benchmark demo — ~51 200 nodes across 3 levels.
 *
 * 200 top folders × 5 subfolders × 50 leaves. Even with EVERY folder expanded
 * (51 200 visible rows) only the ~viewport rows are mounted, and the hot paths
 * stay cheap:
 *   - flat `visibleRows` DFS stamps id / isExpandable / draggable once per row;
 *   - the virtualizer skips the O(n) offset array for the constant 28-px height
 *     (expand-all / collapse-all is O(1) in the virtualizer);
 *   - selection / focus / drag-over re-render only the rows that change, because
 *     each row derives its own flags from the shared reactive state;
 *   - drag-and-drop resolves the source + cycle check in O(depth), not O(n).
 *
 * Use "Expand all" then drag the scrollbar, arrow-key through rows, and select
 * rows — it stays smooth at 50k.
 */
import { ref, computed } from 'vue';
import { CoarTree, CoarIcon, CoarButton, useTree } from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const TOP = 200;
const SUB = 5;
const LEAVES = 50;

const tree: Node[] = Array.from({ length: TOP }, (_, t) => ({
  id: `f${t}`,
  label: `Folder ${t + 1}`,
  children: Array.from({ length: SUB }, (_, s) => ({
    id: `f${t}-s${s}`,
    label: `Section ${t + 1}.${s + 1}`,
    children: Array.from({ length: LEAVES }, (_, i) => ({
      id: `f${t}-s${s}-i${i}`,
      label: `item-${t + 1}.${s + 1}.${String(i + 1).padStart(2, '0')}.md`,
    })),
  })),
}));

const totalNodes = TOP + TOP * SUB + TOP * SUB * LEAVES; // 200 + 1 000 + 50 000

// Collect every folder id so "Expand all" can flatten the whole tree into the
// visible-row list — the worst case for the DFS + virtualizer.
const allFolderIds: string[] = [];
for (const f of tree) {
  allFolderIds.push(f.id);
  for (const s of f.children ?? []) allFolderIds.push(s.id);
}

const expanded = ref(new Set<string>(['f0', 'f0-s0']));
const selected = ref<string | null>(null);

const visibleCount = computed(() => {
  // Mirrors the tree's own DFS for the on-screen counter (not used internally).
  let n = 0;
  const walk = (list: Node[]) => {
    for (const node of list) {
      n++;
      if (node.children && expanded.value.has(node.id)) walk(node.children);
    }
  };
  walk(tree);
  return n;
});

const { builder } = useTree<Node>();
builder
  .nodes(tree)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.label)
  .expanded(expanded)
  .selected(selected)
  .draggable(true)
  .onNodeMove(() => {
    // No-op for the demo — we only exercise the drag machinery, not mutation.
  })
  .virtualize({ itemSize: 28, overscan: 8 });

function expandAll() {
  expanded.value = new Set(allFolderIds);
}
function collapseAll() {
  expanded.value = new Set();
}
</script>

<template>
  <div class="stress">
    <div class="stress__bar">
      <CoarButton size="s" variant="secondary" @click="expandAll">Expand all</CoarButton>
      <CoarButton size="s" variant="secondary" @click="collapseAll">Collapse all</CoarButton>
      <span class="stress__stat">
        {{ totalNodes.toLocaleString() }} nodes · {{ visibleCount.toLocaleString() }} visible ·
        ~{{ Math.ceil(320 / 28) + 16 }} mounted
      </span>
    </div>
    <div class="stress__frame">
      <CoarTree :builder="builder">
        <template #default="{ node }">
          <span class="stress__row">
            <CoarIcon :name="node.children ? 'folder' : 'file-text'" size="xs" class="stress__icon" />
            <span class="stress__label">{{ node.label }}</span>
          </span>
        </template>
      </CoarTree>
    </div>
    <p class="stress__hint">
      Expand all → 51 200 visible rows, yet only ~30 row components exist at any time. Scroll, arrow-key,
      and select stay smooth; dragging resolves in O(depth), not O(nodes).
    </p>
  </div>
</template>

<style scoped>
.stress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stress__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.stress__stat {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  font-variant-numeric: tabular-nums;
}
.stress__frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  max-width: 420px;
  height: 320px;
  display: flex;
}
.stress__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.stress__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.stress__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stress__hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
```

**Configuration:**

```ts
// builder mode
builder.virtualize(true);                                      // defaults: itemSize 28, overscan 5
builder.virtualize({ itemSize: 32 });                          // uniform 32-px rows
builder.virtualize({ itemSize: (i) => myHeights[i] });         // variable per visible-row
builder.virtualize({ itemSize: 28, overscan: 10 });            // larger scroll buffer

// props mode
<CoarTree :virtualize="true" ... />
<CoarTree :virtualize="{ itemSize: 32 }" ... />
```

**Requirements + caveats:**

- **Explicit height.** The tree owns its scroll container when virtualized. Put it in a sized parent (fixed `height`, flex with `flex: 1` + `min-height: 0`, grid cell with `1fr`, etc.). Without a measurable viewport `useVirtualList` produces an empty render.
- **Row height must match.** The configured `itemSize` is what the spacer + absolute positioning use. If your slot renders a row taller than `itemSize`, content overflows; shorter and there's empty space. Measure your row in DevTools and configure accordingly.
- **No auto-measurement.** This is a fixed-known-size virtualizer (unlike TanStack Virtual's `measureElement`). For trees with truly dynamic row heights (e.g. wrapping multi-line labels), keep virtualization off — performance is fine up to ~500 visible rows even without it.
- **Both modes use flat rendering.** Whether virtualized or not, the tree renders rows as a flat DFS list (depth via `padding-left`, ARIA hierarchy via `aria-level`). `<ul role="group">` nesting was dropped on purpose — it's optional under WAI-ARIA and incompatible with flat virtualization.

## Accessibility

### Keyboard

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move focus to previous / next visible row (skips disabled). Hold `Shift` (multi modes) to extend the selection |
| `→` / `←` | Expand / descend, collapse / ascend (inverted under RTL) |
| `Home` / `End` | First / last visible (enabled) row |
| `PageUp` / `PageDown` | Move focus by one viewport of rows |
| `*` | Expand all sibling folders at the focused row's level |
| `Enter` | Activate (emits `@activate`) — typically opens the node |
| `Space` | Checkbox mode: toggle the row's checkbox. Otherwise: expand a folder / select a leaf |
| `Ctrl`/`Cmd` + `A` | Select all visible rows (multiple / checkbox) |
| `Ctrl`/`Cmd` + `X` … `V` | Grab the focused row, then drop it relative to the focused target (accessible move); `Escape` cancels |
| `F2` | Start an inline rename on the focused row (needs `renamable`) |
| Letter | Type-ahead: jump to the next visible row whose label starts with the typed prefix (resets after 500 ms) |

### ARIA

- Root has `role="tree"` — give it an accessible name via `ariaLabel` / `ariaLabelledby`. `aria-multiselectable="true"` in multiple / checkbox modes.
- Each row has `role="treeitem"` with `aria-level`, `aria-posinset`, `aria-setsize`. `aria-selected` is set on **every** row (`true` on selected, `false` otherwise — the APG multi-select pattern). Checkbox rows also carry `aria-checked` (`true` / `false` / `mixed`); disabled rows `aria-disabled`; loading rows `aria-busy`.
- A polite **live region** announces drag / keyboard-move state (pick-up, dropped, cancelled) and lazy-load **errors**. All strings are overridable via [`labels`](#i18n-labels).
- **Flat rendering** — rows are a single DFS list, not nested `<ul role="group">`. Hierarchy is conveyed by `aria-level` (WAI-ARIA permits this and it's what enables flat virtualization; see [Virtualization](#virtualization)).

## Inline rename

Set `renamable` to opt into built-in inline editing. Drop `<CoarTreeNodeLabel>` into the default slot in place of your label span — it swaps to an `<input>` while its row is being renamed and picks up the rename machinery via injection (no extra wiring). Start a rename from a context-menu item or button with `api.startRename(id)`, or press **F2** on the focused row. Commit on Enter / blur fires `@rename`; Escape (or an empty name) fires `@rename-cancel`. Conflict handling / validation is the consumer's job — the tree is stateless about it, so on failure just call `api.startRename(id)` again.

```vue
<script setup lang="ts">
import { CoarTree, CoarTreeNodeLabel, useTree } from '@cocoar/vue-ui'
const { builder, api } = useTree<FsNode>()
builder
  .nodes(tree).getId(n => n.id).getChildren(n => n.children).getLabel(n => n.name)
  .renamable(true)
  .onRename(({ node, newName }) => applyRename(node.id, newName))
  .folderMenu(folder => [{ label: 'Rename', icon: 'pencil', onClick: () => api.startRename(folder.id) }])
</script>

<template>
  <CoarTree :builder="builder">
    <template #default="{ node }">
      <CoarIcon :name="node.children ? 'folder' : 'file'" size="xs" />
      <CoarTreeNodeLabel :label="node.name" />
    </template>
  </CoarTree>
</template>
```

## Inline create

The counterpart to inline rename. Set `creatable` and call `api.startCreate(parentId, opts?)` to insert a **transient draft row** at its target position — `parentId: null` creates at the root, otherwise the parent auto-expands and the draft renders nested under it. The draft shows a focused `<input>` with the same blur-grace timer as rename; **Enter / blur** commits and fires `@create` with `{ parentId, name, kind }`, while **Escape** or an empty name fires `@create-cancel`. The draft is purely transient: persist the node in your `@create` handler and feed the real one back via your data source — the tree drops the draft on commit.

`opts`: `kind` (`'folder'` \| `'leaf'`, default `'folder'` — picks the default icon and is echoed back on `@create`), `initialName` (prefill, default `''`), `position` (`'first'` \| `'last'` within the parent, default `'last'`). Override the default draft icon with the optional `#draft` slot (`{ kind, depth }`).

```vue
<script setup lang="ts">
import { CoarTree, CoarTreeNodeLabel, useTree } from '@cocoar/vue-ui'
const { builder, api } = useTree<FsNode>()
builder
  .nodes(tree).getId(n => n.id).getChildren(n => n.children).getLabel(n => n.name)
  .creatable(true)
  .onCreate(({ parentId, name, kind }) => createNode(parentId, name, kind))
  .folderMenu(folder => [
    { label: 'New folder', icon: 'folder-plus', onClick: () => api.startCreate(folder.id, { kind: 'folder' }) },
  ])
  .viewportMenu(() => [
    { label: 'New folder', icon: 'folder-plus', onClick: () => api.startCreate(null) },
  ])
</script>

<template>
  <CoarTree :builder="builder">
    <template #default="{ node }">
      <CoarIcon :name="node.children ? 'folder' : 'file'" size="xs" />
      <CoarTreeNodeLabel :label="node.name" />
    </template>
    <!-- optional: custom draft icon -->
    <template #draft="{ kind }">
      <CoarIcon :name="kind === 'folder' ? 'folder' : 'file'" size="xs" />
    </template>
  </CoarTree>
</template>
```

Pairs with `@cocoar/vue-file-explorer-core`'s optimistic `addFolder` so the draft → real-node handoff has no flicker.

### Async validation — keep the draft open on rejection

If creation can fail server-side (a duplicate-name 409, a permission check), you don't want the user's typed name discarded. Two paths, depending on which API form you use:

- **Builder form** — return a `Promise` from `onCreate`. The tree keeps the draft mounted + focused (name intact) until it settles: it drops the draft on resolve and **reopens it on reject** so the user can fix the name and retry.

  ```ts
  builder.creatable(true).onCreate(async ({ parentId, name }) => {
    await api.createFolder(parentId, name) // throws on 409 → draft stays open
  })
  ```

- **Prop / event form** — Vue's `emit` can't return a value, so reopen imperatively: on a rejected `@create`, re-call `startCreate` with `initialName` to restore the draft with the typed text.

  ```ts
  async function onCreate({ parentId, name }) {
    try {
      await createFolder(parentId, name)
    } catch {
      treeRef.value?.startCreate(parentId, { initialName: name }) // reopen, name preserved
    }
  }
  ```

> Both `creatable` / `@create` / `@create-cancel` and `api.startCreate` work in **prop-mode** too (without `useTree()`): `startCreate` is on the component's template ref alongside `startRename`.

## Disabled nodes

`isDisabled(node)` marks rows non-interactive: they can't be selected, activated, directly checked, focused by keyboard, matched by type-ahead, or dragged, and they render `aria-disabled` + dimmed. The `isDisabled` slot prop lets you adjust your own row content. Cascade from a *checked ancestor* still flows through a disabled descendant — disabled blocks **direct** interaction, not bulk parent operations.

```ts
builder.isDisabled(n => n.readonly)
```

## Search / filter

Pass the matching ids as `matchedIds` and the tree handles the rest. Two modes:

- **Highlight (default):** every row stays visible; the slot gets `isMatch` / `isMatchAncestor` for styling, and the ancestors of each match auto-expand so deep hits are revealed (add-only — your manual collapses survive).
- **Filter** (`filter` prop / `.filter()`): non-matches are hidden — but the **ancestor path of each match stays visible as "virtual parents"** (flagged `isMatchAncestor`, so you can de-emphasize them). The tree never collapses into a contextless flat list; you always see *where* a hit lives. Computing `matchedIds` itself stays yours (any fuzzy / regex / field match you like).

  `filterMode` (mirrors PrimeVue) decides what a matched **folder** keeps:
  - **`'strict'`** (default) — matches + ancestor path only; a matched folder's non-matching children stay hidden. This is the VS Code / react-arborist "filter down to what I searched for" convention.
  - **`'lenient'`** — a matched folder reveals its whole subtree.

```vue
<script setup>
const matchedIds = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return undefined
  return new Set(allNodes.value.filter(n => n.name.toLowerCase().includes(q)).map(n => n.id))
})
</script>

<template>
  <CoarTree :builder="builder" :matched-ids="matchedIds" :filter="hideNonMatches">
    <template #default="{ node, isMatch, isMatchAncestor }">
      <span :class="{ hit: isMatch, 'virtual-parent': isMatchAncestor }">{{ node.name }}</span>
    </template>
  </CoarTree>
</template>
```

## Density & theming

`density` (`xs` / `s` / `m` / `l`, default `m`) scales the **whole** row — font, padding, indent, **and** the built-in chevron + checkbox (box and glyph) together. Under the hood it sets CSS variables you can also override directly to retheme without forking:

| Variable | Default (`m`) | Controls |
|----------|---------------|----------|
| `--coar-tree-indent` | `14px` | Per-level indent step |
| `--coar-tree-indent-base` | `8px` | Base (level-0) indent |
| `--coar-tree-row-pad-y` / `-x` | `3px` / `4px` | Row padding |
| `--coar-tree-row-font` | inherits body-small | Row font size |
| `--coar-tree-control-size` | `16px` | Chevron + checkbox box size |
| `--coar-tree-icon-size` | `12px` | Glyph inside (checkmark / dash / chevron) |

The icons **you** render in the slot are still yours to size — but `--coar-tree-icon-size` cascades into the slot, so you can scale them with the tree:

```vue
<template #default="{ node }">
  <CoarIcon :name="node.children ? 'folder' : 'file'" size="var(--coar-tree-icon-size)" />
  <span>{{ node.name }}</span>
</template>
```

> **Warning**
>
> When virtualizing, set `virtualize.itemSize` to match your density's row height — the virtualizer is fixed-size and doesn't auto-measure.

## i18n / labels {#i18n-labels}

Every built-in string (chevron Expand / Collapse, the loading spinner, the retry button, the inline-create input's `aria-label`, and all the polite drag / move / load-error announcements) is overridable via `labels` for localization. Unset fields fall back to the English `DEFAULT_TREE_LABELS`.

```ts
builder.labels({
  expand: 'Aufklappen',
  collapse: 'Zuklappen',
  loading: 'Lädt …',
  retry: 'Erneut',
  draftFolderName: 'Name des neuen Ordners',
  draftFileName: 'Name der neuen Datei',
  moveCancelled: 'Verschieben abgebrochen.',
})
```

## Recipes

### Truncation in narrow sidebars

The tree owns indentation and the chevron but doesn't render the label — the consumer does, via the default slot. The standard pattern is **ellipsis + `v-tooltip` with `onlyOnOverflow: true`** on the label span — the styled Coar tooltip appears only when the text is actually clipped, and stays out of the way when the full label is visible:

```vue
<script setup lang="ts">
import { vTooltip } from '@cocoar/vue-ui';
</script>

<template #default="{ node }">
  <!--
    The tooltip lives on a wrapper around the icon + label — NOT the label
    alone. When the row gets so narrow that the label collapses to 0 px
    (deep nesting in a slim sidebar), the icon still has a hit area and the
    tooltip remains reachable. The string form of `onlyOnOverflow` tells the
    directive to gate on the *child label's* overflow, not the wrapper's.
  -->
  <span
    v-tooltip="{ content: node.label, onlyOnOverflow: '.label' }"
    class="row-main"
  >
    <CoarIcon :name="node.children ? 'folder' : 'file'" size="xs" />
    <span class="label">{{ node.label }}</span>
  </span>
</template>

<style>
.row-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.label {
  flex: 1;
  min-width: 0;            /* allow shrink inside the flex row */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

`onlyOnOverflow` accepts three forms — all evaluated lazily on hover/focus, no `ResizeObserver` overhead:

| Form | Meaning |
|------|---------|
| `true` | Check `scrollWidth > clientWidth` on the trigger element itself |
| `string` (CSS selector) | Check overflow on the matched descendant — use when the tooltip is on a wrapper but only an inner element is what gets truncated |
| `function: (el) => boolean` | Custom predicate; return `true` to show the tooltip |

> **Tip: Scale**
>
> A tree with hundreds of mounted rows means hundreds of `v-tooltip` directive listeners. Combine this pattern with [virtualization](#virtualization) for very large trees — only the ~visible rows hold listeners. For low-overhead plain-text fallback (e.g. mobile / embedded contexts where the overlay system isn't installed), use the native `:title` attribute instead — same UX, zero JS.

### File-explorer shell

Combine `<CoarTree>` with `CoarTabGroup`, `CoarScriptEditor`, `CoarMarkdownEditor`, and `CoarDocumentViewer` to get a VS-Code-style document explorer. The tree owns the asset hierarchy and DnD; tabs hold the open editors; per-row `⋮` and right-click expose CRUD actions through a single `<CoarContextMenu>`.

### Multi-tree drag

Two `<CoarTree>` instances on the same page can exchange nodes via the shared `application/x-coar-tree-node` MIME type. Each tree's `@node-move` only fires when the drop lands on one of its own rows — you decide on the consumer side how to coordinate the source/target trees (e.g. a parent component that owns both data stores).

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `builder` | `TreeBuilder<T>` | `undefined` | Fluent builder from `useTree()`. When set, the other config props are ignored. Recommended for non-trivial cases |
| `nodes` | `readonly T[]` | — | Root nodes (required in props-mode; ignored when `builder` is set) |
| `getId` | `(node: T) => string` | — | Identity extractor. Must be unique across the entire visible tree (required in props-mode) |
| `getChildren` | `(node: T) => readonly T[] \| null \| undefined` | `undefined` | Returns the children of a node — return `undefined` or `null` for leaves. Without it, the tree is a flat list |
| `getLabel` | `(node: T) => string` | `undefined` | Used by type-ahead navigation. Optional but recommended for keyboard UX |
| `isExpandable` | `(node: T) => boolean` | derived from `getChildren` | Override branch detection — useful when a folder should always render as expandable even if its children are lazy-loaded |
| `isDisabled` | `(node: T) => boolean` | `undefined` | Mark nodes non-interactive: no select / activate / check / keyboard-focus, `aria-disabled`, dimmed. See [Disabled nodes](#disabled-nodes) |
| `loadChildren` | `(node: T, ctx: { signal: AbortSignal }) => void \| Promise<void>` | `undefined` | Lazily fetch a node's children on first expand. Pair with `isExpandable`. `ctx.signal` aborts on collapse / removal. See [Lazy loading](#lazy-loading-async-children) |
| `maxConcurrentLoads` | `number` | `0` | Cap simultaneous in-flight `loadChildren` calls (extra ones queue). `0` = unlimited. Set a small number (e.g. `6`) for rate-limited backends |
| `hideLoadingSpinner` | `boolean` | `false` | Suppress the built-in chevron spinner **and** retry affordance. Set it when you render your own from `isLoading` / `hasError` |
| `selectionMode` | `'single' \| 'multiple' \| 'checkbox'` | `'single'` | See [Selection](#selection). `single` → `v-model:selected`; `multiple`/`checkbox` → `v-model:selectedIds` (+ `v-model:checkedIds` for checkbox) |
| `checkStrictly` | `boolean` | `false` | Checkbox mode only: independent parent/child checks, no cascade / indeterminate |
| `draggable` | `boolean \| ((n: T) => boolean)` | `false` | Allow internal drag-to-reorder. Pass a function to enable per-node |
| `canDrop` | `(source: T, target: T \| null, position: 'before' \| 'inside' \| 'after') => boolean` | `undefined` | Veto drops on top of the built-in cycle guard. Advisory — `source` is the dragstart snapshot; integrity is guaranteed regardless |
| `getDragImage` | `(node: T) => HTMLElement \| string \| null \| undefined` | `undefined` | Custom drag ghost (element or HTML string); falls back to the default row image |
| `activateOnClick` | `boolean` | `false` | Fire `activate` on a single click too (not only double-click / Enter) |
| `renamable` | `boolean` | `false` | Opt into built-in inline rename (`api.startRename` / F2 / `@rename`). See [Inline rename](#inline-rename) |
| `creatable` | `boolean` | `false` | Opt into built-in inline create (`api.startCreate` / `@create`). See [Inline create](#inline-create) |
| `acceptsFiles` | `boolean` | `false` | Accept OS file drops onto folder rows / the background |
| `acceptsData` | `string[]` | `undefined` | MIME type(s) of app-internal drags to accept as a drop (e.g. a card from a grid). Fires `@data-drop`. See [App-internal drops](#app-internal-drops-drag-something-onto-a-node) |
| `autoExpandDelay` | `number` | `700` | Milliseconds the cursor must hover before a collapsed folder auto-expands during a drag |
| `virtualize` | `boolean \| { itemSize?, overscan? }` | `false` | Enable row virtualization. `true` uses defaults (28-px rows, 5-row overscan); pass an object to customize |
| `density` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Row spacing preset (sets the spacing CSS vars). With virtualization, match `virtualize.itemSize` to the density's row height |
| `ariaLabel` | `string` | `undefined` | Accessible name on the `role="tree"` element |
| `ariaLabelledby` | `string` | `undefined` | Id of an external label element for the `role="tree"` element |
| `labels` | `Partial<CoarTreeLabels>` | English defaults | Override built-in / screen-reader strings (chevron, spinner, retry, announcements) for i18n |
| `matchedIds` | `Set<string>` | `undefined` | Search hits — drives `isMatch` / `isMatchAncestor` slot props + auto-expand-to-match. See [Search / filter](#search-filter) |
| `filter` | `boolean` | `false` | With `matchedIds`, hide non-matches but keep the matches + their ancestor path ("virtual parents"). See [Search / filter](#search-filter) |
| `filterMode` | `'strict' \| 'lenient'` | `'strict'` | What a matched **folder** keeps when filtering. `strict` = matches + path only; `lenient` = the matched folder's whole subtree. See [Search / filter](#search-filter) |
| `v-model:expanded` | `Set<string>` | empty `Set` | Ids of expanded folders. Replaced with a fresh `Set` on each change to trigger reactivity |
| `v-model:selected` | `string \| null` | `null` | Selected row id (**single** mode) |
| `v-model:selectedIds` | `Set<string>` | empty `Set` | Highlight selection (**multiple** / **checkbox** modes) |
| `v-model:checkedIds` | `Set<string>` | empty `Set` | Checkbox selection (**checkbox** mode), independent of the highlight |

### Events

| Event | Payload | Fires |
|-------|---------|-------|
| `activate` | `(node: T)` | Double-click on a row or `Enter` on the focused row (also single click if `activateOnClick`) |
| `select` | `({ node: T \| null, ids: readonly string[], via: 'user' \| 'api' })` | The highlight selection changed. `node` = the row acted on, `ids` = the full selection after, `via` = user gesture vs `api` call |
| `context-menu` | `(node: T \| null, ev: MouseEvent)` | Right-click on a row (`node` set) or background (`node` is `null`). The default action is suppressed automatically by `useContextMenu().open(ev)` |
| `files-drop` | `({ files: FileList, target: T \| null })` | OS files dropped on a folder (`target` set) or empty background (`target` is `null`). Only fires when `accepts-files` is `true` |
| `data-drop` | `({ node: T \| null, position, dataTransfer: DataTransfer })` | An app-internal drag (an `accepts-data` MIME) dropped on a row (`node` set) or background (`node` is `null`). Read your payload via `dataTransfer.getData(mime)` in the handler |
| `node-move` | `({ source: T, target: T \| null, position })` | Internal drag-drop OR keyboard move / `api.moveNode`. `position` is `'before'`, `'inside'`, or `'after'`. `target: null` + `'inside'` means "move to root" |
| `rename` | `({ node: T, newName: string })` | An inline rename committed (Enter / blur, non-empty). Needs `renamable`. See [Inline rename](#inline-rename) |
| `rename-cancel` | `(node: T)` | An inline rename cancelled (Escape, or committed empty) |
| `create` | `({ parentId: string \| null, name: string, kind: 'folder' \| 'leaf' })` | An inline create committed (Enter / blur, non-empty). Needs `creatable`. See [Inline create](#inline-create) |
| `create-cancel` | — | An inline create cancelled (Escape, or committed empty) |
| `load-error` | `({ node: T, error: unknown })` | A lazy `loadChildren` promise rejected. Only fires when `loadChildren` is set |
| `update:expanded` | `(Set<string>)` | Folder expanded / collapsed |
| `update:selected` | `(string \| null)` | Selection changed (single mode) |
| `update:selectedIds` | `(Set<string>)` | Highlight selection changed (multiple / checkbox modes) |
| `update:checkedIds` | `(Set<string>)` | Checkbox selection changed (checkbox mode) |

### Slots

| Slot | Props | Description |
|------|-------|-------------|
| `default` | `{ node, depth, isExpanded, isSelected, isChecked, isIndeterminate, isFocused, isExpandable, isMatch, isMatchAncestor, isDisabled, isRenaming, isLoading, hasError }` | Row body. The tree renders indentation, chevron, checkbox (checkbox mode), focus ring and drop indicators; you render the icon, label, inline action buttons, dirty markers, etc. |
| `empty` | — | Shown when `nodes` is empty. Defaults to nothing — provide your own empty-state copy |
| `draft` | `{ kind: 'folder' \| 'leaf', depth }` | Leading content (icon) for the inline-create draft row. Defaults to a folder/file icon. Needs `creatable`. See [Inline create](#inline-create) |

The `default` slot props in full:

| Prop | Meaning |
|------|---------|
| `isSelected` | In the highlight selection (`selected` / `selectedIds`) |
| `isChecked` / `isIndeterminate` | Checkbox fully / partially checked (checkbox mode) |
| `isMatch` / `isMatchAncestor` | A search hit / an ancestor of one (see [Search / filter](#search-filter)) |
| `isDisabled` | `isDisabled(node)` returned true |
| `isRenaming` | This row is in inline-rename mode |
| `isLoading` / `hasError` | Lazy `loadChildren` in flight / failed |

### Exposed methods

Available on both the **template ref** and the builder **`api`** (the `api` warns if called before mount; `getNode` returns `null`):

| Method | Description |
|--------|-------------|
| `selectNode(id)` | Highlight-select **and** focus a node (the "reveal & select" action) — preferred |
| `focusNode(id)` | Builder `api`: alias of `selectNode` (selects + focuses, back-compat since 2.4.0). Template ref: focus-only. Prefer `selectNode` / `revealNode` for explicit intent |
| `expandAll()` / `collapseAll()` | Expand every loaded, expandable node / collapse everything |
| `expandTo(id)` | Expand all loaded ancestors of `id` so its row becomes visible |
| `revealNode(id)` | Scroll a node into view **without** stealing focus (expands ancestors first) |
| `getNode(id)` | Resolve a node by id from the loaded tree, or `null` |
| `moveNode(sourceId, targetId, position)` | Move a node (keyboard / a11y equivalent of a drop); runs the cycle + `canDrop` guards; returns whether it emitted |
| `reloadChildren(id)` | Force `loadChildren` to (re)run — retry after an error or refresh a loaded folder |
| `startRename(id)` | Enter inline-rename mode on a node (needs `renamable`) |
| `startCreate(parentId, opts?)` | Open an inline-create draft under `parentId` (`null` = root); needs `creatable`. `opts`: `{ kind?, initialName?, position? }` |

### Constants

| Constant | Value | Use |
|----------|-------|-----|
| `COAR_TREE_DRAG_MIME` | `'application/x-coar-tree-node'` | Mime type set on `DataTransfer` for internal drags. Read it on `drop` if you're orchestrating drags between two trees that share an outer container |
