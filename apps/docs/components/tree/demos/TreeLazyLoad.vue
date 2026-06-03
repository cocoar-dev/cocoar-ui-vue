<script setup lang="ts">
/**
 * Lazy / async children. Folders render expandable before their children exist
 * (`isExpandable(() => folder)`), and `loadChildren` fetches them on first
 * expand. The tree shows a spinner in the chevron while the promise is pending,
 * flips the row to an error state if it rejects, and exposes
 * `api.reloadChildren(id)` for a retry. The consumer owns the data — it just
 * attaches the fetched children to its own `nodes`.
 *
 * The "Broken folder" always fails so you can see the error + Retry path.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, useTree } from '@cocoar/vue-ui';

interface FsNode {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  children?: FsNode[];
}

const tree = ref<FsNode[]>([
  { id: 'documents', name: 'Documents', kind: 'folder' },
  { id: 'pictures', name: 'Pictures', kind: 'folder' },
  { id: 'broken', name: 'Broken folder', kind: 'folder' },
]);

const expanded = ref(new Set<string>());

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Simulated "fetch" — returns a fresh set of children for any folder.
function makeChildren(node: FsNode): FsNode[] {
  return [
    { id: `${node.id}/team`, name: 'Team', kind: 'folder' },
    { id: `${node.id}/archive`, name: 'Archive', kind: 'folder' },
    { id: `${node.id}/overview.md`, name: 'overview.md', kind: 'file' },
    { id: `${node.id}/budget.xlsx`, name: 'budget.xlsx', kind: 'file' },
  ];
}

// Attach children to the node with `id`, deep in the tree (reactive via the ref).
function setChildren(id: string, kids: FsNode[]) {
  const visit = (list: FsNode[]): boolean => {
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

const { builder, api } = useTree<FsNode>();
builder
  .nodes(tree)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.name)
  // Folders are expandable even before their children are fetched.
  .isExpandable((n) => n.kind === 'folder')
  .expanded(expanded)
  .loadChildren(async (node) => {
    await delay(700); // simulate the network
    if (node.id.endsWith('broken')) throw new Error('Network error');
    setChildren(node.id, makeChildren(node));
  })
  .onLoadError(({ node, error }) => {
    // eslint-disable-next-line no-console -- demo only
    console.warn('Failed to load', node.name, error);
  });
</script>

<template>
  <div class="lazy-frame">
    <CoarTree :builder="builder">
      <template #default="{ node, hasError }">
        <span class="lazy-row">
          <CoarIcon
            :name="node.kind === 'folder' ? 'folder' : 'file-text'"
            size="xs"
            class="lazy-icon"
          />
          <span class="lazy-label">{{ node.name }}</span>
          <button
            v-if="hasError"
            type="button"
            class="lazy-retry"
            @click.stop="api.reloadChildren(node.id)"
          >
            Retry
          </button>
        </span>
      </template>
    </CoarTree>
  </div>
  <p class="hint">
    Expand a folder → spinner → children load after ~700&nbsp;ms. Drill into <em>Team</em> /
    <em>Archive</em> to load deeper levels. <em>Broken folder</em> fails — click <strong>Retry</strong>.
  </p>
</template>

<style scoped>
.lazy-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  max-width: 360px;
  padding: 4px 0;
}
.lazy-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.lazy-icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.lazy-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lazy-retry {
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
  margin-top: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
