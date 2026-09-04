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
import type { DropPayload } from '../../composables/useDragDrop';
import type {
  CoarDataListDensity,
  CoarDataListDragEngine,
  CoarDataListDropEvent,
  CoarDataListFilesDropEvent,
  CoarDataListItemsRemoveEvent,
  CoarDataListLayout,
  CoarDataListLevelConfig,
  CoarDataListNestingStyle,
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

  layout: MaybeRefOrGetter<CoarDataListLayout>;
  tileMinWidth: MaybeRefOrGetter<number | string>;
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

  /** Nested lists (see the `children` setter). */
  children?: (item: T) => readonly T[] | null | undefined;
  childLevel: MaybeRefOrGetter<CoarDataListLevelConfig<T> | undefined>;
  maxDepth: MaybeRefOrGetter<number | undefined>;
  nestingIndent: MaybeRefOrGetter<number | string>;
  nestingStyle: MaybeRefOrGetter<CoarDataListNestingStyle>;
  hideExpandToggle: MaybeRefOrGetter<boolean>;
  canNest?: (item: T, parent: T) => boolean;
  expanded: Ref<CoarDataListKey[]>;
  /** Grid layout: draw each tile as a card (border + radius); an expanded tile opens into its band. */
  tileCards: MaybeRefOrGetter<boolean>;
  /** Lift an expanded card and its band with a shadow. */
  bandElevated: MaybeRefOrGetter<boolean>;

  /** Drag & drop reordering (see the `reorderable` setter). */
  reorderable: MaybeRefOrGetter<boolean>;
  dragEngine: MaybeRefOrGetter<CoarDataListDragEngine>;
  canDrag?: (item: T) => boolean;
  dragGroup: MaybeRefOrGetter<string | undefined>;
  dragId: MaybeRefOrGetter<string | undefined>;
  dragAccept: MaybeRefOrGetter<string[] | undefined>;
  canDrop?: (payload: DropPayload<T>) => boolean;
  acceptsFiles: MaybeRefOrGetter<boolean>;
  onReorder?: (event: CoarDataListDropEvent<T>) => void;
  onItemsAdd?: (event: CoarDataListDropEvent<T>) => void;
  onItemsRemove?: (event: CoarDataListItemsRemoveEvent<T>) => void;
  onFilesDrop?: (event: CoarDataListFilesDropEvent<T>) => void;
  onDragStart?: (items: readonly T[]) => void;
  onDragEnd?: (payload: { items: readonly T[]; dropped: boolean }) => void;

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
  expand(key: CoarDataListKey): void;
  collapse(key: CoarDataListKey): void;
  toggleExpanded(key: CoarDataListKey): void;
  expandAll(): void;
  collapseAll(): void;
  /** Selected keys (the builder's writable ref). */
  readonly selected: Ref<CoarDataListKey[]>;
  readonly search: Ref<string>;
  readonly sort: Ref<CoarDataListSort | null>;
  /** Keys whose children are shown (the builder's writable ref). */
  readonly expanded: Ref<CoarDataListKey[]>;
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
      expand: guard('expand', (i, key: CoarDataListKey) => i.model.expand(key)),
      collapse: guard('collapse', (i, key: CoarDataListKey) => i.model.collapse(key)),
      toggleExpanded: guard('toggleExpanded', (i, key: CoarDataListKey) => i.model.toggleExpanded(key)),
      expandAll: guard('expandAll', (i) => i.model.expandAll()),
      collapseAll: guard('collapseAll', (i) => i.model.collapseAll()),
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
      get expanded() {
        return state.expanded;
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
      layout: 'list',
      tileMinWidth: '14rem',
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
      children: undefined,
      childLevel: undefined,
      maxDepth: undefined,
      nestingIndent: '1.5rem',
      nestingStyle: 'lines',
      hideExpandToggle: false,
      canNest: undefined,
      expanded: ref<CoarDataListKey[]>([]),
      tileCards: false,
      bandElevated: false,
      reorderable: false,
      dragEngine: 'native',
      canDrag: undefined,
      dragGroup: undefined,
      dragId: undefined,
      dragAccept: undefined,
      canDrop: undefined,
      acceptsFiles: false,
      onReorder: undefined,
      onItemsAdd: undefined,
      onItemsRemove: undefined,
      onFilesDrop: undefined,
      onDragStart: undefined,
      onDragEnd: undefined,
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

  /** `'list'` (default) or `'grid'` — tiles in exact data order, wrapping by `tileMinWidth`. */
  layout(value: MaybeRefOrGetter<CoarDataListLayout>): this {
    this.state.layout = value;
    return this;
  }

  /** Minimum tile width in the grid layout (px number or CSS length). Default `'14rem'`. */
  tileMinWidth(value: MaybeRefOrGetter<number | string>): this {
    this.state.tileMinWidth = value;
    return this;
  }

  /** Grid layout: draw tiles as cards. An expanded tile's frame opens into the band of its children. */
  tileCards(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.tileCards = on;
    return this;
  }

  /** Lift an expanded card and its band with a shadow. */
  bandElevated(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.bandElevated = on;
    return this;
  }

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

  // ─── Nesting ──────────────────────────────────────────────────────────────

  /**
   * Nested lists: `accessor` returns an item's children. The optional `configure`
   * callback sets up the child levels as a list of their own — today their
   * sorting, later their layout:
   * ```ts
   * builder.children((t) => t.subTasks, (level) => level.sortOption('due', 'Due').sort({ key: 'due', direction: 'asc' }))
   * ```
   * Without `configure`, child levels inherit the top level's sorting.
   */
  children(
    accessor: (item: T) => readonly T[] | null | undefined,
    configure?: (level: DataListLevelBuilder<T>) => void,
  ): this {
    this.state.children = accessor;
    if (configure) {
      const level = new DataListLevelBuilder<T>();
      configure(level);
      this.state.childLevel = level.config;
    }
    return this;
  }

  /** Bind the expanded keys to your own ref, or set an initial value. */
  expanded(value: Ref<CoarDataListKey[]> | CoarDataListKey[]): this {
    if (isRef(value)) this.state.expanded = value;
    else this.state.expanded.value = value;
    return this;
  }

  /** Deepest level shown; 0 = top level only. Default: unlimited. */
  maxDepth(depth: MaybeRefOrGetter<number | undefined>): this {
    this.state.maxDepth = depth;
    return this;
  }

  /** Indent per level (px number or CSS length). Default `'1.5rem'`. */
  nestingIndent(value: MaybeRefOrGetter<number | string>): this {
    this.state.nestingIndent = value;
    return this;
  }

  /** `'lines'` (guide lines per level, default) or `'none'`. */
  nestingStyle(style: MaybeRefOrGetter<CoarDataListNestingStyle>): this {
    this.state.nestingStyle = style;
    return this;
  }

  /** Hide the built-in expand chevrons (use `toggleExpanded()` from the item slot instead). */
  hideExpandToggle(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.hideExpandToggle = on;
    return this;
  }

  /** Veto for dropping `item` inside `parent` (drag & drop re-parenting). */
  canNest(fn: (item: T, parent: T) => boolean): this {
    this.state.canNest = fn;
    return this;
  }

  // ─── Drag & drop ──────────────────────────────────────────────────────────

  /**
   * Let users reorder items by dragging (and drop items into this list from other
   * lists sharing a `dragGroup`). The list emits `reorder` / `items-add` /
   * `items-remove` and never mutates the data. Disabled while a sort is active.
   */
  reorderable(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.reorderable = on;
    return this;
  }

  /** `'native'` (default, HTML5), `'pointer'` (touch-capable) or `'auto'`. */
  dragEngine(engine: MaybeRefOrGetter<CoarDataListDragEngine>): this {
    this.state.dragEngine = engine;
    return this;
  }

  /** Per-item veto: return `false` to keep an item where it is. */
  canDrag(fn: (item: T) => boolean): this {
    this.state.canDrag = fn;
    return this;
  }

  /** Lists sharing a `dragGroup` accept each other's items. */
  dragGroup(group: MaybeRefOrGetter<string | undefined>): this {
    this.state.dragGroup = group;
    return this;
  }

  /** Public identifier of this list, reported as `sourceId` to drop targets. */
  dragId(id: MaybeRefOrGetter<string | undefined>): this {
    this.state.dragId = id;
    return this;
  }

  /** Whitelist of source `dragId`s this list accepts drops from. */
  dragAccept(ids: MaybeRefOrGetter<string[] | undefined>): this {
    this.state.dragAccept = ids;
    return this;
  }

  /** Runtime veto for incoming drops (items, source id / group, `fromSelf`). */
  canDrop(fn: (payload: DropPayload<T>) => boolean): this {
    this.state.canDrop = fn;
    return this;
  }

  /** Accept OS file drops (Explorer / Finder); works with either drag engine. */
  acceptsFiles(on: MaybeRefOrGetter<boolean> = true): this {
    this.state.acceptsFiles = on;
    return this;
  }

  /** Items were dropped inside this list. Apply `toIndex` / `afterKey` to your data. */
  onReorder(handler: (event: CoarDataListDropEvent<T>) => void): this {
    this.state.onReorder = handler;
    return this;
  }

  /** Items from another list were dropped here. */
  onItemsAdd(handler: (event: CoarDataListDropEvent<T>) => void): this {
    this.state.onItemsAdd = handler;
    return this;
  }

  /** Items of this list were accepted by another list — remove them from your data. */
  onItemsRemove(handler: (event: CoarDataListItemsRemoveEvent<T>) => void): this {
    this.state.onItemsRemove = handler;
    return this;
  }

  onFilesDrop(handler: (event: CoarDataListFilesDropEvent<T>) => void): this {
    this.state.onFilesDrop = handler;
    return this;
  }

  onDragStart(handler: (items: readonly T[]) => void): this {
    this.state.onDragStart = handler;
    return this;
  }

  onDragEnd(handler: (payload: { items: readonly T[]; dropped: boolean }) => void): this {
    this.state.onDragEnd = handler;
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
 * Configuration of the child levels of a nested list — the argument of
 * `builder.children(accessor, (level) => …)`. Mirrors the list's own sort
 * setters; layout per level will follow.
 */
export class DataListLevelBuilder<T> {
  readonly config: CoarDataListLevelConfig<T> = {};

  sortOptions(options: readonly CoarDataListSortOption<T>[]): this {
    this.config.sortOptions = options;
    return this;
  }

  sortOption(
    key: string,
    label: string,
    options?: { by?: (item: T) => unknown; compare?: (a: T, b: T) => number; defaultDirection?: CoarDataListSortDirection },
  ): this {
    this.config.sortOptions = [...(this.config.sortOptions ?? []), { key, label, ...options }];
    return this;
  }

  /** Sort applied on every child level. `null` keeps the children's input order. */
  sort(value: CoarDataListSort | null): this {
    this.config.sort = value;
    return this;
  }

  /** Layout of the child levels — a list may nest grid children and vice versa. Default: the list's layout. */
  layout(value: CoarDataListLayout): this {
    this.config.layout = value;
    return this;
  }

  /** Minimum tile width for child levels in grid layout. Default: the list's `tileMinWidth`. */
  tileMinWidth(value: number | string): this {
    this.config.tileMinWidth = value;
    return this;
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
