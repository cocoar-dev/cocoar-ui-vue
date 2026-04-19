import { ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  DRAG_MIME,
  registerDrag,
  getDrag,
  getActiveDrag,
  deleteDrag,
  type DragEntry,
} from './dragRegistry';

/** Payload surfaced to `canDrop` checks and the `onDropAccept` callback. */
export interface DropPayload<T> {
  /** The items being dropped. */
  items: readonly T[];
  /** Public identifier of the source surface, if it set `dragId`. */
  fromId: string | null;
  /** Drag group of the source surface. */
  fromGroup: string | null;
  /** True when the source and target are the same surface (drag within one list). */
  fromSelf: boolean;
}

export interface UseDragDropOptions<T> {
  /** Public identifier for this surface. Auto-generated per instance if not set. */
  dragId?: MaybeRefOrGetter<string | undefined>;
  /**
   * Shared name linking compatible surfaces. Items can only cross between surfaces
   * with the same `dragGroup`. A surface without a group still accepts self-drops.
   */
  dragGroup?: MaybeRefOrGetter<string | undefined>;
  /**
   * Whitelist of source `dragId`s this surface accepts items from. When set, drops
   * are only accepted if the source's `dragId` is listed. Unset = accept from any
   * surface in the same `dragGroup`.
   */
  dragAccept?: MaybeRefOrGetter<string[] | undefined>;

  /**
   * Runtime target validation. Called on `dragover` and `drop`. Return `false`
   * to refuse the drop — the cursor shows "not allowed" and nothing happens.
   */
  canDrop?: (payload: DropPayload<T>) => boolean;

  /** Fired after `startDrag` succeeds. */
  onDragStart?: (items: readonly T[]) => void;
  /**
   * Fired on `dragend` (whether the drop was accepted or cancelled). `dropped` is
   * `true` when some target consumed the payload.
   */
  onDragEnd?: (payload: { items: readonly T[]; dropped: boolean }) => void;
  /**
   * Fired on this surface when it accepts a drop. Consumers update their own
   * source-of-truth here (append items, insert at `insertIndex`, etc.).
   */
  onDropAccept?: (payload: DropPayload<T> & { insertIndex: number | null }) => void;
  /**
   * Fired on the *source* surface when another target consumed its payload.
   * Consumers update their own source-of-truth here (remove the items).
   * Fires synchronously inside the target's `drop`, before the source's `dragend`.
   */
  onItemsRemove?: (payload: { items: readonly T[]; toGroup: string | null }) => void;
}

export interface UseDragDropReturn<T> {
  /** Stable instance id — use it when you need to distinguish surfaces externally. */
  instanceId: string;
  /** `true` while a compatible drag is hovering this surface (clears on leave/drop). */
  isDragOver: Ref<boolean>;
  /** `true` while this surface is the source of an in-flight drag. */
  isDragging: Ref<boolean>;

  // Source — wire to a draggable element's events.
  /**
   * Call from a `@dragstart` handler on a draggable element. Pass the payload you
   * want to transfer. Returns `true` if the drag was registered, `false` if the
   * event had no `dataTransfer` or items was empty.
   */
  startDrag(event: DragEvent, items: readonly T[]): boolean;
  /** Call from a `@dragend` handler on the draggable element. Cleans up the session. */
  endDrag(): void;

  // Target — wire to the drop container's events.
  /** Call from the drop container's `@dragover`. */
  onDragOver(event: DragEvent): void;
  /** Call from the drop container's `@dragleave`. */
  onDragLeave(event: DragEvent): void;
  /**
   * Call from the drop container's (or an inner drop target's) `@drop`. Pass an
   * optional `insertIndex` to tell consumers where the drop landed (null = append).
   */
  onDrop(event: DragEvent, context?: { insertIndex?: number | null }): void;
}

function genId(prefix: string): string {
  const rand = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

/**
 * Framework-agnostic HTML5 drag-and-drop primitive used across Cocoar UI
 * components. Decouples "what is being dragged" (your items) from the
 * registration bookkeeping (group matching, whitelists, runtime validation,
 * source-side cleanup).
 *
 * Usage:
 * ```ts
 * const dnd = useDragDrop<Row>({
 *   dragGroup: 'rows',
 *   onDropAccept: ({ items }) => { rows.value = [...rows.value, ...items] },
 *   onItemsRemove: ({ items }) => {
 *     const keep = new Set(rows.value); items.forEach(i => keep.delete(i));
 *     rows.value = [...keep];
 *   },
 * })
 *
 * // In template:
 * // <div draggable @dragstart="dnd.startDrag($event, [row])" @dragend="dnd.endDrag">
 * // <div @dragover="dnd.onDragOver" @dragleave="dnd.onDragLeave" @drop="dnd.onDrop">
 * ```
 */
export function useDragDrop<T>(opts: UseDragDropOptions<T> = {}): UseDragDropReturn<T> {
  const instanceId = genId('coar-dnd');
  const currentDragId = ref<string | null>(null);
  const isDragOver = ref(false);
  const isDragging = ref(false);

  function getDragGroup(): string | null {
    return toValue(opts.dragGroup) ?? null;
  }

  function isDropAllowed(entry: DragEntry<T>): boolean {
    const ownGroup = getDragGroup();
    const fromSelf = entry.sourceId === instanceId;
    const sameGroup = entry.dragGroup === ownGroup;
    if (!sameGroup && !fromSelf) return false;

    const accept = toValue(opts.dragAccept);
    // `dragAccept` undefined = accept any source in the same group. An empty array
    // is explicit: accept from *no* source (useful for "drag-only" columns that
    // still bind dragover handlers for layout reasons).
    if (accept) {
      if (!entry.fromId || !accept.includes(entry.fromId)) return false;
    }

    if (opts.canDrop) {
      return opts.canDrop({
        items: entry.items,
        fromId: entry.fromId,
        fromGroup: entry.dragGroup,
        fromSelf,
      });
    }
    return true;
  }

  function startDrag(event: DragEvent, items: readonly T[]): boolean {
    if (!event.dataTransfer || items.length === 0) return false;
    const id = genId('drag');
    currentDragId.value = id;
    isDragging.value = true;

    const group = getDragGroup();
    registerDrag<T>({
      id,
      sourceId: instanceId,
      fromId: toValue(opts.dragId) ?? null,
      dragGroup: group,
      items,
      onAcceptedBy: () => {
        opts.onItemsRemove?.({ items, toGroup: group });
      },
    });

    event.dataTransfer.setData(DRAG_MIME, id);
    event.dataTransfer.effectAllowed = 'move';
    opts.onDragStart?.(items);
    return true;
  }

  function endDrag(): void {
    const id = currentDragId.value;
    if (!id) return;
    const entry = getDrag<T>(id);
    opts.onDragEnd?.({ items: entry?.items ?? [], dropped: !!entry?.consumed });
    deleteDrag(id);
    currentDragId.value = null;
    isDragging.value = false;
  }

  function onDragOver(event: DragEvent): void {
    if (!event.dataTransfer) return;
    if (!event.dataTransfer.types.includes(DRAG_MIME)) return;
    const entry = getActiveDrag<T>();
    if (!entry || !isDropAllowed(entry)) {
      event.dataTransfer.dropEffect = 'none';
      isDragOver.value = false;
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    isDragOver.value = true;
  }

  function onDragLeave(event: DragEvent): void {
    if (event.currentTarget instanceof HTMLElement && event.relatedTarget instanceof Node) {
      if (event.currentTarget.contains(event.relatedTarget)) return;
    }
    isDragOver.value = false;
  }

  function onDrop(event: DragEvent, context?: { insertIndex?: number | null }): void {
    isDragOver.value = false;
    if (!event.dataTransfer) return;
    const id = event.dataTransfer.getData(DRAG_MIME);
    if (!id) return;
    const entry = getDrag<T>(id);
    if (!entry || !isDropAllowed(entry)) return;

    event.preventDefault();

    const fromSelf = entry.sourceId === instanceId;
    const insertIndex = context?.insertIndex ?? null;

    entry.consumed = true;
    if (!fromSelf) entry.onAcceptedBy?.(instanceId, insertIndex);

    opts.onDropAccept?.({
      items: entry.items,
      fromId: entry.fromId,
      fromGroup: entry.dragGroup,
      fromSelf,
      insertIndex,
    });
  }

  return {
    instanceId,
    isDragOver,
    isDragging,
    startDrag,
    endDrag,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
