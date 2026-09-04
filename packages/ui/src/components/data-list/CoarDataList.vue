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
import CoarDataListToolbar from './CoarDataListToolbar.vue';
import CoarContextMenu from '../menu/CoarContextMenu.vue';
import CoarMenu from '../menu/CoarMenu.vue';
import CoarMenuItem from '../menu/CoarMenuItem.vue';
import CoarMenuDivider from '../menu/CoarMenuDivider.vue';
import { useContextMenu } from '../menu/useContextMenu';
import type { DataListBuilder } from './data-list-builder';
import type {
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
});

const emit = defineEmits<{
  'item-click': [event: CoarDataListItemEvent<T>];
  'item-dblclick': [event: CoarDataListItemEvent<T>];
  'item-contextmenu': [event: CoarDataListItemEvent<T>];
  /** Enter or double-click on an item. */
  'item-activate': [event: CoarDataListItemEvent<T>];
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

// ─── Slot props & navigation ─────────────────────────────────────────────────
function slotPropsFor(entry: ItemEntry): CoarDataListItemSlotProps<T> {
  return {
    item: entry.item,
    index: entry.index,
    itemKey: entry.itemKey,
    selected: list.isSelected(entry.itemKey),
    focused: focusedKey.value === entry.itemKey,
    select: () => list.select(entry.itemKey, 'replace'),
    toggle: () => list.select(entry.itemKey, 'toggle'),
  };
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
    case 'ArrowRight':
      if (cfg.value.layout !== 'grid') return;
      event.preventDefault();
      moveFocus(current + 1, event);
      return;
    case 'ArrowLeft':
      if (cfg.value.layout !== 'grid') return;
      event.preventDefault();
      moveFocus(current <= 0 ? 0 : current - 1, event);
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
const gapStyle = computed(() => {
  const gap = cfg.value.gap;
  if (gap === undefined || gap === '') return undefined;
  return { '--coar-data-list-gap': typeof gap === 'number' ? `${gap}px` : gap };
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
      },
    ]"
    :style="gapStyle"
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
              :class="{
                'coar-data-list__item--selected': list.isSelected(entry.itemKey),
                'coar-data-list__item--focused': focusedKey === entry.itemKey,
              }"
              :role="cfg.selection === 'none' ? 'listitem' : 'option'"
              :aria-selected="cfg.selection === 'none' ? undefined : list.isSelected(entry.itemKey) ? 'true' : 'false'"
              @mousedown="onItemMouseDown"
              @click="onItemClick(entry, $event)"
              @dblclick="onItemDoubleClick(entry, $event)"
              @contextmenu="onItemContextMenu(entry, $event)"
            >
              <slot name="item" v-bind="slotPropsFor(entry)">
                {{ String(entry.itemKey) }}
              </slot>
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
  box-sizing: border-box;
  padding: var(--coar-data-list-item-pad-y) var(--coar-data-list-item-pad-x);
  border-radius: var(--coar-radius-xs);
  min-width: 0;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
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
