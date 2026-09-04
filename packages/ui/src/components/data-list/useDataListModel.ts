import { computed, ref, toValue, unref, type ComputedRef, type MaybeRef, type MaybeRefOrGetter, type Ref } from 'vue';
import type {
  CoarDataListEntry,
  CoarDataListKey,
  CoarDataListLevelConfig,
  CoarDataListSearchBy,
  CoarDataListSelection,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';
import { createValueComparator, sortByValue, sortWithComparator } from './internal/compare';
import { matchesSearchTerms, normalizeSearchText, searchTerms, searchTextOf } from './internal/search';

type ItemEntry<T> = Extract<CoarDataListEntry<T>, { kind: 'item' }>;

export interface UseDataListModelOptions<T> {
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

  /** Nested lists: returns an item's children (plain function or ref). */
  children?: MaybeRef<((item: T) => readonly T[] | null | undefined) | undefined>;
  /** Keys of the items whose children are shown. When omitted the composable keeps its own. */
  expanded?: Ref<CoarDataListKey[]>;
  /** Configuration of the child levels (all levels below the top share it). */
  childLevel?: MaybeRefOrGetter<CoarDataListLevelConfig<T> | undefined>;
  /** Deepest level shown, 0 = top level only. Default: unlimited. */
  maxDepth?: MaybeRefOrGetter<number | undefined>;
  /** Set to `false` to show top-level items only (used by layouts without nesting). Default true. */
  nesting?: MaybeRefOrGetter<boolean>;
}

export interface UseDataListModelReturn<T> extends CoarDataListSelection<T> {
  /** Visible items after filter, search, sort, grouping and nesting, in display order. */
  items: ComputedRef<T[]>;
  /** Visible rows including group headings, in display order. */
  entries: ComputedRef<CoarDataListEntry<T>[]>;
  /** Number of source items (top level). */
  total: ComputedRef<number>;
  /** Number of visible items (all levels). */
  count: ComputedRef<number>;
  keyOf(item: T): CoarDataListKey;
  itemByKey(key: CoarDataListKey): T | undefined;
  /** Position of a key among the visible items, or -1. */
  indexOfKey(key: CoarDataListKey): number;
  /** Position of a key among `entries` (group headings included), or -1. */
  entryIndexOfKey(key: CoarDataListKey): number;
  /** The visible entry of a key. */
  entryOfKey(key: CoarDataListKey): ItemEntry<T> | undefined;
  selected: Ref<CoarDataListKey[]>;
  /** Anchor for shift-range selection. */
  anchor: Ref<CoarDataListKey | null>;

  /** Keys with children currently shown. */
  expanded: Ref<CoarDataListKey[]>;
  isExpanded(key: CoarDataListKey): boolean;
  hasChildren(item: T): boolean;
  expand(key: CoarDataListKey): void;
  collapse(key: CoarDataListKey): void;
  toggleExpanded(key: CoarDataListKey): void;
  /** Expand every visible item that has children (recursively). */
  expandAll(): void;
  collapseAll(): void;
  /** Parent key of a visible item, `null` at the top level. */
  parentOf(key: CoarDataListKey): CoarDataListKey | null;
  /** The sort in effect on a level (0 = top level); `null` when that level keeps its input order. */
  sortAtDepth(depth: number): CoarDataListSort | null;
}

/**
 * Headless data pipeline for {@link CoarDataList}: filter → search → sort → group,
 * nested children under expanded parents, plus key-based selection. Use it
 * directly when you render your own list.
 */
export function useDataListModel<T>(options: UseDataListModelOptions<T>): UseDataListModelReturn<T> {
  const keyOf = options.itemKey;
  const selected = options.selected ?? ref<CoarDataListKey[]>([]);
  const expanded = options.expanded ?? ref<CoarDataListKey[]>([]);
  const anchor = ref<CoarDataListKey | null>(null);

  const source = computed(() => toValue(options.items));
  const total = computed(() => source.value.length);
  const comparator = computed(() => createValueComparator(toValue(options.locale)));
  const childrenOf = computed(() => unref(options.children));
  const nestingOn = computed(() => (toValue(options.nesting) ?? true) && !!childrenOf.value);
  const expandedSet = computed(() => new Set(expanded.value));

  function childItems(item: T): readonly T[] {
    const accessor = childrenOf.value;
    return accessor ? (accessor(item) ?? []) : [];
  }

  function hasChildren(item: T): boolean {
    return nestingOn.value && childItems(item).length > 0;
  }

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

  /** Search terms + whether an item (or any descendant) matches. */
  const matcher = computed(() => {
    const terms = searchTerms(toValue(options.search));
    const searchBy = unref(options.searchBy);
    const active = terms.length > 0;
    const selfMatch = (item: T) => !active || matchesSearchTerms(searchTextFor(item, searchBy), terms);
    const descendantCache = new Map<T, boolean>();
    const descendantMatch = (item: T): boolean => {
      if (!active || !nestingOn.value) return false;
      const cached = descendantCache.get(item);
      if (cached !== undefined) return cached;
      const result = childItems(item).some((child) => selfMatch(child) || descendantMatch(child));
      descendantCache.set(item, result);
      return result;
    };
    return { active, selfMatch, descendantMatch };
  });

  const filtered = computed<T[]>(() => {
    const predicate = unref(options.filter);
    const { selfMatch, descendantMatch } = matcher.value;
    const result: T[] = [];
    for (const item of source.value) {
      if (predicate && !predicate(item)) continue;
      if (!selfMatch(item) && !descendantMatch(item)) continue;
      result.push(item);
    }
    return result;
  });

  function applySort(items: readonly T[], sort: CoarDataListSort | null | undefined, sortOptions: readonly CoarDataListSortOption<T>[] | undefined): T[] {
    if (!sort) return [...items];
    const option = sortOptions?.find((candidate) => candidate.key === sort.key);
    if (!option) return [...items];
    const descending = sort.direction === 'desc';
    if (option.compare) return sortWithComparator(items, option.compare, descending);
    const by = option.by ?? ((item: T) => (item as Record<string, unknown>)[option.key]);
    return sortByValue(items, by, comparator.value, descending);
  }

  function sortAtDepth(depth: number): CoarDataListSort | null {
    if (depth === 0) return toValue(options.sort) ?? null;
    const level = toValue(options.childLevel);
    // Without its own configuration a child level inherits the top level's sorting.
    return level && 'sort' in level ? (level.sort ?? null) : (toValue(options.sort) ?? null);
  }

  function sortTopLevel(items: readonly T[]): T[] {
    return applySort(items, sortAtDepth(0), toValue(options.sortOptions));
  }

  function sortChildLevel(items: readonly T[]): T[] {
    const level = toValue(options.childLevel);
    return applySort(items, sortAtDepth(1), level?.sortOptions ?? toValue(options.sortOptions));
  }

  const entries = computed<CoarDataListEntry<T>[]>(() => {
    warnAboutDuplicateKeys();
    const result: CoarDataListEntry<T>[] = [];
    let index = 0;
    const maxDepth = toValue(options.maxDepth) ?? Number.POSITIVE_INFINITY;
    const { active, selfMatch, descendantMatch } = matcher.value;
    const predicate = unref(options.filter);

    const pushItem = (item: T, depth: number, parentKey: CoarDataListKey | null) => {
      const key = keyOf(item);
      const children = hasChildren(item);
      // While searching, a parent whose descendants match opens itself; otherwise the model decides.
      const isExpanded = children && depth < maxDepth && (expandedSet.value.has(key) || (active && descendantMatch(item)));
      result.push({ kind: 'item', key: `i:${String(key)}`, itemKey: key, item, index, depth, parentKey, hasChildren: children, expanded: isExpanded });
      index++;
      if (!isExpanded) return;
      const visibleChildren = childItems(item).filter((child) => {
        if (predicate && !predicate(child)) return false;
        return selfMatch(child) || descendantMatch(child);
      });
      for (const child of sortChildLevel(visibleChildren)) pushItem(child, depth + 1, key);
    };

    const groupBy = unref(options.groupBy);
    if (!groupBy) {
      for (const item of sortTopLevel(filtered.value)) pushItem(item, 0, null);
      return result;
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

    for (const group of names) {
      const items = sortTopLevel(groups.get(group) ?? []);
      result.push({ kind: 'group', key: `g:${group}`, group, count: items.length, items });
      for (const item of items) pushItem(item, 0, null);
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
    const byKey = new Map<CoarDataListKey, { entryIndex: number; entry: ItemEntry<T> }>();
    entries.value.forEach((entry, entryIndex) => {
      if (entry.kind === 'item') byKey.set(entry.itemKey, { entryIndex, entry });
    });
    return byKey;
  });

  const duplicateKeys: CoarDataListKey[] = [];
  const sourceByKey = computed(() => {
    const byKey = new Map<CoarDataListKey, T>();
    duplicateKeys.length = 0;
    const visit = (list: readonly T[]) => {
      for (const item of list) {
        const key = keyOf(item);
        if (byKey.has(key)) duplicateKeys.push(key);
        byKey.set(key, item);
        if (childrenOf.value) visit(childItems(item));
      }
    };
    visit(source.value);
    return byKey;
  });

  // DEV-only: everything the list remembers (selection, focus, measured heights,
  // drag & drop) is stored under the key, so duplicates surface as "the wrong row
  // reacts". Warns once per distinct set of offenders; production builds drop it.
  let warnedDuplicates = '';
  function warnAboutDuplicateKeys(): void {
    if (!import.meta.env?.DEV) return;
    void sourceByKey.value;
    if (duplicateKeys.length === 0) return;
    const distinct = [...new Set(duplicateKeys)];
    const signature = distinct.map(String).join(' ');
    if (signature === warnedDuplicates) return;
    warnedDuplicates = signature;
    const shown = distinct.slice(0, 5).map((key) => JSON.stringify(key)).join(', ');
    const more = distinct.length > 5 ? ` and ${distinct.length - 5} more` : '';
    console.warn(
      `[CoarDataList] ${distinct.length} duplicate item key(s): ${shown}${more}. \`itemKey\` must return a unique value per record — selection, focus, measured heights and drag & drop are stored under it, so duplicates make the wrong row react.`,
    );
  }

  function itemByKey(key: CoarDataListKey): T | undefined {
    return positions.value.get(key)?.entry.item ?? sourceByKey.value.get(key);
  }

  function indexOfKey(key: CoarDataListKey): number {
    return positions.value.get(key)?.entry.index ?? -1;
  }

  function entryIndexOfKey(key: CoarDataListKey): number {
    return positions.value.get(key)?.entryIndex ?? -1;
  }

  function entryOfKey(key: CoarDataListKey): ItemEntry<T> | undefined {
    return positions.value.get(key)?.entry;
  }

  function parentOf(key: CoarDataListKey): CoarDataListKey | null {
    return positions.value.get(key)?.entry.parentKey ?? null;
  }

  // ── Expansion ────────────────────────────────────────────────────────────
  function isExpanded(key: CoarDataListKey): boolean {
    return expandedSet.value.has(key);
  }

  function expand(key: CoarDataListKey): void {
    if (!expandedSet.value.has(key)) expanded.value = [...expanded.value, key];
  }

  function collapse(key: CoarDataListKey): void {
    if (expandedSet.value.has(key)) expanded.value = expanded.value.filter((existing) => existing !== key);
  }

  function toggleExpanded(key: CoarDataListKey): void {
    if (expandedSet.value.has(key)) collapse(key);
    else expand(key);
  }

  function expandAll(): void {
    const keys = new Set(expanded.value);
    const visit = (list: readonly T[]) => {
      for (const item of list) {
        if (!hasChildren(item)) continue;
        keys.add(keyOf(item));
        visit(childItems(item));
      }
    };
    visit(filtered.value);
    expanded.value = [...keys];
  }

  function collapseAll(): void {
    expanded.value = [];
  }

  // ── Selection ────────────────────────────────────────────────────────────
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
    entryOfKey,
    parentOf,
    sortAtDepth,
    selected,
    anchor,
    isSelected,
    select,
    selectAll,
    clear,
    selectedItems,
    expanded,
    isExpanded,
    hasChildren,
    expand,
    collapse,
    toggleExpanded,
    expandAll,
    collapseAll,
  };
}
