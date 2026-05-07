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
  DayHeaderRenderer,
  DstPolicy,
  EventClickHandler,
  EventDoubleClickHandler,
  EventDropHandler,
  EventDropPayload,
  EventLayoutCtx,
  EventRenderer,
  EventRendererCtx,
  EventsLoader,
  MoreClickHandler,
  RangeChangeHandler,
  TimeClickHandler,
  TimeRange,
} from './builders/types';
export {
  getEventZoneHints,
  type EventZoneHints,
} from './builders/event-zone-hints';

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
export { useMonthView } from './useMonthView';
export { useAgendaView } from './useAgendaView';

// ─── Components ──────────────────────────────────────────────────

export { default as CoarCalendar } from './components/CoarCalendar.vue';
export { default as CoarDayView } from './components/CoarDayView.vue';
export { default as CoarWeekView } from './components/CoarWeekView.vue';
export { default as CoarTimeGrid } from './components/CoarTimeGrid.vue';
export { default as CoarMonthView } from './components/CoarMonthView.vue';
export { default as CoarAgendaView } from './components/CoarAgendaView.vue';
export { default as CoarDisplayZoneSwitcher } from './components/CoarDisplayZoneSwitcher.vue';
export { default as VirtualizedSurface1DY } from './components/VirtualizedSurface1DY.vue';
export { default as VirtualizedSurface2D } from './components/VirtualizedSurface2D.vue';

// ─── Math kernel (framework-agnostic) ────────────────────────────
//
// Re-exports `core/index.ts` which includes:
//   - Temporal (re-export of @js-temporal/polyfill's Temporal)
//   - CalendarEvent / RecurringSeries / RecurrenceExpansionWindow types
//   - validateCalendarEvent (C1 boundary enforcer)
//   - parseScheduledTime / parsePlainDate / formatScheduledTime (D3)
//   - expandSeries (C8 throwing stub until Phase 4)
//   - viewWindow / overlap / timeGrid / monthGrid / agenda layouts
//   - measurementCache + virtualScroll (Spike A kernel)

export * from './core/index';
