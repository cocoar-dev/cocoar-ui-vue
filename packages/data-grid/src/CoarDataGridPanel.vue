<script setup lang="ts" generic="TData = unknown">
/**
 * @deprecated Use `CoarDataGrid` with `search` prop instead.
 *
 * ```vue
 * <CoarDataGrid :builder="builder" search search-placeholder="Search...">
 *   <template #toolbar-right>
 *     <CoarButton>Export</CoarButton>
 *   </template>
 * </CoarDataGrid>
 * ```
 */
import type { Theme } from 'ag-grid-community';
import type { CoarTextInputSize } from '@cocoar/vue-ui';
import { CoarGridBuilder } from './builders';
import { cocoarTheme } from './theme';
import CoarDataGrid from './CoarDataGrid.vue';

const props = withDefaults(
  defineProps<{
    builder: CoarGridBuilder<TData>;
    theme?: Theme;
    searchPlaceholder?: string;
    searchSize?: CoarTextInputSize;
    bordered?: boolean;
    elevated?: boolean;
    gridClass?: string;
    gridStyle?: string | Record<string, string>;
  }>(),
  {
    theme: () => cocoarTheme,
    searchPlaceholder: 'Search...',
    searchSize: 'm',
    bordered: false,
    elevated: false,
    gridClass: undefined,
    gridStyle: undefined,
  },
);

const searchText = defineModel<string>('search', { default: '' });
</script>

<template>
  <CoarDataGrid
    v-model:search="searchText"
    :builder="props.builder"
    :theme="props.theme"
    show-search
    :bordered="props.bordered"
    :elevated="props.elevated"
    :class="props.gridClass"
    :style="props.gridStyle"
    :search-placeholder="props.searchPlaceholder"
    :search-size="props.searchSize"
  >
    <template v-if="$slots.actions" #toolbar-right>
      <slot name="actions" />
    </template>
  </CoarDataGrid>
</template>
