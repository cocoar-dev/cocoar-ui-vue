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
