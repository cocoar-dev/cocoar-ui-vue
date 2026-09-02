/**
 * `DataListBuilder` — fluent configuration for `<CoarDataList>`.
 *
 * Same shape as `TreeBuilder` and `CalendarBuilder`: one `shallowReactive`
 * state object, every setter returns `this`, the component reads through
 * `toValue()` so setters accept plain values, refs or getters. `useDataList()`
 * returns `{ builder, api }`; the `api` proxies to the mounted component and
 * warns + no-ops before mount.
 */

import {
  computed,
  isRef,
  ref,
  shallowReactive,
  shallowRef,
  type ComputedRef,
  type MaybeRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type {
  CoarDataListDensity,
  CoarDataListItemEvent,
  CoarDataListKey,
  CoarDataListMenuEntry,
  CoarDataListSearchBy,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortDirection,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';
import type { UseDataListModelReturn } from './useDataListModel';

/** Mutable configuration owned by the builder. `shallowReactive` so late setter calls re-render. */
export interface DataListBuilderState<T> {
  items: MaybeRefOrGetter<readonly T[]>;
  itemKey: (item: T) => CoarDataListKey;
  searchBy: MaybeRef<CoarDataListSearchBy<T> | undefined>;
  filter: MaybeRef<((item: T) => boolean) | undefined>;
  sortOptions: MaybeRefOrGetter<readonly CoarDataListSortOption<T>[]>;
  groupBy: MaybeRef<((item: T) => string) | undefined>;
  sortGroups: MaybeRef<CoarDataListSortGroups>;
  selection: MaybeRefOrGetter<CoarDataListSelectionMode>;

  showSearch: MaybeRefOrGetter<boolean>;
  showSort: MaybeRefOrGetter<boolean>;
  searchPlaceholder: MaybeRefOrGetter<string | undefined>;
  searchHighlight: MaybeRefOrGetter<boolean>;

  density: MaybeRefOrGetter<CoarDataListDensity>;
  dividers: MaybeRefOrGetter<boolean>;
  gap: MaybeRefOrGetter<number | string | undefined>;
  bordered: MaybeRefOrGetter<boolean>;
  elevated: MaybeRefOrGetter<boolean>;
  height: MaybeRefOrGetter<string | undefined>;
  itemSize: MaybeRefOrGetter<number>;
  overscan: MaybeRefOrGetter<number>;
  emptyText: MaybeRefOrGetter<string | undefined>;
  ariaLabel: MaybeRefOrGetter<string | undefined>;
  disabled: MaybeRefOrGetter<boolean>;

  /** Writable state the component binds to (the `v-model`s of props-mode). */
  search: Ref<string>;
  sort: Ref<CoarDataListSort | null>;
  selected: Ref<CoarDataListKey[]>;

  onItemClick?: (event: CoarDataListItemEvent<T>) => void;
  onItemDoubleClick?: (event: CoarDataListItemEvent<T>) => void;
  onItemContextMenu?: (event: CoarDataListItemEvent<T>) => void;
  onItemActivate?: (event: CoarDataListItemEvent<T>) => void;

  /** Declarative menus — `<CoarDataList>` renders the `<CoarContextMenu>` itself. */
  itemMenu?: (item: T, selectedItems: readonly T[]) => readonly CoarDataListMenuEntry[];
  viewportMenu?: () => readonly CoarDataListMenuEntry[];
}

/** What `<CoarDataList>` registers on mount. @internal */
export interface DataListApiImpls<T> {
  model: UseDataListModelReturn<T>;
  scrollToKey(key: CoarDataListKey, align?: 'auto' | 'start' | 'center' | 'end'): void;
  scrollToIndex(index: number, align?: 'auto' | 'start' | 'center' | 'end'): void;
  focusKey(key: CoarDataListKey): void;
  invalidateMeasurements(key?: CoarDataListKey): void;
}

/**
 * Imperative surface returned by `useDataList().api`. Actions are no-ops with a
 * DEV warning until `<CoarDataList>` mounts; the readonly refs are live as soon
 * as it does and fall back to empty values before.
 */
export interface DataListApi<T> {
  select(key: CoarDataListKey, mode?: 'replace' | 'toggle' | 'range'): void;
  selectAll(): void;
  clearSelection(): void;
  isSelected(key: CoarDataListKey): boolean;
  scrollToKey(key: CoarDataListKey, align?: 'auto' | 'start' | 'center' | 'end'): void;
  scrollToIndex(index: number, align?: 'auto' | 'start' | 'center' | 'end'): void;
  focusKey(key: CoarDataListKey): void;
  invalidateMeasurements(key?: CoarDataListKey): void;
  /** Selected keys (the builder's writable ref). */
  readonly selected: Ref<CoarDataListKey[]>;
  readonly search: Ref<string>;
  readonly sort: Ref<CoarDataListSort | null>;
  /** Selected records in selection order. */
  readonly selectedItems: ComputedRef<readonly T[]>;
  /** Visible records after filter, search, sort and grouping. */
  readonly items: ComputedRef<readonly T[]>;
  readonly count: ComputedRef<number>;
  readonly total: ComputedRef<number>;
}

export class DataListBuilder<T> {
  readonly state: DataListBuilderState<T>;
  readonly api: DataListApi<T>;

  private readonly _impls = shallowRef<DataListApiImpls<T> | null>(null);

  private _warnUnmounted(method: string): void {
    if (typeof console !== 'undefined') {
      console.warn(
        `[DataListBuilder.api.${method}] called before <CoarDataList> mounted. The call was a no-op; move it into onMounted / a user-triggered handler.`,
      );
    }
  }

  private constructor(state: DataListBuilderState<T>) {
    this.state = state;
    const impls = this._impls;
    const guard = <A extends unknown[]>(name: string, run: (impls: DataListApiImpls<T>, ...args: A) => void) =>
      (...args: A): void => {
        if (impls.value) run(impls.value, ...args);
        else this._warnUnmounted(name);
      };

    this.api = {
      select: guard('select', (i, key: CoarDataListKey, mode?: 'replace' | 'toggle' | 'range') => i.model.select(key, mode)),
      selectAll: guard('selectAll', (i) => i.model.selectAll()),
      clearSelection: guard('clearSelection', (i) => i.model.clear()),
      isSelected: (key) => impls.value?.model.isSelected(key) ?? state.selected.value.includes(key),
      scrollToKey: guard('scrollToKey', (i, key: CoarDataListKey, align?: 'auto' | 'start' | 'center' | 'end') => i.scrollToKey(key, align)),
      scrollToIndex: guard('scrollToIndex', (i, index: number, align?: 'auto' | 'start' | 'center' | 'end') => i.scrollToIndex(index, align)),
      focusKey: guard('focusKey', (i, key: CoarDataListKey) => i.focusKey(key)),
      invalidateMeasurements: guard('invalidateMeasurements', (i, key?: CoarDataListKey) => i.invalidateMeasurements(key)),
      // Getters: `.search(ref)` & co. may swap the underlying ref after construction.
      get selected() {
        return state.selected;
      },
      get search() {
        return state.search;
      },
      get sort() {
        return state.sort;
      },
      selectedItems: computed(() => impls.value?.model.selectedItems.value ?? []),
      items: computed(() => impls.value?.model.items.value ?? []),
      count: computed(() => impls.value?.model.count.value ?? 0),
      total: computed(() => impls.value?.model.total.value ?? 0),
    };
  }

  static create<T>(): DataListBuilder<T> {
    const state = shallowReactive<DataListBuilderState<T>>({
      items: [] as readonly T[],
      itemKey: () => {
        throw new Error('DataListBuilder: .itemKey(fn) must be set before mounting <CoarDataList>.');
      },
      searchBy: undefined,
      filter: undefined,
      sortOptions: [],
      groupBy: undefined,
      sortGroups: 'asc',
      selection: 'none',
      showSearch: false,
      showSort: false,
      searchPlaceholder: undefined,
      searchHighlight: false,
      density: 'm',
      dividers: false,
      gap: undefined,
      bordered: false,
      elevated: false,
      height: undefined,
      itemSize: 56,
      overscan: 5,
      emptyText: undefined,
      ariaLabel: undefined,
      disabled: false,
      search: ref(''),
      sort: ref<CoarDataListSort | null>(null),
      selected: ref<CoarDataListKey[]>([]),
      onItemClick: undefined,
      onItemDoubleClick: undefined,
      onItemContextMenu: undefined,
      onItemActivate: undefined,
      itemMenu: undefined,
      viewportMenu: undefined,
    });
    return new DataListBuilder<T>(state);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  /** Records to display. Accepts a plain array, a `Ref`, or a getter. */
  items(source: MaybeRefOrGetter<readonly T[]>): this {
    this.state.items = source;
    return this;
  }

  /** Stable identity of a record. Required. */
  itemKey(fn: (item: T) => CoarDataListKey): this {
    this.state.itemKey = fn;
    return this;
  }

  /** Text the search matches against: property names or an extractor. Default: all primitive properties. */
  searchBy(by: MaybeRef<CoarDataListSearchBy<T> | undefined>): this {
    this.state.searchBy = by;
    return this;
  }

  /** Predicate applied before the search. */
  filter(fn: MaybeRef<((item: T) => boolean) | undefined>): this {
    this.state.filter = fn;
    return this;
  }

  /** Replace the sort menu entries. */
  sortOptions(options: MaybeRefOrGetter<readonly CoarDataListSortOption<T>[]>): this {
    this.state.sortOptions = options;
    return this;
  }

  /**
   * Append one sort menu entry. `by` extracts the compared value (default `item[key]`);
   * pass `{ compare }` for a full comparator or `{ defaultDirection: 'desc' }` to start descending.
   */
  sortOption(
    key: string,
    label: string,
    options?: {
      by?: (item: T) => unknown;
      compare?: (a: T, b: T) => number;
      defaultDirection?: CoarDataListSortDirection;
    },
  ): this {
    const current = this.state.sortOptions;
    if (isRef(current) || typeof current === 'function') {
      throw new Error('DataListBuilder: .sortOption() cannot append to a reactive .sortOptions() source; add the entry there instead.');
    }
    this.state.sortOptions = [...current, { key, label, ...options }];
    return this;
  }

  /** Group visible records under headings. */
  groupBy(fn: MaybeRef<((item: T) => string) | undefined>): this {
    this.state.groupBy = fn;
    return this;
  }

  sortGroups(order: MaybeRef<CoarDataListSortGroups>): this {
    this.state.sortGroups = order;
    return this;
  }

  // ─── Behaviour ────────────────────────────────────────────────────────────

  /** `'none'` (default), `'single'` or `'multiple'`. */
  selection(mode: MaybeRefOrGetter<CoarDataListSelectionMode>): this {
    this.state.selection = mode;
    return this;
  }

  showSearch(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.showSearch = on;
    return this;
  }

  showSort(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.showSort = on;
    return this;
  }

  searchPlaceholder(text: MaybeRefOrGetter<string | undefined>): this {
    this.state.searchPlaceholder = text;
    return this;
  }

  /** Mark search hits inside rendered rows. */
  searchHighlight(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.searchHighlight = on;
    return this;
  }

  disabled(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.disabled = on;
    return this;
  }

  // ─── Appearance ───────────────────────────────────────────────────────────

  density(value: MaybeRefOrGetter<CoarDataListDensity>): this {
    this.state.density = value;
    return this;
  }

  dividers(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.dividers = on;
    return this;
  }

  /** Space between rows, px number or CSS length. */
  gap(value: MaybeRefOrGetter<number | string | undefined>): this {
    this.state.gap = value;
    return this;
  }

  bordered(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.bordered = on;
    return this;
  }

  elevated(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.elevated = on;
    return this;
  }

  /** Fixed height of the scroll area; omit to fill the parent. */
  height(value: MaybeRefOrGetter<string | undefined>): this {
    this.state.height = value;
    return this;
  }

  /** Estimated row height in px (rows are measured after render). */
  itemSize(px: MaybeRefOrGetter<number>): this {
    this.state.itemSize = px;
    return this;
  }

  overscan(rows: MaybeRefOrGetter<number>): this {
    this.state.overscan = rows;
    return this;
  }

  emptyText(text: MaybeRefOrGetter<string | undefined>): this {
    this.state.emptyText = text;
    return this;
  }

  ariaLabel(label: MaybeRefOrGetter<string | undefined>): this {
    this.state.ariaLabel = label;
    return this;
  }

  // ─── Writable state ───────────────────────────────────────────────────────

  /** Bind the search query to your own ref, or set an initial value. */
  search(value: Ref<string> | string): this {
    if (isRef(value)) this.state.search = value;
    else this.state.search.value = value;
    return this;
  }

  /** Bind the active sort to your own ref, or set an initial value. */
  sort(value: Ref<CoarDataListSort | null> | CoarDataListSort | null): this {
    if (isRef(value)) this.state.sort = value;
    else this.state.sort.value = value;
    return this;
  }

  /** Bind the selected keys to your own ref, or set an initial value. */
  selected(value: Ref<CoarDataListKey[]> | CoarDataListKey[]): this {
    if (isRef(value)) this.state.selected = value;
    else this.state.selected.value = value;
    return this;
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  onItemClick(handler: (event: CoarDataListItemEvent<T>) => void): this {
    this.state.onItemClick = handler;
    return this;
  }

  onItemDoubleClick(handler: (event: CoarDataListItemEvent<T>) => void): this {
    this.state.onItemDoubleClick = handler;
    return this;
  }

  /** Raw right-click / long-press. When set, a declarative `itemMenu` for the same target is bypassed. */
  onItemContextMenu(handler: (event: CoarDataListItemEvent<T>) => void): this {
    this.state.onItemContextMenu = handler;
    return this;
  }

  /** Double-click or Enter. */
  onItemActivate(handler: (event: CoarDataListItemEvent<T>) => void): this {
    this.state.onItemActivate = handler;
    return this;
  }

  // ─── Declarative menus ────────────────────────────────────────────────────

  /**
   * Context menu for an item. Receives the item under the pointer and the current
   * selection (the item is selected first unless it already was), so bulk actions
   * can act on `selectedItems`. Entries: `{ label, icon?, danger?, disabled?, onClick }` or `'divider'`.
   */
  itemMenu(fn: (item: T, selectedItems: readonly T[]) => readonly CoarDataListMenuEntry[]): this {
    this.state.itemMenu = fn;
    return this;
  }

  /** Context menu for the empty area of the list. */
  viewportMenu(fn: () => readonly CoarDataListMenuEntry[]): this {
    this.state.viewportMenu = fn;
    return this;
  }

  /** @internal Called by `<CoarDataList>` on mount / unmount. */
  _bindImpls(impls: DataListApiImpls<T> | null): void {
    this._impls.value = impls;
  }
}

/**
 * Fluent entry point: `const { builder, api } = useDataList<Row>()`, then
 * `<CoarDataList :builder="builder">`.
 */
export function useDataList<T>(): { builder: DataListBuilder<T>; api: DataListApi<T> } {
  const builder = DataListBuilder.create<T>();
  return { builder, api: builder.api };
}
