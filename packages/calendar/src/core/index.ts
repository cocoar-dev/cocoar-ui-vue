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
  // C8 — Recurrence type contract (engine arrives in Phase 4)
  RecurringSeries,
  RecurrencePattern,
  RecurrenceExpansionWindow,
} from './types';
export {
  isTimedEvent,
  isAllDayEvent,
  validateCalendarEvent,
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
  eventStartDateInZone,
  todayInZone,
  nowInZone,
  buildFormatOptions,
  type FormatOverrides,
  // D3 — Wire-format helpers (Article 8 contract)
  parseScheduledTime,
  parsePlainDate,
  formatScheduledTime,
  type ScheduledTimeWire,
  type DstPolicy,
} from './temporal';
// C8 — public expansion entry point (throwing stub until Phase 4)
export {
  expandSeries,
  EXPAND_SERIES_NOT_IMPLEMENTED_MESSAGE,
} from './recurrence-public';
export {
  computeViewWindow,
  daysInWindow,
  windowDayCount,
  windowContainsDate,
  navigateCursor,
  type ViewWindowOptions,
} from './viewWindow';
// EventIndex is intentionally NOT re-exported. It exists for tests
// + future internal use, but the runtime layout pipeline reaches the
// events through `_computeVisibleEvents` (BaseCalendarBuilder) +
// per-view `layout*` pure functions, NOT through an EventIndex
// instance. Exposing it would let consumers wire a sidebar / minimap
// against EventIndex bucketing that silently drifts from the actual
// grid (e.g. `setTimezone()` rebuckets the index but not the view).
// Phase 8.12-BE: keep it out of the public surface until either the
// runtime owns one or consumers ship a real use case.
//
// To use it from a test: `import { EventIndex } from '../eventIndex'`.
export {
  layoutDayEvents,
  layoutAllDayBand,
  type DayLayoutOptions,
  type AllDayBandOptions,
  type PositionedEvent,
  type AllDayBar,
} from './timeGridLayout';
export {
  layoutMonthGrid,
  type MonthLayout,
  type MonthLayoutOptions,
  type MonthWeekRow,
  type MonthMultiDayBar,
  type MonthCellPill,
} from './monthGridLayout';
export {
  buildAgendaItems,
  type AgendaItem,
  type AgendaHeaderItem,
  type AgendaEventItem,
  type AgendaLayoutOptions,
} from './agendaLayout';
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
// C2 — single drop pipeline. The `buildDropPayload` function is the
// ONE entry that converts a snapped target into an EventDropPayload.
// Every drop path (mouse / keyboard / touch in every view) reaches it
// exactly once. `applyMoveToEvent` is its pure-math inner step and is
// also exposed for preview-ghost geometry (computed identically to
// the eventual commit so preview-vs-commit drift is impossible).
export {
  applyMoveToEvent,
  buildDropPayload,
  DstResolutionError,
  MIN_RESIZE_MINUTES,
  type CalendarDragMode,
  type CalendarDropTarget,
  type DstDisambiguation,
  type EventDropPayload,
  type MoveResult,
} from './dnd/move-math';
