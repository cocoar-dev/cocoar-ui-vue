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
    // ignore
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

/**
 * The browser's IANA timezone, e.g. `'Europe/Vienna'`. Falls back to
 * `'UTC'` on environments without `Intl.DateTimeFormat` (rare).
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
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
 * Quick check whether an ISO string is date-only (no time component).
 *
 * `'2026-04-13'` → true
 * `'2026-04-13T09:00:00'` → false
 * `'2026-04-13T09:00:00Z'` → false
 *
 * Per `CalendarEvent.start`, an absent time component implies all-day.
 */
export function isDateOnlyIsoString(s: string): boolean {
  return !s.includes('T');
}

/**
 * Parse a calendar event's `start` / `end` ISO string.
 *
 *   - Date-only `'2026-04-13'` → `Temporal.PlainDate`
 *   - With time + Z `'2026-04-13T09:00:00Z'` → `Temporal.Instant`
 *   - With time + offset `'2026-04-13T09:00:00+02:00'` → `Temporal.Instant`
 *   - With time, no offset `'2026-04-13T09:00:00'` → `Temporal.PlainDateTime`
 *
 * Throws on unparseable input.
 */
export function parseEventInstant(
  iso: string,
):
  | { kind: 'date'; date: Temporal.PlainDate }
  | { kind: 'instant'; instant: Temporal.Instant }
  | { kind: 'plain'; plainDateTime: Temporal.PlainDateTime } {
  if (isDateOnlyIsoString(iso)) {
    return { kind: 'date', date: Temporal.PlainDate.from(iso) };
  }
  // Has time. Has offset / Z?
  const hasOffset = /[Z+-]\d{0,2}:?\d{0,2}$/.test(iso) || /Z$/.test(iso);
  if (hasOffset) {
    return { kind: 'instant', instant: Temporal.Instant.from(iso) };
  }
  return { kind: 'plain', plainDateTime: Temporal.PlainDateTime.from(iso) };
}

/**
 * Resolve an event's start to a `Temporal.PlainDate` (the "day" the
 * event lives on for indexing purposes), in the supplied timezone.
 *
 * Used by the EventIndex to bucket events by day key.
 */
export function eventStartDateInZone(iso: string, zone: string): Temporal.PlainDate {
  const parsed = parseEventInstant(iso);
  if (parsed.kind === 'date') return parsed.date;
  if (parsed.kind === 'plain') return parsed.plainDateTime.toPlainDate();
  // Instant — convert through the zone to get a calendar day.
  return parsed.instant.toZonedDateTimeISO(zone).toPlainDate();
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
