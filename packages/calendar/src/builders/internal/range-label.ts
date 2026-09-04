/**
 * `api.rangeLabel` — the reactive title of the visible window.
 *
 * Window resolution mirrors the shell: the range the active view
 * actually rendered (`_visibleRange`, responsive spans included) when
 * it belongs to the current view, else the configured window computed
 * from state — so the label is right before any view has mounted and
 * for hosts that hide the header and draw their own controls.
 *
 * Locale precedence matches the shell header as well: an explicit
 * `builder.locale(...)`, else the host's `@cocoar/vue-localization`
 * language, else `'en-US'`.
 *
 * Internal helper — not exported from the package barrel.
 */

import { computed, getCurrentInstance, toValue, type ComputedRef, type ShallowRef } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import {
  computeViewWindow,
  detectFirstDayOfWeekFromLocale,
  formatRangeLabel,
  type ViewWindow,
} from '../../core';
import type { CalendarBuilderState } from '../calendar-builder-state';

type RangeLabelState = Pick<
  CalendarBuilderState,
  | 'view'
  | 'date'
  | 'locale'
  | 'firstDayOfWeek'
  | 'agendaLengthDays'
  | 'timelineRangeDays'
  | 'dayColumnCount'
  | 'timezone'
  | 'dateStyle'
  | 'timeStyle'
  | 'hour12'
>;

export function createRangeLabel(
  state: RangeLabelState,
  visibleRange: ShallowRef<ViewWindow | null>,
): ComputedRef<string> {
  // The host's localization service is injectable only while the
  // builder is created inside a setup (`useCalendar()`).
  const localization = getCurrentInstance() ? useLocalization() : null;
  return computed(() => {
    const view = state.view.value;
    const cursor = state.date.value;
    const locale = toValue(state.locale) ?? localization?.language.value ?? 'en-US';
    const rendered = visibleRange.value;
    const window =
      rendered?.view === view
        ? rendered
        : computeViewWindow({
            view,
            cursor,
            firstDayOfWeek: toValue(state.firstDayOfWeek) ?? detectFirstDayOfWeekFromLocale(locale),
            agendaLengthDays: toValue(state.agendaLengthDays),
            timelineRangeDays: toValue(state.timelineRangeDays),
            dayColumnCount: toValue(state.dayColumnCount),
            timezone: toValue(state.timezone),
          });
    return formatRangeLabel({
      view,
      window,
      cursor,
      locale,
      dateStyle: toValue(state.dateStyle),
      timeStyle: toValue(state.timeStyle),
      hour12: toValue(state.hour12),
    });
  });
}
