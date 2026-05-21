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
