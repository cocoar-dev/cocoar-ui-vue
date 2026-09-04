/**
 * `useTimeGridSwipe` — touch paging for the time grid.
 *
 * A horizontal touch pan on the day columns moves the grid with the
 * finger (header cells, all-day band and body columns together — the
 * hour axis stays put) and, on release past the threshold, pages to
 * the previous / next range through the calendar api. Below the
 * threshold the grid settles back. Ported from the SwiftUI port's
 * day swipe (5.2.0).
 *
 * Responsibilities:
 *   - on the day columns: touch only (`pointerType === 'touch'`) —
 *     mouse and pen keep the existing pointerdown semantics (drag an
 *     event, click a slot)
 *   - on the day-header strip: every pointer type — there is nothing
 *     else to drag or click there, so a mouse drag across the day
 *     names pages too (`allowMouse`)
 *   - tap vs. pan disambiguation for the column: a touch that never
 *     moves is a tap and fires the deferred `onTap` on release, so
 *     `onTimeClick` doesn't fire at the start of every swipe
 *   - the translate as a CSS custom property (`--coar-time-grid-swipe-x`)
 *     on the grid root, so each scoped child reads it in its own CSS
 *   - `prefers-reduced-motion`: no settle animation, page immediately
 *
 * Deliberately NOT here: rendering the neighbour days during the
 * pan (their events aren't in the loader window yet), event drags
 * (the drag runtime owns pointerdown on event elements — the caller
 * filters those before reaching this composable).
 */

import { computed, onBeforeUnmount, ref, type Ref } from 'vue';

/** Snapshot the grid emits so its host can mirror the swipe on sibling pages. */
export interface TimeGridSwipeState {
  engaged: boolean;
  swiping: boolean;
  settling: boolean;
  /** The `--coar-time-grid-swipe-x` value, e.g. `'-140px'`. */
  offsetX: string;
}

export interface UseTimeGridSwipeOptions {
  /** The element whose width is one "page" (the body columns container). */
  columnsEl: Ref<HTMLElement | null>;
  /** Read on every gesture (C7). `false` disables the pan entirely. */
  enabled: () => boolean;
  /** Called after the settle animation; `1` = next, `-1` = previous. */
  onCommit: (direction: 1 | -1) => void;
}

export interface UseTimeGridSwipeReturn {
  /** Bind to the grid root: sets `--coar-time-grid-swipe-x`. */
  swipeStyle: Ref<Record<string, string>>;
  /** Bind as a class on the grid root while the grid settles. */
  settling: Ref<boolean>;
  /** True from the first horizontal move until release. */
  isSwiping: Ref<boolean>;
  /**
   * True from the moment a pointer was taken until the gesture ends
   * (release, cancel, end of settle). The surface mounts the
   * neighbour pages on this — before the first movement, so they are
   * there when the pan starts.
   */
  engaged: Ref<boolean>;
  /**
   * Feed a `pointerdown`. Returns `true` when the composable took the
   * pointer — the caller must then NOT fire its click semantics; they
   * arrive via `onTap` on release instead. Touch is always taken;
   * mouse / pen only with `allowMouse` (the day-header strip).
   */
  onPointerdown: (e: PointerEvent, options?: SwipePointerdownOptions) => boolean;
}

export interface SwipePointerdownOptions {
  /** Deferred click semantics, fired on release when the pointer never moved. */
  onTap?: () => void;
  /** Take mouse / pen pointers too (primary button only). */
  allowMouse?: boolean;
}

/** Horizontal travel before a touch counts as a pan, not a tap. */
const PAN_THRESHOLD_PX = 12;
/** Travel below which a release is a tap. */
const TAP_SLOP_PX = 8;
/** Fraction of the page width that commits a page turn … */
const COMMIT_FRACTION = 0.25;
/** … or, whichever is smaller, this many pixels (keeps tests and narrow columns sane). */
const COMMIT_MIN_PX = 40;
/** Fast flicks commit regardless of distance. */
const FLICK_VELOCITY_PX_PER_MS = 0.5;
const SETTLE_MS = 180;

export function useTimeGridSwipe(options: UseTimeGridSwipeOptions): UseTimeGridSwipeReturn {
  const offsetX = ref(0);
  const settling = ref(false);
  const isSwiping = ref(false);
  const engaged = ref(false);

  const swipeStyle = computed<Record<string, string>>(() => ({
    '--coar-time-grid-swipe-x': `${offsetX.value}px`,
  }));

  interface Gesture {
    pointerId: number;
    startX: number;
    startY: number;
    startedAt: number;
    lastX: number;
    panning: boolean;
    /** The pointer went mostly vertical — leave it to native scroll. */
    abandoned: boolean;
    onTap?: () => void;
  }
  let gesture: Gesture | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  function pageWidth(): number {
    return options.columnsEl.value?.getBoundingClientRect().width ?? 0;
  }

  function reducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function detach(): void {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
  }

  function reset(): void {
    gesture = null;
    isSwiping.value = false;
    if (!settling.value) engaged.value = false;
    detach();
  }

  function onPointerdown(e: PointerEvent, opts: SwipePointerdownOptions = {}): boolean {
    if (!options.enabled()) return false;
    const isTouch = e.pointerType === 'touch';
    if (!isTouch && !opts.allowMouse) return false;
    if (!isTouch && e.button !== 0) return false;
    if (settling.value) return true; // swallow taps mid-settle
    const onTap = opts.onTap;
    gesture = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startedAt: e.timeStamp,
      lastX: e.clientX,
      panning: false,
      abandoned: false,
      onTap,
    };
    engaged.value = true;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return true;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!gesture || e.pointerId !== gesture.pointerId || gesture.abandoned) return;
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    if (!gesture.panning) {
      if (Math.abs(dx) < PAN_THRESHOLD_PX && Math.abs(dy) < PAN_THRESHOLD_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical intent: native scroll (touch-action: pan-y) owns it.
        gesture.abandoned = true;
        return;
      }
      gesture.panning = true;
      isSwiping.value = true;
    }
    gesture.lastX = e.clientX;
    offsetX.value = dx;
  }

  function onPointerUp(e: PointerEvent): void {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const g = gesture;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    reset();
    if (g.abandoned) return;
    if (!g.panning) {
      if (Math.abs(dx) <= TAP_SLOP_PX && Math.abs(dy) <= TAP_SLOP_PX) g.onTap?.();
      return;
    }
    const width = pageWidth();
    const commitDistance = width > 0 ? Math.min(width * COMMIT_FRACTION, COMMIT_MIN_PX * 4) : 0;
    const threshold = Math.max(COMMIT_MIN_PX, commitDistance);
    // Velocity over the whole gesture, floored at one frame so a burst
    // of synthetic / coalesced events can't read as an infinite flick.
    const elapsed = Math.max(16, e.timeStamp - g.startedAt);
    const velocity = Math.abs(dx) / elapsed;
    const flick = Math.abs(dx) >= 2 * PAN_THRESHOLD_PX && velocity >= FLICK_VELOCITY_PX_PER_MS;
    const commits = Math.abs(dx) >= threshold || flick;
    const direction: 1 | -1 = dx < 0 ? 1 : -1;
    if (!commits) {
      settleTo(0, null);
      return;
    }
    settleTo(direction === 1 ? -width : width, direction);
  }

  function onPointerCancel(e: PointerEvent): void {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    reset();
    settleTo(0, null);
  }

  /**
   * Animate the offset to `target`, then commit. With reduced motion
   * (or when nothing would visibly move) the commit is immediate.
   */
  function settleTo(target: number, direction: 1 | -1 | null): void {
    const finish = () => {
      settling.value = false;
      offsetX.value = 0;
      if (direction !== null) options.onCommit(direction);
      engaged.value = false;
    };
    if (reducedMotion() || target === offsetX.value || pageWidth() === 0) {
      finish();
      return;
    }
    settling.value = true;
    offsetX.value = target;
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      finish();
    }, SETTLE_MS);
  }

  onBeforeUnmount(() => {
    detach();
    if (settleTimer) clearTimeout(settleTimer);
  });

  return { swipeStyle, settling, isSwiping, engaged, onPointerdown };
}
