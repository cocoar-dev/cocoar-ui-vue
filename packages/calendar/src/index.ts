/**
 * `@cocoar/vue-calendar` — public surface.
 *
 * Phase 0 (current): the package exposes the `VirtualizedSurface1DY`
 * component (Spike A) and the `core/` math kernel. Calendar views
 * (`<CoarCalendar>`, MonthView, WeekView, etc.) land in Phase 1+.
 *
 * The `core/` submodule is the framework-agnostic layer (pure
 * TypeScript, no Vue imports) and is also exposed via the `./core`
 * subpath export for advanced consumers needing only the math.
 *
 * See `.local/cocoar-vue-calendar-v0.2.md` for the design document.
 */
export { default as VirtualizedSurface1DY } from './components/VirtualizedSurface1DY.vue';
export { default as VirtualizedSurface2D } from './components/VirtualizedSurface2D.vue';
export { default as CoarTimeGrid } from './components/CoarTimeGrid.vue';
export { default as CoarDayView } from './components/CoarDayView.vue';
export { default as CoarWeekView } from './components/CoarWeekView.vue';
export { default as CoarMonthView } from './components/CoarMonthView.vue';
export { default as CoarAgendaView } from './components/CoarAgendaView.vue';
export {
  useCoarDrag,
  type DragContext,
  type UseCoarDragOptions,
  type UseCoarDragReturn,
} from './composables/useCoarDrag';
export * from './core/index';
