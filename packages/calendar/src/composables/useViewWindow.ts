/**
 * `useViewWindow` — the SOLE writer of `builder._visibleRange`.
 *
 * **C5 single-source-of-truth invariant.** Exactly ONE writer for
 * `_visibleRange`, period. Multiple writers (the composer + each
 * sub-builder, say) silently disagree on window identity — the cache
 * key drifts, `onRangeChange` fires twice, and the loader can race
 * against itself. This composable centralises the write.
 *
 * **Inputs** (read reactively from `builder.state` per C7):
 *   - `view`             — current view
 *   - `date`             — cursor
 *   - `timezone`         — display zone (Article 4: `'2026-04-13'`
 *                          differs across zones, so it's part of the
 *                          window's identity)
 *   - `firstDayOfWeek`   — week-aligned views need this
 *   - `agendaLengthDays` — agenda view's length
 *
 * **Side effects**
 *
 *   1. On any input change, calls `computeViewWindow(...)` (pure).
 *   2. Calls `builder._setVisibleRange(newWindow)` — the builder
 *      handles `onRangeChange` firing + loader scheduling +
 *      duplicate suppression.
 *   3. On unmount, no cleanup needed (the builder outlives the
 *      composable; we don't clear `_visibleRange` because another
 *      view-window composable might be mounted in the same builder
 *      tree — though in practice that's a misuse since the C5
 *      invariant is "single writer").
 *
 * **Mounting more than one `useViewWindow` against the same builder
 * is a bug.** A dev-mode warn fires on the second mount; the builder
 * keeps the LAST writer's window (the most recent caller wins). The
 * single-writer test in `__tests__/useViewWindow.test.ts` asserts
 * the warn surfaces.
 */

import {
  type Ref,
  computed,
  onScopeDispose,
  toValue,
  watch,
} from 'vue';
import {
  type CalendarView,
  type ViewWindow,
  computeViewWindow,
  detectFirstDayOfWeekFromLocale,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { SET_VISIBLE_RANGE } from '../builders/calendar-builder-internals';

export interface UseViewWindowOptions {
  /**
   * Pin the builder's view to this value on mount. Used by standalone
   * sub-views (`<CoarMonthView />`, `<CoarDayView />`, …) so callers
   * who composed the builder via `useDayView()` etc. don't have to
   * separately remember to set `builder.state.view`.
   */
  view?: CalendarView;
}

/**
 * Track of the builders that already have an active `useViewWindow`.
 * WeakSet so unmounted builders are GC'd; the `_unmount` cleanup
 * removes the entry on scope dispose.
 */
const _activeBuilders = new WeakSet<CalendarBuilder>();

interface UseViewWindowReturn {
  /**
   * Computed reflection of the current window. Same value the
   * builder's `api.visibleRange` exposes; provided here so the
   * caller doesn't have to wire two refs.
   */
  readonly visibleRange: Readonly<Ref<ViewWindow | null>>;
}

export function useViewWindow<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  builder: CalendarBuilder<TMeta>,
  options?: UseViewWindowOptions,
): UseViewWindowReturn {
  // Standalone sub-view path (C8): pin builder.state.view to what the
  // sub-view renders, so window computation + api.getVisibleRange() see
  // the correct view even when the consumer composed the builder via a
  // sub-view-specific factory (`useDayView()` etc.) that does not.
  if (options?.view && builder.state.view.value !== options.view) {
    builder.state.view.value = options.view;
  }

  if (_activeBuilders.has(builder as CalendarBuilder)) {
    // C5 single-writer invariant — second concurrent mount is a misuse:
    // duplicate writers compute identical windows from the same state,
    // but firing onRangeChange / scheduling the loader twice per change
    // is wasteful (and flickery if the second writer's flush ordering
    // differs).
    if (typeof console !== 'undefined') {
      console.warn(
        '[useViewWindow] A second useViewWindow() composable mounted against the same CalendarBuilder. The C5 invariant calls for a single writer for _visibleRange — duplicate writers compute identical windows but fire onRangeChange / schedule the eventsLoader twice per change. Mount useViewWindow in exactly ONE place per builder (typically the active sub-view component).',
      );
    }
  }
  _activeBuilders.add(builder as CalendarBuilder);

  // Computed window — recomputes when ANY tracked input changes.
  // shallow ok: ViewWindow is a 4-string POJO.
  const window = computed<ViewWindow>(() => {
    // Article 9 — when firstDayOfWeek is left undefined (preferred
    // default), derive from locale so computeViewWindow always sees a
    // number.
    const fdow =
      toValue(builder.state.firstDayOfWeek) ??
      detectFirstDayOfWeekFromLocale(toValue(builder.state.locale) ?? 'en-US');
    return computeViewWindow({
      view: builder.state.view.value,
      cursor: builder.state.date.value,
      firstDayOfWeek: fdow,
      agendaLengthDays: toValue(builder.state.agendaLengthDays),
      timelineRangeDays: toValue(builder.state.timelineRangeDays),
      timezone: toValue(builder.state.timezone),
    });
  });

  // Push the computed window into the builder; the builder handles
  // duplicate suppression (`windowsEqual`) + onRangeChange + loader
  // debounce. Symbol-keyed call (audit fix #2) — only this composable
  // and the builder's own impl reach the privileged method.
  watch(
    window,
    (w) => {
      builder[SET_VISIBLE_RANGE](w);
    },
    { immediate: true, flush: 'post' },
  );

  onScopeDispose(() => {
    _activeBuilders.delete(builder as CalendarBuilder);
  });

  return {
    visibleRange: builder.api.visibleRange as Readonly<Ref<ViewWindow | null>>,
  };
}
