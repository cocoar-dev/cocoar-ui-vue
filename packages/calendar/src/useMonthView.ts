/**
 * `useMonthView` — convenience composable that pre-locks the active
 * view to `'month'`. See `useDayView.ts` for the rationale.
 */

import { ref } from 'vue';
import { useCalendar } from './useCalendar';
import type { CalendarBuilder, CalendarApi } from './builders/calendar-builder';

export function useMonthView<TMeta extends Record<string, unknown> = Record<string, unknown>>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
} {
  const { builder, api } = useCalendar<TMeta>();
  builder.view(ref('month'));
  builder.availableViews(['month']);
  return { builder, api };
}
