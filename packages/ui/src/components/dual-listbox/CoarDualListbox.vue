<script setup lang="ts" generic="T">
import { computed, shallowRef, useSlots, useTemplateRef, type Slots } from 'vue';
import CoarButton from '../button/CoarButton.vue';
import CoarListbox from '../listbox/CoarListbox.vue';
import type { DragEngine } from '../../composables/useDragDrop';
import type {
  CoarListboxOption,
  CoarListboxItemComponents,
  CoarListboxSortGroups,
  CoarListboxSortOptions,
  CoarListboxSearchField,
  CoarListboxExposed,
} from '../listbox/types';

export interface CoarDualListboxProps<T = unknown> {
  /** All items. The right column shows those whose value is in `modelValue`, the left shows the rest. */
  options?: CoarListboxOption<T>[];

  /** Label for the left (available) column. */
  availableLabel?: string;
  /** Label for the right (selected) column. */
  selectedLabel?: string;

  /** Fixed height for both list regions. When omitted they fill their parent (flex:1). */
  height?: string;
  /** Disables all interactions. */
  disabled?: boolean;
  /** Prevents moves while keeping normal appearance. */
  readonly?: boolean;

  // Search — forwarded to both columns.
  /** Hides the search input in both columns. */
  hideSearch?: boolean;
  searchPlaceholder?: string;
  searchFields?: CoarListboxSearchField[];
  searchBy?: (item: CoarListboxOption<T>) => string;
  filterWith?: (item: CoarListboxOption<T>, query: string) => boolean;

  // Sort — forwarded to both columns.
  sortGroups?: CoarListboxSortGroups;
  sortOptions?: CoarListboxSortOptions<T>;
  hideGroupHeadings?: boolean;

  // Custom rendering — forwarded to both columns.
  itemComponents?: CoarListboxItemComponents;
  kindBy?: (item: CoarListboxOption<T>) => string;

  // Identity.
  compareWith?: (a: T, b: T) => boolean;

  /** Hides the "move all" (≫ / ≪) buttons. */
  hideMoveAll?: boolean;
  /** Hides the count badge in each column header. */
  hideCounts?: boolean;

  /** Text shown when a column is empty. */
  emptyAvailable?: string;
  emptySelected?: string;

  /**
   * Sort the right column in the order items appear in `options` after every move.
   * Default: keeps the order in which the user moved items across.
   */
  sortSelectedBySource?: boolean;

  /** Enables drag-and-drop between the two columns. */
  dragDrop?: boolean;
  /** Drag engine for both columns: `'native'` (default), `'pointer'` (touch-capable) or `'auto'`. */
  dragEngine?: DragEngine;

  /**
   * Enables virtual scrolling on both columns. Use for large datasets (thousands of items).
   * Group headings scroll naturally in this mode (they are not sticky).
   */
  virtual?: boolean;
  /** Row height in pixels when `virtual` is on. Default: 32. */
  itemHeight?: number;
  /** Group-heading height in pixels when `virtual` is on. Default: 28. */
  groupHeadingHeight?: number;
  /** Rows rendered above/below the viewport as a scroll buffer when `virtual` is on. Default: 5. */
  overscan?: number;

  /** Per-item source permission — applied to both columns. See CoarListbox. */
  canDrag?: (item: CoarListboxOption<T>) => boolean;
  /** Runtime drop validation — applied to both columns. See CoarListbox. */
  canDrop?: (payload: {
    items: readonly CoarListboxOption<T>[];
    fromId: string | null;
    fromGroup: string | null;
    fromSelf: boolean;
  }) => boolean;
}

const props = withDefaults(defineProps<CoarDualListboxProps<T>>(), {
  options: () => [],
  availableLabel: 'Available',
  selectedLabel: 'Selected',
  height: undefined,
  disabled: false,
  readonly: false,
  hideSearch: false,
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
  hideMoveAll: false,
  hideCounts: false,
  emptyAvailable: 'No items',
  emptySelected: 'None selected',
  sortSelectedBySource: false,
  dragDrop: false,
  dragEngine: 'native',
  virtual: false,
  itemHeight: 32,
  groupHeadingHeight: 28,
  overscan: 5,
  canDrag: undefined,
  canDrop: undefined,
});

// Auto-generated drag group unique per DualListbox instance, so its two columns
// exchange items with each other but not with unrelated listboxes elsewhere.
const dualDragGroup = `coar-dual-${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;

const model = defineModel<T[]>({ default: () => [] });

const emit = defineEmits<{
  move: [payload: { direction: 'right' | 'left'; values: T[] }];
  'item-remove': [payload: { item: CoarListboxOption<T>; side: 'available' | 'selected' }];
  'item-action': [
    payload: { item: CoarListboxOption<T>; name: string; payload?: unknown; side: 'available' | 'selected' },
  ];
}>();

const leftRef = useTemplateRef<CoarListboxExposed<T>>('leftRef');
const rightRef = useTemplateRef<CoarListboxExposed<T>>('rightRef');

const compare = computed(() => props.compareWith ?? ((a: T, b: T) => a === b));

const leftHighlight = shallowRef<T[]>([]);
const rightHighlight = shallowRef<T[]>([]);

const selectedSet = computed(() => {
  const cmp = compare.value;
  return (v: T) => model.value.some((x) => cmp(x, v));
});

const availableOptions = computed(() =>
  props.options.filter((o) => !selectedSet.value(o.value)),
);

const selectedOptions = computed(() => {
  const byValue = new Map<T, CoarListboxOption<T>>();
  for (const o of props.options) byValue.set(o.value, o);
  const cmp = compare.value;
  const out: CoarListboxOption<T>[] = [];
  for (const v of model.value) {
    const found = byValue.get(v) ?? props.options.find((o) => cmp(o.value, v));
    if (found) out.push(found);
  }
  return out;
});

const canMoveRight = computed(
  () => !props.disabled && !props.readonly && leftHighlight.value.length > 0,
);
const canMoveLeft = computed(
  () => !props.disabled && !props.readonly && rightHighlight.value.length > 0,
);
const canMoveAllRight = computed(
  () => !props.disabled && !props.readonly && (leftRef.value?.visibleItems.length ?? 0) > 0,
);
const canMoveAllLeft = computed(
  () => !props.disabled && !props.readonly && (rightRef.value?.visibleItems.length ?? 0) > 0,
);

function moveRight() {
  if (!canMoveRight.value) return;
  const toAdd = [...leftHighlight.value];
  model.value = props.sortSelectedBySource
    ? orderBySource([...model.value, ...toAdd])
    : [...model.value, ...toAdd];
  leftHighlight.value = [];
  emit('move', { direction: 'right', values: toAdd });
}

function moveLeft() {
  if (!canMoveLeft.value) return;
  const cmp = compare.value;
  const toRemove = rightHighlight.value;
  model.value = model.value.filter((v) => !toRemove.some((r) => cmp(r, v)));
  rightHighlight.value = [];
  emit('move', { direction: 'left', values: [...toRemove] });
}

function moveAllRight() {
  if (!canMoveAllRight.value) return;
  const visible = leftRef.value?.visibleItems ?? [];
  const toAdd = visible.map((i) => i.value);
  if (toAdd.length === 0) return;
  model.value = props.sortSelectedBySource
    ? orderBySource([...model.value, ...toAdd])
    : [...model.value, ...toAdd];
  leftHighlight.value = [];
  emit('move', { direction: 'right', values: toAdd });
}

function moveAllLeft() {
  if (!canMoveAllLeft.value) return;
  const cmp = compare.value;
  const visible = rightRef.value?.visibleItems ?? [];
  const toRemove = visible.map((i) => i.value);
  if (toRemove.length === 0) return;
  model.value = model.value.filter((v) => !toRemove.some((r) => cmp(r, v)));
  rightHighlight.value = [];
  emit('move', { direction: 'left', values: toRemove });
}

function orderBySource(values: T[]): T[] {
  const cmp = compare.value;
  const order = new Map<T, number>();
  props.options.forEach((o, i) => order.set(o.value, i));
  return [...values].sort((a, b) => {
    const ia = order.has(a) ? order.get(a)! : [...order.keys()].findIndex((k) => cmp(k, a));
    const ib = order.has(b) ? order.get(b)! : [...order.keys()].findIndex((k) => cmp(k, b));
    return ia - ib;
  });
}

function onLeftActivate({ item }: { item: CoarListboxOption<T> }) {
  if (props.disabled || props.readonly) return;
  model.value = props.sortSelectedBySource
    ? orderBySource([...model.value, item.value])
    : [...model.value, item.value];
  leftHighlight.value = leftHighlight.value.filter((v) => !compare.value(v, item.value));
  emit('move', { direction: 'right', values: [item.value] });
}

function onRightActivate({ item }: { item: CoarListboxOption<T> }) {
  if (props.disabled || props.readonly) return;
  const cmp = compare.value;
  model.value = model.value.filter((v) => !cmp(v, item.value));
  rightHighlight.value = rightHighlight.value.filter((v) => !cmp(v, item.value));
  emit('move', { direction: 'left', values: [item.value] });
}

// Drag-drop handlers — only wired up when `dragDrop` is enabled. The internal drag group
// (`dualDragGroup`) keeps drops scoped to this pair; items-remove on the source is a no-op
// because the other column's options are derived from modelValue — updating it filters the
// item out automatically.
function onRightDropAdd(payload: { items: readonly CoarListboxOption<T>[] }) {
  if (props.disabled || props.readonly) return;
  const toAdd = payload.items.map((i) => i.value);
  if (toAdd.length === 0) return;
  // Filter out anything already present (guard against self-drops or stale state).
  const cmp = compare.value;
  const fresh = toAdd.filter((v) => !model.value.some((x) => cmp(x, v)));
  if (fresh.length === 0) return;
  model.value = props.sortSelectedBySource
    ? orderBySource([...model.value, ...fresh])
    : [...model.value, ...fresh];
  emit('move', { direction: 'right', values: fresh });
}

function onLeftDropAdd(payload: { items: readonly CoarListboxOption<T>[] }) {
  if (props.disabled || props.readonly) return;
  const toRemove = payload.items.map((i) => i.value);
  if (toRemove.length === 0) return;
  const cmp = compare.value;
  const removed = model.value.filter((v) => toRemove.some((r) => cmp(r, v)));
  if (removed.length === 0) return;
  model.value = model.value.filter((v) => !toRemove.some((r) => cmp(r, v)));
  emit('move', { direction: 'left', values: removed });
}

defineExpose({
  moveRight,
  moveLeft,
  moveAllRight,
  moveAllLeft,
  clearHighlight() {
    leftHighlight.value = [];
    rightHighlight.value = [];
  },
});

// Slots that propagate to both inner listboxes (everything except the side-specific overrides and `actions`).
const SIDE_SPECIFIC_SLOTS = new Set([
  'header-available',
  'header-selected',
  'empty-available',
  'empty-selected',
  'actions',
]);
const slots: Slots = useSlots();
const sharedSlotNames = computed<string[]>(() =>
  Object.keys(slots).filter((n) => !SIDE_SPECIFIC_SLOTS.has(n)),
);
</script>

<template>
  <div class="coar-dual-listbox" :class="{ 'coar-dual-listbox--disabled': disabled }">
    <!-- Available column -->
    <CoarListbox
      ref="leftRef"
      v-model="leftHighlight"
      :options="availableOptions"
      :label="availableLabel"
      :show-count="!hideCounts"
      :show-header="true"
      :height="height"
      :disabled="disabled"
      :readonly="readonly"
      :searchable="!hideSearch"
      :search-placeholder="searchPlaceholder"
      :search-fields="searchFields"
      :search-by="searchBy"
      :filter-with="filterWith"
      :sort-groups="sortGroups"
      :sort-options="sortOptions"
      :hide-group-headings="hideGroupHeadings"
      :item-components="itemComponents"
      :kind-by="kindBy"
      :compare-with="compareWith"
      :empty-text="emptyAvailable"
      :draggable="dragDrop"
      :droppable="dragDrop"
      :drag-engine="dragEngine"
      :drag-group="dragDrop ? dualDragGroup : undefined"
      :can-drag="canDrag"
      :can-drop="canDrop"
      :virtual="virtual"
      :item-height="itemHeight"
      :group-heading-height="groupHeadingHeight"
      :overscan="overscan"
      side="available"
      class="coar-dual-listbox-column"
      @item-activate="onLeftActivate"
      @items-add="onLeftDropAdd"
      @item-remove="(p) => emit('item-remove', { ...p, side: 'available' })"
      @item-action="(p) => emit('item-action', { ...p, side: 'available' })"
    >
      <template v-for="name in sharedSlotNames" :key="'l-' + name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
      <template v-if="$slots['header-available']" #header="slotProps">
        <slot name="header-available" v-bind="slotProps" />
      </template>
      <template v-if="$slots['empty-available']" #empty>
        <slot name="empty-available" />
      </template>
    </CoarListbox>

    <!-- Action buttons -->
    <div class="coar-dual-listbox-actions">
      <slot
        name="actions"
        :move-right="moveRight"
        :move-left="moveLeft"
        :move-all-right="moveAllRight"
        :move-all-left="moveAllLeft"
        :can-move-right="canMoveRight"
        :can-move-left="canMoveLeft"
        :can-move-all-right="canMoveAllRight"
        :can-move-all-left="canMoveAllLeft"
      >
        <CoarButton
          v-if="!hideMoveAll"
          variant="secondary"
          size="s"
          icon-start="chevrons-right"
          aria-label="Move all to selected"
          :disabled="!canMoveAllRight"
          @click="moveAllRight"
        />
        <CoarButton
          variant="secondary"
          size="s"
          icon-start="chevron-right"
          aria-label="Move to selected"
          :disabled="!canMoveRight"
          @click="moveRight"
        />
        <CoarButton
          variant="secondary"
          size="s"
          icon-start="chevron-left"
          aria-label="Move to available"
          :disabled="!canMoveLeft"
          @click="moveLeft"
        />
        <CoarButton
          v-if="!hideMoveAll"
          variant="secondary"
          size="s"
          icon-start="chevrons-left"
          aria-label="Move all to available"
          :disabled="!canMoveAllLeft"
          @click="moveAllLeft"
        />
      </slot>
    </div>

    <!-- Selected column -->
    <CoarListbox
      ref="rightRef"
      v-model="rightHighlight"
      :options="selectedOptions"
      :label="selectedLabel"
      :show-count="!hideCounts"
      :show-header="true"
      :height="height"
      :disabled="disabled"
      :readonly="readonly"
      :searchable="!hideSearch"
      :search-placeholder="searchPlaceholder"
      :search-fields="searchFields"
      :search-by="searchBy"
      :filter-with="filterWith"
      :sort-groups="sortGroups"
      :sort-options="sortOptions"
      :hide-group-headings="hideGroupHeadings"
      :item-components="itemComponents"
      :kind-by="kindBy"
      :compare-with="compareWith"
      :empty-text="emptySelected"
      :draggable="dragDrop"
      :droppable="dragDrop"
      :drag-engine="dragEngine"
      :drag-group="dragDrop ? dualDragGroup : undefined"
      :can-drag="canDrag"
      :can-drop="canDrop"
      :virtual="virtual"
      :item-height="itemHeight"
      :group-heading-height="groupHeadingHeight"
      :overscan="overscan"
      side="selected"
      class="coar-dual-listbox-column"
      @item-activate="onRightActivate"
      @items-add="onRightDropAdd"
      @item-remove="(p) => emit('item-remove', { ...p, side: 'selected' })"
      @item-action="(p) => emit('item-action', { ...p, side: 'selected' })"
    >
      <template v-for="name in sharedSlotNames" :key="'r-' + name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
      <template v-if="$slots['header-selected']" #header="slotProps">
        <slot name="header-selected" v-bind="slotProps" />
      </template>
      <template v-if="$slots['empty-selected']" #empty>
        <slot name="empty-selected" />
      </template>
    </CoarListbox>
  </div>
</template>

<style>
.coar-dual-listbox {
  display: flex;
  gap: var(--coar-spacing-s);
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
}

.coar-dual-listbox--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.coar-dual-listbox-column {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.coar-dual-listbox-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--coar-spacing-xxs);
}
</style>
