/**
 * Public type surface for `@cocoar/vue-calendar`.
 *
 * Everything a consumer interacts with — events, views, view
 * windows, locale resolution — is shaped here. The types are
 * intentionally minimal: no library-internal book-keeping fields,
 * no methods, just data. Consumers can JSON-serialize an event,
 * persist it, and round-trip it back without losing information.
 *
 * Design discipline:
 *
 *   - **ISO-8601 strings on the public surface.** Inside `core/`
 *     we work with `Temporal.PlainDateTime` / `ZonedDateTime`, but
 *     the boundary stays string-based. Reason: consumers come from
 *     all sorts of stores (REST APIs, IndexedDB, Pinia, GraphQL),
 *     and Date / Temporal interop is messy. Strings round-trip.
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
 * See design doc v0.2 §5 (Core Types) for the full rationale.
 */

// ─── Events ────────────────────────────────────────────────────────────

/**
 * A single scheduled item.
 *
 * `start` and `end` are ISO-8601 strings — either dates
 * (`'2026-04-13'`) for all-day events, or datetimes
 * (`'2026-04-13T09:00:00'` or `'2026-04-13T09:00:00Z'`) for timed
 * events. The presence of a time component implies a timed event
 * unless `allDay` is explicitly true.
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
   * Start instant or date, ISO-8601. If no time component, the event
   * is treated as all-day.
   */
  start: string;

  /**
   * End instant or date, ISO-8601, exclusive.
   *
   * Defaults applied at index-insert:
   *   - timed event: `start + slotDuration` (configurable, default 30 min)
   *   - all-day event: `start + 1 day`
   */
  end?: string;

  /**
   * Force all-day rendering even if `start` carries a time component.
   * Useful for things like "all-day reservations" or holidays where
   * a backend stores a midnight timestamp but UX wants "all day".
   */
  allDay?: boolean;

  // ── Recurrence ──────────────────────────────────────────────────────
  /** RFC 5545 RRULE string, e.g. `'FREQ=WEEKLY;BYDAY=MO'`. */
  rrule?: string;
  /** RFC 5545 RDATE — extra dates to include. */
  rdate?: string[];
  /** RFC 5545 EXDATE — dates to exclude. */
  exdate?: string[];

  // ── Per-occurrence override ─────────────────────────────────────────
  /**
   * When this event represents an override of a single occurrence,
   * this points at the parent series.
   */
  parentId?: string;
  /**
   * The original (un-modified) occurrence start, ISO-8601. Required
   * together with `parentId` to identify which occurrence this
   * record overrides.
   */
  recurrenceId?: string;

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

// ─── Views ─────────────────────────────────────────────────────────────

/** Built-in view modes. Values stay as string literals so they
 *  serialize cleanly in URLs / state. */
export type CalendarView =
  | 'month'
  | 'week'
  | 'day'
  | 'agenda'
  // v2 — declared up-front for type stability across versions:
  | 'timeline'
  | 'year';

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
  start: string;
  end: string;
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
