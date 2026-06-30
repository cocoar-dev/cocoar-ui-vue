<script setup lang="ts">
/**
 * Ready-to-use point list for `@cocoar/vue-map` — the batteries-included
 * companion to `<CoarMap>` / `<CoarMapEditor>` so apps don't rebuild it.
 *
 * It owns no layout assumptions: drop it wherever you like and bind it to the
 * same `data` + `selected` as the map. It is **controlled** (`v-model:data` /
 * `v-model:selected`) and stays decoupled from the map — for fly-to / hover it
 * emits `focus` / `highlight` events you wire to the map's exposed methods.
 *
 * Capabilities are opt-in (booleans default false): `reorderable` adds
 * drag-and-drop sorting (via Cocoar UI's `useDragDrop`), `removable` adds a
 * per-row delete. `@cocoar/vue-ui` is the editor-side optional peer.
 */
import { computed, ref } from 'vue';
import { CoarButton, setCoarDragImageFromElement, useDragDrop } from '@cocoar/vue-ui';
import type { MapConfig, MapData, MapPoint } from './types';
import { stopEmoji } from './internal/map-model';
import { reorderPoint, removePoint, selectionAfterRemove, selectionAfterReorder } from './internal/map-edit';

const props = defineProps<{
  data: MapData;
  /** Selected point index (`v-model:selected`). */
  selected?: number | null;
  /** Resolves stop emojis/labels; falls back to the point's own `icon`. */
  config?: MapConfig;
  /** Enable drag-and-drop sorting (default `false`). */
  reorderable?: boolean;
  /** Enable a per-row delete button (default `false`). */
  removable?: boolean;
}>();

const emit = defineEmits<{
  'update:data': [MapData];
  'update:selected': [number | null];
  /** A row was activated — wire to the map's `focusPoint(index)`. */
  focus: [number];
  /** Row hover (or `null` on leave) — wire to the map's `highlightPoint`. */
  highlight: [number | null];
}>();

/** Active drop position while dragging: insert before `index` (`after=false`) or after it. */
const dropAt = ref<{ index: number; after: boolean } | null>(null);

const dnd = useDragDrop<number>({
  onDropAccept: ({ items, insertIndex }) => {
    const from = items[0];
    if (from == null || insertIndex == null) return;
    applyReorder(from, insertIndex);
  },
});

const rows = computed(() => props.data.points);

function rowEmoji(p: MapPoint): string {
  if (p.kind !== 'stop') return '◇';
  if (props.config) return stopEmoji(p, props.config) || '📍';
  return p.icon || '📍';
}
function rowLabel(p: MapPoint): string {
  return p.label || (p.kind === 'shape' ? '(vertex)' : '(unnamed stop)');
}

function selectRow(index: number): void {
  emit('update:selected', index);
  emit('focus', index);
}

/** Move the point at `from` so it lands at `insertIndex` (insert-before semantics). */
function applyReorder(from: number, insertIndex: number): void {
  let to = insertIndex > from ? insertIndex - 1 : insertIndex;
  to = Math.max(0, Math.min(rows.value.length - 1, to));
  if (to === from) return;
  emit('update:data', reorderPoint(props.data, from, to));
  emit('update:selected', selectionAfterReorder(props.selected ?? null, from, to));
}

function removeRow(index: number): void {
  emit('update:data', removePoint(props.data, index));
  emit('update:selected', selectionAfterRemove(props.selected ?? null, index));
}

// ---- Drag-and-drop (handle-initiated) ---------------------------------------

function onHandleDragStart(event: DragEvent, index: number): void {
  const row = (event.currentTarget as HTMLElement | null)?.closest('.coar-map-point-list__row');
  if (row instanceof HTMLElement) setCoarDragImageFromElement(event, row);
  dnd.startDrag(event, [index]);
}

function onRowDragOver(event: DragEvent, index: number): void {
  dnd.onDragOver(event);
  if (!dnd.isDragging.value) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dropAt.value = { index, after: event.clientY > rect.top + rect.height / 2 };
}

function onRowDrop(event: DragEvent, index: number): void {
  const after = dropAt.value?.index === index ? dropAt.value.after : false;
  dnd.onDrop(event, { insertIndex: after ? index + 1 : index });
  dropAt.value = null;
}

function onDragEnd(): void {
  dnd.endDrag();
  dropAt.value = null;
}

function isDropBefore(index: number): boolean {
  return !!dropAt.value && dnd.isDragging.value && dropAt.value.index === index && !dropAt.value.after;
}
function isDropAfter(index: number): boolean {
  return !!dropAt.value && dnd.isDragging.value && dropAt.value.index === index && dropAt.value.after;
}
</script>

<template>
  <ul class="coar-map-point-list" @dragleave="dnd.onDragLeave($event)">
    <li
      v-for="(point, index) in rows"
      :key="index"
      class="coar-map-point-list__row"
      :class="{
        'coar-map-point-list__row--selected': selected === index,
        'coar-map-point-list__row--drop-before': isDropBefore(index),
        'coar-map-point-list__row--drop-after': isDropAfter(index),
      }"
      @dragover="reorderable && onRowDragOver($event, index)"
      @drop="reorderable && onRowDrop($event, index)"
    >
      <button
        v-if="reorderable"
        type="button"
        class="coar-map-point-list__handle"
        aria-label="Drag to reorder"
        draggable="true"
        @dragstart="onHandleDragStart($event, index)"
        @dragend="onDragEnd"
      >
        <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
          <circle cx="2.5" cy="3" r="1.2" /><circle cx="7.5" cy="3" r="1.2" />
          <circle cx="2.5" cy="8" r="1.2" /><circle cx="7.5" cy="8" r="1.2" />
          <circle cx="2.5" cy="13" r="1.2" /><circle cx="7.5" cy="13" r="1.2" />
        </svg>
      </button>

      <button
        type="button"
        class="coar-map-point-list__main"
        @click="selectRow(index)"
        @mouseenter="emit('highlight', index)"
        @mouseleave="emit('highlight', null)"
      >
        <slot name="row" :point="point" :index="index" :selected="selected === index">
          <span class="coar-map-point-list__emoji">{{ rowEmoji(point) }}</span>
          <span class="coar-map-point-list__label">{{ rowLabel(point) }}</span>
          <span class="coar-map-point-list__coords">{{ point.lat.toFixed(3) }}, {{ point.lng.toFixed(3) }}</span>
        </slot>
      </button>

      <CoarButton
        v-if="removable"
        class="coar-map-point-list__delete"
        variant="ghost"
        size="xs"
        aria-label="Delete point"
        @click="removeRow(index)"
      >✕</CoarButton>
    </li>

    <li v-if="!rows.length" class="coar-map-point-list__empty">No points yet.</li>
  </ul>
</template>

<style>
.coar-map-point-list {
  margin: 0;
  padding: 4px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.coar-map-point-list__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
}
.coar-map-point-list__row--selected {
  background: var(--coar-background-accent-secondary, #eef2ff);
  box-shadow: inset 2px 0 0 var(--coar-background-accent-primary, #6366f1);
}
/* Drop indicator line while dragging. */
.coar-map-point-list__row--drop-before::before,
.coar-map-point-list__row--drop-after::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  background: var(--coar-background-accent-primary, #6366f1);
  border-radius: 2px;
}
.coar-map-point-list__row--drop-before::before { top: -2px; }
.coar-map-point-list__row--drop-after::after { bottom: -2px; }

.coar-map-point-list__handle {
  display: inline-flex;
  align-items: center;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  color: var(--coar-text-neutral-tertiary, #94a3b8);
  cursor: grab;
  fill: currentColor;
  flex-shrink: 0;
}
.coar-map-point-list__handle:active {
  cursor: grabbing;
}
.coar-map-point-list__main {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.coar-map-point-list__main:hover {
  background: var(--coar-background-neutral-secondary, #f3f4f6);
}
.coar-map-point-list__row--selected .coar-map-point-list__main:hover {
  background: transparent;
}
.coar-map-point-list__emoji {
  grid-row: span 2;
}
.coar-map-point-list__label {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.coar-map-point-list__coords {
  grid-column: 2;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #94a3b8);
  font-variant-numeric: tabular-nums;
}
.coar-map-point-list__delete {
  flex-shrink: 0;
  margin-right: 2px;
}
.coar-map-point-list__empty {
  padding: 10px 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-tertiary, #94a3b8);
}
</style>
