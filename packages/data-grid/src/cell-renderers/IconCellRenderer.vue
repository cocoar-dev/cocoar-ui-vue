<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarIcon } from '@cocoar/vue-ui';
import type { CoarIconSize } from '@cocoar/vue-ui';
import type { IconCellRendererConfig } from './icon-cell-renderer.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<IconCellRendererConfig>(() => props.params.colDef?.cellRendererParams?.config ?? {});
const iconName = computed<string>(() => props.params.value ?? '');
const size = computed<CoarIconSize>(() => config.value.size ?? 's');
const source = computed<string | undefined>(() => config.value.source);
const color = computed<string>(() => config.value.color ?? 'inherit');
const isClickable = computed<boolean>(() => !!config.value.onClick);

function handleClick(): void {
  config.value.onClick?.(props.params);
}
</script>

<template>
  <div
    class="coar-icon-cell-renderer"
    :class="{ clickable: isClickable }"
    @click="handleClick"
  >
    <CoarIcon
      v-if="iconName"
      :name="iconName"
      :size="size"
      :source="source"
      :color="color"
    />
  </div>
</template>

<style>
.coar-icon-cell-renderer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.coar-icon-cell-renderer.clickable {
  cursor: pointer;
}
</style>
