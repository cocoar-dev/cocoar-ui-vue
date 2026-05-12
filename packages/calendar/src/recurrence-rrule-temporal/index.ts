/**
 * `@cocoar/vue-calendar/recurrence-rrule-temporal` — bundled
 * recurrence engine adapter (pure JS, Temporal-native).
 *
 * Wraps `rrule-temporal` to fulfill the `RecurrenceEngine` interface.
 * This is the default engine: when consumers `import { expandSeries }`
 * from the public subpath without configuring an engine, the public
 * runtime lazy-constructs an instance from this module on first
 * recurring series in the visible window.
 *
 * Why this engine:
 *   - Pure JS, no WASM friction, SSR-clean.
 *   - Temporal-native — zero impedance with the lib's C1 contract.
 *   - Bundle: ~15 KB gzip + Polyfill (Polyfill is already a transitive
 *     dep of the lib).
 *   - Covers the full RFC-5545 RRULE surface needed for typical
 *     calendar workloads.
 *
 * Apps with extreme volume or specialized workloads (server-side
 * pre-expansion, alternative parsers) implement the
 * `RecurrenceEngine` interface in consumer code and register via
 * `builder.recurrenceEngine(custom)`.
 *
 * **Engine implementer notes (per `RecurrenceEngine` contract):**
 *   - Source-zone preservation: every wallclock is interpreted in
 *     its declared `tzid`. Per-RDATE/EXDATE zones are honored.
 *   - EXDATE matching: against the series source zone (A7) — RDATE
 *     and EXDATE values arriving in a different zone are converted
 *     to the source zone before comparison.
 *   - All-day path: rrule-temporal has no native PlainDate input.
 *     The adapter uses UTC-midnight ZonedDateTime as the synthetic
 *     input — UTC has no DST so the conversion is lossless. Output
 *     dates are reconstructed from the wallclock components, NEVER
 *     by going through an instant (Article 4).
 *   - DstPolicy: not applied here. The lib applies it as
 *     post-processing in `dst-resolve.ts` (Step 3) so engine swap
 *     never changes observable semantics.
 */

import { Temporal } from '@js-temporal/polyfill';
import { RRuleTemporal, type RRuleOptions } from 'rrule-temporal';
import type {
  EngineRequest,
  EngineResponse,
  EngineResult,
  EngineSeries,
  EngineSeriesAllDay,
  EngineSeriesError,
  EngineSeriesTimed,
  RecurrenceEngine,
  WallclockDate,
  WallclockTimed,
} from '../recurrence/types';
import { ORIGIN_RDATE, ORIGIN_RRULE } from '../recurrence/types';

// ─── Public engine ────────────────────────────────────────────────────

/**
 * Default recurrence engine — pure JS, Temporal-native.
 *
 * Stateless. Construction is cheap (no module init). Reuse one
 * instance per builder; the lib does that automatically when no
 * explicit engine is configured.
 */
export class RruleTemporalEngine implements RecurrenceEngine {
  async expand(request: EngineRequest): Promise<EngineResponse> {
    const results: EngineResult[] = [];
    const errors: EngineSeriesError[] = [];

    for (const series of request.series) {
      try {
        const result = expandOne(series, request.window.startMs, request.window.endMs);
        results.push(result);
      } catch (e) {
        errors.push({
          seriesId: series.seriesId,
          message: (e as Error).message ?? String(e),
        });
      }
    }

    return { results, errors };
  }
}

// ─── Per-series expansion ─────────────────────────────────────────────

function expandOne(
  series: EngineSeries,
  windowStartMs: number,
  windowEndMs: number,
): EngineResult {
  if (series.kind === 'timed') {
    return expandTimed(series, windowStartMs, windowEndMs);
  }
  return expandAllDay(series, windowStartMs, windowEndMs);
}

// ─── Timed path ───────────────────────────────────────────────────────

function expandTimed(
  series: EngineSeriesTimed,
  windowStartMs: number,
  windowEndMs: number,
): EngineResult {
  const dtstart = wallclockTimedToZdt(series.dtstart);
  const seriesTzid = series.dtstart.tzid;

  // Per A7: RDATE/EXDATE in different zones get re-anchored to the
  // series source zone for matching purposes. We preserve the
  // ORIGINAL per-RDATE zone in the output (`occurrenceTzids`); only
  // the EXDATE comparison is done in source zone.
  const exDate = series.exdates.map((ex) =>
    wallclockTimedToZdt(ex).withTimeZone(seriesTzid),
  );

  // RDATE: pass to engine in source zone for matching, but track
  // the original per-RDATE zones for the output.
  const rdateInSourceZone: Temporal.ZonedDateTime[] = [];
  const rdateOriginalTzids: string[] = [];
  for (const r of series.rdates) {
    const zdt = wallclockTimedToZdt(r);
    rdateInSourceZone.push(zdt.withTimeZone(seriesTzid));
    rdateOriginalTzids.push(r.tzid);
  }

  // Run each RRULE through rrule-temporal, collect rule occurrences
  // within the window. Multiple RRULEs are unioned (RFC 5545
  // semantics).
  const ruleOccurrences: Array<{ instant: number; tzid: string; origin: number }> = [];

  for (const ruleSpec of series.rules) {
    const opts: RRuleOptions = {
      rruleString: ruleSpec.rrule,
      dtstart,
      tzid: seriesTzid,
      // exDate is applied per-rule by rrule-temporal; we pass the
      // re-anchored set so all rules see consistent EXDATE matching.
      exDate,
    };
    if (ruleSpec.until) {
      const u = ruleSpec.until;
      // The lib only ever emits a wallclock-shape `until` when its
      // value-class matches DTSTART; for the timed path it's always
      // WallclockTimed. The runtime check is defensive only.
      if ('hour' in u) {
        opts.until = wallclockTimedToZdt(u);
      } else {
        // Type contract violated upstream — reject loudly.
        throw new TypeError(
          `[${series.seriesId}] timed series must use WallclockTimed for UNTIL, got WallclockDate.`,
        );
      }
    }

    const rule = new RRuleTemporal(opts);
    const between = rule.between(
      Temporal.Instant.fromEpochMilliseconds(windowStartMs).toZonedDateTimeISO('UTC'),
      Temporal.Instant.fromEpochMilliseconds(windowEndMs).toZonedDateTimeISO('UTC'),
      false, // exclusive end — matches our [start, end) window convention
    );

    for (const occ of between) {
      ruleOccurrences.push({
        instant: occ.toInstant().epochMilliseconds,
        tzid: seriesTzid,
        origin: ORIGIN_RRULE,
      });
    }
  }

  // RDATE additions: each RDATE that falls within the window contributes
  // one occurrence at its own instant, tagged with its ORIGINAL zone
  // (per A1 fast-path: hetero-zone occurrences get tracked individually).
  for (let i = 0; i < rdateInSourceZone.length; i++) {
    const zdt = rdateInSourceZone[i];
    const ms = zdt.toInstant().epochMilliseconds;
    if (ms >= windowStartMs && ms < windowEndMs) {
      ruleOccurrences.push({
        instant: ms,
        tzid: rdateOriginalTzids[i],
        origin: ORIGIN_RDATE,
      });
    }
  }

  // Sort by instant (engine contract). RDATE instants are interleaved
  // with rule output; rrule-temporal's exclude already filters EXDATE
  // matches from the rule output, but RDATE additions can collide
  // with EXDATE — RFC 5545 is silent on this; common interpretation
  // is EXDATE wins. We replicate that here for the source-zone EXDATE
  // set.
  const exdateInstants = new Set(
    exDate.map((ex) => ex.toInstant().epochMilliseconds),
  );
  const filtered = ruleOccurrences.filter(
    (occ) => !exdateInstants.has(occ.instant),
  );
  filtered.sort((a, b) => a.instant - b.instant);

  // Pack into transferable arrays. Hetero-zone fast-path: only emit
  // `occurrenceTzids` if at least one occurrence has a non-source tzid.
  const timestamps = new Float64Array(filtered.length);
  const origins = new Uint8Array(filtered.length);
  let hasHeteroZone = false;
  for (let i = 0; i < filtered.length; i++) {
    timestamps[i] = filtered[i].instant;
    origins[i] = filtered[i].origin;
    if (filtered[i].tzid !== seriesTzid) hasHeteroZone = true;
  }

  if (!hasHeteroZone) {
    return {
      seriesId: series.seriesId,
      kind: 'timed',
      timestamps,
      seriesTzid,
      origins,
    };
  }

  // Hetero path: build dedupe pool + index array.
  const poolMap = new Map<string, number>();
  poolMap.set(seriesTzid, 0);
  const pool: string[] = [seriesTzid];
  const indices = new Uint16Array(filtered.length);
  for (let i = 0; i < filtered.length; i++) {
    const tzid = filtered[i].tzid;
    let idx = poolMap.get(tzid);
    if (idx === undefined) {
      idx = pool.length;
      pool.push(tzid);
      poolMap.set(tzid, idx);
    }
    indices[i] = idx;
  }

  return {
    seriesId: series.seriesId,
    kind: 'timed',
    timestamps,
    seriesTzid,
    occurrenceTzids: { pool, indices },
    origins,
  };
}

// ─── All-day path ─────────────────────────────────────────────────────

/**
 * All-day expansion: rrule-temporal needs ZonedDateTime input but
 * we want PlainDate semantics. Use UTC-midnight as the synthetic
 * canonical zone — UTC has no DST so date arithmetic is exact.
 *
 * Result: we never go through an instant for the OUTPUT — the
 * date components are extracted directly from the synthetic-UTC
 * ZonedDateTime's `year`/`month`/`day`. The instant only exists as
 * a transient inside the engine call.
 */
function expandAllDay(
  series: EngineSeriesAllDay,
  windowStartMs: number,
  windowEndMs: number,
): EngineResult {
  const dtstart = wallclockDateToUtcMidnight(series.dtstart);

  const exDate = series.exdates.map(wallclockDateToUtcMidnight);

  const rdateZdts = series.rdates.map(wallclockDateToUtcMidnight);

  const ruleOccurrences: Array<{ year: number; month: number; day: number; origin: number }> = [];

  for (const ruleSpec of series.rules) {
    const opts: RRuleOptions = {
      rruleString: ruleSpec.rrule,
      dtstart,
      tzid: 'UTC',
      exDate,
    };
    if (ruleSpec.until) {
      const u = ruleSpec.until;
      if ('hour' in u) {
        throw new TypeError(
          `[${series.seriesId}] all-day series must use WallclockDate for UNTIL, got WallclockTimed.`,
        );
      }
      opts.until = wallclockDateToUtcMidnight(u);
    }

    const rule = new RRuleTemporal(opts);
    const between = rule.between(
      Temporal.Instant.fromEpochMilliseconds(windowStartMs).toZonedDateTimeISO('UTC'),
      Temporal.Instant.fromEpochMilliseconds(windowEndMs).toZonedDateTimeISO('UTC'),
      false,
    );

    for (const occ of between) {
      ruleOccurrences.push({
        year: occ.year,
        month: occ.month,
        day: occ.day,
        origin: ORIGIN_RRULE,
      });
    }
  }

  // RDATE additions
  for (const r of rdateZdts) {
    const ms = r.toInstant().epochMilliseconds;
    if (ms >= windowStartMs && ms < windowEndMs) {
      ruleOccurrences.push({
        year: r.year,
        month: r.month,
        day: r.day,
        origin: ORIGIN_RDATE,
      });
    }
  }

  // EXDATE filter (RDATE-collision case — see timed path comment).
  const exdateKeys = new Set(
    exDate.map((ex) => packDate(ex.year, ex.month, ex.day)),
  );
  const filtered = ruleOccurrences.filter(
    (occ) => !exdateKeys.has(packDate(occ.year, occ.month, occ.day)),
  );

  // Sort ascending (engine contract).
  filtered.sort(
    (a, b) =>
      packDate(a.year, a.month, a.day) - packDate(b.year, b.month, b.day),
  );

  const dates = new Int32Array(filtered.length);
  const origins = new Uint8Array(filtered.length);
  for (let i = 0; i < filtered.length; i++) {
    dates[i] = packDate(filtered[i].year, filtered[i].month, filtered[i].day);
    origins[i] = filtered[i].origin;
  }

  return {
    seriesId: series.seriesId,
    kind: 'allDay',
    dates,
    origins,
  };
}

// ─── Wallclock helpers ───────────────────────────────────────────────

function wallclockTimedToZdt(w: WallclockTimed): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.from({
    year: w.year,
    month: w.month,
    day: w.day,
    hour: w.hour,
    minute: w.minute,
    second: w.second,
    timeZone: w.tzid,
  });
}

function wallclockDateToUtcMidnight(w: WallclockDate): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.from({
    year: w.year,
    month: w.month,
    day: w.day,
    hour: 0,
    minute: 0,
    second: 0,
    timeZone: 'UTC',
  });
}

/**
 * Pack `(year, month, day)` into a single Int32 — used for date
 * deduplication and sorting. Encoding: `year * 512 + month * 32 + day`.
 * 11 bits year (up to 2047), 4 bits month (1-12), 5 bits day (1-31).
 */
function packDate(year: number, month: number, day: number): number {
  return year * 512 + month * 32 + day;
}
