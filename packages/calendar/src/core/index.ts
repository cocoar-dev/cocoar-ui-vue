/**
 * `@cocoar/vue-calendar/core` — framework-agnostic layer.
 *
 * Files in this directory must NOT import from `../components/` or
 * `../composables/`. The lint rule in the repo root enforces this.
 *
 * Contents land here during Phase 1:
 *   - temporal.ts          (Temporal helpers, lifted from @cocoar/vue-ui shared)
 *   - eventIndex.ts        (Map<dateKey, Event[]> with granular invalidation)
 *   - viewWindow.ts        (week/month/agenda window math)
 *   - overlapLayout.ts     (multi-day-bar interval-graph coloring)
 *   - virtualScroll.ts     (1D + 2D range math, measurement cache)
 *   - recurrence.ts        (engine abstraction; rrule-rust + rrule.js adapters)
 *   - worker/recurrenceWorker.ts (off-main-thread expansion)
 */
export {};
