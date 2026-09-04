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
  /** Grid layout: draw tiles as cards (border + radius). An expanded tile's frame opens into the band of its children. */
  tileCards?: boolean;
  /** Lift an expanded card and its band with a shadow. */
  bandElevated?: boolean;
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
  tileCards: false,
  bandElevated: false,
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
      tileCards: toValue(s.tileCards),
      bandElevated: toValue(s.bandElevated),
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
    tileCards: props.tileCards,
    bandElevated: props.bandElevated,
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

const nestingActive = computed(() => !!cfg.value.children);

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
});

// ─── Lines & virtualisation ──────────────────────────────────────────────────
// The virtualizer works on lines: one entry per line in list layout, up to
// `columns` entries per line in grid layout, group headings always alone.
const scrollRef = useTemplateRef<HTMLElement>('scrollRef');
const probeRef = useTemplateRef<HTMLElement>('probeRef');
const childProbeRef = useTemplateRef<HTMLElement>('childProbeRef');
const entries = list.entries;

/** Horizontal inset of a band's content, in px (resolved from `nestingIndent`). */
const bandInsetPx = computed(() => {
  const indent = cfg.value.nestingIndent;
  if (typeof indent === 'number') return indent;
  const match = /^\s*(-?[\d.]+)\s*(px|rem|em)?\s*$/.exec(indent);
  if (!match) return 24;
  const amount = Number.parseFloat(match[1]);
  if (match[2] === 'rem' || match[2] === 'em') {
    const root = typeof document !== 'undefined' ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) : 16;
    return amount * (Number.isFinite(root) && root > 0 ? root : 16);
  }
  return amount;
});

const { lines, bands, columns, lineIndexOfKey, positionOfKey } = useDataListLines<T>({
  entries,
  layout: () => cfg.value.layout,
  tileMinWidth: () => cfg.value.tileMinWidth,
  childLayout: () => cfg.value.childLevel?.layout,
  childTileMinWidth: () => cfg.value.childLevel?.tileMinWidth,
  gap: () => cfg.value.gap,
  bandInset: () => bandInsetPx.value,
  viewport: scrollRef,
  probe: probeRef,
  childProbe: childProbeRef,
});

// Grid layout: one expanded parent per row. A band hangs under its parent's row
// like a folder under its tab; a second band in the same row would have no tab
// to hang from. The most recently expanded tile wins, the others collapse.
// One watcher for both facts: which key was just added and which row now holds
// two open tiles. Two watchers would race — they hang off the same source.
let recentlyExpanded: CoarDataListKey | null = null;
watch([lines, expanded], ([current, next], [, previous]) => {
  const before = new Set(previous ?? []);
  const added = next.find((key) => !before.has(key));
  if (added !== undefined) recentlyExpanded = added;
  const collapse: CoarDataListKey[] = [];
  for (const line of current) {
    if (line.kind !== 'items' || line.layout !== 'grid') continue;
    const open = line.entries.filter((entry) => entry.hasChildren && entry.expanded).map((entry) => entry.itemKey);
    if (open.length <= 1) continue;
    const keep = recentlyExpanded !== null && open.includes(recentlyExpanded) ? recentlyExpanded : open[0];
    for (const key of open) if (key !== keep) collapse.push(key);
  }
  if (collapse.length > 0) expanded.value = expanded.value.filter((key) => !collapse.includes(key));
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

/**
 * One frame per band, drawn as a single element spanning all its lines (a
 * per-line border would show seams, a per-line shadow would show them twice).
 * Its extent comes from the virtualizer's offsets, so it follows measured heights.
 */
const gapPx = computed(() => {
  const gap = cfg.value.gap;
  if (gap === undefined || gap === '') return 0;
  return typeof gap === 'number' ? gap : Number.parseFloat(gap) || 0;
});
const bandBoxes = computed(() =>
  bands.value.map((band) => {
    const top = virtualizer.offsetFor(band.firstLine);
    const isLast = band.lastLine === lines.value.length - 1;
    const bottom = virtualizer.offsetFor(band.lastLine + 1) - (isLast ? 0 : gapPx.value);
    return { key: `band:${String(band.parentKey)}`, level: band.level, top, height: Math.max(0, bottom - top) };
  }),
);

function bandBoxStyle(box: { level: number; top: number; height: number }) {
  return {
    transform: `translateY(${box.top}px)`,
    height: `${box.height}px`,
    '--coar-data-list-band-level': String(box.level),
  };
}

type Line = (typeof lines.value)[number];
type ItemsLine = Extract<Line, { kind: 'items' }>;

function cellsStyle(line: ItemsLine) {
  return {
    gridTemplateColumns: `repeat(${line.columns}, minmax(0, 1fr))`,
    columnGap: line.layout === 'grid' ? 'var(--coar-data-list-gap, 0px)' : undefined,
  };
}

function rowClass(line: Line) {
  const band = line.band;
  return {
    'coar-data-list__row--last': false,
    'coar-data-list__row--band': !!band,
    'coar-data-list__row--band-first': !!band?.first,
    'coar-data-list__row--band-last': !!band?.last,
    'coar-data-list__row--opens-band': line.kind === 'items' && line.opensBand,
    [`coar-data-list__row--layout-${line.kind === 'items' ? line.layout : 'list'}`]: true,
  };
}

function rowStyle(line: Line, start: number) {
  const style: Record<string, string> = { transform: `translateY(${start}px)` };
  const band = line.band;
  if (band) {
    style['--coar-data-list-band-level'] = String(band.level);
    style['--coar-data-list-parent-col'] = String(band.parentColumn);
    style['--coar-data-list-parent-cols'] = String(band.parentColumns);
  } else if (line.kind === 'items' && line.opensBand) {
    style['--coar-data-list-band-level'] = '0';
  }
  return style;
}

/** Indent inside a band is relative to the band, not to the top level. */
function itemDepthStyle(line: ItemsLine, entry: ItemEntry) {
  if (!nestingActive.value) return undefined;
  const relativeDepth = line.layout === 'list' ? entry.depth - (line.band?.level ?? 0) : 0;
  return { '--coar-data-list-depth': String(Math.max(0, relativeDepth)) };
}

function probeStyle(min: number | string) {
  const gap = cfg.value.gap;
  return {
    width: typeof min === 'number' ? `${min}px` : min,
    paddingLeft: gap === undefined || gap === '' ? '0px' : typeof gap === 'number' ? `${gap}px` : gap,
  };
}

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
  sortedAt: (parentKey) => {
    const depth = parentKey === null ? 0 : (list.entryOfKey(parentKey)?.depth ?? 0) + 1;
    return list.sortAtDepth(depth) !== null;
  },
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

function focusItem(key: CoarDataListKey, event: KeyboardEvent) {
  focusedKey.value = key;
  if (selectable.value) {
    if (event.shiftKey && cfg.value.selection === 'multiple') list.select(key, 'range');
    else if (!event.ctrlKey && !event.metaKey) list.select(key, 'replace');
  }
  scrollToKey(key);
}

/** Focus by position among the visible items (data order). */
function moveFocus(toIndex: number, event: KeyboardEvent) {
  const items = list.items.value;
  if (items.length === 0) return;
  const index = Math.max(0, Math.min(items.length - 1, toIndex));
  focusItem(list.keyOf(items[index]), event);
}

/** Items lines only, for vertical navigation across rows, bands and headings. */
function itemsLineAt(from: number, direction: 1 | -1, steps = 1): ItemsLine | null {
  let index = from;
  let remaining = steps;
  let found: ItemsLine | null = null;
  while (remaining > 0) {
    index += direction;
    if (index < 0 || index >= lines.value.length) break;
    const line = lines.value[index];
    if (line.kind !== 'items') continue;
    found = line;
    remaining--;
  }
  return found;
}

/**
 * Focus the item one or more rows up / down, keeping the column where possible.
 * Rows are what the user sees: a tile row, a band under it, a nested list row.
 */
function moveFocusVertically(steps: number, event: KeyboardEvent) {
  const current = focusedKey.value === null ? null : positionOfKey(focusedKey.value);
  if (!current) {
    moveFocus(steps > 0 ? 0 : list.items.value.length - 1, event);
    return;
  }
  const target = itemsLineAt(current.line, steps > 0 ? 1 : -1, Math.abs(steps));
  if (!target) return;
  const entry = target.entries[Math.min(current.column, target.entries.length - 1)];
  focusItem(entry.itemKey, event);
}

/** Focus the previous / next tile as seen on screen: along the row, then across rows. */
function moveFocusHorizontally(delta: 1 | -1, event: KeyboardEvent) {
  const current = focusedKey.value === null ? null : positionOfKey(focusedKey.value);
  if (!current) {
    moveFocus(delta > 0 ? 0 : list.items.value.length - 1, event);
    return;
  }
  const line = lines.value[current.line] as ItemsLine;
  const column = current.column + delta;
  if (column >= 0 && column < line.entries.length) {
    focusItem(line.entries[column].itemKey, event);
    return;
  }
  const next = itemsLineAt(current.line, delta);
  if (!next) return;
  focusItem((delta > 0 ? next.entries[0] : next.entries[next.entries.length - 1]).itemKey, event);
}

/** Visible lines per viewport page. */
function pageLines(): number {
  const viewport = scrollRef.value?.clientHeight ?? 0;
  return Math.max(1, Math.floor(viewport / Math.max(1, cfg.value.itemSize)) - 1);
}

function expandFocused(event: KeyboardEvent, entry: ItemEntry, current: number) {
  if (!entry.hasChildren) return;
  event.preventDefault();
  if (!entry.expanded) list.expand(entry.itemKey);
  else moveFocus(current + 1, event); // first child is next in data order
}

function collapseFocused(event: KeyboardEvent, entry: ItemEntry) {
  if (entry.hasChildren && entry.expanded) {
    event.preventDefault();
    list.collapse(entry.itemKey);
    return;
  }
  if (entry.parentKey !== null) {
    event.preventDefault();
    focusItem(entry.parentKey, event);
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (!interactive.value) return;
  if (reorder.onKeyDown(event)) return;
  const items = list.items.value;
  if (items.length === 0) return;
  const current = focusedKey.value === null ? -1 : list.indexOfKey(focusedKey.value);
  const entry = current < 0 ? undefined : list.entryOfKey(list.keyOf(items[current]));
  const position = focusedKey.value === null ? null : positionOfKey(focusedKey.value);
  const inTileRow = position !== null && (lines.value[position.line] as ItemsLine | undefined)?.layout === 'grid';

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveFocusVertically(1, event);
      return;
    case 'ArrowUp':
      event.preventDefault();
      moveFocusVertically(-1, event);
      return;
    case 'ArrowRight':
      if (inTileRow) {
        event.preventDefault();
        moveFocusHorizontally(1, event);
        return;
      }
      if (nestingActive.value && entry) expandFocused(event, entry, current);
      return;
    case 'ArrowLeft':
      if (inTileRow) {
        event.preventDefault();
        moveFocusHorizontally(-1, event);
        return;
      }
      if (nestingActive.value && entry) collapseFocused(event, entry);
      return;
    case '+':
      if (nestingActive.value && entry) expandFocused(event, entry, current);
      return;
    case '-':
      if (nestingActive.value && entry) collapseFocused(event, entry);
      return;
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
      moveFocusVertically(pageLines(), event);
      return;
    case 'PageUp':
      event.preventDefault();
      moveFocusVertically(-pageLines(), event);
      return;
    case ' ':
      if (current < 0 || !selectable.value) return;
      event.preventDefault();
      list.select(list.keyOf(items[current]), 'toggle');
      return;
    case 'Enter': {
      if (current < 0) return;
      event.preventDefault();
      if (entry) fireActivate(entry, event);
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
        'coar-data-list--band-elevated': cfg.bandElevated,
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
      <!-- Resolve tileMinWidth / gap to pixels for the column counts (top level and child levels). -->
      <div ref="probeRef" class="coar-data-list__probe" :style="probeStyle(cfg.tileMinWidth)" aria-hidden="true" />
      <div ref="childProbeRef" class="coar-data-list__probe" :style="probeStyle(cfg.childLevel?.tileMinWidth ?? cfg.tileMinWidth)" aria-hidden="true" />

      <div
        v-if="lines.length > 0"
        class="coar-data-list__spacer"
        :style="{ height: `${virtualizer.totalSize.value}px` }"
      >
        <!-- Band frames first, so the rows (and the opened card) paint above them. -->
        <div
          v-for="box in bandBoxes"
          :key="box.key"
          class="coar-data-list__band-box"
          :class="{ 'coar-data-list__band-box--elevated': cfg.bandElevated }"
          :style="bandBoxStyle(box)"
          aria-hidden="true"
        />
        <div
          v-for="{ row, line } in virtualLines"
          :key="line.key"
          :ref="(el) => virtualizer.measureElement(row.index, el as Element | null)"
          class="coar-data-list__row"
          :class="[rowClass(line), { 'coar-data-list__row--last': row.index === lines.length - 1 }]"
          :style="rowStyle(line, row.start)"
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
          <!-- The frame draws a band's border; outside a band it is transparent. -->
          <div v-else class="coar-data-list__frame" role="presentation">
          <div class="coar-data-list__cells" :style="cellsStyle(line)" role="presentation">
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
                  'coar-data-list__item--tile': line.layout === 'grid',
                  'coar-data-list__item--card': line.layout === 'grid' && cfg.tileCards,
                  'coar-data-list__item--row': line.layout === 'list',
                },
                dropClass(entry.itemKey),
              ]"
              :style="itemDepthStyle(line, entry)"
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
                  v-for="level in (line.layout === 'list' ? Math.max(0, entry.depth - (line.band?.level ?? 0)) : 0)"
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
  /* Inner padding of the scroll area — set it when elevated bands or focus rings
     need room inside the viewport (e.g. `--coar-data-list-padding: 0.5rem`). */
  padding: var(--coar-data-list-padding, 0);
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

/* ── Bands: children of an expanded tile, under that tile's row ── */
.coar-data-list__frame {
  --coar-data-list-band-inset: var(--coar-data-list-indent, 1.5rem);
  min-width: 0;
}

/* Rows inside a band keep clear of the frames of every enclosing band. */
.coar-data-list__row--band > .coar-data-list__frame {
  position: relative;
  margin-left: calc((var(--coar-data-list-band-level) - 1) * var(--coar-data-list-band-inset));
  margin-right: calc((var(--coar-data-list-band-level) - 1) * var(--coar-data-list-band-inset));
  padding-left: var(--coar-data-list-band-inset);
  padding-right: var(--coar-data-list-band-inset);
}

.coar-data-list__row--band-first > .coar-data-list__frame {
  padding-top: var(--coar-spacing-s);
}

.coar-data-list__row--band-last > .coar-data-list__frame {
  padding-bottom: var(--coar-spacing-s);
}

/* The frame itself: one element per band, spanning all its lines, drawn under
   the rows. An outline that continues the parent card's border. */
.coar-data-list__band-box {
  --coar-data-list-band-inset: var(--coar-data-list-indent, 1.5rem);
  position: absolute;
  inset: 0 0 auto;
  box-sizing: border-box;
  margin-left: calc((var(--coar-data-list-band-level) - 1) * var(--coar-data-list-band-inset));
  margin-right: calc((var(--coar-data-list-band-level) - 1) * var(--coar-data-list-band-inset));
  border: 1px solid var(--coar-border-neutral);
  border-bottom-left-radius: var(--coar-radius-s);
  border-bottom-right-radius: var(--coar-radius-s);
  pointer-events: none;
}

.coar-data-list__band-box--elevated {
  box-shadow: var(--coar-elevation-medium);
}

/* The row that opens a band paints above the frame's top border, so the expanded
   card's open bottom edge cuts it exactly under the card. The other tiles keep the
   row gap; only the card reaches down to the band. */
.coar-data-list__row--opens-band {
  z-index: 1;
}

/* ── Tiles ── */
/* Doubled class: the generic item rule (align-items: flex-start) comes later in
   the file and must lose — a tile's content takes the full tile width. */
.coar-data-list__item.coar-data-list__item--tile {
  flex-direction: column;
  align-items: stretch;
}

.coar-data-list__item--tile > .coar-data-list__content {
  width: 100%;
}

.coar-data-list__item--tile > .coar-data-list__toggle {
  position: absolute;
  top: var(--coar-spacing-xxs);
  right: var(--coar-spacing-xxs);
  margin: 0;
  z-index: 1;
}

.coar-data-list__item--tile.coar-data-list__item--expanded > .coar-data-list__toggle .coar-data-list__chevron {
  transform: rotate(90deg);
}

.coar-data-list__item--card {
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-surface-neutral-primary, #fff);
}

/* Expanded card: bottom edge opens into the band, like a tab into its panel.
   The card grows by the row gap plus one pixel, so it bridges the gap the other
   tiles keep and covers the band's top border under itself. */
.coar-data-list__row--opens-band .coar-data-list__item--card.coar-data-list__item--expanded {
  border-bottom-color: transparent;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin-bottom: calc(-1 * (var(--coar-data-list-gap, 0px) + 1px));
  padding-bottom: calc(var(--coar-data-list-item-pad-y) + var(--coar-data-list-gap, 0px) + 1px);
  z-index: 1;
}

/* With elevation the card carries the top part of the shadow; its bottom stays
   open so the shadow flows into the band's without a seam. */
.coar-data-list--band-elevated .coar-data-list__row--opens-band .coar-data-list__item--card.coar-data-list__item--expanded {
  box-shadow: var(--coar-elevation-medium);
  clip-path: inset(-24px -24px 0 -24px);
}

.coar-data-list__item--tile.coar-data-list__item--selected {
  border-color: var(--coar-border-accent-primary, currentColor);
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

.coar-data-list--dividers .coar-data-list__item--row {
  border-radius: 0;
  border-bottom: 1px solid var(--coar-border-neutral-secondary, var(--coar-border-neutral));
}

.coar-data-list__item--tile {
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

.coar-data-list__item--row.coar-data-list__item--drop-before::before,
.coar-data-list__item--row.coar-data-list__item--drop-after::after {
  left: 0;
  right: 0;
  height: 3px;
}

.coar-data-list__item--row.coar-data-list__item--drop-before::before {
  top: -2px;
}

.coar-data-list__item--row.coar-data-list__item--drop-after::after {
  bottom: -2px;
}

.coar-data-list__item--tile.coar-data-list__item--drop-before::before,
.coar-data-list__item--tile.coar-data-list__item--drop-after::after {
  top: 0;
  bottom: 0;
  width: 3px;
}

.coar-data-list__item--tile.coar-data-list__item--drop-before::before {
  left: -2px;
}

.coar-data-list__item--tile.coar-data-list__item--drop-after::after {
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
