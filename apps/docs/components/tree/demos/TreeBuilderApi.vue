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
