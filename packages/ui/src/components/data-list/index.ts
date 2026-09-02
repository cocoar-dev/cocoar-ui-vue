export { default as CoarDataList } from './CoarDataList.vue';
export type { CoarDataListProps } from './CoarDataList.vue';
export { useDataList } from './useDataList';
export type { UseDataListOptions, UseDataListReturn } from './useDataList';
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
  CoarDataListSearchBy,
  CoarDataListSelection,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortDirection,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';
