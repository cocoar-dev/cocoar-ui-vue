import { computed, ref, shallowRef, type Ref } from 'vue';
import { useDragDrop, type DropPayload } from '../../../composables/useDragDrop';
import { autoscrollDelta, computeDropTarget, isFileDrag, resolveInsertion } from './reorder-core';
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

const ITEM_SELECTOR = '.coar-data-list__item';

/**
 * Reordering for `<CoarDataList>`: the list-specific parts (hit testing on rows,
 * insertion maths, keyboard grab mode, file drops) on top of the shared
 * `useDragDrop` engines (native HTML5 or pointer events).
 */
export function useDataListReorder<T>(options: UseDataListReorderOptions<T>) {
  // ── Shared state ──────────────────────────────────────────────────────────
  const dragKeys = shallowRef<Set<CoarDataListKey>>(new Set());
  const dropTarget = shallowRef<CoarDataListDropTarget | null>(null);
  const fileOver = ref(false);
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

  function itemElementAt(x: number, y: number): HTMLElement | null {
    const viewport = options.viewport.value;
    if (!viewport || typeof document.elementFromPoint !== 'function') return null;
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(ITEM_SELECTOR);
    return el && viewport.contains(el) ? el : null;
  }

  /** Drop target implied by the pointer position: before/after the row or tile under it. */
  function targetAt(x: number, y: number): CoarDataListDropTarget | null {
    if (options.sorted()) return null;
    const el = itemElementAt(x, y);
    if (!el) return null;
    const key = keyIndex().get(el.dataset.key ?? '');
    if (key === undefined || dragKeys.value.has(key)) return null;
    return computeDropTarget(options.layout(), el.getBoundingClientRect(), { x, y }, key);
  }

  function itemAt(x: number, y: number): T | null {
    const el = itemElementAt(x, y);
    const key = el ? keyIndex().get(el.dataset.key ?? '') : undefined;
    return key === undefined ? null : (options.itemByKey(key) ?? null);
  }

  function commitDrop(items: readonly T[], meta: { fromSelf: boolean; sourceId: string | null; sourceDragGroup: string | null }): boolean {
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
    fileOver.value = false;
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

  // ── Shared engine (native or pointer) ─────────────────────────────────────
  const dnd = useDragDrop<T>({
    dragId: () => options.dragId(),
    dragGroup: () => options.dragGroup(),
    dragAccept: () => options.dragAccept(),
    canDrop: (payload) => options.canDrop()?.(payload) ?? true,
    engine: () => options.engine(),
    pointer: {
      target: options.viewport,
      ghostClass: 'coar-data-list__ghost',
      onHover: (point) => {
        if (!options.enabled()) return;
        dropTarget.value = targetAt(point.x, point.y);
        autoscroll(point.y);
      },
      onLeave: () => {
        dropTarget.value = null;
        stopAutoscroll();
      },
      onDrop: () => {
        stopAutoscroll();
      },
    },
    onDragStart: (items) => {
      dragKeys.value = new Set(items.map(options.keyOf));
      options.onDragStart(items);
    },
    onDragEnd: (payload) => {
      options.onDragEnd(payload);
      reset();
    },
    onDropAccept: ({ items, fromId, fromGroup, fromSelf }) => {
      if (!options.enabled()) return;
      commitDrop(items, { fromSelf, sourceId: fromId, sourceDragGroup: fromGroup });
      dropTarget.value = null;
    },
    onItemsRemove: ({ items, toGroup }) => {
      options.onItemsRemove({ items: [...items], keys: items.map(options.keyOf), toDragGroup: toGroup });
    },
  });

  const nativeDraggable = computed(() => options.enabled() && dnd.engine.value === 'native');
  const isDragOver = computed(() => dnd.isDragOver.value || fileOver.value);

  function onItemDragStart(event: DragEvent, item: T): void {
    if (!nativeDraggable.value) return;
    const items = itemsToDrag(item);
    if (items.length === 0 || !dnd.startDrag(event, items)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', items.map((entry) => String(options.keyOf(entry))).join(', '));
  }

  function onItemDragEnd(): void {
    dnd.endDrag();
    reset();
  }

  function onItemPointerDown(event: PointerEvent, item: T): void {
    if (!options.enabled()) return;
    dnd.onPointerDown(event, () => itemsToDrag(item), event.currentTarget as HTMLElement);
  }

  function onViewportDragOver(event: DragEvent): void {
    if (isFileDrag(event.dataTransfer)) {
      if (!options.acceptsFiles()) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      fileOver.value = true;
      return;
    }
    if (!options.enabled()) return;
    dnd.onDragOver(event);
    if (!dnd.isDragOver.value) {
      dropTarget.value = null;
      return;
    }
    dropTarget.value = targetAt(event.clientX, event.clientY);
    autoscroll(event.clientY);
  }

  function onViewportDragLeave(event: DragEvent): void {
    dnd.onDragLeave(event);
    if (!dnd.isDragOver.value) {
      fileOver.value = false;
      dropTarget.value = null;
      stopAutoscroll();
    }
  }

  function onViewportDrop(event: DragEvent): void {
    stopAutoscroll();
    if (isFileDrag(event.dataTransfer)) {
      fileOver.value = false;
      if (!options.acceptsFiles() || !event.dataTransfer) return;
      event.preventDefault();
      options.onFilesDrop({ files: Array.from(event.dataTransfer.files), item: itemAt(event.clientX, event.clientY), event });
      return;
    }
    if (!options.enabled()) return;
    dnd.onDrop(event);
    dropTarget.value = null;
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

  return {
    engine: dnd.engine,
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
