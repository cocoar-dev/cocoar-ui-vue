/**
 * Did a DOM event start inside a rendered calendar event element
 * (month pill / month bar / time-grid card / all-day bar)?
 *
 * The empty-surface hooks (`onDateClick`, `onTimeClick`) are wired
 * on cells and columns via `pointerdown`, and an event element sits
 * INSIDE that cell — so its pointerdown bubbles up and the cell would
 * report a "click on empty space" for what was really a click on an
 * event. Stopping propagation at the event element is not an option:
 * the overlay service's outside-click detection and the drag runtime
 * both listen further up. So the cell asks where the event started.
 *
 * Interactive event elements carry `data-event-id` (set only for the
 * `live` / keyboard-preview variants); phantoms and ghosts do not and
 * are `pointer-events: none` anyway.
 */
export function originatesFromEvent(e: Event): boolean {
  const target = e.target;
  return target instanceof Element && target.closest('[data-event-id]') !== null;
}
