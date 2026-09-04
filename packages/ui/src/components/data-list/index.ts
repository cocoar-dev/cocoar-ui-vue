export { default as CoarDataList } from './CoarDataList.vue';
export type { CoarDataListProps } from './CoarDataList.vue';
export { useDataList, DataListBuilder } from './data-list-builder';
export type { DataListApi, DataListBuilderState } from './data-list-builder';
export { useDataListModel } from './useDataListModel';
export type { UseDataListModelOptions, UseDataListModelReturn } from './useDataListModel';
export { createValueComparator } from './internal/compare';
export type { ValueComparator } from './internal/compare';
export { normalizeSearchText, searchTerms, matchesSearchTerms } from './internal/search';
export { DATA_LIST_HIGHLIGHT_NAME } from './internal/useSearchHighlight';
export type {
  CoarDataListDensity,
  CoarDataListEntry,
  CoarDataListGroupSlotProps,
  CoarDataListItemEvent,
  CoarDataListItemSlotProps,
  CoarDataListKey,
  CoarDataListLayout,
  CoarDataListMenuEntry,
  CoarDataListMenuItem,
  CoarDataListSearchBy,
  CoarDataListSelection,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortDirection,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';
