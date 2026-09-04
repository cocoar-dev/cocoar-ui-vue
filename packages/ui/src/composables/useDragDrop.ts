import { computed, onBeforeUnmount, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  DRAG_MIME,
  registerDrag,
  getDrag,
  getActiveDrag,
  deleteDrag,
  registerPointerSurface,
  unregisterPointerSurface,
  findPointerSurface,
  type DragEntry,
  type PointerSurface,
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

/**
 * How drags are started and tracked.
 * - `'native'`: HTML5 drag events. Interoperable with every other HTML5 target
 *   (other Cocoar components, the OS), but no touch support.
 * - `'pointer'`: Pointer Events — mouse, pen and touch (long-press). Only
 *   surfaces using this composable can be targets.
 * - `'auto'`: `'pointer'` on coarse-pointer devices, `'native'` otherwise.
 */
export type DragEngine = 'native' | 'pointer' | 'auto';

export interface DragPoint {
  x: number;
  y: number;
}

/** Pointer-engine configuration (see {@link UseDragDropOptions.pointer}). */
export interface PointerDragOptions<T> {
  /** The element that accepts pointer-engine drops. Registered automatically. */
  target?: Ref<HTMLElement | null>;
  /** A compatible drag hovers the target. Compute your drop position from `point`. */
  onHover?: (point: DragPoint, payload: DropPayload<T>) => void;
  onLeave?: () => void;
  /** A compatible drag is released over the target. Return the `insertIndex` for `onDropAccept`. */
  onDrop?: (point: DragPoint, payload: DropPayload<T>) => number | null | undefined | void;
  /** Touch / pen: press this long without moving to start a drag. Default 280. */
  longPressMs?: number;
  /** Mouse: move this far to start a drag. Default 6. */
  mouseThreshold?: number;
  /** Touch / pen: moving this far before the long-press fires is a scroll, not a drag. Default 10. */
  touchThreshold?: number;
  /**
   * Drag ghost that follows the pointer. Default: a clone of the source element.
   * Return `null` for no ghost, or pass `false` to disable.
   */
  ghost?: false | ((source: HTMLElement, items: readonly T[]) => HTMLElement | null);
  /** Extra class on the default ghost, for styling. */
  ghostClass?: string;
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

  /** Drag engine. Default `'native'`. */
  engine?: MaybeRefOrGetter<DragEngine>;
  /** Pointer-engine target callbacks and tuning. */
  pointer?: PointerDragOptions<T>;

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
  /** The engine in effect (`'auto'` resolved). */
  engine: ComputedRef<'native' | 'pointer'>;
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
  /**
   * Pointer engine: call from `@pointerdown` on a draggable element. The drag
   * starts after the mouse threshold / touch long-press; `items` may be a getter,
   * resolved at that moment. No-op unless the engine is `'pointer'`.
   */
  onPointerDown(event: PointerEvent, items: readonly T[] | (() => readonly T[]), element?: HTMLElement): void;

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

/** Resolves `'auto'`: coarse pointers (touch) get the pointer engine. */
export function detectDragEngine(): 'native' | 'pointer' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'native';
  return window.matchMedia('(pointer: coarse)').matches ? 'pointer' : 'native';
}

const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function defaultGhost(source: HTMLElement, count: number, extraClass?: string): HTMLElement {
  const ghost = source.cloneNode(true) as HTMLElement;
  const rect = source.getBoundingClientRect();
  ghost.classList.add('coar-dnd-ghost');
  if (extraClass) ghost.classList.add(extraClass);
  ghost.removeAttribute('id');
  Object.assign(ghost.style, {
    position: 'fixed',
    zIndex: '10000',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    width: `${rect.width}px`,
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    opacity: '0.85',
    cursor: 'grabbing',
  } satisfies Partial<CSSStyleDeclaration>);
  if (count > 1) {
    const badge = document.createElement('span');
    badge.className = 'coar-dnd-ghost__count';
    badge.textContent = String(count);
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-0.5rem',
      right: '-0.5rem',
      minWidth: '1.25rem',
      padding: '0 0.35rem',
      borderRadius: '999px',
      background: 'var(--coar-background-accent-primary, #2563eb)',
      color: 'var(--coar-text-on-accent, #fff)',
      fontSize: '0.75rem',
      lineHeight: '1.25rem',
      textAlign: 'center',
    } satisfies Partial<CSSStyleDeclaration>);
    ghost.appendChild(badge);
  }
  return ghost;
}

/**
 * Framework-agnostic drag-and-drop primitive used across Cocoar UI components.
 * Decouples "what is being dragged" (your items) from the registration
 * bookkeeping (group matching, whitelists, runtime validation, source-side
 * cleanup), and offers two engines behind the same contract: HTML5 drag events
 * (`'native'`) or Pointer Events (`'pointer'`, touch-capable).
 *
 * Usage (native):
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
 *
 * Pointer engine: pass `engine: 'pointer'` (or `'auto'`), wire `@pointerdown`
 * to `dnd.onPointerDown($event, [row])` and give `pointer.target` the drop
 * container; `pointer.onHover` / `onDrop` receive the pointer position instead
 * of a DragEvent.
 */
export function useDragDrop<T>(opts: UseDragDropOptions<T> = {}): UseDragDropReturn<T> {
  const instanceId = genId('coar-dnd');
  const currentDragId = ref<string | null>(null);
  const isDragOver = ref(false);
  const isDragging = ref(false);
  const engine = computed<'native' | 'pointer'>(() => {
    const value = toValue(opts.engine) ?? 'native';
    return value === 'auto' ? detectDragEngine() : value;
  });

  function getDragGroup(): string | null {
    return toValue(opts.dragGroup) ?? null;
  }

  function payloadFor(entry: DragEntry<T>): DropPayload<T> {
    return {
      items: entry.items,
      fromId: entry.fromId,
      fromGroup: entry.dragGroup,
      fromSelf: entry.sourceId === instanceId,
    };
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

    if (opts.canDrop) return opts.canDrop(payloadFor(entry));
    return true;
  }

  function createEntry(items: readonly T[]): DragEntry<T> {
    const group = getDragGroup();
    return {
      id: genId('drag'),
      sourceId: instanceId,
      fromId: toValue(opts.dragId) ?? null,
      dragGroup: group,
      items,
      onAcceptedBy: () => {
        opts.onItemsRemove?.({ items, toGroup: group });
      },
    };
  }

  function accept(entry: DragEntry<T>, insertIndex: number | null): void {
    const fromSelf = entry.sourceId === instanceId;
    entry.consumed = true;
    if (!fromSelf) entry.onAcceptedBy?.(instanceId, insertIndex);
    opts.onDropAccept?.({ ...payloadFor(entry), insertIndex });
  }

  // ── Native engine ─────────────────────────────────────────────────────────
  function startDrag(event: DragEvent, items: readonly T[]): boolean {
    if (!event.dataTransfer || items.length === 0) return false;
    const entry = createEntry(items);
    currentDragId.value = entry.id;
    isDragging.value = true;
    registerDrag<T>(entry);

    event.dataTransfer.setData(DRAG_MIME, entry.id);
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
    accept(entry, context?.insertIndex ?? null);
  }

  // ── Pointer engine: source ────────────────────────────────────────────────
  interface Pending {
    items: readonly T[] | (() => readonly T[]);
    element: HTMLElement;
    x: number;
    y: number;
    pointerId: number;
    timer: ReturnType<typeof setTimeout> | null;
  }
  interface Active {
    entry: DragEntry<T>;
    ghost: HTMLElement | null;
    offsetX: number;
    offsetY: number;
    hovered: PointerSurface | null;
  }
  let pending: Pending | null = null;
  let active: Active | null = null;

  function onPointerDown(event: PointerEvent, items: readonly T[] | (() => readonly T[]), element?: HTMLElement): void {
    if (engine.value !== 'pointer') return;
    if (event.button !== 0 || !event.isPrimary) return;
    if ((event.target as Element | null)?.closest?.(INTERACTIVE_SELECTOR)) return;
    const source = element ?? (event.currentTarget as HTMLElement | null) ?? (event.target as HTMLElement);
    cancelPending();
    pending = { items, element: source, x: event.clientX, y: event.clientY, pointerId: event.pointerId, timer: null };
    if (event.pointerType !== 'mouse') {
      // Touch / pen: a long press starts the drag so plain scrolling keeps working.
      pending.timer = setTimeout(() => {
        if (pending) beginPointerDrag(pending, pending.x, pending.y);
      }, opts.pointer?.longPressMs ?? 280);
    }
    document.addEventListener('pointermove', onDocumentPointerMove);
    document.addEventListener('pointerup', onDocumentPointerUp);
    document.addEventListener('pointercancel', onDocumentPointerCancel);
  }

  function cancelPending(): void {
    if (pending?.timer) clearTimeout(pending.timer);
    pending = null;
  }

  function beginPointerDrag(from: Pending, x: number, y: number): void {
    cancelPending();
    const items = typeof from.items === 'function' ? from.items() : from.items;
    if (items.length === 0) {
      removeDocumentListeners();
      return;
    }
    const entry = createEntry(items);
    registerDrag<T>(entry);
    currentDragId.value = entry.id;
    isDragging.value = true;

    const rect = from.element.getBoundingClientRect();
    let ghost: HTMLElement | null = null;
    const ghostOption = opts.pointer?.ghost;
    if (ghostOption !== false && typeof document !== 'undefined' && document.body) {
      ghost = ghostOption ? ghostOption(from.element, items) : defaultGhost(from.element, items.length, opts.pointer?.ghostClass);
      if (ghost) document.body.appendChild(ghost);
    }
    active = { entry, ghost, offsetX: x - rect.left, offsetY: y - rect.top, hovered: null };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    document.addEventListener('keydown', onDocumentKeyDown);
    opts.onDragStart?.(items);
    movePointerDrag(x, y);
  }

  function movePointerDrag(x: number, y: number): void {
    if (!active) return;
    if (active.ghost) {
      active.ghost.style.left = `${x - active.offsetX}px`;
      active.ghost.style.top = `${y - active.offsetY}px`;
    }
    const next = findPointerSurface(x, y);
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
      if (distance >= (opts.pointer?.mouseThreshold ?? 6)) beginPointerDrag(pending, event.clientX, event.clientY);
    } else if (distance >= (opts.pointer?.touchThreshold ?? 10)) {
      // Moved before the long press fired: a scroll, not a drag.
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
    const target = findPointerSurface(event.clientX, event.clientY);
    const dropped = target ? target.drop(active.entry as DragEntry<unknown>, event.clientX, event.clientY) : false;
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

  function preventTouchScroll(event: TouchEvent): void {
    if (active) event.preventDefault();
  }

  function finishPointerDrag(dropped: boolean): void {
    if (!active) return;
    const { entry, ghost, hovered } = active;
    hovered?.leave();
    ghost?.remove();
    active = null;
    removeDocumentListeners();
    opts.onDragEnd?.({ items: entry.items, dropped: dropped || !!entry.consumed });
    deleteDrag(entry.id);
    currentDragId.value = null;
    isDragging.value = false;
  }

  function removeDocumentListeners(): void {
    document.removeEventListener('pointermove', onDocumentPointerMove);
    document.removeEventListener('pointerup', onDocumentPointerUp);
    document.removeEventListener('pointercancel', onDocumentPointerCancel);
    document.removeEventListener('touchmove', preventTouchScroll);
    document.removeEventListener('keydown', onDocumentKeyDown);
  }

  // ── Pointer engine: target ────────────────────────────────────────────────
  const surface: PointerSurface = {
    hover(raw, x, y) {
      const entry = raw as DragEntry<T>;
      if (engine.value !== 'pointer' || !isDropAllowed(entry)) {
        isDragOver.value = false;
        return;
      }
      isDragOver.value = true;
      opts.pointer?.onHover?.({ x, y }, payloadFor(entry));
    },
    leave() {
      isDragOver.value = false;
      opts.pointer?.onLeave?.();
    },
    drop(raw, x, y) {
      const entry = raw as DragEntry<T>;
      isDragOver.value = false;
      if (engine.value !== 'pointer' || !isDropAllowed(entry)) return false;
      const insertIndex = opts.pointer?.onDrop?.({ x, y }, payloadFor(entry));
      accept(entry, typeof insertIndex === 'number' ? insertIndex : null);
      return true;
    },
  };

  const target = opts.pointer?.target;
  if (target) {
    watch(
      target,
      (el, previous) => {
        if (previous) unregisterPointerSurface(previous);
        if (el) registerPointerSurface(el, surface);
      },
      // Sync: the surface must exist as soon as the element does, not a tick later.
      { immediate: true, flush: 'sync' },
    );
  }

  onBeforeUnmount(() => {
    cancelPending();
    if (active) finishPointerDrag(false);
    removeDocumentListeners();
    if (target?.value) unregisterPointerSurface(target.value);
  });

  return {
    instanceId,
    engine,
    isDragOver,
    isDragging,
    startDrag,
    endDrag,
    onPointerDown,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
