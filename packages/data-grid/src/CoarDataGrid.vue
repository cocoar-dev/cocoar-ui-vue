<script setup lang="ts" generic="TData = unknown">
import { onBeforeUnmount, computed, ref, watch, useSlots } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { GridReadyEvent, Theme } from 'ag-grid-community';
import type { CoarTextInputSize } from '@cocoar/vue-ui';
import { CoarGridBuilder } from './builders';
import { cocoarTheme } from './theme';
import CoarDataGridSearch from './CoarDataGridSearch.vue';
import './theme/ag-theme-cocoar.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const wrapperRef = ref<HTMLElement>();
const slots = useSlots();

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
    /** Show the search bar above the grid */
    showSearch?: boolean;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /** Search input size variant */
    searchSize?: CoarTextInputSize;
    /** Show a border around the grid */
    bordered?: boolean;
    /** Add elevation shadow to the grid */
    elevated?: boolean;
    /** Custom CSS class for the wrapper element */
    class?: string;
    /** Custom inline style for the wrapper element */
    style?: string | Record<string, string>;
  }>(),
  {
    theme: () => cocoarTheme,
    showSearch: false,
    searchPlaceholder: 'Search...',
    searchSize: 'm',
    bordered: false,
    elevated: false,
    class: undefined,
    style: undefined,
  },
);

const searchText = defineModel<string>('search', { default: '' });

// Toolbar visibility: show when search is enabled or any toolbar slot is used
const showToolbar = computed(() =>
  props.showSearch || !!slots['toolbar-left'] || !!slots['toolbar-right'],
);

// Internal search ref wired to builder's quick filter
const internalSearch = ref('');
watch(searchText, (v) => { internalSearch.value = v; }, { immediate: true });
watch(internalSearch, (v) => { searchText.value = v; });

watch(
  () => props.builder,
  (builder) => {
    if (props.showSearch) {
      builder.quickFilterText(internalSearch);
    }
  },
  { immediate: true },
);

const gridOptions = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onGridReady: _onGridReady, ...rest } = props.builder._getGridOptions();
  return rest;
});
const columnDefs = computed(() => props.builder._getColumnDefs());
const rowData = computed(() => props.builder._getRowData());

function onGridReady(event: GridReadyEvent<TData>) {
  props.builder._bind(event.api, wrapperRef.value);
  const userHandler = props.builder._getGridOptions().onGridReady;
  userHandler?.(event);
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
    :class="[props.class, {
      'ag-theme-cocoar--bordered': props.bordered,
      'ag-theme-cocoar--elevated': props.elevated,
      'ag-theme-cocoar--has-toolbar': showToolbar,
    }]"
    :style="props.style ?? 'display: flex; flex-direction: column; flex: 1 1 auto; height: 100%;'"
    @click="onClick"
    @contextmenu="onContextMenu"
  >
    <div v-if="showToolbar" ref="toolbarRef" class="coar-grid-toolbar">
      <slot name="toolbar-left" />
      <CoarDataGridSearch
        v-if="showSearch"
        v-model="internalSearch"
        :placeholder="searchPlaceholder"
        :size="searchSize"
        class="coar-grid-toolbar__search"
      />
      <div v-else class="coar-grid-toolbar__spacer" />
      <slot name="toolbar-right" />
    </div>
    <ag-grid-vue
      style="width: 100%; height: 100%"
      v-bind="gridOptions"
      :theme="props.theme"
      :column-defs="columnDefs"
      :row-data="rowData"
      @grid-ready="onGridReady"
    />
  </div>
</template>

<style>
.coar-grid-toolbar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  margin-bottom: var(--coar-spacing-s);
}

/* Padding only when bordered or elevated */
:is(.ag-theme-cocoar--bordered, .ag-theme-cocoar--elevated) > .coar-grid-toolbar {
  padding: var(--coar-spacing-s) var(--coar-spacing-s) 0;
  margin-bottom: var(--coar-spacing-s);
}

.coar-grid-toolbar:has(> :only-child.coar-grid-toolbar__spacer) {
  display: none;
}

.coar-grid-toolbar__search {
  flex: 1;
  min-width: 0;
}

.coar-grid-toolbar__spacer {
  flex: 1;
}
</style>
