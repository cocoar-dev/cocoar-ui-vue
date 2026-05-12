/**
 * `EngineResult → CalendarEvent[]` decoder.
 *
 * Reconstructs each occurrence as a `Temporal.ZonedDateTime` (timed)
 * or `Temporal.PlainDate` (all-day) in its source zone — never UTC,
 * never the calendar's display zone (C3). Applies `series.duration`
 * to compute `end`. Sets `meta.__recurrence` provenance from the
 * `origins` byte array (A4).
 *
 * Pure function, no engine knowledge.
 */

import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent, RecurringSeries } from '../../core/types';
import type { EngineResult } from '../types';
import { ORIGIN_RDATE } from '../types';

/**
 * Internal provenance attached to every expanded `CalendarEvent`
 * under `meta.__recurrence`. Public consumers read it via
 * `getRecurrenceMeta(event)`.
 *
 * The double-underscore prefix marks the key as library-managed.
 * Consumers MUST NOT read or write it directly — that contract may
 * change between minor versions.
 */
export interface RecurrenceMeta {
  /** Stable id of the source `RecurringSeries`. */
  readonly seriesId: string;
  /**
   * RECURRENCE-ID per RFC 5545 — the original wallclock value of
   * this occurrence. For unmodified occurrences `recurrenceId`
   * equals `event.start`; Phase-5 single-instance edits will let
   * `event.start` differ while `recurrenceId` keeps pointing at
   * the original slot.
   */
  readonly recurrenceId: Temporal.ZonedDateTime | Temporal.PlainDate;
  /** Where this occurrence came from in the source series. */
  readonly source: 'rrule' | 'rdate';
}

/**
 * The lib-managed key under `event.meta`. Consumers should treat it
 * as opaque — read via `getRecurrenceMeta(event)`.
 */
export const RECURRENCE_META_KEY = '__recurrence' as const;

export function decodeEngineResult<TMeta extends Record<string, unknown>>(
  result: EngineResult,
  series: RecurringSeries<TMeta>,
): CalendarEvent<TMeta>[] {
  if (result.kind === 'timed') {
    return decodeTimed(result, series);
  }
  return decodeAllDay(result, series);
}

// ─── Timed decode ─────────────────────────────────────────────────────

function decodeTimed<TMeta extends Record<string, unknown>>(
  result: Extract<EngineResult, { kind: 'timed' }>,
  series: RecurringSeries<TMeta>,
): CalendarEvent<TMeta>[] {
  const events: CalendarEvent<TMeta>[] = [];
  const { timestamps, seriesTzid, occurrenceTzids, origins } = result;
  const pool = occurrenceTzids?.pool;
  const indices = occurrenceTzids?.indices;

  for (let i = 0; i < timestamps.length; i++) {
    const tzid = pool && indices ? pool[indices[i]] : seriesTzid;
    const start = Temporal.Instant.fromEpochMilliseconds(timestamps[i])
      .toZonedDateTimeISO(tzid);
    const end = applyTimedDuration(start, series.duration);
    const source = origins[i] === ORIGIN_RDATE ? 'rdate' : 'rrule';

    events.push(buildEvent(series, start, end, start, source));
  }

  return events;
}

// ─── All-day decode ──────────────────────────────────────────────────

function decodeAllDay<TMeta extends Record<string, unknown>>(
  result: Extract<EngineResult, { kind: 'allDay' }>,
  series: RecurringSeries<TMeta>,
): CalendarEvent<TMeta>[] {
  const events: CalendarEvent<TMeta>[] = [];
  const { dates, origins } = result;

  for (let i = 0; i < dates.length; i++) {
    const packed = dates[i];
    const day = packed & 0x1f;          // 5 bits
    const month = (packed >> 5) & 0x0f; // 4 bits
    const year = packed >> 9;           // upper bits
    const start = Temporal.PlainDate.from({ year, month, day });
    const end = applyAllDayDuration(start, series.duration);
    const source = origins[i] === ORIGIN_RDATE ? 'rdate' : 'rrule';

    events.push(buildEvent(series, start, end, start, source));
  }

  return events;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function applyTimedDuration(
  start: Temporal.ZonedDateTime,
  duration: RecurringSeries['duration'],
): Temporal.ZonedDateTime | undefined {
  if (!duration) return undefined;
  if (duration.days !== undefined) {
    // D2: day-count duration only — for an all-day series. Mixing
    // {days} into a timed series is a consumer error; reject.
    throw new TypeError(
      'duration.days is only valid for all-day series (PlainDate dtstart). ' +
        'For timed series use {hours, minutes}.',
    );
  }
  const hours = duration.hours ?? 0;
  const minutes = duration.minutes ?? 0;
  if (hours === 0 && minutes === 0) return undefined;
  return start.add({ hours, minutes });
}

function applyAllDayDuration(
  start: Temporal.PlainDate,
  duration: RecurringSeries['duration'],
): Temporal.PlainDate | undefined {
  if (!duration) return undefined;
  if (duration.hours !== undefined || duration.minutes !== undefined) {
    throw new TypeError(
      'duration.hours / duration.minutes are only valid for timed series ' +
        '(ZonedDateTime dtstart). For all-day series use {days}.',
    );
  }
  const days = duration.days ?? 0;
  if (days === 0) return undefined;
  return start.add({ days });
}

function buildEvent<TMeta extends Record<string, unknown>>(
  series: RecurringSeries<TMeta>,
  start: Temporal.ZonedDateTime | Temporal.PlainDate,
  end: Temporal.ZonedDateTime | Temporal.PlainDate | undefined,
  recurrenceId: Temporal.ZonedDateTime | Temporal.PlainDate,
  source: 'rrule' | 'rdate',
): CalendarEvent<TMeta> {
  const meta = {
    ...(series.meta as object),
    [RECURRENCE_META_KEY]: {
      seriesId: series.id,
      recurrenceId,
      source,
    } satisfies RecurrenceMeta,
    // The cast goes through `unknown` because TMeta is consumer-defined
    // and TypeScript can't prove the spread shape extends it. The
    // runtime invariant is sound: TMeta extends Record<string, unknown>
    // and we only add a key whose value is `RecurrenceMeta`.
  } as unknown as TMeta;

  // Each occurrence needs a UNIQUE id (the layout pipeline dedupes
  // by event.id — multiple occurrences sharing the series id would
  // collapse into one rendered pill). The series id remains
  // accessible via `getRecurrenceMeta(event).seriesId`. Format:
  // `${seriesId}__${recurrenceIdAsString}` — stable, derivable from
  // the inputs, and obviously synthetic so consumers know not to
  // treat it as a backend identifier.
  const event: CalendarEvent<TMeta> = {
    id: `${series.id}__${recurrenceId.toString()}`,
    start,
    meta,
  };
  if (end !== undefined) event.end = end;
  return event;
}

/**
 * Public helper to read the lib-managed recurrence metadata off an
 * expanded occurrence. Returns `null` for non-recurring events.
 */
export function getRecurrenceMeta<TMeta extends Record<string, unknown>>(
  event: CalendarEvent<TMeta>,
): RecurrenceMeta | null {
  const meta = event.meta as Record<string, unknown> | undefined;
  if (!meta) return null;
  const value = meta[RECURRENCE_META_KEY];
  if (!value || typeof value !== 'object') return null;
  return value as RecurrenceMeta;
}
