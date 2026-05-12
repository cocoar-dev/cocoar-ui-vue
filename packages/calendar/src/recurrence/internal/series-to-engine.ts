/**
 * `RecurringSeries → EngineSeries` adapter.
 *
 * Lifts the public Temporal-typed series into the engine wire format
 * (plain components + tzid). Discriminates timed vs all-day by
 * `dtstart`'s value class and validates per-endpoint shape — mixed
 * timed/all-day RDATE on a timed series throws at the boundary.
 *
 * Pure function, no engine knowledge.
 */

import { Temporal } from '@js-temporal/polyfill';
import type { RecurringSeries } from '../../core/types';
import type {
  EngineSeries,
  WallclockDate,
  WallclockTimed,
} from '../types';

export function seriesToEngineSeries<TMeta extends Record<string, unknown>>(
  series: RecurringSeries<TMeta>,
): EngineSeries {
  if (series.dtstart instanceof Temporal.ZonedDateTime) {
    return seriesToTimed(series, series.dtstart);
  }
  if (series.dtstart instanceof Temporal.PlainDate) {
    return seriesToAllDay(series, series.dtstart);
  }
  throw new TypeError(
    `[${series.id}] dtstart must be Temporal.ZonedDateTime (timed) or Temporal.PlainDate (all-day). ` +
      `Got ${(series.dtstart as object | null)?.constructor?.name ?? typeof series.dtstart}.`,
  );
}

function seriesToTimed<TMeta extends Record<string, unknown>>(
  series: RecurringSeries<TMeta>,
  dtstart: Temporal.ZonedDateTime,
): EngineSeries {
  const rdates: WallclockTimed[] = [];
  if (series.rdate) {
    for (let i = 0; i < series.rdate.length; i++) {
      const r = series.rdate[i];
      if (!(r instanceof Temporal.ZonedDateTime)) {
        throw new TypeError(
          `[${series.id}] rdate[${i}] must be Temporal.ZonedDateTime for a timed series ` +
            `(dtstart is ZonedDateTime). Got ${(r as object | null)?.constructor?.name ?? typeof r}.`,
        );
      }
      rdates.push(zdtToWallclockTimed(r));
    }
  }

  const exdates: WallclockTimed[] = [];
  if (series.exdate) {
    for (let i = 0; i < series.exdate.length; i++) {
      const ex = series.exdate[i];
      if (!(ex instanceof Temporal.ZonedDateTime)) {
        throw new TypeError(
          `[${series.id}] exdate[${i}] must be Temporal.ZonedDateTime for a timed series ` +
            `(dtstart is ZonedDateTime). Got ${(ex as object | null)?.constructor?.name ?? typeof ex}.`,
        );
      }
      exdates.push(zdtToWallclockTimed(ex));
    }
  }

  return {
    seriesId: series.id,
    kind: 'timed',
    dtstart: zdtToWallclockTimed(dtstart),
    rules: [{ rrule: series.rrule }],
    rdates,
    exdates,
  };
}

function seriesToAllDay<TMeta extends Record<string, unknown>>(
  series: RecurringSeries<TMeta>,
  dtstart: Temporal.PlainDate,
): EngineSeries {
  const rdates: WallclockDate[] = [];
  if (series.rdate) {
    for (let i = 0; i < series.rdate.length; i++) {
      const r = series.rdate[i];
      if (!(r instanceof Temporal.PlainDate)) {
        throw new TypeError(
          `[${series.id}] rdate[${i}] must be Temporal.PlainDate for an all-day series ` +
            `(dtstart is PlainDate). Got ${(r as object | null)?.constructor?.name ?? typeof r}.`,
        );
      }
      rdates.push(plainDateToWallclock(r));
    }
  }

  const exdates: WallclockDate[] = [];
  if (series.exdate) {
    for (let i = 0; i < series.exdate.length; i++) {
      const ex = series.exdate[i];
      if (!(ex instanceof Temporal.PlainDate)) {
        throw new TypeError(
          `[${series.id}] exdate[${i}] must be Temporal.PlainDate for an all-day series ` +
            `(dtstart is PlainDate). Got ${(ex as object | null)?.constructor?.name ?? typeof ex}.`,
        );
      }
      exdates.push(plainDateToWallclock(ex));
    }
  }

  return {
    seriesId: series.id,
    kind: 'allDay',
    dtstart: plainDateToWallclock(dtstart),
    rules: [{ rrule: series.rrule }],
    rdates,
    exdates,
  };
}

function zdtToWallclockTimed(zdt: Temporal.ZonedDateTime): WallclockTimed {
  return {
    year: zdt.year,
    month: zdt.month,
    day: zdt.day,
    hour: zdt.hour,
    minute: zdt.minute,
    second: zdt.second,
    tzid: zdt.timeZoneId,
  };
}

function plainDateToWallclock(pd: Temporal.PlainDate): WallclockDate {
  return { year: pd.year, month: pd.month, day: pd.day };
}
