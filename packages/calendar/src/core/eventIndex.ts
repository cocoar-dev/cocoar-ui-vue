/**
 * **INTERNAL — not exported from `@cocoar/vue-calendar`.**
 *
 * The runtime layout pipeline (`<CoarCalendar>` + sub-views) reaches
 * events through `BaseCalendarBuilder._computeVisibleEvents` and the
 * pure `layout*` functions in this folder, NOT through `EventIndex`.
 * Wiring an external sidebar / minimap against this class would
 * silently drift from what the views render (e.g. `setTimezone()`
 * would rebucket the index but not the view). Tests import this
 * file directly via path to keep the bucketing math testable; the
 * file remains in-tree until either the runtime owns one or the
 * recurrence engine (Phase 4) gives us a real public-API consumer.
 *
 * `core/eventIndex.ts` — `Map<dateKey, CalendarEvent[]>` for
 * O(1)-amortised day-level lookup, plus a small change-notification
 * surface so views can subscribe to granular invalidations without
 * fully re-rendering.
 *
 * Multi-day events are inserted into every day they intersect with
 * a flyweight reference — the array entries point at the SAME event
 * object, not duplicates. Memory is O(N · avg_span_days), in
 * practice a small multiplier on input size.
 *
 * Recurrence is NOT expanded by the index. Series are stored as
 * single events with their RRULE/RDATE/EXDATE intact. Expansion
 * happens lazily per view window via the recurrence engine; the
 * index can be queried with the expanded occurrences re-inserted on
 * demand.
 *
 * The index does not own the consumer's state — it's a derived view
 * that the consumer rebuilds (or incrementally updates) when their
 * source-of-truth events change.
 *
 * Performance contract:
 *   - `byDay(key)` is O(1) (Map lookup + small array).
 *   - `byRange(window)` is O(D + R) where D = window-length-in-days,
 *     R = matching events.
 *   - `insert` / `remove` / `update` are O(span) where `span` is the
 *     event's day count.
 */

import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent, ViewWindow } from './types';
import { isAllDayEvent, validateCalendarEvent } from './types';
import { dateKey } from './temporal';

// ─── Invalidation events ─────────────────────────────────────────────

/**
 * What changed in the index. Granular kinds let consumers update
 * only affected views: changing one event's color need not
 * re-render the whole month.
 */
export type IndexInvalidation =
  | { kind: 'day'; date: string }
  | { kind: 'range'; start: string; end: string }
  | { kind: 'series'; seriesId: string }
  | { kind: 'all' };

export type IndexListener = (invalidation: IndexInvalidation) => void;

// ─── EventIndex ──────────────────────────────────────────────────────

export interface EventIndexOptions {
  /**
   * Display timezone used to bucket timed events into calendar days.
   * **Required** since Phase 8.10-D. Article 4: defaults are not
   * decisions. Pass the user's IANA zone — the same one resolved in
   * `ResolvedLocale.timezone`. Empty string is rejected.
   */
  timezone: string;
}

export class EventIndex<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  private buckets = new Map<string, CalendarEvent<TMeta>[]>();
  /**
   * Reverse-index from event id to the day-keys it currently
   * occupies. Used so `update` / `remove` can locate the buckets
   * without scanning.
   */
  private byId = new Map<string, string[]>();
  private listeners = new Set<IndexListener>();
  private timezone: string;

  constructor(opts: EventIndexOptions) {
    if (!opts || typeof opts.timezone !== 'string' || opts.timezone === '') {
      throw new TypeError(
        '[EventIndex] `timezone` is required (Article-4: defaults are not ' +
          "decisions). Pass an IANA zone like 'Europe/Vienna' — or use " +
          '`detectBrowserTimezone()` from `@cocoar/vue-calendar` and store ' +
          'the result.',
      );
    }
    this.timezone = opts.timezone;
  }

  /**
   * Switch the display zone used to bucket TIMED events into days,
   * and rebuild every bucket. Required when `builder.timezone()`
   * changes at runtime — without a rebuild, near-midnight events
   * stay in the wrong day's bucket and `byDay` / `byRange` lie.
   *
   * Cheap on small data, O(N · avg_span_days) on large data; emits
   * a single `'all'` invalidation so views fully re-render once.
   * No-op when `tz` equals the current zone.
   */
  setTimezone(tz: string): void {
    if (tz === this.timezone) return;
    this.timezone = tz;
    if (this.byId.size === 0) return;
    // Snapshot the events flyweight-style — buckets share refs, so a
    // single de-duped pass through `byId.keys()` is enough.
    const events: CalendarEvent<TMeta>[] = [];
    const seen = new Set<string>();
    for (const bucket of this.buckets.values()) {
      for (const ev of bucket) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          events.push(ev);
        }
      }
    }
    this.buckets.clear();
    this.byId.clear();
    for (const event of events) {
      const days = this.spanDayKeys(event);
      for (const key of days) {
        const bucket = this.buckets.get(key);
        if (bucket) bucket.push(event);
        else this.buckets.set(key, [event]);
      }
      this.byId.set(event.id, days);
    }
    this.emit({ kind: 'all' });
  }

  /** Read the active display zone. Useful for tests / diagnostics. */
  getTimezone(): string {
    return this.timezone;
  }

  // ── Mutation ──────────────────────────────────────────────────────

  /**
   * Insert (or replace) an event. If the event's id already exists,
   * the old version is removed first.
   */
  insert(event: CalendarEvent<TMeta>): void {
    validateCalendarEvent(event);
    if (this.byId.has(event.id)) {
      this._removeWithoutEmit(event.id);
    }
    const days = this.spanDayKeys(event);
    for (const key of days) {
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(event);
      else this.buckets.set(key, [event]);
    }
    this.byId.set(event.id, days);
    this.emit({ kind: 'series', seriesId: event.id });
  }

  /**
   * Update an existing event. Equivalent to `insert(event)` but
   * emits a `series` invalidation rather than insert's same kind —
   * semantically identical at this level.
   */
  update(event: CalendarEvent<TMeta>): void {
    this.insert(event);
  }

  /**
   * Remove an event by id. No-op if the id is unknown.
   */
  remove(id: string): void {
    if (this._removeWithoutEmit(id)) {
      this.emit({ kind: 'series', seriesId: id });
    }
  }

  private _removeWithoutEmit(id: string): boolean {
    const days = this.byId.get(id);
    if (!days) return false;
    for (const key of days) {
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      const idx = bucket.findIndex((e) => e.id === id);
      if (idx >= 0) bucket.splice(idx, 1);
      if (bucket.length === 0) this.buckets.delete(key);
    }
    this.byId.delete(id);
    return true;
  }

  /** Empty the index. Emits a single `'all'` invalidation. */
  clear(): void {
    this.buckets.clear();
    this.byId.clear();
    this.emit({ kind: 'all' });
  }

  /**
   * Bulk-replace the index from a fresh array. Faster than calling
   * `insert` per event because it builds the buckets in one pass
   * and emits a single `'all'` invalidation.
   */
  replaceAll(events: ReadonlyArray<CalendarEvent<TMeta>>): void {
    this.buckets.clear();
    this.byId.clear();
    for (const event of events) {
      validateCalendarEvent(event);
      const days = this.spanDayKeys(event);
      for (const key of days) {
        const bucket = this.buckets.get(key);
        if (bucket) bucket.push(event);
        else this.buckets.set(key, [event]);
      }
      this.byId.set(event.id, days);
    }
    this.emit({ kind: 'all' });
  }

  // ── Queries ──────────────────────────────────────────────────────

  /** Events that intersect the given day. Order: insertion order. */
  byDay(date: string | Temporal.PlainDate): readonly CalendarEvent<TMeta>[] {
    const key = typeof date === 'string' ? date : dateKey(date);
    return this.buckets.get(key) ?? EMPTY;
  }

  /**
   * Events that intersect the given window. Each event appears at
   * most once in the result, even if it spans multiple days inside
   * the window.
   */
  byRange(window: ViewWindow): readonly CalendarEvent<TMeta>[] {
    const start = Temporal.PlainDate.from(window.start);
    const end = Temporal.PlainDate.from(window.end);
    const seen = new Set<string>();
    const out: CalendarEvent<TMeta>[] = [];
    let cur = start;
    while (Temporal.PlainDate.compare(cur, end) < 0) {
      const bucket = this.buckets.get(dateKey(cur));
      if (bucket) {
        for (const ev of bucket) {
          if (!seen.has(ev.id)) {
            seen.add(ev.id);
            out.push(ev);
          }
        }
      }
      cur = cur.add({ days: 1 });
    }
    return out;
  }

  /** Total number of distinct events currently indexed. */
  get size(): number {
    return this.byId.size;
  }

  // ── Listeners ────────────────────────────────────────────────────

  /** Subscribe to index changes. Returns an unsubscribe fn. */
  subscribe(listener: IndexListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(invalidation: IndexInvalidation): void {
    for (const l of this.listeners) {
      try {
        l(invalidation);
      } catch {
        // listeners must not throw; if they do, eat to keep other
        // listeners running. Surface elsewhere in dev.
      }
    }
  }

  // ── Internal: day-key span ────────────────────────────────────────

  /**
   * Compute the list of `YYYY-MM-DD` day-keys an event occupies.
   *
   * For all-day events, the span is straightforward (PlainDate
   * arithmetic). For timed events, we re-zone into the configured
   * display zone and bucket by local day; `end` exactly at midnight
   * counts as ending the previous day (RFC 5545 exclusive-end).
   *
   * Defaults:
   *   - `end` missing for all-day → `start + 1 day` exclusive
   *   - `end` missing for timed → same day as `start` (single bucket)
   */
  private spanDayKeys(event: CalendarEvent<TMeta>): string[] {
    let startDate: Temporal.PlainDate;
    let endDateExclusive: Temporal.PlainDate;

    if (isAllDayEvent(event)) {
      startDate = event.start;
      endDateExclusive = event.end ?? event.start.add({ days: 1 });
    } else {
      const startZdt = event.start as Temporal.ZonedDateTime;
      startDate = startZdt.withTimeZone(this.timezone).toPlainDate();
      if (event.end) {
        const endZdt = (event.end as Temporal.ZonedDateTime).withTimeZone(
          this.timezone,
        );
        const endDay = endZdt.toPlainDate();
        const endsAtMidnight =
          endZdt.hour === 0 &&
          endZdt.minute === 0 &&
          endZdt.second === 0 &&
          endZdt.millisecond === 0 &&
          endZdt.microsecond === 0 &&
          endZdt.nanosecond === 0;
        endDateExclusive = endsAtMidnight ? endDay : endDay.add({ days: 1 });
      } else {
        endDateExclusive = startDate.add({ days: 1 });
      }
    }

    if (Temporal.PlainDate.compare(endDateExclusive, startDate) <= 0) {
      // Defensive: an event with end ≤ start gets at least one
      // day-key (the start day) so it's still findable.
      return [dateKey(startDate)];
    }

    const out: string[] = [];
    let cur = startDate;
    while (Temporal.PlainDate.compare(cur, endDateExclusive) < 0) {
      out.push(dateKey(cur));
      cur = cur.add({ days: 1 });
    }
    return out;
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

const EMPTY: readonly never[] = Object.freeze([]);
