<script setup lang="ts" generic="T">
import { computed, ref, useTemplateRef, watch, nextTick } from 'vue';
import { CoarIcon } from '../icon';
import { CoarTextInput } from '../text-input';
import type {
  CoarListboxOption,
  CoarListboxSide,
  CoarListboxItemComponents,
  CoarListboxItemApi,
  CoarListboxSortGroups,
  CoarListboxSortOptions,
  CoarListboxSearchField,
} from './types';
import { useVirtualList } from '../../composables/useVirtualList';
import { useDragDrop } from '../../composables/useDragDrop';

export interface CoarListboxProps<T = unknown> {
  /** Items to render. */
  options?: CoarListboxOption<T>[];

  /** Fixed height for the scrollable list region (e.g. "320px"). When omitted, the list fills its parent (flex: 1). */
  height?: string;

  /** Label displayed in the header. */
  label?: string;
  /** Shows the count badge in the header. */
  showCount?: boolean;
  /** Forces header visibility. Default: shown when `label` is set or when the `header` slot is used. */
  showHeader?: boolean;

  /** Disables click highlighting & keyboard interaction — the list becomes a pure display. */
  displayOnly?: boolean;
  /** Dims interactions. */
  disabled?: boolean;
  /** Prevents highlight changes while keeping normal appearance. */
  readonly?: boolean;

  /** Enables the search input above the list. Default: false. */
  searchable?: boolean;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Fields considered by the default search. Default: ['label']. Ignored when `searchBy` or `filterWith` is set. */
  searchFields?: CoarListboxSearchField[];
  /** Returns the searchable string for an item. Overrides `searchFields`. */
  searchBy?: (item: CoarListboxOption<T>) => string;
  /** Full control over matching. Overrides `searchBy` and `searchFields`. `query` is the raw input value. */
  filterWith?: (item: CoarListboxOption<T>, query: string) => boolean;

  /** Group order. Default: 'asc'. */
  sortGroups?: CoarListboxSortGroups;
  /** Item order within group/list. Default: 'none' (input order). */
  sortOptions?: CoarListboxSortOptions<T>;
  /** Hides group headings even when items carry a `group`. */
  hideGroupHeadings?: boolean;

  /** Maps `item.kind` to a renderer component. Receives props: `item`, `highlighted`, `selectable`, `side`. */
  itemComponents?: CoarListboxItemComponents;
  /** Customises how an item's `kind` is derived. Default: `item.kind ?? ''`. */
  kindBy?: (item: CoarListboxOption<T>) => string;

  /** Equality for values; used by model sync. Default: `===`. */
  compareWith?: (a: T, b: T) => boolean;

  /** Text shown when the list is empty. */
  emptyText?: string;

  /**
   * Enables virtual scrolling — only the items in (and around) the viewport are rendered.
   * Needed for very large lists (thousands of rows). Group headings scroll naturally in this
   * mode (they are not sticky).
   */
  virtual?: boolean;
  /** Row height in pixels when `virtual` is on. Default: 32. */
  itemHeight?: number;
  /** Group-heading height in pixels when `virtual` is on. Default: 28. */
  groupHeadingHeight?: number;
  /** Rows rendered above/below the viewport as a scroll buffer when `virtual` is on. Default: 5. */
  overscan?: number;

  /** Makes items draggable — dragging them out can feed a droppable list with the same `dragGroup`. */
  draggable?: boolean;
  /** Accepts drops from draggable listboxes sharing the same `dragGroup`. */
  droppable?: boolean;
  /**
   * Shared name linking compatible lists. Items can only cross between listboxes with
   * the same `dragGroup`. A list without a group still accepts/emits self-drops.
   */
  dragGroup?: string;
  /**
   * Stable identifier for this list. Combined with `dragAccept` on other lists, it
   * expresses directional flow (e.g. box1 → box2 → box3 but not back). Auto-generated
   * per instance if not set.
   */
  dragId?: string;
  /**
   * Whitelist of source `dragId`s this list accepts items from. When set, items are
   * only dropped here if the source's `dragId` is listed. Unset = accept from any
   * list in the same `dragGroup` (the default broad matching).
   */
  dragAccept?: string[];
  /**
   * Per-item source permission. Return `false` to prevent an item from being dragged.
   * When the user tries to drag multiple highlighted items, the dragged payload is
   * filtered to only include items that pass this check.
   */
  canDrag?: (item: CoarListboxOption<T>) => boolean;
  /**
   * Runtime target validation. Called on `dragover` and `drop` with the proposed payload.
   * Return `false` to refuse the drop — the cursor shows "not allowed" and nothing happens.
   */
  canDrop?: (payload: {
    items: readonly CoarListboxOption<T>[];
    fromId: string | null;
    fromGroup: string | null;
    fromSelf: boolean;
  }) => boolean;

  /** Internal: passed by CoarDualListbox so slots/components can render differently per column. */
  side?: CoarListboxSide;
}

const props = withDefaults(defineProps<CoarListboxProps<T>>(), {
  options: () => [],
  height: undefined,
  label: '',
  showCount: false,
  showHeader: undefined,
  displayOnly: false,
  disabled: false,
  readonly: false,
  searchable: false,
  searchPlaceholder: 'Search…',
  searchFields: () => ['label'],
  searchBy: undefined,
  filterWith: undefined,
  sortGroups: 'asc',
  sortOptions: 'none',
  hideGroupHeadings: false,
  itemComponents: () => ({}),
  kindBy: undefined,
  compareWith: undefined,
  emptyText: 'No items',
  virtual: false,
  itemHeight: 32,
  groupHeadingHeight: 28,
  overscan: 5,
  draggable: false,
  droppable: false,
  dragGroup: undefined,
  dragId: undefined,
  dragAccept: undefined,
  canDrag: undefined,
  canDrop: undefined,
  side: undefined,
});

const model = defineModel<T[]>({ default: () => [] });

const emit = defineEmits<{
  'item-click': [payload: { item: CoarListboxOption<T>; event: MouseEvent }];
  'item-dblclick': [payload: { item: CoarListboxOption<T>; event: MouseEvent }];
  'item-activate': [payload: { item: CoarListboxOption<T> }];
  'item-remove': [payload: { item: CoarListboxOption<T> }];
  'item-action': [payload: { item: CoarListboxOption<T>; name: string; payload?: unknown }];
  'drag-start': [payload: { items: readonly CoarListboxOption<T>[] }];
  'drag-end': [payload: { items: readonly CoarListboxOption<T>[]; dropped: boolean }];
  'items-add': [
    payload: {
      items: readonly CoarListboxOption<T>[];
      insertIndex: number | null;
      fromGroup: string | null;
      fromSelf: boolean;
    },
  ];
  'items-remove': [
    payload: { items: readonly CoarListboxOption<T>[]; toGroup: string | null },
  ];
}>();

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const listRef = useTemplateRef<HTMLElement>('listRef');

// Virtualizer — only attached when `virtual` is on. The returned refs are always
// safe to read (they hold empty/zero values until the scroll element mounts).
const virtualizer = useVirtualList({
  count: () => (props.virtual ? flatEntries.value.length : 0),
  // Per-index sizer, wrapped in a getter so `useVirtualList` receives the
  // FUNCTION (its size-getter is invoked with no args) and applies it per index.
  // A bare function was instead read ONCE with index=undefined, collapsing every
  // row — group headings included — to `itemHeight` and ignoring `groupHeadingHeight`.
  itemSize: () => (index: number) => {
    const entry = flatEntries.value[index];
    if (!entry) return props.itemHeight;
    return entry.kind === 'heading' ? props.groupHeadingHeight : props.itemHeight;
  },
  overscan: () => props.overscan,
  scrollElement: listRef,
});

/** Virtual rows joined with their resolved flat entry — keeps the template typed + concise. */
const virtualEntries = computed(() => {
  if (!props.virtual) return [] as { row: typeof virtualizer.virtualRows.value[number]; entry: FlatEntry }[];
  const flat = flatEntries.value;
  const rows = virtualizer.virtualRows.value;
  const out: { row: typeof rows[number]; entry: FlatEntry }[] = [];
  for (const row of rows) {
    const entry = flat[row.index];
    if (entry) out.push({ row, entry });
  }
  return out;
});
const searchQuery = ref('');
const anchor = ref<T | null>(null);
const focusedValue = ref<T | null>(null);

const compare = computed(() => props.compareWith ?? ((a: T, b: T) => a === b));
const kindOf = computed(() => props.kindBy ?? ((i: CoarListboxOption<T>) => i.kind ?? ''));

const showHeaderResolved = computed(() => {
  if (props.showHeader !== undefined) return props.showHeader;
  return !!props.label || props.showCount;
});

const listStyle = computed(() => (props.height ? { height: props.height } : undefined));

// ── Search ───────────────────────────────────────────────────────────
function buildSearchText(item: CoarListboxOption<T>): string {
  if (props.searchBy) return props.searchBy(item);
  if (item.searchText !== undefined) return item.searchText;
  const parts: string[] = [];
  for (const f of props.searchFields) {
    const v = item[f];
    if (typeof v === 'string' && v) parts.push(v);
  }
  return parts.join(' ');
}

function matchesSearch(item: CoarListboxOption<T>, q: string): boolean {
  if (!q) return true;
  if (props.filterWith) return props.filterWith(item, q);
  const needle = q.toLowerCase();
  return buildSearchText(item).toLowerCase().includes(needle);
}

// ── Visible list (filter + sort) ─────────────────────────────────────
const visibleItems = computed<CoarListboxOption<T>[]>(() => {
  const q = searchQuery.value.trim();
  const filtered = q ? props.options.filter((o) => matchesSearch(o, q)) : props.options.slice();

  const sortOpt = props.sortOptions;
  const optionCmp: ((a: CoarListboxOption<T>, b: CoarListboxOption<T>) => number) | null =
    typeof sortOpt === 'function'
      ? sortOpt
      : sortOpt === 'asc'
        ? (a, b) => a.label.localeCompare(b.label)
        : sortOpt === 'desc'
          ? (a, b) => b.label.localeCompare(a.label)
          : null;

  const hasGroups = filtered.some((o) => !!o.group);
  if (!hasGroups) {
    return optionCmp ? [...filtered].sort(optionCmp) : filtered;
  }

  const sortGrp = props.sortGroups;
  const groupCmp: ((a: string, b: string) => number) | null =
    typeof sortGrp === 'function'
      ? sortGrp
      : sortGrp === 'asc'
        ? (a, b) => a.localeCompare(b)
        : sortGrp === 'desc'
          ? (a, b) => b.localeCompare(a)
          : null;

  return [...filtered].sort((a, b) => {
    const ga = a.group ?? '';
    const gb = b.group ?? '';
    if (ga !== gb && groupCmp) return groupCmp(ga, gb);
    if (ga !== gb) return 0;
    return optionCmp ? optionCmp(a, b) : 0;
  });
});

interface Chunk {
  group: string | null;
  items: CoarListboxOption<T>[];
}
const chunks = computed<Chunk[]>(() => {
  const out: Chunk[] = [];
  for (const item of visibleItems.value) {
    const key = item.group ?? null;
    const last = out[out.length - 1];
    if (last && last.group === key) last.items.push(item);
    else out.push({ group: key, items: [item] });
  }
  return out;
});

/** Flat sequence of group headings + items used by the virtualizer. */
type FlatEntry =
  | { kind: 'heading'; group: string; items: CoarListboxOption<T>[] }
  | { kind: 'item'; item: CoarListboxOption<T> };

const flatEntries = computed<FlatEntry[]>(() => {
  const out: FlatEntry[] = [];
  for (const chunk of chunks.value) {
    if (chunk.group && !props.hideGroupHeadings) {
      out.push({ kind: 'heading', group: chunk.group, items: chunk.items });
    }
    for (const item of chunk.items) out.push({ kind: 'item', item });
  }
  return out;
});

// ── Highlight helpers ────────────────────────────────────────────────
function isHighlighted(item: CoarListboxOption<T>): boolean {
  return model.value.some((v) => compare.value(v, item.value));
}

function setHighlight(values: T[]) {
  if (props.disabled || props.readonly) return;
  model.value = values;
}

function canInteract(item: CoarListboxOption<T>): boolean {
  return !props.displayOnly && !props.disabled && !props.readonly && !item.disabled;
}

// ── Click handling (Ctrl/Shift multi-select) ─────────────────────────
function handleItemClick(item: CoarListboxOption<T>, event: MouseEvent) {
  emit('item-click', { item, event });
  if (!canInteract(item)) return;
  focusedValue.value = item.value;

  const visibleValues = visibleItems.value.map((i) => i.value);

  if (event.shiftKey && anchor.value !== null) {
    const a = visibleValues.findIndex((v) => compare.value(v, anchor.value as T));
    const b = visibleValues.findIndex((v) => compare.value(v, item.value));
    if (a >= 0 && b >= 0) {
      const [from, to] = a < b ? [a, b] : [b, a];
      setHighlight(visibleValues.slice(from, to + 1));
      return;
    }
  }

  if (event.ctrlKey || event.metaKey) {
    const exists = isHighlighted(item);
    const next = exists
      ? model.value.filter((v) => !compare.value(v, item.value))
      : [...model.value, item.value];
    setHighlight(next);
    anchor.value = item.value;
    return;
  }

  setHighlight([item.value]);
  anchor.value = item.value;
}

function handleItemDoubleClick(item: CoarListboxOption<T>, event: MouseEvent) {
  emit('item-dblclick', { item, event });
  if (!canInteract(item)) return;
  emit('item-activate', { item });
}

// ── Keyboard navigation ──────────────────────────────────────────────
function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled || props.readonly || props.displayOnly) return;
  const items = visibleItems.value;
  if (items.length === 0) return;

  const currentIdx = focusedValue.value === null
    ? -1
    : items.findIndex((i) => compare.value(i.value, focusedValue.value as T));

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const next = Math.min(items.length - 1, currentIdx + 1);
    const item = items[next];
    focusedValue.value = item.value;
    if (event.shiftKey && anchor.value !== null) applyShiftRange(item);
    else if (!event.ctrlKey && !event.metaKey) { setHighlight([item.value]); anchor.value = item.value; }
    scrollToFocused();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const next = currentIdx <= 0 ? 0 : currentIdx - 1;
    const item = items[next];
    focusedValue.value = item.value;
    if (event.shiftKey && anchor.value !== null) applyShiftRange(item);
    else if (!event.ctrlKey && !event.metaKey) { setHighlight([item.value]); anchor.value = item.value; }
    scrollToFocused();
  } else if (event.key === 'Home') {
    event.preventDefault();
    const item = items[0];
    focusedValue.value = item.value;
    setHighlight([item.value]);
    anchor.value = item.value;
    scrollToFocused();
  } else if (event.key === 'End') {
    event.preventDefault();
    const item = items[items.length - 1];
    focusedValue.value = item.value;
    setHighlight([item.value]);
    anchor.value = item.value;
    scrollToFocused();
  } else if (event.key === ' ') {
    event.preventDefault();
    if (currentIdx >= 0) {
      const item = items[currentIdx];
      if (!item.disabled) {
        const exists = isHighlighted(item);
        const next = exists
          ? model.value.filter((v) => !compare.value(v, item.value))
          : [...model.value, item.value];
        setHighlight(next);
        anchor.value = item.value;
      }
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (currentIdx >= 0) {
      const item = items[currentIdx];
      if (!item.disabled) emit('item-activate', { item });
    }
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault();
    setHighlight(items.filter((i) => !i.disabled).map((i) => i.value));
  }
}

function applyShiftRange(to: CoarListboxOption<T>) {
  const items = visibleItems.value;
  const a = items.findIndex((i) => compare.value(i.value, anchor.value as T));
  const b = items.findIndex((i) => compare.value(i.value, to.value));
  if (a < 0 || b < 0) return;
  const [from, end] = a < b ? [a, b] : [b, a];
  setHighlight(items.slice(from, end + 1).map((i) => i.value));
}

function scrollToFocused() {
  if (props.virtual) {
    const focused = focusedValue.value;
    if (focused === null) return;
    const idx = flatEntries.value.findIndex(
      (e) => e.kind === 'item' && compare.value(e.item.value, focused as T),
    );
    if (idx >= 0) virtualizer.scrollToIndex(idx, 'auto');
    return;
  }
  nextTick(() => {
    const el = listRef.value?.querySelector<HTMLElement>('.coar-listbox-item--focused');
    el?.scrollIntoView({ block: 'nearest' });
  });
}

// Clear anchor if it's no longer in the options
watch(
  () => props.options,
  (opts) => {
    if (anchor.value !== null && !opts.some((o) => compare.value(o.value, anchor.value as T))) {
      anchor.value = null;
    }
    if (focusedValue.value !== null && !opts.some((o) => compare.value(o.value, focusedValue.value as T))) {
      focusedValue.value = null;
    }
  },
);

// ── Per-item imperative API (for custom renderers) ───────────────────
function apiFor(item: CoarListboxOption<T>): CoarListboxItemApi<T> {
  return {
    item,
    highlighted: isHighlighted(item),
    highlight: () => setHighlight([item.value]),
    unhighlight: () => {
      setHighlight(model.value.filter((v) => !compare.value(v, item.value)));
    },
    toggleHighlight: () => {
      const next = isHighlighted(item)
        ? model.value.filter((v) => !compare.value(v, item.value))
        : [...model.value, item.value];
      setHighlight(next);
    },
    activate: () => emit('item-activate', { item }),
    remove: () => emit('item-remove', { item }),
    action: (name: string, payload?: unknown) => emit('item-action', { item, name, payload }),
  };
}

// ── Drag & drop (delegated to useDragDrop) ───────────────────────────
/** Whether this item may be dragged out of the list (source-side permission). */
function canDragItem(item: CoarListboxOption<T>): boolean {
  if (!props.draggable) return false;
  if (!canInteract(item)) return false;
  return props.canDrag ? props.canDrag(item) : true;
}

const dnd = useDragDrop<CoarListboxOption<T>>({
  dragId: () => props.dragId,
  dragGroup: () => props.dragGroup,
  dragAccept: () => props.dragAccept,
  canDrop: props.canDrop
    ? (p) => props.canDrop!(p)
    : undefined,
  onDragStart: (items) => emit('drag-start', { items }),
  onDragEnd: ({ items, dropped }) => emit('drag-end', { items, dropped }),
  onDropAccept: ({ items, insertIndex, fromGroup, fromSelf }) =>
    emit('items-add', { items, insertIndex, fromGroup, fromSelf }),
  onItemsRemove: ({ items, toGroup }) => emit('items-remove', { items, toGroup }),
});
const isDragOver = dnd.isDragOver;

function onItemDragStart(event: DragEvent, item: CoarListboxOption<T>) {
  if (!canDragItem(item)) return;
  // If the dragged item is in the highlight set, drag all highlighted items that
  // pass `canDrag`; otherwise drag just the one under the cursor.
  const dragging: CoarListboxOption<T>[] = isHighlighted(item)
    ? visibleItems.value.filter((i) => isHighlighted(i) && canDragItem(i))
    : [item];
  if (dragging.length === 0) return;
  if (dnd.startDrag(event, dragging)) {
    // Add a human-readable fallback for cross-app drops (Finder/Explorer/etc).
    event.dataTransfer?.setData(
      'text/plain',
      dragging.map((i) => i.label).join(', '),
    );
  }
}

function onItemDragEnd() { dnd.endDrag(); }
function onListDragOver(event: DragEvent) {
  if (!props.droppable) return;
  dnd.onDragOver(event);
}
function onListDragLeave(event: DragEvent) { dnd.onDragLeave(event); }
function onListDrop(event: DragEvent, targetItem?: CoarListboxOption<T>) {
  if (!props.droppable) return;
  const insertIndex = targetItem
    ? visibleItems.value.findIndex((i) => compare.value(i.value, targetItem.value))
    : null;
  dnd.onDrop(event, { insertIndex });
}

// ── Exposed imperative API ───────────────────────────────────────────
function clearHighlight() { model.value = []; }
function highlightAll() {
  setHighlight(visibleItems.value.filter((i) => !i.disabled).map((i) => i.value));
}
function focus() { listRef.value?.focus(); }
function clearSearch() { searchQuery.value = ''; }

defineExpose({
  clearHighlight,
  highlightAll,
  focus,
  clearSearch,
  visibleItems,
});

const hostClasses = computed(() => [
  'coar-listbox',
  {
    'coar-listbox--disabled': props.disabled,
    'coar-listbox--readonly': props.readonly,
    'coar-listbox--display-only': props.displayOnly,
    'coar-listbox--drag-over': isDragOver.value,
  },
]);
</script>

<template>
  <div ref="hostRef" :class="hostClasses">
    <div v-if="showHeaderResolved || $slots.header" class="coar-listbox-header">
      <slot name="header" :label="label" :count="visibleItems.length" :total="options.length">
        <span v-if="label" class="coar-listbox-title">{{ label }}</span>
        <span v-if="showCount" class="coar-listbox-count">{{ visibleItems.length }}</span>
      </slot>
    </div>

    <div v-if="searchable || $slots.search" class="coar-listbox-search">
      <slot name="search" :query="searchQuery" :update="(v: string) => (searchQuery = v)">
        <CoarTextInput
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          clearable
          size="s"
          :disabled="disabled"
        />
      </slot>
    </div>

    <div
      ref="listRef"
      class="coar-listbox-list"
      :class="{ 'coar-listbox-list--virtual': virtual }"
      :style="listStyle"
      :tabindex="displayOnly || disabled ? -1 : 0"
      :role="displayOnly ? 'list' : 'listbox'"
      :aria-multiselectable="displayOnly ? undefined : 'true'"
      :aria-disabled="disabled ? 'true' : undefined"
      @keydown="handleKeyDown"
      @dragover="droppable ? onListDragOver($event) : undefined"
      @dragleave="droppable ? onListDragLeave($event) : undefined"
      @drop="droppable ? onListDrop($event) : undefined"
    >
      <!-- Virtual mode: absolutely-position only the visible window + overscan. -->
      <template v-if="virtual && flatEntries.length > 0">
        <div
          class="coar-listbox-virtual-spacer"
          :style="{ height: virtualizer.totalSize.value + 'px', position: 'relative' }"
        >
          <template v-for="{ row, entry } in virtualEntries" :key="entry.kind === 'heading' ? 'h:' + entry.group : 'i:' + String(entry.item.value)">
            <div
              v-if="entry.kind === 'heading'"
              class="coar-listbox-group-heading coar-listbox-group-heading--virtual"
              :style="{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${row.start}px)`, height: row.size + 'px' }"
            >
              <slot name="group-heading" :group="entry.group" :items="entry.items">
                {{ entry.group }}
              </slot>
            </div>
            <div
              v-else
              class="coar-listbox-item"
              :class="{
                'coar-listbox-item--highlighted': isHighlighted(entry.item),
                'coar-listbox-item--focused': focusedValue !== null && compare(focusedValue as T, entry.item.value),
                'coar-listbox-item--disabled': !!entry.item.disabled,
                'coar-listbox-item--rich': !!entry.item.subtitle || !!entry.item.icon,
              }"
              :style="{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${row.start}px)`, height: row.size + 'px' }"
              :title="entry.item.tooltip"
              :role="displayOnly ? 'listitem' : 'option'"
              :aria-selected="displayOnly ? undefined : isHighlighted(entry.item) ? 'true' : 'false'"
              :aria-disabled="entry.item.disabled ? 'true' : undefined"
              :draggable="canDragItem(entry.item) ? true : undefined"
              @click="handleItemClick(entry.item, $event)"
              @dblclick="handleItemDoubleClick(entry.item, $event)"
              @dragstart="draggable ? onItemDragStart($event, entry.item) : undefined"
              @dragend="draggable ? onItemDragEnd() : undefined"
              @drop.stop="droppable ? onListDrop($event, entry.item) : undefined"
            >
              <component
                :is="itemComponents[kindOf(entry.item)]"
                v-if="kindOf(entry.item) && itemComponents[kindOf(entry.item)]"
                :item="entry.item"
                :highlighted="isHighlighted(entry.item)"
                :selectable="canInteract(entry.item)"
                :side="side"
                :api="apiFor(entry.item)"
              />
              <slot
                v-else-if="kindOf(entry.item) && $slots[`item-${kindOf(entry.item)}`]"
                :name="`item-${kindOf(entry.item)}`"
                :item="entry.item"
                :highlighted="isHighlighted(entry.item)"
                :selectable="canInteract(entry.item)"
                :side="side"
                :api="apiFor(entry.item)"
              />
              <slot
                v-else-if="$slots.item"
                name="item"
                :item="entry.item"
                :highlighted="isHighlighted(entry.item)"
                :selectable="canInteract(entry.item)"
                :side="side"
                :api="apiFor(entry.item)"
              />
              <template v-else>
                <CoarIcon v-if="entry.item.icon" :name="entry.item.icon" size="l" class="coar-listbox-item-icon" />
                <div class="coar-listbox-item-text">
                  <div class="coar-listbox-item-label">{{ entry.item.label }}</div>
                  <div v-if="entry.item.subtitle" class="coar-listbox-item-subtitle">{{ entry.item.subtitle }}</div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </template>

      <!-- Non-virtual mode: render the whole chunked list with sticky group headings. -->
      <template v-else-if="!virtual && chunks.length > 0">
        <div v-for="(chunk, ci) in chunks" :key="ci" class="coar-listbox-group">
          <div
            v-if="chunk.group && !hideGroupHeadings"
            class="coar-listbox-group-heading"
          >
            <slot name="group-heading" :group="chunk.group" :items="chunk.items">
              {{ chunk.group }}
            </slot>
          </div>
          <div
            v-for="item in chunk.items"
            :key="String(item.value)"
            class="coar-listbox-item"
            :class="{
              'coar-listbox-item--highlighted': isHighlighted(item),
              'coar-listbox-item--focused': focusedValue !== null && compare(focusedValue as T, item.value),
              'coar-listbox-item--disabled': !!item.disabled,
              'coar-listbox-item--rich': !!item.subtitle || !!item.icon,
            }"
            :title="item.tooltip"
            :role="displayOnly ? 'listitem' : 'option'"
            :aria-selected="displayOnly ? undefined : isHighlighted(item) ? 'true' : 'false'"
            :aria-disabled="item.disabled ? 'true' : undefined"
            :draggable="canDragItem(item) ? true : undefined"
            @click="handleItemClick(item, $event)"
            @dblclick="handleItemDoubleClick(item, $event)"
            @dragstart="draggable ? onItemDragStart($event, item) : undefined"
            @dragend="draggable ? onItemDragEnd() : undefined"
            @drop.stop="droppable ? onListDrop($event, item) : undefined"
          >
            <component
              :is="itemComponents[kindOf(item)]"
              v-if="kindOf(item) && itemComponents[kindOf(item)]"
              :item="item"
              :highlighted="isHighlighted(item)"
              :selectable="canInteract(item)"
              :side="side"
              :api="apiFor(item)"
            />
            <slot
              v-else-if="kindOf(item) && $slots[`item-${kindOf(item)}`]"
              :name="`item-${kindOf(item)}`"
              :item="item"
              :highlighted="isHighlighted(item)"
              :selectable="canInteract(item)"
              :side="side"
              :api="apiFor(item)"
            />
            <slot
              v-else-if="$slots.item"
              name="item"
              :item="item"
              :highlighted="isHighlighted(item)"
              :selectable="canInteract(item)"
              :side="side"
              :api="apiFor(item)"
            />
            <template v-else>
              <CoarIcon v-if="item.icon" :name="item.icon" size="l" class="coar-listbox-item-icon" />
              <div class="coar-listbox-item-text">
                <div class="coar-listbox-item-label">{{ item.label }}</div>
                <div v-if="item.subtitle" class="coar-listbox-item-subtitle">{{ item.subtitle }}</div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <div v-else class="coar-listbox-empty">
        <slot name="empty">{{ emptyText }}</slot>
      </div>
    </div>

    <div v-if="$slots.footer" class="coar-listbox-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style>
.coar-listbox {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  min-width: 0;
  min-height: 0;
  /* Fill the available space: flex:1 claims space in a flex parent; height:100% covers
     block parents with a definite height. The list inside clips with min-height:0. */
  flex: 1 1 auto;
  height: 100%;
}

.coar-listbox--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.coar-listbox--disabled .coar-listbox-list {
  background: var(--coar-surface-input-disabled);
}

.coar-listbox-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--coar-spacing-xs);
}

.coar-listbox-title {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-font-weight-semibold);
  color: var(--coar-text-neutral-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.coar-listbox-count {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-font-weight-medium);
  color: var(--coar-text-neutral-tertiary);
}

.coar-listbox-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--coar-surface-input);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  padding: var(--coar-spacing-xxs);
  user-select: none;
  outline: none;
}

.coar-listbox-list:focus-visible {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-listbox--drag-over .coar-listbox-list {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
  background: var(--coar-background-accent-subtle, var(--coar-background-neutral-tertiary));
}

.coar-listbox-item[draggable='true'] {
  cursor: grab;
}

.coar-listbox-item[draggable='true']:active {
  cursor: grabbing;
}

.coar-listbox-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 40px;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-tertiary);
  font-style: italic;
}

.coar-listbox-group + .coar-listbox-group {
  margin-top: var(--coar-spacing-xs);
}

.coar-listbox-group-heading {
  position: sticky;
  top: calc(-1 * var(--coar-spacing-xxs));
  z-index: 1;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s) var(--coar-spacing-xxs);
  background: var(--coar-surface-input);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-font-weight-semibold);
  color: var(--coar-text-neutral-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.coar-listbox-item {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  padding: var(--coar-spacing-xxs) var(--coar-spacing-s);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  border-radius: var(--coar-radius-xs);
  cursor: pointer;
  min-width: 0;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-listbox-item--rich {
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  gap: var(--coar-spacing-s);
}

.coar-listbox-item:hover:not(.coar-listbox-item--disabled) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-listbox-item--highlighted {
  background: var(--coar-background-accent-secondary);
  color: var(--coar-text-accent-primary);
}

.coar-listbox-item--highlighted:hover:not(.coar-listbox-item--disabled) {
  background: var(--coar-background-accent-secondary);
}

.coar-listbox-item--focused {
  outline: 1px solid var(--coar-focus-color);
  outline-offset: -1px;
}

.coar-listbox-item--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

.coar-listbox--display-only .coar-listbox-item,
.coar-listbox--readonly .coar-listbox-item {
  cursor: default;
}

.coar-listbox--display-only .coar-listbox-item:hover {
  background: transparent;
}

.coar-listbox-item-icon {
  flex-shrink: 0;
  color: var(--coar-icon-neutral-secondary);
}

.coar-listbox-item--highlighted .coar-listbox-item-icon {
  color: var(--coar-icon-accent-primary);
}

.coar-listbox-item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.coar-listbox-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-listbox-item-subtitle {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-listbox-item--highlighted .coar-listbox-item-subtitle {
  color: var(--coar-text-accent-primary);
  opacity: 0.8;
}

@media (prefers-reduced-motion: reduce) {
  .coar-listbox-item { transition: none; }
}

/* Virtual mode: absolutely positioned rows — remove any default margins and
   give headings a flat (non-sticky) style. */
.coar-listbox-list--virtual .coar-listbox-item,
.coar-listbox-list--virtual .coar-listbox-group-heading {
  margin: 0;
}
.coar-listbox-group-heading--virtual {
  position: absolute;
  /* Override the sticky positioning from the base rule — virtual headings flow with scroll. */
  top: 0;
  display: flex;
  align-items: flex-end;
  padding-top: 0;
  padding-bottom: var(--coar-spacing-xxs);
}
</style>
