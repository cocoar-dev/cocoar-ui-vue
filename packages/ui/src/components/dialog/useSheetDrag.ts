import { ref } from 'vue';

/** A sheet dragged down by more than this share of its height closes on release. */
export const SHEET_CLOSE_DISTANCE_RATIO = 0.3;
/** A sheet released moving down at least this fast (px/ms) closes, however short the drag. */
export const SHEET_CLOSE_VELOCITY = 0.5;
/** Only the movement of the last this many ms before release counts for the velocity. */
const VELOCITY_WINDOW_MS = 100;

export interface DragSample {
  readonly y: number;
  readonly time: number;
}

/** Downward velocity in px/ms of the last `VELOCITY_WINDOW_MS` before `samples` end. */
export function releaseVelocity(samples: readonly DragSample[]): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  const first = samples.find((s) => last.time - s.time <= VELOCITY_WINDOW_MS) ?? last;
  const elapsed = last.time - first.time;
  return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

/**
 * Whether a released drag closes the sheet: dragged down by more than 30 % of its height,
 * or released with a downward flick. Otherwise it springs back.
 */
export function shouldCloseSheet(drag: { distance: number; height: number; velocity: number }): boolean {
  if (drag.distance <= 0) return false;
  if (drag.height > 0 && drag.distance > drag.height * SHEET_CLOSE_DISTANCE_RATIO) return true;
  return drag.velocity >= SHEET_CLOSE_VELOCITY;
}

export interface SheetDragOptions {
  /** Read on each pointerdown: whether dragging is allowed. */
  enabled: () => boolean;
  /** Height of the sheet in px, read on release. */
  sheetHeight: () => number;
  /** Called when a released drag closes the sheet. */
  onClose: () => void;
  /** Clock in ms. Default: `performance.now()`. */
  now?: () => number;
}

/** Controls inside the drag area keep their own pointer behaviour (the close button). */
const NO_DRAG_SELECTOR = 'button, a[href], input, select, textarea, [contenteditable="true"]';

/**
 * Drag-to-close of a sheet with pointer events (finger, pen, mouse) and pointer capture.
 * Bind `handlers` to the elements that may start a drag (handle and header: they never
 * scroll, so there is no conflict with scrolling the content). `offset` is the current
 * downward displacement in px; `dragging` is true while a pointer drags.
 */
export function useSheetDrag(options: SheetDragOptions) {
  const now = options.now ?? (() => performance.now());
  const offset = ref(0);
  const dragging = ref(false);

  let pointerId: number | null = null;
  let captureEl: Element | null = null;
  let startY = 0;
  let samples: DragSample[] = [];

  function end() {
    if (captureEl && pointerId !== null) {
      try {
        if (captureEl.hasPointerCapture?.(pointerId)) captureEl.releasePointerCapture(pointerId);
      } catch { /* pointer already gone */ }
    }
    pointerId = null;
    captureEl = null;
    samples = [];
    dragging.value = false;
  }

  function onPointerdown(event: PointerEvent) {
    if (pointerId !== null || !options.enabled()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest(NO_DRAG_SELECTOR)) return;
    pointerId = event.pointerId;
    captureEl = event.currentTarget instanceof Element ? event.currentTarget : null;
    try {
      captureEl?.setPointerCapture?.(event.pointerId);
    } catch { /* capture not supported for this pointer */ }
    startY = event.clientY;
    samples = [{ y: event.clientY, time: now() }];
    dragging.value = true;
  }

  function onPointermove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    const time = now();
    samples.push({ y: event.clientY, time });
    // Keep the samples the velocity needs, plus one before the window.
    while (samples.length > 2 && time - samples[1].time > VELOCITY_WINDOW_MS) samples.shift();
    offset.value = Math.max(0, event.clientY - startY);
  }

  function onPointerup(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    samples.push({ y: event.clientY, time: now() });
    const distance = Math.max(0, event.clientY - startY);
    const close = shouldCloseSheet({
      distance,
      height: options.sheetHeight(),
      velocity: releaseVelocity(samples),
    });
    end();
    if (close) {
      options.onClose();
    } else {
      offset.value = 0;
    }
  }

  function onPointercancel(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    end();
    offset.value = 0;
  }

  return {
    offset,
    dragging,
    handlers: { onPointerdown, onPointermove, onPointerup, onPointercancel },
  };
}
