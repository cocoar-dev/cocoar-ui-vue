/**
 * `useDayView` — convenience composable that pre-locks the active
 * view to `'day'` and the available views to `['day']` so the
 * standalone `<CoarDayView :builder>` consumer doesn't have to wire
 * those bits manually.
 *
 * Returns the SAME `CalendarBuilder` used by the shell + every other
 * sub-view; there's no sub-builder forking.
 */

import { ref } from 'vue';
import { useCalendar } from './useCalendar';
import type { CalendarBuilder, CalendarApi } from './builders/calendar-builder';

export function useDayView<TMeta extends Record<string, unknown> = Record<string, unknown>>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
} {
  const { builder, api } = useCalendar<TMeta>();
  builder.view(ref('day'));
  builder.availableViews(['day']);
  return { builder, api };
}
