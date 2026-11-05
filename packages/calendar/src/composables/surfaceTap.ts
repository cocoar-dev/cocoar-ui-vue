/**
 * Tap gating for the click hooks (`onDateClick`, `onTimeClick`, and
 * `onEventClick` on list rows; draggable events use `afterFollowingClick`
 * from the drag runtime's release).
 *
 * Those hooks are wired on `pointerdown` so a mouse press reacts at
 * once. On a touch screen, though, every scroll also begins with a
 * finger going down on a cell — firing there opens the day under the
 * finger before the user even moved. So for touch and pen the action
 * waits for a TAP:
 *
 *   - the pointer lifts within `TAP_SLOP_PX` of where it went down,
 *   - the browser did not take the touch for scrolling (`pointercancel`),
 *   - and the `click` that follows the lift has been dispatched.
 *
 * The last point matters: the browser sends that `click` 50–150 ms
 * after the lift. Acting on `pointerup` lets an overlay the handler
 * opens (a sheet with a backdrop) receive that click and close at once.
 * So the action runs in a task after the click; some WebViews leave the
 * click out, hence the `CLICK_WAIT_MS` fallback.
 */

/** Travel (px, either axis) below which a release still counts as a tap. */
export const TAP_SLOP_PX = 10;
/** How long to wait for the click after the lift before acting anyway. */
export const CLICK_WAIT_MS = 350;

/**
 * Run `action` once the `click` that follows a touch lift has passed
 * (or after `CLICK_WAIT_MS` when no click comes). Call it from the
 * `pointerup` of a tap.
 */
export function afterFollowingClick(action: () => void): void {
  if (typeof window === 'undefined') {
    action();
    return;
  }
  const options = { capture: true } as const;
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener('click', run, options);
    clearTimeout(fallback);
    // A task, not a microtask: the click is still being dispatched
    // when the capture listener runs, and listeners the action adds
    // (an overlay's outside-click handler) must not see it.
    setTimeout(action, 0);
  };
  const fallback = setTimeout(run, CLICK_WAIT_MS);
  window.addEventListener('click', run, options);
}

/**
 * Route a surface `pointerdown` to `action`: at once for a mouse,
 * after a tap (see above) for touch and pen. The mouse path keeps its
 * existing semantics unchanged.
 */
export function onSurfacePointerdown(e: PointerEvent, action: () => void): void {
  // Only real touch / pen pointers are gated. Mouse — and synthetic
  // events with an empty `pointerType` — act at once, as before.
  if ((e.pointerType !== 'touch' && e.pointerType !== 'pen') || typeof window === 'undefined') {
    action();
    return;
  }
  const id = e.pointerId;
  const x = e.clientX;
  const y = e.clientY;
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    if (Math.abs(ev.clientX - x) > TAP_SLOP_PX || Math.abs(ev.clientY - y) > TAP_SLOP_PX) stop();
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    stop();
    if (Math.abs(ev.clientX - x) > TAP_SLOP_PX || Math.abs(ev.clientY - y) > TAP_SLOP_PX) return;
    afterFollowingClick(action);
  };
  const cancel = (ev: PointerEvent) => {
    if (ev.pointerId === id) stop();
  };
  function stop() {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', cancel, true);
  }
  window.addEventListener('pointermove', move, { capture: true, passive: true });
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', cancel, true);
}
