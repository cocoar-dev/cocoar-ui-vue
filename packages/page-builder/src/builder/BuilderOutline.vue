<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { BUILDER_API } from './builderContext';
import BuilderOutlineNode from './BuilderOutlineNode.vue';

defineOptions({ name: 'BuilderOutline' });

const { t } = useI18n();
const builder = inject(BUILDER_API)!;
const treeRef = ref<HTMLElement | null>(null);

// Roving focus over the flat list of visible rows (the outline has no
// collapse, so DOM order IS the visible order). Enter/Space selection lives
// on the rows themselves.
function onTreeKeydown(e: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const rows = [...(treeRef.value?.querySelectorAll<HTMLElement>('.pb-tree-row') ?? [])];
  if (rows.length === 0) return;
  const active = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.pb-tree-row');
  const current = active ? rows.indexOf(active) : -1;
  let next: number;
  if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = rows.length - 1;
  else if (current === -1) next = 0;
  else if (e.key === 'ArrowDown') next = Math.min(rows.length - 1, current + 1);
  else next = Math.max(0, current - 1);
  e.preventDefault();
  rows[next].focus();
}
</script>

<template>
  <div
    ref="treeRef"
    class="pb-outline-wrap"
    role="tree"
    :aria-label="t('coar.pageBuilder.outline.treeLabel', undefined, 'Page structure')"
    @keydown="onTreeKeydown"
  >
    <BuilderOutlineNode :node="builder.schema.value" :path="[]" :depth="0" />
  </div>
</template>

<style scoped>
.pb-outline-wrap {
  overflow-y: auto;
  /* Without border-box the vertical padding is added on top of height:100%,
     so the tree overflows its host by exactly 8px and the host grows a second
     scrollbar next to this one. */
  box-sizing: border-box;
  height: 100%;
  padding: 4px 0;
}
</style>
