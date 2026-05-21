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
