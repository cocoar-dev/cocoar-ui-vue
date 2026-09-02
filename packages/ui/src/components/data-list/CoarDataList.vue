<script setup lang="ts" generic="T">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { useVirtualList } from '../../composables/useVirtualList';
import { useDataList } from './useDataList';
import { useSearchHighlight } from './internal/useSearchHighlight';
import CoarDataListToolbar from './CoarDataListToolbar.vue';
import type {
  CoarDataListDensity,
  CoarDataListEntry,
  CoarDataListGroupSlotProps,
  CoarDataListItemEvent,
  CoarDataListItemSlotProps,
  CoarDataListKey,
  CoarDataListSearchBy,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortGroups,
  CoarDataListSortOption,
} from './types';

export interface CoarDataListProps<T = unknown> {
  /** Records to display. */
  items?: readonly T[];
  /** Stable identity of a record. Required. */
  itemKey: (item: T) => CoarDataListKey;

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

  /** Row padding. Default `'m'`. */
  density?: CoarDataListDensity;
  /** Draws a divider between rows. */
  dividers?: boolean;
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
  items: () => [],
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
  density: 'm',
  dividers: false,
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

const search = defineModel<string>('search', { default: '' });
const sort = defineModel<CoarDataListSort | null>('sort', { default: null });
const selected = defineModel<CoarDataListKey[]>('selected', { default: () => [] });

const { t, language } = useI18n();

const list = useDataList<T>({
  items: () => props.items,
  itemKey: (item) => props.itemKey(item),
  search,
  searchBy: computed(() => props.searchBy),
  filter: computed(() => props.filter),
  sort,
  sortOptions: () => props.sortOptions,
  groupBy: computed(() => props.groupBy),
  sortGroups: computed(() => props.sortGroups),
  locale: language,
  selectionMode: () => props.selection,
  selected,
});

// ── Virtualisation ───────────────────────────────────────────────────
const scrollRef = useTemplateRef<HTMLElement>('scrollRef');
const entries = list.entries;

const virtualizer = useVirtualList({
  count: () => entries.value.length,
  itemSize: () => props.itemSize,
  overscan: () => props.overscan,
  scrollElement: scrollRef,
  measure: true,
  itemKey: (index) => entries.value[index]?.key ?? index,
});

const virtualEntries = computed(() =>
  virtualizer.virtualRows.value.flatMap((row) => {
    const entry = entries.value[row.index];
    return entry ? [{ row, entry }] : [];
  }),
);

useSearchHighlight({
  root: scrollRef,
  query: search,
  enabled: () => props.searchHighlight,
  triggers: [virtualizer.virtualRows],
});

// ── Focus & selection ────────────────────────────────────────────────
const focusedKey = ref<CoarDataListKey | null>(null);
const interactive = computed(() => !props.disabled);
const selectable = computed(() => interactive.value && props.selection !== 'none');

function itemEvent(entry: Extract<CoarDataListEntry<T>, { kind: 'item' }>, event: MouseEvent | KeyboardEvent): CoarDataListItemEvent<T> {
  return { item: entry.item, itemKey: entry.itemKey, index: entry.index, event };
}

function selectWithModifiers(key: CoarDataListKey, event: MouseEvent | KeyboardEvent) {
  if (!selectable.value) return;
  if (event.shiftKey && props.selection === 'multiple') list.select(key, 'range');
  else if ((event.ctrlKey || event.metaKey) && props.selection === 'multiple') list.select(key, 'toggle');
  else list.select(key, 'replace');
}

// Shift-click extends the browser's text selection as well as ours; suppress the former.
function onItemMouseDown(event: MouseEvent) {
  if (event.shiftKey && selectable.value) event.preventDefault();
}

function onItemClick(entry: Extract<CoarDataListEntry<T>, { kind: 'item' }>, event: MouseEvent) {
  if (!interactive.value) return;
  focusedKey.value = entry.itemKey;
  selectWithModifiers(entry.itemKey, event);
  emit('item-click', itemEvent(entry, event));
}

function onItemDoubleClick(entry: Extract<CoarDataListEntry<T>, { kind: 'item' }>, event: MouseEvent) {
  if (!interactive.value) return;
  emit('item-dblclick', itemEvent(entry, event));
  emit('item-activate', itemEvent(entry, event));
}

function onItemContextMenu(entry: Extract<CoarDataListEntry<T>, { kind: 'item' }>, event: MouseEvent) {
  if (!interactive.value) return;
  focusedKey.value = entry.itemKey;
  if (selectable.value && !list.isSelected(entry.itemKey)) list.select(entry.itemKey, 'replace');
  emit('item-contextmenu', itemEvent(entry, event));
}

function slotPropsFor(entry: Extract<CoarDataListEntry<T>, { kind: 'item' }>): CoarDataListItemSlotProps<T> {
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
  const entryIndex = list.entryIndexOfKey(key);
  if (entryIndex >= 0) virtualizer.scrollToIndex(entryIndex, align);
}

function moveFocus(toIndex: number, event: KeyboardEvent) {
  const items = list.items.value;
  if (items.length === 0) return;
  const index = Math.max(0, Math.min(items.length - 1, toIndex));
  const key = list.keyOf(items[index]);
  focusedKey.value = key;
  if (selectable.value) {
    if (event.shiftKey && props.selection === 'multiple') list.select(key, 'range');
    else if (!event.ctrlKey && !event.metaKey) list.select(key, 'replace');
  }
  scrollToKey(key);
}

function pageSize(): number {
  const viewport = scrollRef.value?.clientHeight ?? 0;
  return Math.max(1, Math.floor(viewport / Math.max(1, props.itemSize)) - 1);
}

function onKeyDown(event: KeyboardEvent) {
  if (!interactive.value) return;
  const items = list.items.value;
  if (items.length === 0) return;
  const current = focusedKey.value === null ? -1 : list.indexOfKey(focusedKey.value);

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveFocus(current + 1, event);
      return;
    case 'ArrowUp':
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
      const entryIndex = list.entryIndexOfKey(list.keyOf(items[current]));
      const entry = entries.value[entryIndex];
      if (entry?.kind === 'item') emit('item-activate', itemEvent(entry, event));
      return;
    }
    case 'a':
    case 'A':
      if ((event.ctrlKey || event.metaKey) && props.selection === 'multiple') {
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
watch(list.items, (items) => {
  if (focusedKey.value !== null && list.indexOfKey(focusedKey.value) < 0) {
    focusedKey.value = items.length > 0 ? null : null;
  }
});

// ── Presentation ─────────────────────────────────────────────────────
const showToolbar = computed(() => props.showSearch || (props.showSort && props.sortOptions.length > 0));
const emptyLabel = computed(() => props.emptyText ?? t('coar.ui.dataList.empty', undefined, 'No items'));
const viewportStyle = computed(() => (props.height ? { height: props.height, flex: 'none' } : undefined));
const role = computed(() => (props.selection === 'none' ? 'list' : 'listbox'));

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
  virtualizer.invalidateMeasurements(key === undefined ? undefined : `i:${String(key)}`);
}

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
      `coar-data-list--density-${density}`,
      {
        'coar-data-list--bordered': bordered,
        'coar-data-list--elevated': elevated,
        'coar-data-list--dividers': dividers,
        'coar-data-list--disabled': disabled,
        'coar-data-list--selectable': selectable,
      },
    ]"
  >
    <CoarDataListToolbar
      v-if="showToolbar"
      v-model:search="search"
      v-model:sort="sort"
      :show-search="showSearch"
      :show-sort="showSort"
      :search-placeholder="searchPlaceholder"
      :sort-options="sortOptions"
      :disabled="disabled"
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
      :aria-label="ariaLabel"
      :aria-multiselectable="selection === 'multiple' ? 'true' : undefined"
      :aria-disabled="disabled ? 'true' : undefined"
      @keydown="onKeyDown"
      @focus="onViewportFocus"
    >
      <div
        v-if="entries.length > 0"
        class="coar-data-list__spacer"
        :style="{ height: `${virtualizer.totalSize.value}px` }"
      >
        <div
          v-for="{ row, entry } in virtualEntries"
          :key="entry.key"
          :ref="(el) => virtualizer.measureElement(row.index, el as Element | null)"
          class="coar-data-list__row"
          :style="{ transform: `translateY(${row.start}px)` }"
        >
          <div
            v-if="entry.kind === 'group'"
            class="coar-data-list__group"
            role="presentation"
          >
            <slot name="group-header" :group="entry.group" :count="entry.count" :items="entry.items">
              <span class="coar-data-list__group-label">{{ entry.group }}</span>
              <span class="coar-data-list__group-count">{{ entry.count }}</span>
            </slot>
          </div>
          <div
            v-else
            class="coar-data-list__item"
            :class="{
              'coar-data-list__item--selected': list.isSelected(entry.itemKey),
              'coar-data-list__item--focused': focusedKey === entry.itemKey,
            }"
            :role="selection === 'none' ? 'listitem' : 'option'"
            :aria-selected="selection === 'none' ? undefined : list.isSelected(entry.itemKey) ? 'true' : 'false'"
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
      <div v-else class="coar-data-list__empty">
        <slot name="empty">{{ emptyLabel }}</slot>
      </div>
    </div>
  </div>
</template>

<style>
::highlight(coar-data-list-search) {
  background-color: var(--coar-background-warning-secondary, rgb(255 213 0 / 0.45));
  color: inherit;
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

.coar-data-list__spacer {
  position: relative;
  width: 100%;
}

.coar-data-list__row {
  position: absolute;
  inset: 0 0 auto;
  box-sizing: border-box;
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

.coar-data-list--dividers .coar-data-list__item {
  border-radius: 0;
  border-bottom: 1px solid var(--coar-border-neutral-secondary, var(--coar-border-neutral));
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
