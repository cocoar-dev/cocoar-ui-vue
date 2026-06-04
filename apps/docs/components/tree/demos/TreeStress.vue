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
