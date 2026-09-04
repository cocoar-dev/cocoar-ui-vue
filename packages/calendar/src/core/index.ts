/**
 * `@cocoar/vue-calendar/core` — framework-agnostic layer.
 *
 * Files in this directory must NOT import from `../components/` or
 * `../composables/`. The lint rule in the repo root enforces this.
 *
 * Recurrence types (`RecurringSeries`, `RecurrenceExpansionWindow`)
 * live here; the runtime `expandSeries` lives at the
 * `@cocoar/vue-calendar/recurrence` subpath so apps that don't use
 * recurring series don't pull the engine into the main bundle.
 */

export type {
  CalendarEvent,
  CalendarDayMode,
  CalendarMonthDensity,
  CalendarView,
  ViewWindow,
  ResolvedLocale,
  // C8 — Recurrence type contract (runtime lives on the recurrence subpath)
  RecurringSeries,
  RecurrencePattern,
  RecurrenceExpansionWindow,
} from './types';
export { isTimedEvent, isAllDayEvent, validateCalendarEvent } from './types';
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
  workWeekDates,
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
// C8 — public expansion entry point lives at the
// `@cocoar/vue-calendar/recurrence` subpath, NOT on the main barrel.
// The subpath keeps engine-bundle bytes out of apps that don't use
// recurrence. See `.local/PHASE-4-RECURRENCE.md` §A1.
//   import { expandSeries } from '@cocoar/vue-calendar/recurrence';
export {
  computeViewWindow,
  daysInWindow,
  windowDayCount,
  windowContainsDate,
  navigateCursor,
  DEFAULT_WORK_DAYS,
  type ViewWindowOptions,
} from './viewWindow';
export { responsiveDayColumnCount } from './dayColumns';
export { formatRangeLabel, type RangeLabelOptions } from './rangeLabel';
export {
  TIME_GRID_PRESETS,
  resolveTimeGridRange,
  resolveSpanDays,
  timeGridRangeSpecFor,
  timeGridStepDays,
  type TimeGridAnchor,
  type TimeGridFilter,
  type TimeGridRange,
  type TimeGridRangeSpec,
  type TimeGridView,
  type ResolveTimeGridRangeOptions,
} from './timeGridRange';
export {
  capAllDayBand,
  allDayBandLanes,
  DEFAULT_ALL_DAY_MAX_VISIBLE_LANES,
  type AllDayBandMode,
  type AllDayCapOptions,
  type AllDayCapResult,
  type AllDayOverflowMarker,
} from './allDayBandCap';
export { contentAwareCascadeFrames, type CascadeItem, type CascadeFrame } from './cascadeLayout';
export {
  eventTextColor,
  eventInkColor,
  type EventTextContrastPolicy,
  type EventTextColorOptions,
  type EventInkOptions,
} from './eventTextContrast';
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
export {
  layoutTimeline,
  type TimelineLayout,
  type TimelineLayoutOptions,
  type TimelineRow,
  type TimelineBar,
} from './timelineLayout';
// The bundled recurrence engine adapter lives at the
// `recurrence-rrule-temporal` subpath. Consumer-defined custom
// engines implement the `RecurrenceEngine` interface and register
// via `builder.recurrenceEngine(custom)`.
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
  detectDstSituation,
  DstResolutionError,
  MIN_RESIZE_MINUTES,
  type CalendarDragMode,
  type CalendarDropTarget,
  type DstDisambiguation,
  type EventDropPayload,
  type MoveResult,
} from './dnd/move-math';
