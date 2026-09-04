/**
 * `@cocoar/vue-calendar` — public surface.
 *
 * **Session 2 status (Builder + Drop Pipeline).** Builder runtime is
 * wired (reactive state per C7, loader cache + debounce, navigation
 * api, single _visibleRange writer). Single drop pipeline (C2) ships
 * via `useCalendarDnd` + the pure `buildDropPayload` function — every
 * drop reaches `applyMoveToEvent` exactly once. Components land in
 * Session 3.
 *
 * The eight non-negotiable architecture invariants (C1–C8) are pinned
 * by the type surface here AND by the conformance test suite at
 * `src/core/__tests__/timezone/`. Code that bypasses them is a
 * design failure.
 */

// Package stylesheet: dark-mode values for the `--coar-calendar-*`
// tokens. Light values are per-usage fallbacks in the components.
import './styles/tokens-dark.css';

// ─── Builder ──────────────────────────────────────────────────────
export { useCalendar } from './useCalendar';
export {
  CalendarBuilder,
  type CalendarApi,
  type CalendarBuilderState,
} from './builders/calendar-builder';
export type {
  CalendarDensity,
  CanDropFn,
  DateClickHandler,
  DateDoubleClickHandler,
  DayHeaderRenderer,
  DstPolicy,
  EventClickHandler,
  EventDoubleClickHandler,
  EventDropHandler,
  EventHoverHandler,
  EventHoverLeaveHandler,
  EventDropPayload,
  EventLayoutCtx,
  EventRenderer,
  EventRendererCtx,
  EventsLoader,
  MoreClickHandler,
  RangeChangeHandler,
  SeriesLoader,
  TimeClickHandler,
  TimeDoubleClickHandler,
  TimeRange,
} from './builders/types';
export { getEventZoneHints, type EventZoneHints } from './builders/event-zone-hints';

// ─── Composables ──────────────────────────────────────────────────

export { useViewWindow } from './composables/useViewWindow';
export {
  useCalendarDnd,
  buildDropPayload,
  type UseCalendarDndOptions,
  type UseCalendarDndReturn,
  type CalendarDragMode,
  type CalendarDropTarget,
  type DstDisambiguation,
} from './composables/useCalendarDnd';
export {
  useCoarDrag,
  type DragContext,
  type UseCoarDragOptions,
  type UseCoarDragReturn,
} from './composables/useCoarDrag';
export { useA11yAnnouncer } from './composables/useA11yAnnouncer';
export {
  useTimeGridSwipe,
  type UseTimeGridSwipeOptions,
  type UseTimeGridSwipeReturn,
} from './composables/useTimeGridSwipe';
export {
  useTimeGridDnd,
  type UseTimeGridDndOptions,
  type UseTimeGridDndReturn,
} from './composables/useTimeGridDnd';
export {
  useMonthDnd,
  type UseMonthDndOptions,
  type UseMonthDndReturn,
} from './composables/useMonthDnd';

// ─── View-specific composables (consumer-facing standalone use) ──

export { useDayView } from './useDayView';
export { useWeekView } from './useWeekView';
export { useWorkWeekView } from './useWorkWeekView';
export { useMonthView } from './useMonthView';
export { useAgendaView } from './useAgendaView';
export { useTimelineView } from './useTimelineView';

// ─── Components ──────────────────────────────────────────────────

export { default as CoarCalendar } from './components/CoarCalendar.vue';
export { default as CoarDayView } from './components/CoarDayView.vue';
export { default as CoarWeekView } from './components/CoarWeekView.vue';
export { default as CoarWorkWeekView } from './components/CoarWorkWeekView.vue';
export { default as CoarTimeGrid } from './components/CoarTimeGrid.vue';
export { default as CoarMonthView } from './components/CoarMonthView.vue';
export { default as CoarContinuousMonthView } from './components/CoarContinuousMonthView.vue';
export { default as CoarMonthListView } from './components/CoarMonthListView.vue';
export { default as CoarAgendaView } from './components/CoarAgendaView.vue';
export { default as CoarTimelineView } from './components/CoarTimelineView.vue';
export { default as CoarYearView } from './components/CoarYearView.vue';
export { default as CoarDisplayZoneSwitcher } from './components/CoarDisplayZoneSwitcher.vue';
export { default as VirtualizedSurface1DY } from './components/VirtualizedSurface1DY.vue';
export { default as VirtualizedSurface2D } from './components/VirtualizedSurface2D.vue';

// ─── Localization ────────────────────────────────────────────────
//
// Shipped DE/EN catalogs for every `coar.calendar.*` key + a
// `CoarTranslationSource` factory for `service.addTranslationSource`.
// Hosts stop hand-maintaining the key list; their own source
// registered afterwards still overrides per key.

export {
  calendarMessages,
  createCalendarTranslationSource,
  type CalendarMessageCatalog,
} from './i18n/messages';

// ─── Math kernel (framework-agnostic) ────────────────────────────
//
// Re-exports `core/index.ts` which includes:
//   - Temporal (re-export of @js-temporal/polyfill's Temporal)
//   - CalendarEvent / RecurringSeries / RecurrenceExpansionWindow types
//   - validateCalendarEvent (C1 boundary enforcer)
//   - parseScheduledTime / parsePlainDate / formatScheduledTime (D3)
//   - viewWindow / overlap / timeGrid / monthGrid / agenda layouts
//   - measurementCache + virtualScroll (Spike A kernel)
//
// Recurrence runtime (`expandSeries`) lives at the
// `@cocoar/vue-calendar/recurrence` subpath, not on this barrel —
// keeps engine bundles out of apps that don't use recurrence. See
// `.local/PHASE-4-RECURRENCE.md` §A1.

export * from './core/index';
