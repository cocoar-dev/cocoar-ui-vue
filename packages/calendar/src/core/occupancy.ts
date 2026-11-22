/**
 * Who is busy when, and where a day has room. Pure functions over
 * events: what a resource or a period means is up to the host.
 *
 * Times of day are minutes (0–1440) because the end of an evening is
 * 24:00, which `Temporal.PlainTime` cannot express. They are wall-clock
 * times in the display zone, so a period keeps its meaning on the
 * 23- and 25-hour days of a DST change.
 */

import { Temporal } from './temporal';
import { isTimedEvent, type CalendarEvent } from './types';

/** A part of the day, `[startMinutes, endMinutes)`. */
export interface CalendarPeriod {
  key: string;
  startMinutes: number;
  endMinutes: number;
  /**
   * Where an event dropped into this period starts on a board. Default
   * `startMinutes`. Set it when the period begins at a time nobody
   * means, such as a morning from 00:00.
   */
  dropMinutes?: number;
}

export interface OccupancyOptions<TMeta extends Record<string, unknown>> {
  dates: ReadonlyArray<Temporal.PlainDate>;
  periods: ReadonlyArray<CalendarPeriod>;
  /** Resource ids, in the order results are reported. */
  resources: ReadonlyArray<string>;
  /** Display zone. */
  timezone: string;
  resourcesOf: (event: CalendarEvent<TMeta>) => ReadonlyArray<string>;
  /** Does this event make its resources busy? Default: events with a time. */
  counts?: (event: CalendarEvent<TMeta>) => boolean;
}

export interface Occupancy {
  /** Resources busy in the period, in the order of `resources`. */
  busyResources(date: Temporal.PlainDate, periodKey: string): string[];
  /** Is none of `resourceIds` busy in the period? */
  isFree(
    date: Temporal.PlainDate,
    periodKey: string,
    resourceIds: ReadonlyArray<string>,
  ): boolean;
}

/** The instant of a wall-clock minute of a day; 1440 is the next midnight. */
function instantAt(date: Temporal.PlainDate, minutes: number, timezone: string): number {
  const day = date.add({ days: Math.floor(minutes / 1440) });
  const rest = minutes - Math.floor(minutes / 1440) * 1440;
  return day.toZonedDateTime({
    timeZone: timezone,
    plainTime: new Temporal.PlainTime(Math.floor(rest / 60), rest % 60),
  }).epochMilliseconds;
}

function timedBounds(event: {
  start: Temporal.ZonedDateTime | Temporal.PlainDate;
  end?: Temporal.ZonedDateTime | Temporal.PlainDate;
}): { start: number; end: number } | null {
  if (!(event.start instanceof Temporal.ZonedDateTime)) return null;
  const end =
    event.end instanceof Temporal.ZonedDateTime ? event.end : event.start.add({ minutes: 30 });
  return { start: event.start.epochMilliseconds, end: end.epochMilliseconds };
}

/** An all-day entry a host chose to count covers its days, end exclusive. */
function allDayBounds(
  event: { start: Temporal.ZonedDateTime | Temporal.PlainDate; end?: Temporal.ZonedDateTime | Temporal.PlainDate },
  timezone: string,
): { start: number; end: number } {
  const first = event.start as Temporal.PlainDate;
  const end = event.end instanceof Temporal.PlainDate ? event.end : first.add({ days: 1 });
  return { start: instantAt(first, 0, timezone), end: instantAt(end, 0, timezone) };
}

const slotKey = (date: Temporal.PlainDate, periodKey: string) => `${date.toString()}|${periodKey}`;

/**
 * Who is busy in each period of each day. A resource is busy when one
 * of its events overlaps the period; intervals are half-open, so an
 * event ending at 18:00 leaves an evening from 18:00 free.
 */
export function computeOccupancy<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  options: OccupancyOptions<TMeta>,
): Occupancy {
  const { dates, periods, resources, timezone, resourcesOf } = options;
  const counts = options.counts ?? isTimedEvent;
  const known = new Set(resources);
  const slots = dates.flatMap((date) =>
    periods.map((period) => ({
      key: slotKey(date, period.key),
      start: instantAt(date, period.startMinutes, timezone),
      end: instantAt(date, period.endMinutes, timezone),
    })),
  );
  const busy = new Map<string, Set<string>>();

  for (const event of events) {
    if (!counts(event)) continue;
    const bounds = timedBounds(event) ?? allDayBounds(event, timezone);
    const ids = resourcesOf(event).filter((id) => known.has(id));
    if (ids.length === 0) continue;
    for (const slot of slots) {
      if (bounds.start >= slot.end || bounds.end <= slot.start) continue;
      let set = busy.get(slot.key);
      if (!set) busy.set(slot.key, (set = new Set()));
      for (const id of ids) set.add(id);
    }
  }

  return {
    busyResources(date, periodKey) {
      const set = busy.get(slotKey(date, periodKey));
      return set ? resources.filter((id) => set.has(id)) : [];
    },
    isFree(date, periodKey, resourceIds) {
      const set = busy.get(slotKey(date, periodKey));
      return !set || resourceIds.every((id) => !set.has(id));
    },
  };
}

export interface DayGapOptions {
  date: Temporal.PlainDate;
  /** Display zone. */
  timezone: string;
  /** Start of the part of the day to look at. Default 0. */
  fromMinutes?: number;
  /** End of the part of the day to look at. Default 1440. */
  toMinutes?: number;
  /** Shorter gaps are left out. Default 1. */
  minMinutes?: number;
}

export interface DayGap {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  /** Elapsed minutes, also across a DST change. */
  minutes: number;
}

/**
 * The gaps between the entries of a day. Overlapping entries are
 * merged. The time before the first and after the last entry is not
 * a gap. All-day entries take no time and are ignored.
 */
export function findDayGaps(
  intervals: ReadonlyArray<{
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
  }>,
  options: DayGapOptions,
): DayGap[] {
  const { date, timezone, fromMinutes = 0, toMinutes = 1440, minMinutes = 1 } = options;
  const from = instantAt(date, fromMinutes, timezone);
  const to = instantAt(date, toMinutes, timezone);
  const clipped = intervals
    .flatMap((interval) => {
      const bounds = timedBounds(interval);
      if (!bounds || bounds.end <= from || bounds.start >= to) return [];
      return [{ start: Math.max(bounds.start, from), end: Math.min(bounds.end, to) }];
    })
    .sort((a, b) => a.start - b.start);

  const gaps: DayGap[] = [];
  let reached: number | null = null;
  for (const entry of clipped) {
    if (reached !== null && entry.start > reached) {
      const minutes = Math.round((entry.start - reached) / 60_000);
      if (minutes >= minMinutes) {
        gaps.push({
          start: Temporal.Instant.fromEpochMilliseconds(reached).toZonedDateTimeISO(timezone),
          end: Temporal.Instant.fromEpochMilliseconds(entry.start).toZonedDateTimeISO(timezone),
          minutes,
        });
      }
    }
    reached = reached === null ? entry.end : Math.max(reached, entry.end);
  }
  return gaps;
}
