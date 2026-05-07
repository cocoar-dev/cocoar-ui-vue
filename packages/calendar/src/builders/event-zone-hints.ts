/**
 * Helpers for surfacing **per-endpoint zone semantics** on event-card
 * defaults — the visible payoff of invariants C3 (source zone preserved
 * per-endpoint) and C5 (display zone vs source zone separate).
 *
 * The library's default renderers branch on these to add:
 *
 *   - A **globe icon** when `start.timeZoneId === 'UTC'`. Article 5
 *     calls UTC-anchored events "global" — the same instant worldwide
 *     (product launches, livestreams). Without a hint they look like
 *     they live in the user's display zone, which obscures the intent.
 *   - A **cross-zone hint** when `start.timeZoneId` differs from the
 *     calendar's display zone (and isn't UTC). Article 3's fairness
 *     contract says we render the event on the user's clock — the hint
 *     lets the user see WHERE the event actually lives without having
 *     to inspect the data layer.
 *
 * Both hints are rendered visually via tooltips and announced for
 * screen readers via an inline sr-only span. Consumers writing a custom
 * `eventRenderer` can call `getEventZoneHints(...)` to surface the same
 * semantics with their own visual treatment.
 *
 * @see Article 3 — display-zone fairness
 * @see Article 5 — global / "same instant worldwide" events
 */

import { Temporal } from '../core';
import type { CalendarEvent } from '../core';

export interface EventZoneHints {
  /** True when the timed event's source zone is `'UTC'`. */
  isUtcAnchored: boolean;
  /**
   * The event's source `timeZoneId` IF it differs from the display
   * zone AND the event is NOT UTC-anchored (UTC-anchored gets its own
   * "global" hint, separate semantic). `null` otherwise.
   */
  sourceZone: string | null;
}

const NO_HINTS: EventZoneHints = { isUtcAnchored: false, sourceZone: null };

/**
 * Compute zone-hint flags for the calendar's default decoration layer.
 *
 * All-day events (`start instanceof Temporal.PlainDate`) have no zone
 * by definition — they return `NO_HINTS` so callers can short-circuit
 * before rendering any decoration.
 */
export function getEventZoneHints(
  event: CalendarEvent,
  displayZone: string | undefined,
): EventZoneHints {
  if (!(event.start instanceof Temporal.ZonedDateTime)) return NO_HINTS;
  const sourceTz = event.start.timeZoneId;
  if (sourceTz === 'UTC') return { isUtcAnchored: true, sourceZone: null };
  if (!displayZone || sourceTz === displayZone) return NO_HINTS;
  return { isUtcAnchored: false, sourceZone: sourceTz };
}
