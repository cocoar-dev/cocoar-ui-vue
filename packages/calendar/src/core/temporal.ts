/**
 * Temporal helpers for `@cocoar/vue-calendar`.
 *
 * Built on `@js-temporal/polyfill` (already shipped repo-wide).
 * Pure functions, framework-agnostic, no Vue.
 *
 * Some functions overlap with helpers in `@cocoar/vue-ui`'s
 * `_shared/date-helpers.ts`. We deliberately do NOT import from
 * `@cocoar/vue-ui` here — that would import Vue transitively and
 * break the `core/` framework-agnostic boundary. The duplication
 * is small (< 50 LoC) and worth the cleanliness; if it grows we
 * promote the shared subset to a workspace-internal
 * `@cocoar/vue-temporal` package per design doc §0.5.
 *
 * ── Day-of-week convention ────────────────────────────────────────────
 *
 * The calendar's public API uses `0..6` for `firstDayOfWeek`:
 *   - 0 = Sunday
 *   - 1 = Monday (ISO)
 *   - 2 = Tuesday
 *   - …
 *   - 6 = Saturday
 *
 * Matching `Date.prototype.getDay()` and the design doc's signature.
 *
 * Temporal's `dayOfWeek` is 1-indexed (1 = Monday … 7 = Sunday) per
 * ISO 8601. Helpers below normalize between the two.
 */

import { Temporal } from '@js-temporal/polyfill';

export { Temporal };

/** 0 = Sun … 6 = Sat. Matches `Date.prototype.getDay()`. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Convert Temporal's 1..7 (Mon..Sun) to the 0..6 (Sun..Sat)
 * convention the calendar uses publicly.
 */
export function temporalDowToCalendarDow(isoDow: number): DayOfWeek {
  // ISO 7 = Sunday → 0; ISO 1..6 = Mon..Sat → 1..6
  return ((isoDow % 7) as DayOfWeek);
}

/**
 * Convert calendar 0..6 (Sun..Sat) to Temporal's 1..7 (Mon..Sun).
 */
export function calendarDowToTemporalDow(calDow: DayOfWeek): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  // Sun (0) → ISO 7; Mon..Sat (1..6) → ISO 1..6
  return (calDow === 0 ? 7 : calDow) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

// ─── Locale resolution ───────────────────────────────────────────────

/**
 * Detect the default first day of week for a BCP-47 locale via
 * `Intl.Locale.weekInfo`. Returns 0..6 in the calendar convention.
 *
 * Falls back to `1` (Monday) on browsers that don't support
 * `weekInfo` — covers most of the world correctly.
 *
 * @example
 *   detectFirstDayOfWeekFromLocale('en-US') // → 0 (Sunday)
 *   detectFirstDayOfWeekFromLocale('de-DE') // → 1 (Monday)
 *   detectFirstDayOfWeekFromLocale('ar-SA') // → 6 (Saturday)
 */
let _warnedWeekInfoFallback = false;
export function detectFirstDayOfWeekFromLocale(locale: string): DayOfWeek {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info && typeof info.firstDay === 'number') {
      // weekInfo.firstDay is ISO (1 = Monday, 7 = Sunday).
      return temporalDowToCalendarDow(info.firstDay);
    }
  } catch {
    /* fall through to warning */
  }
  // Article 9: defaults are not decisions. The runtime doesn't expose
  // `Intl.Locale.weekInfo` (older Safari / Firefox), so we'd be
  // GUESSING — warn once so consumers know to set
  // `builder.firstDayOfWeek(...)` explicitly instead of trusting the
  // browser-dependent default.
  if (!_warnedWeekInfoFallback && typeof console !== 'undefined') {
    _warnedWeekInfoFallback = true;
    console.warn(
      '[@cocoar/vue-calendar] Intl.Locale.weekInfo is not available on ' +
        `this runtime — falling back to Monday for locale '${locale}'. ` +
        'Article 9: defaults are not decisions. Pass ' +
        '`.firstDayOfWeek(0)` (Sunday) / `.firstDayOfWeek(6)` ' +
        '(Saturday) etc. explicitly so the week-start is deterministic ' +
        'across browsers.',
    );
  }
  return 1;
}

/**
 * Detect 12-vs-24-hour preference for a locale via Intl. Returns
 * `true` for 12-hour locales (en-US), `false` for 24-hour
 * (de-DE, fr-FR).
 */
export function detectHour12FromLocale(locale: string): boolean {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
    return fmt.resolvedOptions().hour12 ?? false;
  } catch {
    return false;
  }
}

let _warnedDetectFallback = false;

/**
 * The browser's IANA timezone, e.g. `'Europe/Vienna'`. Falls back to
 * `'UTC'` on environments without `Intl.DateTimeFormat` (SSR / locked
 * runtimes / very old browsers).
 *
 * **The fallback is the article-4 anti-pattern.** A UTC display zone
 * for a Vienna user makes 09:00 wall-clock render as 11:00 in summer.
 * To make this loud, we `console.warn` ONCE per process when the
 * fallback fires — including in production, because the data
 * corruption risk is identical in dev and prod (Article 8: don't lie
 * about what's stored). Consumers who really do live in UTC should
 * pass `'UTC'` explicitly to `builder.timezone('UTC')` to silence
 * the warning.
 */
export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    /* fall through */
  }
  if (!_warnedDetectFallback && typeof console !== 'undefined') {
    _warnedDetectFallback = true;
    console.warn(
      "[@cocoar/vue-calendar] detectBrowserTimezone() couldn't read " +
        "Intl.DateTimeFormat — falling back to 'UTC'. This is the " +
        'Article-4 anti-pattern: human-meaningful times will render at ' +
        'the wrong wall-clock for users not in UTC. Pass an explicit ' +
        'IANA zone to `builder.timezone(...)` (e.g. ' +
        "'Europe/Vienna'). If your app really does run in UTC, pass " +
        "'UTC' explicitly to silence this warning.",
    );
  }
  return 'UTC';
}

/**
 * Article-9 helper: merge consumer-set verbosity / clock overrides
 * into a per-call `Intl.DateTimeFormatOptions` literal. Intl is strict
 * about combinations — `dateStyle` excludes the field-level options
 * (`weekday`/`day`/`month`/`year`/`era`), and `timeStyle` excludes
 * `hour`/`minute`/`second`/`fractionalSecondDigits`. This helper
 * applies the overrides AND prunes the conflicting fields so callers
 * just hand it the natural literal.
 *
 *   buildFormatOptions(
 *     { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz },
 *     { dateStyle: 'long', hour12: false },
 *   )
 *   //  → { dateStyle: 'long', hour12: false, timeZone: tz }
 */
export interface FormatOverrides {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  hour12?: boolean;
}

export function buildFormatOptions(
  base: Intl.DateTimeFormatOptions,
  overrides: FormatOverrides | undefined,
): Intl.DateTimeFormatOptions {
  if (!overrides) return base;
  const out: Intl.DateTimeFormatOptions = { ...base };
  if (overrides.hour12 !== undefined) out.hour12 = overrides.hour12;
  // Intl spec: setting EITHER `dateStyle` OR `timeStyle` forbids ALL
  // component options (`weekday`, `era`, `year`, `month`, `day`,
  // `dayPeriod`, `hour`, `minute`, `second`, `fractionalSecondDigits`,
  // `timeZoneName`). Strip all of them once either style is requested,
  // not just the same-axis ones — mixing a `weekday`-bearing base with
  // a `timeStyle: 'short'` override otherwise throws
  // "Invalid option : option" at construction time.
  if (overrides.dateStyle !== undefined || overrides.timeStyle !== undefined) {
    delete out.weekday;
    delete out.era;
    delete out.year;
    delete out.month;
    delete out.day;
    delete out.dayPeriod;
    delete out.hour;
    delete out.minute;
    delete out.second;
    delete out.fractionalSecondDigits;
    delete out.timeZoneName;
  }
  if (overrides.dateStyle !== undefined) out.dateStyle = overrides.dateStyle;
  if (overrides.timeStyle !== undefined) out.timeStyle = overrides.timeStyle;
  return out;
}

// ─── Day / week / month boundaries ───────────────────────────────────

/**
 * Move `date` backwards (or stay) until it lands on the configured
 * `firstDayOfWeek`. Idempotent.
 *
 * @example
 *   startOfWeek(2026-04-15 (Wed), 1) → 2026-04-13 (Mon)
 *   startOfWeek(2026-04-15 (Wed), 0) → 2026-04-12 (Sun)
 */
export function startOfWeek(
  date: Temporal.PlainDate,
  firstDayOfWeek: DayOfWeek,
): Temporal.PlainDate {
  const calDow = temporalDowToCalendarDow(date.dayOfWeek);
  // distance forward from firstDayOfWeek to today, mod 7 → number of
  // days to subtract
  const offset = (calDow - firstDayOfWeek + 7) % 7;
  return offset === 0 ? date : date.subtract({ days: offset });
}

/**
 * Last day of the week (one day before the next firstDayOfWeek).
 */
export function endOfWeek(
  date: Temporal.PlainDate,
  firstDayOfWeek: DayOfWeek,
): Temporal.PlainDate {
  return startOfWeek(date, firstDayOfWeek).add({ days: 6 });
}

/** First day of the month containing `date`. */
export function startOfMonth(date: Temporal.PlainDate): Temporal.PlainDate {
  return date.with({ day: 1 });
}

/** Last day of the month containing `date`. */
export function endOfMonth(date: Temporal.PlainDate): Temporal.PlainDate {
  return date.with({ day: date.daysInMonth });
}

/**
 * ISO 8601 week number (1..53). Week 1 is the week containing the
 * first Thursday of the year.
 */
export function isoWeekNumber(date: Temporal.PlainDate): number {
  // Move to the Thursday of the same ISO week.
  const isoDow = date.dayOfWeek; // 1..7
  const thursday = date.add({ days: 4 - isoDow });
  // First Thursday of that year.
  const yearStart = thursday.with({ month: 1, day: 1 });
  const firstThursdayOffset = ((4 - yearStart.dayOfWeek + 7) % 7);
  const firstThursday = yearStart.add({ days: firstThursdayOffset });
  // Difference in days, divided by 7, +1.
  const daysBetween = thursday.since(firstThursday, { largestUnit: 'days' }).days;
  return Math.floor(daysBetween / 7) + 1;
}

// ─── Grid generation ─────────────────────────────────────────────────

/**
 * 7 dates of the week containing `date`, starting at firstDayOfWeek.
 *
 * Used by week / day views.
 */
export function weekDates(
  date: Temporal.PlainDate,
  firstDayOfWeek: DayOfWeek,
): Temporal.PlainDate[] {
  const start = startOfWeek(date, firstDayOfWeek);
  const out: Temporal.PlainDate[] = new Array(7);
  for (let i = 0; i < 7; i++) out[i] = start.add({ days: i });
  return out;
}

/**
 * Fixed 6 × 7 = 42-cell month grid: leading days from the previous
 * month + the month's days + trailing days from the next month.
 *
 * Always 42 cells so the month view doesn't reflow when the month
 * changes (a month spanning 4, 5, or 6 visual rows; we always
 * render 6).
 *
 * @param yearMonth — month to render
 * @param firstDayOfWeek — 0..6 calendar convention
 */
export function monthGridDates(
  yearMonth: Temporal.PlainYearMonth,
  firstDayOfWeek: DayOfWeek,
): Temporal.PlainDate[] {
  const firstOfMonth = yearMonth.toPlainDate({ day: 1 });
  const start = startOfWeek(firstOfMonth, firstDayOfWeek);
  const out: Temporal.PlainDate[] = new Array(42);
  for (let i = 0; i < 42; i++) out[i] = start.add({ days: i });
  return out;
}

/**
 * Localized weekday names ('Sun', 'Mon', …) for headings, in the
 * order dictated by `firstDayOfWeek`.
 *
 * @param locale BCP-47, e.g. 'de-AT'
 * @param firstDayOfWeek 0..6
 * @param format 'long' | 'short' | 'narrow' — Intl.DateTimeFormat options
 */
export function localizedWeekdayNames(
  locale: string,
  firstDayOfWeek: DayOfWeek,
  format: 'long' | 'short' | 'narrow' = 'short',
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format });
  // Pick a known Sunday: 2024-01-07 is a Sunday.
  const sundayJan2024 = new Date(Date.UTC(2024, 0, 7));
  const out: string[] = new Array(7);
  for (let i = 0; i < 7; i++) {
    const calDow = (firstDayOfWeek + i) % 7; // 0..6 in render order
    const realDate = new Date(sundayJan2024.getTime());
    realDate.setUTCDate(realDate.getUTCDate() + calDow);
    out[i] = formatter.format(realDate);
  }
  return out;
}

// ─── Date keys + parsing ─────────────────────────────────────────────

/**
 * Stable `YYYY-MM-DD` key, suitable for use in a `Map` for the
 * event index. Same shape as `Temporal.PlainDate.toString()`.
 */
export function dateKey(date: Temporal.PlainDate): string {
  return date.toString();
}

/**
 * Resolve an event's start to a `Temporal.PlainDate` (the "day" the
 * event lives on for indexing purposes), in the supplied DISPLAY zone.
 *
 *   - `PlainDate`     → returned as-is (all-day events have no zone).
 *   - `ZonedDateTime` → re-zoned into `displayZone`, then truncated to
 *     the calendar day. Cross-zone events are bucketed by what the
 *     viewer actually sees.
 *
 * Used by the EventIndex to bucket events by day key.
 */
export function eventStartDateInZone(
  start: Temporal.ZonedDateTime | Temporal.PlainDate,
  displayZone: string,
): Temporal.PlainDate {
  if (start instanceof Temporal.PlainDate) return start;
  return start.withTimeZone(displayZone).toPlainDate();
}

// ─── "Today" / "Now" ─────────────────────────────────────────────────

/** Today's date in the given IANA zone. */
export function todayInZone(zone: string): Temporal.PlainDate {
  return Temporal.Now.plainDateISO(zone);
}

/** Current ZonedDateTime in the given IANA zone. */
export function nowInZone(zone: string): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(zone);
}

// ─── Wire-format helpers (Article 8 + D3) ────────────────────────────
//
// Article 8 recommends a structured `{ local, timeZoneId }` JSON
// shape for human-scheduled times — so the source intent crosses the
// wire intact, and the receiver doesn't have to guess "did the
// sender already convert to UTC?".
//
// These helpers make that contract effortless:
//
//   - `parseScheduledTime` — wire `{ local, timeZoneId }` → `ZonedDateTime`
//   - `parsePlainDate`     — wire `'YYYY-MM-DD'`         → `PlainDate`
//   - `formatScheduledTime`— `ZonedDateTime`             → wire `{ local, timeZoneId }`
//
// **Why public**: C1 (Temporal-only public surface) is strict; without
// these the strict boundary becomes nervous. Consumers either write
// their own (and forget DST disambiguation) or stuff strings into
// `event.meta` (lose validation entirely). With them, the right thing
// is the easy thing.
//
// **DST policy**: every wall-time → instant conversion forwards the
// caller's `dstPolicy` (default `'compatible'`, matching Temporal's
// own default). Same vocabulary as the drop pipeline — explicit
// `'reject' | 'earlier' | 'later' | 'compatible'`.

/**
 * DST policy mirror of the type in `dnd/move-math`. Re-declared here
 * so `core/temporal.ts` stays import-graph-clean (move-math is
 * downstream of temporal helpers, not the other way around).
 *
 * The values + semantics are identical; both files compile against
 * the same Temporal `disambiguation` option.
 */
export type DstPolicy = 'compatible' | 'reject' | 'earlier' | 'later';

/**
 * Wire shape for a scheduled time. Mirrors Article 8's recommended
 * API contract: store the human's intent (`local + timeZoneId`)
 * separately from the derived UTC instant (which the backend
 * computes per Article 4's "store intent, derive math" rule).
 *
 * Field naming matches `Appointment.LocalStart` / `TimeZoneId`
 * conventions used in Articles 6 + 7 (.NET / PostgreSQL chapters)
 * so frontend ↔ backend DTOs line up without translation.
 */
export interface ScheduledTimeWire {
  /**
   * ISO-8601 local datetime, NO offset, NO `Z`:
   * `'2026-06-05T10:00:00'`. The wall-clock value the user chose.
   */
  local: string;
  /** IANA timezone, e.g. `'Europe/Vienna'`. NOT an offset like `+02:00`
   *  (Article 4: offsets are snapshots, not meaning). */
  timeZoneId: string;
}

/**
 * Parse a wire `{ local, timeZoneId }` shape into a
 * `Temporal.ZonedDateTime`, applying the caller's `dstPolicy` to
 * resolve any DST gap or overlap on the local wall-time.
 *
 * @example
 * ```ts
 * const start = parseScheduledTime({
 *   local: '2026-06-05T10:00:00',
 *   timeZoneId: 'Europe/Vienna',
 * });
 * // → Temporal.ZonedDateTime in Europe/Vienna, intent preserved.
 * ```
 *
 * **Throws** `TypeError` if `timeZoneId` isn't a recognised IANA name
 * (probes via `toInstant()` — same trick as `validateCalendarEvent`).
 *
 * **Throws** `RangeError` if `local` isn't a parseable ISO-8601
 * datetime.
 *
 * **Throws** if `dstPolicy === 'reject'` and the local wall-time
 * lands in a DST gap (Article 5 explicit-policy contract).
 */
export function parseScheduledTime(
  input: ScheduledTimeWire & { dstPolicy?: DstPolicy },
): Temporal.ZonedDateTime {
  const { local, timeZoneId, dstPolicy = 'compatible' } = input;
  let pdt: Temporal.PlainDateTime;
  try {
    pdt = Temporal.PlainDateTime.from(local);
  } catch (e) {
    throw new RangeError(
      `[parseScheduledTime] local='${local}' is not a parseable ISO-8601 datetime (${(e as Error).message}). Expected format: 'YYYY-MM-DDTHH:MM[:SS]'.`,
    );
  }
  let zdt: Temporal.ZonedDateTime;
  try {
    zdt = pdt.toZonedDateTime(timeZoneId, { disambiguation: dstPolicy });
  } catch (e) {
    // Two failure modes funnel through here: (a) bogus IANA zone
    // name, (b) `dstPolicy === 'reject'` on a DST gap. Both deserve
    // a helpful, specific error message.
    const msg = (e as Error).message;
    if (dstPolicy === 'reject') {
      throw new TypeError(
        `[parseScheduledTime] local='${local}' in '${timeZoneId}' could not be resolved (${msg}). Likely cause: dstPolicy='reject' on a DST gap (e.g. 02:30 on the spring-forward day). Use 'earlier' / 'later' / 'compatible' if you want the engine to resolve, or pick a different time.`,
      );
    }
    throw new TypeError(
      `[parseScheduledTime] timeZoneId='${timeZoneId}' is not a recognised IANA zone (${msg}). Use a real name like 'Europe/Vienna' / 'America/Los_Angeles' — abbreviations like 'CET' / 'EST' are ambiguous and intentionally rejected.`,
    );
  }
  return zdt;
}

/**
 * Parse a wire `'YYYY-MM-DD'` ISO date string into a
 * `Temporal.PlainDate` — the all-day counterpart to
 * `parseScheduledTime`.
 *
 * @example
 * ```ts
 * const dob = parsePlainDate('1990-03-15');
 * ```
 *
 * **Throws** `RangeError` if `iso` isn't a parseable date.
 */
export function parsePlainDate(iso: string): Temporal.PlainDate {
  try {
    return Temporal.PlainDate.from(iso);
  } catch (e) {
    throw new RangeError(
      `[parsePlainDate] iso='${iso}' is not a parseable ISO-8601 date (${(e as Error).message}). Expected format: 'YYYY-MM-DD'.`,
    );
  }
}

/**
 * Format a `Temporal.ZonedDateTime` back into the wire shape — the
 * round-trip companion to `parseScheduledTime`. Use when shipping a
 * `CalendarEvent.start` to a backend that expects the
 * `{ local, timeZoneId }` contract.
 *
 * @example
 * ```ts
 * const wire = formatScheduledTime(event.start);
 * // → { local: '2026-06-05T10:00:00', timeZoneId: 'Europe/Vienna' }
 * await fetch('/appointments', { method: 'POST', body: JSON.stringify({ start: wire }) });
 * ```
 *
 * **Round-trip property** (tested):
 * `formatScheduledTime(parseScheduledTime(wire)) === wire` for any
 * non-DST-edge wire input. DST-edge inputs round-trip into the
 * unambiguous-after-policy value the engine resolved them to.
 */
export function formatScheduledTime(
  zdt: Temporal.ZonedDateTime,
): ScheduledTimeWire {
  // toPlainDateTime().toString() emits the local wall-time without
  // offset/zone suffix — exactly the wire format consumers expect.
  return {
    local: zdt.toPlainDateTime().toString(),
    timeZoneId: zdt.timeZoneId,
  };
}
