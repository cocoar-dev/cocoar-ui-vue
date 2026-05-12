/**
 * `DstPolicy` post-processing for expanded occurrences (Phase 4 §A3).
 *
 * Engines have their own native DST handling — typically
 * `'compatible'`-equivalent (gap → forward shift, overlap → earlier
 * instant). For correctness across engine swap (consumers can
 * register a custom `RecurrenceEngine`), the library applies
 * `DstPolicy` as a normalization layer here so observable semantics
 * never depend on which engine ran underneath. This is the C2-analog
 * for the read path.
 *
 * **Strategy.** For each TIMED rule-generated occurrence:
 *   1. Reconstruct the rule's INTENDED wallclock for that date —
 *      assume time-of-day is invariant across the series (matches
 *      DTSTART's hour/minute/second). This covers the >95% case
 *      where rules don't use BYHOUR/BYMINUTE.
 *   2. Detect whether the intended wallclock falls in a DST gap or
 *      overlap in the series source zone via `detectDstSituation`
 *      (lifted from `core/dnd/move-math.ts` — single source of truth
 *      shared with the drag pipeline).
 *   3. **Always** re-resolve from the intended wallclock — even
 *      when no DST event is detected. For unambiguous wallclocks
 *      this is an idempotent no-op, but it eliminates engine-source-
 *      of-truth divergence: different engines may emit slightly
 *      different instants for the same wallclock pattern depending
 *      on how they handle dtstart's offset propagation; normalizing
 *      here ensures observable semantics depend only on
 *      `(intended wallclock, source zone, dstPolicy)`.
 *   4. For DST gap/overlap, apply `dstPolicy`:
 *      - `'compatible'`: re-resolve with `'compatible'` (Temporal
 *        default forward-shift for gap, earlier-instant for overlap).
 *      - `'reject'`: throw `DstResolutionError` naming series id +
 *        offending wallclock.
 *      - `'earlier'` / `'later'`: re-resolve with chosen
 *        disambiguation.
 *
 * **All-day occurrences are not touched** — date-only times have no
 * DST involvement (Article 4).
 *
 * **RDATE-originated occurrences are not touched** — the consumer
 * passed an explicit `Temporal.ZonedDateTime` which Temporal already
 * resolved at construction. Trusting that resolution is the correct
 * read of the consumer's intent (they explicitly chose a real time).
 *
 * **Limitation (Step 3 v1).** Series with `BYHOUR`/`BYMINUTE` that
 * vary the time-of-day across occurrences are not perfectly handled
 * — the assumed-wallclock is DTSTART's, so a varying time of day
 * would be normalized away. Real-world calendars rarely use that
 * shape; if a consumer hits it, they get the engine's native
 * behavior (which is sensible for `'compatible'` and undefined for
 * the other policies). Future: extend the engine wire to emit
 * per-occurrence pre-resolution wallclocks.
 */

import { Temporal } from '@js-temporal/polyfill';
import {
  detectDstSituation,
  DstResolutionError,
  type DstPolicy,
} from '../../core/dnd/move-math';
import type { CalendarEvent, RecurringSeries } from '../../core/types';
import { getRecurrenceMeta, RECURRENCE_META_KEY } from './engine-to-events';

/**
 * Apply `dstPolicy` to every timed rule-generated occurrence in
 * `events`, in place of returning the engine's native DST behavior.
 * All-day events and RDATE-originated occurrences pass through.
 *
 * Throws `DstResolutionError` if any occurrence falls in a DST
 * gap/overlap and `dstPolicy === 'reject'`.
 */
export function applyDstPolicy<TMeta extends Record<string, unknown>>(
  events: CalendarEvent<TMeta>[],
  series: RecurringSeries<TMeta>,
  dstPolicy: DstPolicy,
): CalendarEvent<TMeta>[] {
  // All-day series — no DST involvement (C3 / Article 4).
  if (!(series.dtstart instanceof Temporal.ZonedDateTime)) {
    return events;
  }

  const dtstart = series.dtstart;
  const sourceZone = dtstart.timeZoneId;
  const expectedHour = dtstart.hour;
  const expectedMinute = dtstart.minute;
  const expectedSecond = dtstart.second;

  const result: CalendarEvent<TMeta>[] = [];

  for (const ev of events) {
    const meta = getRecurrenceMeta(ev);

    // RDATE-originated occurrences carry the consumer's explicitly
    // chosen instant — trust the input rather than re-deriving.
    if (meta?.source === 'rdate') {
      result.push(ev);
      continue;
    }

    // Date-of-occurrence in series source zone. The engine's output
    // may have been DST-shifted (e.g. 02:30 → 03:30 in 'compatible'
    // resolution); re-anchoring to source zone gives us the date
    // the engine MEANT to produce.
    const start = ev.start as Temporal.ZonedDateTime;
    const dateInSource = start.withTimeZone(sourceZone);

    // Intended wallclock = (engine date) + (DTSTART time-of-day).
    const intended = {
      year: dateInSource.year,
      month: dateInSource.month,
      day: dateInSource.day,
      hour: expectedHour,
      minute: expectedMinute,
      second: expectedSecond,
    };

    const dstSituation = detectDstSituation(sourceZone, intended);
    if (dstSituation === null) {
      // No DST issue at intended wallclock. Still re-resolve from
      // intended — `'compatible'` disambiguation is a no-op for
      // unambiguous wallclocks, but normalizing here eliminates
      // engine-output divergence so observable semantics depend
      // only on (intended wallclock, source zone, policy).
      const next = resolveIntended(intended, sourceZone, 'compatible');
      result.push(rebuild(ev, next, series));
      continue;
    }

    // Gap or overlap — apply the policy.
    switch (dstPolicy) {
      case 'compatible': {
        const next = resolveIntended(intended, sourceZone, 'compatible');
        result.push(rebuild(ev, next, series));
        break;
      }
      case 'reject':
        throw new DstResolutionError(
          dstSituation,
          `[@cocoar/vue-calendar] series '${series.id}' has a recurring occurrence ` +
            `at ${formatIntended(intended)} in zone '${sourceZone}' which falls in a ` +
            `DST ${dstSituation}. Set dstPolicy to 'compatible' (forward-shift), ` +
            `'earlier' (last instant before transition), or 'later' (first instant ` +
            `after transition) to resolve.`,
        );
      case 'earlier':
      case 'later': {
        const next = resolveIntended(intended, sourceZone, dstPolicy);
        result.push(rebuild(ev, next, series));
        break;
      }
    }
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function resolveIntended(
  intended: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  },
  zone: string,
  disambiguation: 'compatible' | 'earlier' | 'later',
): Temporal.ZonedDateTime {
  return Temporal.PlainDateTime.from({
    year: intended.year,
    month: intended.month,
    day: intended.day,
    hour: intended.hour,
    minute: intended.minute,
    second: intended.second,
  }).toZonedDateTime(zone, { disambiguation });
}

function rebuild<TMeta extends Record<string, unknown>>(
  source: CalendarEvent<TMeta>,
  newStart: Temporal.ZonedDateTime,
  series: RecurringSeries<TMeta>,
): CalendarEvent<TMeta> {
  const next: CalendarEvent<TMeta> = {
    id: source.id,
    start: newStart,
    meta: source.meta,
  };
  // Recompute end if duration applied — duration is constant per
  // series, so the new end is start + duration.
  const dur = series.duration;
  if (dur && (dur.hours !== undefined || dur.minutes !== undefined)) {
    next.end = newStart.add({
      hours: dur.hours ?? 0,
      minutes: dur.minutes ?? 0,
    });
  }
  // recurrenceId stays = original engine output's start (per RFC
  // 5545 — RECURRENCE-ID is the canonical slot id, used for matching
  // overrides). Carrying it forward unchanged is critical for
  // Phase-5 single-instance-edit identity.
  // NOTE: `meta` is shallow-copied above; `__recurrence` is preserved.
  // We deliberately do NOT update `recurrenceId` to the new shifted
  // start — that would lose the override-matching identity.
  void RECURRENCE_META_KEY; // referenced for clarity that we do NOT touch it
  return next;
}

function formatIntended(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}
