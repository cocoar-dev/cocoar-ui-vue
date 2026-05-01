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

export { MeasurementCache } from './measurementCache';
export {
  getVisibleRange1D,
  computeAnchorAdjustment,
  type Range1D,
} from './virtualScroll';
