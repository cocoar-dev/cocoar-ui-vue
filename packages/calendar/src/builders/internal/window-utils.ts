/**
 * Pure helpers around `ViewWindow` and navigation refs, shared by the
 * builder layers and the loader / series pipelines.
 *
 * Nothing here is reactive and nothing here is exported from the
 * package barrel.
 */

import { isRef, ref, type Ref } from 'vue';
import { Temporal, type ViewWindow } from '../../core';

/**
 * Cache key for a `ViewWindow` in a specific display zone.
 *
 * View AND timezone are both part of the key so a `.timezone()`
 * switch doesn't leak previous-zone events into the new view (C5 +
 * Article 4: cross-zone bucketing differs by display zone — the
 * cache must too). Locale + DstPolicy are intentionally NOT in the
 * key — they affect rendering, not which events fall in the window.
 */
export function windowKey(w: ViewWindow): string {
  return `${w.view}|${w.timezone}|${w.start}|${w.end}`;
}

/**
 * Window equality — used to skip redundant `_setVisibleRange` calls
 * (a re-render that produces an identical-shape window shouldn't
 * fire `onRangeChange` twice).
 */
export function windowsEqual(a: ViewWindow | null, b: ViewWindow | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.view === b.view && a.start === b.start && a.end === b.end && a.timezone === b.timezone;
}

/**
 * Does a cache key (`view|tz|start|end`) intersect `window`? Same
 * view + zone, and the ISO bounds overlap. For ISO-8601 strings a
 * lexicographic compare is a chronological compare by construction.
 */
export function windowKeyIntersects(key: string, window: ViewWindow): boolean {
  const [v, tz, start, end] = key.split('|');
  return v === window.view && tz === window.timezone && start < window.end && end > window.start;
}

/**
 * Convert a `ViewWindow` (display-zone anchored, ISO-string bounds)
 * to a `RecurrenceExpansionWindow` (Temporal ZDT bounds).
 *
 * `start`/`end` may be either an ISO date (`'YYYY-MM-DD'`) for date-
 * granular views (month/week/day/agenda) or an ISO datetime
 * (`'YYYY-MM-DDTHH:MM:SS'`) for sub-hour time-grid views. Both are
 * anchored in `window.timezone`.
 */
export function viewWindowToExpansionWindow(window: ViewWindow): {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
} {
  return {
    start: parseWindowBound(window.start, window.timezone),
    end: parseWindowBound(window.end, window.timezone),
  };
}

function parseWindowBound(iso: string, timezone: string): Temporal.ZonedDateTime {
  // ISO datetime form (`YYYY-MM-DDTHH:MM:SS`) — has 'T' separator.
  if (iso.includes('T')) {
    return Temporal.PlainDateTime.from(iso).toZonedDateTime(timezone, {
      disambiguation: 'compatible',
    });
  }
  // ISO date form (`YYYY-MM-DD`) — anchor at midnight in the zone.
  return Temporal.PlainDate.from(iso).toZonedDateTime(timezone);
}

/**
 * Wrap a plain value or `Ref<T>` into a `Ref<T>`. Throws on getters
 * (functions) — navigation state must be writable, getters are
 * read-only.
 */
export function asWritableRef<T>(input: Ref<T> | T, label: string): Ref<T> {
  if (typeof input === 'function') {
    throw new TypeError(
      `[CalendarBuilder.${label}] navigation setters require a Ref or a plain value, never a getter function. api.next() / setView() must be able to write back. Pass \`ref(...)\` if you want two-way binding.`,
    );
  }
  if (isRef(input)) return input as Ref<T>;
  return ref(input) as Ref<T>;
}
