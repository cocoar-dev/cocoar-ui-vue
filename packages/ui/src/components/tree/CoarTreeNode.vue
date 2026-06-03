<script setup lang="ts" generic="T">
/**
 * `<CoarTreeNode>` — internal, renders **one** tree row.
 *
 * Flat rendering. The parent (`<CoarTree>`) iterates the flat `visibleRows`
 * list and renders one of these per visible row — there's no recursion here.
 * Indentation comes from the `depth` prop (`padding-left: depth * 14 + 8`),
 * the chevron is built-in, the row body is the consumer's `default` slot from
 * `<CoarTree>` (received via injection so this component doesn't need to
 * forward the slot through generics).
 */
import { computed, inject, provide, ref } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarSpinner from '../spinner/CoarSpinner.vue';
import {
  COAR_TREE_NODE_SLOT_KEY,
  COAR_TREE_ROW_ID_KEY,
  COAR_TREE_ROW_STATE_KEY,
  type CoarTreeDropPosition,
  type CoarTreeNodeSlotProps,
} from './tree-types';

const props = defineProps<{
  node: T;
  nodeId: string;
  depth: number;
  isExpandable: boolean;
  draggable: boolean;
  posInSet: number;
  setSize: number;
}>();

// Provide our row id so descendant row-helpers (e.g. CoarTreeNodeLabel)
// know which node they belong to without explicit prop-wiring from the
// consumer's default slot.
provide(COAR_TREE_ROW_ID_KEY, props.nodeId);

// Selection / focus / expand / rename / drop state is derived HERE from the
// shared reactive refs <CoarTree> provides, keyed by this row's id — instead of
// being passed down as props. A change to any of them re-renders only the rows
// whose derived flag actually flips (Vue caches the computed and skips
// dependents when its value is unchanged), not the whole list.
const rowState = inject(COAR_TREE_ROW_STATE_KEY);
if (!rowState) {
  throw new Error('CoarTreeNode must be rendered inside a CoarTree.');
}
const isExpanded = computed(() => rowState.expandedIds.value.has(props.nodeId));
const isSelected = computed(() => rowState.selectedId.value === props.nodeId);
const isFocused = computed(() => rowState.focusedId.value === props.nodeId);
const isRenaming = computed(() => rowState.renamingId.value === props.nodeId);
const dropIndicator = computed<CoarTreeDropPosition | null>(() =>
  rowState.dropTargetId.value === props.nodeId ? rowState.dropPosition.value : null,
);
const fileDropActive = computed(() => rowState.fileDropTargetId.value === props.nodeId);
const isLoading = computed(() => rowState.loadingIds.value.has(props.nodeId));
const hasError = computed(() => rowState.erroredIds.value.has(props.nodeId));

const emit = defineEmits<{
  (e: 'row-click', node: T, ev: MouseEvent): void;
  (e: 'row-dblclick', node: T, ev: MouseEvent): void;
  (e: 'row-context-menu', node: T, ev: MouseEvent): void;
  (e: 'chevron-click', node: T): void;
  (e: 'row-dragstart', node: T, ev: DragEvent): void;
  (e: 'row-dragend', node: T): void;
  (e: 'row-dragover', node: T, el: HTMLElement, ev: DragEvent): void;
  (e: 'row-dragleave', node: T, ev: DragEvent): void;
  (e: 'row-drop', node: T, el: HTMLElement, ev: DragEvent): void;
}>();

const rowEl = ref<HTMLDivElement | null>(null);

// The default-slot of `<CoarTree>` reaches us through injection — generic
// `Slot<T>` doesn't compose cleanly with prop drilling in generic SFCs, and
// injection has the same effect with cleaner types.
const renderNode = inject(COAR_TREE_NODE_SLOT_KEY);
if (!renderNode) {
  throw new Error('CoarTreeNode must be rendered inside a CoarTree.');
}

const slotProps = computed<CoarTreeNodeSlotProps<T>>(() => ({
  node: props.node,
  depth: props.depth,
  isExpanded: isExpanded.value,
  isSelected: isSelected.value,
  isFocused: isFocused.value,
  isExpandable: props.isExpandable,
  isRenaming: isRenaming.value,
  isLoading: isLoading.value,
  hasError: hasError.value,
}));

function renderRow() {
  return renderNode!(slotProps.value);
}

function onChevron(e: MouseEvent) {
  e.stopPropagation();
  emit('chevron-click', props.node);
}
</script>

<template>
  <div
    ref="rowEl"
    class="coar-tree-node__row"
    :class="{
      'coar-tree-node__row--selected': isSelected,
      'coar-tree-node__row--focused': isFocused,
      'coar-tree-node__row--drop-inside': dropIndicator === 'inside',
      'coar-tree-node__row--file-drop': fileDropActive,
    }"
    :style="{ paddingLeft: `${depth * 14 + 8}px` }"
    role="treeitem"
    :aria-expanded="isExpandable ? isExpanded : undefined"
    :aria-selected="isSelected"
    :aria-level="depth + 1"
    :aria-posinset="posInSet"
    :aria-setsize="setSize"
    :aria-busy="isLoading ? 'true' : undefined"
    :tabindex="isFocused ? 0 : -1"
    :draggable="draggable"
    :data-node-id="nodeId"
    @click="emit('row-click', node, $event)"
    @dblclick="emit('row-dblclick', node, $event)"
    @contextmenu="emit('row-context-menu', node, $event)"
    @dragstart="emit('row-dragstart', node, $event)"
    @dragend="emit('row-dragend', node)"
    @dragover="rowEl && emit('row-dragover', node, rowEl, $event)"
    @dragleave="emit('row-dragleave', node, $event)"
    @drop="rowEl && emit('row-drop', node, rowEl, $event)"
  >
    <span
      v-if="dropIndicator === 'before'"
      class="coar-tree-node__drop-line coar-tree-node__drop-line--top"
    />
    <span
      v-if="dropIndicator === 'after'"
      class="coar-tree-node__drop-line coar-tree-node__drop-line--bottom"
    />

    <button
      v-if="isExpandable"
      type="button"
      class="coar-tree-node__chevron"
      tabindex="-1"
      :aria-label="isExpanded ? 'Collapse' : 'Expand'"
      @click="onChevron"
    >
      <CoarSpinner v-if="isLoading" size="xs" label="Loading children" />
      <CoarIcon v-else :name="isExpanded ? 'chevron-down' : 'chevron-right'" size="xs" />
    </button>
    <span v-else class="coar-tree-node__chevron-spacer" aria-hidden="true" />

    <component :is="renderRow" />
  </div>
</template>

<style scoped>
.coar-tree-node__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 0;
  font-size: var(--coar-body-small-base-size, 13px);
  cursor: pointer;
  user-select: none;
  outline: none;
  position: relative;
  /* Used in virtualized mode where the parent sets position:relative and
     children are absolutely positioned. In non-virtualized mode the rows live
     in normal flow inside the tree-list and this property is harmless. */
  box-sizing: border-box;
}
.coar-tree-node__row:hover {
  background: var(--coar-background-neutral-tertiary, #f1f5f9);
}
.coar-tree-node__row:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}
.coar-tree-node__row--selected {
  background: var(--coar-background-accent-tertiary, #dbeafe);
  color: var(--coar-text-accent-primary);
}
.coar-tree-node__row--focused {
  /* Visual focus uses focus-visible above; the class is held for future
     keyboard-focus-without-:focus-visible UX (e.g. type-ahead). */
}
.coar-tree-node__row--drop-inside,
.coar-tree-node__row--file-drop {
  background: var(--coar-background-accent-tertiary, #dbeafe);
  outline: 2px dashed var(--coar-border-accent-primary, #2563eb);
  outline-offset: -2px;
}

.coar-tree-node__drop-line {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--coar-border-accent-primary, #2563eb);
  pointer-events: none;
  z-index: 1;
}
.coar-tree-node__drop-line--top { top: -1px; }
.coar-tree-node__drop-line--bottom { bottom: -1px; }

.coar-tree-node__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: var(--coar-radius-xs, 2px);
  padding: 0;
  color: var(--coar-text-neutral-tertiary);
  cursor: pointer;
}
.coar-tree-node__chevron:hover {
  color: var(--coar-text-neutral-primary);
}
.coar-tree-node__chevron-spacer {
  display: inline-block;
  width: 16px;
  flex-shrink: 0;
}
</style>
