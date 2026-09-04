import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import { useDragDrop, type DropPayload } from '../../../composables/useDragDrop';
import { deleteDrag, registerDrag, type DragEntry } from '../../../composables/dragRegistry';
import {
  autoscrollDelta,
  computeDropTarget,
  detectDragEngine,
  isFileDrag,
  resolveInsertion,
} from './reorder-core';
import type {
  CoarDataListDragEngine,
  CoarDataListDropEvent,
  CoarDataListDropTarget,
  CoarDataListFilesDropEvent,
  CoarDataListItemsRemoveEvent,
  CoarDataListKey,
  CoarDataListLayout,
} from '../types';

export interface UseDataListReorderOptions<T> {
  viewport: Ref<HTMLElement | null>;
  /** Reordering / accepting drops is on and the list is not disabled. */
  enabled: () => boolean;
  /** An active sort: drops are accepted but always append (no positional target). */
  sorted: () => boolean;
  engine: () => CoarDataListDragEngine;
  layout: () => CoarDataListLayout;
  visibleItems: () => readonly T[];
  keyOf: (item: T) => CoarDataListKey;
  itemByKey: (key: CoarDataListKey) => T | undefined;
  isSelected: (key: CoarDataListKey) => boolean;
  canDrag: () => ((item: T) => boolean) | undefined;
  dragGroup: () => string | undefined;
  dragId: () => string | undefined;
  dragAccept: () => string[] | undefined;
  canDrop: () => ((payload: DropPayload<T>) => boolean) | undefined;
  groupOf: (item: T) => string | null;
  acceptsFiles: () => boolean;
  focusedKey: Ref<CoarDataListKey | null>;
  scrollToKey: (key: CoarDataListKey) => void;
  onReorder: (event: CoarDataListDropEvent<T>) => void;
  onItemsAdd: (event: CoarDataListDropEvent<T>) => void;
  onItemsRemove: (event: CoarDataListItemsRemoveEvent<T>) => void;
  onFilesDrop: (event: CoarDataListFilesDropEvent<T>) => void;
  onDragStart: (items: readonly T[]) => void;
  onDragEnd: (payload: { items: readonly T[]; dropped: boolean }) => void;
}

/** A data list that takes part in pointer-engine drags. Keyed by its viewport element. */
interface PointerSurface {
  hover(entry: DragEntry<unknown>, x: number, y: number): boolean;
  leave(): void;
  drop(entry: DragEntry<unknown>, x: number, y: number): boolean;
}

const pointerSurfaces = new Map<HTMLElement, PointerSurface>();

const ITEM_SELECTOR = '.coar-data-list__item';
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const MOUSE_THRESHOLD = 6;
const TOUCH_THRESHOLD = 10;
const LONG_PRESS_MS = 280;

function genId(): string {
  return `drag-${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;
}

export function useDataListReorder<T>(options: UseDataListReorderOptions<T>) {
  const instanceId = `coar-data-list-${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;
  const resolvedEngine = computed<'native' | 'pointer'>(() => {
    const engine = options.engine();
    return engine === 'auto' ? detectDragEngine() : engine;
  });

  // ── Shared state ──────────────────────────────────────────────────────────
  const dragKeys = shallowRef<Set<CoarDataListKey>>(new Set());
  const dropTarget = shallowRef<CoarDataListDropTarget | null>(null);
  const isDragOver = ref(false);
  const grabbed = ref(false);
  const dragging = computed(() => dragKeys.value.size > 0);

  function keyIndex(): Map<string, CoarDataListKey> {
    const map = new Map<string, CoarDataListKey>();
    for (const item of options.visibleItems()) {
      const key = options.keyOf(item);
      map.set(String(key), key);
    }
    return map;
  }

  function itemsToDrag(item: T): T[] {
    const allowed = options.canDrag() ?? (() => true);
    const key = options.keyOf(item);
    const source = options.isSelected(key)
      ? options.visibleItems().filter((candidate) => options.isSelected(options.keyOf(candidate)))
      : [item];
    return source.filter(allowed);
  }

  /** Item element under a viewport point, and the drop target it implies. */
  function targetAt(x: number, y: number): CoarDataListDropTarget | null {
    const viewport = options.viewport.value;
    if (!viewport || options.sorted() || typeof document.elementFromPoint !== 'function') return null;
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(ITEM_SELECTOR);
    if (!el || !viewport.contains(el)) return null;
    const key = keyIndex().get(el.dataset.key ?? '');
    if (key === undefined || dragKeys.value.has(key)) return null;
    return computeDropTarget(options.layout(), el.getBoundingClientRect(), { x, y }, key);
  }

  function itemAt(x: number, y: number): T | null {
    const viewport = options.viewport.value;
    if (!viewport || typeof document.elementFromPoint !== 'function') return null;
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(ITEM_SELECTOR);
    if (!el || !viewport.contains(el)) return null;
    const key = keyIndex().get(el.dataset.key ?? '');
    return key === undefined ? null : (options.itemByKey(key) ?? null);
  }

  function commitDrop(
    items: readonly T[],
    meta: { fromSelf: boolean; sourceId: string | null; sourceDragGroup: string | null },
  ): boolean {
    const keys = items.map(options.keyOf);
    const visibleKeys = options.visibleItems().map(options.keyOf);
    const target = dropTarget.value;
    const insertion = resolveInsertion(visibleKeys, new Set(meta.fromSelf ? keys : []), target, meta);
    if (!insertion) return false;
    const targetItem = target ? options.itemByKey(target.key) : undefined;
    const event: CoarDataListDropEvent<T> = {
      items: [...items],
      keys,
      ...insertion,
      group: targetItem === undefined ? null : options.groupOf(targetItem),
      ...meta,
    };
    if (meta.fromSelf) options.onReorder(event);
    else options.onItemsAdd(event);
    return true;
  }

  function reset(): void {
    dragKeys.value = new Set();
    dropTarget.value = null;
    isDragOver.value = false;
    grabbed.value = false;
    stopAutoscroll();
  }

  // ── Auto-scroll while hovering near the edges ─────────────────────────────
  let autoscrollFrame: number | null = null;
  let autoscrollY = 0;
  function autoscroll(clientY: number): void {
    autoscrollY = clientY;
    if (autoscrollFrame !== null || typeof requestAnimationFrame === 'undefined') return;
    const step = () => {
      autoscrollFrame = null;
      const viewport = options.viewport.value;
      if (!viewport) return;
      const delta = autoscrollDelta(autoscrollY, viewport.getBoundingClientRect());
      if (delta === 0) return;
      viewport.scrollTop += delta;
      autoscrollFrame = requestAnimationFrame(step);
    };
    autoscrollFrame = requestAnimationFrame(step);
  }
  function stopAutoscroll(): void {
    if (autoscrollFrame !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(autoscrollFrame);
    autoscrollFrame = null;
  }

  // ── Native engine (HTML5 drag events) ─────────────────────────────────────
  const dnd = useDragDrop<T>({
    dragId: () => options.dragId(),
    dragGroup: () => options.dragGroup(),
    dragAccept: () => options.dragAccept(),
    canDrop: (payload) => options.canDrop()?.(payload) ?? true,
    onDragStart: (items) => options.onDragStart(items),
    onDragEnd: (payload) => {
      options.onDragEnd(payload);
      reset();
    },
    onDropAccept: ({ items, fromId, fromGroup, fromSelf }) => {
      commitDrop(items, { fromSelf, sourceId: fromId, sourceDragGroup: fromGroup });
    },
    onItemsRemove: ({ items, toGroup }) => {
      options.onItemsRemove({ items: [...items], keys: items.map(options.keyOf), toDragGroup: toGroup });
    },
  });

  const nativeDraggable = computed(() => options.enabled() && resolvedEngine.value === 'native');

  function onItemDragStart(event: DragEvent, item: T): void {
    if (!nativeDraggable.value) return;
    const items = itemsToDrag(item);
    if (items.length === 0 || !dnd.startDrag(event, items)) {
      event.preventDefault();
      return;
    }
    dragKeys.value = new Set(items.map(options.keyOf));
    event.dataTransfer?.setData('text/plain', items.map((entry) => String(options.keyOf(entry))).join(', '));
  }

  function onItemDragEnd(): void {
    dnd.endDrag();
    reset();
  }

  function onViewportDragOver(event: DragEvent): void {
    if (isFileDrag(event.dataTransfer)) {
      if (!options.acceptsFiles()) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      isDragOver.value = true;
      return;
    }
    if (!options.enabled()) return;
    dnd.onDragOver(event);
    if (!dnd.isDragOver.value) {
      dropTarget.value = null;
      return;
    }
    isDragOver.value = true;
    dropTarget.value = targetAt(event.clientX, event.clientY);
    autoscroll(event.clientY);
  }

  function onViewportDragLeave(event: DragEvent): void {
    dnd.onDragLeave(event);
    if (!dnd.isDragOver.value) {
      isDragOver.value = false;
      dropTarget.value = null;
      stopAutoscroll();
    }
  }

  function onViewportDrop(event: DragEvent): void {
    stopAutoscroll();
    if (isFileDrag(event.dataTransfer)) {
      isDragOver.value = false;
      if (!options.acceptsFiles() || !event.dataTransfer) return;
      event.preventDefault();
      options.onFilesDrop({ files: Array.from(event.dataTransfer.files), item: itemAt(event.clientX, event.clientY), event });
      return;
    }
    if (!options.enabled()) return;
    dnd.onDrop(event);
    isDragOver.value = false;
    dropTarget.value = null;
  }

  // ── Pointer engine (Pointer Events, touch-capable) ────────────────────────
  interface PendingPointer {
    item: T;
    element: HTMLElement;
    x: number;
    y: number;
    pointerId: number;
    timer: ReturnType<typeof setTimeout> | null;
  }
  interface ActivePointer {
    entry: DragEntry<T>;
    ghost: HTMLElement | null;
    offsetX: number;
    offsetY: number;
    hovered: PointerSurface | null;
  }
  let pending: PendingPointer | null = null;
  let active: ActivePointer | null = null;

  function isDropAllowed(entry: DragEntry<unknown>): boolean {
    const fromSelf = entry.sourceId === instanceId;
    const ownGroup = options.dragGroup() ?? null;
    if (!fromSelf && entry.dragGroup !== ownGroup) return false;
    const accept = options.dragAccept();
    if (accept && (!entry.fromId || !accept.includes(entry.fromId))) return false;
    const canDrop = options.canDrop();
    if (canDrop) {
      return canDrop({ items: entry.items as readonly T[], fromId: entry.fromId, fromGroup: entry.dragGroup, fromSelf });
    }
    return true;
  }

  const surface: PointerSurface = {
    hover(entry, x, y) {
      if (!options.enabled() || !isDropAllowed(entry)) {
        isDragOver.value = false;
        dropTarget.value = null;
        return false;
      }
      isDragOver.value = true;
      dropTarget.value = targetAt(x, y);
      autoscroll(y);
      return true;
    },
    leave() {
      isDragOver.value = false;
      dropTarget.value = null;
      stopAutoscroll();
    },
    drop(entry) {
      stopAutoscroll();
      if (!options.enabled() || !isDropAllowed(entry)) return false;
      const fromSelf = entry.sourceId === instanceId;
      entry.consumed = true;
      if (!fromSelf) entry.onAcceptedBy?.(instanceId, null);
      commitDrop(entry.items as readonly T[], { fromSelf, sourceId: entry.fromId, sourceDragGroup: entry.dragGroup });
      isDragOver.value = false;
      dropTarget.value = null;
      return true;
    },
  };

  watch(
    options.viewport,
    (el, previous) => {
      if (previous) pointerSurfaces.delete(previous);
      if (el) pointerSurfaces.set(el, surface);
    },
    { immediate: true },
  );

  function surfaceAt(x: number, y: number): PointerSurface | null {
    if (typeof document.elementFromPoint !== 'function') return null;
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    for (const [viewport, candidate] of pointerSurfaces) {
      if (viewport.contains(el)) return candidate;
    }
    return null;
  }

  function preventTouchScroll(event: TouchEvent): void {
    if (active) event.preventDefault();
  }

  function onItemPointerDown(event: PointerEvent, item: T): void {
    if (!options.enabled() || resolvedEngine.value !== 'pointer') return;
    if (event.button !== 0 || !event.isPrimary) return;
    if ((event.target as Element | null)?.closest(INTERACTIVE_SELECTOR)) return;
    const element = (event.currentTarget as HTMLElement | null) ?? (event.target as HTMLElement);
    cancelPending();
    pending = { item, element, x: event.clientX, y: event.clientY, pointerId: event.pointerId, timer: null };
    if (event.pointerType !== 'mouse') {
      // Touch / pen: long-press starts the drag so plain scrolling keeps working.
      pending.timer = setTimeout(() => {
        if (pending) beginPointerDrag(pending, pending.x, pending.y);
      }, LONG_PRESS_MS);
    }
    document.addEventListener('pointermove', onDocumentPointerMove);
    document.addEventListener('pointerup', onDocumentPointerUp);
    document.addEventListener('pointercancel', onDocumentPointerCancel);
  }

  function cancelPending(): void {
    if (pending?.timer) clearTimeout(pending.timer);
    pending = null;
  }

  function beginPointerDrag(from: PendingPointer, x: number, y: number): void {
    cancelPending();
    const items = itemsToDrag(from.item);
    if (items.length === 0) {
      removeDocumentListeners();
      return;
    }
    const group = options.dragGroup() ?? null;
    const entry: DragEntry<T> = {
      id: genId(),
      sourceId: instanceId,
      fromId: options.dragId() ?? null,
      dragGroup: group,
      items,
      onAcceptedBy: () => {
        options.onItemsRemove({ items: [...items], keys: items.map(options.keyOf), toDragGroup: group });
      },
    };
    registerDrag(entry);
    dragKeys.value = new Set(items.map(options.keyOf));

    const rect = from.element.getBoundingClientRect();
    let ghost: HTMLElement | null = null;
    if (typeof document !== 'undefined' && document.body) {
      ghost = from.element.cloneNode(true) as HTMLElement;
      ghost.classList.add('coar-data-list__ghost');
      ghost.style.width = `${rect.width}px`;
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      if (items.length > 1) ghost.dataset.count = String(items.length);
      document.body.appendChild(ghost);
    }
    active = { entry, ghost, offsetX: x - rect.left, offsetY: y - rect.top, hovered: null };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    document.addEventListener('keydown', onDocumentKeyDown);
    options.onDragStart(items);
    movePointerDrag(x, y);
  }

  function movePointerDrag(x: number, y: number): void {
    if (!active) return;
    if (active.ghost) {
      active.ghost.style.left = `${x - active.offsetX}px`;
      active.ghost.style.top = `${y - active.offsetY}px`;
    }
    const next = surfaceAt(x, y);
    if (active.hovered && active.hovered !== next) active.hovered.leave();
    active.hovered = next;
    next?.hover(active.entry as DragEntry<unknown>, x, y);
  }

  function onDocumentPointerMove(event: PointerEvent): void {
    if (active) {
      movePointerDrag(event.clientX, event.clientY);
      return;
    }
    if (!pending || event.pointerId !== pending.pointerId) return;
    const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
    if (event.pointerType === 'mouse') {
      if (distance >= MOUSE_THRESHOLD) beginPointerDrag(pending, event.clientX, event.clientY);
    } else if (distance >= TOUCH_THRESHOLD) {
      // Moved before the long-press fired: this is a scroll, not a drag.
      cancelPending();
      removeDocumentListeners();
    }
  }

  function onDocumentPointerUp(event: PointerEvent): void {
    if (!active) {
      cancelPending();
      removeDocumentListeners();
      return;
    }
    const entry = active.entry;
    const target = surfaceAt(event.clientX, event.clientY);
    const dropped = target ? target.drop(entry as DragEntry<unknown>, event.clientX, event.clientY) : false;
    finishPointerDrag(dropped);
  }

  function onDocumentPointerCancel(): void {
    if (active) finishPointerDrag(false);
    else {
      cancelPending();
      removeDocumentListeners();
    }
  }

  function onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && active) finishPointerDrag(false);
  }

  function finishPointerDrag(dropped: boolean): void {
    if (!active) return;
    const { entry, ghost, hovered } = active;
    hovered?.leave();
    ghost?.remove();
    deleteDrag(entry.id);
    active = null;
    removeDocumentListeners();
    options.onDragEnd({ items: entry.items, dropped });
    reset();
  }

  function removeDocumentListeners(): void {
    document.removeEventListener('pointermove', onDocumentPointerMove);
    document.removeEventListener('pointerup', onDocumentPointerUp);
    document.removeEventListener('pointercancel', onDocumentPointerCancel);
    document.removeEventListener('touchmove', preventTouchScroll);
    document.removeEventListener('keydown', onDocumentKeyDown);
  }

  // ── Keyboard: Ctrl+X grab, arrows move the target, Ctrl+V / Enter drop ──────
  let grabIndex = 0;

  function remainingKeys(): CoarDataListKey[] {
    return options.visibleItems().map(options.keyOf).filter((key) => !dragKeys.value.has(key));
  }

  function applyGrabIndex(): void {
    const remaining = remainingKeys();
    grabIndex = Math.max(0, Math.min(remaining.length, grabIndex));
    if (remaining.length === 0) dropTarget.value = null;
    else if (grabIndex < remaining.length) dropTarget.value = { key: remaining[grabIndex], position: 'before' };
    else dropTarget.value = { key: remaining[remaining.length - 1], position: 'after' };
    if (dropTarget.value) options.scrollToKey(dropTarget.value.key);
  }

  function onKeyDown(event: KeyboardEvent): boolean {
    if (!options.enabled() || options.sorted()) return false;
    const modifier = event.ctrlKey || event.metaKey;

    if (!grabbed.value) {
      if (!(modifier && (event.key === 'x' || event.key === 'X'))) return false;
      const focused = options.focusedKey.value;
      const item = focused === null ? undefined : options.itemByKey(focused);
      if (item === undefined) return false;
      const items = itemsToDrag(item);
      if (items.length === 0) return false;
      event.preventDefault();
      dragKeys.value = new Set(items.map(options.keyOf));
      grabbed.value = true;
      const visible = options.visibleItems().map(options.keyOf);
      const first = visible.findIndex((key) => dragKeys.value.has(key));
      grabIndex = visible.slice(0, first).filter((key) => !dragKeys.value.has(key)).length;
      applyGrabIndex();
      return true;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        grabIndex++;
        applyGrabIndex();
        return true;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        grabIndex--;
        applyGrabIndex();
        return true;
      case 'Home':
        event.preventDefault();
        grabIndex = 0;
        applyGrabIndex();
        return true;
      case 'End':
        event.preventDefault();
        grabIndex = Number.MAX_SAFE_INTEGER;
        applyGrabIndex();
        return true;
      case 'Escape':
        event.preventDefault();
        reset();
        return true;
      case 'Enter':
      case 'v':
      case 'V': {
        if (event.key !== 'Enter' && !modifier) return false;
        event.preventDefault();
        const items = [...dragKeys.value].map(options.itemByKey).filter((item): item is T => item !== undefined);
        commitDrop(items, { fromSelf: true, sourceId: options.dragId() ?? null, sourceDragGroup: options.dragGroup() ?? null });
        reset();
        return true;
      }
      default:
        return false;
    }
  }

  onBeforeUnmount(() => {
    cancelPending();
    if (active) finishPointerDrag(false);
    removeDocumentListeners();
    stopAutoscroll();
    const viewport = options.viewport.value;
    if (viewport) pointerSurfaces.delete(viewport);
  });

  return {
    engine: resolvedEngine,
    dragging,
    grabbed,
    dragKeys,
    dropTarget,
    isDragOver,
    nativeDraggable,
    isDragged: (key: CoarDataListKey) => dragKeys.value.has(key),
    onItemDragStart,
    onItemDragEnd,
    onItemPointerDown,
    onViewportDragOver,
    onViewportDragLeave,
    onViewportDrop,
    onKeyDown,
  };
}
