/**
 * `useCoarDrag` — generic drag-and-drop foundation for surfaces.
 *
 * What it owns:
 *   - Pointer Events lifecycle (down → capture → move → up / cancel).
 *   - rAF-throttled scheduling: pointermove updates a single frame
 *     of state; the next rAF reads it and calls the consumer's
 *     `onDragMove`. Multiple moves between frames are coalesced.
 *   - Auto-scroll velocity computed from the pure-function
 *     `computeAutoScrollVelocity`, applied to the surface's
 *     `scrollTop` / `scrollLeft` per rAF tick.
 *   - Escape-key cancellation.
 *
 * What it deliberately does NOT own:
 *   - Hit-testing (consumer calls `hitTestVerticalSurface` from
 *     `core/`, or implements its own).
 *   - The dragged element's visual representation (consumer renders
 *     a "ghost" or moves the original — the composable just reports
 *     pointer position deltas).
 *   - Drop semantics (consumer decides what happens on drop based on
 *     where the pointer landed).
 *
 * That separation keeps the composable focused (~200 lines) and
 * lets consumers swap in their own hit-test for the calendar's
 * domain shapes (event-on-day, time-slot, etc.).
 *
 * Performance contract: target 60 fps drag on Tier A, ≥ 50 fps Tier
 * B, with 200 events visible. The work per frame is one
 * `computeAutoScrollVelocity` call, one optional scrollLeft/Top
 * write, and one `onDragMove` callback invocation. No DOM queries.
 */

import {
  computed,
  onBeforeUnmount,
  shallowRef,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from 'vue';

import {
  computeAutoScrollVelocity,
  type AutoScrollOptions,
} from '../core/dragHitTest';

export interface DragContext<T> {
  /** The data the consumer attached to the dragged item. */
  data: T;
  /** Pointer's current screen-x / screen-y. */
  pointer: { x: number; y: number };
  /** Pointer's offset from drag-start. */
  delta: { x: number; y: number };
  /** Surface's scrollLeft / scrollTop at drag-start. */
  startScroll: { left: number; top: number };
  /** Surface's scrollLeft / scrollTop at the moment of this callback. */
  scroll: { left: number; top: number };
  /** Pointer's offset from drag-start INCLUDING auto-scroll motion. */
  totalDelta: { x: number; y: number };
}

export interface UseCoarDragOptions<T> {
  /**
   * Element that scrolls during the drag (typically the
   * `<VirtualizedSurface*>` root). Used both to clamp auto-scroll
   * bounds and to write `scrollTop` / `scrollLeft` for auto-scroll.
   * Pass `null` to disable auto-scroll entirely.
   */
  surfaceRef: Ref<HTMLElement | null>;
  /**
   * Auto-scroll behaviour. Pass `null` to disable auto-scroll while
   * keeping drag tracking otherwise. Default: enabled with
   * 30 px hot zone, 24 px/frame max velocity, linear curve.
   */
  autoScroll?: AutoScrollOptions | null;
  /**
   * Called once on pointerdown that becomes a drag. Return `false`
   * to cancel the drag (no callbacks fire afterwards).
   */
  onDragStart?: (ctx: { event: PointerEvent; data: T }) => boolean | void;
  /**
   * Called on each rAF tick while dragging. Coalesces multiple
   * pointermove events between frames.
   */
  onDragMove?: (ctx: DragContext<T>) => void;
  /** Called on pointerup. */
  onDragEnd?: (ctx: DragContext<T>) => void;
  /** Called on pointercancel or Escape key. */
  onDragCancel?: (ctx: DragContext<T>) => void;
}

export interface UseCoarDragReturn<T> {
  /** True while a drag is in progress. */
  isDragging: ComputedRef<boolean>;
  /** The data of the currently-dragged item (or null when idle). */
  draggedData: ShallowRef<T | null>;
  /**
   * Returns a `pointerdown` handler bound to the supplied data. Use
   * via `@pointerdown="startDrag(item)"`.
   */
  startDrag: (data: T) => (event: PointerEvent) => void;
}

export function useCoarDrag<T>(opts: UseCoarDragOptions<T>): UseCoarDragReturn<T> {
  const draggedData = shallowRef<T | null>(null);
  const isDragging = computed(() => draggedData.value !== null);

  // Per-drag state (kept as plain locals — non-reactive to avoid
  // overhead in the rAF hot path).
  let dragId = 0;
  let pointerId = -1;
  let downTarget: Element | null = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pendingMove = false;
  let rafHandle = 0;

  function applyAutoScroll(): void {
    if (opts.autoScroll === null) return;
    const el = opts.surfaceRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { velocityX, velocityY } = computeAutoScrollVelocity(
      lastPointerX,
      lastPointerY,
      rect,
      opts.autoScroll ?? undefined,
    );
    if (velocityX !== 0) el.scrollLeft = el.scrollLeft + velocityX;
    if (velocityY !== 0) el.scrollTop = el.scrollTop + velocityY;
  }

  function buildContext(): DragContext<T> {
    const el = opts.surfaceRef.value;
    const scroll = {
      left: el ? el.scrollLeft : 0,
      top: el ? el.scrollTop : 0,
    };
    return {
      data: draggedData.value as T,
      pointer: { x: lastPointerX, y: lastPointerY },
      delta: { x: lastPointerX - startX, y: lastPointerY - startY },
      startScroll: { left: startScrollLeft, top: startScrollTop },
      scroll,
      totalDelta: {
        x: lastPointerX - startX + (scroll.left - startScrollLeft),
        y: lastPointerY - startY + (scroll.top - startScrollTop),
      },
    };
  }

  function tick(): void {
    rafHandle = 0;
    if (!isDragging.value) return;
    applyAutoScroll();
    pendingMove = false;
    opts.onDragMove?.(buildContext());
    // Auto-scroll keeps producing pointer-doesn't-move-but-content-does
    // updates; schedule the next tick if still dragging and any axis
    // is in the hot zone.
    const el = opts.surfaceRef.value;
    if (el && opts.autoScroll !== null) {
      const rect = el.getBoundingClientRect();
      const v = computeAutoScrollVelocity(
        lastPointerX,
        lastPointerY,
        rect,
        opts.autoScroll ?? undefined,
      );
      if (v.velocityX !== 0 || v.velocityY !== 0) scheduleTick();
    }
  }

  function scheduleTick(): void {
    if (rafHandle !== 0) return;
    rafHandle = requestAnimationFrame(tick);
  }

  function onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    if (!pendingMove) {
      pendingMove = true;
      scheduleTick();
    }
  }

  function endDrag(reason: 'drop' | 'cancel'): void {
    if (!isDragging.value) return;
    if (rafHandle !== 0) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
    const ctx = buildContext();
    // Fire the callback BEFORE teardown so consumers can still read
    // `draggedData.value` and the surface's scroll state from inside
    // the handler. Teardown then clears state for the next drag.
    if (reason === 'drop') opts.onDragEnd?.(ctx);
    else opts.onDragCancel?.(ctx);
    teardown();
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    endDrag('drop');
  }

  function onPointerCancel(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    endDrag('cancel');
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') endDrag('cancel');
  }

  function teardown(): void {
    if (downTarget && downTarget instanceof Element && pointerId >= 0) {
      try {
        (downTarget as Element & { releasePointerCapture?: (id: number) => void })
          .releasePointerCapture?.(pointerId);
      } catch {
        // ignore
      }
    }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('keydown', onKeyDown);
    pointerId = -1;
    downTarget = null;
    pendingMove = false;
    draggedData.value = null;
    dragId++;
  }

  function startDrag(data: T): (event: PointerEvent) => void {
    return (event: PointerEvent) => {
      // Only initiate on primary button.
      if (event.button !== 0) return;
      // Already dragging? Ignore.
      if (isDragging.value) return;
      // Optional pre-flight veto.
      const allowed = opts.onDragStart?.({ event, data });
      if (allowed === false) return;

      const target = event.currentTarget as Element | null;
      pointerId = event.pointerId;
      downTarget = target;
      startX = event.clientX;
      startY = event.clientY;
      lastPointerX = startX;
      lastPointerY = startY;
      const surface = opts.surfaceRef.value;
      startScrollLeft = surface ? surface.scrollLeft : 0;
      startScrollTop = surface ? surface.scrollTop : 0;
      draggedData.value = data;

      try {
        (target as Element & { setPointerCapture?: (id: number) => void })
          ?.setPointerCapture?.(pointerId);
      } catch {
        // some browsers throw when capture isn't possible — ignore
      }

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('keydown', onKeyDown);

      // Don't preventDefault unconditionally — the consumer may be
      // dragging from inside a scrollable element where preventing
      // the gesture has consequences.
      event.preventDefault();
    };
  }

  onBeforeUnmount(() => {
    if (isDragging.value) endDrag('cancel');
    if (rafHandle !== 0) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
  });

  // Suppress unused-var lint on the dragId tracker that exists for
  // future debugging hooks.
  void dragId;

  return { isDragging, draggedData, startDrag };
}
