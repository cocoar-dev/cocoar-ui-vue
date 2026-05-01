/**
 * `@cocoar/vue-calendar/core` — framework-agnostic layer.
 *
 * Files in this directory must NOT import from `../components/` or
 * `../composables/`. The lint rule in the repo root enforces this.
 *
 * Phase 0 contents:
 *   - measurementCache.ts  — Fenwick-tree-backed variable-size cache
 *   - virtualScroll.ts     — pure range math + anchor adjustment
 *
 * Phase 1 will add:
 *   - temporal.ts          — Temporal helpers (lifted from @cocoar/vue-ui)
 *   - eventIndex.ts        — Map<dateKey, Event[]> with granular invalidation
 *   - viewWindow.ts        — week/month/agenda window math
 *   - overlapLayout.ts     — multi-day-bar interval-graph coloring
 *   - recurrence.ts        — engine abstraction (rrule-rust + rrule.js)
 *   - worker/recurrenceWorker.ts — off-main-thread expansion
 */

export type {
  CalendarEvent,
  CalendarView,
  ViewWindow,
  ResolvedLocale,
} from './types';
export {
  Temporal,
  type DayOfWeek,
  detectFirstDayOfWeekFromLocale,
  detectHour12FromLocale,
  detectBrowserTimezone,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isoWeekNumber,
  weekDates,
  monthGridDates,
  localizedWeekdayNames,
  dateKey,
  isDateOnlyIsoString,
  parseEventInstant,
  eventStartDateInZone,
  todayInZone,
  nowInZone,
} from './temporal';
export {
  computeViewWindow,
  daysInWindow,
  windowDayCount,
  windowContainsDate,
  navigateCursor,
  type ViewWindowOptions,
} from './viewWindow';
export {
  EventIndex,
  type EventIndexOptions,
  type IndexInvalidation,
  type IndexListener,
} from './eventIndex';
// NOTE: recurrence engine exports live behind a subpath
// (`@cocoar/vue-calendar/recurrence`) rather than the main core
// barrel. The worker file uses Vite's `?worker` syntax which has
// top-level await; bundling it through the package's lib-mode IIFE
// build fails. The subpath keeps the worker chunk separate and only
// pulled in by consumers that actually use recurrence.
//
// See packages/calendar/package.json `exports['./recurrence']` and
// the playground's vite.config alias.
export { MeasurementCache } from './measurementCache';
export {
  getVisibleRange1D,
  getVisibleRange2D,
  computeAnchorAdjustment,
  type Range1D,
  type Range2D,
} from './virtualScroll';
export {
  layoutOverlappingIntervals,
  type IntervalInput,
  type IntervalLayout,
  type LayoutResult,
} from './overlapLayout';
export {
  hitTestVerticalSurface,
  computeAutoScrollVelocity,
  type VerticalHit,
  type AutoScrollOptions,
  type AutoScrollResult,
} from './dragHitTest';
