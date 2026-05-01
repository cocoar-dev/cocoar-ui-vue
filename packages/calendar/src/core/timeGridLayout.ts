/**
 * Pure-function layout for time-grid views (Day, Week).
 *
 * Given a list of events on a single day, this layer:
 *
 *   1. Filters to those that intersect the day's visible time range.
 *   2. Clips events to the time range (a 23:00-25:00 event becomes a
 *      23:00-24:00 visible bar; the part past midnight belongs to the
 *      next day's column).
 *   3. Computes per-event start/end minute offsets from the day start.
 *   4. Runs `layoutOverlappingIntervals` on those minute intervals to
 *      produce lane assignments — overlapping events split the column
 *      width into equal slices.
 *
 * Output is a list of `PositionedEvent` records the component can
 * map directly to absolute-position transforms.
 *
 * ── Why minute-precision intervals into the interval-graph layout ──
 *
 * `overlapLayout` works on integer columns. We use minute-precision
 * (an event starting at 09:00 has start=540, ending 09:30 has end=569
 * — inclusive end). That's exactly granular enough for any calendar
 * UI (seconds don't matter for visual lane assignment); coarser
 * (e.g. quarter-hour) would coalesce near-misses incorrectly.
 *
 * ── No DOM, no Vue ──
 *
 * Pure TypeScript; the consumer maps minutes → pixels at render time
 * via a simple `pixelsPerMinute = pixelsPerHour / 60`.
 */

import type { CalendarEvent } from './types';
import {
  layoutOverlappingIntervals,
  type IntervalInput,
} from './overlapLayout';
import {
  Temporal,
  parseEventInstant,
  isDateOnlyIsoString,
} from './temporal';

export interface PositionedEvent<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** The event itself (flyweight; consumer can render it). */
  event: CalendarEvent<TMeta>;
  /** Lane within the day column. 0 is leftmost. */
  lane: number;
  /** Total lanes used in this day. width per lane = 1 / laneCount. */
  laneCount: number;
  /**
   * Minutes from `dayStartHour * 60` to the event's visible start.
   * `0` = event begins at the top of the time range.
   */
  startMinutes: number;
  /**
   * Minutes from `dayStartHour * 60` to the event's visible end.
   * Strictly greater than `startMinutes`. Always within
   * `[0, (dayEndHour - dayStartHour) * 60]`.
   */
  endMinutes: number;
  /**
   * True when the event was clipped at the top of the day range
   * (its real start is before `dayStartHour`).
   */
  clippedTop: boolean;
  /**
   * True when the event was clipped at the bottom (real end is past
   * `dayEndHour`).
   */
  clippedBottom: boolean;
}

export interface DayLayoutOptions {
  /** The day this layout is for. */
  day: Temporal.PlainDate;
  /** Visible hour range. `[6, 22]` = 6 AM to 10 PM. */
  timeRange: [number, number];
  /** IANA timezone for resolving timed events. */
  timezone: string;
}

/**
 * Layout all timed events for a single day. Returns one
 * `PositionedEvent` per event that intersects the visible time
 * range, with lane assignments for overlap resolution.
 *
 * All-day events and events outside the time range are excluded;
 * those belong to a separate all-day band, rendered above the time
 * grid by week / day views.
 */
export function layoutDayEvents<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  opts: DayLayoutOptions,
): PositionedEvent<TMeta>[] {
  const { day, timeRange, timezone } = opts;
  const [startHour, endHour] = timeRange;
  const dayStartMin = startHour * 60;
  const dayEndMin = endHour * 60;
  const totalMin = dayEndMin - dayStartMin;

  if (totalMin <= 0) return [];

  // Filter + project to visible-on-this-day intervals.
  type Projection<M extends Record<string, unknown>> = {
    event: CalendarEvent<M>;
    startMinutes: number;
    endMinutes: number;
    clippedTop: boolean;
    clippedBottom: boolean;
  };
  const projections: Projection<TMeta>[] = [];

  // Dedupe by id — the EventIndex enforces uniqueness upstream, but
  // we don't want duplicate inputs to silently mis-color (the
  // `Map<id, lane>` we build below is last-write-wins, which would
  // pin both copies to one lane).
  const seenIds = new Set<string>();
  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);

    const allDay = event.allDay === true || isDateOnlyIsoString(event.start);
    if (allDay) continue; // not handled by the time grid

    // Resolve start and end as minute-of-day-on-`day`.
    const startMin = projectToDayMinute(event.start, day, timezone);
    if (startMin === null) {
      // Event doesn't even start on this day or before. Could still
      // be visible (multi-day event). Treat the start as "at the top
      // of the day" if event covers this day.
    }

    const endMin = event.end
      ? projectToDayMinute(event.end, day, timezone)
      : startMin !== null
        ? startMin + 30 // default 30-min slot
        : null;

    // Compute the on-day visible window in minutes-from-midnight.
    // Events fully outside this day → null start / null end → skip.
    const onDayStart = startMin === null ? -Infinity : startMin;
    const onDayEnd = endMin === null ? Infinity : endMin;

    // Both bounds must intersect this day's calendar boundaries.
    // If startMin null AND endMin null → event isn't on this day.
    if (startMin === null && endMin === null) continue;

    // Clip to visible time range.
    let visStart = Math.max(onDayStart, dayStartMin);
    let visEnd = Math.min(onDayEnd, dayEndMin);

    // For multi-day events that extend past midnight, the "next-day"
    // portion belongs to the next day's column. Cap at midnight.
    if (visEnd > 24 * 60) visEnd = Math.min(visEnd, 24 * 60);
    if (visStart < 0) visStart = 0;

    // Skip if no visible portion remains.
    if (visEnd <= visStart) continue;
    if (visEnd <= dayStartMin || visStart >= dayEndMin) continue;

    projections.push({
      event,
      startMinutes: visStart - dayStartMin,
      endMinutes: visEnd - dayStartMin,
      clippedTop: onDayStart < dayStartMin,
      clippedBottom: onDayEnd > dayEndMin,
    });
  }

  if (projections.length === 0) return [];

  // Run overlap layout on minute intervals. `overlapLayout` uses
  // INCLUSIVE-end columns; for time-grid we want HALF-OPEN (an
  // event ending at 09:30 doesn't conflict with one starting at
  // 09:30). Use `endMinutes - 1` as the inclusive-end index.
  const intervals: IntervalInput[] = projections.map((p) => ({
    id: p.event.id,
    start: p.startMinutes,
    end: Math.max(p.startMinutes, p.endMinutes - 1),
  }));
  const layoutResult = layoutOverlappingIntervals(intervals);

  const laneById = new Map<string, number>();
  for (const bar of layoutResult.bars) laneById.set(bar.id, bar.lane);

  return projections.map((p) => ({
    event: p.event,
    lane: laneById.get(p.event.id) ?? 0,
    laneCount: layoutResult.laneCount,
    startMinutes: p.startMinutes,
    endMinutes: p.endMinutes,
    clippedTop: p.clippedTop,
    clippedBottom: p.clippedBottom,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Project an ISO date/datetime string to a minute-of-day for a
 * specific calendar day in a specific timezone.
 *
 * Returns `null` when the instant doesn't fall on `day` (the event
 * is entirely on a different day); also `null` for date-only ISO
 * strings (those represent all-day events, handled elsewhere).
 */
function projectToDayMinute(
  iso: string,
  day: Temporal.PlainDate,
  timezone: string,
): number | null {
  if (isDateOnlyIsoString(iso)) return null;
  const parsed = parseEventInstant(iso);

  let zdt: Temporal.ZonedDateTime;
  if (parsed.kind === 'instant') {
    zdt = parsed.instant.toZonedDateTimeISO(timezone);
  } else if (parsed.kind === 'plain') {
    // Plain DateTime — interpret as wall-clock time in the configured
    // zone. (The alternative is "UTC interpretation" but consumers
    // who want that should pass `Z` or an offset.)
    zdt = parsed.plainDateTime.toZonedDateTime(timezone);
  } else {
    return null;
  }

  // Day boundaries in the same zone.
  const dayStart = day.toZonedDateTime({ timeZone: timezone, plainTime: undefined });
  const dayEnd = dayStart.add({ days: 1 });

  if (Temporal.ZonedDateTime.compare(zdt, dayStart) < 0) {
    // Before the day starts — return "before the day", i.e. negative
    // minute. The caller's clip logic handles this: a multi-day
    // event whose start is yesterday but covers today renders as
    // starting at the top of today's column (clippedTop: true).
    return -1;
  }
  if (Temporal.ZonedDateTime.compare(zdt, dayEnd) >= 0) {
    // After the day ends.
    return 24 * 60 + 1;
  }

  return zdt.hour * 60 + zdt.minute + zdt.second / 60;
}
