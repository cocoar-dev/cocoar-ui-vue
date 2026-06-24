<script setup lang="ts">
/**
 * Hover edge-handles for tables — the Notion/Word-style row & column grips.
 *
 * The earlier attempt failed because it tried to react to ProseMirror's
 * `CellSelection` (which doesn't fire `selectionchange`). This version is
 * **geometry-driven** instead: it measures the hovered table's cell rectangles
 * and renders fixed-position handle bars at the top (columns) and left (rows)
 * edges. Pointing at a handle highlights the whole column/row; clicking it
 * *programmatically* sets a CellSelection (via `selectCol/RowCommand`, passing a
 * `pos` inside the table so it targets the hovered table even without a cursor
 * there) and opens a small action menu — insert before/after, delete.
 *
 * Rendered teleported to `<body>` with viewport coordinates, so it sidesteps
 * the editor area's scroll/containing-block quirks; it re-measures on mouse
 * move, scroll and resize.
 */
import { ref, shallowRef, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useInstance } from '@milkdown/vue';
import { editorViewCtx, commandsCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/prose/state';
import type { $Command } from '@milkdown/utils';
import {
  selectColCommand, selectRowCommand, deleteSelectedCellsCommand,
  addColBeforeCommand, addColAfterCommand, addRowBeforeCommand, addRowAfterCommand,
  moveColCommand, moveRowCommand,
} from '@milkdown/preset-gfm';
import { CoarContextMenu, CoarMenuItem, CoarMenuDivider, useContextMenu } from '@cocoar/vue-ui';

const props = defineProps<{
  /** The editor's `.coar-md-area` element — the hover scope. */
  area: HTMLElement | null;
}>();

const emit = defineEmits<{
  /** Fired when the action menu opens (true) / closes (false), so the host can
   *  suppress the floating toolbar while it's open. */
  menuToggle: [open: boolean];
}>();

const [, getInstance] = useInstance();

interface Rect { left: number; top: number; width: number; height: number }
interface Geometry {
  table: HTMLTableElement;
  rect: Rect;
  cols: Rect[];
  rows: Rect[];
}

const HANDLE = 14; // px thickness of the handle bars

const geo = shallowRef<Geometry | null>(null);
const hover = ref<{ kind: 'col' | 'row'; index: number } | null>(null);
/** Which column/row the open action menu targets (drives highlight + actions). */
const menu = ref<{ kind: 'col' | 'row'; index: number } | null>(null);
/** Active drag-to-reorder: source index + the index it would drop at. */
const drag = ref<{ kind: 'col' | 'row'; from: number; target: number } | null>(null);
const ctxMenu = useContextMenu();

// When the menu closes (item click, outside-click, escape), drop the pinned
// target and let the floating toolbar come back.
watch(ctxMenu.isOpen, (open) => {
  if (!open && menu.value) {
    menu.value = null;
    hover.value = null;
    emit('menuToggle', false);
  }
});

function toRect(r: DOMRect): Rect {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Measure a table's column/row rectangles in viewport coordinates. */
function measure(table: HTMLTableElement): Geometry | null {
  const rows = Array.from(table.querySelectorAll('tr'));
  const headerRow = rows[0];
  if (!headerRow) return null;
  const headerCells = Array.from(headerRow.children) as HTMLElement[];
  if (headerCells.length === 0) return null;
  return {
    table,
    rect: toRect(table.getBoundingClientRect()),
    cols: headerCells.map((c) => toRect(c.getBoundingClientRect())),
    rows: rows.map((r) => toRect(r.getBoundingClientRect())),
  };
}

/** True when the pointer is in the handle interaction zone (the table plus the
 *  thin margin on its top & left edges where the bars live). */
function inZone(g: Geometry, x: number, y: number): boolean {
  // Handles live on all four edges, so the zone is the table plus a HANDLE-wide
  // margin on every side.
  return (
    x >= g.rect.left - HANDLE - 4 && x <= g.rect.left + g.rect.width + HANDLE + 4 &&
    y >= g.rect.top - HANDLE - 4 && y <= g.rect.top + g.rect.height + HANDLE + 4
  );
}

let rafPending = false;
/** The table whose handle-zone (table + a HANDLE-wide margin on every edge)
 *  contains the pointer — so handles appear when you approach an edge, before
 *  the cursor is over the table itself. */
function tableNear(x: number, y: number): HTMLTableElement | null {
  const tables = props.area?.querySelectorAll('table');
  if (!tables) return null;
  for (const t of Array.from(tables) as HTMLTableElement[]) {
    const r = t.getBoundingClientRect();
    if (
      x >= r.left - HANDLE - 4 && x <= r.right + HANDLE + 4 &&
      y >= r.top - HANDLE - 4 && y <= r.bottom + HANDLE + 4
    ) {
      return t;
    }
  }
  return null;
}

function onPointerMove(e: MouseEvent) {
  if (menu.value || pendingDrag || drag.value) return; // pinned while menu open / dragging
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const x = e.clientX, y = e.clientY;
    // Keep the current table active while the pointer stays in its zone.
    if (geo.value && inZone(geo.value, x, y)) {
      return;
    }
    // Otherwise activate the nearest table whose edge zone we're approaching.
    const table = tableNear(x, y);
    if (table) {
      geo.value = measure(table);
    } else {
      geo.value = null;
      hover.value = null;
    }
  });
}

function remeasure() {
  if (geo.value) {
    const next = measure(geo.value.table);
    geo.value = next;
    if (!next) { hover.value = null; ctxMenu.close(); }
  }
}

onMounted(() => {
  document.addEventListener('mousemove', onPointerMove, true);
  window.addEventListener('scroll', remeasure, true);
  window.addEventListener('resize', remeasure);
});
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPointerMove, true);
  document.removeEventListener('mousemove', onDragMove, true);
  document.removeEventListener('mouseup', onGripUp, true);
  window.removeEventListener('scroll', remeasure, true);
  window.removeEventListener('resize', remeasure);
});

// ── Command dispatch ────────────────────────────────────────────────
/** A document position inside the active table's given column/row, used to
 *  target `selectCol/RowCommand` at THIS table (not wherever the cursor is). */
function posInside(kind: 'col' | 'row', index: number): number | null {
  const g = geo.value;
  const editor = getInstance();
  if (!g || !editor) return null;
  let pos: number | null = null;
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const cellEl = kind === 'col'
      ? (g.table.querySelector('tr')?.children[index] as HTMLElement | undefined)
      : (g.table.querySelectorAll('tr')[index]?.children[0] as HTMLElement | undefined);
    if (cellEl) pos = view.posAtDOM(cellEl, 0);
  });
  return pos;
}

function run(kind: 'col' | 'row', index: number, ...extra: $Command<unknown>[]) {
  const editor = getInstance();
  const pos = posInside(kind, index);
  if (!editor || pos == null) return;
  const selectCmd = kind === 'col' ? selectColCommand : selectRowCommand;
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx);
    commands.call(selectCmd.key, { index, pos });
    for (const cmd of extra) commands.call(cmd.key);
  });
  ctxMenu.close(); // watcher clears menu/hover + restores the floating toolbar
  geo.value = null;
}

function doDelete() {
  if (!menu.value) return;
  run(menu.value.kind, menu.value.index, deleteSelectedCellsCommand);
}
function doInsertBefore() {
  if (!menu.value) return;
  const { kind, index } = menu.value;
  run(kind, index, kind === 'col' ? addColBeforeCommand : addRowBeforeCommand);
}
function doInsertAfter() {
  if (!menu.value) return;
  const { kind, index } = menu.value;
  run(kind, index, kind === 'col' ? addColAfterCommand : addRowAfterCommand);
}

// ── Interaction ─────────────────────────────────────────────────────
/** A grip is highlighted when it's hovered, the open menu's target, or the one
 *  being dragged — so it stays visibly selected throughout the interaction. */
function gripActive(kind: 'col' | 'row', index: number): boolean {
  return (
    (hover.value?.kind === kind && hover.value.index === index) ||
    (menu.value?.kind === kind && menu.value.index === index) ||
    (drag.value?.kind === kind && drag.value.from === index)
  );
}

// ── Drag to reorder ─────────────────────────────────────────────────
// Press a grip and move past a small threshold to drag the column/row; release
// over another to reorder via `moveCol/RowCommand`. A press with no movement
// falls through to opening the action menu (see `onGripUp`).
const DRAG_THRESHOLD = 4;
let pendingDrag: { kind: 'col' | 'row'; from: number; x: number; y: number; ev: MouseEvent } | null = null;

function move(kind: 'col' | 'row', from: number, to: number) {
  const editor = getInstance();
  const pos = posInside(kind, from);
  if (!editor || pos == null || from === to) return;
  const selectCmd = kind === 'col' ? selectColCommand : selectRowCommand;
  const moveCmd = kind === 'col' ? moveColCommand : moveRowCommand;
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx);
    // `moveColumn/Row` reads the source/target ranges from the selection, so we
    // must put a CellSelection in this table first. The table is replaced
    // immediately by the move, so this selection never shows to the user.
    commands.call(selectCmd.key, { index: from, pos });
    commands.call(moveCmd.key, { from, to, pos });
    // The move leaves the moved column/row CellSelection-selected; collapse it
    // to a plain cursor so no cells stay highlighted after the drop.
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    if (!state.selection.empty) {
      view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, state.selection.from)));
    }
  });
  geo.value = null;
  hover.value = null;
}

/** Map a pointer coordinate to the column/row index under it. */
function indexAt(kind: 'col' | 'row', x: number, y: number): number {
  const g = geo.value;
  if (!g) return 0;
  if (kind === 'col') {
    const i = g.cols.findIndex((c) => x < c.left + c.width);
    return i === -1 ? g.cols.length - 1 : i;
  }
  const j = g.rows.findIndex((r) => y < r.top + r.height);
  return j === -1 ? g.rows.length - 1 : j;
}

function onGripDown(kind: 'col' | 'row', index: number, e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  pendingDrag = { kind, from: index, x: e.clientX, y: e.clientY, ev: e };
  document.addEventListener('mousemove', onDragMove, true);
  document.addEventListener('mouseup', onGripUp, true);
}

function onDragMove(e: MouseEvent) {
  if (!pendingDrag) return;
  if (!drag.value) {
    if (Math.hypot(e.clientX - pendingDrag.x, e.clientY - pendingDrag.y) < DRAG_THRESHOLD) return;
    drag.value = { kind: pendingDrag.kind, from: pendingDrag.from, target: pendingDrag.from };
  }
  drag.value = { ...drag.value, target: indexAt(drag.value.kind, e.clientX, e.clientY) };
}

function onGripUp() {
  document.removeEventListener('mousemove', onDragMove, true);
  document.removeEventListener('mouseup', onGripUp, true);
  if (drag.value) {
    const { kind, from, target } = drag.value;
    drag.value = null;
    move(kind, from, target);
  } else if (pendingDrag) {
    // No movement — treat as a click and open the action menu.
    openMenu(pendingDrag.kind, pendingDrag.from, pendingDrag.ev);
  }
  pendingDrag = null;
}

function openMenu(kind: 'col' | 'row', index: number, e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  // Keep `geo` alive (the menu's actions reuse it). The visual feedback is our
  // own overlay highlight (driven by the `menu` target) — we deliberately do
  // NOT set a ProseMirror CellSelection here, since that would show the anchor
  // cell's text as browser-selected. The real selection happens in `run()` at
  // the moment of the action.
  menu.value = { kind, index };
  emit('menuToggle', true);
  ctxMenu.open(e);
  // The selection may scroll the table into view — realign the bars after.
  requestAnimationFrame(remeasure);
}


// Column handle bars at the top AND bottom edges, row bars at the left AND
// right — so the grips are reachable wherever you've scrolled in a big table.
const colBars = computed(() => {
  const g = geo.value;
  if (!g) return [];
  return [
    { key: 'top', left: g.rect.left, top: g.rect.top - HANDLE, width: g.rect.width, height: HANDLE },
    { key: 'bottom', left: g.rect.left, top: g.rect.top + g.rect.height, width: g.rect.width, height: HANDLE },
  ];
});
const rowBars = computed(() => {
  const g = geo.value;
  if (!g) return [];
  return [
    { key: 'left', left: g.rect.left - HANDLE, top: g.rect.top, width: HANDLE, height: g.rect.height },
    { key: 'right', left: g.rect.left + g.rect.width, top: g.rect.top, width: HANDLE, height: g.rect.height },
  ];
});
const highlightStyle = computed(() => {
  const g = geo.value;
  // Highlight the hovered grip, the open menu's target, or the dragged
  // column/row — so you keep seeing exactly which one you're acting on.
  const h = hover.value ?? menu.value ?? (drag.value ? { kind: drag.value.kind, index: drag.value.from } : null);
  if (!g || !h) return null;
  if (h.kind === 'col') {
    const c = g.cols[h.index];
    return c && { left: `${c.left}px`, top: `${g.rect.top}px`, width: `${c.width}px`, height: `${g.rect.height}px` };
  }
  const r = g.rows[h.index];
  return r && { left: `${g.rect.left}px`, top: `${r.top}px`, width: `${g.rect.width}px`, height: `${r.height}px` };
});

/** The blue drop-indicator line at the edge of the column/row the drag lands on. */
const dropStyle = computed(() => {
  const g = geo.value, d = drag.value;
  if (!g || !d) return null;
  if (d.kind === 'col') {
    const c = g.cols[d.target];
    // line on the leading edge of the target column
    const left = d.target >= d.from ? c.left + c.width : c.left;
    return c && { left: `${left}px`, top: `${g.rect.top}px`, width: '2px', height: `${g.rect.height}px` };
  }
  const r = g.rows[d.target];
  const top = d.target >= d.from ? r.top + r.height : r.top;
  return r && { left: `${g.rect.left}px`, top: `${top}px`, width: `${g.rect.width}px`, height: '2px' };
});
</script>

<template>
  <Teleport to="body">
    <div v-if="geo" class="coar-md-th">
      <!-- column/row highlight -->
      <div v-if="highlightStyle" class="coar-md-th__hl" :style="highlightStyle" />
      <!-- drop indicator while dragging to reorder -->
      <div v-if="dropStyle" class="coar-md-th__drop" :style="dropStyle" />

      <!-- column handle bars (top + bottom) -->
      <div
        v-for="bar in colBars"
        :key="bar.key"
        class="coar-md-th__bar coar-md-th__bar--col"
        :style="{ left: `${bar.left}px`, top: `${bar.top}px`, width: `${bar.width}px`, height: `${bar.height}px` }"
      >
        <button
          v-for="(c, i) in geo.cols"
          :key="`c${i}`"
          type="button"
          class="coar-md-th__grip"
          :class="{ 'coar-md-th__grip--active': gripActive('col', i) }"
          :style="{ left: `${c.left - geo.rect.left}px`, width: `${c.width}px` }"
          :aria-label="`Column ${i + 1} options`"
          @mouseenter="hover = { kind: 'col', index: i }"
          @mouseleave="hover = null"
          @mousedown="onGripDown('col', i, $event)"
        />
      </div>

      <!-- row handle bars (left + right) -->
      <div
        v-for="bar in rowBars"
        :key="bar.key"
        class="coar-md-th__bar coar-md-th__bar--row"
        :style="{ left: `${bar.left}px`, top: `${bar.top}px`, width: `${bar.width}px`, height: `${bar.height}px` }"
      >
        <button
          v-for="(r, j) in geo.rows"
          :key="`r${j}`"
          type="button"
          class="coar-md-th__grip"
          :class="{ 'coar-md-th__grip--active': gripActive('row', j) }"
          :style="{ top: `${r.top - geo.rect.top}px`, height: `${r.height}px` }"
          :aria-label="`Row ${j + 1} options`"
          @mouseenter="hover = { kind: 'row', index: j }"
          @mouseleave="hover = null"
          @mousedown="onGripDown('row', j, $event)"
        />
      </div>
    </div>

    <!-- action menu — the library's context menu primitive -->
    <CoarContextMenu :menu="ctxMenu">
      <CoarMenuItem
        :label="menu?.kind === 'col' ? 'Insert column left' : 'Insert row above'"
        :icon="menu?.kind === 'col' ? 'table-column-plus-left' : 'table-row-plus-above'"
        @clicked="doInsertBefore"
      />
      <CoarMenuItem
        :label="menu?.kind === 'col' ? 'Insert column right' : 'Insert row below'"
        :icon="menu?.kind === 'col' ? 'table-column-plus-right' : 'table-row-plus-below'"
        @clicked="doInsertAfter"
      />
      <CoarMenuDivider />
      <CoarMenuItem
        :label="menu?.kind === 'col' ? 'Delete column' : 'Delete row'"
        icon="trash-2"
        @clicked="doDelete"
      />
    </CoarContextMenu>
  </Teleport>
</template>

<style scoped>
.coar-md-th { position: fixed; inset: 0; pointer-events: none; z-index: 40; }

.coar-md-th__hl {
  position: fixed;
  background: color-mix(in srgb, var(--coar-background-accent-primary, #2563eb) 12%, transparent);
  outline: 1px solid color-mix(in srgb, var(--coar-background-accent-primary, #2563eb) 40%, transparent);
  pointer-events: none;
}

.coar-md-th__bar { position: fixed; pointer-events: none; }
.coar-md-th__grip {
  position: absolute;
  padding: 0;
  border: none;
  cursor: pointer;
  pointer-events: auto;
  background: var(--coar-background-neutral-secondary, #e5e7eb);
  border-radius: 3px;
}
.coar-md-th__bar--col .coar-md-th__grip { top: 2px; bottom: 2px; }
.coar-md-th__bar--row .coar-md-th__grip { left: 2px; right: 2px; }
.coar-md-th__grip:hover,
.coar-md-th__grip--active {
  background: var(--coar-background-accent-primary, #2563eb);
}

/* Drop indicator while dragging a column/row to reorder. */
.coar-md-th__drop {
  position: fixed;
  background: var(--coar-background-accent-primary, #2563eb);
  border-radius: 1px;
  pointer-events: none;
}
</style>
