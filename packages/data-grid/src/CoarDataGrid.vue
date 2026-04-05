<script setup lang="ts" generic="TData = unknown">
import { onBeforeUnmount, computed, ref } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { GridReadyEvent, Theme } from 'ag-grid-community';
import { CoarGridBuilder } from './builders';
import { cocoarTheme } from './theme';
import './theme/ag-theme-cocoar.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const wrapperRef = ref<HTMLElement>();
const isReady = ref(false);

const VIEWPORT_CLASSES = ['ag-body-viewport', 'ag-center-cols-viewport'];

function isViewportTarget(event: MouseEvent): boolean {
  const target = event.target as HTMLElement;
  return VIEWPORT_CLASSES.some((cls) => target.classList.contains(cls));
}

const props = withDefaults(
  defineProps<{
    /** The grid builder configuration (required) */
    builder: CoarGridBuilder<TData>;
    /** AG Grid theme override (defaults to cocoarTheme) */
    theme?: Theme;
    /** Custom CSS class for the wrapper element */
    class?: string;
    /** Custom inline style for the wrapper element */
    style?: string | Record<string, string>;
  }>(),
  {
    theme: () => cocoarTheme,
    class: undefined,
    style: undefined,
  },
);

const gridOptions = computed(() => props.builder._getGridOptions());
const columnDefs = computed(() => props.builder._getColumnDefs());
const rowData = computed(() => props.builder._getRowData());

function onGridReady(event: GridReadyEvent<TData>) {
  props.builder._bind(event.api, wrapperRef.value);
  // Static/empty grid: show immediately. Async grid: wait for firstDataRendered.
  if (!props.builder._isAsyncData()) {
    requestAnimationFrame(() => { isReady.value = true; });
  }
}

function onFirstDataRendered() {
  // Async data arrived and first rows are painted — safe to show
  if (!isReady.value) {
    requestAnimationFrame(() => { isReady.value = true; });
  }
}

function onClick(event: MouseEvent) {
  if (event.ctrlKey) return;

  const handler = props.builder._getViewportClickHandler();
  if (handler && isViewportTarget(event)) {
    event.preventDefault();
    handler(event, props.builder.api!);
  }
}

function onContextMenu(event: MouseEvent) {
  if (event.ctrlKey) return;

  if (isViewportTarget(event)) {
    const handler = props.builder._getViewportContextMenuHandler();
    if (handler) {
      event.preventDefault();
      handler(event, props.builder.api!);
    }
  } else if (props.builder._hasCellContextMenuHandler()) {
    // Suppress the browser context menu - AG Grid's onCellContextMenu handles it
    event.preventDefault();
  }
}

onBeforeUnmount(() => {
  props.builder._destroy();
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="ag-theme-cocoar"
    :class="[props.class, { 'ag-theme-cocoar--ready': isReady }]"
    :style="props.style ?? 'display: flex; flex-direction: column; flex: 1 1 auto; height: 100%;'"
    @click="onClick"
    @contextmenu="onContextMenu"
  >
    <ag-grid-vue
      style="width: 100%; height: 100%"
      v-bind="gridOptions"
      :theme="props.theme"
      :column-defs="columnDefs"
      :row-data="rowData"
      @grid-ready="onGridReady"
      @first-data-rendered="onFirstDataRendered"
    />
  </div>
</template>
