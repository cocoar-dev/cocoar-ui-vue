/**
 * Pure-function layout for the agenda view.
 *
 * The agenda is a vertical chronological list. Conceptually it's
 * just events sorted by start, grouped by day, with a header row
 * before each day's events. We flatten that into a single array of
 * `AgendaItem`s — alternating headers and event rows — so the
 * virtualizing surface (VirtualizedSurface1DY) can render them
 * uniformly via one slot.
 *
 * Why a flat array, not a nested {day, events}[] structure:
 *   - Virtual scroll needs ONE index space. Flattening lets us
 *     virtualize day-headers along with event rows without
 *     special-casing.
 *   - Sticky header behaviour (CSS `position: sticky`) wants the
 *     header to be a sibling of the events it heads, not a parent.
 *
 * Sorting:
 *   - Days appear in chronological order (start ascending).
 *   - Within a day, events are ordered by start time, then by id
 *     for determinism.
 *
 * All-day events are surfaced first within a day's group (they
 * conventionally read as "the day's frame"); timed events follow
 * in chronological order.
 *
 * Multi-day events appear in EVERY day they touch within the
 * range. The consumer can elide repeats via the `meta.isContinuation`
 * flag set on each non-first appearance.
 */

import type { CalendarEvent } from './types';
import { isAllDayEvent } from './types';
import { Temporal, dateKey, eventStartDateInZone } from './temporal';

// ─── Output types ────────────────────────────────────────────────────

/** A row in the agenda's flat list. */
export type AgendaItem<TMeta extends Record<string, unknown> = Record<string, unknown>> =
  | AgendaHeaderItem
  | AgendaEventItem<TMeta>;

export interface AgendaHeaderItem {
  kind: 'header';
  /** The day this header introduces. ISO date string. */
  date: string;
  /** True if there are no events on this day (`showEmptyDays` mode). */
  isEmpty: boolean;
  /** Stable key for v-for. */
  key: string;
}

export interface AgendaEventItem<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  kind: 'event';
  /** The day this row belongs to. ISO date string. */
  date: string;
  event: CalendarEvent<TMeta>;
  /**
   * True when this row is a multi-day event's continuation (i.e. the
   * event's first day was earlier in the range). Consumers that want
   * to elide continuations can filter on this.
   */
  isContinuation: boolean;
  /** Stable key for v-for, unique within the rendered range. */
  key: string;
}

// ─── Inputs ──────────────────────────────────────────────────────────

export interface AgendaLayoutOptions {
  /** Range start, inclusive. ISO date string `'YYYY-MM-DD'`. */
  rangeStart: string;
  /** Range end, exclusive. ISO date string. */
  rangeEnd: string;
  /** IANA timezone for resolving timed events. */
  timezone: string;
  /**
   * Render a header even on days without any events. Default false —
   * empty days are omitted from the agenda.
   */
  showEmptyDays?: boolean;
}

// ─── Main function ───────────────────────────────────────────────────

/**
 * Flatten a list of events into an `AgendaItem[]` for rendering.
 *
 * Pure: same input → same output, byte-for-byte. Independent of
 * input order (events are deterministically sorted internally).
 */
export function buildAgendaItems<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  opts: AgendaLayoutOptions,
): AgendaItem<TMeta>[] {
  const { rangeStart, rangeEnd, timezone, showEmptyDays = false } = opts;
  const rangeStartDate = Temporal.PlainDate.from(rangeStart);
  const rangeEndDate = Temporal.PlainDate.from(rangeEnd); // exclusive

  if (Temporal.PlainDate.compare(rangeEndDate, rangeStartDate) <= 0) {
    return [];
  }

  // Bucket events by day. Multi-day events occupy every day they
  // touch within the range (with `isContinuation: true` for non-first
  // appearances).
  type Bucket = {
    allDay: { event: CalendarEvent<TMeta>; isContinuation: boolean }[];
    timed: { event: CalendarEvent<TMeta>; startMs: number; isContinuation: boolean }[];
  };
  const buckets = new Map<string, Bucket>();
  const seenIds = new Set<string>();

  function ensureBucket(key: string): Bucket {
    let b = buckets.get(key);
    if (!b) {
      b = { allDay: [], timed: [] };
      buckets.set(key, b);
    }
    return b;
  }

  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);

    const allDay = isAllDayEvent(event);

    const { firstDay, lastDayInclusive } = resolveAgendaSpan(event, timezone);

    // Intersect with [rangeStart, rangeEnd).
    const visStart =
      Temporal.PlainDate.compare(firstDay, rangeStartDate) < 0
        ? rangeStartDate
        : firstDay;
    const lastVisible = rangeEndDate.subtract({ days: 1 });
    const visEnd =
      Temporal.PlainDate.compare(lastDayInclusive, lastVisible) > 0
        ? lastVisible
        : lastDayInclusive;
    if (Temporal.PlainDate.compare(visEnd, visStart) < 0) continue;

    let cur = visStart;
    let isFirstForRange = true;
    while (Temporal.PlainDate.compare(cur, visEnd) <= 0) {
      const dayK = dateKey(cur);
      const bucket = ensureBucket(dayK);
      // `isContinuation` is true for any day that is NOT the event's
      // first day OVERALL (not just within the visible range — a
      // user opening agenda on day 2 of a 5-day event still sees a
      // continuation row on day 2).
      const isContinuation =
        Temporal.PlainDate.compare(cur, firstDay) > 0 || !isFirstForRange;
      if (allDay) {
        bucket.allDay.push({ event, isContinuation });
      } else {
        // Timed events anchor to the start day's wall-clock time;
        // continuation days (multi-day timed events) get sorted to
        // the top of their day.
        const startMs = isContinuation
          ? -Infinity
          : eventStartTimestamp(event, timezone);
        bucket.timed.push({ event, startMs, isContinuation });
      }
      isFirstForRange = false;
      cur = cur.add({ days: 1 });
    }
  }

  // Walk the range chronologically, emit header + sorted events per day.
  const items: AgendaItem<TMeta>[] = [];
  let cur = rangeStartDate;
  while (Temporal.PlainDate.compare(cur, rangeEndDate) < 0) {
    const dayK = dateKey(cur);
    const bucket = buckets.get(dayK);
    const hasEvents = !!bucket && (bucket.allDay.length > 0 || bucket.timed.length > 0);

    if (hasEvents || showEmptyDays) {
      items.push({
        kind: 'header',
        date: dayK,
        isEmpty: !hasEvents,
        key: `h-${dayK}`,
      });

      if (bucket) {
        // Sort all-day stably by id.
        bucket.allDay.sort((a, b) =>
          a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0,
        );
        for (const a of bucket.allDay) {
          items.push({
            kind: 'event',
            date: dayK,
            event: a.event,
            isContinuation: a.isContinuation,
            key: `e-${dayK}-${a.event.id}`,
          });
        }
        // Sort timed by startMs ASC, then id.
        bucket.timed.sort((a, b) => {
          if (a.startMs !== b.startMs) return a.startMs - b.startMs;
          return a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0;
        });
        for (const t of bucket.timed) {
          items.push({
            kind: 'event',
            date: dayK,
            event: t.event,
            isContinuation: t.isContinuation,
            key: `e-${dayK}-${t.event.id}`,
          });
        }
      }
    }
    cur = cur.add({ days: 1 });
  }

  return items;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Resolve the calendar-day span of an event for agenda bucketing. */
function resolveAgendaSpan(
  event: CalendarEvent,
  timezone: string,
): { firstDay: Temporal.PlainDate; lastDayInclusive: Temporal.PlainDate } {
  if (isAllDayEvent(event)) {
    const firstDay = event.start;
    let lastDayInclusive: Temporal.PlainDate;
    if (event.end) {
      const endExcl = event.end;
      lastDayInclusive = endExcl.subtract({ days: 1 });
      if (Temporal.PlainDate.compare(lastDayInclusive, firstDay) < 0) {
        lastDayInclusive = firstDay;
      }
    } else {
      lastDayInclusive = firstDay;
    }
    return { firstDay, lastDayInclusive };
  }

  // Timed — bucket in the display zone.
  const startDay = eventStartDateInZone(event.start, timezone);
  let lastDay = startDay;
  if (event.end) {
    const endZdt = (event.end as Temporal.ZonedDateTime).withTimeZone(timezone);
    const endDay = endZdt.toPlainDate();
    // For timed events, an end exactly at midnight belongs to the
    // previous day per RFC 5545's exclusive convention. Keep this
    // consistent with the time-grid.
    const endsAtMidnight =
      endZdt.hour === 0 &&
      endZdt.minute === 0 &&
      endZdt.second === 0 &&
      endZdt.millisecond === 0 &&
      endZdt.microsecond === 0 &&
      endZdt.nanosecond === 0;
    if (endsAtMidnight) {
      lastDay = endDay.subtract({ days: 1 });
      if (Temporal.PlainDate.compare(lastDay, startDay) < 0) lastDay = startDay;
    } else {
      lastDay = endDay;
    }
  }
  return { firstDay: startDay, lastDayInclusive: lastDay };
}

function eventStartTimestamp(event: CalendarEvent, timezone: string): number {
  if (isAllDayEvent(event)) {
    return event.start.toZonedDateTime({ timeZone: timezone }).epochMilliseconds;
  }
  return (event.start as Temporal.ZonedDateTime).epochMilliseconds;
}
