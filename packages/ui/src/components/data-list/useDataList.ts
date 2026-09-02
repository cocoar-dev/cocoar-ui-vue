import { computed, ref, toValue, unref, type ComputedRef, type MaybeRef, type MaybeRefOrGetter, type Ref } from 'vue';
import type {
  CoarDataListEntry,
  CoarDataListKey,
  CoarDataListSearchBy,
  CoarDataListSelection,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';
import { createValueComparator, sortByValue, sortWithComparator } from './internal/compare';
import { matchesSearchTerms, normalizeSearchText, searchTerms, searchTextOf } from './internal/search';

export interface UseDataListOptions<T> {
  items: MaybeRefOrGetter<readonly T[]>;
  /** Stable identity of an item. Selection and measured heights are stored under it. */
  itemKey: (item: T) => CoarDataListKey;
  /** Free-text query. Whitespace splits it into terms that must all match. */
  search?: MaybeRefOrGetter<string | undefined>;
  /** Plain value or ref (not a getter — a function here is the extractor itself). */
  searchBy?: MaybeRef<CoarDataListSearchBy<T> | undefined>;
  /** Additional predicate applied before the search. Plain function or ref. */
  filter?: MaybeRef<((item: T) => boolean) | undefined>;
  sort?: MaybeRefOrGetter<CoarDataListSort | null | undefined>;
  sortOptions?: MaybeRefOrGetter<readonly CoarDataListSortOption<T>[] | undefined>;
  /** Plain function or ref. */
  groupBy?: MaybeRef<((item: T) => string) | undefined>;
  sortGroups?: MaybeRef<CoarDataListSortGroups | undefined>;
  /** BCP 47 tag for collation. Default: the runtime locale. */
  locale?: MaybeRefOrGetter<string | undefined>;
  selectionMode?: MaybeRefOrGetter<CoarDataListSelectionMode>;
  /** External selection model. When omitted the composable keeps its own. */
  selected?: Ref<CoarDataListKey[]>;
}

export interface UseDataListReturn<T> extends CoarDataListSelection<T> {
  /** Visible items after filter, search, sort and grouping, in display order. */
  items: ComputedRef<T[]>;
  /** Visible rows including group headings, in display order. */
  entries: ComputedRef<CoarDataListEntry<T>[]>;
  /** Number of source items. */
  total: ComputedRef<number>;
  /** Number of visible items. */
  count: ComputedRef<number>;
  keyOf(item: T): CoarDataListKey;
  itemByKey(key: CoarDataListKey): T | undefined;
  /** Position of a key among the visible items, or -1. */
  indexOfKey(key: CoarDataListKey): number;
  /** Position of a key among `entries` (group headings included), or -1. */
  entryIndexOfKey(key: CoarDataListKey): number;
  selected: Ref<CoarDataListKey[]>;
  /** Anchor for shift-range selection. */
  anchor: Ref<CoarDataListKey | null>;
}

/**
 * Headless data pipeline for {@link CoarDataList}: filter → search → sort → group,
 * plus key-based selection. Use it directly when you render your own list.
 */
export function useDataList<T>(options: UseDataListOptions<T>): UseDataListReturn<T> {
  const keyOf = options.itemKey;
  const selected = options.selected ?? ref<CoarDataListKey[]>([]);
  const anchor = ref<CoarDataListKey | null>(null);

  const source = computed(() => toValue(options.items));
  const total = computed(() => source.value.length);
  const comparator = computed(() => createValueComparator(toValue(options.locale)));

  // Search text is derived per item and cached by identity as long as `searchBy`
  // does not change, so typing only pays for the normalized `includes`.
  let cacheOwner: unknown = undefined;
  let textCache = new WeakMap<object, string>();
  function searchTextFor(item: T, searchBy: CoarDataListSearchBy<T> | undefined): string {
    if (cacheOwner !== searchBy) {
      cacheOwner = searchBy;
      textCache = new WeakMap();
    }
    if (typeof item !== 'object' || item === null) return normalizeSearchText(searchTextOf(item, searchBy));
    const cached = textCache.get(item);
    if (cached !== undefined) return cached;
    const text = normalizeSearchText(searchTextOf(item, searchBy));
    textCache.set(item, text);
    return text;
  }

  const filtered = computed<T[]>(() => {
    const predicate = unref(options.filter);
    const terms = searchTerms(toValue(options.search));
    const searchBy = unref(options.searchBy);
    const result: T[] = [];
    for (const item of source.value) {
      if (predicate && !predicate(item)) continue;
      if (terms.length > 0 && !matchesSearchTerms(searchTextFor(item, searchBy), terms)) continue;
      result.push(item);
    }
    return result;
  });

  function applySort(items: readonly T[]): T[] {
    const sort = toValue(options.sort);
    if (!sort) return [...items];
    const option = toValue(options.sortOptions)?.find((candidate) => candidate.key === sort.key);
    if (!option) return [...items];
    const descending = sort.direction === 'desc';
    if (option.compare) return sortWithComparator(items, option.compare, descending);
    const by = option.by ?? ((item: T) => (item as Record<string, unknown>)[option.key]);
    return sortByValue(items, by, comparator.value, descending);
  }

  const entries = computed<CoarDataListEntry<T>[]>(() => {
    const groupBy = unref(options.groupBy);
    if (!groupBy) {
      return applySort(filtered.value).map((item, index) => ({
        kind: 'item' as const,
        key: `i:${String(keyOf(item))}`,
        itemKey: keyOf(item),
        item,
        index,
      }));
    }

    const groups = new Map<string, T[]>();
    for (const item of filtered.value) {
      const group = groupBy(item);
      const bucket = groups.get(group);
      if (bucket) bucket.push(item);
      else groups.set(group, [item]);
    }

    const order = unref(options.sortGroups) ?? 'asc';
    const names = [...groups.keys()];
    if (typeof order === 'function') names.sort(order);
    else if (order === 'asc') names.sort((a, b) => comparator.value(a, b));
    else if (order === 'desc') names.sort((a, b) => comparator.value(b, a));

    const result: CoarDataListEntry<T>[] = [];
    let index = 0;
    for (const group of names) {
      const items = applySort(groups.get(group) ?? []);
      result.push({ kind: 'group', key: `g:${group}`, group, count: items.length, items });
      for (const item of items) {
        result.push({ kind: 'item', key: `i:${String(keyOf(item))}`, itemKey: keyOf(item), item, index });
        index++;
      }
    }
    return result;
  });

  const items = computed<T[]>(() => {
    const result: T[] = [];
    for (const entry of entries.value) if (entry.kind === 'item') result.push(entry.item);
    return result;
  });

  const count = computed(() => items.value.length);

  const positions = computed(() => {
    const byKey = new Map<CoarDataListKey, { index: number; entryIndex: number; item: T }>();
    entries.value.forEach((entry, entryIndex) => {
      if (entry.kind === 'item') byKey.set(entry.itemKey, { index: entry.index, entryIndex, item: entry.item });
    });
    return byKey;
  });

  const sourceByKey = computed(() => {
    const byKey = new Map<CoarDataListKey, T>();
    for (const item of source.value) byKey.set(keyOf(item), item);
    return byKey;
  });

  function itemByKey(key: CoarDataListKey): T | undefined {
    return positions.value.get(key)?.item ?? sourceByKey.value.get(key);
  }

  function indexOfKey(key: CoarDataListKey): number {
    return positions.value.get(key)?.index ?? -1;
  }

  function entryIndexOfKey(key: CoarDataListKey): number {
    return positions.value.get(key)?.entryIndex ?? -1;
  }

  // ── Selection ────────────────────────────────────────────────────────
  const selectedSet = computed(() => new Set(selected.value));

  function isSelected(key: CoarDataListKey): boolean {
    return selectedSet.value.has(key);
  }

  function setSelected(keys: CoarDataListKey[]): void {
    selected.value = keys;
  }

  function select(key: CoarDataListKey, mode: 'replace' | 'toggle' | 'range' = 'replace'): void {
    const selectionMode = toValue(options.selectionMode) ?? 'multiple';
    if (selectionMode === 'none') return;

    if (selectionMode === 'single') {
      if (mode === 'toggle' && isSelected(key)) setSelected([]);
      else setSelected([key]);
      anchor.value = key;
      return;
    }

    if (mode === 'toggle') {
      setSelected(isSelected(key) ? selected.value.filter((existing) => existing !== key) : [...selected.value, key]);
      anchor.value = key;
      return;
    }

    if (mode === 'range' && anchor.value !== null) {
      const from = indexOfKey(anchor.value);
      const to = indexOfKey(key);
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from];
        setSelected(items.value.slice(start, end + 1).map(keyOf));
        return;
      }
    }

    setSelected([key]);
    anchor.value = key;
  }

  function selectAll(): void {
    if ((toValue(options.selectionMode) ?? 'multiple') !== 'multiple') return;
    setSelected(items.value.map(keyOf));
  }

  function clear(): void {
    setSelected([]);
    anchor.value = null;
  }

  const selectedItems = computed<T[]>(() => {
    const result: T[] = [];
    for (const key of selected.value) {
      const item = itemByKey(key);
      if (item !== undefined) result.push(item);
    }
    return result;
  });

  return {
    items,
    entries,
    total,
    count,
    keyOf,
    itemByKey,
    indexOfKey,
    entryIndexOfKey,
    selected,
    anchor,
    isSelected,
    select,
    selectAll,
    clear,
    selectedItems,
  };
}
