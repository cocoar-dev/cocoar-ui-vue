/**
 * Public type surface for `@cocoar/vue-calendar`.
 *
 * Article-4 ("store intent") shape: the only valid representations
 * for a `start` / `end` are `Temporal.ZonedDateTime` (timed event,
 * carries `local + IANA timeZoneId` together) and `Temporal.PlainDate`
 * (calendar-day, intentionally zone-less). Floating wall-clock values
 * (`Temporal.PlainDateTime`) and bare ISO strings are rejected — the
 * library never has to guess which zone a value lives in.
 *
 * Design discipline:
 *
 *   - **Temporal types on the public surface.** Inside `core/` we
 *     work with the same shapes; consumers must construct them from
 *     their wire format. The library does NOT accept ISO strings —
 *     ambiguity (offset vs. floating, calendar vs. instant) is pushed
 *     out to the consumer where the source-of-truth zone is known.
 *
 *   - **`meta: TMeta` for everything app-specific.** The library
 *     does not prescribe `title`, `color`, `description`. The
 *     default event renderer reads `meta.title` / `meta.color` /
 *     `meta.icon` if present; consumers needing more override the
 *     `#event` slot.
 *
 *   - **Recurrence stays as rules, never expanded into events.**
 *     The cache only stores series; expansion happens lazily per
 *     view window via the recurrence engine.
 *
 * See design doc v0.2 §5 (Core Types) and the audit-finding writeup
 * `.local/timezone-audit-findings.md` for the full rationale.
 */

import { Temporal } from '@js-temporal/polyfill';

// ─── Events ────────────────────────────────────────────────────────────

/**
 * A single scheduled item.
 *
 * `start` (and the matching `end`) discriminates the event shape:
 *   - `Temporal.ZonedDateTime` — timed event
 *   - `Temporal.PlainDate`     — all-day event
 *
 * Recurring events are stored as rules (`rrule` + `rdate` +
 * `exdate`) and expanded only for the visible window. A modified
 * single occurrence is stored as a separate event with `parentId`
 * and `recurrenceId` pointing at the original.
 */
export interface CalendarEvent<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Stable identifier. For occurrences of a recurring event, this is
   * the SERIES id — every expanded occurrence carries the same id.
   * Distinguish individual occurrences by `recurrenceId`.
   */
  id: string;

  /**
   * Start of the event.
   *   - `Temporal.ZonedDateTime` — timed event (carries local + IANA zone).
   *   - `Temporal.PlainDate`     — all-day event.
   *
   * No other shapes accepted. Floating `PlainDateTime` throws because
   * "local with no zone" is ambiguous; pass a `ZonedDateTime` with the
   * intended source zone.
   */
  start: Temporal.ZonedDateTime | Temporal.PlainDate;

  /**
   * End of the event, EXCLUSIVE. Must match `start`'s shape:
   *   - `start: ZonedDateTime` → `end?: ZonedDateTime` (any zone)
   *   - `start: PlainDate`     → `end?: PlainDate`
   *
   * Cross-zone is allowed: `start.timeZoneId !== end.timeZoneId` is
   * fine. The calendar renders in `builder.timezone()` (display zone)
   * regardless.
   *
   * Defaults applied at index-insert if missing:
   *   - timed → `start.add({ minutes: 30 })`
   *   - all-day → `start.add({ days: 1 })`
   */
  end?: Temporal.ZonedDateTime | Temporal.PlainDate;

  // ── Recurrence ─────────────────────────────────────────────────────
  // RRULE / RDATE / EXDATE deliberately do not live on a concrete event.
  // Bind `RecurringSeries[]` through CalendarBuilder.series(...) instead;
  // the builder expands the visible window and adds occurrence provenance.

  // ── App-specific metadata ───────────────────────────────────────────
  /**
   * Anything the consumer needs in their renderer. The default
   * event card reads:
   *   - `meta.title?: string`
   *   - `meta.color?: string` — CSS color or token
   *   - `meta.icon?: string` — CoarIcon name
   * Consumers needing more shape replace via the `#event` slot.
   */
  meta?: TMeta;
}

// ─── Type guards ────────────────────────────────────────────────────────

/**
 * `true` when the event is timed (`start` is a `ZonedDateTime`).
 *
 * Duck-checks `'timeZoneId'` on the start value rather than using
 * `instanceof` — survives realm boundaries (workers, iframes) and
 * stays cheap in hot loops.
 */
export function isTimedEvent<T extends Record<string, unknown>>(
  e: CalendarEvent<T>,
): e is CalendarEvent<T> & {
  start: Temporal.ZonedDateTime;
  end?: Temporal.ZonedDateTime;
} {
  return 'timeZoneId' in (e.start as object);
}

/**
 * `true` when the event is all-day (`start` is a `PlainDate`).
 */
export function isAllDayEvent<T extends Record<string, unknown>>(
  e: CalendarEvent<T>,
): e is CalendarEvent<T> & {
  start: Temporal.PlainDate;
  end?: Temporal.PlainDate;
} {
  return !('timeZoneId' in (e.start as object));
}

// ─── Validation ─────────────────────────────────────────────────────────

/**
 * Throws if `event` violates the article-4 contract.
 *
 * Called by `EventIndex.insert` / `replaceAll` — consumers don't
 * call this directly, but the error message names the offending id
 * so it surfaces fast in dev.
 *
 * Reject reasons:
 *   - `start` is not `ZonedDateTime` or `PlainDate` (catches strings,
 *     `Date`, floating `PlainDateTime`, `Instant`, `PlainTime`,
 *     `null`, `undefined`, arrays, etc.)
 *   - `end` shape doesn't match `start`'s shape (mixed timed + all-day)
 *   - `end` is not strictly after `start`
 *
 * Event-level recurrence fields are invalid; if consumer metadata carries
 * `rrule` / `rdate`, a one-shot warning points to `RecurringSeries`.
 */
export function validateCalendarEvent(event: CalendarEvent): void {
  const { id, start, end } = event;

  const startIsZdt = start instanceof Temporal.ZonedDateTime;
  const startIsPd = start instanceof Temporal.PlainDate;
  if (!startIsZdt && !startIsPd) {
    throw new TypeError(
      `[CalendarEvent ${id}] start must be Temporal.ZonedDateTime or Temporal.PlainDate. ` +
        `Got ${(start as object | null)?.constructor?.name ?? typeof start}.`,
    );
  }
  // Eager IANA-zone resolution: a `ZonedDateTime` constructed with a
  // bogus zone like 'Europe/Wien' (typo) survives instantiation in the
  // polyfill but blows up deep in a render watcher with no event id.
  // Probe `toInstant()` here so the error names the offending event.
  if (startIsZdt) {
    try {
      (start as Temporal.ZonedDateTime).toInstant();
    } catch (e) {
      const zone = (start as Temporal.ZonedDateTime).timeZoneId;
      throw new TypeError(
        `[CalendarEvent ${id}] start.timeZoneId='${zone}' is not a recognised ` +
          `IANA zone (Temporal threw '${(e as Error).message}'). ` +
          "Use a real IANA name like 'Europe/Vienna' / 'America/Los_Angeles'.",
        { cause: e },
      );
    }
  }

  if (end !== undefined) {
    const endIsZdt = end instanceof Temporal.ZonedDateTime;
    const endIsPd = end instanceof Temporal.PlainDate;
    if (!endIsZdt && !endIsPd) {
      throw new TypeError(
        `[CalendarEvent ${id}] end must be Temporal.ZonedDateTime or Temporal.PlainDate. ` +
          `Got ${(end as object | null)?.constructor?.name ?? typeof end}.`,
      );
    }
    if (startIsZdt !== endIsZdt) {
      throw new TypeError(
        `[CalendarEvent ${id}] start and end must be the same shape. ` +
          `Got start=${startIsZdt ? 'ZonedDateTime' : 'PlainDate'}, ` +
          `end=${endIsZdt ? 'ZonedDateTime' : 'PlainDate'}.`,
      );
    }
    if (startIsZdt) {
      const cmp = Temporal.Instant.compare(
        (start as Temporal.ZonedDateTime).toInstant(),
        (end as Temporal.ZonedDateTime).toInstant(),
      );
      if (cmp >= 0) {
        throw new RangeError(`[CalendarEvent ${id}] end must be strictly after start.`);
      }
    } else {
      const cmp = Temporal.PlainDate.compare(
        start as Temporal.PlainDate,
        end as Temporal.PlainDate,
      );
      if (cmp >= 0) {
        throw new RangeError(`[CalendarEvent ${id}] end must be strictly after start.`);
      }
    }
  }

  // Recurrence-migration guard: consumers porting from FullCalendar /
  // ICS feeds frequently drop `rrule` / `rdate` / `exdate` into `meta`
  // assuming the concrete-event pipeline expands them. Recurrence is instead
  // a separate `RecurringSeries` source. Warn once per offending id.
  const meta = event.meta as
    | {
        rrule?: unknown;
        rdate?: unknown;
        exdate?: unknown;
        recurrenceId?: unknown;
      }
    | undefined;
  if (
    meta?.rrule !== undefined ||
    meta?.rdate !== undefined ||
    meta?.exdate !== undefined ||
    meta?.recurrenceId !== undefined
  ) {
    if (!_warnedRecurrenceIds.has(id)) {
      _warnedRecurrenceIds.add(id);
      // Audit Session 3 (philosophy minor): production warn too —
      // not just dev — so silently-broken rrule consumers can't
      // ship to users without seeing the issue. Per-id deduped
      // (no log spam from a 10k-event payload).
      const message =
        `[@cocoar/vue-calendar] [CalendarEvent ${id}] meta.rrule / .rdate / .exdate / .recurrenceId is set, ` +
        'but recurrence is a separate series pipeline. This event renders only ' +
        'at `start`. Construct a `RecurringSeries` and bind it through ' +
        '`CalendarBuilder.series(...)` instead of putting rules into event metadata.';
      if (typeof console !== 'undefined') console.warn(message);
    }
  }
}

const _warnedRecurrenceIds = new Set<string>();

// ─── Views ─────────────────────────────────────────────────────────────

/** Built-in view modes. Values stay as string literals so they
 *  serialize cleanly in URLs / state. */
export type CalendarView =
  | 'month'
  | 'monthList'
  | 'week'
  | 'workWeek'
  | 'day'
  | 'dayAgenda'
  | 'agenda'
  | 'timeline'
  | 'year';

/** Month-level display choices. `list` keeps the month context but replaces
 * event chips with a date selector plus the selected day's agenda. */
/** Rendering density of the Month grid. List is a separate view id, matching iOS. */
export type CalendarMonthDensity = 'compact' | 'stacked' | 'details';

/** Day-level display choices. Multi-day derives 1…7 columns from width. */
export type CalendarDayMode = 'single' | 'multiDay';

/**
 * A visible date range bounded to a single view mode.
 *
 * `start` is inclusive, `end` is exclusive. Both are ISO-8601
 * strings. For all-day-aware views (month, week, day, agenda) the
 * bounds are date-only (`'2026-04-13'`); for time-grid views with
 * subhour granularity, datetimes (`'2026-04-13T00:00:00'`) keep
 * the math clean.
 */
export interface ViewWindow {
  view: CalendarView;
  /** ISO date (or datetime) — first visible boundary, inclusive. */
  start: string;
  /** ISO date (or datetime) — last boundary, exclusive. */
  end: string;
  /**
   * IANA display timezone the window is anchored to. Required by
   * `eventsLoader` callbacks so they can construct an instant range
   * for backend queries — without this, the same `'2026-04-13'`
   * means a different 24h slice in `Pacific/Kiritimati` (UTC+14) and
   * `America/Los_Angeles` (UTC-8), and a "show in my zone" toggle
   * would silently fetch the wrong events. Article 4: a date is not
   * a point in time; pin the date+zone before deriving the instant.
   */
  timezone: string;
}

// ─── Recurrence (C8 — first-class type, separate pipeline) ────────────

/**
 * Recurrence rule for a `RecurringSeries`. The string form is an
 * iCalendar RRULE (RFC 5545), e.g. `'FREQ=WEEKLY;BYDAY=MO,WE,FR'`.
 *
 * Stored as a plain string so the type contract doesn't lock the
 * library into a specific RRULE parser. The engine (`core/recurrence.ts`)
 * parses it at expansion time.
 */
export type RecurrencePattern = string;

/**
 * A recurring series — generates `CalendarEvent` occurrences within
 * a visible window via `expandSeries(series, window, dstPolicy)`.
 *
 * **Article 5 alignment.** Recurring events MUST be local-time +
 * IANA zone, never UTC. The `dtstart` field carries the local intent
 * (`ZonedDateTime` for timed series, `PlainDate` for all-day series);
 * the engine applies the same `DstPolicy` (C4) that governs drag/drop
 * to gap/overlap occurrences.
 *
 * **C8 — separate from `CalendarEvent`.** This type does NOT appear
 * as `event.meta.rrule` or any other event-level field.
 * `validateCalendarEvent` dev-warns if a consumer tries that, telling
 * them to use `RecurringSeries` instead.
 *
 * Bind a reactive array with `CalendarBuilder.series(...)`, or call
 * `expandSeries(...)` directly from the `@cocoar/vue-calendar/recurrence`
 * subpath. The bundled `rrule-temporal` adapter is loaded lazily.
 */
export interface RecurringSeries<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable series identifier — every expanded occurrence carries
   *  this same id (distinguish occurrences via their `start` value). */
  id: string;
  /** RFC 5545 RRULE string. */
  rrule: RecurrencePattern;
  /**
   * Start of the FIRST occurrence — Article 5 "store local intent".
   *   - `ZonedDateTime` — timed series (carries source IANA zone).
   *   - `PlainDate`     — all-day series.
   */
  dtstart: Temporal.ZonedDateTime | Temporal.PlainDate;
  /**
   * Optional duration applied to each generated occurrence's start
   * to compute its end. **Day-count duration only (D2)** — no
   * `Period` semantics. "+1 month" is permanently not supported for
   * recurring occurrences because spans must be DST-stable.
   *   - For timed series: `{ minutes: number }` and/or `{ hours: number }`.
   *   - For all-day series: `{ days: number }`.
   */
  duration?: { minutes?: number; hours?: number; days?: number };
  /** Explicit additional dates the rule didn't generate (RDATE). */
  rdate?: ReadonlyArray<Temporal.ZonedDateTime | Temporal.PlainDate>;
  /** Explicit dates to exclude from rule output (EXDATE). */
  exdate?: ReadonlyArray<Temporal.ZonedDateTime | Temporal.PlainDate>;
  /** Per-series metadata, copied onto every expanded occurrence. */
  meta?: TMeta;
}

/**
 * Window for `expandSeries` — the visible range to generate
 * occurrences for. Bounds are inclusive-start / exclusive-end (same
 * convention as `ViewWindow`).
 */
export interface RecurrenceExpansionWindow {
  /** Inclusive start of the visible range. */
  start: Temporal.ZonedDateTime;
  /** Exclusive end of the visible range. */
  end: Temporal.ZonedDateTime;
}

// ─── Locale ────────────────────────────────────────────────────────────

/**
 * Resolved locale + timezone context the calendar uses for rendering.
 *
 * Resolved (not just "locale: 'de-AT'") because the calendar applies
 * many small formatting decisions in tight loops and recomputing
 * the resolution per render is wasteful. Build once, pass down.
 */
export interface ResolvedLocale {
  /** BCP-47 language tag, e.g. `'de-AT'`. */
  language: string;
  /** 0 = Sun, 1 = Mon (ISO), …, 6 = Sat. */
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** IANA timezone, e.g. `'Europe/Vienna'`. */
  timezone: string;
  /** Derived from Intl — true for 12-hour locales, false for 24-hour. */
  hour12: boolean;
}
