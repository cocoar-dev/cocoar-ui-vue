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
  dateKey,
  eventStartDateInZone,
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

  // Group events into connected overlap components. An event that
  // doesn't transitively overlap with any other event ends up in
  // its own component → full width (laneCount 1). A 3-deep overlap
  // cluster gets laneCount 3 only for the events INSIDE it; events
  // earlier or later in the day stay full-width.
  //
  // This matches Google / Outlook behaviour: width is local to the
  // overlap, not global to the day.
  //
  // Algorithm: sort by start, walk forward. A new component starts
  // when the next event's start is at or past the running max-end
  // of the current component. We use `>=` (not `>`) because events
  // touching at a shared boundary (a.end === b.start) do NOT
  // overlap and should land in different components.
  const sorted = projections
    .map((p, idx) => ({ ...p, idx }))
    .sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      // Tie-break by end DESC (matches the lane-coloring sort, keeps
      // long events visually anchored).
      return b.endMinutes - a.endMinutes;
    });

  type Component = typeof sorted;
  const components: Component[] = [];
  let current: Component = [];
  let maxEnd = -Infinity;
  for (const p of sorted) {
    if (p.startMinutes >= maxEnd) {
      if (current.length > 0) components.push(current);
      current = [p];
      maxEnd = p.endMinutes;
    } else {
      current.push(p);
      if (p.endMinutes > maxEnd) maxEnd = p.endMinutes;
    }
  }
  if (current.length > 0) components.push(current);

  // Run overlap layout per component. `overlapLayout` uses
  // INCLUSIVE-end columns; for the time grid we want HALF-OPEN
  // (an event ending at 09:30 doesn't conflict with one starting
  // at 09:30). Use `endMinutes - 1` as the inclusive end.
  const laneById = new Map<string, { lane: number; laneCount: number }>();
  for (const comp of components) {
    const intervals: IntervalInput[] = comp.map((p) => ({
      id: p.event.id,
      start: p.startMinutes,
      end: Math.max(p.startMinutes, p.endMinutes - 1),
    }));
    const result = layoutOverlappingIntervals(intervals);
    for (const bar of result.bars) {
      laneById.set(bar.id, { lane: bar.lane, laneCount: result.laneCount });
    }
  }

  return projections.map((p) => {
    const placement = laneById.get(p.event.id) ?? { lane: 0, laneCount: 1 };
    return {
      event: p.event,
      lane: placement.lane,
      laneCount: placement.laneCount,
      startMinutes: p.startMinutes,
      endMinutes: p.endMinutes,
      clippedTop: p.clippedTop,
      clippedBottom: p.clippedBottom,
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

// ─── All-day band layout ─────────────────────────────────────────────

/**
 * An all-day event positioned within a visible-day-range. Used by
 * the time grid's all-day band (above the hour grid) to render
 * multi-day events as horizontal bars spanning multiple day-columns.
 */
export interface AllDayBar<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  event: CalendarEvent<TMeta>;
  /** Lane (vertical row inside the band). 0 = topmost. */
  lane: number;
  /** Total lanes used. Caller picks the band height from this. */
  laneCount: number;
  /** First column the bar covers, 0-indexed. Inclusive. */
  startCol: number;
  /** Last column the bar covers, 0-indexed. Inclusive. */
  endCol: number;
  /** True when the event extends earlier than `days[0]`. */
  clippedStart: boolean;
  /** True when the event extends later than `days[days.length-1]`. */
  clippedEnd: boolean;
}

export interface AllDayBandOptions {
  /** Days to render (one column each). Length = number of columns. */
  days: ReadonlyArray<Temporal.PlainDate>;
  /**
   * Timezone used to bucket date-time events by local day. Date-only
   * events are timezone-independent.
   */
  timezone: string;
}

/**
 * Lay out all-day + multi-day events for a week / day view's
 * all-day band.
 *
 * Includes:
 *   - Events with `allDay: true`
 *   - Events with date-only `start` (no time component)
 *
 * Excludes (these go in the time grid):
 *   - Timed events that start AND end within a single visible day
 *   - Timed events with end-after-midnight (handled per-column by
 *     the time grid via clipping)
 *
 * For each included event, computes `[startCol, endCol]` clipped to
 * the visible day range, runs `layoutOverlappingIntervals`, returns
 * one `AllDayBar` per event.
 */
export function layoutAllDayBand<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  opts: AllDayBandOptions,
): AllDayBar<TMeta>[] {
  const { days } = opts;
  // `timezone` is reserved for future use when timed-multi-day events
  // get bucketed by local day; for now all-day events are date-only
  // and timezone-independent.
  void opts.timezone;
  if (days.length === 0) return [];

  // Map each visible day to its column index for O(1) lookup.
  const dayToCol = new Map<string, number>();
  for (let i = 0; i < days.length; i++) {
    dayToCol.set(dateKey(days[i]), i);
  }
  const lastDayKey = dateKey(days[days.length - 1]);

  type Projection<M extends Record<string, unknown>> = {
    event: CalendarEvent<M>;
    startCol: number;
    endCol: number;
    clippedStart: boolean;
    clippedEnd: boolean;
  };
  const projections: Projection<TMeta>[] = [];
  const seenIds = new Set<string>();

  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);

    const isAllDay =
      event.allDay === true || isDateOnlyIsoString(event.start);
    if (!isAllDay) continue;

    // Compute the event's first-day and last-day-inclusive in
    // calendar-day terms.
    const firstDay = parsePlainDateLoose(event.start);
    let lastDayInclusive: Temporal.PlainDate;
    if (event.end) {
      // RFC 5545: end is exclusive for date-only events.
      const endExcl = parsePlainDateLoose(event.end);
      lastDayInclusive = endExcl.subtract({ days: 1 });
      if (Temporal.PlainDate.compare(lastDayInclusive, firstDay) < 0) {
        lastDayInclusive = firstDay;
      }
    } else {
      lastDayInclusive = firstDay;
    }

    // Intersect with the visible window.
    const firstVisible = days[0];
    const lastVisible = days[days.length - 1];
    if (
      Temporal.PlainDate.compare(lastDayInclusive, firstVisible) < 0 ||
      Temporal.PlainDate.compare(firstDay, lastVisible) > 0
    ) {
      continue; // entirely outside the visible week
    }

    const visibleStart = Temporal.PlainDate.compare(firstDay, firstVisible) < 0 ? firstVisible : firstDay;
    const visibleEnd = Temporal.PlainDate.compare(lastDayInclusive, lastVisible) > 0 ? lastVisible : lastDayInclusive;

    const startCol = dayToCol.get(dateKey(visibleStart));
    const endCol = dayToCol.get(dateKey(visibleEnd));
    if (startCol === undefined || endCol === undefined) continue;

    projections.push({
      event,
      startCol,
      endCol,
      clippedStart: Temporal.PlainDate.compare(firstDay, firstVisible) < 0,
      clippedEnd: Temporal.PlainDate.compare(lastDayInclusive, lastVisible) > 0,
    });
  }

  if (projections.length === 0) return [];

  const intervals: IntervalInput[] = projections.map((p) => ({
    id: p.event.id,
    start: p.startCol,
    end: p.endCol,
  }));
  const layoutResult = layoutOverlappingIntervals(intervals);

  const laneById = new Map<string, number>();
  for (const bar of layoutResult.bars) laneById.set(bar.id, bar.lane);

  // Use lastDayKey to silence unused-var lint (it's referenced below
  // semantically but no direct read).
  void lastDayKey;

  return projections.map((p) => ({
    event: p.event,
    lane: laneById.get(p.event.id) ?? 0,
    laneCount: layoutResult.laneCount,
    startCol: p.startCol,
    endCol: p.endCol,
    clippedStart: p.clippedStart,
    clippedEnd: p.clippedEnd,
  }));
}

/** Loose plain-date parse: accepts 'YYYY-MM-DD' or a datetime string. */
function parsePlainDateLoose(iso: string): Temporal.PlainDate {
  if (isDateOnlyIsoString(iso)) return Temporal.PlainDate.from(iso);
  return eventStartDateInZone(iso, 'UTC');
}

// ─── Internal helper for time-grid (existing) ────────────────────────

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
