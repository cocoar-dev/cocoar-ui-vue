/**
 * Navigation writes behind `api.goTo / next / prev / setView /
 * setMonthDensity / setDayMode`.
 *
 * Pure functions over the builder state: they write the writable
 * navigation refs (`view`, `date`) and the two presentation knobs
 * that consumers may bind two-way (`monthDensity`, `dayMode`). No
 * reactivity of their own, nothing exported from the package barrel.
 */

import { isRef, toValue, type Ref } from 'vue';
import {
  type CalendarDayMode,
  type CalendarMonthDensity,
  type CalendarView,
  type ViewWindow,
  Temporal,
  navigateCursor,
  resolveSpanDays,
  timeGridRangeSpecFor,
  timeGridStepDays,
  windowDayCount,
} from '../../core';
import type { CalendarBuilderState } from '../calendar-builder-state';

/**
 * The slice of builder state navigation touches. Picked so the
 * helpers accept any `CalendarBuilderState<TMeta>` — none of these
 * fields depend on the event meta type.
 */
type NavigationState = Pick<
  CalendarBuilderState,
  | 'view'
  | 'date'
  | 'timezone'
  | 'dayColumnCount'
  | 'dayMode'
  | 'timeGridRange'
  | 'agendaLengthDays'
  | 'timelineRangeDays'
  | 'availableViews'
  | 'monthDensity'
  | 'dayMode'
>;

export function goToToday(state: NavigationState): void {
  state.date.value = Temporal.Now.plainDateISO(toValue(state.timezone));
}

/**
 * Step the cursor by one page of the active view. The time-grid views
 * (day / week / workWeek) step through their range spec — a
 * `'responsive'` span reads the column count actually rendered from
 * the visible window, not the configured minimum — so an explicit
 * `builder.timeGridRange(...)` step applies to buttons and swipes alike.
 */
export function navigate(
  state: NavigationState,
  visible: ViewWindow | null,
  direction: 1 | -1,
): void {
  const view = state.view.value;
  const sign = direction === 1 ? 1 : -1;
  if (view === 'day' || view === 'week' || view === 'workWeek') {
    const spec = timeGridRangeSpecFor(view, {
      dayMode: toValue(state.dayMode),
      explicit: toValue(state.timeGridRange),
    });
    const spanDays =
      visible?.view === view
        ? Math.max(1, windowDayCount(visible))
        : resolveSpanDays(spec, toValue(state.dayColumnCount));
    state.date.value = state.date.value.add({ days: timeGridStepDays(spec, spanDays) * sign });
    return;
  }
  state.date.value = navigateCursor(
    view,
    state.date.value,
    direction === 1 ? 'next' : 'prev',
    toValue(state.agendaLengthDays),
    toValue(state.timelineRangeDays),
    toValue(state.dayColumnCount),
  );
}

/**
 * Validate against `availableViews` so `setView('year')` doesn't
 * silently land on a "View not implemented" dead screen. Dev-warn,
 * not throw — consumers may legitimately pre-set the view before
 * calling `availableViews`.
 */
export function setView(state: NavigationState, v: CalendarView): void {
  const allowed = toValue(state.availableViews);
  if (!allowed.includes(v) && typeof console !== 'undefined') {
    console.warn(
      `[CalendarBuilder.api.setView] view='${v}' is not in availableViews=[${allowed.join(', ')}]. Setting anyway, but the active view-switcher won't show it and the body may render an "unsupported" placeholder. Add it to availableViews(...) or pick from the allowed set.`,
    );
  }
  state.view.value = v;
}

export function setMonthDensity(state: NavigationState, value: CalendarMonthDensity): void {
  writePresentationKnob(state, 'monthDensity', value, 'setMonthDensity');
}

export function setDayMode(state: NavigationState, value: CalendarDayMode): void {
  writePresentationKnob(state, 'dayMode', value, 'setDayMode');
}

/**
 * `monthDensity` / `dayMode` are `MaybeRefOrGetter` config, yet the
 * shell's display controls write them. A bound Ref is written
 * through (two-way), a plain value is replaced, a getter cannot be
 * written and dev-warns.
 */
function writePresentationKnob<K extends 'monthDensity' | 'dayMode'>(
  state: NavigationState,
  key: K,
  value: NavigationState[K] extends infer T ? (T extends Ref<infer V> ? V : never) : never,
  apiName: string,
): void {
  const current = state[key];
  if (isRef(current)) {
    (current as Ref<unknown>).value = value;
    return;
  }
  if (typeof current === 'function') {
    if (typeof console !== 'undefined') {
      console.warn(
        `[CalendarBuilder.api.${apiName}] cannot write to a getter. Bind a Ref or a plain value.`,
      );
    }
    return;
  }
  (state as Record<K, unknown>)[key] = value;
}
