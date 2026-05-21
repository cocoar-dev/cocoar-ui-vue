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
