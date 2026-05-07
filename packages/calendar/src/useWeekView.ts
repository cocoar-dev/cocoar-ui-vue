/**
 * `useWeekView` — convenience composable that pre-locks the active
 * view to `'week'`. See `useDayView.ts` for the rationale.
 */

import { ref } from 'vue';
import { useCalendar } from './useCalendar';
import type { CalendarBuilder, CalendarApi } from './builders/calendar-builder';

export function useWeekView<TMeta extends Record<string, unknown> = Record<string, unknown>>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
} {
  const { builder, api } = useCalendar<TMeta>();
  builder.view(ref('week'));
  builder.availableViews(['week']);
  return { builder, api };
}
