<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarIcon } from '@cocoar/vue-ui';
import type { TreeCellRendererConfig } from './tree-cell-renderer.models';
import type { CoarTreeContext, TreeNodeMeta } from '../builders/coar-grid-builder';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<TreeCellRendererConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

const treeCtx = computed<CoarTreeContext | undefined>(
  () => props.params.context?.coarTree,
);

const meta = computed<TreeNodeMeta | undefined>(() => {
  const ctx = treeCtx.value;
  if (!ctx) return undefined;
  const id = ctx.getRowId(props.params.data);
  return ctx.meta.get(id);
});

const depth = computed(() => meta.value?.depth ?? 0);
const hasChildren = computed(() => meta.value?.hasChildren ?? false);
const isExpanded = computed(() => meta.value?.isExpanded ?? false);
const childCount = computed(() => meta.value?.childCount ?? 0);
const showChildCount = computed(() => config.value.showChildCount !== false);

function toggle(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  const ctx = treeCtx.value;
  if (!ctx) return;
  const id = ctx.getRowId(props.params.data);
  ctx.toggleRow(id);
}
</script>

<template>
  <div class="coar-tree-cell" :style="{ paddingLeft: `${depth * 20}px` }">
    <span
      v-if="hasChildren"
      class="coar-tree-cell__toggle"
      @click="toggle"
    >
      <CoarIcon
        name="chevron-right"
        source="coar-builtin"
        size="s"
        :rotate="isExpanded ? 90 : 0"
        :rotate-transition="150"
      />
    </span>
    <span v-else class="coar-tree-cell__spacer" />
    <span class="coar-tree-cell__content">{{ params.value }}</span>
    <span v-if="hasChildren && showChildCount" class="coar-tree-cell__count">
      ({{ childCount }})
    </span>
  </div>
</template>

<style>
.coar-tree-cell {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 2px;
  overflow: hidden;
}

.coar-tree-cell__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.1s;
}

.coar-tree-cell__toggle:hover {
  background-color: var(--coar-surface-neutral-hover, rgba(0, 0, 0, 0.06));
}

.coar-tree-cell__spacer {
  width: 20px;
  flex-shrink: 0;
}

.coar-tree-cell__content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-tree-cell__count {
  color: var(--coar-text-neutral-tertiary, #888);
  font-size: 0.85em;
  flex-shrink: 0;
  margin-left: 4px;
}
</style>
