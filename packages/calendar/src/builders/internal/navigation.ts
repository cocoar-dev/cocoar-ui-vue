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
 * Step the cursor by one range of the active view. A responsive
 * multi-day view steps by the number of columns actually rendered
 * (read from the visible window), not by the configured minimum.
 */
export function navigate(
  state: NavigationState,
  visible: ViewWindow | null,
  direction: 1 | -1,
): void {
  const view = state.view.value;
  const dayColumns =
    view === 'day' && visible?.view === 'day'
      ? Math.max(1, windowDayCount(visible))
      : toValue(state.dayColumnCount);
  state.date.value = navigateCursor(
    view,
    state.date.value,
    direction === 1 ? 'next' : 'prev',
    toValue(state.agendaLengthDays),
    toValue(state.timelineRangeDays),
    dayColumns,
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
