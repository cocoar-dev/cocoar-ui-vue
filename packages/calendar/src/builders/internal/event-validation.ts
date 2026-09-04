/**
 * C1 boundary validation with per-object memoization.
 *
 * Every event that reaches the builder — from `events()`, from a
 * loader result, from a series expansion — passes
 * `validateCalendarEvent` exactly once. A `WeakSet` remembers the
 * objects already checked so re-renders of the same array don't
 * re-walk it; consumers who recreate event objects on every render
 * pay the (cheap — a few `instanceof` checks) cost every render.
 */

import { validateCalendarEvent, type CalendarEvent } from '../../core';

export class EventValidator<TMeta extends Record<string, unknown>> {
  private readonly _validated = new WeakSet<object>();

  /**
   * Throws on the first bad event with `validateCalendarEvent`'s
   * error (which names the event id). The loader path catches this
   * and logs without caching; the events-source path lets it
   * propagate so the consumer's setup fails loudly (Article 9 —
   * silent partial-render hiding bad data is the worse outcome).
   */
  validate(events: ReadonlyArray<CalendarEvent<TMeta>>): void {
    for (const event of events) {
      if (typeof event !== 'object' || event === null) {
        throw new TypeError(
          `[CalendarBuilder] events array contains a non-object entry: ${String(event)}. Each entry must be a CalendarEvent.`,
        );
      }
      if (this._validated.has(event)) continue;
      validateCalendarEvent(event as CalendarEvent);
      this._validated.add(event);
    }
  }
}
