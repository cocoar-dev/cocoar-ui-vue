<script setup lang="ts" generic="T">
/**
 * `<CoarDataList>` — virtualized record list with a free item template.
 *
 * Two ways to configure it:
 * 1. *Props-mode*: `items`, `itemKey`, `v-model:search` … as props.
 * 2. *Builder-mode*: `:builder` from `useDataList()`. Fluent setters, handlers
 *    and declarative context menus in one chain; the component renders the
 *    `<CoarContextMenu>` itself. When `builder` is set, the other config props
 *    and the `v-model`s are ignored.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toValue, unref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { useVirtualList } from '../../composables/useVirtualList';
import { useDataListModel } from './useDataListModel';
import { useSearchHighlight } from './internal/useSearchHighlight';
import { useDataListLines } from './internal/useDataListLines';
import { useDataListReorder } from './internal/useDataListReorder';
import type { DropPayload } from '../../composables/useDragDrop';
import CoarDataListToolbar from './CoarDataListToolbar.vue';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarContextMenu from '../menu/CoarContextMenu.vue';
import CoarMenu from '../menu/CoarMenu.vue';
import CoarMenuItem from '../menu/CoarMenuItem.vue';
import CoarMenuDivider from '../menu/CoarMenuDivider.vue';
import { useContextMenu } from '../menu/useContextMenu';
import type { DataListBuilder } from './data-list-builder';
import type {
  CoarDataListDensity,
  CoarDataListDragEngine,
  CoarDataListDropEvent,
  CoarDataListEntry,
  CoarDataListFilesDropEvent,
  CoarDataListGroupSlotProps,
  CoarDataListItemEvent,
  CoarDataListItemSlotProps,
  CoarDataListItemsRemoveEvent,
  CoarDataListKey,
  CoarDataListLayout,
  CoarDataListLevelConfig,
  CoarDataListNestingStyle,
  CoarDataListMenuEntry,
  CoarDataListMenuItem,
  CoarDataListSearchBy,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';

export interface CoarDataListProps<T = unknown> {
  /** Fluent builder from `useDataList()`. When set, the other config props are ignored. */
  builder?: DataListBuilder<T>;

  /** Records to display. */
  items?: readonly T[];
  /** Stable identity of a record. Required in props-mode. */
  itemKey?: (item: T) => CoarDataListKey;

  /** Text the search matches against. Default: all primitive properties. */
  searchBy?: CoarDataListSearchBy<T>;
  /** Additional predicate applied before the search. */
  filter?: (item: T) => boolean;
  /** Entries of the sort menu. Sorting is off while this is empty. */
  sortOptions?: CoarDataListSortOption<T>[];
  /** Groups visible items under headings. */
  groupBy?: (item: T) => string;
  /** Order of groups. Default `'asc'`. */
  sortGroups?: CoarDataListSortGroups;

  /** Selection behaviour. Default `'none'`. */
  selection?: CoarDataListSelectionMode;

  /** Renders the search input in the toolbar. */
  showSearch?: boolean;
  /** Renders the sort control in the toolbar (needs `sortOptions`). */
  showSort?: boolean;
  searchPlaceholder?: string;
  /** Marks search matches inside the rendered rows (CSS Custom Highlight API). */
  searchHighlight?: boolean;

  /** `'list'` (default) or `'grid'`: tiles in exact data order, as many per row as fit `tileMinWidth`. */
  layout?: CoarDataListLayout;
  /** Minimum tile width in the grid layout, px number or CSS length. Default `'14rem'`. */
  tileMinWidth?: number | string;
  /** Row padding. Default `'m'`. */
  density?: CoarDataListDensity;
  /** Draws a divider between rows (list layout). */
  dividers?: boolean;
  /**
   * Space between rows — a pixel number or any CSS length (e.g. `'0.5rem'`).
   * Set it here rather than as a margin in the item template: rows are measured
   * by their border box, so a template margin would not be accounted for.
   */
  gap?: number | string;
  bordered?: boolean;
  elevated?: boolean;
  /** Fixed height of the scroll area (e.g. `'24rem'`). Default: fills the parent. */
  height?: string;

  /** Estimated row height in pixels; rows are measured after render. Default 56. */
  itemSize?: number;
  /** Rows rendered beyond the viewport as scroll buffer. Default 5. */
  overscan?: number;

  emptyText?: string;
  ariaLabel?: string;
  disabled?: boolean;

  /**
   * Let users reorder items by dragging, and accept drops from lists sharing a
   * `dragGroup`. Emits `reorder` / `items-add` / `items-remove`; the data is
   * never mutated by the list. Disabled while a sort is active.
   */
  reorderable?: boolean;
  /** `'native'` (HTML5, default), `'pointer'` (touch-capable) or `'auto'`. */
  dragEngine?: CoarDataListDragEngine;
  /** Per-item veto for dragging. */
  canDrag?: (item: T) => boolean;
  /** Lists sharing a group accept each other's items. */
  dragGroup?: string;
  /** Public identifier of this list, reported to drop targets as `sourceId`. */
  dragId?: string;
  /** Whitelist of source `dragId`s accepted here. */
  dragAccept?: string[];
  /** Runtime veto for incoming drops. */
  canDrop?: (payload: DropPayload<T>) => boolean;
  /** Accept OS file drops (`files-drop`); works with either drag engine. */
  acceptsFiles?: boolean;

  /** Nested lists: returns an item's children. Shown in the list layout only. */
  children?: (item: T) => readonly T[] | null | undefined;
  /** Sorting of the child levels; without it they inherit the top level's sort. */
  childLevel?: CoarDataListLevelConfig<T>;
  /** Deepest level shown, 0 = top level only. Default: unlimited. */
  maxDepth?: number;
  /** Indent per level, px number or CSS length. Default `'1.5rem'`. */
  nestingIndent?: number | string;
  /** `'lines'` (guide line per level, default) or `'none'`. */
  nestingStyle?: CoarDataListNestingStyle;
  /** Hide the built-in expand chevrons; use `toggleExpanded()` from the item slot instead. */
  hideExpandToggle?: boolean;
  /** Veto for dropping `item` inside `parent` (drag & drop re-parenting). */
  canNest?: (item: T, parent: T) => boolean;
}

const props = withDefaults(defineProps<CoarDataListProps<T>>(), {
  builder: undefined,
  items: () => [],
  itemKey: undefined,
  searchBy: undefined,
  filter: undefined,
  sortOptions: () => [],
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
  reorderable: false,
  dragEngine: 'native',
  canDrag: undefined,
  dragGroup: undefined,
  dragId: undefined,
  dragAccept: undefined,
  canDrop: undefined,
  acceptsFiles: false,
  children: undefined,
  childLevel: undefined,
  maxDepth: undefined,
  nestingIndent: '1.5rem',
  nestingStyle: 'lines',
  hideExpandToggle: false,
  canNest: undefined,
});

const emit = defineEmits<{
  'item-click': [event: CoarDataListItemEvent<T>];
  'item-dblclick': [event: CoarDataListItemEvent<T>];
  'item-contextmenu': [event: CoarDataListItemEvent<T>];
  /** Enter or double-click on an item. */
  'item-activate': [event: CoarDataListItemEvent<T>];
  /** Items were dropped inside this list; apply the new position to your data. */
  reorder: [event: CoarDataListDropEvent<T>];
  /** Items from another list were dropped here. */
  'items-add': [event: CoarDataListDropEvent<T>];
  /** Items of this list were accepted by another list; remove them from your data. */
  'items-remove': [event: CoarDataListItemsRemoveEvent<T>];
  'files-drop': [event: CoarDataListFilesDropEvent<T>];
  'drag-start': [items: readonly T[]];
  'drag-end': [payload: { items: readonly T[]; dropped: boolean }];
}>();

defineSlots<{
  item(props: CoarDataListItemSlotProps<T>): unknown;
  'group-header'(props: CoarDataListGroupSlotProps<T>): unknown;
  empty(): unknown;
  'toolbar-left'(): unknown;
  'toolbar-right'(): unknown;
}>();

const searchModel = defineModel<string>('search', { default: '' });
const sortModel = defineModel<CoarDataListSort | null>('sort', { default: null });
const selectedModel = defineModel<CoarDataListKey[]>('selected', { default: () => [] });
const expandedModel = defineModel<CoarDataListKey[]>('expanded', { default: () => [] });

const { t, language } = useI18n();

// ─── effective config (props-mode vs builder-mode) ──────────────────────────
const cfg = computed(() => {
  const s = props.builder?.state;
  if (s) {
    return {
      items: toValue(s.items),
      itemKey: s.itemKey,
      searchBy: unref(s.searchBy),
      filter: unref(s.filter),
      sortOptions: toValue(s.sortOptions),
      groupBy: unref(s.groupBy),
      sortGroups: unref(s.sortGroups),
      selection: toValue(s.selection),
      showSearch: toValue(s.showSearch),
      showSort: toValue(s.showSort),
      searchPlaceholder: toValue(s.searchPlaceholder),
      searchHighlight: toValue(s.searchHighlight),
      layout: toValue(s.layout),
      tileMinWidth: toValue(s.tileMinWidth),
      density: toValue(s.density),
      dividers: toValue(s.dividers),
      gap: toValue(s.gap),
      bordered: toValue(s.bordered),
      elevated: toValue(s.elevated),
      height: toValue(s.height),
      itemSize: toValue(s.itemSize),
      overscan: toValue(s.overscan),
      emptyText: toValue(s.emptyText),
      ariaLabel: toValue(s.ariaLabel),
      disabled: toValue(s.disabled),
      reorderable: toValue(s.reorderable),
      dragEngine: toValue(s.dragEngine),
      canDrag: s.canDrag,
      dragGroup: toValue(s.dragGroup),
      dragId: toValue(s.dragId),
      dragAccept: toValue(s.dragAccept),
      canDrop: s.canDrop,
      acceptsFiles: toValue(s.acceptsFiles),
      children: s.children,
      childLevel: toValue(s.childLevel),
      maxDepth: toValue(s.maxDepth),
      nestingIndent: toValue(s.nestingIndent),
      nestingStyle: toValue(s.nestingStyle),
      hideExpandToggle: toValue(s.hideExpandToggle),
      canNest: s.canNest,
    };
  }
  return {
    items: props.items,
    itemKey:
      props.itemKey
      ?? (() => {
        throw new Error('<CoarDataList> requires either :builder or :item-key.');
      }),
    searchBy: props.searchBy,
    filter: props.filter,
    sortOptions: props.sortOptions,
    groupBy: props.groupBy,
    sortGroups: props.sortGroups,
    selection: props.selection,
    showSearch: props.showSearch,
    showSort: props.showSort,
    searchPlaceholder: props.searchPlaceholder,
    searchHighlight: props.searchHighlight,
    layout: props.layout,
    tileMinWidth: props.tileMinWidth,
    density: props.density,
    dividers: props.dividers,
    gap: props.gap,
    bordered: props.bordered,
    elevated: props.elevated,
    height: props.height,
    itemSize: props.itemSize,
    overscan: props.overscan,
    emptyText: props.emptyText,
    ariaLabel: props.ariaLabel,
    disabled: props.disabled,
    reorderable: props.reorderable,
    dragEngine: props.dragEngine,
    canDrag: props.canDrag,
    dragGroup: props.dragGroup,
    dragId: props.dragId,
    dragAccept: props.dragAccept,
    canDrop: props.canDrop,
    acceptsFiles: props.acceptsFiles,
    children: props.children,
    childLevel: props.childLevel,
    maxDepth: props.maxDepth,
    nestingIndent: props.nestingIndent,
    nestingStyle: props.nestingStyle,
    hideExpandToggle: props.hideExpandToggle,
    canNest: props.canNest,
  };
});

// Writable state: the builder's refs in builder-mode, the v-models otherwise.
// The builder owns its refs; writing through them is the contract, not a prop mutation.
function builderState() {
  return props.builder?.state ?? null;
}
const search = computed<string>({
  get: () => builderState()?.search.value ?? searchModel.value,
  set: (value) => {
    const state = builderState();
    if (state) state.search.value = value;
    else searchModel.value = value;
  },
});
const sort = computed<CoarDataListSort | null>({
  get: () => (builderState() ? builderState()!.sort.value : sortModel.value),
  set: (value) => {
    const state = builderState();
    if (state) state.sort.value = value;
    else sortModel.value = value;
  },
});
const selected = computed<CoarDataListKey[]>({
  get: () => builderState()?.selected.value ?? selectedModel.value,
  set: (value) => {
    const state = builderState();
    if (state) state.selected.value = value;
    else selectedModel.value = value;
  },
});
const expanded = computed<CoarDataListKey[]>({
  get: () => builderState()?.expanded.value ?? expandedModel.value,
  set: (value) => {
    const state = builderState();
    if (state) state.expanded.value = value;
    else expandedModel.value = value;
  },
});

// Nesting is a list-layout feature; the grid shows top-level items only.
const nestingActive = computed(() => !!cfg.value.children && cfg.value.layout === 'list');

const list = useDataListModel<T>({
  items: () => cfg.value.items,
  itemKey: (item) => cfg.value.itemKey(item),
  search,
  searchBy: computed(() => cfg.value.searchBy),
  filter: computed(() => cfg.value.filter),
  sort,
  sortOptions: () => cfg.value.sortOptions,
  groupBy: computed(() => cfg.value.groupBy),
  sortGroups: computed(() => cfg.value.sortGroups),
  locale: language,
  selectionMode: () => cfg.value.selection,
  selected,
  children: computed(() => cfg.value.children),
  expanded,
  childLevel: () => cfg.value.childLevel,
  maxDepth: () => cfg.value.maxDepth,
  nesting: () => cfg.value.layout === 'list',
});

// ─── Lines & virtualisation ──────────────────────────────────────────────────
// The virtualizer works on lines: one entry per line in list layout, up to
// `columns` entries per line in grid layout, group headings always alone.
const scrollRef = useTemplateRef<HTMLElement>('scrollRef');
const probeRef = useTemplateRef<HTMLElement>('probeRef');
const entries = list.entries;

const { lines, columns, lineIndexOfKey } = useDataListLines<T>({
  entries,
  layout: () => cfg.value.layout,
  tileMinWidth: () => cfg.value.tileMinWidth,
  gap: () => cfg.value.gap,
  viewport: scrollRef,
  probe: probeRef,
});

const virtualizer = useVirtualList({
  count: () => lines.value.length,
  itemSize: () => cfg.value.itemSize,
  overscan: () => cfg.value.overscan,
  scrollElement: scrollRef,
  measure: true,
  itemKey: (index) => lines.value[index]?.key ?? index,
});

// A line key like `r:4` means "one row" in list layout but "a row of tiles"
// in grid layout, and a different row once the column count changes — the
// heights measured before no longer describe it.
watch([columns, () => cfg.value.layout], () => virtualizer.invalidateMeasurements());

const virtualLines = computed(() =>
  virtualizer.virtualRows.value.flatMap((row) => {
    const line = lines.value[row.index];
    return line ? [{ row, line }] : [];
  }),
);

const cellsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
  columnGap: cfg.value.layout === 'grid' ? 'var(--coar-data-list-gap, 0px)' : undefined,
}));

const probeStyle = computed(() => {
  const gap = cfg.value.gap;
  const min = cfg.value.tileMinWidth;
  return {
    width: typeof min === 'number' ? `${min}px` : min,
    paddingLeft: gap === undefined || gap === '' ? '0px' : typeof gap === 'number' ? `${gap}px` : gap,
  };
});

useSearchHighlight({
  root: scrollRef,
  query: search,
  enabled: () => cfg.value.searchHighlight,
  triggers: [virtualizer.virtualRows],
});

// ─── Focus & selection ───────────────────────────────────────────────────────
type ItemEntry = Extract<CoarDataListEntry<T>, { kind: 'item' }>;

const focusedKey = ref<CoarDataListKey | null>(null);
const interactive = computed(() => !cfg.value.disabled);
const selectable = computed(() => interactive.value && cfg.value.selection !== 'none');

function itemEvent(entry: ItemEntry, event: MouseEvent | KeyboardEvent): CoarDataListItemEvent<T> {
  return { item: entry.item, itemKey: entry.itemKey, index: entry.index, event };
}

function selectWithModifiers(key: CoarDataListKey, event: MouseEvent | KeyboardEvent) {
  if (!selectable.value) return;
  if (event.shiftKey && cfg.value.selection === 'multiple') list.select(key, 'range');
  else if ((event.ctrlKey || event.metaKey) && cfg.value.selection === 'multiple') list.select(key, 'toggle');
  else list.select(key, 'replace');
}

// Shift-click extends the browser's text selection as well as ours; suppress the former.
function onItemMouseDown(event: MouseEvent) {
  if (event.shiftKey && selectable.value) event.preventDefault();
}

function onItemClick(entry: ItemEntry, event: MouseEvent) {
  if (!interactive.value) return;
  focusedKey.value = entry.itemKey;
  selectWithModifiers(entry.itemKey, event);
  const payload = itemEvent(entry, event);
  emit('item-click', payload);
  props.builder?.state.onItemClick?.(payload);
}

function fireActivate(entry: ItemEntry, event: MouseEvent | KeyboardEvent) {
  const payload = itemEvent(entry, event);
  emit('item-activate', payload);
  props.builder?.state.onItemActivate?.(payload);
}

function onItemDoubleClick(entry: ItemEntry, event: MouseEvent) {
  if (!interactive.value) return;
  const payload = itemEvent(entry, event);
  emit('item-dblclick', payload);
  props.builder?.state.onItemDoubleClick?.(payload);
  fireActivate(entry, event);
}

// ─── Context menu ────────────────────────────────────────────────────────────
const internalMenu = useContextMenu();
type ContextTarget = { kind: 'item'; item: T } | { kind: 'viewport' };
const contextTarget = shallowRef<ContextTarget | null>(null);

const menuEntries = computed<readonly CoarDataListMenuEntry[]>(() => {
  const s = props.builder?.state;
  const target = contextTarget.value;
  if (!s || !target) return [];
  if (target.kind === 'item') return s.itemMenu ? s.itemMenu(target.item, list.selectedItems.value) : [];
  return s.viewportMenu ? s.viewportMenu() : [];
});

const hasDeclarativeMenu = computed(
  () => !!props.builder && (!!props.builder.state.itemMenu || !!props.builder.state.viewportMenu),
);

function onMenuItemClick(entry: CoarDataListMenuItem) {
  if (entry.disabled) return;
  entry.onClick();
  internalMenu.close();
}

function onItemContextMenu(entry: ItemEntry, event: MouseEvent) {
  if (!interactive.value) return;
  event.stopPropagation();
  focusedKey.value = entry.itemKey;
  if (selectable.value && !list.isSelected(entry.itemKey)) list.select(entry.itemKey, 'replace');
  const payload = itemEvent(entry, event);
  emit('item-contextmenu', payload);
  const s = props.builder?.state;
  if (s?.onItemContextMenu) {
    s.onItemContextMenu(payload);
    return;
  }
  if (s?.itemMenu) {
    contextTarget.value = { kind: 'item', item: entry.item };
    internalMenu.open(event);
  }
}

function onViewportContextMenu(event: MouseEvent) {
  if (!interactive.value) return;
  const s = props.builder?.state;
  if (!s?.viewportMenu) return;
  contextTarget.value = { kind: 'viewport' };
  internalMenu.open(event);
}

// ─── Drag & drop ─────────────────────────────────────────────────────────────
const reorder = useDataListReorder<T>({
  viewport: scrollRef,
  enabled: () => cfg.value.reorderable && !cfg.value.disabled,
  sorted: () => sort.value !== null,
  engine: () => cfg.value.dragEngine,
  layout: () => cfg.value.layout,
  visibleItems: () => list.items.value,
  keyOf: (item) => list.keyOf(item),
  itemByKey: (key) => list.itemByKey(key),
  isSelected: (key) => list.isSelected(key),
  canDrag: () => cfg.value.canDrag,
  dragGroup: () => cfg.value.dragGroup,
  dragId: () => cfg.value.dragId,
  dragAccept: () => cfg.value.dragAccept,
  canDrop: () => cfg.value.canDrop,
  groupOf: (item) => cfg.value.groupBy?.(item) ?? null,
  parentOf: (key) => list.parentOf(key),
  siblingsOf: (parentKey) =>
    entries.value.flatMap((entry) => (entry.kind === 'item' && entry.parentKey === parentKey ? [entry.item] : [])),
  canNestInto: (parent, items) => {
    if (!nestingActive.value) return false;
    const depth = list.entryOfKey(list.keyOf(parent))?.depth ?? 0;
    if (cfg.value.maxDepth !== undefined && depth >= cfg.value.maxDepth) return false;
    return cfg.value.canNest ? items.every((item) => cfg.value.canNest!(item, parent)) : true;
  },
  isDescendantOf: (key, ancestorKey) => {
    let current = list.parentOf(key);
    while (current !== null) {
      if (current === ancestorKey) return true;
      current = list.parentOf(current);
    }
    return false;
  },
  acceptsFiles: () => cfg.value.acceptsFiles,
  focusedKey,
  scrollToKey: (key) => scrollToKey(key),
  onReorder: (event) => {
    emit('reorder', event);
    props.builder?.state.onReorder?.(event);
  },
  onItemsAdd: (event) => {
    emit('items-add', event);
    props.builder?.state.onItemsAdd?.(event);
  },
  onItemsRemove: (event) => {
    emit('items-remove', event);
    props.builder?.state.onItemsRemove?.(event);
  },
  onFilesDrop: (event) => {
    emit('files-drop', event);
    props.builder?.state.onFilesDrop?.(event);
  },
  onDragStart: (items) => {
    emit('drag-start', items);
    props.builder?.state.onDragStart?.(items);
  },
  onDragEnd: (payload) => {
    emit('drag-end', payload);
    props.builder?.state.onDragEnd?.(payload);
  },
});

function dropClass(key: CoarDataListKey): string | undefined {
  const target = reorder.dropTarget.value;
  if (!target || target.key !== key) return undefined;
  return `coar-data-list__item--drop-${target.position}`;
}

// ─── Slot props & navigation ─────────────────────────────────────────────────
function slotPropsFor(entry: ItemEntry): CoarDataListItemSlotProps<T> {
  return {
    item: entry.item,
    index: entry.index,
    itemKey: entry.itemKey,
    selected: list.isSelected(entry.itemKey),
    focused: focusedKey.value === entry.itemKey,
    dragging: reorder.isDragged(entry.itemKey),
    depth: entry.depth,
    hasChildren: entry.hasChildren,
    expanded: entry.expanded,
    select: () => list.select(entry.itemKey, 'replace'),
    toggle: () => list.select(entry.itemKey, 'toggle'),
    toggleExpanded: () => list.toggleExpanded(entry.itemKey),
  };
}

function toggleLabel(entry: ItemEntry): string {
  return entry.expanded
    ? t('coar.ui.dataList.collapse', undefined, 'Collapse')
    : t('coar.ui.dataList.expand', undefined, 'Expand');
}

function scrollToKey(key: CoarDataListKey, align: 'auto' | 'start' | 'center' | 'end' = 'auto') {
  const lineIndex = lineIndexOfKey(key);
  if (lineIndex >= 0) virtualizer.scrollToIndex(lineIndex, align);
}

function moveFocus(toIndex: number, event: KeyboardEvent) {
  const items = list.items.value;
  if (items.length === 0) return;
  const index = Math.max(0, Math.min(items.length - 1, toIndex));
  const key = list.keyOf(items[index]);
  focusedKey.value = key;
  if (selectable.value) {
    if (event.shiftKey && cfg.value.selection === 'multiple') list.select(key, 'range');
    else if (!event.ctrlKey && !event.metaKey) list.select(key, 'replace');
  }
  scrollToKey(key);
}

/** Items per viewport page: visible lines times tiles per line. */
function pageSize(): number {
  const viewport = scrollRef.value?.clientHeight ?? 0;
  const visibleLines = Math.max(1, Math.floor(viewport / Math.max(1, cfg.value.itemSize)) - 1);
  return visibleLines * columns.value;
}

function onKeyDown(event: KeyboardEvent) {
  if (!interactive.value) return;
  if (reorder.onKeyDown(event)) return;
  const items = list.items.value;
  if (items.length === 0) return;
  const current = focusedKey.value === null ? -1 : list.indexOfKey(focusedKey.value);
  const step = columns.value; // 1 in list layout; a full line of tiles in grid layout

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveFocus(current < 0 ? 0 : current + step, event);
      return;
    case 'ArrowUp':
      event.preventDefault();
      moveFocus(current <= 0 ? 0 : current - step, event);
      return;
    case 'ArrowRight': {
      if (cfg.value.layout === 'grid') {
        event.preventDefault();
        moveFocus(current + 1, event);
        return;
      }
      if (!nestingActive.value || current < 0) return;
      // Expand a collapsed parent; on an expanded one, step into the first child.
      const entry = list.entryOfKey(list.keyOf(items[current]));
      if (!entry?.hasChildren) return;
      event.preventDefault();
      if (!entry.expanded) list.expand(entry.itemKey);
      else moveFocus(current + 1, event);
      return;
    }
    case 'ArrowLeft': {
      if (cfg.value.layout === 'grid') {
        event.preventDefault();
        moveFocus(current <= 0 ? 0 : current - 1, event);
        return;
      }
      if (!nestingActive.value || current < 0) return;
      // Collapse an expanded parent; otherwise jump to the parent row.
      const entry = list.entryOfKey(list.keyOf(items[current]));
      if (!entry) return;
      if (entry.hasChildren && entry.expanded) {
        event.preventDefault();
        list.collapse(entry.itemKey);
        return;
      }
      if (entry.parentKey !== null) {
        event.preventDefault();
        moveFocus(list.indexOfKey(entry.parentKey), event);
      }
      return;
    }
    case 'Home':
      event.preventDefault();
      moveFocus(0, event);
      return;
    case 'End':
      event.preventDefault();
      moveFocus(items.length - 1, event);
      return;
    case 'PageDown':
      event.preventDefault();
      moveFocus(current + pageSize(), event);
      return;
    case 'PageUp':
      event.preventDefault();
      moveFocus(current - pageSize(), event);
      return;
    case ' ':
      if (current < 0 || !selectable.value) return;
      event.preventDefault();
      list.select(list.keyOf(items[current]), 'toggle');
      return;
    case 'Enter': {
      if (current < 0) return;
      event.preventDefault();
      const entry = entries.value[list.entryIndexOfKey(list.keyOf(items[current]))];
      if (entry?.kind === 'item') fireActivate(entry, event);
      return;
    }
    case 'a':
    case 'A':
      if ((event.ctrlKey || event.metaKey) && cfg.value.selection === 'multiple') {
        event.preventDefault();
        list.selectAll();
      }
      return;
    default:
      return;
  }
}

function onViewportFocus() {
  if (focusedKey.value !== null && list.indexOfKey(focusedKey.value) >= 0) return;
  const first = list.items.value[0];
  focusedKey.value = first === undefined ? null : list.keyOf(first);
}

// Drop the focus marker when the item leaves the visible set (filtered out / removed).
watch(list.items, () => {
  if (focusedKey.value !== null && list.indexOfKey(focusedKey.value) < 0) focusedKey.value = null;
});

// ─── Presentation ────────────────────────────────────────────────────────────
const showToolbar = computed(
  () => cfg.value.showSearch || (cfg.value.showSort && cfg.value.sortOptions.length > 0),
);
const emptyLabel = computed(() => cfg.value.emptyText ?? t('coar.ui.dataList.empty', undefined, 'No items'));
const viewportStyle = computed(() => (cfg.value.height ? { height: cfg.value.height, flex: 'none' } : undefined));
const rootStyle = computed(() => {
  const style: Record<string, string> = {};
  const gap = cfg.value.gap;
  if (gap !== undefined && gap !== '') style['--coar-data-list-gap'] = typeof gap === 'number' ? `${gap}px` : gap;
  const indent = cfg.value.nestingIndent;
  style['--coar-data-list-indent'] = typeof indent === 'number' ? `${indent}px` : indent;
  return style;
});
const role = computed(() => (cfg.value.selection === 'none' ? 'list' : 'listbox'));

// ─── Imperative API ──────────────────────────────────────────────────────────
/** Scroll the visible item at `index` into view. */
function scrollToIndex(index: number, align?: 'auto' | 'start' | 'center' | 'end') {
  const item = list.items.value[index];
  if (item !== undefined) scrollToKey(list.keyOf(item), align);
}

/** Move the keyboard focus marker to `key` and scroll it into view. */
function focusKey(key: CoarDataListKey) {
  focusedKey.value = key;
  nextTick(() => scrollToKey(key));
}

/** Forget measured row heights so the estimate applies until rows re-measure. */
function invalidateMeasurements(key?: CoarDataListKey) {
  if (key === undefined) {
    virtualizer.invalidateMeasurements();
    return;
  }
  const line = lines.value[lineIndexOfKey(key)];
  if (line) virtualizer.invalidateMeasurements(line.key);
}

onMounted(() => {
  props.builder?._bindImpls({ model: list, scrollToKey, scrollToIndex, focusKey, invalidateMeasurements });
});
onBeforeUnmount(() => {
  props.builder?._bindImpls(null);
});

defineExpose({
  /** Headless list API (visible items, selection, lookups). */
  list,
  scrollToKey,
  scrollToIndex,
  focusKey,
  invalidateMeasurements,
});
</script>

<template>
  <div
    class="coar-data-list"
    :class="[
      `coar-data-list--density-${cfg.density}`,
      `coar-data-list--layout-${cfg.layout}`,
      {
        'coar-data-list--bordered': cfg.bordered,
        'coar-data-list--elevated': cfg.elevated,
        'coar-data-list--dividers': cfg.dividers,
        'coar-data-list--disabled': cfg.disabled,
        'coar-data-list--selectable': selectable,
        'coar-data-list--reorderable': cfg.reorderable && !cfg.disabled,
        'coar-data-list--drag-over': reorder.isDragOver.value,
        'coar-data-list--dragging': reorder.dragging.value,
        'coar-data-list--nested': nestingActive,
        [`coar-data-list--nesting-${cfg.nestingStyle}`]: nestingActive,
      },
    ]"
    :style="rootStyle"
  >
    <CoarDataListToolbar
      v-if="showToolbar"
      v-model:search="search"
      v-model:sort="sort"
      :show-search="cfg.showSearch"
      :show-sort="cfg.showSort"
      :search-placeholder="cfg.searchPlaceholder"
      :sort-options="cfg.sortOptions"
      :disabled="cfg.disabled"
    >
      <template #left><slot name="toolbar-left" /></template>
      <template #right><slot name="toolbar-right" /></template>
    </CoarDataListToolbar>

    <div
      ref="scrollRef"
      class="coar-data-list__viewport"
      :style="viewportStyle"
      :tabindex="interactive ? 0 : -1"
      :role="role"
      :aria-label="cfg.ariaLabel"
      :aria-multiselectable="cfg.selection === 'multiple' ? 'true' : undefined"
      :aria-disabled="cfg.disabled ? 'true' : undefined"
      @keydown="onKeyDown"
      @focus="onViewportFocus"
      @contextmenu="onViewportContextMenu"
      @dragover="reorder.onViewportDragOver"
      @dragleave="reorder.onViewportDragLeave"
      @drop="reorder.onViewportDrop"
    >
      <!-- Resolves tileMinWidth / gap to pixels for the column count. -->
      <div ref="probeRef" class="coar-data-list__probe" :style="probeStyle" aria-hidden="true" />

      <div
        v-if="lines.length > 0"
        class="coar-data-list__spacer"
        :style="{ height: `${virtualizer.totalSize.value}px` }"
      >
        <div
          v-for="{ row, line } in virtualLines"
          :key="line.key"
          :ref="(el) => virtualizer.measureElement(row.index, el as Element | null)"
          class="coar-data-list__row"
          :class="{ 'coar-data-list__row--last': row.index === lines.length - 1 }"
          :style="{ transform: `translateY(${row.start}px)` }"
        >
          <div
            v-if="line.kind === 'group'"
            class="coar-data-list__group"
            role="presentation"
          >
            <slot name="group-header" :group="line.entry.group" :count="line.entry.count" :items="line.entry.items">
              <span class="coar-data-list__group-label">{{ line.entry.group }}</span>
              <span class="coar-data-list__group-count">{{ line.entry.count }}</span>
            </slot>
          </div>
          <div v-else class="coar-data-list__cells" :style="cellsStyle" role="presentation">
            <div
              v-for="entry in line.entries"
              :key="entry.key"
              class="coar-data-list__item"
              :class="[
                {
                  'coar-data-list__item--selected': list.isSelected(entry.itemKey),
                  'coar-data-list__item--focused': focusedKey === entry.itemKey,
                  'coar-data-list__item--dragging': reorder.isDragged(entry.itemKey),
                  'coar-data-list__item--nested': entry.depth > 0,
                  'coar-data-list__item--parent': entry.hasChildren,
                  'coar-data-list__item--expanded': entry.expanded,
                },
                dropClass(entry.itemKey),
              ]"
              :style="nestingActive ? { '--coar-data-list-depth': entry.depth } : undefined"
              :data-key="String(entry.itemKey)"
              :role="cfg.selection === 'none' ? 'listitem' : 'option'"
              :aria-selected="cfg.selection === 'none' ? undefined : list.isSelected(entry.itemKey) ? 'true' : 'false'"
              :aria-level="nestingActive ? entry.depth + 1 : undefined"
              :aria-expanded="nestingActive && entry.hasChildren ? (entry.expanded ? 'true' : 'false') : undefined"
              :draggable="reorder.nativeDraggable.value ? true : undefined"
              @mousedown="onItemMouseDown"
              @click="onItemClick(entry, $event)"
              @dblclick="onItemDoubleClick(entry, $event)"
              @contextmenu="onItemContextMenu(entry, $event)"
              @dragstart="reorder.onItemDragStart($event, entry.item)"
              @dragend="reorder.onItemDragEnd"
              @pointerdown="reorder.onItemPointerDown($event, entry.item)"
            >
              <template v-if="nestingActive">
                <span
                  v-for="level in entry.depth"
                  :key="level"
                  class="coar-data-list__guide"
                  :style="{ '--coar-data-list-guide-index': level - 1 }"
                  aria-hidden="true"
                />
                <button
                  v-if="!cfg.hideExpandToggle"
                  type="button"
                  class="coar-data-list__toggle"
                  :class="{ 'coar-data-list__toggle--leaf': !entry.hasChildren }"
                  :aria-label="toggleLabel(entry)"
                  :aria-hidden="entry.hasChildren ? undefined : 'true'"
                  :tabindex="-1"
                  :disabled="!entry.hasChildren"
                  @mousedown.prevent.stop
                  @pointerdown.stop
                  @click.stop="list.toggleExpanded(entry.itemKey)"
                  @dblclick.stop
                >
                  <CoarIcon name="chevron-right" size="s" class="coar-data-list__chevron" />
                </button>
              </template>
              <div class="coar-data-list__content">
                <slot name="item" v-bind="slotPropsFor(entry)">
                  {{ String(entry.itemKey) }}
                </slot>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="coar-data-list__empty">
        <slot name="empty">{{ emptyLabel }}</slot>
      </div>
    </div>

    <!-- Builder-driven internal context menu. -->
    <CoarContextMenu v-if="hasDeclarativeMenu" :menu="internalMenu">
      <CoarMenu>
        <template v-for="(entry, i) in menuEntries" :key="i">
          <CoarMenuDivider v-if="entry === 'divider'" />
          <CoarMenuItem
            v-else
            :label="entry.label"
            :icon="entry.icon"
            :disabled="entry.disabled"
            :class="{ 'coar-data-list__menu-item--danger': entry.danger }"
            @clicked="onMenuItemClick(entry)"
          />
        </template>
      </CoarMenu>
    </CoarContextMenu>
  </div>
</template>

<style>
::highlight(coar-data-list-search) {
  background-color: var(--coar-background-warning-secondary, rgb(255 213 0 / 0.45));
  color: inherit;
}

/* Same treatment as CoarTree's declarative menus. */
.coar-data-list__menu-item--danger > button,
.coar-data-list__menu-item--danger > .coar-menu-item {
  color: var(--coar-text-semantic-error-bold, #dc2626);
}

/* Pointer-engine drag ghost: a clone of the row appended to <body>. */
.coar-data-list__ghost {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  box-sizing: border-box;
  opacity: 0.85;
  border-radius: var(--coar-radius-s);
  background: var(--coar-surface-neutral-primary, #fff);
  box-shadow: var(--coar-elevation-high, 0 8px 24px rgb(0 0 0 / 0.2));
  cursor: grabbing;
}

.coar-data-list__ghost[data-count]::after {
  content: attr(data-count);
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  min-width: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--coar-background-accent-primary, #2563eb);
  color: var(--coar-text-on-accent, #fff);
  font-size: 0.75rem;
  line-height: 1.25rem;
  text-align: center;
}
</style>

<style scoped>
.coar-data-list {
  --coar-data-list-item-pad-y: var(--coar-spacing-s);
  --coar-data-list-item-pad-x: var(--coar-spacing-s);

  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
}

.coar-data-list--density-s {
  --coar-data-list-item-pad-y: var(--coar-spacing-xxs);
  --coar-data-list-item-pad-x: var(--coar-spacing-xs);
}

.coar-data-list--density-l {
  --coar-data-list-item-pad-y: var(--coar-spacing-m);
  --coar-data-list-item-pad-x: var(--coar-spacing-m);
}

.coar-data-list--bordered {
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  padding: 0 var(--coar-spacing-xs);
}

.coar-data-list--elevated {
  box-shadow: var(--coar-elevation-medium);
  border-radius: var(--coar-radius-s);
  padding: 0 var(--coar-spacing-xs);
}

.coar-data-list--disabled {
  color: var(--coar-text-neutral-disabled);
}

.coar-data-list__viewport {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  /* Rows are re-positioned as they get measured; scroll anchoring would chase them. */
  overflow-anchor: none;
  outline: none;
  border-radius: var(--coar-radius-xs);
}

.coar-data-list__viewport:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -1px;
}

.coar-data-list__probe {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  height: 0;
  box-sizing: content-box;
}

.coar-data-list__spacer {
  position: relative;
  width: 100%;
}

.coar-data-list__cells {
  display: grid;
  align-items: stretch;
  min-width: 0;
}

.coar-data-list__row {
  position: absolute;
  inset: 0 0 auto;
  box-sizing: border-box;
  /* The gap is padding, not margin, so the measured row height includes it. */
  padding-bottom: var(--coar-data-list-gap, 0px);
}

.coar-data-list__row--last {
  padding-bottom: 0;
}

.coar-data-list__item {
  position: relative;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  padding: var(--coar-data-list-item-pad-y) var(--coar-data-list-item-pad-x);
  border-radius: var(--coar-radius-xs);
  min-width: 0;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-data-list__content {
  flex: 1 1 auto;
  min-width: 0;
}

/* ── Nesting ── */
.coar-data-list--nested .coar-data-list__item {
  --coar-data-list-toggle-size: 1.25rem;
  padding-left: calc(
    var(--coar-data-list-item-pad-x) + var(--coar-data-list-depth, 0) * var(--coar-data-list-indent, 1.5rem)
  );
}

.coar-data-list__toggle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--coar-data-list-toggle-size);
  height: var(--coar-data-list-toggle-size);
  margin-right: var(--coar-spacing-xs);
  padding: 0;
  border: 0;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
}

.coar-data-list__toggle--leaf {
  visibility: hidden;
  cursor: default;
}

@media (hover: hover) {
  .coar-data-list__toggle:not(.coar-data-list__toggle--leaf):hover {
    background: var(--coar-background-neutral-tertiary);
    color: var(--coar-icon-neutral-primary);
  }
}

.coar-data-list__chevron {
  transition: transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-data-list__item--expanded > .coar-data-list__toggle .coar-data-list__chevron {
  transform: rotate(90deg);
}

/* One guide line per ancestor level, aligned with that level's chevron. */
.coar-data-list__guide {
  display: none;
}

.coar-data-list--nesting-lines .coar-data-list__guide {
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(
    var(--coar-data-list-item-pad-x) + var(--coar-data-list-guide-index) * var(--coar-data-list-indent, 1.5rem)
      + var(--coar-data-list-toggle-size) / 2
  );
  border-left: 1px solid var(--coar-border-neutral-secondary, var(--coar-border-neutral));
  pointer-events: none;
}

.coar-data-list--nesting-lines .coar-data-list__item--nested {
  border-radius: 0;
}

/* Drop "inside": make the row the new parent. */
.coar-data-list__item--drop-inside {
  outline: 2px dashed var(--coar-border-accent-primary);
  outline-offset: -2px;
  background: var(--coar-background-accent-tertiary);
}

.coar-data-list--selectable .coar-data-list__item {
  cursor: pointer;
}

.coar-data-list--dividers.coar-data-list--layout-list .coar-data-list__item {
  border-radius: 0;
  border-bottom: 1px solid var(--coar-border-neutral-secondary, var(--coar-border-neutral));
}

.coar-data-list--layout-grid .coar-data-list__item {
  display: flex;
  flex-direction: column;
  border-radius: var(--coar-radius-s);
}

@media (hover: hover) {
  .coar-data-list:not(.coar-data-list--disabled) .coar-data-list__item:hover {
    background: var(--coar-background-neutral-tertiary);
  }
}

.coar-data-list__item--selected,
.coar-data-list:not(.coar-data-list--disabled) .coar-data-list__item--selected:hover {
  background: var(--coar-background-accent-tertiary);
  color: var(--coar-text-accent-primary);
}

.coar-data-list__item--focused {
  outline: 1px solid var(--coar-focus-color);
  outline-offset: -1px;
}

/* ── Drag & drop ── */
.coar-data-list--reorderable .coar-data-list__item {
  touch-action: pan-y;
}

.coar-data-list--reorderable.coar-data-list--layout-grid .coar-data-list__item {
  touch-action: pan-x pan-y;
}

.coar-data-list--dragging .coar-data-list__item {
  cursor: grabbing;
}

.coar-data-list__item--dragging {
  opacity: 0.4;
}

.coar-data-list--drag-over .coar-data-list__viewport {
  outline: 2px solid var(--coar-border-accent-primary);
  outline-offset: -2px;
}

/* Insertion indicator: a line above/below the row, or left/right of a tile. */
.coar-data-list__item--drop-before::before,
.coar-data-list__item--drop-after::after {
  content: '';
  position: absolute;
  z-index: 1;
  pointer-events: none;
  background: var(--coar-border-accent-primary);
  border-radius: 2px;
}

.coar-data-list--layout-list .coar-data-list__item--drop-before::before,
.coar-data-list--layout-list .coar-data-list__item--drop-after::after {
  left: 0;
  right: 0;
  height: 3px;
}

.coar-data-list--layout-list .coar-data-list__item--drop-before::before {
  top: -2px;
}

.coar-data-list--layout-list .coar-data-list__item--drop-after::after {
  bottom: -2px;
}

.coar-data-list--layout-grid .coar-data-list__item--drop-before::before,
.coar-data-list--layout-grid .coar-data-list__item--drop-after::after {
  top: 0;
  bottom: 0;
  width: 3px;
}

.coar-data-list--layout-grid .coar-data-list__item--drop-before::before {
  left: -2px;
}

.coar-data-list--layout-grid .coar-data-list__item--drop-after::after {
  right: -2px;
}

.coar-data-list__group {
  display: flex;
  align-items: baseline;
  gap: var(--coar-spacing-xs);
  padding: var(--coar-spacing-s) var(--coar-data-list-item-pad-x) var(--coar-spacing-xxs);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-font-weight-semibold);
  color: var(--coar-text-neutral-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.coar-data-list__group-count {
  font-weight: var(--coar-font-weight-regular, 400);
}

.coar-data-list__empty {
  padding: var(--coar-spacing-l) var(--coar-spacing-m);
  text-align: center;
  color: var(--coar-text-neutral-secondary);
}
</style>
