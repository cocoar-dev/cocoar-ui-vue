<script setup lang="ts" generic="TData = unknown">
import { ref, watch } from 'vue';
import type { Theme } from 'ag-grid-community';
import type { CoarTextInputSize } from '@cocoar/vue-ui';
import { CoarGridBuilder } from './builders';
import { cocoarTheme } from './theme';
import CoarDataGrid from './CoarDataGrid.vue';
import CoarDataGridSearch from './CoarDataGridSearch.vue';

const props = withDefaults(
  defineProps<{
    /** The grid builder configuration (required) */
    builder: CoarGridBuilder<TData>;
    /** AG Grid theme override */
    theme?: Theme;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /** Search input size variant */
    searchSize?: CoarTextInputSize;
    /** Custom CSS class for the grid wrapper */
    gridClass?: string;
    /** Custom inline style for the grid wrapper */
    gridStyle?: string | Record<string, string>;
  }>(),
  {
    theme: () => cocoarTheme,
    searchPlaceholder: 'Search...',
    searchSize: 'm',
    gridClass: undefined,
    gridStyle: undefined,
  },
);

const searchText = defineModel<string>('search', { default: '' });

const internalSearch = ref('');

// Sync v-model:search with internal ref
watch(searchText, (v) => { internalSearch.value = v; }, { immediate: true });
watch(internalSearch, (v) => { searchText.value = v; });

// Wire search to builder's quick filter
watch(
  () => props.builder,
  (builder) => {
    builder.quickFilterText(internalSearch);
  },
  { immediate: true },
);
</script>

<template>
  <div class="coar-data-grid-panel">
    <CoarDataGridSearch
      v-model="internalSearch"
      :placeholder="searchPlaceholder"
      :size="searchSize"
    >
      <slot name="actions" />
    </CoarDataGridSearch>
    <CoarDataGrid
      :builder="builder"
      :theme="theme"
      :class="gridClass"
      :style="gridStyle"
    />
  </div>
</template>

<style scoped>
.coar-data-grid-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: 100%;
  gap: var(--coar-spacing-s, 8px);
}
</style>
